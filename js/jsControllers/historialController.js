// js/jsControllers/historialController.js
import {
  getHistorialPedidos, getPedidoById, getFacturaById, getMeseros,
  findMesaByNombre, findEmpleadoPrimerNombre, findEstadoPedidoByNombre, findPlatilloByNombre,
  createPedido, createFactura, createHistorialPedido
} from "../jsService/historialService.js";

const $ = (s, r=document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => Number(n ?? 0).toFixed(2);

document.addEventListener("DOMContentLoaded", async () => {
  attachChrome();
  await populateWaiterFilter();
  try {
    await loadAndRender();
  } catch (e) {
    console.error(e);
    alert("No fue posible cargar el historial: " + e.message);
  }
});

/* ====== UI Chrome (sidebar + filtros) ====== */
function attachChrome() {
  const sidebarToggle = $("#sidebarToggle");
  const sidebarToggleDesktop = $("#sidebarToggleDesktop");
  const sidebar = $("#sidebar");
  const mobileOverlay = $("#mobileOverlay");

  sidebarToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("mobile-open");
    mobileOverlay?.classList.toggle("active");
  });
  sidebarToggleDesktop?.addEventListener("click", () => sidebar?.classList.toggle("collapsed"));
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

  const apply = () => {
    const term = ($("#searchInput")?.value || "").toLowerCase();
    const date = ($("#dateFilter")?.value || "");
    const state = ($("#statusFilter")?.value || "").toLowerCase();
    const waiter = ($("#waiterFilter")?.value || "").toLowerCase();

    $("#historial-tbody")?.querySelectorAll("tr").forEach((row, idx) => {
      if (idx % 2 !== 0) return; // solo filas principales
      const txt = row.textContent.toLowerCase();
      const ok = (!term || txt.includes(term))
              && (!date || txt.includes(date))
              && (!state || txt.includes(state))
              && (!waiter || txt.includes(waiter));
      row.style.display = ok ? "" : "none";
      const det = row.nextElementSibling;
      if (det) det.style.display = ok ? "" : "none";
    });
  };

  $("#searchInput")?.addEventListener("input", apply);
  $("#dateFilter")?.addEventListener("change", apply);
  $("#statusFilter")?.addEventListener("change", apply);
  $("#waiterFilter")?.addEventListener("change", apply);
}

async function populateWaiterFilter() {
  const sel = $("#waiterFilter");
  if (!sel) return;
  sel.innerHTML = `<option value="">Todos los meseros</option>`;
  try {
    const meseros = await getMeseros();
    (meseros || []).forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.nombre;
      opt.textContent = m.nombre;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.warn("No se pudieron cargar meseros:", e.message);
  }
}

/* ====== Tabla ====== */
async function loadAndRender() {
  const tbody = $("#historial-tbody");
  tbody.innerHTML = "";

  const items = await getHistorialPedidos(0, 50);
  for (const it of items) {
    const hasPedido = it.IdPedido != null;

    let pedido = null, cliente="-", mesero="Empleado", mesaTxt="-", fecha="-", estado="Estado";
    if (hasPedido) {
      try {
        pedido = await getPedidoById(it.IdPedido); // puede retornar null (si 500)
        if (pedido) {
          cliente = pedido.NombreCliente ?? "-";
          fecha = (pedido.FechaPedido ?? pedido.HoraInicio ?? "").toString().slice(0,10) || "-";
        }
      } catch {}
    }

    const tr = document.createElement("tr");
    tr.className = "table-row hover:bg-gray-50 transition-colors";
    tr.innerHTML = `
      <td class="px-6 py-4 font-medium text-gray-900">${it.IdHistorial ? `H${String(it.IdHistorial).padStart(3,"0")}` : "-"}</td>
      <td class="px-6 py-4 font-medium text-blue-600">${it.IdPedido ? `P${String(it.IdPedido).padStart(4,"0")}` : "-"}</td>
      <td class="px-6 py-4">
        <div class="font-medium text-gray-900">${esc(cliente)}</div>
        <div class="md:hidden text-sm text-gray-500">${esc(mesaTxt)} | ${esc(mesero)} | ${esc(fecha)}</div>
      </td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">${esc(mesero)}</td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">
        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">${esc(mesaTxt)}</span>
      </td>
      <td class="px-6 py-4 text-gray-700 hide-mobile">${esc(fecha)}</td>
      <td class="px-6 py-4 hide-mobile"><i class="fas fa-check-circle text-green-500"></i></td>
      <td class="px-6 py-4"><span class="status-badge status-proceso-historial">ESTADO</span></td>
      <td class="px-6 py-4">
        <button class="text-blue-600 hover:text-blue-800 font-medium transition-colors toggle-details"
          data-pedido="${it.IdPedido ?? ""}" data-factura="${it.IdFactura ?? ""}"
          ${hasPedido ? "" : 'disabled style="opacity:.4;cursor:not-allowed" title="Sin IdPedido"'} >
          <i class="fas fa-eye mr-1"></i> Ver detalles
          <i class="fas fa-chevron-down ml-1 text-xs"></i>
        </button>
      </td>
    `;

    const trDet = document.createElement("tr");
    trDet.innerHTML = `<td colspan="9" class="p-0"><div class="order-details"></div></td>`;

    tbody.appendChild(tr);
    tbody.appendChild(trDet);
  }

  tbody.addEventListener("click", onToggleDetails);
}

async function onToggleDetails(e) {
  const btn = e.target.closest(".toggle-details");
  if (!btn || btn.disabled) return;

  const wrap = btn.closest("tr").nextElementSibling.querySelector(".order-details");
  wrap.classList.toggle("active");
  if (wrap.dataset.loaded === "1") return;

  const idPedido = btn.dataset.pedido || null;
  const idFactura = btn.dataset.factura || null;

  try {
    const p = await getPedidoById(idPedido); // puede ser null si 500
    if (!p) {
      wrap.innerHTML = `<div class="p-4 text-red-600">No se pudo cargar el pedido (id=${esc(idPedido)}). Revisa el backend (500).</div>`;
      return;
    }

    const rows = (p.Items ?? []).map(it => ({
      nombre: it.NombrePlatillo ?? it.nombrePlatillo ?? "Platillo",
      cantidad: Number(it.Cantidad ?? 0),
      precio: Number(it.PrecioUnitario ?? 0),
    }));
    const subtotal = rows.reduce((s,r)=>s + r.cantidad*r.precio, 0);
    const propina  = Number(p.Propina ?? subtotal*0.10);
    const factura  = idFactura ? await getFacturaById(idFactura).catch(()=>null) : null;
    const descuento= Number(factura?.Descuento ?? 0);
    const total    = Number(factura?.Total ?? p.TotalPedido ?? (subtotal - descuento + propina));

    wrap.innerHTML = `
      <div class="space-y-4">
        <h4 class="font-semibold text-gray-800 text-lg mb-4"><i class="fas fa-list-ul mr-2 text-blue-500"></i> Detalles del Pedido</h4>
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4 font-semibold text-gray-600 border-b pb-2">
            <div>Producto</div><div class="text-right">Cantidad</div><div class="text-right">Precio Unit.</div><div class="text-right">Total</div>
          </div>
          ${rows.map(r => `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100 hover:bg-gray-50 rounded">
              <div class="font-medium text-gray-800">${esc(r.nombre)}</div>
              <div class="text-right text-gray-600">${r.cantidad}</div>
              <div class="text-right text-gray-600">${money(r.precio)}</div>
              <div class="text-right font-semibold text-gray-800">${money(r.cantidad*r.precio)}</div>
            </div>`).join("")}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div class="text-center"><div class="text-sm text-gray-500 mb-1">Subtotal</div><div class="text-lg font-bold text-gray-800">${money(subtotal)}</div></div>
          <div class="text-center"><div class="text-sm text-gray-500 mb-1">Propina (10%)</div><div class="text-lg font-bold text-gray-800">${money(propina)}</div></div>
          <div class="text-center"><div class="text-sm text-gray-500 mb-1">Descuento</div><div class="text-lg font-bold text-red-500">-${money(descuento)}</div></div>
          <div class="text-center"><div class="text-sm text-gray-500 mb-1">Total Final</div><div class="text-xl font-bold text-blue-600">${money(total)}</div></div>
        </div>

        <div class="mt-4 p-4 bg-gray-50 rounded-lg">
          <div class="text-sm text-gray-500 mb-1">Estado de Factura:</div>
          <div>${factura ? `<span class="font-medium text-green-600">FAC-${String(factura.Id ?? factura.id ?? "").padStart(4,"0")}</span>` : `<span class="font-medium text-red-500">No generada</span>`}</div>
        </div>
      </div>`;
    wrap.dataset.loaded = "1";
  } catch (err) {
    wrap.innerHTML = `<div class="p-4 text-red-600">No se pudieron cargar los detalles: ${esc(err.message)}</div>`;
  }
}

/* ====== Replica exacta del PL/SQL (opcional) ======
   Llama en consola: crearPedidoEjemplo()
   Crea: Pedido (Items: 2x Hamburguesa) + Factura + Historial
   ================================================ */
async function crearPedidoEjemplo() {
  const mesa   = await findMesaByNombre("Mesa 2");
  const emp    = await findEmpleadoPrimerNombre("ISABEL");
  const estado = await findEstadoPedidoByNombre("PENDIENTE");
  const plat   = await findPlatilloByNombre("Hamburguesa");

  const pedidoDto = {
    NombreCliente: "Luis García",
    IdMesa: mesa.IdMesa,
    IdEmpleado: emp.IdEmpleado,
    IdEstadoPedido: estado.IdEstadoPedido,
    Observaciones: "Sin cebolla",
    Subtotal: 11.00,
    Propina: 1.00,
    TotalPedido: 12.00,
    Items: [
      { IdPlatillo: plat.IdPlatillo, Cantidad: 2, PrecioUnitario: plat.Precio }
    ]
  };
  const pedido = await createPedido(pedidoDto);
  const idPedido = pedido?.Id ?? pedido?.IdPedido ?? pedido?.id;
  if (!idPedido) throw new Error("El backend no devolvió IdPedido");

  const factura = await createFactura({ IdPedido: idPedido, Descuento: 0.00, Total: 12.00 });
  const idFactura = factura?.Id ?? factura?.IdFactura ?? factura?.id;
  if (!idFactura) throw new Error("El backend no devolvió IdFactura");

  await createHistorialPedido({ IdPedido: idPedido, IdFactura: idFactura });

  alert(`Pedido creado:\n- Pedido: ${idPedido}\n- Factura: ${idFactura}`);
  await loadAndRender();
}
window.crearPedidoEjemplo = crearPedidoEjemplo;
