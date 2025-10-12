// ==========================
// ServiceMesas.js
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
    list: `${API_BASE}/apiMesa/getDataMesa`,
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

const ServiceMesas = {
  async getEstadosMesa() {
    const r = await fetch(ENDPOINTS.estadosMesa.list, {
      method: "GET",
      headers: baseHeaders(),
      credentials: "include",
    });
    return parseResponse(r);
  },

  async getTiposMesa() {
    const r = await fetch(ENDPOINTS.tiposMesa.list, {
      method: "GET",
      headers: baseHeaders(),
      credentials: "include",
    });
    return parseResponse(r);
  },

  async getMesas() {
    const r = await fetch(ENDPOINTS.mesas.list, {
      method: "GET",
      headers: baseHeaders(),
      credentials: "include",
    });
    return parseResponse(r);
  },

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
};

export default ServiceMesas;
