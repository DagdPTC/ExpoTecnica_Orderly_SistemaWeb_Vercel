// jsService/ServiceReservas.js
const API_BASE = "http://localhost:8080";

/* Endpoints exactos de tu API */
const API_RESERVA_URL        = `${API_BASE}/apiReserva`;
const API_TIPO_RESERVA_URL   = `${API_BASE}/apiTipoReserva`;
const API_ESTADO_RESERVA_URL = `${API_BASE}/apiEstadoReserva`;
const API_MESA_URL           = `${API_BASE}/apiMesa`;

/* Helper fetch con manejo de errores */
async function requestJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} @ ${url} :: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return res.json();
}

/* Reservas */
export async function getReservas(page = 0, size = 10) {
  return requestJSON(`${API_RESERVA_URL}/getDataReserva?page=${page}&size=${size}`);
}
export async function createReserva(data) {
  return requestJSON(`${API_RESERVA_URL}/createReserva`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export async function updateReserva(id, data) {
  return requestJSON(`${API_RESERVA_URL}/modificarReserva/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
export async function deleteReserva(id) {
  return requestJSON(`${API_RESERVA_URL}/eliminarReserva/${id}`, { method: "DELETE" });
}

/* Catálogos */
export async function getTiposReserva(page = 0, size = 100) {
  return requestJSON(`${API_TIPO_RESERVA_URL}/getTipoReserva?page=${page}&size=${size}`);
}
export async function getEstadosReserva(page = 0, size = 100) {
  return requestJSON(`${API_ESTADO_RESERVA_URL}/getDataEstadoReserva?page=${page}&size=${size}`);
}
export async function getMesas(page = 0, size = 200) {
  // Endpoint real del proyecto
  return requestJSON(`${API_MESA_URL}/getDataMesa?page=${page}&size=${size}`);
}
