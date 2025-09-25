const API_BASE = "http://localhost:8080";
const API_HISTORIAL = `${API_BASE}/apiHistorialPedido`;
const API_FACTURA = `${API_BASE}/apiFactura`;
const API_PEDIDO = `${API_BASE}/apiPedido`;

export async function getHistorialPedidos(page = 0, size = 10) {
  const res = await fetch(`${API_HISTORIAL}/getDataHistorialPedido?page=${page}&size=${size}`);
  if (!res.ok) throw new Error("No se pudieron cargar los historiales de pedidos.");
  return res.json();
}

export async function getHistorialPedidoById(id) {
  const res = await fetch(`${API_HISTORIAL}/getHistorialPedidoById/${id}`);
  if (!res.ok) throw new Error("No se pudo cargar el historial del pedido.");
  return res.json();
}

export async function getFacturaById(id) {
  const res = await fetch(`${API_FACTURA}/getFacturaById/${id}`);
  if (!res.ok) throw new Error("No se pudo cargar la factura.");
  return res.json();
}

export async function getPedidoById(id) {
  const res = await fetch(`${API_PEDIDO}/getPedidoById/${id}`);
  if (!res.ok) throw new Error("No se pudo cargar el pedido.");
  return res.json();
}
