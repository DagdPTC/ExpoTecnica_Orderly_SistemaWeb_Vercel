const API_BASE = "http://localhost:8080";
const BASE = `${API_BASE}/apiMesa`;

function normalize(resp) {
  if (!resp) return resp;
  if (Array.isArray(resp)) return resp.map(n => n);
  return resp;
}

export async function getMesas(page = 0, size = 50) {
  const url = `${BASE}/getDataMesa?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`;
  const res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`GET Mesas :: ${res.status}`);
  const data = await res.json();
  return normalize(data);
}

export async function createMesa(dto) {
  const res = await fetch(`${BASE}/createMesa`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error(`POST Mesa :: ${res.status}`);
  return res.json().catch(()=>true);
}

export async function updateMesa(id, dto) {
  const res = await fetch(`${BASE}/modificarMesa/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(dto)
  });
  if (!res.ok) throw new Error(`PUT Mesa ${id} :: ${res.status}`);
  return res.json().catch(()=>true);
}

export async function deleteMesa(id) {
  const res = await fetch(`${BASE}/eliminarMesa/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 204) return true;
  if (!res.ok) throw new Error(`DELETE Mesa ${id} :: ${res.status}`);
  return true;
}

export async function patchEstadoMesa(id, partialDto) {
  let res = await fetch(`${BASE}/modificarMesa/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(partialDto)
  });

  if (res.status === 405 || res.status === 501) {
    res = await fetch(`${BASE}/modificarMesa/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(partialDto)
    });
  }

  if (!res.ok) throw new Error(`PATCH/PUT Estado Mesa ${id} :: ${res.status}`);
  return res.json().catch(()=>partialDto);
}
