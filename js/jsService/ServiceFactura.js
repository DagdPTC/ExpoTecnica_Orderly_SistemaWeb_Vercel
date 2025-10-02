// js/jsService/ServiceFactura.js
const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";
const API_FACTURA = `${API_BASE}api//apiFactura`;
const API_PEDIDO = `${API_BASE}/apiPedido`;
const API_PLATILLO = `${API_BASE}/apiPlatillo`;

function authFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  for (const k of ["jwt","token","authToken","access_token"]) {
    const t = localStorage.getItem(k) || sessionStorage.getItem(k);
    if (t && !headers.has("Authorization")) { 
      headers.set("Authorization", `Bearer ${t}`); 
      break; 
    }
  }
  
  // Headers por defecto para JSON
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(url, { 
    credentials: "include", 
    cache: "no-store", 
    ...options, 
    headers 
  });
}

/* ------------------------- FACTURA ---------------------------- */
export async function getFacturas(page = 0, size = 10) {
  const res = await authFetch(`${API_FACTURA}/getDataFactura?page=${page}&size=${size}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getFacturaById(id) {
  const res = await authFetch(`${API_FACTURA}/getFacturaById/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Actualización completa de factura
export async function updateFacturaCompleta(idFactura, payload) {
  const res = await authFetch(`${API_FACTURA}/actualizarCompleto/${idFactura}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? {} : res.json().catch(() => ({}));
}

// Actualización parcial de factura
export async function updateFactura(idFactura, payload) {
  const res = await authFetch(`${API_FACTURA}/actualizarFactura/${idFactura}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? {} : res.json().catch(() => ({}));
}

export async function deleteFactura(id) {
  const res = await authFetch(`${API_FACTURA}/eliminarFactura/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

/* ------------------------- PEDIDO ----------------------------- */
export async function getPedidoById(id) {
  const res = await authFetch(`${API_PEDIDO}/getPedidoById/${id}`);
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  let p = json;
  if (p && typeof p === "object") {
    if (p.data) p = p.data;
    if (p.pedido) p = p.pedido;
    if (Array.isArray(p.content) && p.content.length === 1) p = p.content[0];
  }
  return p;
}

export async function updatePedido(idPedido, payload) {
  const res = await authFetch(`${API_PEDIDO}/actualizarPedido/${idPedido}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? {} : res.json().catch(() => ({}));
}

/* ------------------------ PLATILLO ---------------------------- */
export async function getPlatillos(page = 0, size = 50) {
  const safe = Math.max(1, Math.min(Number(size) || 10, 50));
  const res = await authFetch(`${API_PLATILLO}/getDataPlatillo?page=${page}&size=${safe}`);
  if (res.status === 204) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size: safe };
  }
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  if (!text?.trim()) return { content: [], totalElements: 0, totalPages: 0, number: 0, size: safe };
  try { return JSON.parse(text); } catch { throw new Error(text); }
}

export async function getPlatilloById(id) {
  const res = await authFetch(`${API_PLATILLO}/getPlatilloById/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
