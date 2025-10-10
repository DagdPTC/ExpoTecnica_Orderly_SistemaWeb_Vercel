// js/jsControllers/ofertasController.js
import {
  getOfertas,
  crearOferta,
  actualizarOferta,
  eliminarOferta,
  subirImagenOferta
} from "../jsService/ofertaService.js";

/* ================= Placeholder “Sin imagen” (SVG inline) ================= */
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

/* ================= Estado ================= */
let ofertas = [];
let editMode = false;
let editId = null;
let lastFile = null;
let lastPreviewUrl = "";
let lastCloudUrl  = "";
const DEFAULT_PLATILLO_ID = 1; // ajusta cuando tengas selector real

/* ================= DOM helpers ================= */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ================= Utils ================= */
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

/* ================= Render ================= */
function renderOfertas(list = ofertas) {
  const container = $('#offersContainer');
  const emptyState = $('#emptyState');
  container.innerHTML = '';

  if (!Array.isArray(list) || list.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `
        <i class="fas fa-search"></i>
        <h3>No se encontraron ofertas</h3>
        <p>Intenta con otros términos de búsqueda o ajusta los filtros</p>
        <div class="mt-4">
          <button id="addFromEmpty" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <i class="fas fa-plus mr-2"></i>Nueva Oferta
          </button>
        </div>`;
      $('#addFromEmpty')?.addEventListener('click', () => openModal());
    }
    return;
  }
  emptyState?.classList.add('hidden');

  list.forEach((offer, index) => {
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
    card.style.animationDelay = `${index * 0.08}s`;
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

/* ================= Filtros ================= */
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

/* ================= Modal ================= */
function openModal(id = null) {
  resetModal();
  editMode = false; editId = null; lastFile = null; lastPreviewUrl = ""; lastCloudUrl = "";

  $('#modal-title').innerText = id ? "Editar Oferta" : "Agregar Oferta";

  if (id) {
    editMode = true; editId = id;
    const o = ofertas.find(x => Number(x.id) === Number(id));
    if (o) {
      $('#offer-title').value = o.title || "";
      $('#offer-description').value = o.description || "";
      $('#offer-discount').value = o.discount || "";
      $('#offer-start').value = o.startDate || "";
      $('#offer-end').value = o.endDate || "";
      const prev = $('#img-preview');
      prev.innerHTML = o.image
        ? `<img src="${o.image}" class="w-full h-28 object-cover rounded mb-2"
                 onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`
        : (window.__fallbackSVG && window.__fallbackSVG());
      lastCloudUrl = o.image || "";
    }
  } else {
    $('#img-preview').innerHTML = window.__fallbackSVG();
  }

  $('#offer-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  $('#offer-title')?.focus({ preventScroll: true });
}

function closeModal() { $('#offer-modal').classList.add('hidden'); document.body.style.overflow = ''; resetModal(); }
function resetModal() {
  $('#offerForm')?.reset();
  const prev = $('#img-preview');
  if (prev) prev.innerHTML = window.__fallbackSVG();
  $$('.error-text').forEach(e => e.innerText = '');
  $$('#offerForm input, #offerForm textarea').forEach(f => f.classList.remove('invalid'));
  lastFile = null; lastPreviewUrl = ""; lastCloudUrl = "";
}

/* ================= Imagen (preview + subida) ================= */
function previewImg(e) {
  const file = e.target.files?.[0];
  const prev = $('#img-preview');
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

/* ================= Validación ================= */
function validateForm() {
  const title = $('#offer-title');
  const description = $('#offer-description');
  const discount = $('#offer-discount');
  const start = $('#offer-start');
  const end = $('#offer-end');

  let valid = true;
  if (!title.value.trim() || title.value.trim().length < 5) { title.classList.add('invalid'); $('#offer-title-err').innerText = "El título debe tener al menos 5 caracteres."; valid = false; } else { title.classList.remove('invalid'); $('#offer-title-err').innerText = ""; }
  if (!description.value.trim() || description.value.trim().length < 10) { description.classList.add('invalid'); $('#offer-description-err').innerText = "La descripción debe tener al menos 10 caracteres."; valid = false; } else { description.classList.remove('invalid'); $('#offer-description-err').innerText = ""; }
  if (!discount.value.trim() || discount.value.trim().length < 2) { discount.classList.add('invalid'); $('#offer-discount-err').innerText = "Ingresa una promoción válida (ej: 2x1, 20% dcto, etc)."; valid = false; } else { discount.classList.remove('invalid'); $('#offer-discount-err').innerText = ""; }
  if (!start.value) { start.classList.add('invalid'); $('#offer-start-err').innerText = "La fecha de inicio es requerida."; valid = false; } else { start.classList.remove('invalid'); $('#offer-start-err').innerText = ""; }
  if (!end.value) { end.classList.add('invalid'); $('#offer-end-err').innerText = "La fecha de fin es requerida."; valid = false; } else { end.classList.remove('invalid'); $('#offer-end-err').innerText = ""; }
  return { valid };
}

/* ================= Guardar ================= */
async function onSubmit(e) {
  e?.preventDefault?.();
  const { valid } = validateForm();
  if (!valid) return;

  try {
    showBusy("Guardando oferta…");

    if (lastFile instanceof File) {
      showBusy("Subiendo imagen…");
      lastCloudUrl = await subirImagenOferta(lastFile, "menu");
    }

    const payload = {
      title: $('#offer-title').value.trim(),
      description: $('#offer-description').value.trim(),
      discount: $('#offer-discount').value.trim(),
      startDate: $('#offer-start').value,
      endDate: $('#offer-end').value,
      activa: true,
      idPlatillo: DEFAULT_PLATILLO_ID,
    };

    let saved;
    if (editMode && editId != null) {
      saved = await actualizarOferta(editId, payload);
      saved.image = lastCloudUrl || lastPreviewUrl || saved.image || "";
      ofertas = ofertas.map(o => Number(o.id) === Number(editId) ? saved : o);
      toast("✅ Oferta actualizada");
    } else {
      saved = await crearOferta(payload);
      saved.image = lastCloudUrl || lastPreviewUrl || saved.image || "";
      ofertas.push(saved);
      toast("✅ Oferta creada");
    }

    closeModal();
    filterOfertas();
  } catch (err) {
    console.error(err);
    alert(err?.message || "No se pudo guardar la oferta");
  } finally {
    hideBusy();
  }
}

/* ================= Eliminar ================= */
async function onDelete(id) {
  if (!confirm("¿Seguro que deseas eliminar esta oferta?")) return;
  try {
    showBusy("Eliminando…");
    await eliminarOferta(id);
    ofertas = ofertas.filter(o => Number(o.id) !== Number(id));
    filterOfertas();
    toast("🗑️ Oferta eliminada");
  } catch (err) {
    console.error(err);
    alert(err?.message || "No se pudo eliminar la oferta");
  } finally {
    hideBusy();
  }
}

/* ================= Busy/Toast ================= */
let _busyTimer = null;
function showBusy(text = "Cargando…") {
  clearTimeout(_busyTimer);
  let el = $("#__busy");
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
    const el = $("#__busy");
    if (el) el.style.display = "none";
  }, 180);
}
function toast(text = "Listo") {
  const el = document.createElement("div");
  el.className = "fixed bottom-6 right-6 z-[100] bg-gray-900 text-white px-4 py-2 rounded-xl shadow opacity-0 transition-opacity";
  el.textContent = text;
  document.body.appendChild(el);
  requestAnimationFrame(() => { el.style.opacity = "1"; });
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 250); }, 1600);
}

/* ================= Init ================= */
async function init() {
  try {
    showBusy("Cargando ofertas…");
    ofertas = await getOfertas(0, 100);
  } catch (err) {
    console.error("[ofertasController] Error al cargar ofertas:", err);
    ofertas = [];
    alert(err?.message || "No se pudieron cargar las ofertas");
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

  // Cortafuegos global imágenes rotas
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
