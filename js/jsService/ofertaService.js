// js/jsService/ofertaService.js
// CRUD Ofertas + subida de imagen con tolerancia de endpoints / payloads

const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";

/* ===================== AUTH & HEADERS ===================== */
export function setAuthToken(token) {
  if (!token) localStorage.removeItem("AUTH_TOKEN");
  else localStorage.setItem("AUTH_TOKEN", token);
}
export function getAuthToken() {
  // Fallback: a veces lo guardan en sessionStorage
  return localStorage.getItem("AUTH_TOKEN") || sessionStorage.getItem("AUTH_TOKEN");
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
      sessionStorage.removeItem("AUTH_TOKEN");
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

async function apiGet(url) {
  console.debug("[ofertaService] GET", url);
  const res = await fetch(url, { method: "GET", headers: buildHeaders(), credentials: "include" });
  return jsonOrThrow(res);
}
async function apiJSON(url, method, bodyObj) {
  console.debug("[ofertaService] JSON", method, url, bodyObj);
  const res = await fetch(url, {
    method,
    headers: buildHeaders(true),
    credentials: "include",
    body: JSON.stringify(bodyObj),
  });
  return jsonOrThrow(res);
}
async function apiMultipart(url, method, formData) {
  console.debug("[ofertaService] MULTIPART", method, url, [...formData.entries()].map(x => x[0]));
  const res = await fetch(url, {
    method,
    headers: buildHeaders(/* no content-type aquí */),
    credentials: "include",
    body: formData,
  });
  return jsonOrThrow(res);
}

/* ===================== NORMALIZADORES ===================== */
function pickTitle(raw) {
  return (
    raw.titulo ?? raw.Titulo ??
    raw.nombre ?? raw.Nombre ??
    raw.tituloOferta ?? raw.TituloOferta ??
    raw.descripcion ?? raw.Descripcion ?? ""
  );
}
function pickDescription(raw) {
  return (
    raw.descripcion ?? raw.Descripcion ??
    raw.detalle ?? raw.Detalle ??
    raw.resumen ?? raw.Resumen ??
    pickTitle(raw) ?? ""
  );
}
function pickStart(raw) {
  return raw.fechaInicio ?? raw.FechaInicio ?? raw.inicio ?? raw.Inicio ?? raw.startDate ?? raw.start ?? "";
}
function pickEnd(raw) {
  return raw.fechaFin ?? raw.FechaFin ?? raw.fin ?? raw.Fin ?? raw.endDate ?? raw.end ?? "";
}
function pickDiscount(raw) {
  if (raw.porcentajeDescuento != null) return `${raw.porcentajeDescuento}%`;
  if (raw.precioOferta != null) return `Oferta $${Number(raw.precioOferta).toFixed(2)}`;
  if (raw.descuento != null) return `${raw.descuento}`;
  return "—";
}

function normalizeOferta(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: raw.id ?? raw.Id ?? raw.idOferta ?? raw.IdOferta ?? null,
    title: String(pickTitle(raw) || "").trim(),
    description: String(pickDescription(raw) || "").trim(),
    image: "", // backend actual no devuelve imagen; la UI mantiene la url subida
    startDate: pickStart(raw),
    endDate: pickEnd(raw),
    discount: pickDiscount(raw),
    activa: !!(raw.activa ?? raw.Activa ?? raw.estado ?? raw.Estado),
    idPlatillo: raw.idPlatillo ?? raw.IdPlatillo ?? null,
  };
}

function parsePercentFromText(text) {
  const m = String(text || "").match(/(-?\d+([.,]\d+)?)\s*%/);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Frontend -> Backend (DTO) tolerante */
function buildOfertaDTO({ id=null, title, description, discount, startDate, endDate, activa=true, idPlatillo }) {
  return {
    id: id ?? undefined,
    descripcion: (description || title || "").trim(),
    porcentajeDescuento: parsePercentFromText(discount),
    precioOferta: null,
    fechaInicio: startDate,
    fechaFin: endDate,
    activa: !!activa,
    idPlatillo: idPlatillo,
  };
}

/* ===================== ENDPOINTS con fallback ===================== */
function extractArray(data) {
  // tolerante a distintas envolturas
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/**
 * Intenta varias rutas conocidas y páginas 0/1
 */
export async function getOfertas(page = 0, size = 50) {
  const routes = [
    `${API_BASE}/apiOfertas/getDataOfertas?page=${page}&size=${size}`,
    `${API_BASE}/apiOfertas/getDataOfertas?page=${page + 1}&size=${size}`,
    `${API_BASE}/apiOferta/getDataOferta?page=${page}&size=${size}`,
    `${API_BASE}/apiOferta/getDataOferta?page=${page + 1}&size=${size}`,
    `${API_BASE}/apiOfertas/list?page=${page}&size=${size}`,
  ];

  let lastErr = null;
  for (const url of routes) {
    try {
      const data = await apiGet(url);
      const list = extractArray(data);
      if (list.length) {
        const norm = list.map(normalizeOferta).filter(Boolean);
        console.debug("[ofertaService] getOfertas ok via", url, "items:", norm.length);
        return norm;
      }
      // si devuelve vacío, probamos la siguiente ruta
      console.debug("[ofertaService] getOfertas vacío via", url);
    } catch (e) {
      lastErr = e;
      console.debug("[ofertaService] getOfertas error via", url, e?.message);
      // seguimos probando la siguiente
    }
  }
  // si ninguna ruta funcionó, devolvemos array vacío (y dejamos el último error en consola)
  if (lastErr) console.warn("[ofertaService] getOfertas: usando vacío. Último error:", lastErr?.message);
  return [];
}

export async function crearOferta(oferta) {
  const dto = buildOfertaDTO(oferta);
  const urls = [
    `${API_BASE}/apiOfertas/createOferta`,
    `${API_BASE}/apiOferta/createOferta`,
  ];
  let lastErr = null;
  for (const u of urls) {
    try {
      const saved = await apiJSON(u, "POST", dto);
      return normalizeOferta(saved?.data ?? saved);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No se pudo crear la oferta");
}

export async function actualizarOferta(id, oferta) {
  const dto = buildOfertaDTO({ ...oferta, id });
  const urls = [
    `${API_BASE}/apiOfertas/modificarOferta/${id}`,
    `${API_BASE}/apiOferta/modificarOferta/${id}`,
  ];
  let lastErr = null;
  for (const u of urls) {
    try {
      const saved = await apiJSON(u, "PUT", dto);
      return normalizeOferta(saved?.data ?? saved);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No se pudo actualizar la oferta");
}

export async function eliminarOferta(id) {
  const urls = [
    `${API_BASE}/apiOfertas/eliminarOferta/${id}`,
    `${API_BASE}/apiOferta/eliminarOferta/${id}`,
  ];
  let lastErr = null;
  for (const u of urls) {
    try {
      const res = await fetch(u, { method: "DELETE", headers: buildHeaders(), credentials: "include" });
      if (!res.ok && res.status !== 404) {
        const text = await res.text().catch(() => "");
        throw new Error(`${res.status} ${res.statusText}${text ? " - " + text : ""}`);
      }
      return true;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No se pudo eliminar la oferta");
}

/* ===================== SUBIR IMAGEN (Cloudinary) ===================== */
export async function subirImagenOferta(file, folder = "menu") {
  const pickUrl = (d) =>
    d?.url || d?.secure_url || d?.secureUrl || d?.imageUrl || d?.data?.url || d?.data?.secure_url || d?.data?.imageUrl;

  try {
    const fd = new FormData();
    fd.append("image", file);
    fd.append("folder", folder);
    const data = await apiMultipart(`${API_BASE}/apiImage/upload-to-folder`, "POST", fd);
    const url = pickUrl(data);
    if (!url) throw new Error("La API no devolvió la URL de la imagen");
    return url;
  } catch {
    const fd2 = new FormData();
    fd2.append("image", file);
    const data2 = await apiMultipart(`${API_BASE}/apiImage/upload`, "POST", fd2);
    const url2 = pickUrl(data2);
    if (!url2) throw new Error("La API no devolvió la URL de la imagen");
    return url2;
  }
}

/* ===================== EXPORT UTILS ===================== */
export const __internal = {
  API_BASE,
  getAuthToken,
  setAuthToken,
  normalizeOferta,
};
