// js/services/menuService.js
const API_BASE = "http://localhost:8080";

/* ================= Auth helpers ================= */
/** Guarda el token (p.ej., después de /auth/login) */
export function setAuthToken(token) {
  if (!token) localStorage.removeItem("AUTH_TOKEN");
  else localStorage.setItem("AUTH_TOKEN", token);
}
/** Lee el token actual */
export function getAuthToken() {
  return localStorage.getItem("AUTH_TOKEN");
}
/** fetch que adjunta Authorization: Bearer <token> si existe */
async function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  // Si tu backend usa cookies de sesión, descomenta:
  // return fetch(url, { ...options, headers, credentials: "include" });

  return fetch(url, { ...options, headers });
}

/* ================= Helpers ================= */
async function safeJson(res) {
  if (res.status === 204) return null;
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try { return JSON.parse(text); } catch { throw new Error("Respuesta no es JSON válido"); }
}

async function jsonOrThrow(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");

    // Manejo especial de 401
    if (res.status === 401) {
      // si quieres, limpia token para forzar nuevo login
      localStorage.removeItem("AUTH_TOKEN");
      // intenta extraer mensaje del backend
      try {
        const j = text ? JSON.parse(text) : null;
        const msg = j?.message || j?.error || "No autorizado. Inicia sesión para continuar.";
        throw new Error(msg);
      } catch {
        throw new Error("No autorizado. Inicia sesión para continuar.");
      }
    }

    try {
      const j = text ? JSON.parse(text) : null;
      const msg = j?.message || j?.error || j?.status || `${res.status} ${res.statusText}`;
      throw new Error(typeof msg === "string" ? msg : `${res.status} ${res.statusText}`);
    } catch {
      throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
    }
  }
  return safeJson(res);
}

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

/* ================= Categorías ================= */
export async function getCategorias(page = 0, size = 50) {
  const url = `${API_BASE}/apiCategoria/getDataCategoria?page=${page}&size=${size}`;
  const data = await jsonOrThrow(await authFetch(url));
  let list = [];
  if (Array.isArray(data?.content)) list = data.content;
  else if (Array.isArray(data?.data?.content)) list = data.data.content;
  else if (Array.isArray(data)) list = data;
  return list.map(normalizeCategoria).filter(Boolean);
}

export async function crearCategoria({ nombre }) {
  const url = `${API_BASE}/apiCategoria/createCategoria`;
  return jsonOrThrow(await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nomCategoria: nombre, nombre }),
  }));
}

export async function actualizarCategoria(id, { nombre }) {
  const url = `${API_BASE}/apiCategoria/modificarCategoria/${id}`;
  return jsonOrThrow(await authFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, nomCategoria: nombre, nombre }),
  }));
}

export async function eliminarCategoria(id) {
  const url = `${API_BASE}/apiCategoria/eliminarCategoria/${id}`;
  const res = await authFetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }
  return true;
}

/* ================= Platillos ================= */
export async function getPlatillos(page = 0, size = 50) {
  const url = `${API_BASE}/apiPlatillo/getDataPlatillo?page=${page}&size=${size}`;
  const data = await jsonOrThrow(await authFetch(url));
  let list = [];
  if (Array.isArray(data?.content)) list = data.content;
  else if (Array.isArray(data?.data?.content)) list = data.data.content;
  else if (Array.isArray(data)) list = data;
  return list.map(normalizePlatillo).filter(Boolean);
}

// (Opcional) si tienes endpoint de detalle
export async function getPlatilloById(id) {
  const url = `${API_BASE}/apiPlatillo/getPlatillo/${id}`;
  const data = await jsonOrThrow(await authFetch(url));
  const raw = data?.data ?? data;
  return normalizePlatillo(raw);
}

/* ===== JSON (sin archivo) ===== */
function buildPlatilloBackendDTO({ nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null, id = null }) {
  return {
    id: id ?? undefined,
    // nombres “nuevos”
    nombre, descripcion, precio, idCategoria, imagenUrl, publicId,
    // compatibilidad con servicios previos
    nomPlatillo: nombre,
    idCate: idCategoria
  };
}

export async function crearPlatillo({ nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null }) {
  const url = `${API_BASE}/apiPlatillo/createPlatillo`;
  const dto = buildPlatilloBackendDTO({ nombre, descripcion, precio, idCategoria, imagenUrl, publicId });
  return jsonOrThrow(await authFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  }));
}

export async function actualizarPlatillo(id, { nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null }) {
  const url = `${API_BASE}/apiPlatillo/modificarPlatillo/${id}`;
  const dto = buildPlatilloBackendDTO({ id, nombre, descripcion, precio, idCategoria, imagenUrl, publicId });
  return jsonOrThrow(await authFetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dto),
  }));
}

/* ===== Multipart (archivo + JSON) ===== */
function buildFormDataPlatillo({ nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null, id = null }, file) {
  const dto = buildPlatilloBackendDTO({ id, nombre, descripcion, precio, idCategoria, imagenUrl, publicId });
  const fd = new FormData();
  fd.append("platillo", new Blob([JSON.stringify(dto)], { type: "application/json" }));
  if (file) fd.append("image", file);
  return fd;
}

export async function crearPlatilloConImagen({ nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null }, file) {
  const url = `${API_BASE}/apiPlatillo/createPlatilloWithImage`;
  const fd = buildFormDataPlatillo({ nombre, descripcion, precio, idCategoria, imagenUrl, publicId }, file);
  return jsonOrThrow(await authFetch(url, { method: "POST", body: fd }));
}

export async function actualizarPlatilloConImagen(id, { nombre, descripcion, precio, idCategoria, imagenUrl = null, publicId = null }, file) {
  const url = `${API_BASE}/apiPlatillo/updatePlatilloWithImage/${id}`;
  const fd = buildFormDataPlatillo({ id, nombre, descripcion, precio, idCategoria, imagenUrl, publicId }, file);
  return jsonOrThrow(await authFetch(url, { method: "PUT", body: fd }));
}

export async function eliminarPlatillo(id) {
  const url = `${API_BASE}/apiPlatillo/eliminarPlatillo/${id}`;
  const res = await authFetch(url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }
  return true;
}

/* ===== Subida directa de imagen (robusta) ===== */
export async function subirImagen(file, folder = "menu") {
  // extrae la URL aunque venga con otra clave
  const pickUrl = (d) =>
    d?.url ||
    d?.secure_url ||
    d?.secureUrl ||
    d?.imageUrl ||
    d?.data?.url ||
    d?.data?.secure_url ||
    d?.data?.secureUrl ||
    d?.data?.imageUrl;

  // 1) Intento con /apiImage/upload-to-folder
  try {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", folder);

    const res = await authFetch(`${API_BASE}/apiImage/upload-to-folder`, { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      const url = pickUrl(data);
      if (!url) throw new Error("La API no devolvió la URL de la imagen");
      return url;
    }
    if (res.status !== 404) {
      const txt = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText}${txt ? " - " + txt : ""}`);
    }
  } catch (e) {
    console.warn("[upload-to-folder] fallback:", e?.message || e);
  }

  // 2) Fallback a /apiImage/upload
  const fd2 = new FormData();
  fd2.append("image", file);

  const res2 = await authFetch(`${API_BASE}/apiImage/upload`, { method: "POST", body: fd2 });
  const text = await res2.text().catch(() => "");
  if (!res2.ok) {
    throw new Error(`${res2.status} ${res2.statusText}${text ? " - " + text : ""}`);
  }

  let data2 = {};
  try { data2 = text ? JSON.parse(text) : {}; } catch { data2 = {}; }
  const url2 = pickUrl(data2);
  if (!url2) throw new Error("La API no devolvió la URL de la imagen");
  return url2;
}

/* ================= Export utilitarios (opcionales) ================= */
export const __internal = {
  safeJson,
  jsonOrThrow,
  normalizeCategoria,
  normalizePlatillo,
  API_BASE,
  buildPlatilloBackendDTO
};
