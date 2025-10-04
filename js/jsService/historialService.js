// js/jsService/historialService.js
const API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

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
/** Pedido por ID (de aquí sacamos cliente, mesa, estado, items, etc.) */
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

/**
 * Meseros -> Map(idEmpleado, "Nombre Apellido")
 * Toma empleados y (si está disponible) personas para armar el nombre.
 */
export async function getMeseros() {
  // Empleados
  const urlEmp = `${API_HOST}/apiEmpleado/getDataEmpleado?page=0&size=100`;
  let empleados = [];
  try {
    const resEmp = await authFetch(urlEmp);
    if (resEmp.ok) {
      const dataEmp = await resEmp.json().catch(() => ({}));
      empleados = Array.isArray(dataEmp?.content) ? dataEmp.content : (Array.isArray(dataEmp) ? dataEmp : []);
    }
  } catch {}

  // Personas (para nombres)
  let personasById = new Map();
  try {
    const urlPer = `${API_HOST}/apiPersona/getDataPersona?page=0&size=1000`;
    const resPer = await authFetch(urlPer);
    if (resPer.ok) {
      const dataPer = await resPer.json().catch(() => ({}));
      const personas = Array.isArray(dataPer?.content) ? dataPer.content : (Array.isArray(dataPer) ? dataPer : []);
      personasById = new Map(
        personas.map(p => [
          Number(p.id ?? p.Id ?? p.idPersona ?? p.IdPersona),
          p
        ])
      );
    }
  } catch {}

  const map = new Map();
  for (const e of empleados) {
    const idEmp = Number(e.id ?? e.Id ?? e.idEmpleado ?? e.IdEmpleado);
    const idPersona = Number(e.idPersona ?? e.IdPersona);
    if (!Number.isFinite(idEmp)) continue;

    const per = personasById.get(idPersona) || {};
    const nombre = [
      (per.primerNombre ?? per.Pnombre ?? per.pnombre ?? per.firstName),
      (per.apellidoPaterno ?? per.ApellidoP ?? per.apellidoP ?? per.lastNameP),
    ].filter(Boolean).map(String).join(" ").trim();

    map.set(idEmp, nombre || `Empleado ${idEmp}`);
  }

  return map;
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
