// js/jsService/ServiceEmpleado.js

const API_BASE = "http://localhost:8080";

const API = {
  empleado: `${API_BASE}/apiEmpleado`,
  persona: `${API_BASE}/apiPersona`,
  usuario: `${API_BASE}/apiUsuario`,
  rol: `${API_BASE}/apiRol`,
  tipoDocumento: `${API_BASE}/apiTipoDocumento`,
  documentoIdentidad: `${API_BASE}/apiDocumentoIdentidad` // si no tienes este controller, igual no romperá
};

// Helper HTTP tolerante a respuestas vacías o null
async function http(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", "Content-Type": "application/json" },
    ...options
  });

  // Lee como texto SIEMPRE para evitar el error de json() con cuerpo vacío
  const raw = await res.text().catch(() => "");

  if (!res.ok) {
    // Propaga el texto de error del backend (si existe)
    throw new Error(`${options.method || "GET"} ${url} :: ${res.status} :: ${raw}`);
  }

  // 204 No Content o cuerpo vacío -> null
  if (res.status === 204 || raw === "" || raw === "null") return null;

  // Intenta parsear JSON; si no es JSON válido, devuelve el texto tal cual
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

// ======== Catálogos ========

export async function getRoles(page = 0, size = 200) {
  const data = await http(`${API.rol}/getDataRol?page=${page}&size=${size}`);
  // Los controllers pueden devolver Page<?> o null; normalizamos a []
  return Array.isArray(data) ? data : (data?.content ?? []);
}

export async function getTiposDocumento(page = 0, size = 200) {
  const data = await http(`${API.tipoDocumento}/getDataTipoDocumento?page=${page}&size=${size}`);
  return Array.isArray(data) ? data : (data?.content ?? []);
}

// ======== Empleado ========

export async function getEmpleadosPage(page = 0, size = 10) {
  const data = await http(`${API.empleado}/getDataEmpleado?page=${page}&size=${size}`);
  // Normaliza cuando el backend regresa 200 con cuerpo vacío
  return data ?? { content: [], totalElements: 0, number: page, size };
}

export async function createEmpleado(dto) {
  return http(`${API.empleado}/createEmpleado`, { method: "POST", body: JSON.stringify(dto) });
}

export async function updateEmpleado(id, dto) {
  return http(`${API.empleado}/modificarEmpleado/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto)
  });
}

export async function deleteEmpleado(id) {
  return http(`${API.empleado}/eliminarEmpleado/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ======== Persona ========

export async function getPersonasPage(page = 0, size = 1000) {
  const data = await http(`${API.persona}/getDataPersona?page=${page}&size=${size}`);
  return data ?? { content: [], totalElements: 0, number: page, size };
}

export async function createPersona(dto) {
  return http(`${API.persona}/createPersona`, { method: "POST", body: JSON.stringify(dto) });
}

export async function updatePersona(id, dto) {
  return http(`${API.persona}/modificarPersona/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto)
  });
}

export async function deletePersona(id) {
  return http(`${API.persona}/eliminarPersona/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ======== Usuario ========

export async function getUsuariosPage(page = 0, size = 1000) {
  const data = await http(`${API.usuario}/getDataUsuario?page=${page}&size=${size}`);
  return data ?? { content: [], totalElements: 0, number: page, size };
}

export async function createUsuario(dto) {
  return http(`${API.usuario}/createUsuario`, { method: "POST", body: JSON.stringify(dto) });
}

export async function updateUsuario(id, dto) {
  return http(`${API.usuario}/modificarUsuario/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto)
  });
}

export async function deleteUsuario(id) {
  return http(`${API.usuario}/eliminarUsuario/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ======== Documento Identidad (opcional si existe controller) ========

export async function createDocumentoIdentidad(dto) {
  return http(`${API.documentoIdentidad}/createDocumentoIdentidad`, {
    method: "POST",
    body: JSON.stringify(dto)
  });
}

export async function updateDocumentoIdentidad(id, dto) {
  return http(`${API.documentoIdentidad}/modificarDocumentoIdentidad/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto)
  });
}

export async function getDocumentoIdentidadById(id) {
  return http(`${API.documentoIdentidad}/getDocumentoIdentidad/${encodeURIComponent(id)}`);
}
