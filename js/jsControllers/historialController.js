// js/jsControllers/historialController.js
import {
  getHistorial,
  getPedidoById,
  getEstadosPedido,
  getMeseros,
  getPlatillos,
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

// Paginación
const pageSizeSelect = $("#pageSize");
const paginationBox  = $("#pagination");
const pageInfo       = $("#pageInfo");

/* ====================== catálogos & cache ====================== */
let MAP_ESTADOS   = new Map(); // idEstado -> nombre
let MAP_MESEROS   = new Map(); // idEmpleado -> nombre
let MAP_PLATILLOS = new Map(); // idPlatillo -> nombre

const PEDIDO_CACHE = new Map(); // idPedido -> PedidoDTO

/* ====================== datos ====================== */
let PAGE = { number: 0, size: 20, totalPages: 0, totalElements: 0 };
let HISTORIAL = []; // [{Id, IdPedido, IdFactura}]

/* ====================== init ====================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [estados, meseros, plats] = await Promise.all([
      getEstadosPedido(),
      getMeseros(),
      getPlatillos(),
    ]);
    MAP_ESTADOS   = estados;
    MAP_MESEROS   = meseros;
    MAP_PLATILLOS = plats;

    fillWaiterFilter(MAP_MESEROS);
    fillStatusFilter(MAP_ESTADOS);

    // 1) Hacemos una carga rápida para conocer totalPages
    await cargarHistorial(0, Number(pageSizeSelect?.value || 20), {silent:true});

    // 2) Vamos DIRECTO a la última página (lo más reciente)
    const lastPage = Math.max(0, Number(PAGE.totalPages || 1) - 1);
    await cargarHistorial(lastPage, Number(pageSizeSelect?.value || 20));

    // Filtros
    searchInput?.addEventListener("input",  onFiltersChange);
    waiterFilter?.addEventListener("change", onFiltersChange);
    statusFilter?.addEventListener("change", onFiltersChange);

    // Paginación
    pageSizeSelect?.addEventListener("change", async () => {
      const size = Number(pageSizeSelect.value || 20);
      // recargar para conocer nuevo total y saltar al final
      await cargarHistorial(0, size, {silent:true});
      const last = Math.max(0, Number(PAGE.totalPages || 1) - 1);
      await cargarHistorial(last, size);
    });

    bindSidebarToggles();
  } catch (e) {
    TBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-8 text-center text-red-600">
          Error al cargar historial: ${e?.message || e}
        </td>
      </tr>`;
    console.error(e);
  }
}

async function cargarHistorial(page = 0, size = 20, opts = {}) {
  if (!opts?.silent) {
    TBody.innerHTML = `
      <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Cargando…</td></tr>`;
  }

  const resp = await getHistorial(page, size);
  PAGE.number        = Number(resp?.number || 0);
  PAGE.size          = Number(resp?.size || size);
  PAGE.totalPages    = Number(resp?.totalPages || 1);
  PAGE.totalElements = Number(resp?.totalElements || 0);

  HISTORIAL = Array.isArray(resp?.content) ? resp.content : [];

  // Pre-hidratar pedidos
  const ids = HISTORIAL.map(h => Number(h.IdPedido ?? h.idPedido ?? h.idpedido)).filter(Boolean);
  await Promise.all(ids.map(async (id) => {
    if (!PEDIDO_CACHE.has(id)) {
      try { PEDIDO_CACHE.set(id, await getPedidoById(id)); } catch { /* ignore */ }
    }
  }));

  render();
}

function render() {
  const filtered = applyFilters(HISTORIAL);
  renderTabla(filtered);
  renderPagination();
  renderPageInfo();
}

function onFiltersChange() {
  render();
}

/* ====================== filtros ====================== */
function nombreEstado(idEstado) {
  return MAP_ESTADOS.get(Number(idEstado)) || "—";
}
function nombreMesero(idEmpleado) {
  return MAP_MESEROS.get(Number(idEmpleado)) || null;
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

function applyFilters(arr) {
  const q      = (searchInput?.value || "").trim().toLowerCase();
  const waiter = waiterFilter?.value || "";
  const estado = statusFilter?.value || "";

  // Orden "último -> primero" por IdHistorial (desc) y fallback por IdPedido (desc)
  const ord = [...(arr || [])].sort((a, b) => {
    const aIdH = Number(a.Id ?? a.id ?? a.ID);
    const bIdH = Number(b.Id ?? b.id ?? b.ID);
    const aKey = Number.isFinite(aIdH) ? aIdH : Number(a.IdPedido ?? a.idPedido ?? a.idpedido);
    const bKey = Number.isFinite(bIdH) ? bIdH : Number(b.IdPedido ?? b.idPedido ?? b.idpedido);
    return (bKey || 0) - (aKey || 0);
  });

  return ord.filter((h) => {
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

/* ====================== UI: filtros (combos) ====================== */
function fillWaiterFilter(mapMeseros) {
  if (!waiterFilter) return;
  const opts = ['<option value="">Todos los meseros</option>'];
  const pairs = Array.from(mapMeseros.entries())
    .map(([idEmp, nombre]) => ({ idEmp, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
  for (const { idEmp, nombre } of pairs) {
    opts.push(`<option value="${idEmp}">${nombre}</option>`);
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
    const cliente   = String(p.nombreCliente ?? p.nombrecliente ?? p.cliente ?? "") || "—";
    const idMesa    = p.idMesa ?? p.IdMesa ?? p.mesaId ?? "—";
    const estadoNom = nombreEstado(p.idEstadoPedido ?? p.IdEstadoPedido);
    const estadoCss = badgeEstado(estadoNom);
    const meseroNom = nombreMesero(p.idEmpleado ?? p.IdEmpleado) || "—";

    return `
      <tr class="hover:bg-gray-50 transition" data-idpedido="${idPedido}">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${fmtId(idHist, "HIST-")}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">#${idPedido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${meseroNom}</td>
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

function cerrarModal() { modal.classList.add("hidden"); }

function findHistIdForPedido(idPedido) {
  const h = (HISTORIAL || []).find(x =>
    Number(x.IdPedido ?? x.idPedido ?? x.idpedido) === Number(idPedido)
  );
  return h ? Number(h.Id ?? h.id ?? h.ID) : null;
}

async function abrirModalDetalles(idPedido) {
  try {
    let data = PEDIDO_CACHE.get(idPedido);
    if (!data) {
      data = await getPedidoById(idPedido);
      PEDIDO_CACHE.set(idPedido, data);
    }

    const cliente   = String(data.nombreCliente ?? data.cliente ?? "—");
    const idMesa    = data.idMesa ?? data.mesaId ?? "—";
    const estadoNom = nombreEstado(data.idEstadoPedido ?? data.IdEstadoPedido);
    const meseroNom = nombreMesero(data.idEmpleado ?? data.IdEmpleado) || "—";

    const idHist = findHistIdForPedido(idPedido);

    $("#det-title").textContent   = `#${idPedido}`;
    $("#det-hist").textContent    = idHist != null ? fmtId(idHist, "HIST-") : "—";
    $("#det-cliente").textContent = cliente;
    $("#det-mesero").textContent  = meseroNom;
    $("#det-mesa").textContent    = idMesa;
    $("#det-estado").textContent  = estadoNom;

    const tbody = $("#det-items");
    const items = Array.isArray(data.items) ? data.items : [];

    let subtotalCalc = 0;
    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-4 py-3 text-sm text-gray-500">(Sin platillos)</td>
        </tr>`;
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

    const sub = Number(data.subtotal ?? data.Subtotal);
    const tip = Number(data.propina  ?? data.Propina);
    const tot = Number(data.totalPedido ?? data.TotalPedido);

    const subtotal = Number.isFinite(sub) ? sub : subtotalCalc;
    const propina  = Number.isFinite(tip) ? tip : +(subtotal * 0.10).toFixed(2);
    const total    = Number.isFinite(tot) ? tot : +(subtotal + propina).toFixed(2);

    $("#det-sub").textContent   = money(subtotal);
    $("#det-tip").textContent   = money(propina);
    $("#det-total").textContent = money(total);

    modal.classList.remove("hidden");
  } catch (e) {
    alert(e?.message || "No se pudo cargar el detalle.");
  }
}

/* ====================== paginación ====================== */
function renderPageInfo() {
  const start = PAGE.totalElements === 0 ? 0 : (PAGE.number * PAGE.size) + 1;
  const end   = Math.min(PAGE.totalElements, (PAGE.number + 1) * PAGE.size);
  pageInfo.textContent = `Mostrando ${start}–${end} de ${PAGE.totalElements}`;
}

function renderPagination() {
  const total = PAGE.totalPages || 1;
  const cur   = PAGE.number || 0;

  const btn = (label, disabled, handler, isActive=false) => `
    <button
      class="px-3 py-1.5 rounded-lg border ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}"
      ${disabled ? 'disabled' : ''}
      data-action="${handler}">
      ${label}
    </button>`;

  const parts = [];
  parts.push(btn("« Primero", cur <= 0, "first"));
  parts.push(btn("‹ Anterior", cur <= 0, "prev"));

  // Rango de páginas visible (ventana)
  const windowSize = 5;
  const start = Math.max(0, cur - Math.floor(windowSize/2));
  const end   = Math.min(total - 1, start + windowSize - 1);
  const realStart = Math.max(0, end - windowSize + 1);

  if (realStart > 0) parts.push(`<span class="px-2 text-gray-500">…</span>`);
  for (let i = realStart; i <= end; i++) {
    parts.push(btn(String(i+1), false, `page:${i}`, i === cur));
  }
  if (end < total - 1) parts.push(`<span class="px-2 text-gray-500">…</span>`);

  parts.push(btn("Siguiente ›", cur >= total - 1, "next"));
  parts.push(btn("Último »", cur >= total - 1, "last"));

  paginationBox.innerHTML = parts.join("");

  // Bind
  $$("button[data-action]", paginationBox).forEach(b => {
    const action = b.getAttribute("data-action");
    b.addEventListener("click", async () => {
      if (!action) return;
      const size = Number(pageSizeSelect?.value || 20);
      if (action === "first") return cargarHistorial(0, size);
      if (action === "prev")  return cargarHistorial(Math.max(0, PAGE.number - 1), size);
      if (action === "next")  return cargarHistorial(Math.min(PAGE.totalPages - 1, PAGE.number + 1), size);
      if (action === "last")  return cargarHistorial(Math.max(0, PAGE.totalPages - 1), size);
      if (action.startsWith("page:")) {
        const p = Number(action.split(":")[1]);
        return cargarHistorial(p, size);
      }
    });
  });
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
