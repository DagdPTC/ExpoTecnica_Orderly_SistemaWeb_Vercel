// js/services/menuService.js
const API_BASE = "http://localhost:8080";

/* ===================== AUTH & HEADERS ===================== */
export function setAuthToken(token) {
  if (!token) localStorage.removeItem("AUTH_TOKEN");
  else localStorage.setItem("AUTH_TOKEN", token);
}
export function getAuthToken() {
  return localStorage.getItem("AUTH_TOKEN");
}

/** Si json=true añade Content-Type JSON; no lo uses para multipart */
function buildHeaders(json = false) {
  const h = new Headers();
  const token = getAuthToken();
  if (token) h.set("Authorization", `Bearer ${token}`);
  if (json) h.set("Content-Type", "application/json");
  return h;
}

/* ===================== WRAPPERS FETCH ===================== */
async function safeJson(res) {
  if (res.status === 204) return null;
  const t = await res.text().catch(() => "");
  if (!t) return null;
  try { return JSON.parse(t); } catch { throw new Error("Respuesta no es JSON válido"); }
}
async function jsonOrThrow(res) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");

    if (res.status === 401) {
      localStorage.removeItem("AUTH_TOKEN");
      try {
        const j = t ? JSON.parse(t) : null;
        const msg = j?.message || j?.error || "No autorizado. Inicia sesión para continuar.";
        throw new Error(msg);
      } catch {
        throw new Error("No autorizado. Inicia sesión para continuar.");
      }
    }

    try {
      const j = t ? JSON.parse(t) : null;
      const msg = j?.message || j?.error || j?.status || `${res.status} ${res.statusText}`;
      throw new Error(typeof msg === "string" ? msg : `${res.status} ${res.statusText}`);
    } catch {
      throw new Error(`${res.status} ${res.statusText}${t ? " - " + t : ""}`);
    }
  }
  return safeJson(res);
}

/** GET genérico */
async function apiGet(url) {
  const res = await fetch(url, {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });
  return jsonOrThrow(res);
}

/** POST/PUT/PATCH JSON */
async function apiJSON(url, method, bodyObj) {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(true),
    credentials: "include",
    body: JSON.stringify(bodyObj),
  });
  return jsonOrThrow(res);
}

/** POST/PUT multipart (FormData) */
async function apiMultipart(url, method, formData) {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(/* no content-type aquí */),
    credentials: "include",
    body: formData,
  });
  return jsonOrThrow(res);
}

/* ===================== NORMALIZADORES ===================== */
function normalizeCategoria(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id ?? raw.Id ?? raw.idCategoria ?? raw.IdCategoria ?? null,
    nombre:
      raw.nomCategoria ??
      raw.nombreCategoria ??
      raw.NombreCategoria ??
      raw.nombre ??
      raw.Nombre ??
      null,
  };
}

function normalizePlatillo(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id ?? raw.Id ?? raw.idPlatillo ?? raw.IdPlatillo ?? null,
    nombre:
      raw.nombre ??
      raw.Nombre ??
      raw.nomPlatillo ??
      raw.nombrePlatillo ??
      raw.NombrePlatillo ??
      null,
    descripcion: raw.descripcion ?? raw.Descripcion ?? "",
    precio: Number(raw.precio ?? raw.Precio ?? 0),
    imagenUrl: raw.imagenUrl ?? raw.ImagenUrl ?? null,
    publicId: raw.publicId ?? raw.PublicId ?? null,
    idCategoria:
      raw.idCategoria ??
      raw.IdCategoria ??
      raw.idCate ??
      raw.IdCate ??
      raw.categoria?.id ??
      raw.categoria?.Id ??
      null,
  };
}

/* ===================== CATEGORÍAS ===================== */
export async function getCategorias(page = 0, size = 50) {
  const url = `${API_BASE}/apiCategoria/getDataCategoria?page=${page}&size=${size}`;
  const data = await apiGet(url);
  const list = Array.isArray(data?.content) ? data.content
            : Array.isArray(data?.data?.content) ? data.data.content
            : Array.isArray(data) ? data : [];
  return list.map(normalizeCategoria).filter(Boolean);
}

export async function crearCategoria({ nombre }) {
  const url = `${API_BASE}/apiCategoria/createCategoria`;
  return apiJSON(url, "POST", { nomCategoria: nombre, nombre });
}

export async function actualizarCategoria(id, { nombre }) {
  const url = `${API_BASE}/apiCategoria/modificarCategoria/${id}`;
  return apiJSON(url, "PUT", { id, nomCategoria: nombre, nombre });
}

export async function eliminarCategoria(id) {
  const url = `${API_BASE}/apiCategoria/eliminarCategoria/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }
  return true;
}

/* ===================== PLATILLOS ===================== */
export async function getPlatillos(page = 0, size = 50) {
  const url = `${API_BASE}/apiPlatillo/getDataPlatillo?page=${page}&size=${size}`;
  const data = await apiGet(url);
  const list = Array.isArray(data?.content) ? data.content
            : Array.isArray(data?.data?.content) ? data.data.content
            : Array.isArray(data) ? data : [];
  return list.map(normalizePlatillo).filter(Boolean);
}

export async function getPlatilloById(id) {
  const url = `${API_BASE}/apiPlatillo/getPlatillo/${id}`;
  const data = await apiGet(url);
  const raw = data?.data ?? data;
  return normalizePlatillo(raw);
}

function buildPlatilloBackendDTO({ id=null, nombre, descripcion, precio, idCategoria, imagenUrl=null, publicId=null }) {
  return {
    id: id ?? undefined,
    // nombres “nuevos”
    nombre, descripcion, precio, idCategoria, imagenUrl, publicId,
    // compatibilidad con servicios previos
    nomPlatillo: nombre,
    idCate: idCategoria
  };
}

export async function crearPlatillo(p) {
  const url = `${API_BASE}/apiPlatillo/createPlatillo`;
  return apiJSON(url, "POST", buildPlatilloBackendDTO(p));
}

export async function actualizarPlatillo(id, p) {
  const url = `${API_BASE}/apiPlatillo/modificarPlatillo/${id}`;
  return apiJSON(url, "PUT", buildPlatilloBackendDTO({ ...p, id }));
}

function buildFD(p, file) {
  const dto = buildPlatilloBackendDTO(p);
  const fd  = new FormData();
  fd.append("platillo", new Blob([JSON.stringify(dto)], { type: "application/json" }));
  if (file) fd.append("image", file);
  return fd;
}

export async function crearPlatilloConImagen(p, file) {
  const url = `${API_BASE}/apiPlatillo/createPlatilloWithImage`;
  return apiMultipart(url, "POST", buildFD(p, file));
}

export async function actualizarPlatilloConImagen(id, p, file) {
  const url = `${API_BASE}/apiPlatillo/updatePlatilloWithImage/${id}`;
  return apiMultipart(url, "PUT", buildFD({ ...p, id }, file));
}

export async function eliminarPlatillo(id) {
  const url = `${API_BASE}/apiPlatillo/eliminarPlatillo/${id}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }
  return true;
}

/* ===================== SUBIR IMAGEN ===================== */
export async function subirImagen(file, folder = "menu") {
  const pickUrl = (d) =>
    d?.url ||
    d?.secure_url ||
    d?.secureUrl ||
    d?.imageUrl ||
    d?.data?.url ||
    d?.data?.secure_url ||
    d?.data?.secureUrl ||
    d?.data?.imageUrl;

  // 1) Intento con /upload-to-folder
  try {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", folder);
    const data = await apiMultipart(`${API_BASE}/apiImage/upload-to-folder`, "POST", fd);
    const url = pickUrl(data);
    if (!url) throw new Error("La API no devolvió la URL de la imagen");
    return url;
  } catch (e) {
    // 2) Fallback a /upload
    const fd2 = new FormData();
    fd2.append("image", file);
    const data2 = await apiMultipart(`${API_BASE}/apiImage/upload`, "POST", fd2);
    const url2 = pickUrl(data2);
    if (!url2) throw new Error("La API no devolvió la URL de la imagen");
    return url2;
  }
}

/* ===================== EXPORT UTILS (opcionales) ===================== */
export const __internal = {
  API_BASE,
  buildHeaders,
  setAuthToken,
  getAuthToken,
  normalizeCategoria,
  normalizePlatillo
};
