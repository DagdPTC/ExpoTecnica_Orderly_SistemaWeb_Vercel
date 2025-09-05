// jsService/ServiceMesas.js
const API_URL = "http://localhost:8080/apiMesa";

async function jsonFetch(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let txt = "";
    try { txt = await res.text(); } catch {}
    console.error(`HTTP ${res.status} ${res.statusText} - ${url}\n${txt}`);
    return null;
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

export async function getMesas(page = 0, size = 100) {
  return jsonFetch(`${API_URL}/getDataMesa?page=${page}&size=${size}`);
}

export async function createMesa(data) {
  // data esperado: { NumMesa, Capacidad, ... }
  return jsonFetch(`${API_URL}/createMesa`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMesa(id, data) {
  // PUT /modificarMesa/{id}
  return jsonFetch(`${API_URL}/modificarMesa/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteMesa(id) {
  // DELETE /eliminarMesa/{id}
  return jsonFetch(`${API_URL}/eliminarMesa/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/**
 * Utilidad: busca una mesa por su número dentro de una lista
 */
export function findMesaByNumero(mesas, numero) {
  const toNum = (v) => Number(String(v ?? "").trim());
  const getNumero = (m) =>
    m?.NumMesa ?? m?.numMesa ?? m?.numero ?? m?.Numero ?? m?.nomMesa ?? m?.NomMesa ?? null;

  return (mesas || []).find((m) => toNum(getNumero(m)) === toNum(numero)) || null;
}

/**
 * Extrae el ID interno (PK) de la mesa, tolerante a diferentes nombres
 */
export function getMesaId(mesa) {
  return mesa?.IdMesa ?? mesa?.idMesa ?? mesa?.id ?? mesa?.ID ?? null;
}

/**
 * Devuelve un objeto { key, label } para el estado de la mesa.
 * - Si el backend manda el nombre del estado, lo usa.
 * - Si solo hay ID, hace un mapeo básico de emergencia.
 */
export function getEstadoMesa(mesa) {
  const rawName =
    mesa?.NomEstadoMesa ??
    mesa?.nomEstadoMesa ??
    mesa?.EstadoMesa?.NomEstadoMesa ??
    mesa?.estado?.nombre ??
    mesa?.estado ?? null;

  const rawId =
    mesa?.IdEstadoMesa ?? mesa?.idEstadoMesa ?? mesa?.EstadoMesa?.IdEstadoMesa ?? mesa?.estadoId ?? null;

  const normalizar = (s) => String(s || "").toLowerCase();

  if (rawName) {
    const n = normalizar(rawName);
    if (n.includes("libre") || n.includes("dispon")) return { key: "libre", label: "Disponible" };
    if (n.includes("ocup")) return { key: "ocupada", label: "Ocupada" };
    if (n.includes("reserv")) return { key: "reservada", label: "Reservada" };
    if (n.includes("limp")) return { key: "limpieza", label: "En limpieza" };
  }

  // Fallback por ID (ajusta si tu catálogo usa otros IDs)
  switch (Number(rawId)) {
    case 1: return { key: "libre", label: "Disponible" };
    case 2: return { key: "ocupada", label: "Ocupada" };
    case 3: return { key: "reservada", label: "Reservada" };
    case 4: return { key: "limpieza", label: "En limpieza" };
    default: return { key: "libre", label: "Disponible" };
  }
}
