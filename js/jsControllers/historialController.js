// js/jsControllers/historialController.js
import {
  getHistorial,
  getPedidoById,
  getEstadosPedido,
  getUsuarios,
  getPlatillos,
} from "../jsService/historialService.js";

/* ====================== helpers ====================== */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const fmtId = (num, pfx="HIST-") => `${pfx}${String(Number(num||0)).padStart(4,"0")}`;
function formatFechaHora(raw) {
  if (!raw) return "—";
  try {
    const d = new Date(String(raw).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(raw);
  }
}

/* ====================== refs ====================== */
const TBody        = $("#historial-tbody");
const searchInput  = $("#searchInput");
const waiterFilter = $("#waiterFilter");
const dateFilter   = $("#dateFilter");
const statusFilter = $("#statusFilter");

/* ====================== catálogos & cache ====================== */
let MAP_ESTADOS     = new Map(); // idEstado -> nombre
let MAP_USER_BY_EMP = new Map(); // idEmpleado -> username
let MAP_PLATILLOS   = new Map(); // idPlatillo -> nombre

const PEDIDO_CACHE  = new Map(); // idPedido -> PedidoDTO

/* ====================== datos ====================== */
let PAGE = { number: 0, size: 20, totalPages: 0, totalElements: 0 };
let HISTORIAL = []; // [{Id, IdPedido, IdFactura}]

/* ====================== init ====================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    // Cargar catálogos primero
    const [estados, usuarios, plats] = await Promise.all([
      getEstadosPedido(),
      getUsuarios(),
      getPlatillos(),
    ]);
    MAP_ESTADOS     = estados;
    MAP_USER_BY_EMP = usuarios;
    MAP_PLATILLOS   = plats;

    fillWaiterFilter(MAP_USER_BY_EMP);
    fillStatusFilter(MAP_ESTADOS);

    // Cargar historial (página 0 con tamaño “alto”, ajusta si quieres)
    await cargarHistorial(0, 20);

    // Filtros
    searchInput?.addEventListener("input",  onFiltersChange);
    waiterFilter?.addEventListener("change", onFiltersChange);
    dateFilter?.addEventListener("change",  onFiltersChange);
    statusFilter?.addEventListener("change",onFiltersChange);

    bindSidebarToggles();
  } catch (e) {
    TBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-8 text-center text-red-600">
          Error al cargar historial: ${e?.message || e}
        </td>
      </tr>`;
    console.error(e);
  }
}

async function cargarHistorial(page = 0, size = 20) {
  TBody.innerHTML = `
    <tr><td colspan="8" class="px-6 py-8 text-center text-gray-500">Cargando…</td></tr>`;

  const resp = await getHistorial(page, size);
  PAGE.number        = Number(resp?.number || 0);
  PAGE.size          = Number(resp?.size || size);
  PAGE.totalPages    = Number(resp?.totalPages || 1);
  PAGE.totalElements = Number(resp?.totalElements || 0);

  HISTORIAL = Array.isArray(resp?.content) ? resp.content : [];

  // Pre-hidratar con sus pedidos (en paralelo, con caché)
  const ids = HISTORIAL.map(h => Number(h.IdPedido ?? h.idPedido ?? h.idpedido)).filter(Boolean);
  await Promise.all(ids.map(async (id) => {
    if (!PEDIDO_CACHE.has(id)) {
      try { PEDIDO_CACHE.set(id, await getPedidoById(id)); } catch { /* ignore */ }
    }
  }));

  renderTabla(applyFilters(HISTORIAL));
}

function onFiltersChange() {
  renderTabla(applyFilters(HISTORIAL));
}

/* ====================== filtros ====================== */
function nombreEstado(idEstado) {
  return MAP_ESTADOS.get(Number(idEstado)) || "—";
}
function usuarioMesero(idEmpleado) {
  return MAP_USER_BY_EMP.get(Number(idEmpleado)) || null;
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
  const fecha  = dateFilter?.value || ""; // yyyy-mm-dd

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

    if (fecha) {
      const raw = p.fpedido ?? p.FPedido ?? p.fechaPedido ?? p.fecha ?? p.Hora ?? "";
      if (!raw) return false;
      const d = new Date(String(raw).replace(" ", "T"));
      if (Number.isNaN(d.getTime())) return false;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const isoDay = `${yyyy}-${mm}-${dd}`;
      if (isoDay !== fecha) return false;
    }

    return true;
  });
}

/* ====================== UI: filtros (combos) ====================== */
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
  if (!Array.isArray(lista) || !lista.length) {
    TBody.innerHTML = `
      <tr>
        <td colspan="8" class="px-6 py-8 text-center text-gray-500">
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
    const fecha      = formatFechaHora(p.fpedido ?? p.FPedido ?? p.fechaPedido ?? p.fecha ?? p.Hora ?? "");
    const estadoNom  = nombreEstado(p.idEstadoPedido ?? p.IdEstadoPedido);
    const estadoCss  = badgeEstado(estadoNom);
    const meseroUser = usuarioMesero(p.idEmpleado ?? p.IdEmpleado) || "—";

    return `
      <tr class="hover:bg-gray-50 transition" data-idpedido="${idPedido}">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${fmtId(idHist, "HIST-")}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">#${idPedido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${meseroUser}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${idMesa ?? "—"}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${fecha}</td>
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

async function abrirModalDetalles(idPedido) {
  try {
    let data = PEDIDO_CACHE.get(idPedido);
    if (!data) {
      data = await getPedidoById(idPedido);
      PEDIDO_CACHE.set(idPedido, data);
    }

    const cliente    = String(data.nombreCliente ?? data.cliente ?? "—");
    const idMesa     = data.idMesa ?? data.mesaId ?? "—";
    const fecha      = formatFechaHora(data.fpedido ?? data.FPedido ?? data.fechaPedido ?? data.fecha ?? data.Hora ?? "");
    const estadoNom  = nombreEstado(data.idEstadoPedido ?? data.IdEstadoPedido);
    const meseroUser = usuarioMesero(data.idEmpleado ?? data.IdEmpleado) || "—";

    // Cabecera
    $("#det-title").textContent   = `#${idPedido}`;
    $("#det-hist").textContent    = "—"; // (si quisieras, puedes buscar el idHist asociado)
    $("#det-cliente").textContent = cliente;
    $("#det-mesero").textContent  = meseroUser;
    $("#det-mesa").textContent    = idMesa;
    $("#det-fecha").textContent   = fecha;
    $("#det-estado").textContent  = estadoNom;

    // Items
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

    // Totales (fallback si no vienen)
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
