// ==========================
// ControllerMesas.js (Tarjetas + Buscador + API robusta)
// ==========================
import ServiceMesas, { ApiError } from "../jsService/ServiceMesas.js";

/* Catálogos y datos */
let estadosCatalog = []; // { id, nombre, color }
let tiposCatalog   = []; // { id, nombre, capacidad }
let mesas          = []; // { id, nombre, idEstadoMesa, idTipoMesa, estado, color, tipoNombre, capacidad }

let currentFilter = "all";
let currentEditingId = null;
let searchTerm = "";

/* ===== Helpers ===== */
const cap  = (s) => { s=(s??"").toString(); return s.charAt(0).toUpperCase()+s.slice(1); };
const norm = (v) => (v ?? "").toString().trim().toLowerCase();
const esc  = (x) => String(x)
  .replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

function pickCollection(res) {
  if (Array.isArray(res)) return res;
  const keys = ["data","Data","datos","Datos","rows","Rows","items","Items","result","results","Result","Results","content","Content","value","values","Value","Values","lista","Lista","list","List","records","Records"];
  if (res && typeof res === "object") {
    for (const k of keys) {
      if (Array.isArray(res[k])) return res[k];
      if (res[k] && typeof res[k] === "object") {
        for (const kk of keys) if (Array.isArray(res[k][kk])) return res[k][kk];
      }
    }
    for (const v of Object.values(res)) if (Array.isArray(v) && v.length && typeof v[0]==="object") return v;
  }
  return [];
}

const isBlocked = (estado) => {
  const e = norm(estado);
  return e === "ocupada" || e === "reservada";
};

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
    if (error.status === 401) return "Tu sesión no es válida o expiró. Inicia sesión nuevamente.";
    if (error.status === 403) return "No tienes permisos para realizar esta acción.";
    if (error.status === 404) return "No se encontró el recurso solicitado.";
    if (error.status === 409) return "Conflicto: revisa duplicados o dependencias.";
    if (error.status === 422) {
      const fields = Array.isArray(error.details)
        ? error.details.map(d => d?.msg || d?.message || "").filter(Boolean).join(" · ")
        : null;
      return fields || "Datos inválidos. Revisa los campos.";
    }
    if (error.status === 0) return "Sin conexión o tiempo de espera agotado.";
    if (error.message) return error.message;
  }
  if (typeof error?.message === "string" && error.message) return error.message;
  return fallback;
}
function handleApiError(error, { ui="toast", elementId=null, fallback } = {}){
  const msg = friendlyApiMessage(error, fallback);
  if (ui === "toast") showToast(msg, "error");
  else if (ui === "inline" && elementId) showMessage(elementId, msg, "error");
  console.error("[API ERROR]", error);
}

/* ===== Init ===== */
document.addEventListener("DOMContentLoaded", () => {
  setupSidebar();
  setupHeaderButtons();
  setupModals();
  setupUserDropdown();
  setupAnimations();

  // Buscar en vivo
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
  populateAddSelects();
  populateUpdateSelects();

  await loadMesas();
  renderCards("all");
  updateCounters();
}

/* ===== Loaders ===== */
async function loadEstados(){
  try {
    const res = await ServiceMesas.getEstadosMesa();
    const arr = pickCollection(res);
    if (!arr.length) throw new Error("El endpoint de estados no devolvió elementos.");

    estadosCatalog = arr.map((e,i)=>({
      id: e.Id ?? e.ID ?? e.IdEstadoMesa ?? e.IDESTADOMESA ?? (i+1),
      nombre: (e.EstadoMesa ?? e.estadoMesa ?? e.Nombre ?? e.nombre ?? "").toString().trim().toLowerCase(),
      color:  (e.ColorEstadoMesa ?? e.colorEstadoMesa ?? e.Color ?? e.color ?? "#64748b").toString(),
    }));
    ensureEstado("libre", "#10b981");
    ensureEstado("limpieza", "#f59e0b");
    ensureEstado("ocupada", "#ef4444");
    ensureEstado("reservada", "#3b82f6");
  } catch (e) {
    estadosCatalog = [
      { id: 100, nombre:"libre",     color:"#10b981" },
      { id: 101, nombre:"limpieza",  color:"#f59e0b" },
      { id: 102, nombre:"ocupada",   color:"#ef4444" },
      { id: 103, nombre:"reservada", color:"#3b82f6" },
    ];
    handleApiError(e,{fallback:"No se pudieron cargar los estados."});
  }
}

async function loadTipos(){
  try {
    const res = await ServiceMesas.getTiposMesa();
    const arr = pickCollection(res);
    if (!arr.length) throw new Error("El endpoint de tipos no devolvió elementos.");

    tiposCatalog = arr.map((t,i)=>({
      id: t.Id ?? t.ID ?? t.IdTipoMesa ?? t.IDTIPOMESA ?? (i+1),
      nombre: t.Nombre ?? t.nombre ?? t.NomTipoMesa ?? "",
      capacidad: Number(t.CapacidadPersonas ?? t.capacidadPersonas ?? t.Capacidad ?? 0),
    }));
  } catch (e) {
    tiposCatalog = [];
    handleApiError(e,{fallback:"No se pudieron cargar los tipos de mesa."});
  }
}

async function loadMesas(){
  try {
    const res = await ServiceMesas.getMesas();
    const arr = pickCollection(res);
    if (!arr.length) { mesas = []; return; }

    mesas = arr.map((m,idx)=>{
      const id = m.Id ?? m.ID ?? m.IdMesa ?? m.IDMESA ?? (idx+1);
      const nombre = (m.NomMesa ?? m.NOMBREMESA ?? m.nombre ?? `Mesa ${id}`).toString();

      const idEstadoMesa = m.IdEstadoMesa ?? m.IDESTADOMESA ?? m.estadoMesaId ?? m.EstadoMesaId ?? m.estadoId ?? null;
      let est = estadosCatalog.find(e=>`${e.id}`===`${idEstadoMesa}`);
      if (!est && m.EstadoMesa && typeof m.EstadoMesa === "object") {
        const nombreEst = norm(m.EstadoMesa.EstadoMesa ?? m.EstadoMesa.nombre);
        const colorEst  = m.EstadoMesa.ColorEstadoMesa ?? m.EstadoMesa.color ?? "#64748b";
        est = estadosCatalog.find(e=>e.nombre===nombreEst) || { id:idEstadoMesa, nombre:nombreEst, color: colorEst };
      }

      const idTipoMesa = m.IdTipoMesa ?? m.IDTIPOMESA ?? m.tipoMesaId ?? m.TipoMesaId ?? null;
      let tipo = tiposCatalog.find(t=>`${t.id}`===`${idTipoMesa}`);
      if (!tipo && m.TipoMesa && typeof m.TipoMesa === "object") {
        tipo = {
          id: m.TipoMesa.Id ?? idTipoMesa,
          nombre: m.TipoMesa.Nombre ?? m.TipoMesa.nombre ?? "—",
          capacidad: Number(m.TipoMesa.CapacidadPersonas ?? 0),
        };
      }

      return {
        id,
        nombre,
        idEstadoMesa: est?.id ?? idEstadoMesa,
        idTipoMesa:   tipo?.id ?? idTipoMesa,
        estado: est?.nombre || "libre",
        color:  est?.color  || "#10b981",
        tipoNombre: tipo?.nombre || "—",
        capacidad: tipo?.capacidad ?? 0,
      };
    });
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
    const libre = estadosCatalog.find(e=>e.nombre==="libre");
    if (libre) {
      const op = document.createElement("option");
      op.value = libre.id;
      op.textContent = "Libre";
      selEstado.appendChild(op);
      selEstado.value = libre.id;
    } else {
      const op = document.createElement("option");
      op.value = "";
      op.textContent = "Libre";
      selEstado.appendChild(op);
    }
    selEstado.disabled = true;
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
    estadosCatalog.forEach(e=>{
      const op = document.createElement("option");
      op.value = e.id;
      op.textContent = cap(e.nombre);
      selEstado.appendChild(op);
    });
  }
}

/* ===== Render Tarjetas ===== */
function renderCards(filter = currentFilter){
  currentFilter = filter;

  // resalta botón activo
  document.querySelectorAll(".btn-modern").forEach(b=>{
    b.classList.remove("active-filter","ring-4","ring-opacity-50");
  });
  const byLabel = { all:"Todas las mesas", libre:"Disponibles", ocupada:"Ocupadas", reservada:"Reservadas", limpieza:"En limpieza" };
  const label = byLabel[filter] || "";
  document.querySelectorAll(".btn-modern").forEach(b=>{
    const txt = (b.textContent || "").trim();
    if (label && txt.includes(label)) b.classList.add("active-filter","ring-4","ring-opacity-50");
  });

  const container = document.getElementById("cards-container");
  const empty     = document.getElementById("empty-state");
  container.innerHTML = "";

  // aplica filtro por estado y búsqueda por nombre
  let list = [...mesas];
  if (filter !== "all") list = list.filter(m => m.estado === filter);
  if (searchTerm) list = list.filter(m => norm(m.nombre).includes(searchTerm));

  if (!list.length) {
    empty?.classList.remove("hidden");
    return;
  } else {
    empty?.classList.add("hidden");
  }

  list.forEach((m, idx)=>{
    const disabled = isBlocked(m.estado);

    const card = document.createElement("div");
    card.className = "mesa-card bg-white rounded-2xl shadow-lg p-6 border border-slate-100 transition-transform";
    card.style.animationDelay = `${idx * 0.06}s`;
    card.classList.add("animate-fade-in");

    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <h3 class="text-2xl font-bold text-slate-800">${esc(m.nombre)}</h3>
          <p class="text-slate-500 text-sm mt-0.5">ID: ${esc(m.id)}</p>
        </div>
        <div class="w-14 h-14 rounded-xl flex items-center justify-center" style="background-color:${m.color}22;border:1px solid ${m.color}55;">
          <i class="fas fa-chair" style="color:${m.color}"></i>
        </div>
      </div>

      <div class="space-y-4 mt-5">
        <div class="flex items-center justify-between">
          <span class="text-slate-600 font-medium">Estado</span>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold" style="background-color:${m.color}22;color:${m.color};border:1px solid ${m.color}55;">${esc(cap(m.estado))}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-slate-600 font-medium">Tipo</span>
          <span class="text-slate-800 font-semibold">${esc(m.tipoNombre)}</span>
        </div>

        <div class="flex items-center justify-between">
          <span class="text-slate-600 font-medium">Capacidad</span>
          <div class="flex items-center">
            <i class="fas fa-users text-slate-400 mr-2"></i>
            <span class="text-slate-800 font-semibold">${m.capacidad || 0} personas</span>
          </div>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-slate-100">
        <div class="flex gap-2">
          <button data-id="${m.id}" class="btn-edit flex-1 px-4 py-2 rounded-lg text-white text-sm ${disabled?'bg-slate-300 cursor-not-allowed':'bg-amber-500 hover:bg-amber-600'}">
            <i class="fa fa-pen mr-2"></i> Editar
          </button>
          <button data-id="${m.id}" class="btn-del flex-1 px-4 py-2 rounded-lg text-white text-sm ${disabled?'bg-slate-300 cursor-not-allowed':'bg-red-500 hover:bg-red-600'}">
            <i class="fa fa-trash mr-2"></i> Eliminar
          </button>
        </div>
      </div>
    `;

    // Hover efectos sutiles
    card.addEventListener("mouseenter", ()=>{ card.style.transform = "scale(1.02)"; });
    card.addEventListener("mouseleave", ()=>{ card.style.transform = "scale(1)"; });

    container.appendChild(card);
  });

  // Bind acciones
  container.querySelectorAll(".btn-edit").forEach(btn=>btn.addEventListener("click", onClickEdit));
  container.querySelectorAll(".btn-del").forEach(btn=>btn.addEventListener("click", onClickDelete));
}

function updateCounters(){
  const pool = searchTerm
    ? mesas.filter(m => norm(m.nombre).includes(searchTerm))
    : mesas;

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
  const id = e.currentTarget.getAttribute("data-id");
  const mesa = mesas.find(m=>`${m.id}` === `${id}`);
  if (!mesa) return;

  if (isBlocked(mesa.estado)) {
    showToast("No se puede editar una mesa Ocupada o Reservada.", "warning");
    return;
  }
  currentEditingId = mesa.id;

  populateUpdateSelects();
  document.getElementById("update-nombre").value = mesa.nombre;
  if (mesa.idTipoMesa)   document.getElementById("update-tipoMesa").value = mesa.idTipoMesa;
  if (mesa.idEstadoMesa) document.getElementById("update-estadoMesa").value = mesa.idEstadoMesa;

  showModal("update-modal");
}

function onClickDelete(e){
  const id = e.currentTarget.getAttribute("data-id");
  const mesa = mesas.find(m=>`${m.id}` === `${id}`);
  if (!mesa) return;

  if (isBlocked(mesa.estado)) {
    showToast("No se puede eliminar una mesa Ocupada o Reservada.", "warning");
    return;
  }
  document.getElementById("delete-id").value = mesa.id;
  showModal("delete-modal");
}

/* ===== CRUD ===== */
window.addMesa = async ()=>{
  const nombre = (document.getElementById("add-nombre")?.value || "").trim();
  const idTipo = document.getElementById("add-tipoMesa")?.value || "";
  const idLibre = document.getElementById("add-estadoMesa")?.value || (estadosCatalog.find(e=>e.nombre==="libre")?.id);

  if (!nombre){ showMessage("add-message","El nombre es obligatorio","error"); return; }
  if (nombre.length > 100){ showMessage("add-message","Máximo 100 caracteres","error"); return; }
  if (!idTipo){ showMessage("add-message","Selecciona un tipo de mesa","error"); return; }
  if (!idLibre){ showMessage("add-message","No se encontró el estado Libre","error"); return; }

  try{
    await ServiceMesas.createMesa({
      Id: null,
      NomMesa: nombre,
      IdTipoMesa: Number(idTipo),
      IdEstadoMesa: Number(idLibre), // siempre Libre
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
  const nombre  = (document.getElementById("update-nombre")?.value || "").trim();
  const idTipo  = document.getElementById("update-tipoMesa")?.value || "";
  const idEstado= document.getElementById("update-estadoMesa")?.value || "";

  const mesaActual = mesas.find(m=>m.id===currentEditingId);
  if (!mesaActual){ showMessage("update-message","Mesa no encontrada","error"); return; }
  if (isBlocked(mesaActual.estado)) {
    showMessage("update-message","No se puede actualizar mesas Ocupadas o Reservadas.","warning"); return;
  }

  if (!nombre){ showMessage("update-message","El nombre es obligatorio","error"); return; }
  if (nombre.length > 100){ showMessage("update-message","Máximo 100 caracteres","error"); return; }
  if (!idTipo){ showMessage("update-message","Selecciona un tipo de mesa","error"); return; }
  if (!idEstado){ showMessage("update-message","Selecciona un estado","error"); return; }

  try{
    await ServiceMesas.updateMesa(currentEditingId, {
      Id: currentEditingId,
      NomMesa: nombre,
      IdTipoMesa: Number(idTipo),
      IdEstadoMesa: Number(idEstado),
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

  const mesa = mesas.find(m=>m.id===id);
  if (!mesa){ showMessage("delete-message","Mesa no encontrada","error"); return; }
  if (isBlocked(mesa.estado)) {
    showMessage("delete-message","No se puede eliminar mesas Ocupadas o Reservadas","warning"); return;
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
  if (c){ c.style.transform="scale(0.96)"; c.style.opacity="0"; }
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
      window.location.href = "index.html";
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

function ensureEstado(nombre,color){
  if (!estadosCatalog.find(e=>e.nombre===nombre)) {
    estadosCatalog.push({ id: nombre.toUpperCase(), nombre, color });
  }
}
