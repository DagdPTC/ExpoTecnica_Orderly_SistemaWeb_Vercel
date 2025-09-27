// js/jsService/historialService.js
// Todas las lecturas desde la API (sin datos mock)

const API_BASE       = "http://localhost:8080";
const API_HISTORIAL  = `${API_BASE}/apiHistorialPedido`;
const API_PEDIDO     = `${API_BASE}/apiPedido`;
const API_FACTURA    = `${API_BASE}/apiFactura`;
const API_EMPLEADO   = `${API_BASE}/apiEmpleado`;
const API_MESA       = `${API_BASE}/apiMesa`;
const API_ESTADO_PED = `${API_BASE}/apiEstadoPedido`; // si no existe, devolveremos "Estado"

function authHeaders() {
  const token = localStorage.getItem("token");
  const h = { "Content-Type": "application/json" };
  if (token) {
    h["Authorization"] = `Bearer ${token}`;
    h["x-auth-token"]  = token; // soporte doble
  }
  return h;
}

async function apiGET(url) {
  const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GET ${url} → ${res.status} ${msg || ""}`.trim());
  }
  return res.json();
}

// -------- Historial --------
export async function getHistorialPedidos(page = 0, size = 20) {
  return apiGET(`${API_HISTORIAL}/getDataHistorialPedido?page=${page}&size=${size}`);
}
export async function getHistorialPedidoById(id) {
  return apiGET(`${API_HISTORIAL}/getHistorialPedidoById/${encodeURIComponent(id)}`);
}

// -------- Pedido / Detalles --------
export async function getPedidoById(id) {
  return apiGET(`${API_PEDIDO}/getPedidoById/${encodeURIComponent(id)}`);
}

// intenta varias rutas comunes para detalles por pedido
export async function getPedidoDetallesByPedido(idPedido) {
  const tryUrls = [
    `${API_PEDIDO}/getDetalleByPedido/${idPedido}`,
    `${API_PEDIDO}/detalle/byPedido/${idPedido}`,
    `${API_BASE}/apiPedidoDetalle/byPedido/${idPedido}`,
  ];
  for (const u of tryUrls) {
    try { return await apiGET(u); } catch { /* probar siguiente */ }
  }
  return [];
}

// si existe endpoint directo del detalle por historial, úsalo:
export async function getDetalleHistorial(idHistorial) {
  const tryUrls = [
    `${API_HISTORIAL}/detalle/${idHistorial}`,
    `${API_HISTORIAL}/getDetalleByHistorial/${idHistorial}`,
  ];
  for (const u of tryUrls) {
    try { return await apiGET(u); } catch {}
  }
  // Fallback: derivar por pedido
  const h = await getHistorialPedidoById(idHistorial);
  return getPedidoDetallesByPedido(h.IdPedido);
}

// -------- Factura --------
export async function getFacturaById(id) {
  return apiGET(`${API_FACTURA}/getFacturaById/${encodeURIComponent(id)}`);
}

// -------- Auxiliares (nombres/etiquetas) --------
export async function getEmpleadoNombreById(idEmpleado) {
  try {
    const e = await apiGET(`${API_EMPLEADO}/getEmpleadoById/${idEmpleado}`);
    const p = e.persona ?? e.Persona ?? {};
    const n1 = p.PrimerNombre ?? p.primerNombre ?? "";
    const ap = p.ApellidoPaterno ?? p.apellidoPaterno ?? "";
    const nom = [n1, ap].filter(Boolean).join(" ").trim();
    return nom || e.nombreCompleto || "Empleado";
  } catch { return "Empleado"; }
}
export async function getMesaEtiquetaById(idMesa) {
  try {
    const m = await apiGET(`${API_MESA}/getMesaById/${idMesa}`);
    return (m.NombreMesa ?? m.nombreMesa ?? `Mesa ${idMesa}`);
  } catch { return `Mesa ${idMesa}`; }
}
export async function getEstadoPedidoNombreById(idEstado) {
  try {
    const ep = await apiGET(`${API_ESTADO_PED}/getById/${idEstado}`);
    return ep.NombreEstado ?? ep.nombreEstado ?? "Estado";
  } catch { return "Estado"; }
}
