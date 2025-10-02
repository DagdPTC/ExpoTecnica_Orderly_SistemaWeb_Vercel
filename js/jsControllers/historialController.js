// js/jsControllers/historialController.js
import {
  getPedidos,
  getPedidoById,
  getEstadosPedido,
  getUsuarios,
  getPlatillos,
} from "../jsService/historialService.js";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const TBody        = $("#historial-tbody");
const searchInput  = $("#searchInput");
const waiterFilter = $("#waiterFilter");
const dateFilter   = $("#dateFilter");
const statusFilter = $("#statusFilter");

// Catálogos
let MAP_ESTADOS       = new Map(); // idEstado -> nombre
let MAP_USER_BY_EMP   = new Map(); // idEmpleado -> username
let MAP_PLATILLOS     = new Map(); // idPlatillo -> nombre

// Cache pedidos
let PEDIDOS = [];

/* =========================================================
   SECUENCIADOR LOCAL (# Historial)
   - Incrementa de 1 en 1
   - Persiste en localStorage
   - No recicla números aunque se borre un pedido
   - Cada idPedido conserva su número siempre
   ========================================================= */
const K_SEQ_LAST = "hist_seq_last_v1";
const K_SEQ_MAP  = "hist_seq_map_v1"; // { [idPedido]: seq }

function loadSeqState() {
  let last = 0;
  let map = {};
  try { last = Number(localStorage.getItem(K_SEQ_LAST) || "0") || 0; } catch {}
  try { map = JSON.parse(localStorage.getItem(K_SEQ_MAP) || "{}") || {}; } catch {}
  return { last, map };
}
function saveSeqState({ last, map }) {
  try { localStorage.setItem(K_SEQ_LAST, String(last || 0)); } catch {}
  try { localStorage.setItem(K_SEQ_MAP, JSON.stringify(map || {})); } catch {}
}
function ensureSeqForList(pedidos) {
  const state = loadSeqState();
  const map   = state.map;
  let last    = state.last;

  for (const p of (pedidos || [])) {
    const idPed = Number(p.id ?? p.Id ?? p.idPedido ?? p.ID);
    if (!Number.isFinite(idPed) || idPed <= 0) continue;
    if (map[idPed] == null) {
      last += 1;
      map[idPed] = last;
    }
  }
  saveSeqState({ last, map });
}
function getSeqForPedido(idPedido) {
  const { map } = loadSeqState();
  return map?.[Number(idPedido)] ?? null;
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    // Catálogos
    const [estados, usuarios, plats] = await Promise.all([
      getEstadosPedido(),
      getUsuarios(),
      getPlatillos(),
    ]);
    MAP_ESTADOS = estados;
    MAP_USER_BY_EMP = usuarios;
    MAP_PLATILLOS = plats;

    fillWaiterFilter(MAP_USER_BY_EMP);
    fillStatusFilter(MAP_ESTADOS);

    // Datos
    PEDIDOS = await getPedidos(0, 50);

    // Asignar números de historial persistentes
    ensureSeqForList(PEDIDOS);

    // Render
    renderTabla(applyFilters(PEDIDOS));

    // Filtros
    searchInput?.addEventListener("input", onFiltersChange);
    waiterFilter?.addEventListener("change", onFiltersChange);
    dateFilter?.addEventListener("change", onFiltersChange);
    statusFilter?.addEventListener("change", onFiltersChange);

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

function onFiltersChange() {
  renderTabla(applyFilters(PEDIDOS));
}

/* =========================================================
   Catálogos y helpers UI
   ========================================================= */
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

function nombreEstado(idEstado) {
  return MAP_ESTADOS.get(Number(idEstado)) || "—";
}
function usuarioMesero(idEmpleado) {
  return MAP_USER_BY_EMP.get(Number(idEmpleado)) || null;
}
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
function badgeEstado(nombre) {
  const n = (nombre || "").toLowerCase();
  if (n.includes("pend")) return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-200";
  if (n.includes("prep") || n.includes("proces")) return "bg-blue-100 text-blue-800 ring-1 ring-blue-200";
  if (n.includes("entreg")) return "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200";
  if (n.includes("pag")) return "bg-green-100 text-green-800 ring-1 ring-green-200";
  if (n.includes("cancel") || n.includes("anul")) return "bg-red-100 text-red-800 ring-1 ring-red-200";
  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
}

/* =========================================================
   Filtros
   ========================================================= */
function applyFilters(arr) {
  const q      = (searchInput?.value || "").trim().toLowerCase();
  const waiter = waiterFilter?.value || "";
  const estado = statusFilter?.value || "";
  const fecha  = dateFilter?.value || ""; // yyyy-mm-dd

  return (arr || []).filter((p) => {
    const idPedido = Number(p.id ?? p.Id ?? p.idPedido ?? p.ID);
    const cliente = (p.nombreCliente ?? p.nombrecliente ?? p.Cliente ?? p.cliente ?? "")
      .toString().toLowerCase();

    if (q) {
      const seq = getSeqForPedido(idPedido);
      const hay =
        (seq != null && String(seq).includes(q)) ||
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

/* =========================================================
   Tabla
   ========================================================= */
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

  const rows = lista.map((p) => {
    const idPedido   = Number(p.id ?? p.Id ?? p.idPedido ?? p.ID);
    const seq        = getSeqForPedido(idPedido); // ← nuestro #Historial local
    const cliente    = String(p.nombreCliente ?? p.nombrecliente ?? p.Cliente ?? p.cliente ?? "") || "—";
    const idMesa     = p.idMesa ?? p.IdMesa ?? p.mesaId ?? "—";
    const fecha      = formatFechaHora(p.fpedido ?? p.FPedido ?? p.fechaPedido ?? p.fecha ?? p.Hora ?? "");
    const estadoNom  = nombreEstado(p.idEstadoPedido ?? p.IdEstadoPedido);
    const estadoBadge= badgeEstado(estadoNom);
    const meseroUser = usuarioMesero(p.idEmpleado ?? p.IdEmpleado) || "—";

    return `
      <tr class="hover:bg-gray-50 transition" data-idpedido="${idPedido}">
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
          ${seq != null ? "#" + seq : "—"}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">#${idPedido}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${cliente}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${meseroUser}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${idMesa ?? "—"}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700 hide-mobile">${fecha}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${estadoBadge}">
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

/* =========================================================
   Modal Detalles (igual que antes, pero #Historial usa seq)
   - Sin columna "Importe"
   - Mesero: solo usuario (sin "(usuario)")
   ========================================================= */
const modal   = $("#detalles-modal");
const btnClose= $("#det-cerrar");
btnClose?.addEventListener("click", cerrarModal);
modal?.addEventListener("click", (e) => { if (e.target === modal) cerrarModal(); });

function cerrarModal() { modal.classList.add("hidden"); }
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

async function abrirModalDetalles(idPedido) {
  try {
    const data = await getPedidoById(idPedido);

    // Historial local (no del backend)
    const seq = getSeqForPedido(idPedido);

    const cliente    = String(data.nombreCliente ?? data.cliente ?? "—");
    const idMesa     = data.idMesa ?? data.mesaId ?? "—";
    const fecha      = formatFechaHora(data.fpedido ?? data.FPedido ?? data.fechaPedido ?? data.fecha ?? data.Hora ?? "");
    const estadoNom  = nombreEstado(data.idEstadoPedido ?? data.IdEstadoPedido);
    const meseroUser = usuarioMesero(data.idEmpleado ?? data.IdEmpleado) || "—";

    // Cabecera
    $("#det-title").textContent  = `#${idPedido}`;
    $("#det-hist").textContent   = (seq != null) ? `#${seq}` : "—";
    $("#det-cliente").textContent= cliente;
    $("#det-mesero").textContent = meseroUser;
    $("#det-mesa").textContent   = idMesa;
    $("#det-fecha").textContent  = fecha;
    $("#det-estado").textContent = estadoNom;

    // Items (sin Importe; solo P. Unit.)
    const tbody = $("#det-items");
    const items = Array.isArray(data.items) ? data.items : [];

    let subtotalCalc = 0;
    if (!items.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="px-4 py-3 text-sm text-gray-500">
            (Sin platillos)
          </td>
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

    // Totales (cálculo de respaldo si no vienen)
    const sub = Number(data.subtotal ?? data.Subtotal);
    const tip = Number(data.propina ?? data.Propina);
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

/* =========================================================
   Miscelánea
   ========================================================= */
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
