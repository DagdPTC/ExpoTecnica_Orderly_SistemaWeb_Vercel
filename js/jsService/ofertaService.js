// js/jsService/ofertaService.js
// Endpoints backend:
//   GET  /apiOfertas/getDataOfertas?page=&size=
//   POST /apiOfertas/createOfertas
//   PUT  /apiOfertas/modificarOfertas/{id}
//   DEL  /apiOfertas/eliminarOfertas/{id}
//   POST /apiOfertas/createOfertaWithImage
//   PUT  /apiOfertas/updateOfertaoWithImage/{id}

const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";

/* ===================== AUTH (sin redirecciones) ===================== */
export function setAuthToken(token) {
  if (!token) {
    localStorage.removeItem("AUTH_TOKEN");
    sessionStorage.removeItem("AUTH_TOKEN");
  } else {
    localStorage.setItem("AUTH_TOKEN", token);
  }
}
function readAnyToken() {
  // Busca en llaves comunes (por si tu login usa otra)
  const keys = ["AUTH_TOKEN", "auth_token", "token", "jwt", "JWT", "access_token"];
  for (const k of keys) {
    const v = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (v) return v;
  }
  // También intenta en un objeto "user" con token
  try {
    const user = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    if (user && (user.token || user.jwt || user.access_token)) {
      return user.token || user.jwt || user.access_token;
    }
  } catch {}
  return null;
}
function sanitizeToken(raw) {
  if (!raw) return null;
  let t = String(raw).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }
  if (/^bearer\s+/i.test(t)) t = t.replace(/^bearer\s+/i, "").trim();
  return t || null;
}
export function getAuthToken() {
  return sanitizeToken(readAnyToken());
}

let __onceAuthLog = false;
function buildHeaders(json = false) {
  const h = new Headers();
  const token = getAuthToken();
  if (token) {
    h.set("Authorization", `Bearer ${token}`);
    if (!__onceAuthLog) {
      __onceAuthLog = true;
      console.info("[ofertaService] Authorization listo (Bearer <token>)");
    }
  }
  if (json) h.set("Content-Type", "application/json");
  return h;
}

/* ===================== FETCH WRAPPERS ===================== */
async function safeJson(res) {
  if (res.status === 204) return null;
  const t = await res.text().catch(() => "");
  if (!t) return null;
  try { return JSON.parse(t); } catch { throw new Error("La respuesta del servidor no es JSON válido."); }
}
async function jsonOrThrow(res) {
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    if (res.status === 401) {
      let msg = "No autorizado - Token requerido";
      try { const j = t ? JSON.parse(t) : null; msg = j?.message || j?.error || msg; } catch {}
      throw new Error(msg);
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
async function apiGet(url) {
  const res = await fetch(url, { method: "GET", headers: buildHeaders(), credentials: "include" });
  return jsonOrThrow(res);
}
async function apiJSON(url, method, bodyObj) {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(true),
    credentials: "include",
    body: JSON.stringify(bodyObj),
  });
  return jsonOrThrow(res);
}
async function apiMultipart(url, method, formData) {
  const res = await fetch(url, {
    method,
    headers: buildHeaders(/* sin content-type */),
    credentials: "include",
    body: formData,
  });
  return jsonOrThrow(res);
}

/* ===================== NORMALIZADOR ===================== */
function normalizeOferta(raw) {
  if (!raw || typeof raw !== "object") return null;

  const porcentaje = raw.porcentajeDescuento;
  const precioOf   = raw.precioOferta;
  let discountText = "—";
  if (porcentaje != null) discountText = `${Number(porcentaje).toFixed(0)}%`;
  else if (precioOf != null) discountText = `Oferta $${Number(precioOf).toFixed(2)}`;

  return {
    id: raw.id ?? null,
    title: String(raw.descripcion || "").trim() || "Oferta",
    description: String(raw.descripcion || "").trim(),
    image: raw.imagenUrl || "",
    startDate: raw.fechaInicio || "",
    endDate: raw.fechaFin || "",
    discount: discountText,
    activa: !!(raw.activa),
    idPlatillo: raw.idPlatillo ?? null,
    imagenUrl: raw.imagenUrl || null,
    publicId: raw.publicId || null,
  };
}

/* ===================== DTO backend ===================== */
function buildOfertaDTO({
  description,
  discountText,
  precioOferta,
  startDate,
  endDate,
  activa = true,
  idPlatillo,
  imagenUrl = null,
  publicId = null
}) {
  let porcentajeDescuento = null;
  if (typeof discountText === "string" && discountText.includes("%")) {
    const m = discountText.match(/(-?\d+([.,]\d+)?)\s*%/);
    if (m) porcentajeDescuento = Number(String(m[1]).replace(",", "."));
  }
  return {
    descripcion: (description || "").trim(),
    porcentajeDescuento,
    precioOferta: porcentajeDescuento == null ? (precioOferta != null ? Number(precioOferta) : null) : null,
    fechaInicio: startDate || null,
    fechaFin: endDate || null,
    activa: !!activa,
    idPlatillo: idPlatillo ?? null,
    imagenUrl,
    publicId,
  };
}

/* ===================== ENDPOINTS JSON ===================== */
export async function getOfertas(page = 0, size = 100) {
  const url = `${API_BASE}/apiOfertas/getDataOfertas?page=${page}&size=${size}`;
  const json = await apiGet(url);
  const arr = Array.isArray(json?.data) ? json.data : [];
  return arr.map(normalizeOferta).filter(Boolean);
}
export async function crearOferta(dto) {
  const url = `${API_BASE}/apiOfertas/createOfertas`;
  const json = await apiJSON(url, "POST", dto);
  return normalizeOferta(json?.data ?? json);
}
export async function actualizarOferta(id, dto) {
  const url = `${API_BASE}/apiOfertas/modificarOfertas/${id}`;
  const json = await apiJSON(url, "PUT", dto);
  return normalizeOferta(json?.data ?? json);
}
export async function eliminarOferta(id) {
  const url = `${API_BASE}/apiOfertas/eliminarOfertas/${id}`;
  const res = await fetch(url, { method: "DELETE", headers: buildHeaders(), credentials: "include" });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
  }
  return true;
}

/* ===================== ENDPOINTS con imagen (multipart) ===================== */
function buildFD(ofertaDto, file) {
  const fd = new FormData();
  fd.append("oferta", new Blob([JSON.stringify(ofertaDto)], { type: "application/json" }));
  if (file) fd.append("image", file);
  return fd;
}
export async function crearOfertaConImagen(ofertaDto, file) {
  const url = `${API_BASE}/apiOfertas/createOfertaWithImage`;
  const data = await apiMultipart(url, "POST", buildFD(ofertaDto, file));
  return normalizeOferta(data?.data ?? data);
}
export async function actualizarOfertaConImagen(id, ofertaDto, file) {
  const url = `${API_BASE}/apiOfertas/updateOfertaoWithImage/${id}`;
  const data = await apiMultipart(url, "PUT", buildFD(ofertaDto, file));
  return normalizeOferta(data?.data ?? data);
}

/* ===================== EXPORTS de apoyo ===================== */
export const __dto = { buildOfertaDTO };
export const __internal = { API_BASE, normalizeOferta, getAuthToken, setAuthToken };
