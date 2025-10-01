// js/jsService/historialService.js
const API_BASE = "http://localhost:8080";

const API_HIST = `${API_BASE}/apiHistorialPedido`;
const API_PED  = `${API_BASE}/apiPedido`;
const API_FACT = `${API_BASE}/apiFactura`;
const API_EMP  = `${API_BASE}/apiEmpleado`;
const API_MESA = `${API_BASE}/apiMesa`;
const API_EPED = `${API_BASE}/apiEstadoPedido`;
const API_PLAT = `${API_BASE}/apiPlatillo`;

/* ---------- headers ---------- */
function authHeaders() {
  const token = localStorage.getItem("token");
  const h = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

/* ---------- GET/POST blindados ---------- */
async function apiGET(url) {
  const res = await fetch(url, { headers: authHeaders(), credentials: "include" });
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`${res.status} ${res.statusText} @ ${url} :: ${txt}`);
  }
  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  const text = await res.text();
  if (!text || !text.trim()) return null;

  if (ct.includes("application/json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
    try { return JSON.parse(text); }
    catch (e) { console.warn("Respuesta no-JSON válido:", url, e); return null; }
  }
  console.warn("Respuesta no-JSON desde", url, "-> devolviendo null");
  return null;
}

async function apiPOST(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>res.statusText);
    throw new Error(`${res.status} ${res.statusText} @ ${url} :: ${txt}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (res.status === 204) return null;
  if (!ct || !ct.includes("application/json")) return null;
  return res.json().catch(()=>null);
}

/* =========================================================
   LECTURAS PARA TABLA + DETALLE
   ========================================================= */
export async function getHistorialPedidos(page=0, size=50) {
  const res = await apiGET(`${API_HIST}/getDataHistorialPedido?page=${page}&size=${size}`);
  const list = res?.content ?? res?.data ?? (Array.isArray(res)?res:[]) ?? [];
  return list.map(x => ({
    IdHistorial: x.Id ?? x.IdHistorialPedido ?? x.id,
    IdPedido:    x.IdPedido ?? x.idPedido,
    IdFactura:   x.IdFactura ?? x.idFactura
  }));
}

export async function getPedidoById(id) {
  if (id == null) throw new Error("IdPedido requerido");
  try {
    return await apiGET(`${API_PED}/getPedidoById/${encodeURIComponent(id)}`);
  } catch (e) {
    console.warn("getPedidoById FALLÓ para id=", id, "->", e.message);
    return null;
  }
}

export async function getFacturaById(id) {
  if (id == null) throw new Error("IdFactura requerido");
  // usa tu endpoint principal; si no hay, devolvemos null sin romper
  try { return await apiGET(`${API_FACT}/getFacturaById/${encodeURIComponent(id)}`); }
  catch { return null; }
}

/* Meseros para el filtro (tolerante a vacío) */
export async function getMeseros() {
  let res = await apiGET(`${API_EMP}/getDataEmpleado?page=0&size=200`);
  let list = (res?.content ?? (Array.isArray(res)?res:[])) || [];

  if (!list.length) {
    res = await apiGET(`${API_EMP}/getAll`).catch(()=>null) ?? await apiGET(`${API_EMP}`).catch(()=>null);
    list = (res?.content ?? (Array.isArray(res)?res:[])) || [];
  }
  if (!list.length) return [];

  return list.map(e => {
    const p = e.Persona ?? e.persona ?? {};
    const nombre = [p.PrimerNombre ?? "", p.ApellidoPaterno ?? ""].filter(Boolean).join(" ").trim() || "Empleado";
    return { id: e.IdEmpleado ?? e.idEmpleado ?? e.id ?? null, nombre };
  }).filter(m => m.id != null);
}

/* =========================================================
   BUSCAR POR NOMBRE (para replicar el PL/SQL)
   ========================================================= */
export async function findMesaByNombre(nombre) {
  const res = await apiGET(`${API_MESA}/getDataMesa?page=0&size=200`);
  const list = res?.content ?? [];
  const found = list.find(m => (m.NombreMesa ?? m.nombreMesa) === nombre);
  if (!found) throw new Error(`No se encontró la mesa "${nombre}"`);
  return { IdMesa: found.IdMesa ?? found.idMesa ?? found.id, NombreMesa: found.NombreMesa ?? nombre };
}

export async function findEmpleadoPrimerNombre(nombreUpper) {
  const res = await apiGET(`${API_EMP}/getDataEmpleado?page=0&size=200`);
  const list = res?.content ?? [];
  const found = list.find(e => {
    const p = e.Persona ?? {};
    return String(p.PrimerNombre ?? "").toUpperCase() === nombreUpper;
  });
  if (!found) throw new Error(`No se encontró empleado con primer nombre "${nombreUpper}"`);
  return { IdEmpleado: found.IdEmpleado ?? found.idEmpleado ?? found.id };
}

export async function findEstadoPedidoByNombre(nombreUpper) {
  const res = await apiGET(`${API_EPED}/getDataEstadoPedido?page=0&size=200`);
  const list = res?.content ?? [];
  const found = list.find(x => String(x.NombreEstado ?? "").toUpperCase() === nombreUpper);
  if (!found) throw new Error(`No se encontró EstadoPedido "${nombreUpper}"`);
  return { IdEstadoPedido: found.IdEstadoPedido ?? found.idEstadoPedido ?? found.id };
}

export async function findPlatilloByNombre(nombre) {
  const res = await apiGET(`${API_PLAT}/getDataPlatillo?page=0&size=200`);
  const list = res?.content ?? [];
  const found = list.find(p => (p.NombrePlatillo ?? p.nombrePlatillo) === nombre);
  if (!found) throw new Error(`No se encontró el platillo "${nombre}"`);
  return {
    IdPlatillo: found.IdPlatillo ?? found.idPlatillo ?? found.id,
    Precio: Number(found.Precio ?? found.precio ?? 0)
  };
}

/* =========================================================
   CREACIONES (replicar tu bloque PL/SQL)
   ========================================================= */
export async function createPedido(dto) {
  // tu API expone createPedido que también puede aceptar Items dentro
  return apiPOST(`${API_PED}/createPedido`, dto);
}
export async function createFactura(dto) {
  return apiPOST(`${API_FACT}/createFactura`, dto);
}
export async function createHistorialPedido(dto) {
  return apiPOST(`${API_HIST}/createHistorialPedido`, dto);
}
