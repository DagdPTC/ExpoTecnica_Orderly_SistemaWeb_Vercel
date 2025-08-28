// controllers/reservaController.js
import {
  getReservas,
  createReserva,
  updateReserva,
  deleteReserva,
  getTiposReserva,
  getEstadosReserva,
  getMesas,
} from "../jsService/ServiceReservas.js";

/* ====== Estado global ====== */
let reservations = [];
let apiTotalPages = 1;
let currentPage = 1;
let itemsPerPage = 10;

let isEditing = false;
let currentReservationId = null;

let estados = [];  // [{Id, NomEstado}]
let tipos = [];    // [{Id, NomTipo}]
let mesas = [];    // [{Id, NomMesa, capacidad}]
let selectedMesaId = null;

const qs = (s) => document.querySelector(s);

/* ====== Utils ====== */
function unwrapPage(json) {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.content)) return json.content;
  for (const k of Object.keys(json)) { if (Array.isArray(json[k])) return json[k]; }
  return [];
}
function monthToNumber(m) {
  if (typeof m === "number") return m;
  const map = { JANUARY:1,FEBRUARY:2,MARCH:3,APRIL:4,MAY:5,JUNE:6,JULY:7,AUGUST:8,SEPTEMBER:9,OCTOBER:10,NOVEMBER:11,DECEMBER:12 };
  return map[(m||"").toString().toUpperCase()] || 1;
}
function parseDate(val) {
  if (val && typeof val === "object" && ("year" in val)) {
    const y = val.year, m = String(val.monthValue ?? monthToNumber(val.month)).padStart(2,"0"), d = String(val.dayOfMonth ?? val.day ?? 1).padStart(2,"0");
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }
  if (Array.isArray(val) && val.length >= 3) {
    const y=val[0], m=String(val[1]).padStart(2,"0"), d=String(val[2]).padStart(2,"0");
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    const [y,m,d] = val.slice(0,10).split("-");
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }
  const s = val != null ? String(val) : "";
  return { iso: s, display: s };
}
function parseTime(val) {
  if (val && typeof val === "object" && ("hour" in val || "minute" in val)) {
    const h = String(val.hour ?? 0).padStart(2,"0");
    const m = String(val.minute ?? 0).padStart(2,"0");
    return `${h}:${m}`;
  }
  if (Array.isArray(val) && val.length >= 2) {
    const h=String(val[0]).padStart(2,"0"), m=String(val[1]).padStart(2,"0");
    return `${h}:${m}`;
  }
  if (typeof val === "string" && val.length >= 5) return val.slice(0,5);
  return "";
}
function combineDateTimeISO(dateISO, timeHHMM) {
  if (!dateISO || !timeHHMM) return null;
  const [y,m,d] = dateISO.split("-").map(Number);
  const [hh,mm] = timeHHMM.split(":").map(Number);
  return new Date(y, (m-1), d, hh, mm, 0, 0);
}

/* ====== Estado automático ====== */
function autoStatusName(dateISO, startHHMM, endHHMM) {
  const now = new Date();
  const start = combineDateTimeISO(dateISO, startHHMM);
  const end   = combineDateTimeISO(dateISO, endHHMM);
  if (!start || !end) return "Pendiente";
  if (now < start) return "Pendiente";
  if (now >= start && now <= end) return "En proceso";
  return "Finalizada";
}
function estadoIdByName(nameLike) {
  const nm = (nameLike||"").toLowerCase();
  const hit = estados.find(e => (e.NomEstado||"").toLowerCase().includes(nm));
  return hit?.Id ?? null;
}
const ESTADOS = {
  pendiente: () => estadoIdByName("pend"),
  proceso:   () => estadoIdByName("proce"),   // "en proceso"
  finalizada:() => estadoIdByName("final"),
  cancelada: () => estadoIdByName("cancel"),
};

/* ====== Normalizador de Reserva ====== */
function normalizeReservaDTO(raw) {
  const id         = raw.Id ?? raw.id ?? raw.idReserva ?? null;
  const nomCliente = raw.nomCliente ?? raw.NombreCliente ?? raw.nombreCliente ?? "";
  const telefono   = raw.Telefono ?? raw.telefono ?? "";
  const fRes       = raw.fReserva ?? raw.FReserva ?? raw.fechaReserva ?? raw.FechaReserva ?? null;
  const hI         = raw.horaI ?? raw.HoraI ?? raw.horaInicio ?? raw.HoraInicio ?? null;
  const hF         = raw.horaF ?? raw.HoraF ?? raw.horaFin ?? raw.HoraFin ?? null;
  const cant       = raw.CantidadPersonas ?? raw.cantidadPersonas ?? 0;
  const idMesa     = raw.IdMesa ?? raw.idMesa ?? raw?.mesa?.Id ?? raw?.mesa?.id ?? null;
  const idTipo     = raw.idTipoReserva ?? raw.IdTipoReserva ?? null;
  // estado lo recalculamos automáticamente
  const d = parseDate(fRes);

  return {
    id,
    customerName: nomCliente,
    customerPhone: telefono,
    date: d.iso,
    dateDisplay: d.display,
    startTime: parseTime(hI),
    endTime: parseTime(hF),
    guestCount: Number(cant) || 0,
    mesaId: idMesa,
    tipoId: idTipo,
    estadoId: null, // se setea luego con autoStatus
    createdAt: new Date(),
  };
}

function buildPayloadFromForm() {
  const mesa = Number(qs("#selected-mesa-id")?.value || selectedMesaId || 0) || null;
  return {
    nomCliente: qs("#customer-name").value.trim(),
    Telefono: qs("#customer-phone").value.trim(),
    IdMesa: mesa,
    FReserva: qs("#reservation-date").value,         // yyyy-mm-dd
    HoraI: qs("#reservation-time").value,           // hh:mm
    HoraF: qs("#reservation-end-time").value,       // hh:mm
    CantidadPersonas: Number(qs("#guest-count").value) || 0,
    idTipoReserva: qs("#tipo-reserva-select").value ? Number(qs("#tipo-reserva-select").value) : null,
    // IdEstadoReserva -> se calcula automático al guardar
  };
}

async function ensureCatalogsLoaded() {
  const tasks = [];
  if (!estados.length) tasks.push(loadEstadosReserva());
  if (!tipos.length)   tasks.push(loadTiposReserva());
  if (!mesas.length)   tasks.push(loadMesas());
  if (tasks.length) await Promise.all(tasks);
}

/* ====== Init ====== */
document.addEventListener("DOMContentLoaded", async () => {
  await ensureCatalogsLoaded();

  const ipp = qs("#items-per-page");
  if (ipp) {
    itemsPerPage = parseInt(ipp.value, 10) || 10;
    ipp.addEventListener("change", () => {
      itemsPerPage = parseInt(ipp.value, 10) || 10;
      currentPage = 1;
      loadReservas();
    });
  }

  qs("#filter-status")?.addEventListener("change", applyFilters);
  qs("#search-input")?.addEventListener("input", applyFilters);

  qs("#prev-page")?.addEventListener("click", () => { if (currentPage > 1) { currentPage--; loadReservas(); } });
  qs("#next-page")?.addEventListener("click", () => { if (currentPage < apiTotalPages) { currentPage++; loadReservas(); } });

  qs("#add-reservation-btn")?.addEventListener("click", async () => {
    isEditing = false; currentReservationId = null;
    qs("#reservation-modal-title").textContent = "Nueva Reservación";
    await ensureCatalogsLoaded();
    resetForm();
    // preparar grid de mesas
    renderMesasGrid(null);
    openModal();
  });
  qs("#close-modal")?.addEventListener("click", closeModal);
  qs("#cancel-reservation")?.addEventListener("click", closeModal);

  qs("#reservation-form")?.addEventListener("submit", onSubmitReserva);

  qs("#reservations-container")?.addEventListener("click", onTableClick);

  await loadReservas();
});

/* ====== Catálogos ====== */
async function loadEstadosReserva() {
  try {
    const page = await getEstadosReserva(0, 200);
    const list = unwrapPage(page);
    estados = list.map(e => ({ Id: e.Id ?? e.id, NomEstado: e.NomEstado ?? e.nomEstado ?? e.nombreEstado ?? "" }));
    const filtro = qs("#filter-status");
    if (filtro) {
      filtro.innerHTML = `<option value="all" selected>Todos</option>` +
        estados.map(x => `<option value="estado-${x.Id}">${x.NomEstado}</option>`).join("");
    }
  } catch (e) {
    console.error("Error cargando estados:", e);
  }
}
async function loadTiposReserva() {
  try {
    const page = await getTiposReserva(0, 200);
    const list = unwrapPage(page);
    tipos = list.map(t => ({ Id: t.Id ?? t.id, NomTipo: t.NomTipo ?? t.nomTipo ?? t.nombreTipo ?? "" }));
    const sel = qs("#tipo-reserva-select");
    if (sel) {
      sel.innerHTML = `<option value="">Seleccione tipo</option>` +
        tipos.map(x => `<option value="${x.Id}">${x.NomTipo}</option>`).join("");
    }
  } catch (e) {
    console.error("Error cargando tipos:", e);
    const sel = qs("#tipo-reserva-select");
    if (sel) sel.innerHTML = `<option value="">(Error al cargar tipos)</option>`;
  }
}
function mesaCap(m) {
  return Number(m.capacidad ?? m.Capacidad ?? m.capacidadPersonas ?? m.CantidadPersonas ?? 0);
}
async function loadMesas() {
  try {
    const page = await getMesas(0, 500);
    const list = unwrapPage(page);
    mesas = list.map(m => ({
      Id: m.Id ?? m.id ?? m.idMesa ?? m.IdMesa,
      NomMesa: m.NomMesa ?? m.nomMesa ?? m.nombreMesa ?? m.NombreMesa ?? `Mesa ${m.Id ?? m.id ?? ""}`,
      capacidad: mesaCap(m),
    })).filter(x => x.Id != null);
  } catch (e) {
    console.error("Error cargando mesas:", e);
  }
}

/* ====== Grid de Mesas ====== */
function renderMesasGrid(preselectId) {
  const grid = qs("#tables-grid");
  const capEl = qs("#capacity-total");
  const hidden = qs("#selected-mesa-id");
  selectedMesaId = preselectId ?? null;
  if (!grid) return;

  grid.innerHTML = mesas.map(m => {
    const sel = selectedMesaId != null && Number(selectedMesaId) === Number(m.Id);
    return `
      <button type="button"
        class="mesa-tile ${sel ? 'selected ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-200'} w-16 h-16 rounded-xl border border-gray-200 flex flex-col items-center justify-center"
        data-id="${m.Id}" data-cap="${m.capacidad}">
        <div class="text-base font-semibold">${m.Id}</div>
        <div class="text-xs">${m.capacidad}p</div>
      </button>
    `;
  }).join("");

  grid.onclick = (e) => {
    const tile = e.target.closest(".mesa-tile");
    if (!tile) return;
    grid.querySelectorAll(".mesa-tile.selected").forEach(b => b.classList.remove("selected","ring-2","ring-blue-500"));
    tile.classList.add("selected","ring-2","ring-blue-500");
    selectedMesaId = Number(tile.dataset.id);
    if (hidden) hidden.value = String(selectedMesaId);
    if (capEl) capEl.textContent = tile.dataset.cap || "0";
  };

  if (hidden) hidden.value = selectedMesaId ? String(selectedMesaId) : "";
  if (capEl) capEl.textContent = selectedMesaId ? String(mesas.find(x=>x.Id===selectedMesaId)?.capacidad ?? 0) : "0";
}

/* ====== CRUD Reservas ====== */
async function loadReservas() {
  try {
    const pageForApi = currentPage - 1;
    const pageData = await getReservas(pageForApi, itemsPerPage);
    const content = unwrapPage(pageData);
    reservations = content.map(normalizeReservaDTO);

    // aplicar estado automático a todas
    reservations.forEach(r => {
      const name = autoStatusName(r.date, r.startTime, r.endTime);
      r.estadoId = (
        name.includes("Proceso") ? ESTADOS.proceso() :
        name.includes("Final")   ? ESTADOS.finalizada() :
        ESTADOS.pendiente()
      ) || r.estadoId;
    });

    apiTotalPages = Math.max(1, pageData?.totalPages ?? 1);
    applyFilters();
  } catch (err) {
    console.error("Error cargando reservas:", err);
    renderReservationsTable([]);
    updatePagination(1, 1);
    updateStatistics([]);
    showMessage("No se pudieron cargar las reservaciones.", "error");
  }
}

async function onSubmitReserva(e) {
  e.preventDefault();
  hideMessage();

  const payload = buildPayloadFromForm();
  if (!payload.nomCliente || !payload.Telefono || !payload.FReserva || !payload.HoraI || !payload.HoraF ||
      !payload.CantidadPersonas || !payload.IdMesa || !payload.idTipoReserva) {
    showMessage("Completa todos los campos y selecciona una mesa.", "error");
    return;
  }

  // estado automático al guardar
  const autoName = autoStatusName(payload.FReserva, payload.HoraI, payload.HoraF);
  let estadoId =
    (autoName.includes("Proceso") && ESTADOS.proceso()) ||
    (autoName.includes("Final")   && ESTADOS.finalizada()) ||
    ESTADOS.pendiente();
  const body = { ...payload, IdEstadoReserva: estadoId };

  try {
    if (isEditing && currentReservationId != null) {
      await updateReserva(currentReservationId, { Id: currentReservationId, ...body });
    } else {
      await createReserva(body);
    }
    closeModal();
    currentPage = 1;
    await loadReservas();
    alert(isEditing ? "Reservación actualizada" : "Reservación creada");
  } catch (err) {
    console.error(err);
    showMessage("Error al guardar la reservación.", "error");
  }
}

async function onTableClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const action = btn.dataset.action;

  if (action === "edit") {
    await ensureCatalogsLoaded();
    const r = reservations.find(x => x.id === id);
    if (!r) return;
    isEditing = true; currentReservationId = id;

    qs("#reservation-modal-title").textContent = "Editar Reservación";
    qs("#customer-name").value = r.customerName || "";
    qs("#customer-phone").value = r.customerPhone || "";
    qs("#reservation-date").value = r.date || "";
    qs("#reservation-time").value = r.startTime || "";
    qs("#reservation-end-time").value = r.endTime || "";
    qs("#guest-count").value = r.guestCount || 0;
    qs("#tipo-reserva-select").value = r.tipoId ? String(r.tipoId) : "";

    renderMesasGrid(r.mesaId);
    qs("#special-notes").value = "";

    openModal();
  }

  if (action === "delete") {
    if (!confirm("¿Desea eliminar la reservación?")) return;
    try {
      await deleteReserva(id);
      await loadReservas();
      alert("Reservación eliminada");
    } catch (err) {
      console.error(err);
      showMessage("Error al eliminar la reservación.", "error");
    }
  }

  if (action === "cancel") {
    if (!confirm("¿Cancelar esta reservación?")) return;
    const r = reservations.find(x => x.id === id);
    if (!r) return;
    try {
      const payload = {
        nomCliente: r.customerName,
        Telefono: r.customerPhone,
        IdMesa: r.mesaId,
        FReserva: r.date,
        HoraI: r.startTime,
        HoraF: r.endTime,
        CantidadPersonas: r.guestCount,
        idTipoReserva: r.tipoId,
        IdEstadoReserva: ESTADOS.cancelada(),
      };
      await updateReserva(id, { Id: id, ...payload });
      await loadReservas();
      alert("Reservación cancelada");
    } catch (err) {
      console.error(err);
      showMessage("No se pudo cancelar la reservación.", "error");
    }
  }
}

/* ====== Filtros / Render / Paginación / Stats ====== */
function applyFilters() {
  const filtro = qs("#filter-status")?.value || "all";
  const term = (qs("#search-input")?.value || "").toLowerCase();

  const filtered = reservations.filter(r => {
    const matchesSearch =
      (r.customerName || "").toLowerCase().includes(term) ||
      (r.customerPhone || "").includes(term) ||
      (r.date || "").includes(term);

    let matchesEstado = true;
    if (filtro !== "all") {
      const idSel = Number(filtro.replace("estado-", ""));
      matchesEstado = r.estadoId === idSel;
    }
    return matchesSearch && matchesEstado;
  });

  renderReservationsTable(filtered);
  updatePagination(currentPage, apiTotalPages);
  updateStatistics(filtered);
}

function renderReservationsTable(data) {
  const container = qs("#reservations-container");
  if (!container) return;

  const nombreEstado = (id) => estados.find(e => e.Id === id)?.NomEstado ?? "-";
  const nombreMesa   = (id) => {
    const m = mesas.find(x => x.Id === id);
    return m ? (m.NomMesa || `Mesa ${m.Id}`) : (id ? `Mesa ${id}` : "-");
  };

  const badge = (id) => {
    const n = nombreEstado(id).toLowerCase();
    if (n.includes("cancel")) return "status-cancelled";
    if (n.includes("final"))  return "status-completed";
    if (n.includes("proce"))  return "status-in-progress";
    return "status-pending";
  };

  const rows = data.map(r => `
    <tr class="table-row">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              ${r.customerName?.charAt(0)?.toUpperCase() || "?"}
            </div>
          </div>
          <div class="ml-4">
            <div class="text-sm font-medium text-gray-900">${r.customerName || ""}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div class="flex items-center"><i class="fas fa-phone text-gray-400 mr-2"></i>${r.customerPhone || ""}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div class="flex items-center"><i class="fas fa-calendar text-gray-400 mr-2"></i>${r.dateDisplay || ""}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div class="flex items-center"><i class="fas fa-clock text-gray-400 mr-2"></i>${r.startTime || ""} - ${r.endTime || ""}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div class="flex items-center"><i class="fas fa-users text-gray-400 mr-2"></i>${r.guestCount}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        ${nombreMesa(r.mesaId)}
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="status-badge ${badge(r.estadoId)}"><i class="fas fa-check-circle mr-1"></i>${nombreEstado(r.estadoId)}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div class="flex space-x-2">
          <button class="modern-btn bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 text-xs" data-action="edit" data-id="${r.id}" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="modern-btn bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 text-xs" data-action="delete" data-id="${r.id}" title="Eliminar"><i class="fas fa-trash"></i></button>
          <button class="modern-btn bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1 text-xs" data-action="cancel" data-id="${r.id}" title="Cancelar"><i class="fas fa-ban"></i></button>
        </div>
      </td>
    </tr>
  `).join("");

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="min-w-full">
        <thead class="table-header">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Teléfono</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Horario</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Personas</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mesa</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
            <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-100">
          ${rows || `
            <tr>
              <td colspan="8" class="px-6 py-12 text-center text-gray-500">
                <div class="flex flex-col items-center">
                  <i class="fas fa-calendar-alt text-4xl mb-4 text-gray-300"></i>
                  <p class="text-lg font-medium">No se encontraron reservaciones</p>
                  <p class="text-sm">Crea una nueva reservación</p>
                </div>
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;
}

function updatePagination(curr = 1, total = 1) {
  const totalEl = qs("#total-pages");
  const currEl  = qs("#current-page");
  const prev    = qs("#prev-page");
  const next    = qs("#next-page");
  const cont    = qs("#pagination-container");

  totalEl && (totalEl.textContent = total);
  currEl  && (currEl.textContent  = curr);

  prev && (prev.disabled = curr <= 1);
  next && (next.disabled = curr >= total);
  cont && (cont.style.display = total > 1 ? "flex" : "none");

  const pageNumbers = document.querySelector("#page-numbers");
  if (!pageNumbers) return;
  pageNumbers.innerHTML = "";
  const max = 5;
  let start = Math.max(1, curr - Math.floor(max / 2));
  let end   = Math.min(total, start + max - 1);
  if (end - start + 1 < max) start = Math.max(1, end - max + 1);
  for (let i = start; i <= end; i++) {
    const btn = document.createElement("button");
    btn.className = `pagination-btn ${i === curr ? "active" : ""}`;
    btn.textContent = i;
    btn.addEventListener("click", () => { currentPage = i; loadReservas(); });
    pageNumbers.appendChild(btn);
  }
}

function updateStatistics(data = reservations) {
  const totalEl = qs("#total-reservations");
  const pendEl  = qs("#pending-reservations");
  const inprEl  = qs("#in-progress-reservations");
  const cancEl  = qs("#cancelled-reservations");
  if (!totalEl) return;

  totalEl.textContent = data.length;
  const nameById = (id) => (estados.find(e => e.Id === id)?.NomEstado || "").toLowerCase();
  pendEl && (pendEl.textContent = data.filter(r => nameById(r.estadoId).includes("pend")).length);
  inprEl && (inprEl.textContent = data.filter(r => nameById(r.estadoId).includes("proce") || nameById(r.estadoId).includes("curso")).length);
  cancEl && (cancEl.textContent = data.filter(r => nameById(r.estadoId).includes("cancel")).length);
}

/* ====== Mensajes & Modal ====== */
function showMessage(message, type) {
  const el = qs("#reservation-message");
  if (!el) return;
  el.textContent = message;
  el.className = `block px-4 py-2 rounded-lg ${
    type === "error" ? "bg-red-50 text-red-700 border border-red-200" :
    type === "warning" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
    "bg-green-50 text-green-700 border border-green-200"
  }`;
}
function hideMessage(){ const el=qs("#reservation-message"); if(!el) return; el.className="hidden"; el.textContent=""; }
function openModal(){ const m=qs("#reservation-modal"); if (m){ m.classList.remove("hidden"); document.body.style.overflow="hidden"; } }
function closeModal(){ const m=qs("#reservation-modal"); if (m){ m.classList.add("hidden"); document.body.style.overflow="auto"; } resetForm(); }
function resetForm(){ const f=qs("#reservation-form"); if (f) f.reset(); hideMessage(); selectedMesaId=null; const cap=qs("#capacity-total"); if (cap) cap.textContent="0"; }
