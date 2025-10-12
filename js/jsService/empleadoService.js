// js/jsService/empleadoService.js
// Servicio ONLINE para Empleados/Persona/Usuario/Documento (Heroku)

const API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";
const API_BASE = API_HOST.replace(/\/+$/, "");

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

// Endpoints base
const BASE_EMPLEADOS = `${API_HOST}/apiEmpleado`;
const BASE_PERSONA   = `${API_HOST}/apiPersona`;
const BASE_USUARIO   = `${API_HOST}/apiUsuario`;
const BASE_DOC       = `${API_HOST}/apiDocumentoIdentidad`;
const BASE_TIPODOC   = `${API_HOST}/apiTipoDocumento`;
const BASE_ROL       = `${API_HOST}/apiRol`;

// Helpers
function buildHeaders() {
  const h = { "Content-Type": "application/json" };
  const t = localStorage.getItem("token");
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// ===== CRUD empleados (ONLINE) =====
export async function getEmpleados(page = 0, size = 20, signal) {
  const url = `${BASE_EMPLEADOS}/getDataEmpleado?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}&_=${Date.now()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { ...buildHeaders(), "Accept": "application/json" },
    credentials: "include",
    cache: "no-store",
    signal,
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText} ${text}`);

  let raw;
  try { raw = text ? JSON.parse(text) : {}; } catch { raw = {}; }

  // 🔁 Normaliza a arreglo
  const list =
    Array.isArray(raw) ? raw :
    Array.isArray(raw?.content) ? raw.content :
    Array.isArray(raw?.data) ? raw.data :
    Array.isArray(raw?.data?.content) ? raw.data.content :
    [];

  return list;
}


export async function getEmpleadoById(id) {
  const res = await fetch(`${BASE_EMPLEADOS}/getDataEmpleado/${id}?_=${Date.now()}`, {
    headers: buildHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Empleado no encontrado");
  return res.json();
}

// ===== Catálogos =====
export async function getTiposDocumento() {
  const res = await fetch(`${BASE_TIPODOC}/getDataTipoDocumento?_=${Date.now()}`, {
    headers: buildHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al cargar tipos de documento");
  return res.json();
}

export async function getRoles() {
  const res = await fetch(`${BASE_ROL}/getDataRol?_=${Date.now()}`, {
    headers: buildHeaders(),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Error al cargar roles");
  const data = await res.json();
  // Soporta tanto {content:[...]} como arreglo plano
  return Array.isArray(data?.content) ? data.content : (Array.isArray(data) ? data : []);
}

// ===== Creates encadenados =====
export async function createDocumentoIdentidad({ idTipoDocumento, numeroDocumento }) {
  const res = await fetch(`${BASE_DOC}/createDocumentoIdentidad`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      idtipoDoc: Number(idTipoDocumento),
      numDoc: String(numeroDocumento).trim(),
    }),
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) throw new Error(`Error al crear Documento de Identidad (${res.status}): ${text}`);
  return payload?.data ?? payload; // { id, idtipoDoc, numDoc } o {data:{...}}
}

export async function createPersona(payload /* {pnombre,snombre,apellidoP,apellidoM,fechaN,direccion,IdDoc} */) {
  const res = await fetch(`${BASE_PERSONA}/createPersona`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Error createPersona:", res.status, text);
    throw new Error("Error al crear Persona");
  }
  return text ? JSON.parse(text) : {};
}

export async function createUsuario({ nombreusuario, contrasenia, correo, rolId }) {
  const missing = [];
  if (!nombreusuario || !String(nombreusuario).trim()) missing.push("nombreusuario");
  if (!contrasenia || !String(contrasenia).trim())     missing.push("contrasenia");
  if (!correo || !String(correo).trim())               missing.push("correo");
  if (rolId === undefined || rolId === null || isNaN(Number(rolId))) missing.push("rolId");
  if (missing.length) throw new Error(`Faltan campos obligatorios en createUsuario: ${missing.join(", ")}`);

  const res = await fetch(`${BASE_USUARIO}/createUsuario`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({
      nombreusuario: String(nombreusuario).trim(),
      contrasenia:   String(contrasenia).trim(),
      correo:        String(correo).trim(),
      rolId:         Number(rolId),
    }),
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) {
    console.error("Error createUsuario:", res.status, text);
    throw new Error(`Error al crear Usuario (${res.status}): ${text || "Respuesta vacía"}`);
  }
  return payload?.data ?? payload;
}

export async function createEmpleado({ idPersona, idUsuario, hireDate }) {
  const missing = [];
  if (idPersona === undefined || idPersona === null || isNaN(Number(idPersona))) missing.push("idPersona");
  if (idUsuario === undefined || idUsuario === null || isNaN(Number(idUsuario))) missing.push("idUsuario");
  if (!hireDate || !String(hireDate).trim()) missing.push("hireDate");
  if (missing.length) throw new Error(`Faltan campos en createEmpleado: ${missing.join(", ")}`);

  const res = await fetch(`${BASE_EMPLEADOS}/createEmpleado`, {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({
      idPersona: Number(idPersona),
      idUsuario: Number(idUsuario),
      hireDate:  String(hireDate).trim(), // "YYYY-MM-DDTHH:mm[:ss]"
    }),
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) {
    console.error("Error createEmpleado:", res.status, text);
    throw new Error(`Error al crear Empleado (${res.status}): ${text || "Respuesta vacía"}`);
  }
  return payload?.data ?? payload;
}

// ===== UPDATE / DELETE =====
export async function updateEmpleado(id, payload) {
  const res = await fetch(`${BASE_EMPLEADOS}/modificarEmpleado/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload), // { username?, email?, firstName?, ..., hireDate?, rolId? }
  });

  const text = await res.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }

  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  return body?.data ?? body;
}

export async function deleteEmpleado(id) {
  const res = await fetch(`${BASE_EMPLEADOS}/eliminarEmpleado/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) {
    const status = res.status;
    if (status === 401 || status === 403) throw new Error("No tienes permisos para eliminar este empleado.");
    if (status === 404) throw new Error("El empleado no existe o ya fue eliminado.");
    if (status === 409) throw new Error(payload?.error || "No se puede eliminar: el empleado tiene registros relacionados.");
    throw new Error(payload?.error || payload?.message || "No se pudo eliminar el empleado.");
  }
  return payload?.data ?? true;
}
