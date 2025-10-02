// ===== Config base =====
const API_HOST = "https://orderly-api-b53514e40ebd.herokuapp.com";

const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com".replace(/\/+$/,''); // sin slash final

function apiUrl(path) {
  // path debe empezar con "/" (p.ej. "/apiEmpleado/getDataEmpleado")
  return `${API_BASE}${path}`;
}


// Endpoints (ajústalos si tus rutas difieren)
const BASE_EMPLEADOS = `${API_HOST}/apiEmpleado`;
const BASE_PERSONA   = `${API_HOST}/apiPersona`;
const BASE_USUARIO   = `${API_HOST}/apiUsuario`;
const BASE_DOC       = `${API_HOST}/apiDocumentoIdentidad`;
const BASE_TIPODOC   = `${API_HOST}/apiTipoDocumento`;
const BASE_ROL       = `${API_HOST}/apiRol`;



// Listados
const URL_EMPLEADOS_LIST = (page = 0, size = 20) =>
  `${BASE_EMPLEADOS}/getDataEmpleado?page=${page}&size=${size}`;
const URL_EMPLEADO_BY_ID = (id) => `${BASE_EMPLEADOS}/getDataEmpleado/${id}`;

// Catálogos
const URL_TIPODOC_LIST = () => `${BASE_TIPODOC}/getDataTipoDocumento`;
const URL_ROL_LIST     = () => `${BASE_ROL}/getDataRol`;

// Creates
const URL_DOC_CREATE     = () => `${BASE_DOC}/createDocumentoIdentidad`;
const URL_PERSONA_CREATE = () => `${BASE_PERSONA}/createPersona`;
const URL_USUARIO_CREATE = () => `${BASE_USUARIO}/createUsuario`;
const URL_EMPLEADO_CREATE= () => `${BASE_EMPLEADOS}/createEmpleado`;

// Updates / Deletes
const URL_EMPLEADO_UPDATE = (id) => `${BASE_EMPLEADOS}/modificarEmpleado/${id}`;
const URL_EMPLEADO_DELETE = (id) => `${BASE_EMPLEADOS}/eliminarEmpleado/${id}`;

export {
  getEmpleados,
  getEmpleadoById,
  deleteEmpleado,
  getTiposDocumento,
  getRoles,
  createDocumentoIdentidad,
  createPersona,
  createUsuario,
  createEmpleado,
  updateEmpleado,
};

// ===== Helpers de auth/headers =====
function buildHeaders() {
  const h = { "Content-Type": "application/json" };
  const t = localStorage.getItem("token");
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// ===== CRUD empleados =====
async function getEmpleados(page = 0, size = 20, signal) {
  const url = apiUrl(`/apiEmpleado/getDataEmpleado?page=${encodeURIComponent(page)}&size=${encodeURIComponent(size)}`);
  const res = await fetch(url, {
    method: "GET",
    headers: { "Accept": "application/json" },
    // Si decides dejar /apiEmpleado protegido, agrega:
    // credentials: "include",
    signal
  });
  if (!res.ok) {
    const text = await res.text().catch(()=>"");
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}


async function getEmpleadoById(id) {
  const res = await fetch(URL_EMPLEADO_BY_ID(id), {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Empleado no encontrado");
  return await res.json();
}



// ===== Catálogos =====
async function getTiposDocumento() {
  const res = await fetch(`${API_HOST}/apiTipoDocumento/getDataTipoDocumento`, {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al cargar tipos de documento");
  return await res.json();
}


async function getRoles() {
  const res = await fetch(`${API_HOST}/apiRol/getDataRol`, {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al cargar roles");
  const data = await res.json();
  return Array.isArray(data?.content) ? data.content : []; // [{id, rol}]
}





// ===== Creates encadenados (Documento → Persona → Usuario → Empleado) =====

// ==== DOCUMENTO IDENTIDAD ====
async function createDocumentoIdentidad({ idTipoDocumento, numeroDocumento }) {
  const res = await fetch(`${API_HOST}/apiDocumentoIdentidad/createDocumentoIdentidad`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      // DTO de DocumentoIdentidad: idtipoDoc, numDoc
      idtipoDoc: Number(idTipoDocumento),
      numDoc: String(numeroDocumento).trim(),
    }),
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) throw new Error(`Error al crear Documento de Identidad (${res.status}): ${text}`);

  // Tus controllers devuelven a veces {status, data:{...}}
  return payload?.data ?? payload; // ← devolver obj con {id, idtipoDoc, numDoc}
}

// ==== PERSONA ====
async function createPersona(payload) {
  // PersonaController/DTO espera EXACTAMENTE: Pnombre, Snombre, ApellidoP, ApellidoM, FechaN, Direccion, IdDoc
  const res = await fetch(`${API_HOST}/apiPersona/createPersona`, {
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


// ===== Create Usuario (frontend) =====
async function createUsuario({ nombreusuario, contrasenia, correo, rolId }) {
  // Validación rápida en front para evitar 400/403 por @NotBlank
  const missing = [];
  if (!nombreusuario || !String(nombreusuario).trim()) missing.push("nombreusuario");
  if (!contrasenia || !String(contrasenia).trim())     missing.push("contrasenia");
  if (!correo || !String(correo).trim())               missing.push("correo");
  if (rolId === undefined || rolId === null || isNaN(Number(rolId))) missing.push("rolId");

  if (missing.length) {
    throw new Error(`Faltan campos obligatorios en createUsuario: ${missing.join(", ")}`);
  }

  const res = await fetch(URL_USUARIO_CREATE(), {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({
      // 👇 Nombres EXACTOS esperados por UsuarioDTO
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

  // Puede venir como {status, data:{...}} o directamente {...}
  return payload?.data ?? payload;
}



// empleadoService.js
async function createEmpleado({ idPersona, idUsuario, hireDate }) {
  const missing = [];
  if (idPersona === undefined || idPersona === null || isNaN(Number(idPersona))) missing.push("idPersona");
  if (idUsuario === undefined || idUsuario === null || isNaN(Number(idUsuario))) missing.push("idUsuario");
  if (!hireDate || !String(hireDate).trim()) missing.push("hireDate");
  if (missing.length) throw new Error(`Faltan campos en createEmpleado: ${missing.join(", ")}`);

  const res = await fetch(URL_EMPLEADO_CREATE(), {
    method: "POST",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify({
      idPersona: Number(idPersona),
      idUsuario: Number(idUsuario),
      hireDate:  String(hireDate).trim(), // formato "YYYY-MM-DDThh:mm" de <input type="datetime-local">
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

// ===== UPDATE (PUT) =====
async function updateEmpleado(id, payload) {
  const res = await fetch(`${BASE_EMPLEADOS}/modificarEmpleado/${id}`, {
    method: "PUT",
    headers: buildHeaders(),
    credentials: "include",
    body: JSON.stringify(payload), // { username?, email?, firstName?, ..., hireDate?, rolId? }
  });

  const text = await res.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }

  if (!res.ok) {
    // Propaga el detalle textual para toasts amigables
    throw new Error(text || `HTTP ${res.status}`);
  }
  return body?.data ?? body;
}

// ===== DELETE empleado (hard delete en backend) =====
async function deleteEmpleado(id) {
  const res = await fetch(`${API_HOST}/apiEmpleado/eliminarEmpleado/${id}`, {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });

  const text = await res.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }

  if (!res.ok) {
    const status = res.status;
    if (status === 401 || status === 403) {
      throw new Error("No tienes permisos para eliminar este empleado.");
    }
    if (status === 404) {
      throw new Error("El empleado no existe o ya fue eliminado.");
    }
    if (status === 409) {
      // típico: tiene pedidos/facturas referenciando
      throw new Error(payload?.error || "No se puede eliminar: el empleado tiene registros relacionados.");
    }
    throw new Error(payload?.error || payload?.message || "No se pudo eliminar el empleado.");
  }

  return payload?.data ?? true;
}



