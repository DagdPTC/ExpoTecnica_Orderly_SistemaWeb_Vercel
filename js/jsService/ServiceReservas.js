// js/jsService/ServiceReservas.js
const BASE = "https://orderly-api-b53514e40ebd.herokuapp.com"; // ajusta si usas otro host/puerto
const PAGE_SIZE = 200;                // tamaño por página para “fetch-all”

// -------- fetch base con cookies (HttpOnly) ----------
async function jfetch(url, opts = {}) {
  const final = {
    mode: "cors",
    credentials: "include", // <<--- ENVÍA LA COOKIE EN TODAS LAS LLAMADAS
    ...opts,
    headers: { ...(opts.headers || {}) },
  };
  if (final.body && !final.headers["Content-Type"]) {
    final.headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, final);

  if (res.status === 401) {
    const text = await res.text().catch(() => "");
    const err = new Error(`401  :: ${text || "No autorizado"}`);
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}  :: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

// --- util: extrae lista sin importar si es Page<T>, PagedModel o array ---
function extractList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (data._embedded && typeof data._embedded === "object") {
    const keys = Object.keys(data._embedded);
    if (keys.length === 1 && Array.isArray(data._embedded[keys[0]])) {
      return data._embedded[keys[0]];
    }
  }
  return [];
}

// --- util: trae TODAS las páginas (Page<T>/PagedModel) ---
async function fetchAllPages(urlBase) {
  let page = 0;
  const acc = [];

  while (true) {
    const url = `${urlBase}?page=${page}&size=${PAGE_SIZE}`;
    const data = await jfetch(url);
    const list = extractList(data);
    acc.push(...list);

    // si el backend ya no manda estructura pageable, salimos tras una iteración
    if (!data || Array.isArray(data)) break;

    const last = data.last;
    const totalPages = typeof data.totalPages === "number" ? data.totalPages : undefined;
    if (last === true) break;
    if (typeof totalPages === "number" && page >= totalPages - 1) break;

    page++;
  }
  return acc;
}

// ------------------- RESERVAS (paginado normal) -------------------
export async function getReservas(page = 0, size = 10) {
  return jfetch(`${BASE}/apiReserva/getDataReserva?page=${page}&size=${size}`);
}
export async function createReserva(data) {
  return jfetch(`${BASE}/apiReserva/createReserva`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateReserva(id, data) {
  return jfetch(`${BASE}/apiReserva/modificarReserva/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteReserva(id) {
  return jfetch(`${BASE}/apiReserva/eliminarReserva/${id}`, { method: "DELETE" });
}

// ------------------- CATÁLOGOS (fetch-all) -------------------
export async function getMesasAll() {
  // si tu backend tiene un endpoint “no paginado” (p. ej. /apiMesa/getAll), puedes usarlo aquí;
  // esto funciona con Page<T>/PagedModel (trae todas las páginas).
  return fetchAllPages(`${BASE}/apiMesa/getDataMesa`);
}
export async function getTiposMesaAll() {
  return fetchAllPages(`${BASE}/apiTipoMesa/getDataTipoMesa`);
}
export async function getTiposReservaAll() {
  return fetchAllPages(`${BASE}/apiTipoReserva/getTipoReserva`);
}
export async function getEstadosReservaAll() {
  return fetchAllPages(`${BASE}/apiEstadoReserva/getDataEstadoReserva`);
}

// Opcional: verificar sesión (si tienes /api/auth/me)
export async function getSessionUser() {
  try { return await jfetch(`${BASE}/api/auth/me`); } catch { return null; }
}
