// js/jsService/ServiceEmpleado.js
const API_BASE = "http://localhost:8080";

const API = {
  empleado: `${API_BASE}/apiEmpleado`,
  persona: `${API_BASE}/apiPersona`,
  usuario: `${API_BASE}/apiUsuario`,
  rol: `${API_BASE}/apiRol`,
  tipoDocumento: `${API_BASE}/apiTipoDocumento`,
  documentoIdentidad: `${API_BASE}/apiDocumentoIdentidad`,
};

async function http(url, options = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    ...options,
  });

  // 204: sin contenido
  if (res.status === 204) return null;

  // Lee como texto para detectar cuerpos vacíos o HTML de error
  const text = await res.text();

  if (!res.ok) {
    // Devuelve el texto crudo en el error para depurar fácilmente
    throw new Error(`${options.method || "GET"} ${url} :: ${res.status} :: ${text}`);
  }

  if (!text) return null; // 200 pero sin body → null

  // Intenta parsear JSON; si no es JSON válido, regresa texto
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
// ====== CATÁLOGOS ======
export async function getRoles(page = 0, size = 200) {
  const data = await http(`${API.rol}/getDataRol?page=${page}&size=${size}`);
  // Soporta: array directo, Page<...>, null/undefined
  return Array.isArray(data) ? data : (data?.content ?? []);
}

export async function getTiposDocumento(page = 0, size = 200) {
  const data = await http(`${API.tipoDocumento}/getDataTipoDocumento?page=${page}&size=${size}`);
  return Array.isArray(data) ? data : (data?.content ?? []);
}


// ====== EMPLEADOS ======
export async function getEmpleadosPage(page = 0, size = 10) {
  return http(`${API.empleado}/getDataEmpleado?page=${page}&size=${size}`);
}
export async function createEmpleado(dto) {
  return http(`${API.empleado}/createEmpleado`, { method: "POST", body: JSON.stringify(dto) });
}
export async function updateEmpleado(id, dto) {
  return http(`${API.empleado}/modificarEmpleado/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
export async function deleteEmpleado(id) {
  return http(`${API.empleado}/eliminarEmpleado/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ====== PERSONA ======
export async function getPersonasPage(page = 0, size = 1000) {
  return http(`${API.persona}/getDataPersona?page=${page}&size=${size}`);
}
export async function createPersona(dto) {
  return http(`${API.persona}/createPersona`, { method: "POST", body: JSON.stringify(dto) });
}
export async function updatePersona(id, dto) {
  return http(`${API.persona}/modificarPersona/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
export async function deletePersona(id) {
  return http(`${API.persona}/eliminarPersona/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ====== USUARIO ======
export async function getUsuariosPage(page = 0, size = 1000) {
  return http(`${API.usuario}/getDataUsuario?page=${page}&size=${size}`);
}
export async function createUsuario(dto) {
  return http(`${API.usuario}/createUsuario`, { method: "POST", body: JSON.stringify(dto) });
}
export async function updateUsuario(id, dto) {
  return http(`${API.usuario}/modificarUsuario/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
export async function deleteUsuario(id) {
  return http(`${API.usuario}/eliminarUsuario/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// ====== DOCUMENTO IDENTIDAD ======
export async function createDocumentoIdentidad(dto) {
  return http(`${API.documentoIdentidad}/createDocumentoIdentidad`, {
    method: "POST",
    body: JSON.stringify(dto),
  });
}
export async function updateDocumentoIdentidad(id, dto) {
  return http(`${API.documentoIdentidad}/modificarDocumentoIdentidad/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(dto),
  });
}
export async function getDocumentoIdentidadById(id) {
  return http(`${API.documentoIdentidad}/getDocumentoIdentidad/${encodeURIComponent(id)}`);
}
