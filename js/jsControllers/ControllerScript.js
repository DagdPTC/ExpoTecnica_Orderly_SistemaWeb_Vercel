import { Service } from "../jsService/ServiceScript.js";

const REQUIRE_AUTH = false; // cambia a true cuando quieras forzar login estricto
let IS_AUTH = false;

const API_BASE = (() => {
  const manual = window.__API_BASE_OVERRIDE;
  if (manual) return manual;
  const isLocal = /localhost|127\.0\.0\.1|^file:/i.test(location.origin);
  return isLocal
    ? "https://orderly-api-b53514e40ebd.herokuapp.com"
    : "https://orderly-api-b53514e40ebd.herokuapp.com";
})();
const ME_ENDPOINT = `${API_BASE}/api/auth/me`;
const LOGOUT_ENDPOINT = `${API_BASE}/api/auth/logout`;
const LOGIN_PAGE = "index.html";

// Intenta inyectar la base al Service (si lo soporta)
try {
  if (typeof Service?.setBase === "function") {
    Service.setBase(API_BASE);
  } else if ("BASE" in Service) {
    Service.BASE = API_BASE;
  }
} catch { /* no-op */ }

// === Mapeos dinámicos (se cargan desde el API) ===
let MAP_ESTADO_MESA = {};
let MAP_ESTADO_PEDIDO = {};
let MAP_ESTADO_RESERVA = {};

let currentMesasPage = 0;
let mesasPerPage = 6;
let allMesas = [];

const DEFAULTS = {
  selectors: {
    cardMesasCount: "#cardMesasCount",
    cardPedidosCount: "#cardPedidosCount",
    cardReservasCount: "#cardReservasCount",
    listMesas: "#listMesas",
    listPedidos: "#listPedidos",
    listReservas: "#listReservas",
    mesasPagination: "#mesasPagination",
    toast: "#appToast",
    topUserName: "#topUserName",
    sidebarUserName: "#sidebarUserName",
    userMenuBtn: "#userMenuBtn",
    userMenu: "#userMenu",
    btnLogout: "#btnLogout",
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
const clip = (s, m = 80) => (s && s.length > m ? s.slice(0, m - 1) + "…" : s || "");

function showToast(sel, msg) {
  const el = $(sel);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden", "opacity-0");
  el.classList.add("opacity-100");
  setTimeout(() => {
    el.classList.add("opacity-0");
    setTimeout(() => el.classList.add("hidden"), 300);
  }, 3500);
}

// ========== Usuario (me + menú + logout) ==========

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

async function loadMeSoft() {
  try {
    const res = await fetch(ME_ENDPOINT, { credentials: "include" });
    if (REQUIRE_AUTH && res.status === 401) {
      window.location.href = LOGIN_PAGE;
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return data.user || data.usuario || data;
  } catch (e) {
    console.error("ME error:", e);
    return null;
  }
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
    try { localStorage.clear(); } catch { }
    try { sessionStorage.clear(); } catch { }
    window.location.href = LOGIN_PAGE;
  }
}

function setupUserHeader(cfg) {
  const btn = $(cfg.selectors.userMenuBtn);
  const menu = $(cfg.selectors.userMenu);
  if (btn && menu) {
    const toggle = () => menu.classList.toggle("hidden");
    const hide = () => menu.classList.add("hidden");

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

// === Mapas de estados ===
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
  MAP_ESTADO_PEDIDO = {};
  if (!estados || !Array.isArray(estados.items)) return;
  estados.items.forEach(e => {
    MAP_ESTADO_PEDIDO[e.id] = {
      label: e.nomEstado || `Estado ${e.id}`,
      color: e.colorEstadoPedido || '#6b7280'
    };
  });
}

function buildMapEstadosReserva(estados) {
  MAP_ESTADO_RESERVA = {};
  if (!estados || !Array.isArray(estados.items)) return;
  estados.items.forEach(e => {
    MAP_ESTADO_RESERVA[e.id] = {
      label: e.nomEstado || `Estado ${e.id}`,
      color: e.colorEstadoReserva || '#6b7280'
    };
  });
}

// === Paginación y render de Mesas ===
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
        <button class="btn-prev-mesas px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50" ${currentMesasPage === 0 ? 'disabled' : ''}>
          <i class="fas fa-chevron-left"></i>
        </button>
        <div class="flex items-center space-x-1">
          ${Array.from({ length: totalPages }, (_, i) => `
            <button class="btn-page-mesas px-3 py-2 rounded-lg text-sm ${i === currentMesasPage ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}" data-page="${i}">
              ${i + 1}
            </button>
          `).join('')}
        </div>
        <button class="btn-next-mesas px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50" ${currentMesasPage === totalPages - 1 ? 'disabled' : ''}>
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

// === Nuevo diseño de tarjetas de mesas ===
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
  grid.className = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  mesasToShow.forEach(m => {
    const st = MAP_ESTADO_MESA[m.idEstadoMesa] ?? {
      label: `Estado ${m.idEstadoMesa}`,
      color: "#6b7280"
    };

    const card = document.createElement("div");
    card.className = `
      relative flex flex-col items-center justify-center text-center
      rounded-2xl shadow-md hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300
      cursor-pointer border-t-4
    `;
    card.style.backgroundColor = st.color + "15";
    card.style.borderColor = st.color;

    card.innerHTML = `
      <div class="absolute top-2 left-3 text-xs font-medium text-gray-500">#${m.id}</div>
      <div class="flex flex-col items-center justify-center h-32 w-full">
        <h3 class="text-lg font-bold text-gray-800">${m.nomMesa || "Mesa"}</h3>
        <span class="mt-2 px-3 py-1 text-sm font-semibold rounded-full shadow-sm"
              style="background-color: ${st.color}; color: white;">
          ${st.label}
        </span>
      </div>
    `;

    card.addEventListener("mouseenter", () => (card.style.scale = "1.03"));
    card.addEventListener("mouseleave", () => (card.style.scale = "1"));

    grid.appendChild(card);
  });

  container.appendChild(grid);
  renderMesasPagination(DEFAULTS.selectors.mesasPagination);
}

// === Render principal de Mesas ===
function renderMesas(containerSel, page, topN) {
  allMesas = page.items ?? [];
  currentMesasPage = 0;
  mesasPerPage = topN;
  renderMesasPage();
}

// === Render de Pedidos ===
function renderPedidos(containerSel, page, topN) {
  const container = document.querySelector(containerSel);
  if (!container) return;
  container.innerHTML = "";

  const items = (page && Array.isArray(page.items) ? page.items : []).slice(0, topN);

  if (items.length === 0) {
    container.innerHTML = `<div class="text-gray-500">No hay pedidos para mostrar.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();

  items.forEach((p) => {
    const st = MAP_ESTADO_PEDIDO[p.idEstadoPedido] ?? {
      label: `Estado ${p.idEstadoPedido}`,
      color: "#6b7280",
    };

    const cantItems = Array.isArray(p.items)
      ? p.items.reduce((a, it) => a + (Number(it.cantidad) || 0), 0)
      : 0;

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
      </div>
    `;
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

// === Render de Reservas ===
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
    `;
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
    if (cfg.useAbortOnRefresh) {
      try { inFlightController?.abort(); } catch {}
      inFlightController = new AbortController();
    }

    try {
      // placeholders mientras carga
      setText(cfg.selectors.cardMesasCount, "…");
      setText(cfg.selectors.cardPedidosCount, "…");
      setText(cfg.selectors.cardReservasCount, "…");

      // pedir todo del servicio
      const { mesas, pedidos, reservas, estadosMesa, estadosPedido, estadosReserva } =
        await Service.fetchAll({ signal: inFlightController?.signal });

      // construir mapeos
      buildMapEstadosMesa(estadosMesa);
      buildMapEstadosPedido(estadosPedido);
      buildMapEstadosReserva(estadosReserva);

      // contadores
      setText(cfg.selectors.cardMesasCount, nf(mesas.total));
      setText(cfg.selectors.cardPedidosCount, pedidos.total > 0 ? nf(pedidos.total) : "—");
      setText(cfg.selectors.cardReservasCount, nf(reservas.total));

      // renders
      renderMesas(cfg.selectors.listMesas, mesas, cfg.topN);
      renderPedidos(cfg.selectors.listPedidos, pedidos, cfg.topN);
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
      const user = await loadMeSoft();
      IS_AUTH = !!user;
      setUserNameEverywhere(guessDisplayName(user || {}), cfg);

      await loadOnce();
      startAutoRefresh();
    },

    async refresh() { await loadOnce(); },
    dispose() {
      stopAutoRefresh();
      try { inFlightController?.abort(); } catch { }
    },
    getConfig() { return cfg; }
  };
})();

export { DashboardController };
