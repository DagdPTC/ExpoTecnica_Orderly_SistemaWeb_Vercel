// js/jsControllers/menuController.js
import {
  getCategorias,
  getPlatillos,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  crearPlatillo,
  actualizarPlatillo,
  crearPlatilloConImagen,
  actualizarPlatilloConImagen,
  eliminarPlatillo,
  subirImagen
} from "../jsService/menuService.js";

/* ================= FALLBACK IMG (SVG inline) ================= */
window.__fallbackSVG = function () {
  return `
  <svg viewBox="0 0 400 300" class="w-full h-full bg-gray-100 rounded-lg">
    <defs>
      <linearGradient id="g" x1="0" x2="1">
        <stop offset="0%" stop-color="#e5e7eb"/>
        <stop offset="100%" stop-color="#d1d5db"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="400" height="300" fill="url(#g)"/>
    <g fill="#9ca3af">
      <circle cx="200" cy="120" r="50"/>
      <rect x="120" y="190" width="160" height="16" rx="8"/>
    </g>
    <text x="200" y="260" text-anchor="middle" fill="#6b7280" font-size="16" font-family="sans-serif">
      Sin imagen
    </text>
  </svg>`;
};

// Reemplaza un <img> roto por el SVG de fallback como nodo real
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
let categorias = [];   // [{id, nombre}]
let platillos  = [];   // [{id, nombre, descripcion, precio, imagenUrl, publicId, idCategoria}]
let editingPlatilloId   = null;
let currentAction       = "add";

/* ================= DOM ================= */
const menuContainer   = document.getElementById("menuContainer");
const noResults       = document.getElementById("noResults");
const searchInput     = document.getElementById("searchInput");
const categoryFilter  = document.getElementById("categoryFilter");

const platilloModal   = document.getElementById("platilloModal");
const categoriaModal  = document.getElementById("categoriaModal");
const confirmModal    = document.getElementById("confirmModal");

// Botones/inputs globales
const addCategoryBtn    = document.getElementById("addCategoryBtn");
const editCategoryBtn   = document.getElementById("editCategoryBtn");
const deleteCategoryBtn = document.getElementById("deleteCategoryBtn");
const categoriaForm     = document.getElementById("categoriaForm");
const platilloForm      = document.getElementById("platilloForm");

/* ================= Init ================= */
document.addEventListener("DOMContentLoaded", async () => {
  setupEventListeners();
  await cargarCategorias();
  await cargarPlatillos();
});

/* ================= Load Data ================= */
async function cargarCategorias() {
  try {
    categorias = await getCategorias();
    renderCategorias();
  } catch (err) {
    console.error("[error] No se pudieron cargar categorías:", err);
    showToast("No se pudieron cargar categorías", "error");
  }
}

async function cargarPlatillos() {
  try {
    platillos = await getPlatillos();
    renderPlatillos();
  } catch (err) {
    console.error("[error] No se pudieron cargar platillos:", err);
    showToast("No se pudieron cargar platillos", "error");
  }
}

/* ================= Render ================= */
function renderCategorias() {
  if (!categoryFilter) return;

  categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';

  const selPlatCat = document.getElementById("platilloCategoria");
  const selCatSel  = document.getElementById("categoriaSelect");

  if (selPlatCat) selPlatCat.innerHTML = '<option value="">Seleccione una categoría</option>';
  if (selCatSel)  selCatSel.innerHTML  = '<option value="">Seleccione una categoría</option>';

  categorias.forEach((c) => {
    const option1 = document.createElement("option");
    option1.value = c.id;
    option1.textContent = c.nombre;
    categoryFilter.appendChild(option1);

    if (selPlatCat) {
      const option2 = document.createElement("option");
      option2.value = c.id;
      option2.textContent = c.nombre;
      selPlatCat.appendChild(option2);
    }

    if (selCatSel) {
      const option3 = document.createElement("option");
      option3.value = c.id;
      option3.textContent = c.nombre;
      selCatSel.appendChild(option3);
    }
  });
}

function renderPlatillos(platillosToRender = platillos) {
  if (!menuContainer) return;
  menuContainer.innerHTML = "";

  if (!Array.isArray(platillosToRender) || platillosToRender.length === 0) {
    noResults?.classList.remove("hidden");
    return;
  }
  noResults?.classList.add("hidden");

  platillosToRender.forEach((platillo, index) => {
    const categoria =
      categorias.find((c) => c.id === platillo.idCategoria)?.nombre || "Sin categoría";

    const card = document.createElement("div");
    card.className = "platillo-card glass card animate-fade-in";
    card.style.animationDelay = `${index * 0.1}s`;
    card.dataset.id = platillo.id;

    const imgHtml = platillo.imagenUrl
      ? `<img 
            src="${platillo.imagenUrl}" 
            alt="${escapeHtml(platillo.nombre)}" 
            class="platillo-img w-full"
            onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`
      : `${window.__fallbackSVG && window.__fallbackSVG()}`;

    card.innerHTML = `
      <div class="relative overflow-hidden">
        ${imgHtml}
        <div class="absolute top-4 right-4">
          <span class="category-badge">${escapeHtml(categoria)}</span>
        </div>
        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
          <div class="flex space-x-3">
            <button class="edit-platillo-btn bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-platillo-btn bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="p-6 flex-1 flex flex-col">
        <div class="flex justify-between items-start mb-3">
          <h3 class="text-xl font-bold text-gray-800 leading-tight">${escapeHtml(platillo.nombre)}</h3>
        </div>
        <p class="text-gray-600 mb-4 flex-1 leading-relaxed">${escapeHtml(platillo.descripcion || "Sin descripción disponible")}</p>
        <div class="flex justify-between items-center">
          <span class="price-badge">$${Number(platillo.precio || 0).toFixed(2)}</span>
          <div class="flex items-center text-sm text-gray-500">
            <i class="fas fa-star text-yellow-400 mr-1"></i>
            <span>4.8</span>
          </div>
        </div>
      </div>
    `;

    menuContainer.appendChild(card);
  });

  // Card para agregar
  const addCard = document.createElement("div");
  addCard.className = "glass card hover:scale-105 transition-all duration-300 cursor-pointer animate-fade-in";
  addCard.style.animationDelay = `${platillosToRender.length * 0.1}s`;
  addCard.innerHTML = `
    <div class="p-8 text-center h-full flex flex-col items-center justify-center">
      <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        <i class="fas fa-plus text-4xl text-blue-600"></i>
      </div>
      <h3 class="text-xl font-bold text-gray-700 mb-2">Agregar Platillo</h3>
      <p class="text-gray-500">Añade un nuevo platillo al menú</p>
    </div>`;
  addCard.addEventListener("click", () => openPlatilloModal());
  menuContainer.appendChild(addCard);
}

/* ================= Filtro ================= */
function filterPlatillos() {
  const searchTerm = (searchInput?.value || "").toLowerCase().trim();
  const selectedCategory = categoryFilter?.value;

  const filtered = platillos.filter((p) => {
    const matchesSearch =
      !searchTerm ||
      (p.nombre && p.nombre.toLowerCase().includes(searchTerm)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm));

    const matchesCategory =
      !selectedCategory || selectedCategory === "all" ||
      p.idCategoria === parseInt(selectedCategory);

    return matchesSearch && matchesCategory;
  });

  renderPlatillos(filtered);
}

/* ================= Modal Platillo ================= */
function openPlatilloModal(id = null) {
  resetPlatilloForm();

  const urlInput  = document.getElementById("platilloImagenUrl");
  // Bloqueamos edición SIEMPRE
  if (urlInput) {
    urlInput.readOnly = true;
    urlInput.classList.add("bg-gray-100", "cursor-not-allowed");
    urlInput.placeholder = "URL generada automáticamente al subir";
  }

  if (id) {
    editingPlatilloId = id;
    document.getElementById("platilloModalTitle").textContent = "Editar Platillo";

    const platillo = platillos.find((p) => p.id === id);
    if (platillo) {
      document.getElementById("platilloId").value = platillo.id;
      document.getElementById("platilloNombre").value = platillo.nombre || "";
      document.getElementById("platilloCategoria").value = platillo.idCategoria || "";
      document.getElementById("platilloDescripcion").value = platillo.descripcion || "";
      document.getElementById("platilloPrecio").value = Number(platillo.precio || 0).toFixed(2);

      const imgSrc = platillo.imagenUrl;
      document.getElementById("platilloImagenPreview").innerHTML =
        imgSrc
          ? `<img src="${imgSrc}" alt="Preview" class="w-full h-full object-cover rounded-lg"
                   onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`
          : `${window.__fallbackSVG && window.__fallbackSVG()}`;
      if (urlInput) urlInput.value = platillo.imagenUrl || "";
    }
  } else {
    editingPlatilloId = null;
    document.getElementById("platilloModalTitle").textContent = "Nuevo Platillo";
    document.getElementById("platilloId").value = "";
  }

  platilloModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function safeClosePlatilloModal() {
  if (platilloModal) {
    platilloModal.classList.add("hidden");
    document.body.style.overflow = "";
  }
}
function closePlatilloModal() { safeClosePlatilloModal(); }

function resetPlatilloForm() {
  platilloForm?.reset();
  const prev = document.getElementById("platilloImagenPreview");
  if (prev) prev.innerHTML = '<i class="fas fa-image text-5xl text-gray-300"></i>';
  document.getElementById("platilloId").value = "";
}

/* ================= Modal Categoría ================= */
function openCategoriaModal() {
  resetCategoriaForm();

  const selectContainer = document.getElementById("categoriaSelectContainer");
  const nombreContainer = document.getElementById("categoriaNombreContainer");
  const submitBtn       = document.getElementById("submitCategoriaBtn");
  const nombreInput     = document.getElementById("categoriaNombre");
  const selectInput     = document.getElementById("categoriaSelect");

  nombreInput?.setAttribute("name", "categoriaNombre");
  selectInput?.setAttribute("name", "categoriaSelect");

  nombreInput?.removeAttribute("required");
  selectInput?.removeAttribute("required");

  if (currentAction === "add") {
    document.getElementById("categoriaModalTitle").textContent = "Nueva Categoría";
    selectContainer.classList.add("hidden");
    nombreContainer.classList.remove("hidden");
    nombreInput?.setAttribute("required", "required");
    submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar';
    submitBtn.className = "btn btn-primary px-6 py-3 flex items-center justify-center";

  } else if (currentAction === "edit") {
    document.getElementById("categoriaModalTitle").textContent = "Editar Categoría";
    selectContainer.classList.remove("hidden");
    nombreContainer.classList.remove("hidden");
    selectInput?.setAttribute("required", "required");
    nombreInput?.setAttribute("required", "required");
    submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar';
    submitBtn.className = "btn btn-primary px-6 py-3 flex items-center justify-center";

  } else if (currentAction === "delete") {
    document.getElementById("categoriaModalTitle").textContent = "Eliminar Categoría";
    selectContainer.classList.remove("hidden");
    nombreContainer.classList.add("hidden");
    selectInput?.setAttribute("required", "required");
    submitBtn.innerHTML = '<i class="fas fa-trash mr-2"></i>Eliminar';
    submitBtn.className = "btn btn-danger px-6 py-3 flex items-center justify-center";
  }

  categoriaModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeCategoriaModal() {
  categoriaModal?.classList.add("hidden");
  document.body.style.overflow = "";
}

function resetCategoriaForm() {
  categoriaForm?.reset();
  const actionEl = document.getElementById("categoriaAction");
  if (actionEl) actionEl.value = currentAction;
  const errorContainer = document.getElementById("categoriaErrorContainer");
  if (errorContainer) errorContainer.remove();
}

/* ================= Confirm ================= */
function openConfirmModal(title, message, action, id = null) {
  document.getElementById("confirmModalTitle").textContent = title;
  const msgEl = document.getElementById("confirmModalMessage");
  if (typeof message === "string") msgEl.textContent = message;

  const acceptBtn = document.getElementById("acceptConfirmBtn");
  acceptBtn.dataset.action = action;
  if (id != null) acceptBtn.dataset.id = id;
  else acceptBtn.removeAttribute("data-id");

  confirmModal?.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeConfirmModal() {
  confirmModal?.classList.add("hidden");
  document.body.style.overflow = "";
}

/* ================= Eventos ================= */
function setupEventListeners() {
  // Buscar / filtrar
  let searchTimeout;
  searchInput?.addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterPlatillos, 300);
  });
  categoryFilter?.addEventListener("change", filterPlatillos);

  // Modal categoría: abrir
  addCategoryBtn?.addEventListener("click", () => { currentAction = "add";    openCategoriaModal(); });
  editCategoryBtn?.addEventListener("click", () => {
    if (categorias.length === 0) return showToast("No hay categorías para editar", "error");
    currentAction = "edit";   openCategoriaModal();
  });
  deleteCategoryBtn?.addEventListener("click", () => {
    if (categorias.length === 0) return showToast("No hay categorías para eliminar", "error");
    currentAction = "delete"; openCategoriaModal();
  });

  // Cerrar modales
  document.getElementById("closePlatilloModal")?.addEventListener("click", safeClosePlatilloModal);
  document.getElementById("cancelPlatilloBtn")?.addEventListener("click", safeClosePlatilloModal);
  document.getElementById("closeCategoriaModal")?.addEventListener("click", closeCategoriaModal);
  document.getElementById("cancelCategoriaBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("cancelConfirmBtn")?.addEventListener("click", closeConfirmModal);
  document.getElementById("acceptConfirmBtn")?.addEventListener("click", handleConfirmAction);

  // Clicks en cards (editar/eliminar platillo)
  document.addEventListener("click", handleClick);

  // Forms
  categoriaForm?.addEventListener("submit", handleCategoriaSubmit);
  platilloForm?.addEventListener("submit", handlePlatilloSubmit);

  // Cerrar con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      safeClosePlatilloModal();
      closeCategoriaModal();
      closeConfirmModal();
    }
  });

  // Cerrar modal si click fuera
  [platilloModal, categoriaModal, confirmModal].forEach((modal) => {
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        if (modal === platilloModal) safeClosePlatilloModal();
        else if (modal === categoriaModal) closeCategoriaModal();
        else if (modal === confirmModal) closeConfirmModal();
      }
    });
  });

  // Sincronizar nombre al seleccionar categoría en modo editar
  document.getElementById("categoriaSelect")?.addEventListener("change", function () {
    if (currentAction === "edit" && this.value) {
      const categoria = categorias.find((c) => c.id === parseInt(this.value));
      if (categoria) document.getElementById("categoriaNombre").value = categoria.nombre;
    }
  });

  // Cortafuegos global de imágenes rotas
  window.addEventListener("error", (ev) => {
    const el = ev.target;
    if (el && el.tagName === "IMG" && !el.dataset.fallbackApplied) {
      el.dataset.fallbackApplied = "1";
      el.onerror = null;
      el.removeAttribute("srcset");
      injectFallbackNodeAndRemove(el);
    }
  }, true);

  // ==== SUBIR IMAGEN: poner URL en textbox y bloquear edición ====
  const fileInput = document.getElementById("platilloImagen");
  const urlInput  = document.getElementById("platilloImagenUrl");
  const preview   = document.getElementById("platilloImagenPreview");

  // dejemos el textbox en solo lectura SIEMPRE
  if (urlInput) {
    urlInput.readOnly = true;
    urlInput.classList.add("bg-gray-100", "cursor-not-allowed");
    if (!urlInput.placeholder) urlInput.placeholder = "URL generada automáticamente al subir";
  }

  fileInput?.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    console.log("[IMG] change:", f);
    if (!f) return;

    // feedback en preview
    if (preview) {
      preview.innerHTML = `
        <div class="w-full h-64 flex items-center justify-center text-gray-500">
          Subiendo imagen...
        </div>`;
    }

    try {
      const imageUrl = await subirImagen(f, "menu");
      console.log("[IMG] URL recibida:", imageUrl);

      if (urlInput) {
        urlInput.value = imageUrl;        // escribe la URL
        urlInput.dispatchEvent(new Event("input", { bubbles: true })); // notifica a otros listeners
        urlInput.readOnly = true;
        urlInput.classList.add("bg-gray-100", "cursor-not-allowed");
      }

      // no enviar archivo en el submit (usaremos la URL)
      fileInput.value = "";

      // preview final
      if (preview) {
        preview.innerHTML = `<img src="${imageUrl}" class="w-full h-full object-cover rounded-lg" alt="Preview"
           onerror="this.onerror=null; injectFallbackNodeAndRemove(this);">`;
      }

      showToast("Imagen subida correctamente", "success");
    } catch (err) {
      console.error("[IMG] Error subiendo:", err);
      showToast(err?.message || "No se pudo subir la imagen", "error");
      if (preview) preview.innerHTML = window.__fallbackSVG();
      if (urlInput) urlInput.value = "";
    }
  });

  // —— Vista previa de precio con IVA mientras escribe ——
  const precioInput = document.getElementById("platilloPrecio");
  const ivaHint = document.getElementById("ivaHint") || (() => {
    const s = document.createElement("div");
    s.id = "ivaHint";
    s.className = "text-sm text-gray-500 mt-1";
    precioInput?.parentElement?.appendChild(s);
    return s;
  })();

  function updateIvaHint() {
    const raw = (precioInput?.value || "").trim();
    const num = Number(String(raw).replace(",", ".").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(num) && num > 0) {
      ivaHint.textContent = `Con IVA (13%): $${precioConIVA(num).toFixed(2)}`;
    } else {
      ivaHint.textContent = "";
    }
  }

  precioInput?.addEventListener("input", updateIvaHint);
  precioInput?.addEventListener("blur", updateIvaHint);
}

/* ================= Handlers ================= */
async function handleCategoriaSubmit(e) {
  e.preventDefault();

  const nombreInput = document.getElementById("categoriaNombre");
  const selectInput = document.getElementById("categoriaSelect");

  try {
    if (currentAction === "add") {
      const nombre = (nombreInput.value || "").trim();
      if (!nombre) return showToast("El nombre es requerido", "error");
      await crearCategoria({ nombre });
      showToast("Categoría agregada correctamente", "success");
      closeCategoriaModal();
      await cargarCategorias();

    } else if (currentAction === "edit") {
      const id = parseInt(selectInput.value);
      const nombre = (nombreInput.value || "").trim();
      if (!id) return showToast("Seleccione una categoría", "error");
      if (!nombre) return showToast("El nombre es requerido", "error");
      await actualizarCategoria(id, { nombre });
      showToast("Categoría actualizada correctamente", "success");
      closeCategoriaModal();
      await cargarCategorias();

    } else if (currentAction === "delete") {
      const id = parseInt(selectInput.value);
      if (!id) return showToast("Seleccione una categoría", "error");

      openConfirmModal(
        "Eliminar Categoría",
        "¿Estás seguro que deseas eliminar esta categoría?",
        "deleteCategoria",
        id
      );
    }
  } catch (err) {
    console.error(err);
    showToast("Error al procesar la categoría", "error");
  }
}

function handleClick(e) {
  if (e.target.closest(".edit-platillo-btn")) {
    const card = e.target.closest(".platillo-card");
    if (card) {
      const id = parseInt(card.dataset.id);
      openPlatilloModal(id);
    }
  }

  if (e.target.closest(".delete-platillo-btn")) {
    const card = e.target.closest(".platillo-card");
    if (card) {
      const id = parseInt(card.dataset.id);
      const platillo = platillos.find((p) => p.id === id);
      openConfirmModal(
        "Eliminar Platillo",
        `¿Estás seguro que deseas eliminar "${platillo?.nombre || "este platillo"}"?`,
        "deletePlatillo",
        id
      );
    }
  }
}

async function handleConfirmAction() {
  const action = this.dataset.action;
  const id = this.dataset.id ? parseInt(this.dataset.id) : null;

  try {
    if (action === "deletePlatillo" && id) {
      await eliminarPlatillo(id);
      platillos = platillos.filter((p) => p.id !== id);
      renderPlatillos();
      showToast("Platillo eliminado correctamente", "success");
    } else if (action === "deleteCategoria" && id) {
      await eliminarCategoria(id);
      await cargarCategorias();
      showToast("Categoría eliminada correctamente", "success");
    }
  } catch (err) {
    console.error(err);
    showToast("Ocurrió un error al ejecutar la acción", "error");
  } finally {
    closeConfirmModal();
  }
}

/* ======== DTO exacto que consume el service ======== */
function makePlatilloDTO({ nombre, descripcion, precio, idCategoria, imagenUrl, publicId }) {
  return {
    nombre: nombre,
    descripcion: descripcion,
    precio: Number(precio || 0),
    idCategoria: Number(idCategoria),
    imagenUrl: imagenUrl || null,
    publicId: publicId || null
  };
}

/* === IVA helpers (forzar suma) === */
function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}
function precioConIVA(precioBase, tasa = 0.13) {
  const base = Number(String(precioBase).replace(/[^0-9.]/g, "")); // limpia $ y comas
  return round2(base * (1 + tasa));
}

/* ======== Guardar / Actualizar Platillo (FORZAR +13% SIEMPRE) ======== */
async function handlePlatilloSubmit(e) {
  e.preventDefault();

  const idHidden   = (document.getElementById("platilloId").value || "").trim();
  const isEdit     = !!idHidden;
  const id         = isEdit ? parseInt(idHidden) : null;

  const nombre       = (document.getElementById("platilloNombre").value || "").trim();
  const idCateStr    = (document.getElementById("platilloCategoria").value || "").trim();
  const descripcion  = (document.getElementById("platilloDescripcion").value || "").trim();
  const precioStr    = (document.getElementById("platilloPrecio").value || "").trim();
  const imagenUrlIn  = (document.getElementById("platilloImagenUrl").value || "").trim();
  const fileInput    = document.getElementById("platilloImagen");
  const file         = fileInput?.files?.[0] || null;

  // Validaciones mínimas
  if (!nombre) return showToast("El nombre del platillo es requerido", "error");
  const idCategoria = parseInt(idCateStr);
  if (!idCategoria) return showToast("La categoría (Id) es requerida", "error");
  if (!descripcion) return showToast("La descripción no puede ser nula", "error");

  // Normaliza precio ingresado (acepta $ y coma decimal)
  const precioBaseNum = Number(String(precioStr).replace(",", ".").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(precioBaseNum) || precioBaseNum < 0.01) {
    return showToast("El precio debe ser ≥ 0.01", "error");
  }

  // APLICAR IVA SIEMPRE (crear y editar)
  const precioFinal = precioConIVA(precioBaseNum, 0.13);

  const dto = makePlatilloDTO({
    nombre,
    descripcion,
    precio: precioFinal,
    idCategoria,
    imagenUrl: imagenUrlIn || null,
    publicId: null
  });

  // Diagnóstico
  console.log("[DTO a enviar]", dto);

  try {
    const hasUploadedUrl = !!imagenUrlIn;

    if (isEdit) {
      if (file && !hasUploadedUrl) {
        await actualizarPlatilloConImagen(id, dto, file); // multipart
      } else {
        await actualizarPlatillo(id, dto);                // JSON
      }
      showToast(`Platillo actualizado (con IVA: $${precioFinal.toFixed(2)})`, "success");
    } else {
      if (file && !hasUploadedUrl) {
        await crearPlatilloConImagen(dto, file);          // multipart
      } else {
        await crearPlatillo(dto);                         // JSON
      }
      showToast(`Platillo agregado (con IVA: $${precioFinal.toFixed(2)})`, "success");
    }

    await cargarPlatillos();
    safeClosePlatilloModal();
  } catch (err) {
    console.error("[error] Guardar/Actualizar platillo:", err);
    showToast(err?.message || "Error al guardar el platillo", "error");
  }
}

/* ================= Utils ================= */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="flex items-center">
      <i class="fas fa-${
        type === "success" ? "check-circle" : type === "error" ? "exclamation-circle" : "info-circle"
      } mr-3"></i>
      <span>${escapeHtml(message)}</span>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => {
      if (document.body.contains(toast)) document.body.removeChild(toast);
    }, 400);
  }, 4000);
}

function escapeHtml(str) {
  return String(str || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
