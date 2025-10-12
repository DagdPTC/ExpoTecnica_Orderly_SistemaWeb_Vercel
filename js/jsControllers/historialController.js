// js/jsControllers/historialController.js
import {
  getHistorial,
  getPedidoById,
  getEstadosPedido,
  getEmpleadosMap,
  getPlatillos,        // <- ahora sí existe en el service
  setEstadoPedido,
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

/* ====================== catálogos & cache ====================== */
let MAP_ESTADOS     = new Map(); // idEstado -> nombre
let MAP_EMPLEADOS   = new Map(); // idEmpleado -> nombre
let MAP_PLATILLOS   = new Map(); // idPlatillo -> nombre

const PEDIDO_CACHE  = new Map(); // idPedido -> PedidoDTO

/* ====================== datos ====================== */
let PAGE = { number: 0, size: 20, totalPages: 0, totalElements: 0 };
let HISTORIAL = []; // [{Id, IdPedido, IdFactura}]

/* ====================== init ====================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [estados, empleados, plats] = await Promise.all([
      getEstadosPedido(),
      getEmpleadosMap(),
      getPlatillos(),
    ]);
    MAP_ESTADOS   = estados;
    MAP_EMPLEADOS = empleados;
    MAP_PLATILLOS = plats;

    fillWaiterFilter(MAP_EMPLEADOS);
    fillStatusFilter(MAP_ESTADOS);

    await cargarHistorial(0, 20);

    searchInput?.addEventListener("input",  onFiltersChange);
    waiterFilter?.addEventListener("change", onFiltersChange);
    statusFilter?.addEventListener("change",onFiltersChange);

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

async function cargarHistorial(page = 0, size = 20) {
  TBody.innerHTML = `
    <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">Cargando…</td></tr>`;

  const resp = await getHistorial(page, size);
  PAGE.number        = Number(resp?.number || 0);
  PAGE.size          = Number(resp?.size || size);
  PAGE.totalPages    = Number(resp?.totalPages || 1);
  PAGE.totalElements = Number(resp?.totalElements || 0);

  HISTORIAL = Array.isArray(resp?.content) ? resp.content : [];

  const ids = HISTORIAL.map(h => Number(h.IdPedido ?? h.idPedido ?? h.idpedido)).filter(Boolean);
  await Promise.all(ids.map(async (id) => {
    if (!PEDIDO_CACHE.has(id)) {
      try { PEDIDO_CACHE.set(id, await getPedidoById(id)); } catch { /* ignore */ }
    }
  }));

  renderTabla(applyFilters(HISTORIAL));
}

function onFiltersChange() { renderTabla(applyFilters(HISTORIAL)); }

/* ====================== filtros ====================== */
function nombreEstado(idEstado)   { return MAP_ESTADOS.get(Number(idEstado)) || "—"; }
function nombreEmpleado(idEmp)    { return MAP_EMPLEADOS.get(Number(idEmp)) || "—"; }

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
function badgeEstadoCss(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("pend")) return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
  if (n.includes("prep") || n.includes("proces")) return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (n.includes("entreg")) return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (n.includes("pag"))   return "bg-green-100 text-green-800 ring-1 ring-green-200";
  if (n.includes("cancel") || n.includes("anul")) return "bg-red-100 text-red-800 ring-1 ring-red-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
}

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
    const cliente    = String(p.nombreCliente ?? p.nombrecliente ?? p.cliente ?? "") || "—";
    const idMesa     = p.idMesa ?? p.IdMesa ?? p.mesaId ?? "—";
    const estadoId   = Number(p.idEstadoPedido ?? p.IdEstadoPedido);
    const estadoNom  = nombreEstado(estadoId);
    const estadoCss  = badgeEstadoCss(estadoNom);
    const meseroNom  = nombreEmpleado(p.idEmpleado ?? p.IdEmpleado);

    return `
      <tr class="hover:bg-gray-50 transition" data-idpedido="${idPedido}">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${fmtId(idHist, "HIST-")}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">#${idPedido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${meseroNom}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${idMesa ?? "—"}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="btn-estado inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoCss}"
                  data-id="${idPedido}" data-estado="${estadoId}" title="Cambiar estado">
            ${estadoNom}
          </button>
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

  $$(".btn-estado", TBody).forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const id = Number(btn.dataset.id);
      const current = Number(btn.dataset.estado);
      openEstadoSelector(btn, id, current);
    });
  });
}

/* ====================== cambio de estado (selector flotante) ====================== */
function openEstadoSelector(anchorEl, idPedido, currentEstado) {
  const wrapper = document.createElement("div");
  wrapper.className = "absolute z-50 bg-white border rounded-lg shadow-lg p-2";
  const rect = anchorEl.getBoundingClientRect();
  wrapper.style.top = `${window.scrollY + rect.bottom + 6}px`;
  wrapper.style.left = `${window.scrollX + rect.left}px`;

  const select = document.createElement("select");
  select.className = "text-sm px-2 py-1 border rounded";
  for (const [id, nombre] of Array.from(MAP_ESTADOS.entries())) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = nombre;
    if (Number(id) === Number(currentEstado)) opt.selected = true;
    select.appendChild(opt);
  }

  const action = document.createElement("div");
  action.className = "mt-2 flex gap-2";
  const btnOk = document.createElement("button");
  btnOk.className = "px-3 py-1 rounded bg-blue-600 text-white text-xs";
  btnOk.textContent = "Cambiar";
  const btnCancel = document.createElement("button");
  btnCancel.className = "px-3 py-1 rounded bg-gray-100 text-gray-700 text-xs";
  btnCancel.textContent = "Cancelar";

  action.append(select, btnOk, btnCancel);
  wrapper.appendChild(action);
  document.body.appendChild(wrapper);

  const cleanup = () => { if (wrapper && wrapper.parentNode) wrapper.parentNode.removeChild(wrapper); };
  btnCancel.addEventListener("click", cleanup);
  setTimeout(() => {
    document.addEventListener("click", function onDoc(e) {
      if (!wrapper.contains(e.target)) { cleanup(); document.removeEventListener("click", onDoc); }
    });
  }, 0);

  btnOk.addEventListener("click", async () => {
    const nuevoId = Number(select.value);
    if (!Number.isFinite(nuevoId) || nuevoId === currentEstado) return cleanup();

    const pedido = PEDIDO_CACHE.get(idPedido) || null;

    try {
      anchorEl.disabled = true;
      anchorEl.textContent = "Actualizando…";
      const actualizado = await setEstadoPedido(idPedido, nuevoId, pedido);
      PEDIDO_CACHE.set(idPedido, actualizado);
      const nuevoNombre = MAP_ESTADOS.get(nuevoId) || `Estado #${nuevoId}`;
      anchorEl.dataset.estado = String(nuevoId);
      anchorEl.className = `btn-estado inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeEstadoCss(nuevoNombre)}`;
      anchorEl.textContent = nuevoNombre;
    } catch (e) {
      alert(e?.message || "No se pudo actualizar el estado. ¿Iniciaste sesión?");
    } finally {
      anchorEl.disabled = false;
      cleanup();
    }
  });
}

/* ====================== modal detalles (sin fecha) ====================== */
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
    const estadoNom  = MAP_ESTADOS.get(Number(data.idEstadoPedido ?? data.IdEstadoPedido)) || "—";
    const meseroUser = MAP_EMPLEADOS.get(Number(data.idEmpleado ?? data.IdEmpleado)) || "—";

    $("#det-title").textContent   = `#${idPedido}`;
    $("#det-hist").textContent    = "—";
    $("#det-cliente").textContent = cliente;
    $("#det-mesero").textContent  = meseroUser;
    $("#det-mesa").textContent    = idMesa;
    $("#det-estado").textContent  = estadoNom;

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
