import { getHistorialPedidos, getFacturaById, getPedidoById } from "../jsService/historialService.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let state = {
  page: 0,
  size: 10,
  totalPages: 0,
  totalElements: 0,
  historialPedidos: [],
};

document.addEventListener("DOMContentLoaded", async () => {
  const $tbody = $("#historialPedidosTableBody");
  const $search = $("#searchInput");
  const $date = $("#dateFilter");

  await loadAndRender();
  attachFilters();
  attachTableDelegation();
});

async function loadAndRender() {
  try {
    const historialPedidos = await getHistorialPedidos(state.page, state.size);
    state.historialPedidos = historialPedidos.content || [];
    renderRows(state.historialPedidos);
    renderPagination();
  } catch (e) {
    console.error(e);
    alert("Error al cargar los historiales de pedidos.");
  }
}

function renderRows(items) {
  const $tbody = $("#historialPedidosTableBody");
  $tbody.innerHTML = "";
  if (!items.length) {
    $tbody.innerHTML = `<tr><td colspan="5" class="text-center">No se encontraron registros.</td></tr>`;
    return;
  }
  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.dataset.id = item.Id;
    tr.innerHTML = `
      <td>${item.Id}</td>
      <td>${item.NombreCliente || '-'}</td>
      <td>${item.Fecha || '-'}</td>
      <td>${item.Total || '0.00'}</td>
      <td>
        <button class="btn-detalles">Ver Detalles</button>
      </td>
    `;
    $tbody.appendChild(tr);
  });
}

function renderPagination() {
  const $paginationContainer = $("#paginationContainer");
  $paginationContainer.innerHTML = "";
  const $prev = $("#prevPage");
  const $next = $("#nextPage");
  const $currentPage = $("#currentPage");
  const $totalPages = $("#totalPages");

  if (state.totalPages <= 1) {
    $paginationContainer.style.display = "none";
    return;
  }

  $paginationContainer.style.display = "flex";
  $currentPage.textContent = state.page + 1;
  $totalPages.textContent = state.totalPages;

  $prev.addEventListener("click", async () => {
    if (state.page > 0) {
      state.page -= 1;
      await loadAndRender();
    }
  });

  $next.addEventListener("click", async () => {
    if (state.page < state.totalPages - 1) {
      state.page += 1;
      await loadAndRender();
    }
  });
}

function attachFilters() {
  const $search = $("#searchInput");
  const $date = $("#dateFilter");

  $search.addEventListener("input", async () => {
    state.search = $search.value.trim();
    await loadAndRender();
  });

  $date.addEventListener("change", async () => {
    state.date = $date.value || "";
    await loadAndRender();
  });
}

function attachTableDelegation() {
  const $tbody = $("#historialPedidosTableBody");
  $tbody.addEventListener("click", async (e) => {
    const btnDet = e.target.closest(".btn-detalles");
    if (btnDet) {
      const tr = e.target.closest("tr");
      const id = tr.dataset.id;
      await showDetails(id);
    }
  });
}

async function showDetails(id) {
  try {
    const historialPedido = await getHistorialPedidoById(id);
    const factura = await getFacturaById(historialPedido.IdFactura);
    const pedido = await getPedidoById(historialPedido.IdPedido);

    $("#modalFacturaId").textContent = factura.Id;
    $("#modalPedidoId").textContent = pedido.Id;
    $("#modalCliente").textContent = pedido.NombreCliente;
    $("#modalFecha").textContent = pedido.FPedido;
    $("#modalTotal").textContent = factura.Total;

    const modal = $("#detailsModal");
    modal.classList.remove("hidden");
  } catch (e) {
    console.error(e);
    alert("Error al cargar los detalles del historial de pedido.");
  }
}
