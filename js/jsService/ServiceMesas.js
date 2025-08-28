import { API } from "./apiConfig.js";

function normalizaMesa(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    Id: raw.Id ?? raw.id ?? raw.idMesa ?? null,
    NomMesa: raw.NomMesa ?? raw.nomMesa ?? raw.nombre ?? null,
    IdTipoMesa:
      raw.IdTipoMesa ?? raw.idTipoMesa ?? raw.tipoMesaId ?? raw?.tipoMesa?.IdTipoMesa ?? raw?.tipoMesa?.idTipoMesa ?? null,
    IdEstadoMesa:
      raw.IdEstadoMesa ?? raw.idEstadoMesa ?? raw.estadoMesaId ?? raw?.estadoMesa?.IdEstadoMesa ?? raw?.estadoMesa?.idEstadoMesa ?? null,
    Numero: raw.Numero ?? raw.number ?? null,
    ...raw,
  };
}

export async function getMesas(page = 0, size = 50) {
  const url = `${API.mesa}/getDataMesa?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET Mesas: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const content = Array.isArray(data?.content) ? data.content.map(normalizaMesa).filter(Boolean) : [];
  return content;
}

export async function patchEstadoMesa(id, estadoId) {
  const url = `${API.mesa}/estado/${encodeURIComponent(id)}/${encodeURIComponent(estadoId)}`;
  const res = await fetch(url, { method: "PATCH", headers: { Accept: "application/json" } });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Respuesta backend (PATCH estado):", text);
    throw new Error(`PATCH estado mesa ${id}: ${res.status} ${res.statusText}`);
  }
  if (!text) return { Id: Number(id), IdEstadoMesa: Number(estadoId) }; 
  try { return normalizaMesa(JSON.parse(text)); } catch { return { Id: Number(id), IdEstadoMesa: Number(estadoId) }; }
}

export async function putMesaCompleta(id, dtoActual, nuevoEstadoId) {
  const payload = {
    Id: dtoActual.Id,
    NomMesa: dtoActual.NomMesa,
    IdTipoMesa: dtoActual.IdTipoMesa,
    IdEstadoMesa: nuevoEstadoId,
  };
  const res = await fetch(`${API.mesa}/modificarMesa/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    console.error("Respuesta backend (PUT mesa):", text);
    throw new Error(`PUT Mesa ${id}: ${res.status} ${res.statusText}`);
  }
  if (!text) return payload; 
  try { return normalizaMesa(JSON.parse(text)); } catch { return payload; }
}
