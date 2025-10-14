/* ===================== CONFIG ===================== */
let API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

export function setApiBase(base) {
  if (typeof base === "string" && base.trim()) API_HOST = base.trim();
}

/* ===================== FETCH HELPERS ===================== */
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
    msg = j?.message || j?.error || msg;
    throw Object.assign(new Error(msg), { status: res.status, body: j ?? txt });
  } catch {
    throw Object.assign(new Error(txt || msg), { status: res.status, body: txt });
  }
}

function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  return fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers,
  });
}

/* ===================== ENDPOINTS ===================== */

// GET directo a pedidos
export async function getPedidos(page = 0, size = 10) {
  const s = clampSize(size);
  const url = `${API_HOST}/apiPedido/getDataPedido?page=${page}&size=${s}`;
  const res = await authFetch(url);
  if (!res.ok) await throwJsonError(res);
  return await res.json();
}

export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await authFetch(url);
  if (!res.ok) await throwJsonError(res);
  return await res.json();
}

export async function getEstadosPedido() {
  const url = `${API_HOST}/apiEstadoPedido/getDataEstadoPedido?page=0&size=50`;
  const res = await authFetch(url);
  if (!res.ok) return new Map();
  const data = await res.json();
  const list = Array.isArray(data?.content) ? data.content : [];
  const map = new Map();
  for (const e of list) {
    const id = Number(e.id ?? e.Id ?? e.idEstadoPedido);
    if (!id) continue;
    const nombre = e.nomEstado ?? e.nombre ?? `Estado ${id}`;
    map.set(id, nombre);
  }
  return map;
}

export async function getEmpleadosMap(page = 0, size = 50) {
  const url = `${API_HOST}/apiEmpleado/getDataEmpleado?page=${page}&size=${size}`;
  const res = await authFetch(url);
  if (!res.ok) return new Map();
  const data = await res.json();
  const list = Array.isArray(data?.content) ? data.content : [];
  const map = new Map();

  for (const e of list) {
    const id = Number(e.id ?? e.idEmpleado);
    if (!id) continue;
    const nombre = e.username
      ? String(e.username).trim()
      : `${e.pnombre ? e.pnombre + " " : ""}${e.apellidoP ? e.apellidoP : ""}`.trim() || `Empleado ${id}`;
    map.set(id, nombre);
  }

  return map;
}

export async function getPlatillos(page = 0, size = 50) {
  const url = `${API_HOST}/apiPlatillo/getDataPlatillo?page=${page}&size=${size}`;
  const res = await authFetch(url);
  if (!res.ok) return new Map();
  const data = await res.json();
  const list = Array.isArray(data?.content) ? data.content : [];
  const map = new Map();
  for (const p of list) {
    const id = Number(p.id ?? p.idPlatillo);
    if (!id) continue;
    const nombre = p.nombre ?? `Platillo ${id}`;
    map.set(id, nombre);
  }
  return map;
}

/* ===================== UPDATE ESTADO ===================== */
export async function setEstadoPedido(idPedido, nuevoIdEstado) {
  const url = `${API_HOST}/apiPedido/modificarPedido/${encodeURIComponent(idPedido)}`;
  const res = await authFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idEstadoPedido: nuevoIdEstado }),
  });
  if (!res.ok) await throwJsonError(res);
  return await res.json();
}
