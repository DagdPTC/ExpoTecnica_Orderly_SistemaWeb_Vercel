// js/jsService/historialService.js
const API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

/* -------------------- fetch con auth -------------------- */
function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const keys = ["jwt", "token", "authToken", "access_token"];
  for (const k of keys) {
    const t = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (t && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${t}`);
      break;
    }
  }
  return fetch(url, { credentials: "include", cache: "no-store", ...options, headers });
}

/* ============================ HISTORIAL ============================ */
export async function getHistorial(page = 0, size = 20) {
  const s = Math.min(Math.max(1, Number(size) || 10), 50);
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
export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await authFetch(url);
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

export async function getPlatillos() {
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

/* ======================= Empleados / Meseros ======================= */
async function fetchAllPaged(baseUrl, size = 50, maxPages = 200) {
  const all = [];
  let page = 0;
  while (page < maxPages) {
    const url = `${baseUrl}?page=${page}&size=${size}`;
    const res = await authFetch(url);
    if (!res.ok) break;
    const data = await res.json().catch(() => ({}));
    const list = Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
    if (!list.length) break;

    all.push(...list);

    const totalPages = Number(data?.totalPages);
    if (Number.isFinite(totalPages) && page >= totalPages - 1) break;
    page++;
  }
  return all;
}

export async function getMeseros() {
  let empleados = [];
  let personas  = [];
  try { empleados = await fetchAllPaged(`${API_HOST}/apiEmpleado/getDataEmpleado`, 50); } catch {}
  try { personas  = await fetchAllPaged(`${API_HOST}/apiPersona/getDataPersona`, 50); } catch {}

  const personasById = new Map(
    personas.map(p => [Number(p.id ?? p.Id ?? p.idPersona ?? p.IdPersona), p])
  );

  const S = v => (v == null ? "" : String(v).trim());

  const nombreDesdePersona = (per = {}) => {
    const pn = S(per.Pnombre ?? per.pnombre ?? per.primerNombre ?? per.firstName ?? per.nombre);
    const ap = S(per.ApellidoP ?? per.apellidoP ?? per.apellidoPaterno ?? per.lastNameP ?? per.apellido);
    const am = S(per.ApellidoM ?? per.apellidoM ?? per.apellidoMaterno ?? per.lastNameM);
    const base = [pn, ap].filter(Boolean).join(" ").trim();
    return base || [pn, ap, am].filter(Boolean).join(" ").trim();
  };

  const nombreDesdeEmpleado = (e = {}) => {
    const direct =
      S(e.nombre ?? e.nombreEmpleado ?? e.nomEmpleado ?? e.displayName ?? e.etiqueta) ||
      [S(e.pnombre ?? e.primerNombre), S(e.apellidoP ?? e.apellidoPaterno)].filter(Boolean).join(" ").trim();
    if (direct) return direct;
    if (e.persona) {
      const n = nombreDesdePersona(e.persona);
      if (n) return n;
    }
    return "";
  };

  const map = new Map();
  for (const e of empleados) {
    const idEmp = Number(e.id ?? e.Id ?? e.idEmpleado ?? e.IdEmpleado);
    if (!Number.isFinite(idEmp)) continue;

    let nombre = nombreDesdeEmpleado(e);
    if (!nombre) {
      const idPersona = Number(e.idPersona ?? e.IdPersona);
      const per = personasById.get(idPersona);
      if (per) nombre = nombreDesdePersona(per);
    }
    if (!nombre) nombre = `Empleado ${idEmp}`;
    map.set(idEmp, nombre);
  }
  return map;
}

export { authFetch };
