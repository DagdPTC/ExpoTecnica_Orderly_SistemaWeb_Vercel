
import ServiceMesas from "../jsServices/ServiceMesas.js";

let mesas = [];                 // siempre desde API
let estadosCatalog = [];        // catálogo para ciclo de estados
let currentMesaId = null;
let currentFilter = "all";

document.addEventListener("DOMContentLoaded", () => {
  init().catch((e) => {
    console.error(e);
    showToast("No se pudo inicializar Mesas. Verifica tu sesión.", "error");
  });
});

async function init() {
  setupSidebar();
  setupFAB();
  setupModals();
  setupUserDropdown();
  setupAnimations();

  await loadEstados();
  await loadMesas();
  renderMesas();
  updateCounters();
}

async function loadEstados() {
  try {
    const data = await ServiceMesas.getEstadosMesa();
    estadosCatalog = (data || []).map((e) => ({
      id: e.id ?? e.idEstadoMesa ?? e.estadoMesaId ?? e.id_estado,
      nombre: (e.nombre ?? e.estado ?? e.descripcion ?? "").toString(),
      orden: Number.isFinite(e.orden)
        ? e.orden
        : parseInt(e.orden ?? e.order ?? e.posicion ?? "0", 10) || 0,
    }));
    estadosCatalog.sort((a, b) => a.orden - b.orden);
  } catch (err) {
    console.warn("Catálogo de estados no disponible, usando defaults.", err);
    estadosCatalog = [
      { id: "LIBRE", nombre: "libre", orden: 1 },
      { id: "OCUPADA", nombre: "ocupada", orden: 2 },
      { id: "RESERVADA", nombre: "reservada", orden: 3 },
      { id: "LIMPIEZA", nombre: "limpieza", orden: 4 },
    ];
  }
}

async function loadMesas() {
  const data = await ServiceMesas.getMesas();
  mesas = (data || []).map((m) => ({
    id: m.id ?? m.idMesa ?? m.mesaId,
    numero: m.numero ?? m.numMesa ?? m.numeroMesa,
    capacidad: m.capacidad ?? m.capacidadMesa ?? 0,
    estado: normalizeEstadoNombre(m.estado ?? m.estadoMesa ?? m.nombreEstado),
    idEstadoMesa:
      m.idEstadoMesa ??
      m.estadoMesaId ??
      estadosCatalog.find((e) => normalizeEstadoNombre(e.nombre) === normalizeEstadoNombre(m.estado))?.id,
    responsable: m.responsable ?? m.mesero ?? "",
    cliente: m.cliente ?? m.nombreCliente ?? "",
  }));
}

function normalizeEstadoNombre(v) {
  return (v ?? "").toString().trim().toLowerCase() || "libre";
}
function capitalize(s) {
  s = (s ?? "").toString();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function getStatusConfig(estadoNombre) {
  const map = {
    libre: { icon: "fa-check-circle", color: "emerald", text: "Disponible" },
    ocupada: { icon: "fa-users", color: "red", text: "Ocupada" },
    reservada: { icon: "fa-bookmark", color: "blue", text: "Reservada" },
    limpieza: { icon: "fa-broom", color: "amber", text: "Limpieza" },
  };
  return map[normalizeEstadoNombre(estadoNombre)] ?? {
    icon: "fa-circle",
    color: "slate",
    text: capitalize(estadoNombre),
  };
}

function renderMesas(filter = "all") {
  const container = document.getElementById("mesas-container");
  const emptyState = document.getElementById("empty-state");
  currentFilter = filter;
  container.innerHTML = "";

  const list = filter === "all" ? mesas : mesas.filter((m) => normalizeEstadoNombre(m.estado) === filter);

  if (!list.length) {
    emptyState?.classList.remove("hidden");
    return;
  } else {
    emptyState?.classList.add("hidden");
  }

  list.forEach((mesa, idx) => {
    const card = createMesaCard(mesa, idx);
    container.appendChild(card);
  });

  rebindTableHover();
}

function createMesaCard(mesa, index) {
  const cfg = getStatusConfig(mesa.estado);
  const card = document.createElement("div");
  card.className = `mesa-card mesa-${normalizeEstadoNombre(mesa.estado)} bg-white rounded-2xl shadow-lg p-6 border border-slate-100`;
  card.style.animationDelay = `${index * 0.1}s`;
  card.classList.add("animate-fade-in");

  let extraInfo = "";
  if (normalizeEstadoNombre(mesa.estado) === "ocupada" && mesa.responsable) {
    extraInfo = `
      <div class="mt-4 p-3 bg-slate-50 rounded-xl">
        <div class="flex items-center text-slate-600">
          <i class="fas fa-user-tie mr-2"></i>
          <span class="text-sm">Mesero: <strong>${mesa.responsable}</strong></span>
        </div>
      </div>`;
  } else if (normalizeEstadoNombre(mesa.estado) === "reservada" && mesa.cliente) {
    extraInfo = `
      <div class="mt-4 p-3 bg-slate-50 rounded-xl">
        <div class="flex items-center text-slate-600">
          <i class="fas fa-user mr-2"></i>
          <span class="text-sm">Cliente: <strong>${mesa.cliente}</strong></span>
        </div>
      </div>`;
  }

  card.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-2xl font-bold text-slate-800">Mesa ${mesa.numero}</h3>
        <p class="text-slate-500 text-sm">ID: ${mesa.id}</p>
      </div>
      <div class="w-14 h-14 bg-${cfg.color}-100 rounded-xl flex items-center justify-center">
        <i class="fas ${cfg.icon} text-${cfg.color}-600 text-xl"></i>
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Estado</span>
        <div class="flex items-center">
          <div class="w-3 h-3 bg-${cfg.color}-500 rounded-full mr-2"></div>
          <span class="text-${cfg.color}-600 font-semibold">${cfg.text}</span>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Capacidad</span>
        <div class="flex items-center">
          <i class="fas fa-users text-slate-400 mr-2"></i>
          <span class="text-slate-800 font-semibold">${mesa.capacidad} personas</span>
        </div>
      </div>
    </div>

    ${extraInfo}

    <div class="mt-6 pt-4 border-t border-slate-100">
      <div class="flex justify-center">
        <button data-id="${mesa.id}" class="btn-cambiar-estado btn-modern px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800">
          <i class="fas fa-sync-alt mr-2"></i>
          Cambiar Estado
        </button>
      </div>
    </div>
  `;

  card.querySelector(".btn-cambiar-estado").addEventListener("click", async (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    await cambiarEstadoMesa(id);
  });

  return card;
}

function updateCounters() {
  ["libre", "ocupada", "reservada", "limpieza"].forEach((estado) => {
    const count = mesas.filter((m) => normalizeEstadoNombre(m.estado) === estado).length;
    const el = document.getElementById(`count-${estado}`);
    if (el) {
      el.style.transform = "scale(1.2)";
      setTimeout(() => {
        el.textContent = count;
        el.style.transform = "scale(1)";
      }, 150);
    }
  });
}

function filterTables(status, ev) {
  document.querySelectorAll(".btn-modern").forEach((b) => {
    b.classList.remove("active-filter", "ring-4", "ring-opacity-50");
  });
  if (ev?.currentTarget) {
    ev.currentTarget.classList.add("active-filter", "ring-4", "ring-opacity-50");
  }
  renderMesas(status);
}

async function addMesa() {
  const numero = parseInt(document.getElementById("add-numero")?.value, 10);
  const capacidad = parseInt(document.getElementById("add-capacidad")?.value, 10);

  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    showMessage("add-message", "El número de mesa debe ser entre 1 y 99", "error");
    return;
  }
  if (mesas.some((m) => m.numero === numero)) {
    showMessage("add-message", "Ya existe una mesa con este número", "error");
    return;
  }
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 20) {
    showMessage("add-message", "La capacidad debe ser entre 1 y 20 personas", "error");
    return;
  }

  const estadoInicial = estadosCatalog[0]; // típicamente "libre"
  try {
    await ServiceMesas.createMesa({
      numero,
      capacidad,
      idEstadoMesa: estadoInicial?.id ?? "LIBRE",
      responsable: "",
      cliente: "",
    });
    showMessage("add-message", "¡Mesa creada exitosamente!", "success");
    await refreshMesas();
    setTimeout(() => closeAdd(), 1200);
  } catch (err) {
    showMessage("add-message", `No se pudo crear: ${err.message}`, "error");
  }
}

function nextUpdate() {
  const numero = parseInt(document.getElementById("update-search-numero")?.value, 10);
  if (!Number.isInteger(numero)) {
    showMessage("update-message-step1", "Ingresa un número válido", "error");
    return;
  }
  const mesa = mesas.find((m) => m.numero === numero);
  if (!mesa) {
    showMessage("update-message-step1", "No se encontró ninguna mesa con ese número", "error");
    return;
  }

  currentMesaId = mesa.id;
  document.getElementById("update-numero").value = mesa.numero;
  document.getElementById("update-capacidad").value = mesa.capacidad;

  hideModal("update-modal-step1");
  setTimeout(() => showModal("update-modal-step2"), 250);
}

async function updateMesa() {
  const numero = parseInt(document.getElementById("update-numero")?.value, 10);
  const capacidad = parseInt(document.getElementById("update-capacidad")?.value, 10);

  if (!Number.isInteger(numero) || numero < 1 || numero > 99) {
    showMessage("update-message-step2", "El número debe ser entre 1 y 99", "error");
    return;
  }
  if (mesas.some((m) => m.numero === numero && m.id !== currentMesaId)) {
    showMessage("update-message-step2", "Ya existe otra mesa con este número", "error");
    return;
  }
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 20) {
    showMessage("update-message-step2", "La capacidad debe ser entre 1 y 20", "error");
    return;
  }

  const mesaActual = mesas.find((m) => m.id === currentMesaId);
  if (!mesaActual) {
    showMessage("update-message-step2", "Mesa no encontrada", "error");
    return;
  }

  try {
    await ServiceMesas.updateMesa(currentMesaId, {
      numero,
      capacidad,
      idEstadoMesa: mesaActual.idEstadoMesa,
      responsable: mesaActual.responsable ?? "",
      cliente: mesaActual.cliente ?? "",
    });
    showMessage("update-message-step2", "¡Mesa actualizada correctamente!", "success");
    await refreshMesas();
    setTimeout(() => closeUpdate(), 1200);
  } catch (err) {
    showMessage("update-message-step2", `No se pudo actualizar: ${err.message}`, "error");
  }
}

async function deleteMesa() {
  const numero = parseInt(document.getElementById("delete-numero")?.value, 10);
  if (!Number.isInteger(numero)) {
    showMessage("delete-message", "Ingresa un número válido", "error");
    return;
  }
  const mesa = mesas.find((m) => m.numero === numero);
  if (!mesa) {
    showMessage("delete-message", "No se encontró la mesa", "error");
    return;
  }
  if (normalizeEstadoNombre(mesa.estado) !== "libre") {
    showMessage("delete-message", "Solo se pueden eliminar mesas disponibles", "warning");
    return;
  }

  try {
    await ServiceMesas.deleteMesa(mesa.id);
    showMessage("delete-message", "¡Mesa eliminada correctamente!", "success");
    await refreshMesas();
    setTimeout(() => closeDelete(), 1200);
  } catch (err) {
    showMessage("delete-message", `No se pudo eliminar: ${err.message}`, "error");
  }
}

async function refreshMesas() {
  await loadMesas();
  renderMesas(currentFilter);
  updateCounters();
}

async function cambiarEstadoMesa(mesaId) {
  const mesa = mesas.find((m) => `${m.id}` === `${mesaId}`);
  if (!mesa) return;

  if (!estadosCatalog.length) {
    showToast("No hay catálogo de estados cargado.", "warning");
    return;
  }

  let idx = -1;
  if (mesa.idEstadoMesa) idx = estadosCatalog.findIndex((e) => `${e.id}` === `${mesa.idEstadoMesa}`);
  if (idx === -1) idx = estadosCatalog.findIndex((e) => normalizeEstadoNombre(e.nombre) === normalizeEstadoNombre(mesa.estado));
  if (idx === -1) idx = 0;

  const next = estadosCatalog[(idx + 1) % estadosCatalog.length];

  const payload = {
    numero: mesa.numero,
    capacidad: mesa.capacidad,
    idEstadoMesa: next.id,
    responsable: normalizeEstadoNombre(next.nombre) === "ocupada" ? mesa.responsable || "" : "",
    cliente: normalizeEstadoNombre(next.nombre) === "reservada" ? mesa.cliente || "" : "",
  };

  try {
    await ServiceMesas.updateMesa(mesa.id, payload);
    await refreshMesas();
  } catch (err) {
    showToast(`No se pudo cambiar el estado: ${err.message}`, "error");
  }
}

function setupSidebar() {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");
  const mobileOverlay = document.getElementById("mobileOverlay");

  sidebarToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("mobile-open");
    mobileOverlay?.classList.toggle("active");
  });

  sidebarToggleDesktop?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
  });

  mobileOverlay?.addEventListener("click", () => {
    sidebar?.classList.remove("mobile-open");
    mobileOverlay?.classList.remove("active");
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });
}

function setupFAB() {
  const fabMain = document.getElementById("fab-main");
  const fabMenu = document.getElementById("fab-menu");
  const addBtn = document.getElementById("add-btn");
  const editBtn = document.getElementById("edit-btn");
  const deleteBtn = document.getElementById("delete-btn");

  fabMain?.addEventListener("click", () => {
    fabMenu?.classList.toggle("hidden");
    const icon = fabMain.querySelector("i");
    if (!icon) return;
    if (fabMenu?.classList.contains("hidden")) {
      icon.classList.remove("fa-times");
      icon.classList.add("fa-plus");
    } else {
      icon.classList.remove("fa-plus");
      icon.classList.add("fa-times");
    }
  });

  addBtn?.addEventListener("click", () => {
    showModal("add-modal");
    closeFABMenu();
  });

  editBtn?.addEventListener("click", () => {
    showModal("update-modal-step1");
    closeFABMenu();
  });

  deleteBtn?.addEventListener("click", () => {
    showModal("delete-modal");
    closeFABMenu();
  });
}

function closeFABMenu() {
  const fabMenu = document.getElementById("fab-menu");
  const fabMain = document.getElementById("fab-main");
  fabMenu?.classList.add("hidden");
  const icon = fabMain?.querySelector("i");
  icon?.classList.remove("fa-times");
  icon?.classList.add("fa-plus");
}

function setupModals() {
  document.addEventListener("click", (e) => {
    if (e.target.classList?.contains("modal")) {
      hideModal(e.target.id);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideAllModals();
      closeFABMenu();
    }
  });
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("show");
  setTimeout(() => {
    const content = modal.querySelector(".modal-content");
    if (content) {
      content.style.transform = "scale(1)";
      content.style.opacity = "1";
    }
  }, 10);
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const content = modal.querySelector(".modal-content");
  if (content) {
    content.style.transform = "scale(0.9)";
    content.style.opacity = "0";
  }
  setTimeout(() => {
    modal.classList.add("hidden");
    modal.classList.remove("show");
  }, 300);
}

function hideAllModals() {
  ["add-modal", "update-modal-step1", "update-modal-step2", "delete-modal"].forEach((id) => {
    const m = document.getElementById(id);
    if (m && !m.classList.contains("hidden")) hideModal(id);
  });
}

function clearForm(type) {
  const map = {
    add: ["add-numero", "add-capacidad", "add-message"],
    update: ["update-search-numero", "update-numero", "update-capacidad", "update-message-step1", "update-message-step2"],
    delete: ["delete-numero", "delete-message"],
  };
  (map[type] || []).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "INPUT") el.value = "";
    else {
      el.textContent = "";
      el.className = "text-center text-sm";
    }
  });
}

function closeAdd() {
  hideModal("add-modal");
  clearForm("add");
}
function closeUpdate() {
  hideModal("update-modal-step1");
  hideModal("update-modal-step2");
  clearForm("update");
}
function closeDelete() {
  hideModal("delete-modal");
  clearForm("delete");
}

function showMessage(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  if (!element) return;
  const colors = {
    success: "text-emerald-600 bg-emerald-50 border border-emerald-200",
    error: "text-red-600 bg-red-50 border border-red-200",
    warning: "text-amber-600 bg-amber-50 border-amber-200",
    info: "text-blue-600 bg-blue-50 border-blue-200",
  };
  element.textContent = message;
  element.className = `text-center text-sm p-3 rounded-lg ${colors[type] || colors.info}`;
}

function showToast(msg, type = "info") {
  console[type === "error" ? "error" : "log"](msg);
}

function setupUserDropdown() {
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (!userBtn) return;

  userBtn.style.position = "relative";

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

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }
}

function setupAnimations() {
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
      }
    });
  }, observerOptions);

  document.querySelectorAll(".animate-fade-in").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    observer.observe(el);
  });

  rebindTableHover();
}

function rebindTableHover() {
  document.querySelectorAll(".mesa-card").forEach((table) => {
    table.addEventListener("mouseenter", function () {
      this.style.transform = "scale(1.05) rotate(2deg)";
    });
    table.addEventListener("mouseleave", function () {
      this.style.transform = "scale(1) rotate(0deg)";
    });
    table.addEventListener("click", function () {
      this.style.transform = "scale(0.95)";
      setTimeout(() => {
        this.style.transform = "scale(1.05) rotate(2deg)";
      }, 150);
    });
  });
}

window.filterTables = (status) => filterTables(status);
window.addMesa = () => addMesa();
window.nextUpdate = () => nextUpdate();
window.updateMesa = () => updateMesa();
window.deleteMesa = () => deleteMesa();
window.closeAdd = () => closeAdd();
window.closeUpdate = () => closeUpdate();
window.closeDelete = () => closeDelete();
