import { getOfertas, createOferta, updateOferta, deleteOferta, demoOffers, USE_DEMO } from "./ofertasService.js";

// Estado UI
let offers = [];
let editMode = false;
let editId = null;
let lastImg = "";

// Helpers UI
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", init);

async function init() {
  wireUserMenu();
  wireSidebar();
  wireForm();

  await loadOffers();
  renderOffers(offers);
  animateIn();
}

function wireUserMenu(){
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (!userBtn) return;

  // Dropdown
  if (!document.getElementById("userDropdown")) {
    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.id = "userDropdown";
    dropdown.innerHTML = `
      <button class="user-dropdown-item" id="logoutBtn">
        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
      </button>
    `;
    userBtn.parentNode.style.position = "relative";
    userBtn.parentNode.appendChild(dropdown);

    const overlay = document.createElement("div");
    overlay.className = "user-dropdown-overlay";
    overlay.id = "userDropdownOverlay";
    document.body.appendChild(overlay);

    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
      overlay.classList.toggle("active");
    });
    overlay.addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        dropdown.classList.remove("show");
        overlay.classList.remove("active");
      }
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }
}

function wireSidebar(){
  const sidebar = document.getElementById("sidebar");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");

  // móvil
  sidebarToggle?.addEventListener("click", () => {
    sidebar.classList.toggle("mobile-open");
    mobileOverlay.classList.toggle("active");
  });
  mobileOverlay?.addEventListener("click", () => {
    sidebar.classList.remove("mobile-open");
    mobileOverlay.classList.remove("active");
  });

  // desktop collapse
  sidebarToggleDesktop?.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });

  // esc para cerrar mobile
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    }
  });

  // al redimensionar
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    }
  });
}

function wireForm(){
  // Búsqueda y filtro
  $("#searchInput").addEventListener("input", filterOffers);
  $("#statusFilter").addEventListener("change", filterOffers);

  // FAB
  $("#fab").addEventListener("click", () => openOfferModal());

  // Form
  $("#offerForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveOffer();
  });
  $("#offer-image").addEventListener("change", previewImg);
  $("#offer-cancel-btn").addEventListener("click", closeOfferModal);

  // ESC cierra modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOfferModal();
  });
}

async function loadOffers(){
  try{
    const data = await getOfertas(0, 200);
    // Normalizar nombres a los usados en el front
    offers = (data || []).map(mapFromApi);
    if ((!offers || offers.length === 0) && USE_DEMO) {
      offers = demoOffers.map(d => mapFromApi(d));
    }
  }catch(err){
    console.error("[OFERTAS] Error cargando ofertas:", err);
    if (USE_DEMO) {
      offers = demoOffers.map(d => mapFromApi(d));
    } else {
      offers = [];
    }
  }
}

function mapFromApi(apiItem){
  // Acepta camel, Pascal o snake si tu backend difiere
  return {
    id: apiItem.IdOferta ?? apiItem.id ?? apiItem.ID ?? apiItem.idOferta ?? null,
    title: apiItem.Titulo ?? apiItem.title,
    description: apiItem.Descripcion ?? apiItem.description,
    discount: apiItem.Descuento ?? apiItem.discount,
    startDate: apiItem.FechaInicio ?? apiItem.startDate,
    endDate: apiItem.FechaFin ?? apiItem.endDate,
    image: apiItem.Imagen ?? apiItem.image
  };
}
function mapToApi(uiItem){
  return {
    IdOferta: uiItem.id ?? null,
    Titulo: uiItem.title,
    Descripcion: uiItem.description,
    Descuento: uiItem.discount,
    FechaInicio: uiItem.startDate,
    FechaFin: uiItem.endDate,
    Imagen: uiItem.image
  };
}

function renderOffers(list = offers){
  const container = $("#offersContainer");
  const emptyState = $("#emptyState");
  container.innerHTML = "";

  if (!list.length){
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  list.forEach(offer => {
    const status = getStatus(offer.startDate, offer.endDate);
    const statusClass = status === "Activo" ? "status-active" :
                        status === "Próximo" ? "status-upcoming" : "status-expired";

    const card = document.createElement("div");
    card.className = "offer-card";
    card.innerHTML = `
      <div class="card-image-container">
        <img src="${offer.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}" alt="${escapeHtml(offer.title)}" class="card-image">
        <div class="discount-badge">${escapeHtml(offer.discount || "")}</div>
      </div>
      <div class="card-content">
        <div class="flex justify-between items-start mb-3">
          <h3 class="card-title flex-1">${escapeHtml(offer.title)}</h3>
          <span class="status-badge ${statusClass} ml-2">${status}</span>
        </div>
        <p class="card-description">${escapeHtml(offer.description || "")}</p>
        <div class="date-info">
          <div class="date-item">
            <div class="date-label">Inicio</div>
            <div class="date-value">${formatDate(offer.startDate)}</div>
          </div>
          <div class="date-item">
            <div class="date-label">Fin</div>
            <div class="date-value">${formatDate(offer.endDate)}</div>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-edit" data-action="edit" data-id="${offer.id}">
            <i class="fas fa-pen"></i><span>Editar</span>
          </button>
          <button class="btn btn-delete" data-action="delete" data-id="${offer.id}">
            <i class="fas fa-trash"></i><span>Eliminar</span>
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // delegación de eventos para editar/eliminar
  container.onclick = (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.action === "edit") {
      openOfferModal(id);
    } else {
      onDeleteOffer(id);
    }
  };
}

function animateIn(){
  $$(".animate-fade-in").forEach(el=>{
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all .6s cubic-bezier(.4,0,.2,1)';
    requestAnimationFrame(()=> {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}

// ---------- Estados / Filtro ----------
function getStatus(start, end){
  const hoy = new Date();
  const inicio = new Date(`${start}T00:00:00`);
  const fin = new Date(`${end}T23:59:59`);
  if (hoy < inicio) return "Próximo";
  if (hoy > fin) return "Vencido";
  return "Activo";
}

function filterOffers(){
  const search = $("#searchInput").value.toLowerCase();
  const status = $("#statusFilter").value;
  let filtered = offers.filter(o =>
    (o.title?.toLowerCase().includes(search) || o.description?.toLowerCase().includes(search))
  );
  if (status !== "all") {
    filtered = filtered.filter(o => {
      const s = getStatus(o.startDate, o.endDate);
      if (status === "active") return s === "Activo";
      if (status === "upcoming") return s === "Próximo";
      if (status === "expired") return s === "Vencido";
    });
  }
  renderOffers(filtered);
}

// ---------- Modal ----------
function openOfferModal(id = null){
  clearOfferModal();
  editMode = Boolean(id);
  editId = id ?? null;
  lastImg = "";

  $("#modal-title").innerText = id ? "Editar Oferta" : "Agregar Oferta";

  if (id){
    const o = offers.find(x => x.id === id);
    if (o){
      $("#offer-title").value = o.title ?? "";
      $("#offer-description").value = o.description ?? "";
      $("#offer-discount").value = o.discount ?? "";
      $("#offer-start").value = o.startDate ?? "";
      $("#offer-end").value = o.endDate ?? "";
      $("#img-preview").innerHTML = o.image ? `<img src="${o.image}" alt="Preview">` : "";
      lastImg = o.image ?? "";
    }
  }

  $("#offer-modal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeOfferModal(){
  $("#offer-modal").classList.add("hidden");
  document.body.style.overflow = "auto";
}

function clearOfferModal(){
  $("#offerForm").reset();
  $("#img-preview").innerHTML = "";
  lastImg = "";
  $$(".error-text").forEach(e => e.innerText = "");
  $$("#offerForm input, #offerForm textarea").forEach(f => f.classList.remove("invalid"));
}

// ---------- Imagen ----------
function previewImg(e){
  const file = e.target.files[0];
  const prev = $("#img-preview");
  if (!file){ prev.innerHTML = ""; lastImg=""; return; }
  const reader = new FileReader();
  reader.onload = (x) => {
    prev.innerHTML = `<img src="${x.target.result}" alt="Preview">`;
    lastImg = x.target.result;
  };
  reader.readAsDataURL(file);
}

// ---------- Guardar (crear/actualizar) ----------
async function saveOffer(){
  const title = $("#offer-title");
  const description = $("#offer-description");
  const discount = $("#offer-discount");
  const start = $("#offer-start");
  const end = $("#offer-end");
  const imgInput = $("#offer-image");

  let valid = true;

  // Título
  if (!title.value.trim() || title.value.trim().length < 5) {
    invalidate(title, "offer-title-err", "El título debe tener al menos 5 caracteres.");
    valid = false;
  } else clearErr(title, "offer-title-err");

  // Descripción
  if (!description.value.trim() || description.value.trim().length < 10) {
    invalidate(description, "offer-description-err", "La descripción debe tener al menos 10 caracteres.");
    valid = false;
  } else clearErr(description, "offer-description-err");

  // Descuento / etiqueta
  if (!discount.value.trim() || discount.value.trim().length < 2) {
    invalidate(discount, "offer-discount-err", "Ingresa una promoción válida.");
    valid = false;
  } else clearErr(discount, "offer-discount-err");

  // Fechas
  const todayStr = new Date().toISOString().split("T")[0];
  if (!start.value) { invalidate(start, "offer-start-err", "La fecha de inicio es requerida."); valid=false; }
  else if (start.value <= todayStr) { invalidate(start, "offer-start-err", "La fecha debe ser después de hoy."); valid=false; }
  else clearErr(start, "offer-start-err");

  if (!end.value) { invalidate(end, "offer-end-err", "La fecha de fin es requerida."); valid=false; }
  else if (end.value <= start.value) { invalidate(end, "offer-end-err", "Debe ser posterior a la fecha de inicio."); valid=false; }
  else clearErr(end, "offer-end-err");

  // Imagen
  let imgData = lastImg;
  if (!editMode && !imgData && !imgInput.files[0]) {
    invalidate(imgInput, "offer-image-err", "Selecciona una imagen.");
    valid = false;
  } else {
    clearErr(imgInput, "offer-image-err");
    if (imgInput.files[0]) {
      imgData = await fileToBase64(imgInput.files[0]);
    }
  }

  if (!valid) return;

  // Loading
  const saveBtn = $("#offer-save-btn");
  const originalContent = saveBtn.innerHTML;
  saveBtn.innerHTML = '<div class="spinner"></div> Guardando...';
  saveBtn.disabled = true;

  try{
    const payload = {
      id: editMode ? editId : null,
      title: title.value.trim(),
      description: description.value.trim(),
      discount: discount.value.trim(),
      startDate: start.value,
      endDate: end.value,
      image: imgData
    };

    if (editMode) {
      await updateOferta(editId, mapToApi(payload));
      // Actualizar en memoria
      const idx = offers.findIndex(o => o.id === editId);
      if (idx !== -1) {
        offers[idx] = { ...offers[idx], ...payload };
      }
    } else {
      const res = await createOferta(mapToApi(payload));
      // si backend devuelve objeto creado con IdOferta
      const newId = res?.IdOferta ?? res?.id ?? (offers.length ? Math.max(...offers.map(o=>o.id||0))+1 : 1);
      offers.push({ ...payload, id: newId });
    }

    closeOfferModal();
    renderOffers(offers);
    filterOffers();
  }catch(err){
    console.error("[OFERTAS] Error al guardar:", err);
    alert("No se pudo guardar la oferta. Revisa la consola para más detalle.");
  }finally{
    saveBtn.innerHTML = originalContent;
    saveBtn.disabled = false;
  }
}

function invalidate(input, errId, msg){
  input.classList.add("invalid");
  document.getElementById(errId).innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
}
function clearErr(input, errId){
  input.classList.remove("invalid");
  document.getElementById(errId).innerHTML = "";
}

function fileToBase64(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- Eliminar ----------
function onDeleteOffer(id){
  if (!confirm("¿Seguro que deseas eliminar esta oferta?")) return;
  (async ()=>{
    try{
      await deleteOferta(id);
      offers = offers.filter(o => o.id !== id);
      renderOffers(offers);
      filterOffers();
    }catch(err){
      console.error("[OFERTAS] Error al eliminar:", err);
      alert("No se pudo eliminar. Revisa la consola para más detalle.");
    }
  })();
}

// ---------- Utilidades ----------
function formatDate(date){
  const d = new Date(date);
  return d.toLocaleDateString("es-ES", { year:"numeric", month:"short", day:"numeric" });
}
function escapeHtml(str=""){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
