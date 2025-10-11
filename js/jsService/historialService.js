// js/jsService/historialService.js
const API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

/* ====== Token helpers (opcionales) ====== */
export function setAuthToken(token) {
  if (!token) localStorage.removeItem("AUTH_TOKEN");
  else localStorage.setItem("AUTH_TOKEN", token);
}
export function getAuthToken() {
  return localStorage.getItem("AUTH_TOKEN");
}

/* -------------------- fetch con auth (cookie HttpOnly + token opcional) -------------------- */
function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const t = getAuthToken();
  if (t && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${t}`);

  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });
}

/* ============================ HISTORIAL ============================ */
/** Página de historial (DTO esperado: { content, totalElements, totalPages, number, size }) */
export async function getHistorial(page = 0, size = 20) {
  const s = Math.min(Math.max(1, Number(size) || 10), 50); // 1..50
  const url = `${API_HOST}/apiHistorialPedido/getDataHistorialPedido?page=${Number(page)}&size=${s}`;
  const res = await authFetch(url);

  if (res.status === 401) {
    const text = await res.text().catch(() => "");
    const msg = safeJsonText(text)?.error || "No autorizado - Token requerido";
    const err = new Error(msg);
    err.status = 401;
    throw err;
  }
  if (res.status === 204) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${text || res.statusText}`);
  }

  const text = await res.text();
  if (!text || !text.trim() || text === "null") {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  }
  return JSON.parse(text);
}

function safeJsonText(t) {
  try { return t ? JSON.parse(t) : null; } catch { return null; }
}

/* ============================== PEDIDOS ============================== */
export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await authFetch(url);
  if (res.status === 401) {
    const text = await res.text().catch(() => "");
    const msg = safeJsonText(text)?.error || "No autorizado - Token requerido";
    const err = new Error(msg);
    err.status = 401;
    throw err;
  }
  if (!res.ok) throw new Error(`No se pudo obtener el pedido #${id}`);
  return await res.json();
}

/* ============================== CATÁLOGOS ============================== */
export async function getEstadosPedido() {
  const url = `${API_HOST}/apiEstadoPedido/getDataEstadoPedido?page=0&size=50`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    return new Map(
      list.map(e => {
        const id = Number(e.id ?? e.Id ?? e.idEstadoPedido ?? e.IdEstadoPedido);
        const nombre = String(e.nomEstado ?? e.nombre ?? e.estado ?? "").trim();
        return [id, nombre || `Estado #${id}`];
      }).filter(([id]) => Number.isFinite(id))
    );
  } catch {
    return new Map();
  }
}

/** Empleados -> Map(idEmpleado, nombre/username) (sin llamar a Persona) */
export async function getEmpleadosMap() {
  const url = `${API_HOST}/apiEmpleado/getDataEmpleado?page=0&size=50`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    return new Map(
      list.map(e => {
        const id = Number(e.id ?? e.Id ?? e.idEmpleado ?? e.IdEmpleado);
        // Intento de nombre con los posibles campos del DTO de Empleado
        const nombre =
          (e.username ?? e.usuario ?? e.nomEmpleado ?? e.nombre ?? e.nombreCompleto) ||
          // últimas opciones: combos de partes si vinieran
          ([e.pnombre, e.apellidoP].filter(Boolean).join(" ").trim() || null) ||
          `Empleado ${id}`;
        return [id, String(nombre).trim()];
      }).filter(([id]) => Number.isFinite(id))
    );
  } catch {
    return new Map();
  }
}

/** Platillos -> Map(idPlatillo, nombre) (para nombre en el modal) */
export async function getPlatillosMap() {
  const url = `${API_HOST}/apiPlatillo/getDataPlatillo?page=0&size=50`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    return new Map(
      list.map(p => {
        const id = Number(p.id ?? p.Id ?? p.idPlatillo ?? p.IdPlatillo);
        const nombre = String(p.nombre ?? p.nomPlatillo ?? "").trim();
        return [id, nombre || `#${id}`];
      }).filter(([id]) => Number.isFinite(id))
    );
  } catch {
    return new Map();
  }
}
