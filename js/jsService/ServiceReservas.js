// js/jsService/ServiceReservas.js
const BASE = "http://localhost:8080";

/* Helper fetch con manejo de errores */
async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}  :: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

/* ================== RESERVAS ================== */
// ✅ Paginación real
export async function getReservas(page = 0, size = 10) {
  return jfetch(`${BASE}/apiReserva/getDataReserva?page=${page}&size=${size}`);
}

export async function createReserva(data) {
  return jfetch(`${BASE}/apiReserva/createReserva`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateReserva(id, data) {
  return jfetch(`${BASE}/apiReserva/modificarReserva/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteReserva(id) {
  return jfetch(`${BASE}/apiReserva/eliminarReserva/${id}`, { method: "DELETE" });
}

/* ================== CATÁLOGOS ================== */
// ❗ Sin page/size para no romper nada en estos endpoints
export async function getMesas() {
  return jfetch(`${BASE}/apiMesa/getDataMesa`);
}
export async function getTiposMesa() {
  return jfetch(`${BASE}/apiTipoMesa/getDataTipoMesa`);
}
export async function getTiposReserva() {
  return jfetch(`${BASE}/apiTipoReserva/getTipoReserva`);
}
export async function getEstadosReserva() {
  return jfetch(`${BASE}/apiEstadoReserva/getDataEstadoReserva`);
}
