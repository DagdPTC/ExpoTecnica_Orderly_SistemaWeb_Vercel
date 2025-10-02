// js/jsService/historialService.js
const API_HOST = "http://localhost:8080";

/** Lista de pedidos (paginado o array plano) */
export async function getPedidos(page = 0, size = 50) {
  const s = Math.min(Math.max(1, Number(size)), 50);
  const url = `${API_HOST}/apiPedido/getDataPedido?page=${Number(page)}&size=${s}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`Error al obtener pedidos (HTTP ${res.status})`);
  const data = await res.json().catch(() => null);
  if (!data) return [];
  return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
}

/** Pedido por ID */
export async function getPedidoById(id) {
  const url = `${API_HOST}/apiPedido/getPedidoById/${encodeURIComponent(id)}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`No se pudo obtener el pedido #${id}`);
  return await res.json();
}

/** Catálogo de estados de pedido -> Map(idEstado, nombre) */
export async function getEstadosPedido() {
  const url = `${API_HOST}/apiEstadoPedido/getDataEstadoPedido?page=0&size=50`;
  try {
    const res = await fetch(url, { credentials: "include" });
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
 * Mapa de usuarios (username) por idEmpleado -> Map(idEmpleado, username)
 * Fuente: /apiUsuario/getDataUsuario
 */
export async function getUsuarios() {
  const url = `${API_HOST}/apiUsuario/getDataUsuario?page=0&size=1000`;
  try {
    const res = await fetch(url, { credentials: "include" });
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

/** Catálogo de platillos -> Map(idPlatillo, nombre) */
export async function getPlatillos() {
  const url = `${API_HOST}/apiPlatillo/getDataPlatillo?page=0&size=1000`;
  try {
    const res = await fetch(url, { credentials: "include" });
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
