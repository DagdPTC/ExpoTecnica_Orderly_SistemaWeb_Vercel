// js/jsService/ServiceFactura.js
const API_BASE     = "http://localhost:8080";
const API_FACTURA  = `${API_BASE}/apiFactura`;
const API_PEDIDO   = `${API_BASE}/apiPedido`;
const API_PLATILLO = `${API_BASE}/apiPlatillo`;

// ---------- Factura ----------
export async function getFacturas(page = 0, size = 10) {
  const res = await fetch(`${API_FACTURA}/getDataFactura?page=${page}&size=${size}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ÚNICO update (Factura + Pedido) - body plano { IdPedido, IdPlatillo?, Cantidad?, DescuentoPct }
export async function updateFacturaCompleta(idFactura, payload) {
  const res = await fetch(`${API_FACTURA}/actualizarCompleto/${idFactura}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteFactura(id) {
  const res = await fetch(`${API_FACTURA}/eliminarFactura/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json().catch(() => ({}));
}

// ---------- Pedido ----------
export async function getPedidoById(id) {
  const res = await fetch(`${API_PEDIDO}/getPedidoById/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ---------- Platillo ----------
export async function getPlatillos(page = 0, size = 100) {
  const res = await fetch(`${API_PLATILLO}/getDataPlatillo?page=${page}&size=${size}`);
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size };
  }
  const text = await res.text();
  if (!text || !text.trim()) {
    return { content: [], totalElements: 0, totalPages: 0, number: 0, size };
  }
  try { return JSON.parse(text); } catch { throw new Error(text); }
}

// (Opcional) buscar platillo puntual por ID.
export async function getPlatilloById(id) {
  const res = await fetch(`${API_PLATILLO}/getPlatilloById/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // PlatilloDTO { Id, NomPlatillo, Precio, ... }
}
