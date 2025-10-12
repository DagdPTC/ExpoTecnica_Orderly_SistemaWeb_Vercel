// js/jsControllers/empleadoController.js
// Controlador de Empleados: lista, detalles, acciones y creación con modal

import {
  // Listado / lectura
  getEmpleados,
  getEmpleadoById,
  // Acciones
  deleteEmpleado,
  // Catálogos
  getRoles,
  getTiposDocumento,
  // Create encadenado
  createDocumentoIdentidad,
  createPersona,
  createUsuario,
  createEmpleado,
  updateEmpleado,
} from "../jsService/empleadoService.js";

// -------------------- Utilidades --------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function esc(x) {
  return String(x ?? "").replace(/[&<>"']/g, (s) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}
function cell(label, value) {
  return `
    <div class="flex flex-col">
      <span class="text-xs text-gray-500">${label}</span>
      <span class="text-sm">${esc(value ?? "N/A")}</span>
    </div>
  `;
}

// -------------------- Render de tabla --------------------
const tbody = $("#employees-tbody") || $("#empleados-tbody") || $("tbody");

// dataset global (para filtros/orden)
let EMP_DATA = [];
let ROLE_FILTERS = new Set(["all"]); // por defecto "todos"

function rowEmpleado(e) {
  const nombre = `${e.firstName ?? "—"} ${e.lastNameP ?? ""}`.trim();
  return `
  <tr class="border-b last:border-0">
    <td class="py-3 px-4">${esc(nombre)}</td>
    <td class="py-3 px-4">${esc(e.username)}</td>
    <td class="py-3 px-4">${esc(e.email)}</td>
    <td class="py-3 px-4">${esc(e.role)}</td>

    <td class="py-3 px-4">
      <button class="toggle-details inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
              data-id="${e.id}">
        <span>Detalles</span>
        <i class="fa-solid fa-angle-down transition-transform"></i>
      </button>
    </td>

    <td class="py-3 px-4">
      <div class="flex items-center gap-2">
        <button class="edit-btn h-8 w-8 grid place-items-center rounded-md border border-gray-300 hover:bg-gray-100"
                title="Editar" data-id="${e.id}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="delete-btn h-8 w-8 grid place-items-center rounded-md border border-gray-300 hover:bg-gray-100 text-red-600"
                title="Eliminar" data-id="${e.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </td>
  </tr>

  <tr class="details-row hidden bg-gray-50/60">
    <td class="py-3 px-4" colspan="6">
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 text-gray-800">
        ${cell("Segundo Nombre", e.secondName || "N/A")}
        ${cell("Apellido Materno", e.lastNameM || "N/A")}
        ${cell("Fecha de Nacimiento", e.birthDate || "N/A")}
        ${cell("Teléfono", "N/A")}
        ${cell("Documento", `${e.docType ?? "N/A"} ${e.docNumber ?? ""}`.trim())}
        ${cell("Fecha Contratación", e.hireDate || "N/A")}
        ${cell("Dirección", e.address || "N/A")}
      </div>
    </td>
  </tr>`;
}

function applyFiltersAndRender() {
  if (!tbody) return;

  const q = ($("#searchInput")?.value || "").trim().toLowerCase();
  const wantsAll = ROLE_FILTERS.has("all");

  const filtered = EMP_DATA.filter(e => {
    // filtro por rol usando el texto tal como lo pintas en tabla
    const roleOk = wantsAll || ROLE_FILTERS.has(String(e.role || "").toUpperCase());

    if (!q) return roleOk;

    const bag = [
      e.firstName, e.secondName, e.lastNameP, e.lastNameM,
      e.username, e.email, e.role,
      e.docType, e.docNumber, e.address,
      e.hireDate, e.birthDate
    ].map(x => String(x || "").toLowerCase());

    const match = bag.some(x => x.includes(q));
    return roleOk && match;
  });

  tbody.innerHTML = filtered.map(rowEmpleado).join("");
}

export async function cargarTabla(page = 0, size = 20) {
  try {
    blockUI("Cargando empleados...");
    const data = await getEmpleados(page, size);
    EMP_CACHE = Array.isArray(data) ? data : [];
    renderEmpleados(EMP_CACHE);
    setupEmployeeFilters();
    setupUserMenu(); // asegura el menú usuario
  } catch (e) {
    console.error("Error cargando empleados:", e);
    showToast("error", "No se pudo cargar empleados", e.message || "");
  } finally {
    unblockUI();
  }
}




// -------------------- Delegación de eventos tabla --------------------
document.addEventListener("click", async (ev) => {
  // Abrir/cerrar detalles
  const tgl = ev.target.closest(".toggle-details");
  if (tgl) {
    const tr = tgl.closest("tr");
    const chevron = tgl.querySelector(".fa-angle-down");
    const details = tr?.nextElementSibling;
    if (details?.classList.contains("details-row")) {
      details.classList.toggle("hidden");
      chevron?.classList.toggle("rotate-180");
    }
    return;
  }

  // Editar (engancha tu modal existente si ya lo tienes)
  // Editar
  // Editar usando el MISMO modal de create
  // Editar usando el MISMO modal de create, SIN llamar a get-by-id
  // Editar usando el MISMO modal de create, SIN llamar a get-by-id
  const edit = ev.target.closest(".edit-btn");
  if (edit) {
    const id = Number(edit.dataset.id);
    try {
      const tr = edit.closest("tr");                  // fila principal
      const details = tr?.nextElementSibling;         // fila detalles (ya existe aunque esté hidden)

      // --- Extraer valores de la tabla ---
      const tds = tr.querySelectorAll("td");
      const nombreTxt = (tds[0]?.textContent || "").trim(); // "Carlos Gomez"
      const partes = nombreTxt.split(/\s+/);
      const firstName = partes.shift() || "";
      const lastNameP = partes.join(" ") || "";

      const username = (tds[1]?.textContent || "").trim();
      const email = (tds[2]?.textContent || "").trim();
      const roleText = (tds[3]?.textContent || "").trim();

      // En la fila details, los "cell()" están en este orden:
      // 0: Segundo Nombre, 1: Apellido Materno, 2: Fecha de Nacimiento,
      // 3: Teléfono (N/A), 4: Documento (tipo + número), 5: Fecha Contratación, 6: Dirección
      const info = [...(details?.querySelectorAll(".grid .text-sm") || [])].map(el => el.textContent.trim());

      const secondName = info[0] || "";
      const lastNameM = info[1] || "";
      const birthDate = (info[2] && info[2] !== "N/A") ? info[2] : ""; // yyyy-MM-dd
      const docStr = info[4] || "";                                 // "DUI 12345678-9"
      const hireDate = (info[5] && info[5] !== "N/A") ? info[5] : ""; // ISO o vacío
      const address = info[6] || "";

      const [docType, ...restDoc] = docStr.split(/\s+/);
      const docNumber = restDoc.join(" ").trim();

      const emp = {
        id,
        username,
        email,
        firstName,
        secondName,
        lastNameP,
        lastNameM,
        address,
        birthDate,
        docType,
        docNumber,
        hireDate,
        role: roleText,
      };

      await openEditUsingCreateModal(emp);
    } catch (e) {
      console.error(e);
      toast("error", "No se pudo abrir la edición", "Inténtalo nuevamente.");
    }
    return;
  }

  const del = ev.target.closest(".delete-btn");
  if (del) {
    const id = del.dataset.id;

    const ok = await confirmDialog({
      title: "Eliminar empleado",
      message: "¿Seguro que deseas eliminar este empleado? Esta acción no se puede deshacer.",
      okText: "Eliminar",
      cancelText: "Cancelar",
    });
    if (!ok) return;

    try {
      blockUI("Eliminando registro...");
      await deleteEmpleado(id);
      toast("success", "Empleado eliminado", "El registro se eliminó correctamente.");
      await cargarTabla(); // refresca lista
    } catch (e) {
      toast("error", "No se pudo eliminar", e.message || "Inténtalo de nuevo.");
    } finally {
      unblockUI();
    }
  }
});

// -------------------- Botón "Nuevo Empleado" --------------------
function btnNuevoEmpleado() {
  return document.getElementById("btn-nuevo-empleado")
    || document.querySelector('[data-action="nuevo-empleado"]')
    || [...document.querySelectorAll("button,a,[role='button']")]
      .find(el => /nuevo\s+empleado/i.test(el.textContent || ""));
}

document.addEventListener("DOMContentLoaded", () => {
  cargarTabla();
  const btn = btnNuevoEmpleado();
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openCreateModal(); });
});

function ensureCreateModal() {
  let modal = document.getElementById("modal-create-employee");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "modal-create-employee";
  modal.className = "fixed inset-0 z-[100] hidden";

  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/40" data-overlay="true"></div>
    <div class="relative w-full h-full flex items-start md:items-center justify-center p-4 md:p-6">
      <div class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="text-lg font-semibold">Nuevo empleado</h3>
          <button type="button" class="btn-close text-gray-500 hover:text-gray-700" title="Cerrar" aria-label="Cerrar">
            <i class="fa-solid fa-xmark text-xl pointer-events-none"></i>
          </button>
        </div>

        <div class="max-h-[85vh] overflow-y-auto">
          <form id="form-create-employee" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label class="block text-sm text-gray-600 mb-1">Primer Nombre</label>
              <input name="firstName" class="w-full border rounded-lg px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Segundo Nombre</label>
              <input name="secondName" class="w-full border rounded-lg px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Apellido Paterno</label>
              <input name="lastNameP" class="w-full border rounded-lg px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Apellido Materno</label>
              <input name="lastNameM" class="w-full border rounded-lg px-3 py-2" required>
            </div>

            <div>
              <label class="block text-sm text-gray-600 mb-1">Fecha de Nacimiento</label>
              <input name="birthDate" type="date" class="w-full border rounded-lg px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Dirección</label>
              <input name="address" class="w-full border rounded-lg px-3 py-2" required>
            </div>

            <div>
              <label class="block text-sm text-gray-600 mb-1">Tipo Documento</label>
              <select name="docTypeId" id="sel-tipo-doc" class="w-full border rounded-lg px-3 py-2" required></select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Número Documento</label>
              <input name="docNumber" id="inp-doc-num" class="w-full border rounded-lg px-3 py-2" required placeholder="—">
              <small id="doc-help" class="text-xs text-gray-500"></small>
            </div>

            <div>
              <label class="block text-sm text-gray-600 mb-1">Usuario</label>
              <input name="username" class="w-full border rounded-lg px-3 py-2" required>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Correo</label>
              <input name="email" type="email" class="w-full border rounded-lg px-3 py-2" required>
            </div>

            <div>
              <label class="block text-sm text-gray-600 mb-1">Rol</label>
              <select name="roleId" id="sel-rol" class="w-full border rounded-lg px-3 py-2" required></select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">Fecha Contratación</label>
              <input name="hireDate" type="datetime-local" class="w-full border rounded-lg px-3 py-2" required>
            </div>

            <div class="md:col-span-2 flex justify-end gap-3 pt-4">
              <button type="button" class="btn-cancel px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Cancelar</button>
              <button type="submit" class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // -------- Cierre (overlay / X / Cancelar / Esc) --------
  const close = () => {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  };

  // overlay
  modal.querySelector('[data-overlay="true"]').addEventListener("click", close);
  // botón X (asegura cerrar aunque el clic sea sobre el <i>)
  const btnClose = modal.querySelector(".btn-close");
  btnClose.addEventListener("click", (e) => { e.preventDefault(); close(); });

  // botón cancelar
  modal.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-cancel")) close();
  });

  // tecla ESC
  document.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("hidden") && e.key === "Escape") close();
  });

  // Submit (create); para editar reusamos el mismo formulario pero
  // interceptamos el submit en openEditUsingCreateModal(...)
  modal.querySelector("#form-create-employee").addEventListener("submit", onSubmitCreate);

  return modal;
}


// Limpia todos los campos del modal de "Nuevo empleado" sin tocar listeners ni cierres
function resetCreateModalFields() {
  const modal = document.getElementById("modal-create-employee");
  if (!modal) return;

  const form = modal.querySelector("#form-create-employee");
  if (!form) return;

  // 1) reset general del formulario
  form.reset();

  // 2) limpiar manualmente por si algún valor quedó seteado por JS
  const names = [
    "firstName","secondName","lastNameP","lastNameM",
    "birthDate","address","docNumber","username","email","hireDate"
  ];
  for (const n of names) {
    if (form.elements[n]) form.elements[n].value = "";
  }

  // 3) selects a primera opción visible (si ya están cargados)
  const selDoc = form.querySelector("#sel-tipo-doc");
  const selRol = form.querySelector("#sel-rol");
  if (selDoc && selDoc.options.length) selDoc.selectedIndex = 0;
  if (selRol && selRol.options.length) selRol.selectedIndex = 0;

  // 4) texto de ayuda del documento
  const help = form.querySelector("#doc-help");
  if (help) help.textContent = "";

  // 5) si usas título/botón en el header, los dejamos en modo "crear" (no afecta edición)
  const title = modal.querySelector(".border-b h3, #emp-modal-title");
  const btn   = form.querySelector('button[type="submit"]');
  if (title) title.textContent = "Nuevo empleado";
  if (btn)   btn.textContent   = "Guardar";
}

// Abre el modal de "Nuevo empleado" y lo garantiza VACÍO
function openCreateModal() {
  const modal = ensureCreateModal();     // tu función existente
  resetCreateModalFields();              // ← aquí lo vaciamos SIEMPRE
  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  // re-inicializa combos/máscaras/límites (no modifica listeners de cierre/edición)
  initCreateForm();

  // foco inicial
  setTimeout(() => modal.querySelector('input[name="firstName"]')?.focus(), 50);
}


// -------------------- Carga de combos + máscaras --------------------
// Carga combos (Tipos de documento y Roles) + máscara/validación del número de doc
async function initCreateForm() {
  const form = document.getElementById("form-create-employee");
  const selDoc = document.getElementById("sel-tipo-doc");
  const selRol = document.getElementById("sel-rol");
  const inpDoc = document.getElementById("inp-doc-num");
  const help = document.getElementById("doc-help");
  const btnSubmit = form?.querySelector('button[type="submit"]');

  if (btnSubmit) btnSubmit.disabled = true;

  try {
    const [tiposDoc, roles] = await Promise.all([getTiposDocumento(), getRoles()]);

    selDoc.innerHTML = (tiposDoc || []).map(td =>
      `<option value="${td.idTipoDoc}">${td.tipoDoc}</option>`
    ).join("");

    selRol.innerHTML = (roles || []).map(r =>
      `<option value="${r.id}">${r.rol}</option>`
    ).join("");

    // Máscara según el tipo de documento
    const applyMask = () => {
      const label = (selDoc.options[selDoc.selectedIndex]?.text || "").toUpperCase();
      inpDoc.value = "";

      if (label.includes("DUI")) {
        help.textContent = "Formato: ########-#";
        inpDoc.maxLength = 10;
        inpDoc.placeholder = "01234567-8";
        inpDoc.pattern = "^\\d{8}-\\d$";
        inpDoc.oninput = () => {
          let v = inpDoc.value.replace(/\D/g, "").slice(0, 9);
          if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8);
          inpDoc.value = v;
        };
      } else if (label.includes("NIT")) {
        help.textContent = "Formato: ####-######-###-#";
        inpDoc.maxLength = 17;
        inpDoc.placeholder = "0614-111111-001-0";
        inpDoc.pattern = "^\\d{4}-\\d{6}-\\d{3}-\\d$";
        inpDoc.oninput = () => {
          let v = inpDoc.value.replace(/\D/g, "").slice(0, 14);
          if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4);
          if (v.length > 11) v = v.slice(0, 11) + "-" + v.slice(11);
          if (v.length > 15) v = v.slice(0, 15) + "-" + v.slice(15);
          inpDoc.value = v;
        };
      } else if (label.includes("PASAP")) {
        help.textContent = "Alfanumérico (máx. 9), sin guiones";
        inpDoc.maxLength = 9;
        inpDoc.placeholder = "A12345678";
        inpDoc.removeAttribute("pattern");
        inpDoc.oninput = () => {
          inpDoc.value = inpDoc.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
        };
      } else {
        help.textContent = "";
        inpDoc.placeholder = "—";
        inpDoc.removeAttribute("pattern");
        inpDoc.oninput = null;
        inpDoc.removeAttribute("maxLength");
      }
    };
    selDoc.onchange = applyMask;
    applyMask();

    // === límites/validaciones de fechas ===
    const inpBirth = form?.querySelector('input[name="birthDate"]');
    const inpHire  = form?.querySelector('input[name="hireDate"]');

    // nacimiento: debe ser mayor o igual a 18 años
    if (inpBirth) inpBirth.max = minusYearsYYYYMMDD(18);

    // contratación: máximo = AHORA (no permite horas futuras de hoy)
    if (inpHire) {
      const nowMax = nowLocalYYYYMMDDTHHMM(); // yyyy-MM-ddTHH:mm
      inpHire.max = nowMax;
      // si el valor actual excede ahora, recórtalo
      if (inpHire.value && !isHireDateNotFuture(inpHire.value)) {
        inpHire.value = nowMax;
      }
    }

    inpBirth?.addEventListener("change", () => {
      if (!isBirthDateAdult(inpBirth.value)) {
        toast("warning", "Fecha inválida", "La persona debe tener 18 años o más.");
        inpBirth.value = minusYearsYYYYMMDD(18);
      }
    });

    // valida contra AHORA (minuto actual)
    inpHire?.addEventListener("change", () => {
      if (!isHireDateNotFuture(inpHire.value)) {
        toast("warning", "Fecha inválida", "La contratación no puede ser futura.");
        inpHire.value = nowLocalYYYYMMDDTHHMM();
      }
    });
  } catch (err) {
    console.error("initCreateForm error:", err);
    toast("error", "No se pudieron cargar Tipos de documento / Roles", "Revisa la API.");
  } finally {
    if (btnSubmit) btnSubmit.disabled = false;
  }
}





// -------------------- Submit: CREATE encadenado --------------------
// -------------------- Submit: CREATE encadenado --------------------
async function onSubmitCreate(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true; // evita doble submit

  try {
    showBlock("Creando empleado...");

    const fd = new FormData(form);
    const v = Object.fromEntries(fd.entries());

    // 0) Password temporal
    const tempPass = `${(v.firstName || "").toLowerCase()}${(v.lastNameP || "").toLowerCase()}123`;

    // 1) Documento Identidad
    const doc = await createDocumentoIdentidad({
      idTipoDocumento: Number(v.docTypeId),
      numeroDocumento: String(v.docNumber || "").trim(),
    });

    const idDocumento =
      doc?.data?.id ??
      doc?.data?.IdDocumento ??
      doc?.id ??
      doc?.IdDocumento;

    if (!idDocumento) {
      console.debug("Respuesta createDocumentoIdentidad:", doc);
      throw new Error("No se recibió IdDocumento de la API");
    }

    // 2) Persona
    const personaPayload = {
      pnombre:   String(v.firstName || "").trim(),
      snombre:   String(v.secondName || "").trim(),
      apellidoP: String(v.lastNameP || "").trim(),
      apellidoM: String(v.lastNameM || "").trim(),
      fechaN:    String(v.birthDate || "").trim(), // yyyy-MM-dd
      direccion: String(v.address || "").trim(),
      IdDoc:     Number(idDocumento),
    };
    const persona = await createPersona(personaPayload);
    const idPersona =
      persona?.data?.id ??
      persona?.data?.IdPersona ??
      persona?.id ??
      persona?.IdPersona;
    if (!idPersona) throw new Error("No se recibió IdPersona de la API");

    // 3) Usuario
    const usuarioPayload = {
      nombreusuario: String(v.username || "").trim(),
      contrasenia:   String(tempPass),
      correo:        String(v.email || "").trim(),
      rolId:         Number(v.roleId),
    };
    const usuario = await createUsuario(usuarioPayload);
    const idUsuario =
      usuario?.data?.id ??
      usuario?.data?.UsuarioId ??
      usuario?.id ??
      usuario?.UsuarioId;
    if (!idUsuario) throw new Error("No se recibió UsuarioId de la API");

    // 4) Empleado
    const hireLocal = String(v.hireDate || "").trim();
    const hireIso   = hireLocal && hireLocal.length === 16 ? `${hireLocal}:00` : hireLocal;

    await createEmpleado({
      idPersona: Number(idPersona),
      idUsuario: Number(idUsuario),
      hireDate:  hireIso,
    });

    // 5) Cerrar modal, refrescar y avisar
    const modal = document.getElementById("modal-create-employee");
    if (modal) {
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
    await cargarTabla(); // al recargar se ordena con los nuevos arriba

    toast("success", "Empleado creado", `Usuario: ${v.username} • Contraseña temporal: ${tempPass}`);
  } catch (err) {
    console.error("onSubmitCreate error:", err);
    const friendly = mapBackendErrorToMessage(err?.message || "");
    toast("error", "No se pudo crear el empleado", friendly);
  } finally {
    if (btn) btn.disabled = false;
    hideBlock();
  }
}






function genTempPassword() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";
  let out = "";
  for (let i = 0; i < 12; i++) out += A[Math.floor(Math.random() * A.length)];
  return out;
}






// ==================== EDITAR reusando el modal de CREATE ====================
// ==================== EDITAR reusando el modal de CREATE ====================
async function openEditUsingCreateModal(emp) {
  // 1) Abre tu propio modal de create
  const modal = ensureCreateModal();
  modal.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");

  // 2) Asegura combos y máscaras (usa tu función existente)
  await initCreateForm();

  // 3) Cambia título y botón
  const h3 = modal.querySelector("h3");
  const f = document.getElementById("form-create-employee");
  const btnSubmit = f.querySelector('button[type="submit"]');
  const oldBtnText = btnSubmit?.textContent;
  if (h3) h3.textContent = "Editar empleado";
  if (btnSubmit) btnSubmit.textContent = "Actualizar";

  // 4) Rellena campos
  f.elements.firstName.value  = emp.firstName   || "";
  f.elements.secondName.value = emp.secondName  || "";
  f.elements.lastNameP.value  = emp.lastNameP   || "";
  f.elements.lastNameM.value  = emp.lastNameM   || "";
  f.elements.birthDate.value  = emp.birthDate   || "";
  f.elements.address.value    = emp.address     || "";
  f.elements.username.value   = emp.username    || "";
  f.elements.email.value      = emp.email       || "";
  f.elements.hireDate.value   = emp.hireDate ? String(emp.hireDate).slice(0,16) : "";

  const selDoc = document.getElementById("sel-tipo-doc");
  const selRol = document.getElementById("sel-rol");
  const inpDoc = document.getElementById("inp-doc-num");

  // Preselección DOC por texto visible
  if (selDoc && emp.docType) {
    const opt = [...selDoc.options].find(o => (o.text || "").toUpperCase() === String(emp.docType).toUpperCase());
    if (opt) selDoc.value = opt.value;
  }
  if (inpDoc) inpDoc.value = emp.docNumber || "";

  // Preselección ROL por texto visible
  if (selRol && emp.role) {
    const optR = [...selRol.options].find(o => (o.text || "").toUpperCase() === String(emp.role).toUpperCase());
    if (optR) selRol.value = optR.value; // id del rol en value
  }

  // 5) Intercepta el submit SOLO en este modo para llamar PUT y no el POST encadenado
  const onSubmitEditCapture = async (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    e.stopPropagation();

    // Validaciones duras antes del PUT
    if (!isBirthDateAdult(f.elements.birthDate.value)) {
      toast("error", "Fecha de nacimiento inválida", "La persona debe tener 18 años o más.");
      return;
    }
    if (!isHireDateNotFuture(f.elements.hireDate.value)) {
      toast("error", "Fecha de contratación inválida", "No puede ser una fecha futura.");
      return;
    }

    const payload = {
      // Usuario
      username:  f.elements.username.value?.trim() || undefined,
      email:     f.elements.email.value?.trim()    || undefined,
      // Persona
      firstName:  f.elements.firstName.value?.trim()  || undefined,
      secondName: f.elements.secondName.value?.trim() || undefined,
      lastNameP:  f.elements.lastNameP.value?.trim()  || undefined,
      lastNameM:  f.elements.lastNameM.value?.trim()  || undefined,
      address:    f.elements.address.value?.trim()    || undefined,
      birthDate:  f.elements.birthDate.value || undefined,  // yyyy-MM-dd
      // Documento
      docType:   selDoc?.options[selDoc.selectedIndex]?.text || undefined,
      docNumber: inpDoc?.value?.trim() || undefined,
      // Empleado
      hireDate:  (f.elements.hireDate.value && f.elements.hireDate.value.length === 16)
                  ? `${f.elements.hireDate.value}:00` : (f.elements.hireDate.value || undefined),
      // Rol (si backend lo admite)
      rolId:     selRol ? Number(selRol.value) : undefined,
    };

    try {
      showBlock("Actualizando empleado...");
      await updateEmpleado(emp.id, payload);
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
      await cargarTabla();
      toast("success", "Empleado actualizado", "Los cambios se guardaron correctamente.");
    } catch (err) {
      console.error(err);
      const raw = (err && err.message) || "";
      const friendly = mapBackendErrorToMessage(raw);
      toast("error", "No se pudo actualizar", friendly);
    } finally {
      hideBlock();
      // Restaurar estado del modal para futuros "crear"
      f.removeEventListener("submit", onSubmitEditCapture, true);
      if (btnSubmit && oldBtnText) btnSubmit.textContent = oldBtnText;
      if (h3) h3.textContent = "Nuevo empleado";
    }
  };

  f.addEventListener("submit", onSubmitEditCapture, { once: true, capture: true });
}



// ======================== TOASTS ========================
function ensureToastContainer() {
  let c = document.getElementById("toast-container");
  if (c) return c;
  c = document.createElement("div");
  c.id = "toast-container";
  c.className = "fixed z-[9999] bottom-4 right-4 flex flex-col gap-2";
  document.body.appendChild(c);
  return c;
}
function toast(type = "info", title = "", msg = "", ms = 3500) {
  const c = ensureToastContainer();
  const colors = {
    success: "bg-green-600",
    error:   "bg-red-600",
    warning: "bg-amber-600",
    info:    "bg-blue-600",
  };
  const el = document.createElement("div");
  el.className = `text-white px-4 py-3 rounded-xl shadow-lg ${colors[type]||colors.info}`;
  el.innerHTML = `
    <div class="font-semibold">${title || (type==='success'?'Hecho':'Aviso')}</div>
    <div class="text-sm opacity-90">${msg || ""}</div>
  `;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 200);
  }, ms);
}
function mapBackendErrorToMessage(text = "") {
  const t = text.toUpperCase();
  if (t.includes("UQ_DOCIDENT_NUMERO")) {
    return "Ya existe un empleado con ese número de documento. Verifica el dato.";
  }
  if (t.includes("ERROR DE AUTENTIC")) {
    return "Tu sesión expiró o no tienes permisos. Inicia sesión nuevamente.";
  }
  if (t.includes("ORA-00001")) {
    return "Registro duplicado: revisa los campos únicos (usuario, documento, correo).";
  }
  if (t.includes("NOT FOUND") || t.includes("NO ENCONTRADO")) {
    return "El registro solicitado no existe.";
  }
  return "Ocurrió un problema inesperado. Inténtalo de nuevo.";
}

// ======================== OVERLAY / BLOQUEO ========================
function ensureBlock() {
  let b = document.getElementById("global-blocker");
  if (b) return b;
  b = document.createElement("div");
  b.id = "global-blocker";
  b.className = "fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[9998] hidden";
  b.innerHTML = `
    <div class="w-full h-full grid place-items-center">
      <div class="bg-white/95 rounded-2xl px-6 py-5 shadow-xl flex items-center gap-3">
        <span class="w-5 h-5 inline-block border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin"></span>
        <span id="global-blocker-text" class="text-slate-700 font-medium">Procesando...</span>
      </div>
    </div>`;
  document.body.appendChild(b);
  return b;
}
function showBlock(text = "Procesando...") {
  const b = ensureBlock();
  b.querySelector("#global-blocker-text").textContent = text;
  b.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
}
function hideBlock() {
  const b = ensureBlock();
  b.classList.add("hidden");
  document.body.classList.remove("overflow-hidden");
}

// ======================== FECHAS / VALIDACIONES ========================
function formatDateYYYYMMDD(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function nowLocalYYYYMMDDTHHMM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${formatDateYYYYMMDD(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function minusYearsYYYYMMDD(years) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return formatDateYYYYMMDD(d);
}
function isBirthDateAdult(value /* yyyy-MM-dd */) {
  if (!value) return true;
  const d = new Date(value + "T00:00:00");
  const d18 = new Date();
  d18.setFullYear(d18.getFullYear() - 18);
  return d <= d18;
}
function isHireDateNotFuture(value /* yyyy-MM-ddTHH:mm */) {
  if (!value) return true;
  const v = new Date(value.replace(" ", "T"));
  const now = new Date();
  return v <= now;
}


document.addEventListener("DOMContentLoaded", () => {
  cargarTabla();

  // botón "nuevo empleado" ya lo tienes...
  const btn = btnNuevoEmpleado();
  if (btn) btn.addEventListener("click", (e) => { e.preventDefault(); openCreateModal(); });

  // Filtro por búsqueda (input superior)
  const search = document.getElementById("searchInput");
  if (search) search.addEventListener("input", () => applyFiltersAndRender());

  // Filtro por rol (checkboxes del menú)
  document.addEventListener("change", (ev) => {
    const cb = ev.target.closest(".role-filter");
    if (!cb) return;

    if (cb.value === "all") {
      // 'Todos los roles'
      if (cb.checked) {
        ROLE_FILTERS = new Set(["all"]);
        $$(".role-filter").forEach(x => { if (x.value !== "all") x.checked = false; });
      } else {
        ROLE_FILTERS.delete("all");
      }
    } else {
      // roles individuales
      const label = (cb.parentElement?.querySelector("span")?.textContent || cb.value || "").toUpperCase();
      if (cb.checked) {
        ROLE_FILTERS.delete("all");
        ROLE_FILTERS.add(label);
        const all = $$(".role-filter").find(x => x.value === "all");
        if (all) all.checked = false;
      } else {
        ROLE_FILTERS.delete(label);
        if (ROLE_FILTERS.size === 0) ROLE_FILTERS.add("all");
      }
    }

    applyFiltersAndRender();
  });
});

// ----- Bloqueo global de UI -----
function blockUI(message = "Procesando...") {
  let o = document.getElementById("ui-blocker");
  if (!o) {
    o = document.createElement("div");
    o.id = "ui-blocker";
    o.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm";
    o.innerHTML = `
      <div class="rounded-2xl bg-white shadow-2xl px-6 py-5 flex items-center gap-3">
        <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor"/>
        </svg>
        <span class="text-slate-700 font-medium">${message}</span>
      </div>`;
    document.body.appendChild(o);
  } else {
    o.querySelector("span").textContent = message;
  }
  o.classList.remove("hidden");
}
function unblockUI() {
  const o = document.getElementById("ui-blocker");
  if (o) o.classList.add("hidden");
}

// ----- Confirmación bonita (Promise<boolean>) -----
function confirmDialog({ title = "Confirmar", message = "¿Continuar?", okText = "Sí", cancelText = "Cancelar" } = {}) {
  return new Promise((resolve) => {
    let m = document.getElementById("confirm-dialog");
    if (!m) {
      m = document.createElement("div");
      m.id = "confirm-dialog";
      m.className = "fixed inset-0 z-[9998] hidden";
      m.innerHTML = `
        <div class="absolute inset-0 bg-black/40"></div>
        <div class="relative w-full h-full flex items-center justify-center p-4">
          <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div class="px-6 py-4 border-b">
              <h3 class="text-lg font-semibold" id="confirm-title"></h3>
            </div>
            <div class="px-6 py-5 text-slate-700" id="confirm-message"></div>
            <div class="px-6 py-4 border-t flex justify-end gap-3">
              <button type="button" class="btn-cancel px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300"></button>
              <button type="button" class="btn-ok px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"></button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    m.querySelector("#confirm-title").textContent = title;
    m.querySelector("#confirm-message").textContent = message;
    m.querySelector(".btn-ok").textContent = okText;
    m.querySelector(".btn-cancel").textContent = cancelText;

    const close = () => m.classList.add("hidden");
    const onOk = () => { cleanup(); close(); resolve(true); };
    const onCancel = () => { cleanup(); close(); resolve(false); };

    const btnOk = m.querySelector(".btn-ok");
    const btnCancel = m.querySelector(".btn-cancel");
    const overlay = m.firstElementChild;

    function cleanup() {
      btnOk.removeEventListener("click", onOk);
      btnCancel.removeEventListener("click", onCancel);
      overlay.removeEventListener("click", onCancel);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onOk();
    }

    btnOk.addEventListener("click", onOk);
    btnCancel.addEventListener("click", onCancel);
    overlay.addEventListener("click", onCancel);
    document.addEventListener("keydown", onKey);

    m.classList.remove("hidden");
  });
}

// ======= Estado local: cache de empleados para filtrar en cliente =======
let EMP_CACHE = [];   // se llena en cargarTabla()
let EMP_FILTER = { by: "all", term: "" };

// ======= Render de filas con filtro aplicado =======
function renderEmpleados(list) {
  const body = document.getElementById("employees-tbody") || document.querySelector("tbody");
  if (!body) return;
  // orden: más nuevos arriba (asumo backend ya viene así; si no, invertimos por id)
  const rows = list.map(rowEmpleado).join("");
  body.innerHTML = rows;
}

// ======= Filtro en cliente según selector =======
function applyEmployeeFilter() {
  const by = EMP_FILTER.by;
  const raw = (EMP_FILTER.term || "").trim().toLowerCase();

  if (!raw || by === "all") {
    renderEmpleados(EMP_CACHE);
    return;
  }

  const norm = (v) => String(v ?? "").toLowerCase();
  const onlyDigits = (v) => String(v ?? "").replace(/\D/g, "");

  const out = EMP_CACHE.filter(e => {
    switch (by) {
      case "role":
        return norm(e.role).includes(raw);
      case "dui": {
        // compara por dígitos, tolera que venga con o sin guion
        const left = onlyDigits(e.docNumber);
        const right = onlyDigits(raw);
        return left.includes(right);
      }
      case "name":
        return `${norm(e.firstName)} ${norm(e.secondName)} ${norm(e.lastNameP)} ${norm(e.lastNameM)}`.includes(raw);
      case "lastname":
        return `${norm(e.lastNameP)} ${norm(e.lastNameM)}`.includes(raw);
      case "email":
        return norm(e.email).includes(raw);
      case "username":
        return norm(e.username).includes(raw);
      case "address":
        return norm(e.address).includes(raw);
      case "hireDate":
        return norm(e.hireDate).includes(raw);
      case "birthDate":
        return norm(e.birthDate).includes(raw);
      default:
        return true;
    }
  });

  renderEmpleados(out);
}

// ======= UI de filtros: select + comportamiento del input =======
function setupEmployeeFilters() {
  // Oculta el filtro viejo por rol
  const oldBtn  = document.getElementById("roleBtn");
  const oldMenu = document.getElementById("roleMenu");
  if (oldBtn)  oldBtn.style.display  = "none";
  if (oldMenu) oldMenu.style.display = "none";

  const searchWrap  = document.querySelector(".mb-5 .flex-1") || document.querySelector(".mb-5 .relative");
  const searchInput = document.getElementById("searchInput");
  if (!searchWrap || !searchInput) return;

  // Crea el <select> si no existe
  let sel = document.getElementById("employee-filter-by");
  if (!sel) {
    sel = document.createElement("select");
    sel.id = "employee-filter-by";
    sel.className = "ml-3 border rounded-xl px-3 py-2 bg-white text-slate-700";
    sel.innerHTML = `
      <option value="all">Todos</option>
      <option value="role">Rol</option>
      <option value="dui">DUI</option>
      <option value="name">Nombre</option>
      <option value="lastname">Apellido</option>
      <option value="email">Correo</option>
      <option value="username">Usuario</option>
      <option value="address">Dirección</option>
      <option value="hireDate">Fecha de contratación</option>
      <option value="birthDate">Fecha de nacimiento</option>
    `;
    searchWrap.parentElement.insertBefore(sel, searchWrap.nextSibling);
  }

  // Handlers únicos (para no pisar la máscara)
  const onType = () => {
    EMP_FILTER.term = searchInput.value;
    applyEmployeeFilter();
  };

  // Asegura listeners una sola vez
  searchInput.removeEventListener("input", searchInput.__onType__);
  searchInput.__onType__ = onType;
  searchInput.addEventListener("input", onType);

  // DUI mask handler separado
  const duiMask = () => {
    let v = searchInput.value.replace(/\D/g, "").slice(0, 9);
    if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8);
    if (searchInput.value !== v) {
      const pos = searchInput.selectionStart;
      searchInput.value = v;
      // intenta mantener el cursor
      if (pos !== null) searchInput.setSelectionRange(Math.min(pos, v.length), Math.min(pos, v.length));
    }
  };
  searchInput.__duiMask__ = duiMask; // guarda ref

  // set inicial
  EMP_FILTER.by = sel.value;
  updateSearchInputBehavior(searchInput, sel.value);

  // cambio de modo
  sel.onchange = () => {
    EMP_FILTER.by = sel.value;
    searchInput.value = "";
    EMP_FILTER.term = "";
    updateSearchInputBehavior(searchInput, sel.value);
    applyEmployeeFilter();
  };
}

// Cambia placeholder/tipo y activa/desactiva máscara DUI
function updateSearchInputBehavior(inp, mode) {
  // reset visual
  inp.type = "text";
  inp.placeholder = "Buscar empleados...";
  inp.removeAttribute("pattern");
  inp.removeAttribute("maxLength");

  // quita máscara DUI si estuviera activa
  if (inp.__duiMaskAttached__) {
    inp.removeEventListener("input", inp.__duiMask__);
    inp.__duiMaskAttached__ = false;
  }

  switch (mode) {
    case "role":
      inp.placeholder = "Filtrar por rol (ADMIN, MESERO, CAJERO...)";
      break;
    case "dui":
      inp.placeholder = "DUI: ########-#";
      inp.maxLength = 10;
      inp.pattern = "^\\d{8}-\\d$";
      // activa máscara SIN pisar el oninput del filtro
      if (inp.__duiMask__ && !inp.__duiMaskAttached__) {
        inp.addEventListener("input", inp.__duiMask__);
        inp.__duiMaskAttached__ = true;
      }
      break;
    case "name":
      inp.placeholder = "Nombre o nombres";
      break;
    case "lastname":
      inp.placeholder = "Apellido paterno/materno";
      break;
    case "email":
      inp.type = "email";
      inp.placeholder = "correo@dominio.com";
      break;
    case "username":
      inp.placeholder = "Usuario (login)";
      break;
    case "address":
      inp.placeholder = "Dirección";
      break;
    case "hireDate":
      inp.type = "date";
      inp.placeholder = "YYYY-MM-DD";
      break;
    case "birthDate":
      inp.type = "date";
      inp.placeholder = "YYYY-MM-DD";
      break;
    default:
      inp.placeholder = "Buscar empleados...";
  }
}


// ======= Menú de usuario (Admin) con Cerrar sesión =======
function setupUserMenu() {
  const btn = document.querySelector(".navbar-user-avatar");
  if (!btn) return;

  // crea o reutiliza menú fijo
  let menu = document.getElementById("user-dropdown");
  if (!menu) {
    menu = document.createElement("div");
    menu.id = "user-dropdown";
    menu.className = "hidden fixed w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-[10000]";
    menu.innerHTML = `
      <div class="px-4 py-3 border-b">
        <div class="text-slate-700 font-medium">Mi cuenta</div>
        <div class="text-xs text-slate-500" id="user-email"></div>
      </div>
      <button id="btn-logout"
              class="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2">
        <i class="fa-solid fa-right-from-bracket text-slate-600"></i>
        <span>Cerrar sesión</span>
      </button>
    `;
    document.body.appendChild(menu);
  }

  // rellena email si lo guardas en storage
  const email = localStorage.getItem("userEmail") || "";
  const elEmail = menu.querySelector("#user-email");
  if (elEmail) elEmail.textContent = email;

  const toggleMenu = () => {
    const r = btn.getBoundingClientRect();
    // posiciona a la derecha del botón
    menu.style.top  = `${r.bottom + 8}px`;
    menu.style.left = `${Math.max(8, r.right - 224)}px`; // 224 ≈ w-56
    menu.classList.toggle("hidden");
  };

  const closeMenu = () => menu.classList.add("hidden");

  btn.__menuBound__ && btn.removeEventListener("click", btn.__menuBound__);
  btn.__menuBound__ = (e) => { e.preventDefault(); toggleMenu(); };
  btn.addEventListener("click", btn.__menuBound__);

  document.__menuCloser__ && document.removeEventListener("click", document.__menuCloser__);
  document.__menuCloser__ = (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) closeMenu();
  };
  document.addEventListener("click", document.__menuCloser__);

  // logout
  const logout = menu.querySelector("#btn-logout");
  if (logout && !logout.__bound__) {
    logout.__bound__ = true;
    logout.addEventListener("click", async () => {
      try {
        blockUI("Cerrando sesión...");
        localStorage.removeItem("token");
        sessionStorage.clear();
        window.location.href = "index.html";
      } finally {
        unblockUI();
      }
    });
  }
}

// ======= Mejora visual de <select> (ligero) =======
function enhanceSelect(nativeSelect) {
  if (!nativeSelect || nativeSelect.__enhanced__) return;
  nativeSelect.__enhanced__ = true;

  const wrap = document.createElement("div");
  wrap.className = "relative inline-block";
  nativeSelect.style.display = "none";
  nativeSelect.parentNode.insertBefore(wrap, nativeSelect);
  wrap.appendChild(nativeSelect);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "min-w-[10rem] w-full border rounded-xl bg-white px-3 py-2 text-left flex items-center justify-between";
  btn.innerHTML = `<span class="text-slate-700">${nativeSelect.options[nativeSelect.selectedIndex]?.text || "Seleccionar"}</span>
                   <i class="fa-solid fa-chevron-down text-xs text-slate-500 ml-2"></i>`;
  wrap.appendChild(btn);

  const panel = document.createElement("div");
  panel.className = "hidden absolute left-0 mt-2 w-full bg-white rounded-xl border border-slate-200 shadow-xl z-[1000]";
  panel.innerHTML = `
    <div class="px-3 py-2 border-b">
      <input class="w-full border rounded-lg px-3 py-2" placeholder="Buscar...">
    </div>
    <div class="max-h-64 overflow-auto py-2" data-list></div>
  `;
  wrap.appendChild(panel);

  const input = panel.querySelector("input");
  const list  = panel.querySelector("[data-list]");

  function renderList() {
    const q = (input.value || "").toLowerCase();
    list.innerHTML = "";
    [...nativeSelect.options].forEach(opt => {
      if (!q || opt.text.toLowerCase().includes(q)) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "w-full text-left px-4 py-2 hover:bg-slate-50";
        item.textContent = opt.text;
        item.addEventListener("click", () => {
          nativeSelect.value = opt.value;
          nativeSelect.dispatchEvent(new Event("change", { bubbles: true }));
          btn.firstElementChild.textContent = opt.text;
          panel.classList.add("hidden");
        });
        list.appendChild(item);
      }
    });
  }
  renderList();

  btn.addEventListener("click", () => {
    panel.classList.toggle("hidden");
    input.focus();
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) panel.classList.add("hidden");
  });
  input.addEventListener("input", renderList);
}

// Aplica el enhancer a los selects que te interesan (llámalo después de crear los selects)
function enhanceEmployeePageSelects() {
  const s1 = document.getElementById("employee-filter-by");
  if (s1) enhanceSelect(s1);

  const s2 = document.getElementById("sel-tipo-doc");
  if (s2) enhanceSelect(s2);

  const s3 = document.getElementById("sel-rol");
  if (s3) enhanceSelect(s3);
}


// ===== Toast simple (conecta a tu sistema si ya tienes uno)
function showToast(kind = "success", title = "", msg = "") {
  // Reemplaza por tu sistema de notificaciones si lo tienes
  console[kind === "error" ? "error" : "log"](`${title}${msg ? " – " + msg : ""}`);
}



