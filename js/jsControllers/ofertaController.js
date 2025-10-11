// js/jsControllers/ofertasController.js
// Opción A aplicada: setea el token ANTES de tocar la API.
// CRUD de ofertas + imagen, mensajes formales, sin botón “Nueva oferta” al estar vacío.

import {
  getOfertas,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  crearOfertaConImagen,
  actualizarOfertaConImagen,
  __dto,
  setAuthToken
} from "../jsService/ofertaService.js";

/* ====== Forzar uso del token ANTES del init ====== */
(function ensureAuthHeader() {
  // 1) Busca token en llaves comunes
  let jwt =
    localStorage.getItem("AUTH_TOKEN") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("AUTH_TOKEN") ||
    sessionStorage.getItem("token");

  // 2) Prueba si existe objeto "user" con token
  if (!jwt) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
      jwt = user?.token || user?.jwt || user?.access_token || null;
    } catch {}
  }

  // 3) Settea si existe (sin "Bearer ", sin comillas)
  if (jwt) setAuthToken(jwt);
})();

/* ====== Fallback imagen ====== */
window.__fallbackSVG = function () {
  return `
  <svg viewBox="0 0 268 196" class="w-full h-full rounded-lg select-none" aria-hidden="true"
       xmlns="http://www.w3.org/2000/svg" role="img">
    <rect width="268" height="196" rx="12" fill="#e5e7eb"/>
    <g transform="translate(0,8)">
      <circle cx="134" cy="64" r="36" fill="#9ca3af"/>
      <rect x="84" y="112" width="100" height="10" rx="5" fill="#9ca3af"/>
      <text x="134" y="152" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
            font-size="14" fill="#6b7280">Sin imagen</text>
    </g>
  </svg>`;
};
function injectFallbackNodeAndRemove(imgEl) {
  if (!imgEl) return;
  try {
    const wrap = document.createElement("div");
    wrap.innerHTML = (window.__fallbackSVG && window.__fallbackSVG()) || "";
    const node = wrap.firstElementChild;
    if (node) imgEl.replaceWith(node);
    else imgEl.remove();
  } catch { imgEl.remove(); }
}

/* ====== Estado ====== */
let ofertas = [];
let editMode = false;
let editId = null;
let lastFile = null;
let lastPreviewUrl = "";
const DEFAULT_PLATILLO_ID = 1; // Asegura FK válida si es NOT NULL

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
function showNotice(message, type = "info") {
  const el = document.createElement("div");
  el.className = `fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow text-sm ${
    type === "error" ? "bg-red-600 text-white"
    : type === "success" ? "bg-emerald-600 text-white"
    : "bg-gray-900 text-white"
  } opacity-0 transition-opacity`;
  el.textContent = message;
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

/* ====== Render (sin “nueva oferta” al estar vacío) ====== */
function renderOfertas(list = ofertas) {
  const container = $('#offersContainer');
  const emptyState = $('#emptyState');
  container.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  list.forEach((offer) => {
    const status = getStatus(offer.startDate, offer.endDate);
    const statusColor = status === "Activo" ? "bg-green-500"
                      : status === "Próximo" ? "bg-blue-500"
                      : status === "Vencido" ? "bg-red-500" : "bg-gray-400";

    const imgHtml = offer.image
      ? `<img src="${offer.image}" alt="${escapeHtml(offer.title || "Oferta")}"
              class="w-full h-48 object-cover"
              onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`
      : (window.__fallbackSVG && window.__fallbackSVG());

    const card = document.createElement('div');
    card.className = "card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 relative flex flex-col";
    card.innerHTML = `
      <div class="relative">
        ${imgHtml}
        <div class="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow-md font-semibold text-indigo-700">
          ${escapeHtml(offer.discount ?? "—")}
        </div>
      </div>
      <div class="p-6 flex flex-col flex-1">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-bold text-gray-800">${escapeHtml(offer.title || "Oferta")}</h3>
          <span class="text-xs px-2 py-1 rounded-full text-white ${statusColor}">
            ${status}
          </span>
        </div>
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
}

/* ====== Filtros ====== */
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

/* ====== Modal ====== */
function openModal(id = null) {
  resetModal();
  editMode = false; editId = null; lastFile = null; lastPreviewUrl = "";

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
      const prev = $('#img-preview');
      prev.innerHTML = o.image
        ? `<img src="${o.image}" class="w-full h-28 object-cover rounded mb-2"
                 onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`
        : (window.__fallbackSVG && window.__fallbackSVG());
    }
  } else {
    $('#img-preview').innerHTML = window.__fallbackSVG();
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
  const prev = $('#img-preview');
  if (prev) prev.innerHTML = window.__fallbackSVG();
  document.querySelectorAll('.error-text').forEach(e => e.innerText = '');
  document.querySelectorAll('#offerForm input, #offerForm textarea').forEach(f => f.classList.remove('invalid'));
  lastFile = null; lastPreviewUrl = "";
}

/* ====== Imagen (preview local) ====== */
function previewImg(e) {
  const file = e.target.files?.[0];
  const prev = document.getElementById('img-preview');
  lastFile = null; lastPreviewUrl = "";

  if (!file) { prev.innerHTML = window.__fallbackSVG(); return; }
  const reader = new FileReader();
  reader.onload = (x) => {
    lastPreviewUrl = x.target.result;
    prev.innerHTML = `<img src="${lastPreviewUrl}" class="w-full h-28 object-cover rounded mb-2"
                        onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`;
    lastFile = file;
  };
  reader.readAsDataURL(file);
}

/* ====== Validación (formal) ====== */
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

/* ====== Guardar (elegir multipart si hay archivo) ====== */
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

    let saved;
    if (editMode && editId != null) {
      if (lastFile instanceof File) saved = await actualizarOfertaConImagen(editId, dto, lastFile);
      else                          saved = await actualizarOferta(editId, dto);
    } else {
      if (lastFile instanceof File) saved = await crearOfertaConImagen(dto, lastFile);
      else                          saved = await crearOferta(dto);
    }

    saved.image = saved.image || saved.imagenUrl || lastPreviewUrl || "";

    if (editMode) {
      ofertas = ofertas.map(o => Number(o.id) === Number(editId) ? saved : o);
      showNotice("La oferta ha sido actualizada correctamente.", "success");
    } else {
      ofertas.push(saved);
      showNotice("La oferta ha sido registrada exitosamente.", "success");
    }

    closeModal();
    filterOfertas();
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
    ofertas = ofertas.filter(o => Number(o.id) !== Number(id));
    filterOfertas();
    showNotice("La oferta ha sido eliminada satisfactoriamente.", "success");
  } catch (err) {
    console.error(err);
    showNotice(err?.message || "No fue posible eliminar la oferta.", "error");
  } finally {
    hideBusy();
  }
}

/* ====== Init ====== */
async function init() {
  try {
    showBusy("Cargando información…");
    ofertas = await getOfertas(0, 100);
  } catch (err) {
    console.error("[ofertasController] Error al cargar ofertas:", err);
    ofertas = [];
    // Mensaje formal (sin redirecciones)
    showNotice(
      (String(err?.message || "").toLowerCase().includes("no autorizado"))
        ? "Acceso no autorizado. Por favor, autentíquese para visualizar el listado."
        : (err?.message || "No fue posible cargar el listado de ofertas."),
      "error"
    );
  } finally {
    hideBusy();
  }

  renderOfertas(ofertas);

  $('#searchInput')?.addEventListener('input', () => setTimeout(filterOfertas, 200));
  $('#statusFilter')?.addEventListener('change', filterOfertas);
  $('#fab')?.addEventListener('click', () => openModal());

  const form = $('#offerForm');
  form?.addEventListener('submit', onSubmit);
  form?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') e.preventDefault();
  });

  $('#offer-image')?.addEventListener('change', previewImg);
  $('#offer-cancel-btn')?.addEventListener('click', () => closeModal());

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#offer-modal')?.classList.contains('hidden')) closeModal();
  });
  $('#offer-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'offer-modal') closeModal();
  });

  // Cortafuegos de imágenes rotas
  window.addEventListener("error", (ev) => {
    const el = ev.target;
    if (el && el.tagName === "IMG" && !el.dataset.fallbackApplied) {
      el.dataset.fallbackApplied = "1";
      el.onerror = null;
      el.removeAttribute("srcset");
      injectFallbackNodeAndRemove(el);
    }
  }, true);
}

document.addEventListener('DOMContentLoaded', init);
