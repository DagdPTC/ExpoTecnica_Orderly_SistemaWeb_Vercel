// ==========================
// ServiceMesas.js (sin paginación)
// ==========================

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message || `HTTP ${status}`);
    this.status = status;
    this.details = details;
  }
}

const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";

const ENDPOINTS = {
  mesas: {
    list:   `${API_BASE}/apiMesa/getDataMesa`,
    create: `${API_BASE}/apiMesa/createMesa`,
    update: (id) => `${API_BASE}/apiMesa/modificarMesa/${id}`,
    remove: (id) => `${API_BASE}/apiMesa/eliminarMesa/${id}`,
  },
  estadosMesa: {
    list: `${API_BASE}/apiEstadoMesa/getDataEstadoMesa`,
  },
  tiposMesa: {
    list: `${API_BASE}/apiTipoMesa/getDataTipoMesa`,
  },
  pedidos: {
    list: `${API_BASE}/apiPedido/getDataPedido`,
  },
  reservas: {
    list: `${API_BASE}/apiReserva/getDataReserva`,
  },
  historialPedidos: {
    list: `${API_BASE}/apiHistorialPedido/getDataHistorialPedido`,
  },
  facturas: {
    list: `${API_BASE}/apiFactura/getDataFactura`,
  },
};

function baseHeaders() {
  return { "Content-Type": "application/json" };
}

async function parseResponse(resp) {
  let text = "";
  try { text = await resp.text(); } catch (_) {}
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!resp.ok) {
    let message = `Error ${resp.status}`;
    let details = null;
    if (data && typeof data === "object") {
      message = data.message || data.error || message;
      details = data.errors || data.details || null;
    }
    if (resp.status === 401) message = "No autorizado - Token requerido";
    if (resp.status === 403) message = "Prohibido - Sin permisos";
    throw new ApiError(resp.status, message, details);
  }
  return data;
}

function pickCollection(res) {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray(res.content)) return res.content;
  return [];
}

async function fetchJSON(url) {
  const r = await fetch(url, {
    method: "GET",
    headers: baseHeaders(),
    credentials: "include",
  });
  const data = await parseResponse(r);
  return pickCollection(data);
}

const ServiceMesas = {
  // Catálogos y Mesas
  async getEstadosMesa() { return fetchJSON(ENDPOINTS.estadosMesa.list); },
  async getTiposMesa()   { return fetchJSON(ENDPOINTS.tiposMesa.list);   },
  async getMesas()       { return fetchJSON(ENDPOINTS.mesas.list);       },

  // CRUD Mesa
  async createMesa(payload) {
    const r = await fetch(ENDPOINTS.mesas.create, {
      method: "POST",
      headers: baseHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return parseResponse(r);
  },
  async updateMesa(id, payload) {
    const r = await fetch(ENDPOINTS.mesas.update(id), {
      method: "PUT",
      headers: baseHeaders(),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return parseResponse(r);
  },
  async deleteMesa(id) {
    const r = await fetch(ENDPOINTS.mesas.remove(id), {
      method: "DELETE",
      headers: baseHeaders(),
      credentials: "include",
    });
    return parseResponse(r);
  },

  // Datos para bloqueos/estado visual
  async getPedidos()            { return fetchJSON(ENDPOINTS.pedidos.list);   },
  async getReservas()           { return fetchJSON(ENDPOINTS.reservas.list);  },
  async getHistorialPedidos()   { return fetchJSON(ENDPOINTS.historialPedidos.list); },
  async getFacturas()           { return fetchJSON(ENDPOINTS.facturas.list);  },
};

export default ServiceMesas;
