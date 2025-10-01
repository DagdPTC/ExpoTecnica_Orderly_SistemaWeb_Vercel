// ==========================
// ControllerScript.js
// Render específico según tus JSON (mesas/pedidos/reservas) + Header Usuario
// ==========================
import { Service } from "../jsService/ServiceScript.js";

// === Auth & rutas ===
const API_BASE        = "http://localhost:8080";
const ME_ENDPOINT     = `${API_BASE}/api/auth/me`;
const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`;
const LOGIN_PAGE      = "inicioSesion.html";

// === Mapeos dinámicos (se cargan desde el API) ===
let MAP_ESTADO_MESA = {};
let MAP_ESTADO_PEDIDO = {};
let MAP_ESTADO_RESERVA = {};

// === Estado de paginación ===
let currentMesasPage = 0;
let mesasPerPage = 6;
let allMesas = [];

const DEFAULTS = {
  selectors: {
    cardMesasCount:    "#cardMesasCount",
    cardPedidosCount:  "#cardPedidosCount",
    cardReservasCount: "#cardReservasCount",
    listMesas:         "#listMesas",
    listPedidos:       "#listPedidos",
    listReservas:      "#listReservas",
    mesasPagination:   "#mesasPagination",
    toast:             "#appToast",
    topUserName:       "#topUserName",
    sidebarUserName:   "#sidebarUserName",
    userMenuBtn:       "#userMenuBtn",
    userMenu:          "#userMenu",
    btnLogout:         "#btnLogout",
  },
  topN: 6,
  autoRefreshMs: 45000,
  useAbortOnRefresh: true
};

// === Utils ===
const $ = (s) => document.querySelector(s);
const setText = (sel, t) => { const el = $(sel); if (el) el.textContent = t; };
const nf = (n) => new Intl.NumberFormat().format(n ?? 0);
const money = (n) => (n == null ? "—" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n));
const clip = (s, m=80) => (s && s.length > m ? s.slice(0, m-1) + "…" : s || "");

function showToast(sel, msg) {
  const el = $(sel);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden","opacity-0");
  el.classList.add("opacity-100");
  setTimeout(()=>{
    el.classList.add("opacity-0");
    setTimeout(()=>el.classList.add("hidden"),300);
  }, 3500);
}

// ========== BLOQUE: Usuario (me + menú + logout) ==========

function guessDisplayName(u = {}) {
  return (
    u.nombreCompleto ||
    u.nombre ||
    u.fullName ||
    (u.nombres && u.apellidos ? `${u.nombres} ${u.apellidos}` : null) ||
    u.username ||
    (u.email ? u.email.split("@")[0] : null) ||
    "Usuario"
  );
}

function setUserNameEverywhere(name, cfg) {
  setText(cfg.selectors.topUserName, name);
  setText(cfg.selectors.sidebarUserName, name);
  const elMenuName = document.querySelector("#userMenuName");
  if (elMenuName) elMenuName.textContent = name;
}

async function loadMeOrRedirect() {
  const res = await fetch(ME_ENDPOINT, { credentials: "include" });
  if (res.status === 401) {
    window.location.href = LOGIN_PAGE;
    return null;
  }
  if (!res.ok) throw new Error("No se pudo obtener el usuario");
  const data = await res.json();
  return data.user || data.usuario || data;
}

async function logoutAndRedirect() {
  try {
    await fetch(LOGOUT_ENDPOINT, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" }
    });
  } catch (_) {
  } finally {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    window.location.href = LOGIN_PAGE;
  }
}

function setupUserHeader(cfg) {
  const btn  = $(cfg.selectors.userMenuBtn);
  const menu = $(cfg.selectors.userMenu);
  if (btn && menu) {
    const toggle = () => menu.classList.toggle("hidden");
    const hide   = () => menu.classList.add("hidden");

    btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && !btn.contains(e.target)) hide();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  }

  const btnLogout = $(cfg.selectors.btnLogout);
  if (btnLogout) {
    btnLogout.addEventListener("click", (e) => { e.preventDefault(); logoutAndRedirect(); });
  }
}

// === Modal Utils ===
function createModal(id) {
  let modal = document.getElementById(id);
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = id;
  modal.className = "fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50 p-4";
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content">
      <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
        <h3 class="text-xl font-bold text-gray-800 modal-title">Detalles</h3>
        <button class="modal-close text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg">
          <i class="fas fa-times text-xl"></i>
        </button>
      </div>
      <div class="modal-body p-6"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const closeBtn = modal.querySelector(".modal-close");
  closeBtn.addEventListener("click", () => closeModal(id));
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(id); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(id); });

  return modal;
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  }
}

// === Modal de Pedido ===
function showPedidoModal(pedido) {
  const modal = createModal("modalPedido");
  const title = modal.querySelector(".modal-title");
  const body = modal.querySelector(".modal-body");

  const estado = MAP_ESTADO_PEDIDO[pedido.idEstadoPedido] ?? { label: `Estado ${pedido.idEstadoPedido}`, color: "#6b7280" };

  title.textContent = `Orden #${pedido.id}`;

  body.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <h4 class="text-2xl font-bold text-gray-800">${pedido.nombreCliente}</h4>
          <p class="text-sm text-gray-500 mt-1">Mesa ${pedido.idMesa} • Empleado #${pedido.idEmpleado}</p>
          <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
            <span>
              <i class="fas fa-calendar mr-1"></i>
              Fecha: ${pedido.fpedido || '--/--/----'}
            </span>
            <span>
              <i class="fas fa-clock mr-1"></i>
              Hora Fin: ${pedido.horaFin || '--:--'}
            </span>
          </div>
        </div>
        <span class="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap" style="background-color: ${estado.color}; color: white;">
          ${estado.label}
        </span>
      </div>

      <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
        <div>
          <p class="text-xs text-gray-500 mb-1">Subtotal</p>
          <p class="text-lg font-semibold text-gray-800">${money(pedido.subtotal)}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Propina</p>
          <p class="text-lg font-semibold text-gray-800">${money(pedido.propina)}</p>
        </div>
      </div>

      <div class="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-xl text-white">
        <p class="text-sm opacity-90 mb-1">Total del Pedido</p>
        <p class="text-3xl font-bold">${money(pedido.totalPedido)}</p>
      </div>

      <div>
        <h5 class="text-lg font-bold text-gray-800 mb-3">Artículos (${pedido.items?.length || 0})</h5>
        <div class="space-y-2">
          ${(pedido.items || []).map(item => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                  ${item.cantidad}x
                </div>
                <div class="ml-3">
                  <p class="font-medium text-gray-800">Platillo #${item.idPlatillo}</p>
                  <p class="text-sm text-gray-500">${money(item.precioUnitario)} c/u</p>
                </div>
              </div>
              <p class="font-semibold text-gray-800">${money(item.precioUnitario * item.cantidad)}</p>
            </div>
          `).join('')}
        </div>
      </div>

      ${pedido.observaciones && pedido.observaciones !== 'Sin observaciones' ? `
        <div class="border-t border-gray-200 pt-4">
          <h5 class="text-sm font-semibold text-gray-700 mb-2 flex items-center">
            <i class="fas fa-sticky-note mr-2 text-gray-400"></i>
            Observaciones
          </h5>
          <p class="text-gray-600 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">
            ${pedido.observaciones}
          </p>
        </div>
      ` : ''}
    </div>
  `;

  openModal("modalPedido");
}

// === Modal de Reserva ===
function showReservaModal(reserva) {
  const modal = createModal("modalReserva");
  const title = modal.querySelector(".modal-title");
  const body = modal.querySelector(".modal-body");

  const estado = MAP_ESTADO_RESERVA[reserva.idEstadoReserva] ?? { label: `Estado ${reserva.idEstadoReserva}`, color: "#6b7280" };

  title.textContent = `Reserva #${reserva.id}`;

  body.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <i class="fas fa-user text-2xl"></i>
          </div>
          <div class="ml-4">
            <h4 class="text-2xl font-bold text-gray-800">${reserva.nomCliente}</h4>
            <p class="text-sm text-gray-500 mt-1 flex items-center">
              <i class="fas fa-phone mr-2"></i>
              ${reserva.telefono}
            </p>
          </div>
        </div>
        <span class="px-4 py-2 rounded-full text-sm font-semibold" style="background-color: ${estado.color}; color: white;">
          ${estado.label}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
          <div class="flex items-center mb-3">
            <i class="fas fa-calendar text-blue-600 text-xl mr-3"></i>
            <div>
              <p class="text-xs text-gray-600">Fecha de Reserva</p>
              <p class="text-lg font-bold text-gray-800">${reserva.fReserva}</p>
            </div>
          </div>
          <div class="flex items-center">
            <i class="fas fa-clock text-blue-600 text-xl mr-3"></i>
            <div>
              <p class="text-xs text-gray-600">Horario</p>
              <p class="text-lg font-bold text-gray-800">${reserva.horaI} - ${reserva.horaF}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 p-4 rounded-xl text-center">
            <i class="fas fa-chair text-gray-400 text-2xl mb-2"></i>
            <p class="text-xs text-gray-500 mb-1">Mesa</p>
            <p class="text-2xl font-bold text-gray-800">#${reserva.idMesa}</p>
          </div>
          <div class="bg-gray-50 p-4 rounded-xl text-center">
            <i class="fas fa-users text-gray-400 text-2xl mb-2"></i>
            <p class="text-xs text-gray-500 mb-1">Personas</p>
            <p class="text-2xl font-bold text-gray-800">${reserva.cantidadPersonas}</p>
          </div>
        </div>

        <div class="bg-gray-50 p-4 rounded-xl">
          <p class="text-xs text-gray-500 mb-1">Tipo de Reserva</p>
          <p class="text-lg font-semibold text-gray-800">Tipo #${reserva.idTipoReserva}</p>
        </div>
      </div>
    </div>
  `;

  openModal("modalReserva");
}

// === Construir mapeos desde el API ===
function buildMapEstadosMesa(estados) {
  MAP_ESTADO_MESA = {};
  if (!estados || !Array.isArray(estados.items)) {
    console.error('ERROR: Estados de mesa inválidos:', estados);
    return;
  }
  estados.items.forEach(e => {
    MAP_ESTADO_MESA[e.id] = {
      label: e.estadoMesa || `Estado ${e.id}`,
      color: e.colorEstadoMesa || '#6b7280',
      cls: `estado-mesa-${e.id}`
    };
  });
}

function buildMapEstadosPedido(estados) {
  const colorDefaults = {
    'pendiente': '#f59e0b',
    'en preparación': '#3b82f6',
    'entregado': '#22c55e',
    'pagado': '#10b981',
    'cancelado': '#ef4444',
    'finalizado': '#6b7280'
  };
  MAP_ESTADO_PEDIDO = {};
  if (!estados || !Array.isArray(estados.items)) return;
  estados.items.forEach(e => {
    const nombre = (e.nomEstado || '').toLowerCase();
    const color = e.colorEstadoPedido || e.color || colorDefaults[nombre] || '#6b7280';
    MAP_ESTADO_PEDIDO[e.id] = {
      label: e.nomEstado || `Estado ${e.id}`,
      color,
      cls: `estado-pedido-${e.id}`
    };
  });
}

function buildMapEstadosReserva(estados) {
  const colorDefaults = { 'pendiente': '#f59e0b', 'confirmada': '#22c55e', 'cancelada': '#ef4444' };
  MAP_ESTADO_RESERVA = {};
  if (!estados || !Array.isArray(estados.items)) return;
  estados.items.forEach(e => {
    const nombre = (e.nomEstado || '').toLowerCase();
    const color = e.colorEstadoReserva || e.color || colorDefaults[nombre] || '#6b7280';
    MAP_ESTADO_RESERVA[e.id] = {
      label: e.nomEstado || `Estado ${e.id}`,
      color,
      cls: `estado-reserva-${e.id}`
    };
  });
}

// === Paginación de Mesas ===
function renderMesasPagination(containerSel) {
  const container = $(containerSel);
  if (!container) return;
  const totalPages = Math.ceil(allMesas.length / mesasPerPage);
  if (totalPages <= 1) { container.innerHTML = ""; return; }
  container.innerHTML = `
    <div class="flex items-center justify-between mt-4">
      <div class="text-sm text-gray-600">
        ${currentMesasPage * mesasPerPage + 1} - ${Math.min((currentMesasPage + 1) * mesasPerPage, allMesas.length)} de ${allMesas.length}
      </div>
      <div class="flex items-center space-x-2">
        <button class="btn-prev-mesas px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" ${currentMesasPage === 0 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="flex items-center space-x-1">
          ${Array.from({ length: totalPages }, (_, i) => `
            <button class="btn-page-mesas px-3 py-2 rounded-lg text-sm ${i === currentMesasPage ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'} transition-colors" data-page="${i}">
              ${i + 1}
            </button>
          `).join('')}
        </div>
        <button class="btn-next-mesas px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" ${currentMesasPage === totalPages - 1 ? 'disabled' : ''}>
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `;
  const btnPrev = container.querySelector('.btn-prev-mesas');
  const btnNext = container.querySelector('.btn-next-mesas');
  const btnPages = container.querySelectorAll('.btn-page-mesas');
  if (btnPrev) btnPrev.addEventListener('click', () => { if (currentMesasPage > 0) { currentMesasPage--; renderMesasPage(); } });
  if (btnNext) btnNext.addEventListener('click', () => { if (currentMesasPage < totalPages - 1) { currentMesasPage++; renderMesasPage(); } });
  btnPages.forEach(btn => btn.addEventListener('click', (e) => {
    const page = parseInt(e.currentTarget.dataset.page);
    currentMesasPage = page;
    renderMesasPage();
  }));
}

function renderMesasPage() {
  const start = currentMesasPage * mesasPerPage;
  const end = start + mesasPerPage;
  const mesasToShow = allMesas.slice(start, end);
  const container = $(DEFAULTS.selectors.listMesas);
  if (!container) return;
  container.innerHTML = "";
  if (mesasToShow.length === 0) {
    container.innerHTML = `<div class="text-gray-500">No hay mesas para mostrar.</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-3 gap-3";
  mesasToShow.forEach(m => {
    const st = MAP_ESTADO_MESA[m.idEstadoMesa] ?? {
      label: `Estado ${m.idEstadoMesa}`,
      color: "#6b7280",
      cls: "status-desconocido"
    };
    const card = document.createElement("div");
    card.className = `table-status p-4 text-center cursor-pointer rounded-xl transition-all duration-200`;
    card.style.backgroundColor = st.color + '20';
    card.style.borderLeft = `4px solid ${st.color}`;
    card.innerHTML = `
      <div class="text-xs text-gray-600 mb-1">#${m.id}</div>
      <div class="text-xl font-bold mb-1">${m.nomMesa || "Mesa"}</div>
      <div class="text-xs font-medium px-2 py-1 rounded-full inline-block" style="background-color: ${st.color}; color: white;">
        ${st.label}
      </div>
    `;
    card.addEventListener("mouseenter", ()=> card.style.transform="scale(1.05) rotate(2deg)");
    card.addEventListener("mouseleave", ()=> card.style.transform="scale(1) rotate(0deg)");
    grid.appendChild(card);
  });
  container.appendChild(grid);
  renderMesasPagination(DEFAULTS.selectors.mesasPagination);
}

// === Render MESAS ===
function renderMesas(containerSel, page, topN) {
  allMesas = page.items ?? [];
  currentMesasPage = 0;
  mesasPerPage = topN;
  renderMesasPage();
}

// === Render PEDIDOS ===
function renderPedidos(containerSel, page, topN) {
  const container = $(containerSel);
  if (!container) return;
  container.innerHTML = "";
  const items = (page.items ?? []).slice(0, topN);
  if (items.length === 0) {
    container.innerHTML = `<div class="text-gray-500">No hay pedidos para mostrar.</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach(p => {
    const st = MAP_ESTADO_PEDIDO[p.idEstadoPedido] ?? {
      label: `Estado ${p.idEstadoPedido}`,
      color: "#6b7280",
      cls: "status-desconocido"
    };
    const cantItems = Array.isArray(p.items) ? p.items.reduce((a,it)=>a+(Number(it.cantidad)||0),0) : 0;
    const card = document.createElement("div");
    card.className = "order-card p-4 hover-lift rounded-xl border bg-white shadow-sm";
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="flex-1">
          <div class="font-semibold text-gray-800 mb-1">Orden #${p.id}</div>
          <div class="text-sm text-gray-500 flex items-center">
            <i class="fas fa-chair mr-1"></i> Mesa ${p.idMesa ?? "—"} •
            <i class="fas fa-user ml-2 mr-1"></i> ${p.nombreCliente ?? "Cliente"}
          </div>
        </div>
        <div class="flex items-center space-x-3">
          <span class="text-xs px-3 py-1 font-medium rounded-full" style="background-color: ${st.color}; color: white;">
            ${st.label}
          </span>
          <span class="text-lg font-bold text-gray-800">${money(p.totalPedido)}</span>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between text-sm text-gray-500">
        <div class="flex items-center space-x-4">
          <div class="flex items-center">
            <i class="fas fa-utensils mr-1"></i>
            <span>${cantItems} artículos</span>
          </div>
          <div class="flex items-center">
            <i class="fas fa-sticky-note mr-1"></i>
            <span title="${p.observaciones ?? ""}">${clip(p.observaciones ?? "—", 40)}</span>
          </div>
        </div>
        <button class="btn-ver-pedido text-blue-500 hover:text-blue-600 font-medium">Ver detalles</button>
      </div>
    `;
    const btnVer = card.querySelector(".btn-ver-pedido");
    btnVer.addEventListener("click", () => showPedidoModal(p));
    frag.appendChild(card);
  });
  container.appendChild(frag);
}

// === Render RESERVAS ===
function renderReservas(containerSel, page, topN) {
  const container = $(containerSel);
  if (!container) return;
  container.innerHTML = "";
  const items = (page.items ?? []).slice(0, topN);
  if (items.length === 0) {
    container.innerHTML = `<div class="text-gray-500">No hay reservas para mostrar.</div>`;
    return;
  }
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-1 sm:grid-cols-2 gap-4";
  items.forEach(r => {
    const st = MAP_ESTADO_RESERVA[r.idEstadoReserva] ?? {
      label: `Estado ${r.idEstadoReserva}`,
      color: "#6b7280",
      cls: "status-desconocido"
    };
    const card = document.createElement("div");
    card.className = "rounded-xl border border-gray-200 p-5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200";
    card.innerHTML = `
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center flex-1 min-w-0">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
            <i class="fas fa-user text-lg"></i>
          </div>
          <div class="ml-3 flex-1 min-w-0">
            <div class="text-base font-semibold text-gray-800 truncate">${r.nomCliente}</div>
            <div class="text-sm text-gray-500">${r.telefono ?? "Sin teléfono"}</div>
          </div>
        </div>
        <span class="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap ml-2 flex-shrink-0" style="background-color: ${st.color}; color: white;">
          ${st.label}
        </span>
      </div>
      <div class="space-y-2.5 mb-4">
        <div class="flex items-center text-sm">
          <i class="fas fa-calendar text-gray-400 w-5"></i>
          <span class="text-gray-500 ml-2">Fecha:</span>
          <span class="text-gray-800 font-medium ml-auto">${r.fReserva || r.freserva || "—"}</span>
        </div>
        <div class="flex items-center text-sm">
          <i class="fas fa-clock text-gray-400 w-5"></i>
          <span class="text-gray-500 ml-2">Horario:</span>
          <span class="text-gray-800 font-medium ml-auto">${r.horaI ?? "—"} - ${r.horaF ?? "—"}</span>
        </div>
        <div class="flex items-center text-sm">
          <i class="fas fa-chair text-gray-400 w-5"></i>
          <span class="text-gray-500 ml-2">Mesa:</span>
          <span class="text-gray-800 font-medium ml-auto">${r.idMesa ?? "—"}</span>
        </div>
        <div class="flex items-center text-sm">
          <i class="fas fa-users text-gray-400 w-5"></i>
          <span class="text-gray-500 ml-2">Personas:</span>
          <span class="text-gray-800 font-medium ml-auto">${r.cantidadPersonas ?? "—"}</span>
        </div>
      </div>
      <div class="pt-3 border-t border-gray-100">
        <button class="btn-ver-reserva w-full text-blue-500 hover:text-blue-600 hover:bg-blue-50 font-medium text-sm py-2 rounded-lg transition-colors duration-200">
          Ver detalles
        </button>
      </div>
    `;
    const btnVer = card.querySelector(".btn-ver-reserva");
    btnVer.addEventListener("click", () => showReservaModal(r));
    grid.appendChild(card);
  });
  container.appendChild(grid);
}

// === Controlador principal ===
const DashboardController = (() => {
  let cfg = { ...DEFAULTS };
  let refreshTimer = null;
  let inFlightController = null;

  async function loadOnce() {
    if (cfg.useAbortOnRefresh)
      {
      try { inFlightController?.abort(); } catch {}
      inFlightController = new AbortController();
    }

    try {
      setText(cfg.selectors.cardMesasCount, "…");
      setText(cfg.selectors.cardPedidosCount, "…");
      setText(cfg.selectors.cardReservasCount, "…");

      const { mesas, pedidos, reservas, estadosMesa, estadosPedido, estadosReserva } = await Service.fetchAll({
        signal: inFlightController?.signal
      });

      buildMapEstadosMesa(estadosMesa);
      buildMapEstadosPedido(estadosPedido);
      buildMapEstadosReserva(estadosReserva);

      setText(cfg.selectors.cardMesasCount,    nf(mesas.total));
      setText(cfg.selectors.cardPedidosCount,  nf(pedidos.total));
      setText(cfg.selectors.cardReservasCount, nf(reservas.total));

      renderMesas(cfg.selectors.listMesas,       mesas,    cfg.topN);
      renderPedidos(cfg.selectors.listPedidos,   pedidos,  cfg.topN);
      renderReservas(cfg.selectors.listReservas, reservas, cfg.topN);

    } catch (err) {
      console.error("[DashboardController] Error:", err);
      showToast(cfg.selectors.toast, `Error al cargar datos: ${err.message}`);
    }
  }

  function startAutoRefresh() {
    if (!cfg.autoRefreshMs || cfg.autoRefreshMs <= 0) return;
    stopAutoRefresh();
    refreshTimer = setInterval(loadOnce, cfg.autoRefreshMs);
  }

  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  return {
    async init(options = {}) {
      cfg = { ...DEFAULTS, ...options, selectors: { ...DEFAULTS.selectors, ...(options.selectors || {}) } };

      setupUserHeader(cfg);
      const user = await loadMeOrRedirect();
      if (user) setUserNameEverywhere(guessDisplayName(user), cfg);

      await loadOnce();
      startAutoRefresh();
    },
    async refresh() { await loadOnce(); },
    dispose() {
      stopAutoRefresh();
      try { inFlightController?.abort(); } catch {}
    },
    getConfig() { return cfg; }
  };
})();

export { DashboardController };