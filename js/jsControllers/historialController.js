// js/jsControllers/historialController.js
import {
  getHistorial,
  getPedidoById,
  getEstadosPedido,
  getEmpleadosMap,
  getPlatillosMap,
  getAuthToken
} from "../jsService/historialService.js";

/* ====================== helpers ====================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtId = (num, pfx="HIST-") => `${pfx}${String(Number(num||0)).padStart(4,"0")}`;

/* ====================== refs ====================== */
const TBody        = $("#historial-tbody");
const searchInput  = $("#searchInput");
const waiterFilter = $("#waiterFilter");
const statusFilter = $("#statusFilter");
const pageSizeSel  = $("#pageSize");
const paginator    = $("#paginator");
const authWarning  = $("#authWarning");

// Admin / user
const adminBtn        = $("#adminBtn");
const topUserName     = $("#topUserName");
const sidebarUserName = $("#sidebarUserName");

/* ====================== catálogos & cache ====================== */
let MAP_ESTADOS     = new Map(); // idEstado -> nombre
let MAP_EMP_BY_ID   = new Map(); // idEmpleado -> nombre/username
let MAP_PLATILLOS   = new Map(); // idPlatillo -> nombre
const PEDIDO_CACHE  = new Map(); // idPedido -> PedidoDTO

/* ====================== datos ====================== */
let PAGE = { number: 0, size: 10, totalPages: 0, totalElements: 0 };
let HISTORIAL = []; // [{Id, IdPedido, IdFactura}]
let CURRENT_PAGE = 0;

/* ====================== init ====================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    bindSidebarToggles();
    bindAdminMenu();

    // Cargar catálogos primero
    const [estados, empleados, plats] = await Promise.all([
      getEstadosPedido(),
      getEmpleadosMap(),
      getPlatillosMap(),
    ]);
    MAP_ESTADOS   = estados;
    MAP_EMP_BY_ID = empleados;
    MAP_PLATILLOS = plats;

    fillWaiterFilter(MAP_EMP_BY_ID);
    fillStatusFilter(MAP_ESTADOS);

    // Filtros / paginación
    searchInput?.addEventListener("input",  onFiltersChange);
    waiterFilter?.addEventListener("change", onFiltersChange);
    statusFilter?.addEventListener("change", onFiltersChange);
    pageSizeSel?.addEventListener("change", async () => {
      PAGE.size = Number(pageSizeSel.value || 10);
      await cargarHistorial(0, PAGE.size, { jumpToLast: true });
    });

    // Primera carga: ir a la última página (de último a primero)
    await cargarHistorial(0, Number(pageSizeSel?.value || 10), { jumpToLast: true });
  } catch (e) {
    if (TBody) {
      TBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-red-600">
            Error al cargar historial: ${e?.message || e}
          </td>
        </tr>`;
    }
    console.error(e);
  }
}

/* ====================== ADMIN menu (siempre visible y encima) ====================== */
function bindAdminMenu() {
  const btn = document.getElementById("adminBtn");
  if (!btn) return;

  // Asegura menú: si existe en HTML lo tomamos, si no, lo creamos
  let menu = document.getElementById("adminMenu");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "adminMenu";
    menu.innerHTML = `
      <div class="px-4 py-2 text-sm text-gray-600" id="userMenuName">Mi cuenta</div>
      <hr class="border-gray-200">
      <button id="logoutBtn" class="block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600">
        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
      </button>`;
  }

  // ⚠️ Reubicar a <body> para evitar stacking/overflow del header
  if (menu.parentElement !== document.body) document.body.appendChild(menu);

  // Estilos base: fixed + zIndex alto
  menu.classList.add("w-48","bg-white","border","rounded-lg","shadow-lg","hidden");
  menu.style.position   = "fixed";
  menu.style.zIndex     = "10000";
  menu.style.marginTop  = "0";
  menu.style.pointerEvents = "auto";

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
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) close();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  window.addEventListener("resize", () => { if (!menu.classList.contains("hidden")) place(); });
  window.addEventListener("scroll", () => { if (!menu.classList.contains("hidden")) place(); }, { passive: true });

  // Logout
  let logoutBtn = menu.querySelector("#logoutBtn");
  if (!logoutBtn) {
    logoutBtn = document.createElement("button");
    logoutBtn.id = "logoutBtn";
    logoutBtn.className = "block w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600";
    logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión`;
    menu.appendChild(logoutBtn);
  }
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
        window.location.href = "inicioSesion.html";
      }
    });
  }

  // Nombre mostrado
  const t = getAuthToken?.();
  const name = t ? "Usuario" : "Invitado";
  const userMenuName = document.getElementById("userMenuName");
  if (topUserName) topUserName.textContent = name;
  if (sidebarUserName) sidebarUserName.textContent = name;
  if (userMenuName) userMenuName.textContent = "Mi cuenta";
}

/* ====================== cargar & paginar ====================== */
async function cargarHistorial(page = 0, size = 10, opts = {}) {
  if (TBody) {
    TBody.innerHTML = `
      <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Cargando…</td></tr>`;
  }

  try {
    let resp = await getHistorial(page, size);

    // Saltar a la última página si se pidió
    if (opts?.jumpToLast && resp?.totalPages > 0 && page !== resp.totalPages - 1) {
      CURRENT_PAGE = resp.totalPages - 1;
      resp = await getHistorial(CURRENT_PAGE, size);
    } else {
      CURRENT_PAGE = Number(resp?.number || 0);
    }

    PAGE.number        = Number(resp?.number || 0);
    PAGE.size          = Number(resp?.size || size);
    PAGE.totalPages    = Number(resp?.totalPages || 1);
    PAGE.totalElements = Number(resp?.totalElements || 0);

    // Datos (invertimos la página para “recientes arriba”)
    HISTORIAL = Array.isArray(resp?.content) ? resp.content.slice().reverse() : [];

    // Pre-hidratar pedidos en caché
    const ids = HISTORIAL.map(h => Number(h.IdPedido ?? h.idPedido ?? h.idpedido)).filter(Boolean);
    await Promise.all(ids.map(async (id) => {
      if (!PEDIDO_CACHE.has(id)) {
        try { PEDIDO_CACHE.set(id, await getPedidoById(id)); } catch { /* ignore */ }
      }
    }));

    renderTabla(applyFilters(HISTORIAL));
    renderPaginator();
    authWarning?.classList.add("hidden");
  } catch (e) {
    if (e?.status === 401) {
      if (authWarning) {
        authWarning.innerHTML = `
          <div class="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            ${e.message}.
            <a href="inicioSesion.html" class="underline font-medium ml-1">Iniciar sesión</a>
          </div>`;
        authWarning.classList.remove("hidden");
      }
    }
    if (TBody) {
      TBody.innerHTML = `
        <tr>
          <td colspan="7" class="px-6 py-8 text-center text-red-600">
            ${e?.message || "No se pudo cargar el historial."}
          </td>
        </tr>`;
    }
    console.error(e);
  }
}

function renderPaginator() {
  if (!paginator) return;
  const total = PAGE.totalPages || 1;
  const cur   = CURRENT_PAGE;

  const pages = Array.from({ length: total }, (_, i) => i);

  paginator.innerHTML = `
    <div class="text-sm text-gray-600">
      Página ${cur + 1} de ${total} • ${PAGE.totalElements} registros
    </div>
    <div class="flex items-center space-x-2">
      <button id="pgPrev" class="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 ${cur===0?"opacity-50 cursor-not-allowed":""}">
        <i class="fas fa-chevron-left"></i>
      </button>
      <div class="flex items-center space-x-1">
        ${pages.map(i => `
          <button class="pg-btn px-3 py-2 rounded-lg text-sm ${i===cur ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}" data-page="${i}">
            ${i+1}
          </button>
        `).join("")}
      </div>
      <button id="pgNext" class="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 ${cur===total-1?"opacity-50 cursor-not-allowed":""}">
        <i class="fas fa-chevron-right"></i>
      </button>
    </div>
  `;

  $("#pgPrev")?.addEventListener("click", async () => {
    if (CURRENT_PAGE > 0) await cargarHistorial(CURRENT_PAGE - 1, PAGE.size);
  });
  $("#pgNext")?.addEventListener("click", async () => {
    if (CURRENT_PAGE < total - 1) await cargarHistorial(CURRENT_PAGE + 1, PAGE.size);
  });
  $$(".pg-btn", paginator).forEach(btn => {
    btn.addEventListener("click", async () => {
      const p = Number(btn.dataset.page);
      await cargarHistorial(p, PAGE.size);
    });
  });
}

/* ====================== filtros ====================== */
function nombreEstado(idEstado) {
  return MAP_ESTADOS.get(Number(idEstado)) || "—";
}
function nombreMesero(idEmpleado) {
  return MAP_EMP_BY_ID.get(Number(idEmpleado)) || "—";
}
function badgeEstado(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("pend")) return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
  if (n.includes("prep") || n.includes("proces")) return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (n.includes("entreg")) return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (n.includes("pag"))   return "bg-green-100 text-green-800 ring-1 ring-green-200";
  if (n.includes("cancel") || n.includes("anul")) return "bg-red-100 text-red-800 ring-1 ring-red-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
}

function onFiltersChange() {
  renderTabla(applyFilters(HISTORIAL));
}

function applyFilters(arr) {
  const q      = (searchInput?.value || "").trim().toLowerCase();
  const waiter = waiterFilter?.value || "";
  const estado = statusFilter?.value || "";

  return (arr || []).filter((h) => {
    const idHist   = Number(h.Id ?? h.id ?? h.ID);
    const idPedido = Number(h.IdPedido ?? h.idPedido ?? h.idpedido);
    const p = PEDIDO_CACHE.get(idPedido) || {};

    const cliente = (p.nombreCliente ?? p.nombrecliente ?? p.cliente ?? "")
      .toString().toLowerCase();

    if (q) {
      const hay =
        String(idHist || "").toLowerCase().includes(q) ||
        String(idPedido || "").toLowerCase().includes(q) ||
        cliente.includes(q);
      if (!hay) return false;
    }

    if (waiter && String(waiter) !== String(p.idEmpleado ?? p.IdEmpleado)) return false;
    if (estado && String(estado) !== String(p.idEstadoPedido ?? p.IdEstadoPedido)) return false;

    return true;
  });
}

/* ====================== UI: combos ====================== */
function fillWaiterFilter(mapUsers) {
  if (!waiterFilter) return;
  const opts = ['<option value="">Todos los meseros</option>'];
  const pairs = Array.from(mapUsers.entries())
    .map(([idEmp, username]) => ({ idEmp, username }))
    .sort((a, b) => a.username.localeCompare(b.username, "es", { sensitivity: "base" }));
  for (const { idEmp, username } of pairs) {
    opts.push(`<option value="${idEmp}">${username}</option>`);
  }
  waiterFilter.innerHTML = opts.join("");
}
function fillStatusFilter(mapEstados) {
  if (!statusFilter) return;
  const opts = ['<option value="">Todos los estados</option>'];
  const entries = Array.from(mapEstados.entries()).sort((a, b) => a[0] - b[0]);
  for (const [id, nombre] of entries) {
    opts.push(`<option value="${id}">${nombre}</option>`);
  }
  statusFilter.innerHTML = opts.join("");
}

/* ====================== tabla ====================== */
function renderTabla(lista) {
  if (!TBody) return;

  if (!Array.isArray(lista) || !lista.length) {
    TBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-gray-500">
          No hay resultados.
        </td>
      </tr>`;
    return;
  }

  const rows = lista.map((h) => {
    const idHist   = Number(h.Id ?? h.id ?? h.ID);
    const idPedido = Number(h.IdPedido ?? h.idPedido ?? h.idpedido);

    const p = PEDIDO_CACHE.get(idPedido) || {};
    const cliente    = String(p.nombreCliente ?? p.nombrecliente ?? p.cliente ?? "") || "—";
    const idMesa     = p.idMesa ?? p.IdMesa ?? p.mesaId ?? "—";
    const estadoNom  = nombreEstado(p.idEstadoPedido ?? p.IdEstadoPedido);
    const estadoCss  = badgeEstado(estadoNom);
    const meseroUser = nombreMesero(p.idEmpleado ?? p.IdEmpleado);

    return `
      <tr class="hover:bg-gray-50 transition" data-idpedido="${idPedido}">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${fmtId(idHist, "HIST-")}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">#${idPedido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${meseroUser}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${idMesa ?? "—"}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoCss}">
            ${estadoNom}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="btn-detalles px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  data-id="${idPedido}">
            Ver
          </button>
        </td>
      </tr>
    `;
  }).join("");

  TBody.innerHTML = rows;

  $$(".btn-detalles", TBody).forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = Number(btn.getAttribute("data-id"));
      abrirModalDetalles(id);
    });
  });
}

/* ====================== modal detalles ====================== */
const modal    = $("#detalles-modal");
const btnClose = $("#det-cerrar");
btnClose?.addEventListener("click", cerrarModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });

function cerrarModal() { modal?.classList.add("hidden"); }

async function abrirModalDetalles(idPedido) {
  try {
    let data = PEDIDO_CACHE.get(idPedido);
    if (!data) {
      data = await getPedidoById(idPedido);
      PEDIDO_CACHE.set(idPedido, data);
    }

    const cliente    = String(data.nombreCliente ?? data.cliente ?? "—");
    const idMesa     = data.idMesa ?? data.mesaId ?? "—";
    const estadoNom  = nombreEstado(data.idEstadoPedido ?? data.IdEstadoPedido);
    const meseroUser = nombreMesero(data.idEmpleado ?? data.IdEmpleado);

    // Buscar el IdHist asociado
    const h = (HISTORIAL || []).find(x => Number(x.IdPedido ?? x.idPedido ?? x.idpedido) === Number(idPedido));
    const idHist = h ? Number(h.Id ?? h.id ?? h.ID) : null;

    // Cabecera
    $("#det-title").textContent   = `#${idPedido}`;
    $("#det-hist").textContent    = idHist ? fmtId(idHist, "HIST-") : "—";
    $("#det-cliente").textContent = cliente;
    $("#det-mesero").textContent  = meseroUser;
    $("#det-mesa").textContent    = idMesa;
    $("#det-estado").textContent  = estadoNom;

    // Items
    const tbody = $("#det-items");
    const items = Array.isArray(data.items) ? data.items : [];

    let subtotalCalc = 0;
    if (!items.length) {
      tbody.innerHTML = `
        <tr><td colspan="3" class="px-4 py-3 text-sm text-gray-500">(Sin platillos)</td></tr>`;
    } else {
      tbody.innerHTML = items.map(it => {
        const idPlat = Number(it.idPlatillo ?? it.IdPlatillo ?? it.id ?? it.Id);
        const qty    = Number(it.cantidad ?? it.Cantidad ?? 1);
        const pu     = Number(it.precioUnitario ?? it.PrecioUnitario ?? 0);
        const nombre = MAP_PLATILLOS.get(idPlat) || `Platillo #${idPlat}`;
        subtotalCalc += pu * qty;
        return `
          <tr class="border-t">
            <td class="px-4 py-2 text-sm text-gray-800">${nombre}</td>
            <td class="px-4 py-2 text-sm text-right text-gray-700">${qty}</td>
            <td class="px-4 py-2 text-sm text-right text-gray-700">${money(pu)}</td>
          </tr>`;
      }).join("");
    }

    // Totales
    const sub = Number(data.subtotal ?? data.Subtotal);
    const tip = Number(data.propina  ?? data.Propina);
    const tot = Number(data.totalPedido ?? data.TotalPedido);

    const subtotal = Number.isFinite(sub) ? sub : subtotalCalc;
    const propina  = Number.isFinite(tip) ? tip : +(subtotal * 0.10).toFixed(2);
    const total    = Number.isFinite(tot) ? tot : +(subtotal + propina).toFixed(2);

    $("#det-sub").textContent   = money(subtotal);
    $("#det-tip").textContent   = money(propina);
    $("#det-total").textContent = money(total);

    modal?.classList.remove("hidden");
  } catch (e) {
    alert(e?.message || "No se pudo cargar el detalle.");
  }
}

/* ====================== miscelánea (sidebar) ====================== */
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
