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

export async function cargarTabla(page = 0, size = 20) {
    try {
        const data = await getEmpleados(page, size);
        if (!tbody) return;
        tbody.innerHTML = data.map(rowEmpleado).join("");
    } catch (e) {
        console.error("Error cargando empleados:", e);
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
    const edit = ev.target.closest(".edit-btn");
    if (edit) {
        const id = edit.dataset.id;
        try {
            const emp = await getEmpleadoById(id);
            console.log("Editar empleado:", emp);
            alert("Conecta aquí tu modal de edición (los datos están en consola).");
        } catch (e) {
            console.error(e);
        }
        return;
    }

    // Eliminar
    const del = ev.target.closest(".delete-btn");
    if (del) {
        const id = del.dataset.id;
        if (!confirm("¿Seguro que deseas eliminar este empleado?")) return;
        try {
            await deleteEmpleado(id);
            await cargarTabla();
        } catch (e) {
            console.error("No se pudo eliminar:", e);
            alert("No se pudo eliminar el empleado.");
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

// -------------------- Modal CREATE (idéntico look y centrado) --------------------
function ensureCreateModal() {
    let modal = document.getElementById("modal-create-employee");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "modal-create-employee";
    modal.className = "fixed inset-0 z-[100] hidden";

    modal.innerHTML = `
    <div class="absolute inset-0 bg-black/40"></div>
    <div class="relative w-full h-full flex items-start md:items-center justify-center p-4 md:p-6">
      <div class="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div class="flex items-center justify-between px-6 py-4 border-b">
          <h3 class="text-lg font-semibold">Nuevo empleado</h3>
          <button class="btn-close text-gray-500 hover:text-gray-700" title="Cerrar">
            <i class="fa-solid fa-xmark text-xl"></i>
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

    // Cierre (overlay / X / Cancelar / Esc)
    const close = () => { modal.classList.add("hidden"); document.body.classList.remove("overflow-hidden"); };
    modal.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-close")
            || e.target.classList.contains("btn-cancel")
            || e.target === modal.firstElementChild) close();
    });
    document.addEventListener("keydown", (e) => {
        if (!modal.classList.contains("hidden") && e.key === "Escape") close();
    });

    // Submit
    modal.querySelector("#form-create-employee").addEventListener("submit", onSubmitCreate);

    return modal;
}

function openCreateModal() {
    const modal = ensureCreateModal();
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    initCreateForm(); // combos + máscaras
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

        console.debug("TiposDocumento (backend):", tiposDoc); // <-- si llega vacío lo verás aquí
        console.debug("Roles (backend):", roles);

        // NOMBRES EXACTOS del backend
        selDoc.innerHTML = tiposDoc.map(td =>
            `<option value="${td.idTipoDoc}">${td.tipoDoc}</option>`
        ).join("");

        selRol.innerHTML = roles.map(r =>
            `<option value="${r.id}">${r.rol}</option>`
        ).join("");

        // Máscara según el texto seleccionado (tipoDoc)
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
    } catch (err) {
        console.error("initCreateForm error:", err);
        alert("No se pudieron cargar Tipos de documento / Roles. Revisa la API.");
    } finally {
        if (btnSubmit) btnSubmit.disabled = false;
    }
}


// -------------------- Submit: CREATE encadenado --------------------
async function onSubmitCreate(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) btn.disabled = true; // evita doble submit

  try {
    const fd = new FormData(form);
    const v = Object.fromEntries(fd.entries());

    // 0) Password temporal: firstName + lastNameP + "123" (minúsculas)
    const tempPass = `${(v.firstName || "").toLowerCase()}${(v.lastNameP || "").toLowerCase()}123`;

    // 1) Documento Identidad (DTO backend: { idtipoDoc, numDoc })
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

    // 2) Persona (DTO backend: { pnombre, snombre, apellidoP, apellidoM, fechaN, direccion, IdDoc })
    const personaPayload = {
      pnombre:   String(v.firstName || "").trim(),
      snombre:   String(v.secondName || "").trim(),
      apellidoP: String(v.lastNameP || "").trim(),
      apellidoM: String(v.lastNameM || "").trim(),
      fechaN:    String(v.birthDate || "").trim(), // yyyy-MM-dd
      direccion: String(v.address || "").trim(),
      IdDoc:     Number(idDocumento),              // NOMBRE EXACTO
    };

    const persona = await createPersona(personaPayload);

    const idPersona =
      persona?.data?.id ??
      persona?.data?.IdPersona ??
      persona?.id ??
      persona?.IdPersona;

    if (!idPersona) {
      console.debug("Respuesta createPersona:", persona);
      throw new Error("No se recibió IdPersona de la API");
    }

    // 3) Usuario (DTO backend: { nombreusuario, contrasenia, correo, rolId })
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

    if (!idUsuario) {
      console.debug("Respuesta createUsuario:", usuario);
      throw new Error("No se recibió UsuarioId de la API");
    }

    // 4) Empleado (DTO backend: { idPersona, idUsuario, hireDate })
    // <input type="datetime-local"> devuelve "YYYY-MM-DDTHH:mm" -> agrega ":00"
    const hireLocal = String(v.hireDate || "").trim();            // p.ej. "2025-09-27T17:34"
    const hireIso   = hireLocal && hireLocal.length === 16
      ? `${hireLocal}:00`                                         // "2025-09-27T17:34:00"
      : hireLocal;                                                // si ya trae segundos, se deja

    const empleadoPayload = {
      idPersona: Number(idPersona),
      idUsuario: Number(idUsuario),
      hireDate:  hireIso, // LocalDateTime ISO con segundos
    };

    await createEmpleado(empleadoPayload);

    // 5) Cerrar modal, refrescar y avisar
    const modal = document.getElementById("modal-create-employee");
    if (modal) {
      modal.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");
    }
    await cargarTabla();

    alert(`Empleado creado.\nUsuario: ${v.username}\nContraseña temporal: ${tempPass}`);
  } catch (err) {
    console.error("onSubmitCreate error:", err);
    alert(err.message || "Error creando el empleado.");
  } finally {
    if (btn) btn.disabled = false;
  }
}





function genTempPassword() {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*?";
    let out = "";
    for (let i = 0; i < 12; i++) out += A[Math.floor(Math.random() * A.length)];
    return out;
}
