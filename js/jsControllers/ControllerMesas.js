// ==========================
// ControllerMesas.js
// - Buscador expandible
// - Tarjetas teñidas por estado
// - Bloqueos:
//   * HARD: Historial / Factura => no editar ni eliminar
//   * SOFT: Pedido activo / Reserva vigente => solo cambiar estado; no eliminar
// - No permitir setear manualmente Ocupada/Reservada
// - Colores: Disponible=Verde, Ocupada=Rojo, Reservada=Azul, Limpieza=Amarillo, Fuera=Gris
// ==========================
import ServiceMesas, { ApiError } from "../jsService/ServiceMesas.js";

const DEBUG = false;

/* Catálogos y datos */
let estadosCatalog = []; // { id, label, slug, color }
let tiposCatalog   = []; // { id, nombre, capacidad }
let mesas          = []; // { id, nombre, idEstadoMesa, idTipoMesa, estado, estadoLabel, color, tipoNombre, capacidad, blocked, blockMode }

let pedidosRaw   = [];
let historialRaw = [];
let reservasRaw  = [];
let facturasRaw  = [];

let currentFilter = "all";
let currentEditingId = null;
let searchTerm = "";

/* ===== Helpers ===== */
const cap  = (s) => { s=(s??"").toString(); return s.charAt(0).toUpperCase()+s.slice(1); };
const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const esc  = (x) => String(x)
  .replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const idEq = (a,b)=> String(a ?? "") === String(b ?? "");

const COLOR_BY_SLUG = {
  libre:     "#22c55e", // Disponible - verde
  ocupada:   "#ef4444", // rojo
  reservada: "#3b82f6", // azul
  limpieza:  "#f59e0b", // amarillo
  fuera:     "#6b7280", // gris
};

function estadoToSlug(label){
  const n = norm(label);
  if (n.startsWith("dispon")) return "libre";
  if (n.startsWith("ocupa"))  return "ocupada";
  if (n.startsWith("reser"))  return "reservada";
  if (n.startsWith("limp"))   return "limpieza";
  return "fuera";
}

/* ===== Tiempo ===== */
function hoyISO(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
function hhmmNow(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,"0");
  const mm = String(d.getMinutes()).padStart(2,"0");
  return `${hh}:${mm}`;
}
function hmToMinutes(hm){
  if (!hm || typeof hm !== "string") return null;
  const [h,m] = hm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h*60 + m;
}

/* ===== Actividad (visual) ===== */
function isPedidoActivo(p){
  const finNull = p.horaFin == null;
  const cerrado = p.idEstadoPedido === 5 || p.idEstadoPedido === 6;
  return finNull && !cerrado;
}
function isReservaActivaAhora(r){
  const dia = (r.fReserva || r.freserva || "").slice(0,10);
  if (String(r.idEstadoReserva) !== "1") return false;
  if (dia !== hoyISO()) return false;
  const now = hmToMinutes(hhmmNow());
  const i = hmToMinutes(r.horaI);
  const f = hmToMinutes(r.horaF);
  if (now == null || i == null || f == null) return false;
  return now >= i && now <= f;
}

/* ===== Bloqueos ===== */
function mapPedidosToMesaId(pedidos){
  const pedidoToMesa = new Map();
  (pedidos || []).forEach(p=>{
    if (p && p.id != null && p.idMesa != null) pedidoToMesa.set(String(p.id), String(p.idMesa));
  });
  return pedidoToMesa;
}
function fallbackBlockSetFromIds(itemsWithPedidoId, mesasRows){
  const set = new Set();
  const mesaIds = new Set((mesasRows || []).map(m => String(m.id)));
  (itemsWithPedidoId || []).forEach(it=>{
    const pid = it?.idPedido != null ? String(it.idPedido) : null;
    if (pid && mesaIds.has(pid)) set.add(pid);
  });
  return set;
}
function hardBlockAlwaysByMesaEqualsPedidoId(itemsWithPedidoId, mesasRows){
  const set = new Set();
  const pedidoIds = new Set((itemsWithPedidoId || []).map(it => String(it?.idPedido ?? "")));
  (mesasRows || []).forEach(m=>{
    const mid = String(m.id);
    if (pedidoIds.has(mid)) set.add(mid);
  });
  return set;
}
function indexMesasConHistorialBloqueo(historial, pedidos, mesasRows){
  const pedidoToMesa = mapPedidosToMesaId(pedidos);
  const set = new Set();
  (historial || []).forEach(h=>{
    const pid = h?.idPedido != null ? String(h.idPedido) : null;
    const mid = pid ? pedidoToMesa.get(pid) : null;
    if (mid) set.add(mid);
  });
  if (set.size === 0 && (historial?.length || 0) > 0 && (pedidos?.length || 0) === 0) {
    const fb = fallbackBlockSetFromIds(historial, mesasRows);
    fb.forEach(id => set.add(id));
  }
  const always = hardBlockAlwaysByMesaEqualsPedidoId(historial, mesasRows);
  always.forEach(id => set.add(id));
  return set;
}
function indexMesasConFacturaBloqueo(pedidos, facturas, mesasRows){
  const pedidoToMesa = mapPedidosToMesaId(pedidos);
  const set = new Set();
  (facturas || []).forEach(f=>{
    const pid = f?.idPedido != null ? String(f.idPedido) : null;
    const mid = pid ? pedidoToMesa.get(pid) : null;
    if (mid) set.add(mid);
  });
  if (set.size === 0 && (facturas?.length || 0) > 0 && (pedidos?.length || 0) === 0) {
    const fb = fallbackBlockSetFromIds(facturas, mesasRows);
    fb.forEach(id => set.add(id));
  }
  const always = hardBlockAlwaysByMesaEqualsPedidoId(facturas, mesasRows);
  always.forEach(id => set.add(id));
  return set;
}
function indexMesasConPedidoBloqueo(pedidos){
  const set = new Set();
  (pedidos || []).forEach(p=>{
    if (!p || p.idMesa == null) return;
    if (isPedidoActivo(p)) set.add(String(p.idMesa));
  });
  return set;
}
function indexMesasConReservaBloqueo(reservas){
  const set = new Set();
  (reservas || []).forEach(r=>{
    if (!r || r.idMesa == null) return;
    const dia = (r.fReserva || r.freserva || "").slice(0,10);
    if (String(r.idEstadoReserva) === "1" && dia >= hoyISO()) set.add(String(r.idMesa));
  });
  return set;
}

/* ===== Toasts / mensajes ===== */
function ensureToastHost(){
  if (document.getElementById("toast-host")) return;
  const host = document.createElement("div");
  host.id = "toast-host";
  host.className = "fixed top-4 right-4 z-[9999] space-y-2";
  document.body.appendChild(host);
}
function showToast(msg, type="info", timeout=3500){
  ensureToastHost();
  const colors = { success:"bg-emerald-600", error:"bg-red-600", warning:"bg-amber-600", info:"bg-slate-700" };
  const el = document.createElement("div");
  el.className = `${colors[type]||colors.info} text-white px-4 py-3 rounded-xl shadow-lg max-w-sm transition transform`;
  el.innerHTML = `<div class="flex items-start">
    <i class="fa-solid ${type==="success"?"fa-check-circle":type==="error"?"fa-triangle-exclamation":type==="warning"?"fa-circle-exclamation":"fa-circle-info"} mr-2 mt-0.5"></i>
    <div class="text-sm">${esc(msg)}</div></div>`;
  document.getElementById("toast-host").appendChild(el);
  setTimeout(()=>{ el.style.opacity="0"; el.style.transform="translateY(-6px)"; setTimeout(()=>el.remove(),200); }, timeout);
}
function showMessage(elementId, message, type="info"){
  const el = document.getElementById(elementId);
  if (!el) return;
  const colors = {
    success:"text-emerald-600 bg-emerald-50 border border-emerald-200",
    error:"text-red-600 bg-red-50 border border-red-200",
    warning:"text-amber-600 bg-amber-50 border-amber-200",
    info:"text-blue-600 bg-blue-50 border border-blue-200",
  };
  el.textContent = message;
  el.className = `text-center text-sm p-3 rounded-lg ${colors[type] || colors.info}`;
}
function friendlyApiMessage(error, fallback="Ocurrió un error"){
  if (error instanceof ApiError) {
    if (error.status === 401) return "No autorizado. Inicia sesión nuevamente.";
    if (error.status === 403) return "Sin permisos para esta acción.";
    if (error.status === 404) return "Recurso no encontrado.";
    if (error.status === 409) return "Conflicto con datos existentes.";
    if (error.status === 422) return "Datos inválidos. Revisa los campos.";
    if (error.status === 0)   return "Sin conexión o tiempo de espera agotado.";
    if (error.message) return error.message;
  }
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}
function handleApiError(error, { ui="toast", elementId=null, fallback } = {}){
  const msg = friendlyApiMessage(error, fallback);
  if (ui === "toast") showToast(msg, "error");
  else if (ui === "inline" && elementId) showMessage(elementId, msg, "error");
  if (DEBUG) console.error("[API ERROR]", error);
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupHeaderButtons();
  setupModals();
  setupUserDropdown();
  setupAnimations();

  const search = document.getElementById("search-mesa");
  search?.addEventListener("input", (e)=>{
    searchTerm = (e.target.value || "").trim().toLowerCase();
    renderCards(currentFilter);
    updateCounters();
  });

  init().catch((e)=>handleApiError(e,{fallback:"No se pudo inicializar Mesas. Verifica tu sesión."}));
});

async function init(){
  setSelectLoading("add-tipoMesa");
  setSelectLoading("add-estadoMesa");
  setSelectLoading("update-tipoMesa");
  setSelectLoading("update-estadoMesa");

  await loadEstados();
  await loadTipos();

  await loadPedidos();
  await loadHistorialPedidos();
  await loadReservas();
  await loadFacturas();

  populateAddSelects();
  populateUpdateSelects();

  await loadMesas();
  renderCards("all");
  updateCounters();
}

/* ===== Loaders ===== */
async function loadEstados(){
  try {
    const arr = await ServiceMesas.getEstadosMesa();
    if (!arr.length) throw new Error("El endpoint de estados no devolvió elementos.");
    estadosCatalog = arr.map((e,i)=>{
      const slug = estadoToSlug(e.estadoMesa);
      return {
        id:    e.id ?? (i+1),
        label: e.estadoMesa,
        slug,
        color: COLOR_BY_SLUG[slug] || "#64748b",
      };
    });
  } catch (e) {
    estadosCatalog = [];
    handleApiError(e,{fallback:"No se pudieron cargar los estados."});
  }
}

async function loadTipos(){
  try {
    const arr = await ServiceMesas.getTiposMesa();
    if (!arr.length) throw new Error("El endpoint de tipos no devolvió elementos.");
    tiposCatalog = arr.map((t,i)=>({
      id:        t.id ?? (i+1),
      nombre:    t.nombre ?? "",
      capacidad: Number(t.capacidadPersonas ?? 0),
    }));
  } catch (e) {
    tiposCatalog = [];
    handleApiError(e,{fallback:"No se pudieron cargar los tipos de mesa."});
  }
}
async function loadPedidos(){ try{ pedidosRaw = await ServiceMesas.getPedidos(); } catch(e){ pedidosRaw = []; } }
async function loadHistorialPedidos(){ try{ historialRaw = await ServiceMesas.getHistorialPedidos(); } catch(e){ historialRaw = []; } }
async function loadReservas(){ try{ reservasRaw = await ServiceMesas.getReservas(); } catch(e){ reservasRaw = []; } }
async function loadFacturas(){ try{ facturasRaw = await ServiceMesas.getFacturas(); } catch(e){ facturasRaw = []; } }

async function loadMesas(){
  try {
    const arr = await ServiceMesas.getMesas();
    if (!arr.length) { mesas = []; return; }

    const ocupadasActivas = new Set(
      (pedidosRaw || []).filter(p => p?.idMesa != null && isPedidoActivo(p)).map(p => String(p.idMesa))
    );
    const reservadasActivas = new Set(
      (reservasRaw || []).filter(r => r?.idMesa != null && isReservaActivaAhora(r)).map(r => String(r.idMesa))
    );

    const bloqueadasPedido    = indexMesasConPedidoBloqueo(pedidosRaw);                        // suave
    const bloqueadasReserva   = indexMesasConReservaBloqueo(reservasRaw);                      // suave
    const bloqueadasHistorial = indexMesasConHistorialBloqueo(historialRaw, pedidosRaw, arr);  // duro
    const bloqueadasFactura   = indexMesasConFacturaBloqueo(pedidosRaw, facturasRaw, arr);     // duro

    mesas = arr.map((m,idx)=>{
      const id = m.id ?? (idx+1);
      const nombre = String(m.nomMesa ?? `Mesa ${id}`);
      const idEstado = m.idEstadoMesa ?? null;
      const idTipo   = m.idTipoMesa ?? null;

      const est  = estadosCatalog.find(e => idEq(e.id, idEstado));
      const tipo = tiposCatalog.find(t => idEq(t.id, idTipo));

      let slug       = est?.slug ?? "libre";
      let estadoLbl  = est?.label ?? "Disponible";
      let color      = COLOR_BY_SLUG[slug];

      // override visual por actividad actual
      if (ocupadasActivas.has(String(id))) {
        slug = "ocupada"; estadoLbl = "Ocupada"; color = COLOR_BY_SLUG[slug];
      } else if (reservadasActivas.has(String(id))) {
        slug = "reservada"; estadoLbl = "Reservada"; color = COLOR_BY_SLUG[slug];
      }

      const hard =
        bloqueadasHistorial.has(String(id)) ||
        bloqueadasFactura.has(String(id));
      const soft = !hard && (bloqueadasPedido.has(String(id)) || bloqueadasReserva.has(String(id)));

      const blockMode = hard ? "hard" : (soft ? "soft" : "none");
      const blocked = hard || soft;

      return {
        id,
        nombre,
        idEstadoMesa: idEstado,
        idTipoMesa:   idTipo,
        estado:       slug,
        estadoLabel:  estadoLbl,
        color,
        tipoNombre:   tipo?.nombre ?? "—",
        capacidad:    tipo?.capacidad ?? 0,
        blocked,
        blockMode, // "hard" | "soft" | "none"
      };
    });

    if (DEBUG) console.table(mesas.map(m => ({ id: m.id, block: m.blockMode })));
  } catch (e) {
    mesas = [];
    handleApiError(e,{fallback:"No se pudieron cargar las mesas."});
  }
}

/* ===== Selects ===== */
function setSelectLoading(id, text="Cargando…"){
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option disabled selected>${text}</option>`;
}

function populateAddSelects(){
  const selTipo = document.getElementById("add-tipoMesa");
  if (selTipo) {
    selTipo.innerHTML = `<option value="">Seleccione un tipo…</option>`;
    tiposCatalog.forEach(t=>{
      const op = document.createElement("option");
      op.value = t.id;
      op.textContent = `${t.nombre} (${t.capacidad || 0}p)`;
      selTipo.appendChild(op);
    });
  }

  const selEstado = document.getElementById("add-estadoMesa");
  if (selEstado) {
    selEstado.innerHTML = "";
    const libre = estadosCatalog.find(e=>e.slug==="libre");
    const op = document.createElement("option");
    op.value = libre ? libre.id : "";
    op.textContent = libre ? libre.label : "Disponible";
    selEstado.appendChild(op);
    selEstado.value = libre ? libre.id : "";
    selEstado.disabled = true; // siempre Disponible al crear
  }
}

function populateUpdateSelects(){
  const selTipo = document.getElementById("update-tipoMesa");
  if (selTipo) {
    selTipo.innerHTML = `<option value="">Seleccione un tipo…</option>`;
    tiposCatalog.forEach(t=>{
      const op = document.createElement("option");
      op.value = t.id;
      op.textContent = `${t.nombre} (${t.capacidad || 0}p)`;
      selTipo.appendChild(op);
    });
  }

  const selEstado = document.getElementById("update-estadoMesa");
  if (selEstado) {
    selEstado.innerHTML = `<option value="">Seleccione un estado…</option>`;
    // No permitir Ocupada/Reservada manualmente
    estadosCatalog
      .filter(e => e.slug !== "ocupada" && e.slug !== "reservada")
      .forEach(e=>{
        const op = document.createElement("option");
        op.value = e.id;
        op.textContent = e.label;
        selEstado.appendChild(op);
      });
  }
}

/* ===== Render Tarjetas (con tinte por estado) ===== */
function renderCards(filter = currentFilter){
  currentFilter = filter;

  document.querySelectorAll(".btn-modern").forEach(b=>b.classList.remove("active-filter","ring-4","ring-opacity-50"));
  const byLabel = { all:"Todas las mesas", libre:"Disponibles", ocupada:"Ocupadas", reservada:"Reservadas", limpieza:"En limpieza" };
  const label = byLabel[filter] || "";
  document.querySelectorAll(".btn-modern").forEach(b=>{
    const txt = (b.textContent || "").trim();
    if (label && txt.includes(label)) b.classList.add("active-filter","ring-4","ring-opacity-50");
  });

  const container = document.getElementById("cards-container");
  const empty     = document.getElementById("empty-state");
  if (!container) return;
  container.innerHTML = "";

  let list = [...mesas];
  if (filter !== "all") list = list.filter(m => m.estado === filter);
  if (searchTerm) list = list.filter(m => norm(m.nombre).includes(searchTerm));

  if (!list.length) { empty?.classList.remove("hidden"); return; }
  empty?.classList.add("hidden");

  list.forEach((m, idx)=>{
    const hard = m.blockMode === "hard";
    const soft = m.blockMode === "soft";

    const card = document.createElement("div");
    card.className = "mesa-card rounded-2xl shadow-lg p-6 border transition-transform";
    card.style.animationDelay = `${idx * 0.06}s`;
    card.classList.add("animate-fade-in");

    // Tinte por estado
    const bgTint   = `${m.color}22`; // ~13% opacidad
    const brdTint  = `${m.color}55`; // ~33% opacidad
    card.style.backgroundColor = bgTint;
    card.style.borderColor     = brdTint;

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-2xl font-bold text-slate-800">${esc(m.nombre)}</h3>
          <p class="text-slate-600 text-sm mt-0.5">ID: ${esc(m.id)}</p>
        </div>
        <div class="w-14 h-14 rounded-xl flex items-center justify-center" style="background-color:${m.color}22;border:1px solid ${m.color}55;">
          <i class="fas fa-chair" style="color:${m.color}"></i>
        </div>
      </div>

      <div class="space-y-4 mt-5">
        <div class="flex items-center justify-between">
          <span class="text-slate-700 font-medium">Estado</span>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold" style="background-color:${m.color}22;color:${m.color};border:1px solid ${m.color}55;">
            ${esc(m.estadoLabel)}
          </span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-slate-700 font-medium">Tipo</span>
          <span class="text-slate-900 font-semibold">${esc(m.tipoNombre)}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-slate-700 font-medium">Capacidad</span>
          <div class="flex items-center">
            <i class="fas fa-users text-slate-500 mr-2"></i>
            <span class="text-slate-900 font-semibold">${m.capacidad || 0} personas</span>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t" style="border-color:${m.color}33;">
        <div class="flex gap-2">
          <button data-id="${m.id}" class="btn-edit flex-1 px-4 py-2 rounded-lg text-white text-sm ${hard?'bg-slate-300 cursor-not-allowed':'bg-amber-500 hover:bg-amber-600'}">
            <i class="fa fa-pen mr-2"></i> ${soft ? 'Editar (solo estado)' : 'Editar'}
          </button>
          <button data-id="${m.id}" class="btn-del flex-1 px-4 py-2 rounded-lg text-white text-sm ${m.blocked?'bg-slate-300 cursor-not-allowed':'bg-red-500 hover:bg-red-600'}">
            <i class="fa fa-trash mr-2"></i> Eliminar
          </button>
        </div>
      </div>
    `;
    card.addEventListener("mouseenter", ()=>{ card.style.transform = "scale(1.02)"; });
    card.addEventListener("mouseleave", ()=>{ card.style.transform = "scale(1)"; });
    container.appendChild(card);
  });

  container.querySelectorAll(".btn-edit").forEach(btn=>btn.addEventListener("click", onClickEdit));
  container.querySelectorAll(".btn-del").forEach(btn=>btn.addEventListener("click", onClickDelete));
}

function updateCounters(){
  const pool = searchTerm ? mesas.filter(m => norm(m.nombre).includes(searchTerm)) : mesas;
  ["libre","ocupada","reservada","limpieza"].forEach(estado=>{
    const el = document.getElementById(`count-${estado}`);
    if (!el) return;
    const count = pool.filter(m=>m.estado===estado).length;
    el.style.transform = "scale(1.2)";
    setTimeout(()=>{ el.textContent = count; el.style.transform = "scale(1)"; }, 100);
  });
}

/* ===== Acciones ===== */
function onClickEdit(e){
  const id = Number(e.currentTarget.getAttribute("data-id"));
  const mesa = mesas.find(m=>idEq(m.id, id));
  if (!mesa) return;

  if (mesa.blockMode === "hard") {
    showToast("No se puede editar una mesa vinculada a Historial de Pedido o Factura.", "warning");
    return;
  }

  currentEditingId = mesa.id;
  populateUpdateSelects();

  const inputNombre = document.getElementById("update-nombre");
  const selectTipo  = document.getElementById("update-tipoMesa");
  const selectEst   = document.getElementById("update-estadoMesa");

  inputNombre.value = mesa.nombre;
  if (mesa.idTipoMesa)   selectTipo.value = mesa.idTipoMesa;
  if (mesa.idEstadoMesa) selectEst.value  = mesa.idEstadoMesa;

  // Bloqueo suave: solo permitir cambiar estado
  const soft = mesa.blockMode === "soft";
  inputNombre.disabled = soft;
  selectTipo.disabled  = soft;
  selectEst.disabled   = false;

  showModal("update-modal");
}

function onClickDelete(e){
  const id = Number(e.currentTarget.getAttribute("data-id"));
  const mesa = mesas.find(m=>idEq(m.id, id));
  if (!mesa) return;

  if (mesa.blocked) {
    showToast("No se puede eliminar mesas con Pedido/Reserva/Historial/Factura asociados.", "warning");
    return;
  }
  document.getElementById("delete-id").value = mesa.id;
  showModal("delete-modal");
}

/* ===== CRUD ===== */
window.addMesa = async ()=>{
  const nombre = (document.getElementById("add-nombre")?.value || "").trim();
  const idTipo = Number(document.getElementById("add-tipoMesa")?.value || NaN);
  const idLibre = estadosCatalog.find(e=>e.slug==="libre")?.id;

  if (!nombre){ showMessage("add-message","El nombre es obligatorio","error"); return; }
  if (nombre.length > 100){ showMessage("add-message","Máximo 100 caracteres","error"); return; }
  if (!Number.isFinite(idTipo)){ showMessage("add-message","Selecciona un tipo de mesa","error"); return; }
  if (!idLibre){ showMessage("add-message","No se encontró el estado Disponible","error"); return; }

  try{
    await ServiceMesas.createMesa({
      nomMesa: nombre,
      idTipoMesa: idTipo,
      idEstadoMesa: Number(idLibre),
    });
    showMessage("add-message","¡Mesa creada correctamente!","success");
    await reloadAll();
    setTimeout(()=>closeAdd(), 900);
  }catch(e){
    handleApiError(e,{ui:"inline", elementId:"add-message", fallback:"No se pudo crear la mesa."});
  }
};

window.updateMesa = async ()=>{
  if (!currentEditingId){ showMessage("update-message","No hay mesa seleccionada","error"); return; }

  const inputNombre = document.getElementById("update-nombre");
  const selectTipo  = document.getElementById("update-tipoMesa");
  const selectEst   = document.getElementById("update-estadoMesa");

  const mesaActual = mesas.find(m=>idEq(m.id, currentEditingId));
  if (!mesaActual){ showMessage("update-message","Mesa no encontrada","error"); return; }

  if (mesaActual.blockMode === "hard"){
    showMessage("update-message","No puedes editar mesas con Historial/Factura.","warning"); return;
  }

  // Siempre permitimos cambiar estado (no Ocupada/Reservada manual)
  const idEstado = Number(selectEst?.value || NaN);
  const target = estadosCatalog.find(e=>idEq(e.id, idEstado));
  if (!Number.isFinite(idEstado)){ showMessage("update-message","Selecciona un estado","error"); return; }
  if (target && (target.slug === "ocupada" || target.slug === "reservada")){
    showMessage("update-message","No puedes establecer manualmente una mesa como Ocupada o Reservada.","warning");
    return;
  }

  const soft = mesaActual.blockMode === "soft";
  let nombre  = mesaActual.nombre;
  let idTipo  = mesaActual.idTipoMesa;

  if (!soft){
    const nuevoNombre = (inputNombre?.value || "").trim();
    const nuevoTipo   = Number(selectTipo?.value || NaN);

    if (!nuevoNombre){ showMessage("update-message","El nombre es obligatorio","error"); return; }
    if (!Number.isFinite(nuevoTipo)){ showMessage("update-message","Selecciona un tipo de mesa","error"); return; }

    nombre = nuevoNombre;
    idTipo = nuevoTipo;
  }

  try{
    await ServiceMesas.updateMesa(currentEditingId, {
      nomMesa: nombre,
      idTipoMesa: idTipo,
      idEstadoMesa: idEstado,
    });
    showMessage("update-message","¡Mesa actualizada!","success");
    await reloadAll();
    setTimeout(()=>closeUpdate(), 900);
  }catch(e){
    handleApiError(e,{ui:"inline", elementId:"update-message", fallback:"No se pudo actualizar la mesa."});
  }
};

window.deleteMesa = async ()=>{
  const id = parseInt(document.getElementById("delete-id")?.value, 10);
  if (!Number.isInteger(id)){ showMessage("delete-message","Ingresa un ID válido","error"); return; }

  const mesa = mesas.find(m=>idEq(m.id, id));
  if (!mesa){ showMessage("delete-message","Mesa no encontrada","error"); return; }
  if (mesa.blocked) {
    showMessage("delete-message","No se puede eliminar mesas con Pedido/Reserva/Historial/Factura asociados","warning"); return;
  }

  try{
    await ServiceMesas.deleteMesa(id);
    showMessage("delete-message","¡Mesa eliminada!","success");
    await reloadAll();
    setTimeout(()=>closeDelete(), 900);
  }catch(e){
    handleApiError(e,{ui:"inline", elementId:"delete-message", fallback:"No se pudo eliminar la mesa."});
  }
};

/* ===== Refresh ===== */
async function reloadAll(){
  await loadPedidos();
  await loadHistorialPedidos();
  await loadReservas();
  await loadFacturas();
  await loadMesas();
  renderCards();
  updateCounters();
}

/* ===== Filtros y botones ===== */
window.filterTables = (status, ev)=>{ ev?.preventDefault?.(); renderCards(status); updateCounters(); };

function setupHeaderButtons(){
  document.getElementById("add-btn")?.addEventListener("click", ()=> showModal("add-modal"));
}

/* ===== Infra UI ===== */
function ensureModalInfra(id){
  const modal = document.getElementById(id);
  if (!modal) return null;
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.classList.add("bg-white","rounded-2xl","shadow-xl","border","border-slate-100");
    if (!content.style.transition) content.style.transition = "all .2s ease";
    content.style.transform = "scale(0.96)";
    content.style.opacity = "0";
  }
  return modal;
}
function showModal(id){
  const modal = ensureModalInfra(id);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("show");
  setTimeout(()=>{ const c = modal.querySelector(".modal-content"); if (c){ c.style.transform="scale(1)"; c.style.opacity="1"; } },10);
}
function hideModal(id){
  const modal = document.getElementById(id);
  if (!modal) return;
  const c = modal.querySelector(".modal-content");
  if (c){ c.style.transform = "scale(0.96)"; c.style.opacity = "0"; }
  setTimeout(()=>{ modal.classList.add("hidden"); modal.classList.remove("show"); },200);
}
window.closeAdd = ()=>{ hideModal("add-modal"); document.getElementById("add-message").textContent=""; };
window.closeUpdate = ()=>{ hideModal("update-modal"); document.getElementById("update-message").textContent=""; currentEditingId=null; };
window.closeDelete = ()=>{ hideModal("delete-modal"); document.getElementById("delete-message").textContent=""; };

function setupModals(){
  document.addEventListener("click", (e)=>{ if (e.target.classList?.contains("modal")) hideModal(e.target.id); });
  document.addEventListener("keydown", (e)=>{ if (e.key === "Escape") { hideModal("add-modal"); hideModal("update-modal"); hideModal("delete-modal"); }});
}

function setupSidebar(){
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");
  const mobileOverlay = document.getElementById("mobileOverlay");

  sidebarToggle?.addEventListener("click", ()=>{
    sidebar?.classList.toggle("mobile-open");
    mobileOverlay?.classList.toggle("active");
  });
  sidebarToggleDesktop?.addEventListener("click", ()=>{
    sidebar?.classList.toggle("collapsed");
  });
  mobileOverlay?.addEventListener("click", ()=>{
    sidebar?.classList.remove("mobile-open");
    mobileOverlay?.classList.remove("active");
  });
  window.addEventListener("resize", ()=>{
    if (window.innerWidth >= 1024) {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });
}

function setupUserDropdown(){
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (!userBtn) return;

  if (!document.getElementById("userDropdown")) {
    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.id = "userDropdown";
    dropdown.innerHTML = `
      <button class="user-dropdown-item" id="logoutBtn">
        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
      </button>`;
    userBtn.parentNode.style.position = "relative";
    userBtn.parentNode.appendChild(dropdown);

    const overlay = document.createElement("div");
    overlay.className = "user-dropdown-overlay";
    overlay.id = "userDropdownOverlay";
    document.body.appendChild(overlay);

    userBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      dropdown.classList.toggle("show");
      overlay.classList.toggle("active");
    });
    overlay.addEventListener("click", ()=>{
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
    });
    document.addEventListener("keydown", (ev)=>{
      if (ev.key === "Escape") {
        dropdown.classList.remove("show");
        overlay.classList.remove("active");
      }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", ()=>{
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }
}

function setupAnimations(){
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  document.querySelectorAll(".animate-fade-in").forEach((el)=>{
    el.style.opacity = "0";
    el.style.transform = "translateY(14px)";
    el.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    observer.observe(el);
  });
}
