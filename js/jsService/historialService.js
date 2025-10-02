// js/jsService/historialService.js
const API_HOST = "http://localhost:8080";

/* -------------------- fetch con auth (cookie HttpOnly) -------------------- */
function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});

  // Si además guardaste un token en front, úsalo (opcional)
  const keys = ["jwt", "token", "authToken", "access_token"];
  for (const k of keys) {
    const t = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (t && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${t}`);
      break;
    }
  }

  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });
}

/* ============================ HISTORIAL ============================ */
/** Página de historial (DTO: { Id, IdPedido, IdFactura }) */
export async function getHistorial(page = 0, size = 20) {
  const s = Math.min(Math.max(1, Number(size) || 10), 50); // backend limita a 1..50
  const url = `${API_HOST}/apiHistorialPedido/getDataHistorialPedido?page=${Number(page)}&size=${s}`;
  const res = await authFetch(url);
  if (res.status === 204) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  }
  if (!res.ok) throw new Error(await res.text().catch(() => `HTTP ${res.status}`));

  const text = await res.text();
  if (!text || !text.trim() || text === "null") {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  }
  try { return JSON.parse(text); } catch { throw new Error(text); }
}

/* ============================== PEDIDOS ============================== */
/** Pedido por ID (de aquí sacamos cliente, fecha, mesa, estado, items, etc.) */
export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await authFetch(url);
  if (!res.ok) throw new Error(`No se pudo obtener el pedido #${id}`);
  return await res.json();
}

/* ============================== CATÁLOGOS ============================== */
/** Catálogo de estados -> Map(idEstado, nombre) */
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

/** Usuarios -> Map(idEmpleado, username) */
export async function getUsuarios() {
  const url = `${API_HOST}/apiUsuario/getDataUsuario?page=0&size=50`; // clamped
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    return new Map(
      list.map(u => {
        const idEmp = Number(u.idEmpleado ?? u.empleadoId ?? u.id_empleado ?? u?.empleado?.id);
        const username = String(u.username ?? u.usuario ?? u.user ?? "").trim();
        if (!Number.isFinite(idEmp) || !username) return null;
        return [idEmp, username];
      }).filter(Boolean)
    );
  } catch {
    return new Map();
  }
}

/** Platillos -> Map(idPlatillo, nombre) (para nombre en el modal) */
export async function getPlatillos() {
  const url = `${API_HOST}/apiPlatillo/getDataPlatillo?page=0&size=50`; // clamped
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
