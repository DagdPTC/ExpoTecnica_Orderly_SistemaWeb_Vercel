// ==========================
// ServiceMesas.js (API layer)
// ==========================

const API_BASE = "http://localhost:8080"; // Ajusta si tu API está en otro host

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
};

function baseHeaders() {
  return { "Content-Type": "application/json" };
}

async function parseResponse(resp) {
  if (!resp.ok) {
    let msg = `Error ${resp.status}`;
    try {
      const j = await resp.json();
      if (j?.message) msg = j.message;
    } catch (_) {}
    throw new Error(msg);
  }
  const text = await resp.text();
  return text ? JSON.parse(text) : null;
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
