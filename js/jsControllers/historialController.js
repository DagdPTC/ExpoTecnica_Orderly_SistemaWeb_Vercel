// js/jsControllers/historialController.js
// Render “HistorialDetallePedido” (sin datos mock) — importa el service.

import {
  getHistorialPedidos,
  getHistorialPedidoById,
  getPedidoById,
  getDetalleHistorial,
  getPedidoDetallesByPedido,
  getFacturaById,
  getEmpleadoNombreById,
  getMesaEtiquetaById,
  getEstadoPedidoNombreById,
} from "../jsService/historialService.js";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => r.querySelectorAll(s);

function money(n) { return Number(n ?? 0).toFixed(2); }
function num(n)   { return Number(n ?? 0); }
function esc(s)   { return String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtHistId(id) { return id ? `H${String(id).padStart(3,"0")}` : "-"; }
function fmtPedId(id)  { return id ? `P${String(id).padStart(4,"0")}` : "-"; }
function clsEstado(nombre) {
  const n = String(nombre || "").toLowerCase();
  if (n.includes("entregado") || n.includes("pagado")) return "status-entregado";
  if (n.includes("cancel")) return "status-cancelado";
  return "status-proceso-historial";
}

// ---------- Navbar/Sidebar (como tu snippet) ----------
function attachChrome() {
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (userBtn && !$("#userDropdown")) {
    userBtn.style.position = "relative";
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
    $("#logoutBtn")?.addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }

  const sidebarToggle = $("#sidebarToggle");
  const sidebarToggleDesktop = $("#sidebarToggleDesktop");
  const sidebar = $("#sidebar");
  const mobileOverlay = $("#mobileOverlay");

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
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });
}

// ---------- State ----------
const state = {
  page: 0,
  size: 20,
  totalPages: 1,
  totalElements: 0,
  rows: []
};

// ---------- Carga + tabla ----------
async function loadAndRender() {
  const res = await getHistorialPedidos(state.page, state.size);
  state.rows = res.content ?? res.data ?? [];
  state.totalPages = res.totalPages ?? 1;
  state.totalElements = res.totalElements ?? state.rows.length;
  await renderRows(state.rows);
}

async function renderRows(items) {
  const tbody = $("#historial-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const summaries = await Promise.all(items.map(async it => {
    try {
      const ped = await getPedidoById(it.IdPedido);
      const cliente = ped.NombreCliente ?? ped.nombreCliente ?? "-";
      const idMesa  = ped.IdMesa ?? ped.idMesa;
      const mesaTxt = await getMesaEtiquetaById(idMesa);
      const fecha   = (ped.HoraInicio ?? ped.fechaPedido ?? ped.FPedido ?? "").toString().slice(0,10);
      const mesero  = await getEmpleadoNombreById(ped.IdEmpleado ?? ped.idEmpleado);
      const estado  = await getEstadoPedidoNombreById(ped.IdEstadoPedido ?? ped.idEstadoPedido);
      return { cliente, mesaTxt, fecha, mesero, estado };
    } catch {
      return { cliente: "-", mesaTxt: "-", fecha: "-", mesero: "Empleado", estado: "Estado" };
    }
  }));

  items.forEach((h, i) => {
    const sm = summaries[i];

    const trMain = document.createElement("tr");
    trMain.className = "table-row hover:bg-gray-50 transition-colors";
    trMain.innerHTML = `
      <td class="px-6 py-4 font-medium text-gray-900">${fmtHistId(h.IdHistorialPedido)}</td>
      <td class="px-6 py-4 font-medium text-blue-600">${fmtPedId(h.IdPedido)}</td>
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${esc(sm.cliente)}</div>
        <div class="md:hidden text-sm text-gray-500">
          ${esc(sm.mesaTxt)} | ${esc(sm.mesero)} | ${esc(sm.fecha)}
        </div>
      </td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">${esc(sm.mesero)}</td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          ${esc(sm.mesaTxt)}
        </span>
      </td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">${esc(sm.fecha)}</td>
      <td class="px-6 py-4 hide-mobile">
        <i class="fas fa-check-circle text-green-500" title="Reserva (si aplica)"></i>
      </td>
      <td class="px-6 py-4">
        <span class="status-badge ${clsEstado(sm.estado)}">${esc(sm.estado)}</span>
      </td>
      <td class="px-6 py-4">
        <button class="text-blue-600 hover:text-blue-800 font-medium transition-colors toggle-details"
                data-hist="${h.IdHistorialPedido}">
          <i class="fas fa-eye mr-1"></i> Ver detalles
          <i class="fas fa-chevron-down ml-1 text-xs transition-transform"></i>
        </button>
      </td>
      <td class="px-6 py-4 text-sm text-gray-500">—</td>
    `;

    const trDet = document.createElement("tr");
    trDet.innerHTML = `
      <td colspan="10" class="p-0">
        <div id="details-${h.IdHistorialPedido}" class="order-details"></div>
      </td>
    `;

    tbody.appendChild(trMain);
    tbody.appendChild(trDet);
  });

  // delegación: open/cargar detalles
  tbody.addEventListener("click", async (e) => {
    const btn = e.target.closest(".toggle-details");
    if (!btn) return;
    const idHist = btn.dataset.hist;
    const box = document.getElementById(`details-${idHist}`);
    const icon = btn.querySelector(".fa-chevron-down, .fa-chevron-up");

    box.classList.toggle("active");
    icon?.classList.toggle("fa-chevron-down");
    icon?.classList.toggle("fa-chevron-up");

    if (box.dataset.loaded === "1") return;

    try {
      const h = await getHistorialPedidoById(idHist);
      const p = await getPedidoById(h.IdPedido);
      const detalles = await getDetalleHistorial(idHist).then(arr => arr.length ? arr : getPedidoDetallesByPedido(h.IdPedido));
      const factura  = h.IdFactura ? await getFacturaById(h.IdFactura) : null;
      renderDetalle(box, p, detalles, factura);
      box.dataset.loaded = "1";
    } catch (err) {
      box.innerHTML = `<div class="p-4 text-red-600">Error al cargar detalles: ${esc(err.message)}</div>`;
    }
  });
}

// ---------- Render del bloque de detalles ----------
function renderDetalle(container, pedido, detalles = [], factura = null) {
  const rows = (detalles || []).map(d => ({
    nombre: d.NombrePlatillo ?? d.nombrePlatillo ?? d.platilloNombre ?? "Platillo",
    cantidad: Number(d.Cantidad ?? d.cantidad ?? 0),
    precio: Number(d.PrecioUnitario ?? d.precioUnitario ?? 0),
  }));

  const subtotalCalc = rows.reduce((s, r) => s + r.cantidad * r.precio, 0);
  const propina = num(pedido.Propina ?? pedido.propina ?? subtotalCalc * 0.10);
  const descuento = num(factura?.Descuento ?? factura?.descuento ?? 0);
  const totalFinal = num(
    (factura?.Total ?? factura?.total)
      ?? (pedido.TotalPedido ?? pedido.totalPedido ?? (subtotalCalc - descuento + propina))
  );

  container.innerHTML = `
    <div class="space-y-4">
      <h4 class="font-semibold text-gray-800 text-lg mb-4">
        <i class="fas fa-list-ul mr-2 text-blue-500"></i> Detalles del Pedido
      </h4>

      <div class="bg-white rounded-lg p-4 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4 font-semibold text-gray-600 border-b pb-2">
          <div>Producto</div>
          <div class="text-right">Cantidad</div>
          <div class="text-right">Precio Unit.</div>
          <div class="text-right">Total</div>
        </div>
        ${rows.map(r => `
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100 hover:bg-gray-50 rounded">
            <div class="font-medium text-gray-800">${esc(r.nombre)}</div>
            <div class="text-right text-gray-600">${r.cantidad}</div>
            <div class="text-right text-gray-600">${money(r.precio)}</div>
            <div class="text-right font-semibold text-gray-800">${money(r.cantidad * r.precio)}</div>
          </div>
        `).join("")}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-1">Subtotal</div>
          <div class="text-lg font-bold text-gray-800">${money(subtotalCalc)}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-1">Propina (10%)</div>
          <div class="text-lg font-bold text-gray-800">${money(propina)}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-1">Descuento</div>
          <div class="text-lg font-bold text-red-500">-${money(descuento)}</div>
        </div>
        <div class="text-center">
          <div class="text-sm text-gray-500 mb-1">Total Final</div>
          <div class="text-xl font-bold text-blue-600">${money(totalFinal)}</div>
        </div>
      </div>

      <div class="mt-4 p-4 bg-gray-50 rounded-lg">
        <div class="text-sm text-gray-500 mb-1">Estado de Factura:</div>
        <div>${
          factura
            ? `<span class="font-medium text-green-600">FAC-${String(factura.Id ?? factura.id ?? "").padStart(4,"0")}</span>`
            : `<span class="font-medium text-red-500">No generada</span>`
        }</div>
      </div>
    </div>
  `;
}

// ---------- Filtros (client-side) ----------
function attachFilters() {
  const $search = $("#searchInput");
  const $date   = $("#dateFilter");
  const $status = $("#statusFilter");
  const $waiter = $("#waiterFilter");
  const $tbody  = $("#historial-tbody");

  function apply() {
    const term   = ($search?.value || "").toLowerCase();
    const date   = ($date?.value || "");
    const stat   = ($status?.value || "").toLowerCase();
    const waiter = ($waiter?.value || "").toLowerCase();

    $tbody?.querySelectorAll("tr").forEach((row, idx) => {
      if (idx % 2 !== 0) return; // solo filas principales
      const txt = row.textContent.toLowerCase();
      const show = (!term || txt.includes(term))
                && (!date || txt.includes(date))
                && (!stat || txt.includes(stat))
                && (!waiter || txt.includes(waiter));
      row.style.display = show ? "" : "none";
      row.nextElementSibling && (row.nextElementSibling.style.display = show ? "" : "none");
    });
  }

  $search?.addEventListener("input", apply);
  $date?.addEventListener("change", apply);
  $status?.addEventListener("change", apply);
  $waiter?.addEventListener("change", apply);
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", async () => {
  attachChrome();
  try {
    await loadAndRender();
    attachFilters();
  } catch (err) {
    console.error(err);
    alert("Error al cargar el historial: " + err.message);
  }

  // Cierre modal de edición (si luego lo usas)
  $("#edit-cancelar-btn")?.addEventListener("click", () => {
    $("#edit-historial-modal")?.classList.add("hidden");
    document.body.style.overflow = "";
  });
  $("#edit-cancelar-btn-footer")?.addEventListener("click", () => {
    $("#edit-historial-modal")?.classList.add("hidden");
    document.body.style.overflow = "";
  });
});
