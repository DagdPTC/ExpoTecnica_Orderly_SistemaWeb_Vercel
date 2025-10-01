// ==========================
// ServiceScript.js
// Normaliza respuestas paginadas: { items, total }
// ==========================
const API_BASE = "http://localhost:8080";

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
    } catch {}
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
  mesas:        "/apiMesa/getDataMesa",
  pedidos:      "/apiPedido/getDataPedido",
  reservas:     "/apiReserva/getDataReserva",
  estadosMesa:  "/apiEstadoMesa/getDataEstadoMesa",
  estadosPedido: "/apiEstadoPedido/getDataEstadoPedido",
  estadosReserva: "/apiEstadoReserva/getDataEstadoReserva",
  platillos:    "/apiPlatillo/getDataPlatillo",
  tiposReserva: "/apiTipoReserva/getTipoReserva"
};

export const Service = {
  async fetchMesas(opts)         { return toPage(await getJson(ENDPOINTS.mesas, opts)); },
  async fetchPedidos(opts)       { return toPage(await getJson(ENDPOINTS.pedidos, opts)); },
  async fetchReservas(opts)      { return toPage(await getJson(ENDPOINTS.reservas, opts)); },
  async fetchEstadosMesa(opts)   { return toPage(await getJson(ENDPOINTS.estadosMesa, opts)); },
  async fetchEstadosPedido(opts) { return toPage(await getJson(ENDPOINTS.estadosPedido, opts)); },
  async fetchEstadosReserva(opts){ return toPage(await getJson(ENDPOINTS.estadosReserva, opts)); },
  async fetchPlatillos(opts)     { return toPage(await getJson(ENDPOINTS.platillos, opts)); },
  async fetchTiposReserva(opts)  { return toPage(await getJson(ENDPOINTS.tiposReserva, opts)); },

  async fetchAll(opts) {
    const [m, p, r, em, ep, er, pl, tr] = await Promise.all([
      getJson(ENDPOINTS.mesas, opts),
      getJson(ENDPOINTS.pedidos, opts),
      getJson(ENDPOINTS.reservas, opts),
      getJson(ENDPOINTS.estadosMesa, opts),
      getJson(ENDPOINTS.estadosPedido, opts),
      getJson(ENDPOINTS.estadosReserva, opts),
      getJson(ENDPOINTS.platillos, opts),
      getJson(ENDPOINTS.tiposReserva, opts)
    ]);
    return { 
      mesas: toPage(m), 
      pedidos: toPage(p), 
      reservas: toPage(r),
      estadosMesa: toPage(em),
      estadosPedido: toPage(ep),
      estadosReserva: toPage(er),
      platillos: toPage(pl),
      tiposReserva: toPage(tr)
    };
  }
};