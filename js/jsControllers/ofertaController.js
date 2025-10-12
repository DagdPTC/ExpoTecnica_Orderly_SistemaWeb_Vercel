// js/jsControllers/ofertaController.js
// - SIN imagen en tarjetas.
// - Paginación real contra backend.
// - Menú de usuario con "Cerrar sesión" (fixed + z-index alto).

import {
  getOfertas,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  __dto,
  __internal
} from "../jsService/ofertaService.js";

/* ====== Estado ====== */
let ofertas = [];
let editMode = false;
let editId = null;

let currentPage = 0;
let pageSize = 8;
let totalPages = 1;
let totalElements = 0;

const DEFAULT_PLATILLO_ID = 1;
const $ = (s, r = document) => r.querySelector(s);

/* ====== Helpers ====== */
function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}
function getStatus(start, end) {
  if (!start || !end) return "—";
  const hoy = new Date();
  const i = new Date(start + "T00:00:00");
  const f = new Date(end + "T23:59:59");
  if (hoy < i) return "Próximo";
  if (hoy > f) return "Vencido";
  return "Activo";
}
function showNotice(msg, type = "info") {
  const el = document.createElement("div");
  el.className = `fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow text-sm ${
    type === "error" ? "bg-red-600 text-white" :
    type === "success" ? "bg-emerald-600 text-white" : "bg-gray-900 text-white"} opacity-0 transition-opacity`;
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.style.opacity = "1");
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 220); }, 2200);
}
let _busyTimer = null;
function showBusy(text = "Procesando…") {
  clearTimeout(_busyTimer);
  let el = document.getElementById("__busy");
  if (!el) {
    el = document.createElement("div");
    el.id = "__busy";
    el.className = "fixed top-4 right-4 z-[100] bg-black/80 text-white px-4 py-2 rounded-xl shadow";
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.style.display = "block";
}
function hideBusy() {
  _busyTimer = setTimeout(() => {
    const el = document.getElementById("__busy");
    if (el) el.style.display = "none";
  }, 140);
}

/* ====== Sidebar toggles (móvil) ====== */
function bindSidebarToggles() {
  const sidebar = $("#sidebar");
  const mobileOverlay = $("#mobileOverlay");
  const t1 = $("#sidebarToggle");
  const t2 = $("#sidebarToggleDesktop");
  const toggle = () => {
    sidebar?.classList.toggle("open");
    mobileOverlay?.classList.toggle("open");
  };
  t1?.addEventListener("click", toggle);
  t2?.addEventListener("click", toggle);
  mobileOverlay?.addEventListener("click", toggle);
}

/* ====== Menú de usuario (Mi cuenta / Cerrar sesión) ====== */
function bindAdminMenu() {
  const btn = document.getElementById("adminBtn");
  if (!btn) return;

  let menu = document.getElementById("adminMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "adminMenu";
    menu.className = "hidden w-48 bg-white border rounded-lg shadow-lg";
    menu.innerHTML = `
      <div class="px-4 py-2 text-sm text-gray-600" id="userMenuName">Mi cuenta</div>
      <hr class="border-gray-200">
      <button id="logoutBtn" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
      </button>`;
  }

  // Reubicar a <body> y fijar (evita stacking/overflow)
  if (menu.parentElement !== document.body) document.body.appendChild(menu);
  menu.style.position = "fixed";
  menu.style.zIndex   = "10000";
  menu.style.marginTop = "0";

  const place = () => {
    const r = btn.getBoundingClientRect();
    const w = menu.offsetWidth || 208;
    const left = Math.min(r.right - w, window.innerWidth - w - 8);
    menu.style.top  = `${Math.round(r.bottom + 8)}px`;
    menu.style.left = `${Math.round(Math.max(8, left))}px`;
  };
  const open  = () => { menu.classList.remove("hidden"); place(); };
  const close = () => { menu.classList.add("hidden"); };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.contains("hidden") ? open() : close();
  });
  document.addEventListener("click", (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) close(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", () => { if (!menu.classList.contains("hidden")) place(); });
  window.addEventListener("scroll", () => { if (!menu.classList.contains("hidden")) place(); }, { passive: true });

  // Nombre
  const token = __internal?.getAuthToken?.();
  const name = token ? "Admin" : "Invitado";
  const topUserName = document.getElementById("topUserName");
  const userMenuName = document.getElementById("userMenuName");
  if (topUserName) topUserName.textContent = name;
  if (userMenuName) userMenuName.textContent = "Mi cuenta";

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn.__bound__) {
    logoutBtn.__bound__ = true;
    logoutBtn.addEventListener("click", async () => {
      try {
        await fetch("https://orderly-api-b53514e40ebd.herokuapp.com/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" }
        }).catch(() => {});
      } finally {
        try { localStorage.removeItem("AUTH_TOKEN"); } catch {}
        try { localStorage.removeItem("token"); } catch {}
        sessionStorage.clear();
        window.location.href = "index.html";
      }
    });
  }
}

/* ====== Render tarjetas (sin imagen) ====== */
function renderOfertas(list = ofertas) {
  const container = $('#offersContainer');
  const emptyState = $('#emptyState');
  container.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0) {
    emptyState?.classList.remove('hidden');
    renderPagination();
    return;
  }
  emptyState?.classList.add('hidden');

  list.forEach((offer) => {
    const status = getStatus(offer.startDate, offer.endDate);
    const statusColor = status === "Activo" ? "bg-green-500"
                      : status === "Próximo" ? "bg-blue-500"
                      : status === "Vencido" ? "bg-red-500" : "bg-gray-400";

    const card = document.createElement('div');
    card.className = "card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 relative flex flex-col";

    card.innerHTML = `
      <div class="p-6 pb-0 flex items-center justify-between">
        <span class="inline-block text-xs font-semibold px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full">
          ${escapeHtml(offer.discount ?? "—")}
        </span>
        <span class="text-xs px-2 py-1 rounded-full text-white ${statusColor}">
          ${status}
        </span>
      </div>

      <div class="p-6 pt-3 flex flex-col flex-1">
        <h3 class="text-xl font-bold text-gray-800 mb-1">${escapeHtml(offer.title || "Oferta")}</h3>
        <p class="text-gray-600 mb-4">${escapeHtml(offer.description || "Sin descripción")}</p>

        <div class="flex justify-between text-sm text-gray-500 mb-4">
          <div><i class="fas fa-calendar-alt mr-1"></i> Inicio: ${formatDate(offer.startDate)}</div>
          <div><i class="fas fa-calendar-times mr-1"></i> Fin: ${formatDate(offer.endDate)}</div>
        </div>

        <div class="flex justify-end gap-3 mt-auto">
          <button class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm" data-edit="${offer.id}">
            <i class="fas fa-pen"></i> Editar
          </button>
          <button class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm" data-del="${offer.id}">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  container.onclick = (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn  = e.target.closest('[data-del]');
    if (editBtn) openModal(Number(editBtn.getAttribute('data-edit')));
    if (delBtn)  onDelete(Number(delBtn.getAttribute('data-del')));
  };

  renderPagination();
}

/* ====== Render paginación ====== */
function renderPagination() {
  const wrapId = "offersPagination";
  let wrap = document.getElementById(wrapId);
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = wrapId;
    wrap.className = "mt-6 flex items-center justify-center gap-2";
    $('#offersContainer')?.parentElement?.appendChild(wrap);
  }
  wrap.innerHTML = "";

  if (totalPages <= 1) return;

  const makeBtn = (label, disabled, handler, active=false) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.className =
      "px-3 py-2 rounded-lg border text-sm " +
      (active
        ? "bg-blue-600 text-white border-blue-600"
        : disabled
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          : "bg-white text-gray-700 hover:bg-gray-50 border-gray-200");
    if (!disabled) b.addEventListener("click", handler);
    return b;
  };

  wrap.appendChild(makeBtn("«", currentPage <= 0, () => goToPage(0)));
  wrap.appendChild(makeBtn("‹", currentPage <= 0, () => goToPage(currentPage - 1)));

  const span = 2;
  const start = Math.max(0, currentPage - span);
  const end = Math.min(totalPages - 1, currentPage + span);
  if (start > 0) wrap.appendChild(makeBtn("1", false, () => goToPage(0), currentPage === 0));
  if (start > 1) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.className = "px-1 text-gray-500";
    wrap.appendChild(dots);
  }
  for (let p = start; p <= end; p++) {
    wrap.appendChild(makeBtn(String(p + 1), false, () => goToPage(p), currentPage === p));
  }
  if (end < totalPages - 2) {
    const dots = document.createElement("span");
    dots.textContent = "…";
    dots.className = "px-1 text-gray-500";
    wrap.appendChild(dots);
  }
  if (end < totalPages - 1) {
    wrap.appendChild(makeBtn(String(totalPages), false, () => goToPage(totalPages - 1), currentPage === totalPages - 1));
  }

  wrap.appendChild(makeBtn("›", currentPage >= totalPages - 1, () => goToPage(currentPage + 1)));
  wrap.appendChild(makeBtn("»", currentPage >= totalPages - 1, () => goToPage(totalPages - 1)));
}

async function goToPage(p) {
  if (p < 0 || p > totalPages - 1) return;
  currentPage = p;
  await loadPage();
}

/* ====== Modal (sin imagen) ====== */
function openModal(id = null) {
  resetModal();
  editMode = false; editId = null;

  document.getElementById('modal-title').innerText = id ? "Editar Oferta" : "Agregar Oferta";

  if (id) {
    editMode = true; editId = id;
    const o = ofertas.find(x => Number(x.id) === Number(id));
    if (o) {
      $('#offer-title').value       = o.title || "";
      $('#offer-description').value = o.description || "";
      $('#offer-discount').value    = o.discount || "";
      $('#offer-start').value       = o.startDate || "";
      $('#offer-end').value         = o.endDate || "";
    }
  }

  $('#offer-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  $('#offer-title')?.focus({ preventScroll: true });
}
function closeModal() {
  $('#offer-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
  resetModal();
}
function resetModal() {
  $('#offerForm')?.reset();
  document.querySelectorAll('.error-text').forEach(e => e.innerText = '');
  document.querySelectorAll('#offerForm input, #offerForm textarea').forEach(f => f.classList.remove('invalid'));
}

/* ====== Validación ====== */
function validateForm() {
  const title = $('#offer-title');
  const description = $('#offer-description');
  const discount = $('#offer-discount');
  const start = $('#offer-start');
  const end = $('#offer-end');

  let valid = true;

  if (!title.value.trim() || title.value.trim().length < 5) {
    title.classList.add('invalid'); $('#offer-title-err').innerText = "El título debe poseer al menos cinco caracteres."; valid = false;
  } else { title.classList.remove('invalid'); $('#offer-title-err').innerText = ""; }

  if (!description.value.trim() || description.value.trim().length < 10) {
    description.classList.add('invalid'); $('#offer-description-err').innerText = "La descripción debe poseer al menos diez caracteres."; valid = false;
  } else { description.classList.remove('invalid'); $('#offer-description-err').innerText = ""; }

  if (!discount.value.trim()) {
    discount.classList.add('invalid'); $('#offer-discount-err').innerText = "Indique el beneficio (porcentaje o precio de oferta)."; valid = false;
  } else { discount.classList.remove('invalid'); $('#offer-discount-err').innerText = ""; }

  if (!start.value) { start.classList.add('invalid'); $('#offer-start-err').innerText = "La fecha de inicio es obligatoria."; valid = false; }
  else { start.classList.remove('invalid'); $('#offer-start-err').innerText = ""; }

  if (!end.value) { end.classList.add('invalid'); $('#offer-end-err').innerText = "La fecha de fin es obligatoria."; valid = false; }
  else { end.classList.remove('invalid'); $('#offer-end-err').innerText = ""; }

  return { valid };
}

/* ====== Guardar (sin imagen) ====== */
async function onSubmit(e) {
  e?.preventDefault?.();
  const { valid } = validateForm();
  if (!valid) return;

  try {
    showBusy("Guardando la oferta…");

    const discountText = $('#offer-discount').value.trim();
    let precioOferta = null;
    if (/(\$|USD)\s*\d/i.test(discountText)) {
      const m = discountText.replace(",", ".").match(/(\d+(\.\d+)?)/);
      if (m) precioOferta = Number(m[1]);
    }

    const dto = __dto.buildOfertaDTO({
      description: $('#offer-description').value.trim(),
      discountText,
      precioOferta,
      startDate: $('#offer-start').value,
      endDate: $('#offer-end').value,
      activa: true,
      idPlatillo: DEFAULT_PLATILLO_ID,
      imagenUrl: null,
      publicId: null,
    });

    if (editMode && editId != null) {
      await actualizarOferta(editId, dto);
      showNotice("La oferta ha sido actualizada correctamente.", "success");
    } else {
      await crearOferta(dto);
      showNotice("La oferta ha sido registrada exitosamente.", "success");
    }

    closeModal();
    await loadPage();
  } catch (err) {
    console.error(err);
    showNotice(err?.message || "No fue posible procesar la solicitud.", "error");
  } finally {
    hideBusy();
  }
}

/* ====== Eliminar ====== */
async function onDelete(id) {
  if (!confirm("¿Confirma que desea eliminar esta oferta?")) return;
  try {
    showBusy("Eliminando la oferta…");
    await eliminarOferta(id);
    showNotice("La oferta ha sido eliminada satisfactoriamente.", "success");
    if (ofertas.length === 1 && currentPage > 0) currentPage -= 1;
    await loadPage();
  } catch (err) {
    console.error(err);
    showNotice(err?.message || "No fue posible eliminar la oferta.", "error");
  } finally {
    hideBusy();
  }
}

/* ====== Carga de página (paginación) ====== */
async function loadPage() {
  try {
    showBusy("Cargando ofertas…");
    const { items, totalElements: te, totalPages: tp, currentPage: cp } =
      await getOfertas(currentPage, pageSize);
    ofertas = items;
    totalElements = te;
    totalPages = tp || 1;
    currentPage = cp;
  } catch (err) {
    console.error("[ofertaController] Error al cargar ofertas:", err);
    ofertas = [];
    totalElements = 0;
    totalPages = 1;
    showNotice(err?.message || "No fue posible cargar el listado de ofertas.", "error");
  } finally {
    hideBusy();
  }
  filterOfertas();
}

/* ====== Filtros (sobre la página actual) ====== */
function filterOfertas() {
  const search = ($('#searchInput')?.value || "").toLowerCase().trim();
  const status = $('#statusFilter')?.value || "all";

  let filtered = (ofertas || []).filter(o =>
    (o.title?.toLowerCase().includes(search) || o.description?.toLowerCase().includes(search))
  );

  if (status !== "all") {
    filtered = filtered.filter(o => {
      const s = getStatus(o.startDate, o.endDate);
      if (status === 'active') return s === "Activo";
      if (status === 'upcoming') return s === "Próximo";
      if (status === 'expired') return s === "Vencido";
      return true;
    });
  }
  renderOfertas(filtered);
}

/* ====== Init ====== */
async function init() {
  bindSidebarToggles();
  bindAdminMenu();

  $('#searchInput')?.addEventListener('input', () => setTimeout(filterOfertas, 200));
  $('#statusFilter')?.addEventListener('change', filterOfertas);
  $('#fab')?.addEventListener('click', () => openModal());

  const form = $('#offerForm');
  form?.addEventListener('submit', onSubmit);
  form?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
  });

  $('#offer-cancel-btn')?.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#offer-modal')?.classList.contains('hidden')) closeModal();
  });
  $('#offer-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'offer-modal') closeModal();
  });

  await loadPage();
}

document.addEventListener('DOMContentLoaded', init);
