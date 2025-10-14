import {
  getPedidos,
  getPedidoById,
  getEstadosPedido,
  getEmpleadosMap,
  getPlatillos,
  setEstadoPedido
} from "../jsService/historialService.js";

/* ====================== helpers ====================== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const fmtId = (num, pfx = "HIST-") =>
  `${pfx}${String(Number(num || 0)).padStart(4, "0")}`;

/* ====================== refs ====================== */
const TBody = $("#historial-tbody");
const searchInput = $("#searchInput");
const waiterFilter = $("#waiterFilter");
const statusFilter = $("#statusFilter");
const paginator = $("#paginator");
const pageSizeSel = $("#pageSize");
const adminBtn = $("#adminBtn");
const adminMenu = $("#adminMenu");
const logoutBtn = $("#logoutBtn");
const overlay = $("#mobileOverlay");

/* ====================== catálogos ====================== */
let MAP_ESTADOS = new Map();
let MAP_EMPLEADOS = new Map();
let MAP_PLATILLOS = new Map();

/* ====================== datos ====================== */
let PAGE = { number: 0, size: 10, totalPages: 0, totalElements: 0 };
let PEDIDOS = [];

/* ====================== init ====================== */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const [estados, empleados, plats] = await Promise.all([
      getEstadosPedido(),
      getEmpleadosMap(),
      getPlatillos(),
    ]);
    MAP_ESTADOS = estados;
    MAP_EMPLEADOS = empleados;
    MAP_PLATILLOS = plats;

    fillWaiterFilter(MAP_EMPLEADOS);
    fillStatusFilter(MAP_ESTADOS);

    await cargarPedidos(0, 10);

    searchInput?.addEventListener("input", renderTabla);
    waiterFilter?.addEventListener("change", renderTabla);
    statusFilter?.addEventListener("change", renderTabla);
    pageSizeSel?.addEventListener("change", () => {
      const s = Number(pageSizeSel.value);
      cargarPedidos(0, s);
    });

    bindAdminMenu();
    bindSidebarToggles();
  } catch (e) {
    console.error(e);
    TBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-600 py-6">Error: ${e.message}</td></tr>`;
  }
}

/* ====================== fetch data ====================== */
async function cargarPedidos(page = 0, size = 10) {
  TBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500 py-6">Cargando...</td></tr>`;
  const data = await getPedidos(page, size);

  PAGE.number = data.number ?? 0;
  PAGE.size = data.size ?? size;
  PAGE.totalPages = data.totalPages ?? 1;
  PAGE.totalElements = data.totalElements ?? 0;

  PEDIDOS = Array.isArray(data.content) ? data.content : [];
  renderTabla();
}

/* ====================== filtros ====================== */
function applyFilters(arr) {
  const q = (searchInput?.value || "").toLowerCase();
  const waiter = waiterFilter?.value || "";
  const estado = statusFilter?.value || "";

  return (arr || []).filter((p) => {
    const id = p.id ?? 0;
    const cliente = (p.nombreCliente || "").toLowerCase();

    if (q && !String(id).includes(q) && !cliente.includes(q)) return false;
    if (waiter && String(waiter) !== String(p.idEmpleado)) return false;
    if (estado && String(estado) !== String(p.idEstadoPedido)) return false;
    return true;
  });
}

/* ====================== render tabla ====================== */
function badgeEstadoCss(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("pend"))
    return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
  if (n.includes("prep") || n.includes("proc"))
    return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (n.includes("entreg"))
    return "bg-green-100 text-green-800 ring-1 ring-green-200";
  if (n.includes("cancel") || n.includes("anul"))
    return "bg-red-100 text-red-800 ring-1 ring-red-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
}

function renderTabla() {
  const lista = applyFilters(PEDIDOS);

  if (!lista.length) {
    TBody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500 py-6">Sin resultados</td></tr>`;
    renderPaginacion();
    return;
  }

  // 🔁 Mostrar del último al primero
  const reversed = [...lista].sort((a, b) => b.id - a.id);

  const rows = reversed.map((p, i) => {
    const histNumber = PAGE.totalElements - (PAGE.number * PAGE.size + i);
    const histId = fmtId(histNumber);
    const estadoNom = MAP_ESTADOS.get(Number(p.idEstadoPedido)) || "—";
    const meseroNom = MAP_EMPLEADOS.get(Number(p.idEmpleado)) || "—";
    const estadoCss = badgeEstadoCss(estadoNom);

    return `
      <tr class="hover:bg-gray-50 transition">
        <td class="px-6 py-4 text-sm text-gray-700">${histId}</td>
        <td class="px-6 py-4 text-sm text-gray-700">#${p.id}</td>
        <td class="px-6 py-4 text-sm text-gray-700">${p.nombreCliente}</td>
        <td class="px-6 py-4 text-sm text-gray-700 hide-mobile">${meseroNom}</td>
        <td class="px-6 py-4 text-sm text-gray-700 hide-mobile">${p.idMesa}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="btn-estado inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoCss}"
                  data-id="${p.id}" data-estado="${p.idEstadoPedido}">
            ${estadoNom}
          </button>
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <button class="btn-detalles px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  data-id="${p.id}">
            Ver
          </button>
        </td>
      </tr>
    `;
  }).join("");

  TBody.innerHTML = rows;

  $$(".btn-detalles").forEach((btn) => {
    btn.addEventListener("click", () =>
      abrirModalDetalles(Number(btn.dataset.id))
    );
  });

  $$(".btn-estado").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openEstadoSelector(btn, Number(btn.dataset.id), Number(btn.dataset.estado));
    });
  });

  renderPaginacion();
}

/* ====================== cambio estado ====================== */
function openEstadoSelector(anchorEl, idPedido, currentEstado) {
  const wrapper = document.createElement("div");
  wrapper.className =
    "absolute z-[10000] bg-white border rounded-lg shadow-lg p-2";
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

  const btnOk = document.createElement("button");
  btnOk.className = "px-3 py-1 rounded bg-blue-600 text-white text-xs";
  btnOk.textContent = "Cambiar";
  const btnCancel = document.createElement("button");
  btnCancel.className =
    "px-3 py-1 rounded bg-gray-100 text-gray-700 text-xs ml-2";
  btnCancel.textContent = "Cancelar";

  wrapper.append(select, btnOk, btnCancel);
  document.body.appendChild(wrapper);

  const cleanup = () => {
    if (wrapper.parentNode) wrapper.parentNode.removeChild(wrapper);
  };
  btnCancel.addEventListener("click", cleanup);

  btnOk.addEventListener("click", async () => {
    const nuevo = Number(select.value);
    if (!nuevo || nuevo === currentEstado) return cleanup();
    try {
      anchorEl.textContent = "Actualizando…";
      await setEstadoPedido(idPedido, nuevo);
      const nuevoNom = MAP_ESTADOS.get(nuevo) || `Estado ${nuevo}`;
      anchorEl.className = `btn-estado inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeEstadoCss(
        nuevoNom
      )}`;
      anchorEl.textContent = nuevoNom;
    } catch (err) {
      alert("No se pudo actualizar el estado: " + err.message);
    } finally {
      cleanup();
    }
  });
}

/* ====================== modal detalles ====================== */
const modal = $("#detalles-modal");
$("#det-cerrar")?.addEventListener("click", cerrarModal);
modal?.addEventListener("click", (e) => {
  if (e.target === modal) cerrarModal();
});
function cerrarModal() {
  modal.classList.add("hidden");
}

async function abrirModalDetalles(idPedido) {
  try {
    const data = await getPedidoById(idPedido);
    const cliente = data.nombreCliente ?? "—";
    const mesa = data.idMesa ?? "—";
    const mesero = MAP_EMPLEADOS.get(data.idEmpleado) ?? "—";
    const estadoNom = MAP_ESTADOS.get(data.idEstadoPedido) ?? "—";

    $("#det-title").textContent = `#${idPedido}`;
    $("#det-cliente").textContent = cliente;
    $("#det-mesero").textContent = mesero;
    $("#det-mesa").textContent = mesa;
    $("#det-estado").textContent = estadoNom;

    const tbody = $("#det-items");
    let subtotal = 0;
    tbody.innerHTML = (data.items || [])
      .map((it) => {
        const idPlat = it.idPlatillo;
        const nombre = MAP_PLATILLOS.get(idPlat) || `Platillo ${idPlat}`;
        const qty = it.cantidad ?? 1;
        const pu = it.precioUnitario ?? 0;
        subtotal += qty * pu;
        return `
        <tr class="border-t">
          <td class="px-4 py-2 text-sm text-gray-800">${nombre}</td>
          <td class="px-4 py-2 text-sm text-right text-gray-700">${qty}</td>
          <td class="px-4 py-2 text-sm text-right text-gray-700">${money(pu)}</td>
        </tr>`;
      })
      .join("");

    const propina = data.propina ?? subtotal * 0.1;
    const total = data.totalPedido ?? subtotal + propina;

    $("#det-sub").textContent = money(subtotal);
    $("#det-tip").textContent = money(propina);
    $("#det-total").textContent = money(total);

    modal.classList.remove("hidden");
  } catch (e) {
    alert("Error al cargar detalles: " + e.message);
  }
}

/* ====================== paginación ====================== */
function renderPaginacion() {
  const { number, totalPages } = PAGE;
  const prevDisabled = number <= 0 ? "opacity-50 pointer-events-none" : "";
  const nextDisabled =
    number >= totalPages - 1 ? "opacity-50 pointer-events-none" : "";

  paginator.innerHTML = `
    <div class="flex items-center justify-between w-full">
      <button id="prevPage" class="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 ${prevDisabled}">
        ← Anterior
      </button>
      <span class="text-sm text-gray-700">Página ${number + 1} de ${totalPages}</span>
      <button id="nextPage" class="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 ${nextDisabled}">
        Siguiente →
      </button>
    </div>
  `;

  $("#prevPage")?.addEventListener("click", () => {
    if (PAGE.number > 0) cargarPedidos(PAGE.number - 1, PAGE.size);
  });
  $("#nextPage")?.addEventListener("click", () => {
    if (PAGE.number < PAGE.totalPages - 1)
      cargarPedidos(PAGE.number + 1, PAGE.size);
  });
}

/* ====================== filtros select ====================== */
function fillWaiterFilter(mapUsers) {
  if (!waiterFilter) return;
  const opts = ['<option value="">Todos los meseros</option>'];
  for (const [id, nombre] of mapUsers.entries()) {
    opts.push(`<option value="${id}">${nombre}</option>`);
  }
  waiterFilter.innerHTML = opts.join("");
}

function fillStatusFilter(mapEstados) {
  if (!statusFilter) return;
  const opts = ['<option value="">Todos los estados</option>'];
  for (const [id, nombre] of mapEstados.entries()) {
    opts.push(`<option value="${id}">${nombre}</option>`);
  }
  statusFilter.innerHTML = opts.join("");
}

/* ====================== admin menu ====================== */
function bindAdminMenu() {
  if (!adminBtn || !adminMenu) return;

  // Mover al body para que esté por encima de todo
  document.body.appendChild(adminMenu);
  adminMenu.classList.add("fixed");
  adminMenu.style.zIndex = "99999";
  adminMenu.style.position = "fixed";
  adminMenu.style.minWidth = "12rem";

  adminBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const rect = adminBtn.getBoundingClientRect();

    // Posicionar debajo y ajustar si se sale del borde derecho
    let left = rect.left + window.scrollX;
    const rightEdge = left + adminMenu.offsetWidth;
    if (rightEdge > window.innerWidth - 10) {
      left = window.innerWidth - adminMenu.offsetWidth - 10;
    }

    adminMenu.style.top = `${rect.bottom + 8}px`;
    adminMenu.style.left = `${left}px`;
    adminMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!adminMenu.contains(e.target) && !adminBtn.contains(e.target)) {
      adminMenu.classList.add("hidden");
    }
  });

  logoutBtn?.addEventListener("click", () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "login.html";
  });
}

/* ====================== sidebar toggles ====================== */
function bindSidebarToggles() {
  const sidebar = $("#sidebar");
  const t1 = $("#sidebarToggle");
  const t2 = $("#sidebarToggleDesktop");
  const toggle = () => {
    sidebar?.classList.toggle("open");
    overlay?.classList.toggle("open");
  };
  t1?.addEventListener("click", toggle);
  t2?.addEventListener("click", toggle);
  overlay?.addEventListener("click", toggle);
}
