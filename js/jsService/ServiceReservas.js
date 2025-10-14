// js/jsService/ServiceReservas.js
const BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";

// Tamaños de página (tu /apiMesa/getDataMesa limita size <= 50)
const PAGE_SIZE_PUBLIC = 50;
const PAGE_SIZE_RESERVAS_DEFAULT = 10;

/* ===== Auth en memoria (opcional SOLO para endpoints protegidos) ===== */
let AUTH_BEARER = null;
export function setAuthBearer(token) {
  AUTH_BEARER = token && token.trim() ? token.trim() : null;
}

/* ===== fetch PROTEGIDO (CRUD reservas) ===== */
async function jfetchAuth(url, opts = {}) {
  const headers = { Accept: "application/json", ...(opts.headers || {}) };
  if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  if (AUTH_BEARER && !headers["Authorization"]) headers["Authorization"] = `Bearer ${AUTH_BEARER}`;

  const res = await fetch(addNoCache(url), {
    mode: "cors",
    credentials: "include",
    cache: "no-store",
    ...opts,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`${res.status} :: ${text || "Error de red"}`);
    err.status = res.status; err.url = url;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

/* ===== fetch PÚBLICO (catálogos) — SIN credenciales ===== */
async function jfetchPublic(url, opts = {}) {
  const headers = { Accept: "application/json", ...(opts.headers || {}) };
  delete headers.Authorization;

  const res = await fetch(addNoCache(url), {
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    ...opts,
    headers,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`${res.status} :: ${text || "Error de red"}`);
    err.status = res.status; err.url = url;
    throw err;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

/* ===== utils ===== */
function addNoCache(url) { const sep = url.includes("?") ? "&" : "?"; return `${url}${sep}_t=${Date.now()}`; }
function extractList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.content)) return data.content;
  if (data._embedded && typeof data._embedded === "object") {
    const ks = Object.keys(data._embedded);
    if (ks.length === 1 && Array.isArray(data._embedded[ks[0]])) return data._embedded[ks[0]];
  }
  return [];
}
async function fetchAllPagesPublic(urlBase, pageSize = PAGE_SIZE_PUBLIC) {
  let page = 0, acc = [];
  while (true) {
    const url = `${urlBase}?page=${page}&size=${pageSize}`;
    const data = await jfetchPublic(url);
    acc.push(...extractList(data));
    if (!data || Array.isArray(data)) break;
    const last = data.last;
    const totalPages = typeof data.totalPages === "number" ? data.totalPages : undefined;
    if (last === true) break;
    if (typeof totalPages === "number" && page >= totalPages - 1) break;
    page++;
  }
  return acc;
}

/* ===== RESERVAS (protegidas) ===== */
export async function getReservas(page = 0, size = PAGE_SIZE_RESERVAS_DEFAULT) {
  return jfetchAuth(`${BASE}/apiReserva/getDataReserva?page=${page}&size=${size}`);
}
export async function createReserva(data) {
  return jfetchAuth(`${BASE}/apiReserva/createReserva`, { method: "POST", body: JSON.stringify(data) });
}
export async function updateReserva(id, data) {
  return jfetchAuth(`${BASE}/apiReserva/modificarReserva/${id}`, { method: "PUT", body: JSON.stringify(data) });
}
export async function deleteReserva(id) {
  return jfetchAuth(`${BASE}/apiReserva/eliminarReserva/${id}`, { method: "DELETE" });
}

/* ===== CATÁLOGOS (públicos, SIN credenciales) ===== */
export async function getMesasAll() {
  // Tu controller expone /getDataMesa (paginado, size <= 50)
  return await fetchAllPagesPublic(`${BASE}/apiMesa/getDataMesa`, 50);
}
export async function getTiposMesaAll() {
  try { return await fetchAllPagesPublic(`${BASE}/apiTipoMesa/getDataTipoMesa`, 50); }
  catch { return []; }
}
export async function getTiposReservaAll() {
  try { return extractList(await jfetchPublic(`${BASE}/apiTipoReserva/getTipoReserva`)); } catch {}
  try { return await fetchAllPagesPublic(`${BASE}/apiTipoReserva/getDataTipoReserva`, 50); } catch {}
  return [];
}
export async function getEstadosReservaAll() {
  try { return await fetchAllPagesPublic(`${BASE}/apiEstadoReserva/getDataEstadoReserva`, 50); }
  catch { return []; }
}
