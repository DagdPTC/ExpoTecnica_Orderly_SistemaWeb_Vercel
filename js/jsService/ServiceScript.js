// ==========================
// ServiceScript.js
// Normaliza respuestas paginadas: { items, total }
// ==========================
const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";

async function getJson(path, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
    credentials: "include",
    signal
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.message || data?.error) msg += ` - ${data.message || data.error}`;
    } catch { }
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

// Normaliza (soporta array plano o paginado con content)
function toPage(payload) {
  if (!payload) return { items: [], total: 0 };
  if (Array.isArray(payload)) return { items: payload, total: payload.length };
  if ("content" in payload) {
    return {
      items: payload.content ?? [],
      total: Number(payload.totalElements ?? (payload.content?.length ?? 0))
    };
  }
  // fallback
  return { items: [payload], total: 1 };
}

const ENDPOINTS = {
  mesas: "/apiMesa/getDataMesa",
  pedidos: "/apiPedido/getDataPedido",
  reservas: "/apiReserva/getDataReserva",
  estadosMesa: "/apiEstadoMesa/getDataEstadoMesa",
  estadosPedido: "/apiEstadoPedido/getDataEstadoPedido",
  estadosReserva: "/apiEstadoReserva/getDataEstadoReserva",
  platillos: "/apiPlatillo/getDataPlatillo",
  tiposReserva: "/apiTipoReserva/getTipoReserva"
};

// --- deja este helper en el mismo archivo ---
const softGet = (path, opts) =>
  getJson(path, opts).catch(err => {
    if (err.status === 401) return null; // <- no revienta Promise.all
    throw err;
  });

// --- reemplaza tu fetchAll COMPLETO por este ---
async function fetchAll(opts = {}) {
  // Públicos: mesas, reservas, tiposReserva
  // Protegidos (pueden dar 401 si no hay sesión): pedidos, estados*, platillos
  const [m, p, r, em, ep, er, pl, tr] = await Promise.all([
    getJson(ENDPOINTS.mesas, opts),                 // público
    softGet(ENDPOINTS.pedidos, opts),               // protegido (401 => null)
    getJson(ENDPOINTS.reservas, opts),              // público
    softGet(ENDPOINTS.estadosMesa, opts),           // protegido
    softGet(ENDPOINTS.estadosPedido, opts),         // protegido
    softGet(ENDPOINTS.estadosReserva, opts),        // protegido
    softGet(ENDPOINTS.platillos, opts),             // protegido
    getJson(ENDPOINTS.tiposReserva, opts)           // público
  ]);

  return {
    mesas:           toPage(m),
    pedidos:         toPage(p),      // toPage(null) => {items:[], total:0}
    reservas:        toPage(r),
    estadosMesa:     toPage(em),
    estadosPedido:   toPage(ep),
    estadosReserva:  toPage(er),
    platillos:       toPage(pl),
    tiposReserva:    toPage(tr)
  };
}

// Si exportas un objeto Service, asegúrate de apuntar a esta función:
export const Service = {
  // ...
  fetchAll,
};
