// js/jsControllers/ControllerReserva.js
import {
  getReservas, createReserva, updateReserva, deleteReserva,
  getMesasAll, getTiposMesaAll, getTiposReservaAll, getEstadosReservaAll,
  setAuthBearer
} from "../jsService/ServiceReservas.js";

/* ==== helpers ==== */
const $ = (s) => document.querySelector(s);
const pad2 = (n) => String(n).padStart(2, "0");
const pick = (obj, keys) => { for (const k of keys) if (obj?.[k] != null) return obj[k]; return null; };

const toInputDate = (v) => {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d,m,y]=s.split("/"); return `${y}-${pad2(m)}-${pad2(d)}`; }
  return s.length >= 10 ? s.slice(0,10) : s;
};
const toInputTime = (v) => (v ? String(v).slice(0,5) : "");
const formatDate   = (v) => { const iso = toInputDate(v); if (!iso) return ""; const [y,m,d]=iso.split("-"); return `${d}/${m}/${y}`; };
const formatTime   = (v) => toInputTime(v) || "--:--";
const makeDT       = (iso, hhmm) => new Date(`${iso}T${hhmm}:00`);

const getFecha = (r) => pick(r, ["fReserva","FReserva","fechaReserva","fecha_reserva","fecha"]);
const getHoraI = (r) => pick(r, ["horaI","HoraI","horai","horaInicio","hora_inicio"]);
const getHoraF = (r) => pick(r, ["horaF","HoraF","horaf","horaFin","hora_fin"]);
const getIdMesa = (r) => { const v = pick(r, ["idMesa","IdMesa","idmesa","mesaId","id_mesa"]); return v==null?null:Number(v); };

/* ==== UI mensajes ==== */
function showMsg(msg) { const m=$("#reservation-message"); if(!m) return; m.textContent=msg; m.className="block px-4 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200"; }
function hideMsg(){ const m=$("#reservation-message"); if(!m) return; m.textContent=""; m.className="hidden"; }
function toggleInvalid(id, bad){ const el=document.getElementById(id); if(el) el.classList.toggle("invalid", !!bad); }
function handle401Where(where){ showMsg(`No autorizado para ${where}. Verifica sesión/token en backend.`); }

/* ==== estado ==== */
function computeStatusKey(fReserva, horaI, horaF){
  if(!fReserva||!horaI||!horaF) return "pending";
  const start = makeDT(toInputDate(fReserva), toInputTime(horaI));
  const end   = makeDT(toInputDate(fReserva), toInputTime(horaF));
  const now   = new Date();
  if(now < start) return "pending";
  if(now >= start && now <= end) return "in-progress";
  return "completed";
}
function statusPill(k){
  const m = {
    "pending":     { cls: "bg-yellow-100 text-yellow-800", icon: "fa-clock",    txt: "Pendiente" },
    "in-progress": { cls: "bg-blue-100 text-blue-800",     icon: "fa-utensils", txt: "En curso"  },
    "completed":   { cls: "bg-green-100 text-green-800",   icon: "fa-check",    txt: "Completada" },
  }[k] || { cls: "bg-gray-100 text-gray-800", icon: "fa-question", txt: "-" };
  return `<span class="px-3 py-1 rounded-full text-xs font-medium ${m.cls}"><i class="fas ${m.icon} mr-1"></i>${m.txt}</span>`;
}
function estadoIdDesdeClave(key){
  const candidatos = {
    "pending":["pendiente","espera"],
    "in-progress":["proceso","en proceso"],
    "completed":["finalizada","finalizado","completada","completado"],
  }[key] || [];
  for (const n of estados.keys()) if (candidatos.some(c=>n.includes(c))) return estados.get(n);
  const it = estados.values().next(); return it && !it.done ? it.value : null;
}

/* ==== datos ==== */
let currentPage=0, pageSize=10, rawPage=null;
let reservas=[];
let mesas=[];              // {id, nomMesa, idTipoMesa}
let tipoMesaCap=new Map(); // idTipoMesa -> capacidad
let tiposReserva=[];       // array
let tipoReservaById=new Map();
let estados=new Map();
let editingId=null;

/* ==== init ==== */
document.addEventListener("DOMContentLoaded", async () => {
  // soporte opcional para token en query (?token=...)
  const token = new URLSearchParams(location.search).get("token");
  if (token) setAuthBearer(token);

  $("#items-per-page")?.addEventListener("change", async (e)=>{ pageSize=parseInt(e.target.value,10)||10; currentPage=0; await loadAndRender(); });
  $("#add-reservation-btn")?.addEventListener("click", openCreateModal);
  $("#close-modal")?.addEventListener("click", closeModal);
  $("#cancel-reservation")?.addEventListener("click", closeModal);
  $("#reservation-form")?.addEventListener("submit", submitForm);
  $("#search-input")?.addEventListener("input", renderTable);

  setupLiveValidation();

  await bootstrapCatalogs();
  await loadAndRender();
});

/* ==== catálogos ==== */
async function bootstrapCatalogs(){
  tipoMesaCap.clear(); estados.clear(); tipoReservaById.clear();

  try {
    const [tMesa, mList, tRes] = await Promise.all([
      getTiposMesaAll(), getMesasAll(), getTiposReservaAll()
    ]);

    (tMesa ?? []).forEach(t => {
      const id = Number(pick(t, ["id","Id","idTipoMesa"]));
      const cap = Number(pick(t, ["capacidadPersonas","capacidad","capacidad_personas"])) || 0;
      if (!Number.isNaN(id)) tipoMesaCap.set(id, cap);
    });

    mesas = (mList ?? []).map(m => ({
      id: Number(pick(m, ["id","Id"])) || null,
      nomMesa: pick(m, ["nomMesa","NomMesa","nombre","mesa"]) ?? `Mesa ${pick(m,["id","Id"])}`,
      idTipoMesa: Number(pick(m, ["idTipoMesa","IdTipoMesa","idtipomesa","tipoMesaId","id_tipo_mesa"])) || null,
    })).filter(x => x.id !== null);

    tiposReserva = tRes ?? [];
    tipoReservaById.clear();
    tiposReserva.forEach(t => {
      const id  = Number(pick(t, ["id","Id"]));
      const nom = pick(t, ["nomTipo","nombre"]) ?? `Tipo ${id}`;
      if (!Number.isNaN(id)) tipoReservaById.set(id, nom);
    });
  } catch(e) {
    console.error("[bootstrapCatalogs]", e);
    if (e?.status === 401) handle401Where("cargar catálogos (Mesas/Tipo Reserva)");
  }

  try {
    const list = await getEstadosReservaAll();
    estados.clear();
    (list ?? []).forEach(e => {
      const n = String(pick(e, ["nomEstado","NomEstado","nombre"]) || "").toLowerCase();
      const id = Number(pick(e, ["id","Id"]));
      if (n && !Number.isNaN(id)) estados.set(n, id);
    });
  } catch(e) {
    console.warn("[EstadosReserva] no cargó:", e?.status || e);
  }

  fillTipoReservaSelect();
  fillMesaSelect();
}

/* ==== helpers de selects ==== */
function ensureOptionExists(sel, value, label){
  if (!sel) return;
  const v = String(value);
  const exists = Array.from(sel.options).some(o => o.value === v);
  if (!exists) sel.insertAdjacentHTML("beforeend", `<option value="${v}">${label ?? v}</option>`);
}
function fillTipoReservaSelect(){
  const sel=$("#tipo-reserva-select"); if(!sel) return;
  sel.innerHTML=`<option value="">Seleccione tipo</option>`;
  if(!tiposReserva.length){ sel.innerHTML = `<option value="">(sin datos)</option>`; sel.disabled=true; return; }
  sel.disabled=false;
  tiposReserva.forEach(t=>{
    const id=Number(pick(t,["id","Id"]));
    const nom=pick(t,["nomTipo","nombre"]) ?? `Tipo ${id}`;
    sel.insertAdjacentHTML("beforeend", `<option value="${id}">${nom}</option>`);
  });
}
function fillMesaSelect(){
  const sel=$("#mesa-select"); if(!sel) return;
  sel.innerHTML=`<option value="">Seleccione mesa</option>`;
  if(!mesas.length){ sel.innerHTML = `<option value="">(sin datos)</option>`; sel.disabled=true; return; }
  sel.disabled=false;
  mesas.forEach(m=>{
    const cap=tipoMesaCap.get(m.idTipoMesa) ?? 0;
    const label=`${m.nomMesa ?? `Mesa ${m.id}`}${cap ? ` — ${cap} personas` : ""}`;
    sel.insertAdjacentHTML("beforeend", `<option value="${m.id}">${label}</option>`);
  });
}

/* ==== listado ==== */
async function loadAndRender(){
  try {
    rawPage = await getReservas(currentPage, pageSize);
    reservas = rawPage?.content ?? [];
    renderTable(); renderPagination(); updateStats();
  } catch(e) {
    console.error("[getReservas]", e);
    if (e?.status === 401) handle401Where("listar reservaciones");
  }
}
function renderTable(){
  const container=$("#reservations-container"); if(!container) return;
  const q = ($("#search-input")?.value || "").toLowerCase();

  const rows = reservas
    .filter(r => {
      const fecha = formatDate(getFecha(r)) || "";
      const tipoNom = tipoReservaById.get(Number(r.idTipoReserva)) || "";
      const text = `${r.nomCliente||""} ${r.telefono||""} ${fecha} ${tipoNom}`.toLowerCase();
      return text.includes(q);
    })
    .map(r => rowHtml(r)).join("");

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="table-header">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Horario</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Personas</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Mesa</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          ${rows || `<tr><td colspan="9" class="px-6 py-12 text-center text-gray-500">Sin resultados</td></tr>`}
        </tbody>
      </table>
    </div>`;
}
function rowHtml(r){
  const fecha=getFecha(r), horaI=getHoraI(r), horaF=getHoraF(r), idMesa=getIdMesa(r);
  const estadoKey=computeStatusKey(fecha, horaI, horaF);
  const m = mesas.find(x => x.id === idMesa);
  const nombreMesa = m ? (m.nomMesa || `Mesa ${m.id}`) : (idMesa ? `Mesa ${idMesa}` : "-");
  const tipoNom = tipoReservaById.get(Number(r.idTipoReserva)) || "-";

  return `
    <tr class="table-row">
      <td class="px-6 py-4">
        <div class="flex items-center">
          <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            ${((r.nomCliente || '?')[0] || '?').toUpperCase()}
          </div>
          <div class="ml-4"><div class="text-sm font-medium text-gray-900">${r.nomCliente || ''}</div></div>
        </div>
      </td>
      <td class="px-6 py-4 text-sm text-gray-900"><i class="fas fa-phone text-gray-400 mr-2"></i>${r.telefono || ''}</td>
      <td class="px-6 py-4 text-sm text-gray-900"><i class="fas fa-calendar text-gray-400 mr-2"></i>${formatDate(fecha) || '-'}</td>
      <td class="px-6 py-4 text-sm text-gray-900"><i class="fas fa-clock text-gray-400 mr-2"></i>${formatTime(horaI)} - ${formatTime(horaF)}</td>
      <td class="px-6 py-4 text-sm text-gray-900"><i class="fas fa-users text-gray-400 mr-2"></i>${r.cantidadPersonas || 0}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${tipoNom}</td>
      <td class="px-6 py-4 text-sm text-gray-900">${nombreMesa}</td>
      <td class="px-6 py-4">${statusPill(estadoKey)}</td>
      <td class="px-6 py-4 text-sm font-medium">
        <div class="flex space-x-2">
          <button class="modern-btn bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 text-xs" title="Editar" onclick="window.__editRes(${r.id})"><i class="fas fa-edit"></i></button>
          <button class="modern-btn bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 text-xs" title="Eliminar" onclick="window.__delRes(${r.id})"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
}

/* ==== paginación ==== */
function renderPagination(){
  const totalPages=rawPage?.totalPages ?? 1, number=rawPage?.number ?? 0;
  const prev=$("#prev-page"), next=$("#next-page"), curr=$("#current-page"), tot=$("#total-pages"), nums=$("#page-numbers"), cont=$("#pagination-container");
  if(!prev||!next||!curr||!tot||!nums||!cont) return;
  curr.textContent = number+1; tot.textContent = totalPages;
  prev.disabled = number<=0; next.disabled = number>=totalPages-1;
  prev.onclick = ()=>{ if(currentPage>0){ currentPage--; loadAndRender(); } };
  next.onclick = ()=>{ if(currentPage<totalPages-1){ currentPage++; loadAndRender(); } };
  nums.innerHTML=""; const max=5;
  let start=Math.max(0, number-Math.floor(max/2)); let end=Math.min(totalPages-1, start+max-1);
  if (end-start+1<max) start=Math.max(0, end-max+1);
  for(let i=start;i<=end;i++){
    const b=document.createElement("button");
    b.className=`pagination-btn ${i===number?'active':''}`; b.textContent=String(i+1);
    b.onclick=()=>{ currentPage=i; loadAndRender(); }; nums.appendChild(b);
  }
  cont.style.display = totalPages>1 ? "flex" : "none";
}

/* ==== modal + form ==== */
function openCreateModal(){
  editingId=null;
  $("#reservation-modal-title").textContent="Nueva Reservación";
  resetForm();
  showModal(true);
}
function openEditModal(id){
  const r=reservas.find(x=>x.id===id); if(!r) return; editingId=id;
  $("#reservation-modal-title").textContent="Editar Reservación";

  // Aseguramos que los selects tengan opciones antes de asignar valores
  if (!$("#tipo-reserva-select")?.options?.length) fillTipoReservaSelect();
  if (!$("#mesa-select")?.options?.length) fillMesaSelect();

  $("#customer-name").value=r.nomCliente||"";
  $("#customer-phone").value=r.telefono||"";
  $("#reservation-date").value=toInputDate(getFecha(r));
  $("#reservation-time").value=toInputTime(getHoraI(r));
  $("#reservation-end-time").value=toInputTime(getHoraF(r));
  $("#guest-count").value=r.cantidadPersonas||1;

  const tipoVal = r.idTipoReserva ?? "";
  const mesaVal = getIdMesa(r) ?? "";

  // si la opción no existe (IDs viejos), la inyectamos para que se vea
  if (tipoVal) ensureOptionExists($("#tipo-reserva-select"), tipoVal, tipoReservaById.get(Number(tipoVal)) || `Tipo ${tipoVal}`);
  if (mesaVal) {
    const m = mesas.find(x => x.id === Number(mesaVal));
    ensureOptionExists($("#mesa-select"), mesaVal, m?.nomMesa || `Mesa ${mesaVal}`);
  }

  $("#tipo-reserva-select").value = String(tipoVal || "");
  $("#mesa-select").value         = String(mesaVal || "");

  showModal(true);
}
function resetForm(){ $("#reservation-form")?.reset(); hideMsg(); fillTipoReservaSelect(); fillMesaSelect(); }
function showModal(show){ const m=$("#reservation-modal"); show?m.classList.remove("hidden"):m.classList.add("hidden"); document.body.style.overflow=show?"hidden":"auto"; }
function closeModal(){ showModal(false); }

/* ==== validaciones ==== */
function setupLiveValidation(){
  const name=$("#customer-name"), phone=$("#customer-phone");
  if(name){ name.addEventListener("input", ()=>{ const c=name.selectionStart; name.value=name.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,""); name.setSelectionRange(c,c); }); }
  if(phone){ phone.addEventListener("input", ()=>{ const c=phone.selectionStart; let v=phone.value.replace(/\D/g,""); if(v.length>8)v=v.slice(0,8); if(v.length>4)v=v.slice(0,4)+"-"+v.slice(4); phone.value=v; phone.setSelectionRange(c,c); }); }
  $("#reservation-time")?.addEventListener("change", ensureEndMin);
}
function validateName(){ const v=($("#customer-name").value||"").trim(); const ok=/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,60}$/.test(v)&&v.split(/\s+/).length>=2; toggleInvalid("customer-name",!ok); return ok; }
function validatePhone(){ const v=($("#customer-phone").value||""); const ok=/^\d{4}-\d{4}$/.test(v); toggleInvalid("customer-phone",!ok); return ok; }
function validateTimes(){
  const s=$("#reservation-time").value, e=$("#reservation-end-time").value;
  if(!s||!e) return true;
  if(e<=s){ showMsg("La hora fin debe ser posterior a la de inicio."); return false; }
  const [sh,sm]=s.split(":").map(Number), [eh,em]=e.split(":").map(Number);
  if((eh*60+em)-(sh*60+sm)<30){ showMsg("Duración mínima 30 minutos."); return false; }
  hideMsg(); return true;
}
function ensureEndMin(){
  const start=$("#reservation-time").value; if(!start) return;
  const end=$("#reservation-end-time"); const [h,m]=start.split(":").map(Number);
  const d=new Date(0,0,0,h,m+30); end.min=`${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if(end.value && end.value<end.min) end.value=end.min;
}

/* ==== guardar ==== */
async function submitForm(e){
  e.preventDefault(); hideMsg();
  if(!validateName())  return showMsg("Nombre inválido. Solo letras y mínimo 2 palabras.");
  if(!validatePhone()) return showMsg("Teléfono inválido. Formato: 0000-0000.");

  const f=$("#reservation-date").value;
  const hi=($("#reservation-time").value||"").slice(0,5);
  const hf=($("#reservation-end-time").value||"").slice(0,5);
  const mesaSel=$("#mesa-select").value;
  const tipoSel=$("#tipo-reserva-select").value;

  if(!f) return showMsg("La fecha es obligatoria.");
  if(!hi) return showMsg("La hora inicio es obligatoria.");
  if(!hf) return showMsg("La hora fin es obligatoria.");
  if(!validateTimes()) return;
  if(!tipoSel) return showMsg("Seleccione un tipo de reserva.");
  if(!mesaSel) return showMsg("Seleccione una mesa.");

  const idMesa = Number(mesaSel);
  const idTipoReserva = parseInt(tipoSel, 10);
  if (!Number.isFinite(idMesa) || idMesa <= 0) return showMsg("Mesa inválida.");
  if (!Number.isFinite(idTipoReserva) || idTipoReserva <= 0) return showMsg("Tipo de reserva inválido.");

  try{
    await refreshEstados();
    const estadoKey=computeStatusKey(f,hi,hf);
    const idEstado=estadoIdDesdeClave(estadoKey) ?? undefined;

    const payload={
      // muchos backends esperan el id también en el body del PUT:
      ...(editingId ? { id: editingId } : {}),
      nomCliente: $("#customer-name").value.trim(),
      telefono: $("#customer-phone").value.trim(),
      idMesa,
      fReserva: f,
      horaI: hi,
      horaF: hf,
      cantidadPersonas: parseInt($("#guest-count").value||"1",10),
      idTipoReserva,
      ...(idEstado ? { idEstadoReserva: idEstado } : {}),
    };

    // console.debug("payload =>", payload);

    if(editingId) await updateReserva(editingId, payload);
    else          await createReserva(payload);

    closeModal(); await loadAndRender();
  } catch(err){
    console.error("[save]", err);
    if (err?.status === 401) return showMsg("No autorizado para guardar. Inicia sesión o usa token.");
    showMsg("Error al guardar la reservación.");
  }
}
async function refreshEstados(){
  try{
    const list=await getEstadosReservaAll(); estados.clear();
    (list ?? []).forEach(e=>{
      const n=String(pick(e,["nomEstado","NomEstado","nombre"])||"").toLowerCase();
      const id=Number(pick(e,["id","Id"])); if(n && !Number.isNaN(id)) estados.set(n,id);
    });
  }catch(e){ console.warn("[refreshEstados]", e?.status||e); }
}

/* ==== stats y acciones ==== */
function updateStats(){
  const total=reservas.length;
  const pending=reservas.filter(r=>computeStatusKey(getFecha(r),getHoraI(r),getHoraF(r))==="pending").length;
  const inprog =reservas.filter(r=>computeStatusKey(getFecha(r),getHoraI(r),getHoraF(r))==="in-progress").length;
  const compl  =reservas.filter(r=>computeStatusKey(getFecha(r),getHoraI(r),getHoraF(r))==="completed").length;
  ($("#total-reservations")||{}).textContent=total;
  ($("#pending-reservations")||{}).textContent=pending;
  ($("#in-progress-reservations")||{}).textContent=inprog;
  ($("#cancelled-reservations")||{}).textContent=0;
}
window.__editRes = (id) => openEditModal(id);
window.__delRes = async (id) => {
  if (!confirm("¿Eliminar esta reservación?")) return;
  try { await deleteReserva(id); await loadAndRender(); }
  catch(e){ console.error(e); if(e?.status===401) handle401Where("eliminar reservaciones"); else alert("No se pudo eliminar."); }
};
