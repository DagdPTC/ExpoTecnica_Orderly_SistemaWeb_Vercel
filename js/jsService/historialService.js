// js/jsService/historialService.js

/* ===================== CONFIG ===================== */
let API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

/** Permite sobreescribir la base desde fuera si la necesitas */
export function setApiBase(base) {
  if (typeof base === "string" && base.trim()) API_HOST = base.trim();
}

/* ===================== AUTH TOKEN (opcional) ===================== */
const TOKEN_KEY = "AUTH_TOKEN";

export function setAuthToken(token) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}
export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

/* ===================== HELPERS HTTP ===================== */
function clampSize(n, min = 1, max = 50) {
  const v = Number(n) || 10;
  return Math.min(Math.max(v, min), max);
}

async function throwJsonError(res) {
  let txt = "";
  try { txt = await res.text(); } catch {}
  let msg = `HTTP ${res.status}`;
  try {
    const j = txt ? JSON.parse(txt) : null;
    msg = j?.message || j?.error || j?.status || msg;
    throw Object.assign(new Error(msg), { status: res.status, body: j ?? txt });
  } catch {
    throw Object.assign(new Error(txt || msg), { status: res.status, body: txt });
  }
}

/** fetch con credenciales y bearer si existe */
function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });
}

/* ===================== UTIL FECHAS (para PUT completo) ===================== */
function pad2(n){ return String(n).padStart(2,"0"); }
function toApiDateTime(d) {
  const dt = d instanceof Date ? d : new Date(d || Date.now());
  return `${dt.getFullYear()}-${pad2(dt.getMonth()+1)}-${pad2(dt.getDate())}T${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
}

/* ===================== ENDPOINTS ===================== */
// Historial paginado (DTO esperado: {content:[{Id,IdPedido,IdFactura}], number,size,totalPages,totalElements})
export async function getHistorial(page = 0, size = 20) {
  const s = clampSize(size);
  const url = `${API_HOST}/apiHistorialPedido/getDataHistorialPedido?page=${Number(page)}&size=${s}`;
  const res = await authFetch(url);
  if (res.status === 204) return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  if (!res.ok) await throwJsonError(res);
  const txt = await res.text().catch(() => "");
  if (!txt || !txt.trim() || txt === "null") {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: s };
  }
  try { return JSON.parse(txt); } catch { throw new Error(txt); }
}

// Pedido por ID (para modal y, si hace falta, PUT completo)
export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await authFetch(url);
  if (!res.ok) await throwJsonError(res);
  return await res.json();
}

// Estados -> Map(idEstado, nombre)
export async function getEstadosPedido() {
  const url = `${API_HOST}/apiEstadoPedido/getDataEstadoPedido?page=0&size=50`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content
               : Array.isArray(data) ? data
               : [];
    const map = new Map();
    for (const e of list) {
      const id = Number(e.id ?? e.Id ?? e.idEstadoPedido ?? e.IdEstadoPedido);
      if (!Number.isFinite(id)) continue;
      const nombre = String(e.nomEstado ?? e.nombre ?? e.estado ?? "").trim() || `Estado #${id}`;
      map.set(id, nombre);
    }
    return map;
  } catch { return new Map(); }
}

// Empleados -> Map(idEmpleado, nombre/amigable)
export async function getEmpleadosMap(page = 0, size = 50) {
  const s = clampSize(size);
  const url = `${API_HOST}/apiEmpleado/getDataEmpleado?page=${Number(page)}&size=${s}`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content
               : Array.isArray(data) ? data
               : [];
    const map = new Map();
    for (const e of list) {
      const id = Number(e.id ?? e.Id ?? e.idEmpleado ?? e.IdEmpleado);
      if (!Number.isFinite(id)) continue;

      const fullA = [e.pnombre ?? e.Pnombre, e.apellidoP ?? e.ApellidoP].filter(Boolean).join(" ").trim();
      const fullB = [e.snombre ?? e.Snombre, e.apellidoM ?? e.ApellidoM].filter(Boolean).join(" ").trim();

      const nombre =
        (e.username ?? e.usuario ?? e.nombreCompleto ?? e.nombre ?? e.nomEmpleado) ??
        (fullA || fullB) ??
        e.correo ?? e.email ?? `Empleado ${id}`;

      map.set(id, String(nombre).trim());
    }
    return map;
  } catch {
    return new Map();
  }
}

// Platillos -> Map(idPlatillo, nombre) (para detallar items en el modal)
export async function getPlatillos(page = 0, size = 50) {
  const s = clampSize(size);
  const url = `${API_HOST}/apiPlatillo/getDataPlatillo?page=${Number(page)}&size=${s}`;
  try {
    const res = await authFetch(url);
    if (!res.ok) return new Map();
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content
               : Array.isArray(data) ? data
               : [];
    const map = new Map();
    for (const p of list) {
      const id = Number(p.id ?? p.Id ?? p.idPlatillo ?? p.IdPlatillo);
      if (!Number.isFinite(id)) continue;
      const nombre = String(p.nombre ?? p.nomPlatillo ?? "").trim();
      map.set(id, nombre || `#${id}`);
    }
    return map;
  } catch { return new Map(); }
}

/* ===================== UPDATE: SOLO ESTADO (con fallback) ===================== */
/**
 * Intenta actualizar SOLO el estado del pedido.
 * Si el backend exige más campos, reintenta con un PUT "completo" armando el payload desde getPedidoById(id).
 */
export async function setEstadoPedido(idPedido, nuevoIdEstado) {
  const id = Number(idPedido);
  const idEstado = Number(nuevoIdEstado);
  if (!Number.isFinite(id) || !Number.isFinite(idEstado)) {
    throw new Error("Parámetros inválidos para actualizar estado.");
  }

  // 1) Intento “minimal” (si tu backend lo permite)
  const minimalUrl = `${API_HOST}/apiPedido/modificarPedido/${encodeURIComponent(id)}`;
  let res = await authFetch(minimalUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idEstadoPedido: idEstado }),
  });

  if (res.ok) return await res.json().catch(() => true);

  // Si falló por validación, reintentamos con payload completo
  if (res.status === 400 || res.status === 422) {
    // 2) GET pedido
    const actual = await getPedidoById(id);

    // 3) Construimos el payload “completo” a partir del pedido actual, cambiando solo idEstadoPedido
    const fechaBase =
      actual?.FPedido || actual?.fpedido || actual?.horaInicio ||
      actual?.Fecha || actual?.fecha || actual?.fechaPedido || new Date();

    const FPedido   = toApiDateTime(fechaBase);
    const horaInicio = toApiDateTime(fechaBase);

    const items = Array.isArray(actual?.items)
      ? actual.items.map(pl => ({
          idPlatillo: Number(pl.idPlatillo ?? pl.IdPlatillo ?? pl.id ?? pl.Id),
          cantidad: Math.max(1, Number(pl.cantidad ?? pl.Cantidad ?? 1)),
          precioUnitario: Number(pl.precioUnitario ?? pl.PrecioUnitario ?? 0),
        }))
      : [];

    const body = {
      nombreCliente: actual?.nombreCliente ?? "Cliente",
      idMesa: Number(actual?.idMesa ?? actual?.mesaId ?? actual?.IdMesa ?? 0) || null,
      idEmpleado: Number(actual?.idEmpleado ?? actual?.IdEmpleado ?? 0) || null,
      idEstadoPedido: idEstado, // ← único cambio
      observaciones: actual?.observaciones ?? "",
      subtotal: Number(actual?.subtotal ?? 0),
      propina: Number(actual?.propina ?? 0),
      totalPedido: Number(
        actual?.totalPedido ??
        (Number(actual?.subtotal ?? 0) + Number(actual?.propina ?? 0))
      ),
      items,
      // campos de fecha requeridos por tu API
      FPedido,
      horaInicio,
      fpedido: FPedido,
      horaFin: actual?.horaFin ?? null,
    };

    res = await authFetch(minimalUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) await throwJsonError(res);
    return await res.json().catch(() => true);
  }

  // Otros errores
  await throwJsonError(res);
}
