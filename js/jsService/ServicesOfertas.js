// ===============================
// Servicios de API para Ofertas
// ===============================
const API_BASE = "http://localhost:8080";
const API_URL  = `${API_BASE}/apiOferta`;

const USE_DEMO = false; // ponlo true si quieres ver ofertas demo cuando la API esté vacía o en desarrollo.

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try { detail = await res.text(); } catch { /* no-op */ }
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${url}\n${detail}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

export async function getOfertas(page = 0, size = 200) {
  const data = await jsonFetch(`${API_URL}/getDataOferta?page=${page}&size=${size}`);
  // Soportar response tipo Page o lista simple
  if (data && data.content) return data.content;
  return Array.isArray(data) ? data : [];
}

export async function createOferta(payload) {
  return jsonFetch(`${API_URL}/createOferta`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOferta(id, payload) {
  return jsonFetch(`${API_URL}/updateOferta/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteOferta(id) {
  return jsonFetch(`${API_URL}/deleteOferta/${id}`, { method: "DELETE" });
}

// Datos demo opcionales
export const demoOffers = [
  {
    IdOferta: 1,
    Titulo: "Pizza Familiar 2x1",
    Descripcion: "Llévate dos pizzas familiares al precio de una. Solo los viernes.",
    Imagen: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
    FechaInicio: "2025-08-28",
    FechaFin: "2025-09-05",
    Descuento: "50%"
  },
  {
    IdOferta: 2,
    Titulo: "Hamburguesa con Papas Gratis",
    Descripcion: "Pide tu hamburguesa y recibe papas fritas gratis.",
    Imagen: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
    FechaInicio: "2025-08-29",
    FechaFin: "2025-09-10",
    Descuento: "Incluye papas"
  },
  {
    IdOferta: 3,
    Titulo: "Bebidas al 2x1",
    Descripcion: "Promoción en todas las bebidas de la casa. Solo en restaurante.",
    Imagen: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
    FechaInicio: "2025-08-20",
    FechaFin: "2025-08-25",
    Descuento: "2x1"
  }
];

export { USE_DEMO };
