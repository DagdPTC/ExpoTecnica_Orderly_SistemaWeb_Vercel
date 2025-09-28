// ===== Config base =====
const API_HOST = "http://localhost:8080";

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
};

// ===== Helpers de auth/headers =====
function buildHeaders() {
  const h = { "Content-Type": "application/json" };
  const t = localStorage.getItem("token");
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

// ===== CRUD empleados =====
async function getEmpleados(page = 0, size = 20) {
  const res = await fetch(URL_EMPLEADOS_LIST(page, size), {
    method: "GET",
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error al obtener empleados");
  const data = await res.json();
  return Array.isArray(data?.content) ? data.content : [];
}

async function getEmpleadoById(id) {
  const res = await fetch(URL_EMPLEADO_BY_ID(id), {
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("Empleado no encontrado");
  return await res.json();
}

async function deleteEmpleado(id) {
  const res = await fetch(URL_EMPLEADO_DELETE(id), {
    method: "DELETE",
    headers: buildHeaders(),
    credentials: "include",
  });
  if (!res.ok) throw new Error("No se pudo eliminar");
  return true;
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





