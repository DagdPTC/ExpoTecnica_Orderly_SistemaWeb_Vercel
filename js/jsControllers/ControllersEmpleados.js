// js/jsControllers/ControllersEmpleados.js
import {
  getRoles,
  getTiposDocumento,
  getEmpleadosPage,
  deleteEmpleado,
  getPersonasPage,
  getUsuariosPage,
  createDocumentoIdentidad,
  updateDocumentoIdentidad,
  getDocumentoIdentidadById,
  createPersona,
  updatePersona,
  createUsuario,
  updateUsuario,
  createEmpleado,
  updateEmpleado,
} from "../jsService/ServiceEmpleado.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const tbody = $("#employees-tbody");
const searchInput = $("#searchInput");
const addEmployeeBtn = $("#addEmployeeBtn");

const modalWrap = $("#employeeModal");
const modalTitle = $("#modalTitle");
const employeeForm = $("#employeeForm");
const cancelBtn = $("#cancelBtn");
const togglePassword = $("#togglePassword");

const f = {
  id: $("#id"),
  firstName: $("#firstName"),
  secondName: $("#secondName"),
  lastNameP: $("#lastNameP"),
  lastNameM: $("#lastNameM"),
  birthDate: $("#birthDate"),
  docType: $("#docType"),
  docNumber: $("#docNumber"),
  role: $("#role"),
  username: $("#username"),
  password: $("#password"),
  email: $("#email"),
  hireDate: $("#hireDate"),
  address: $("#address"),
};

let state = {
  page: 0,
  size: 10,
  empleadosVM: [],
  roles: [],             // Rol: { id, rol }
  tiposDoc: [],          // TipoDocumento (lo tomamos luego si nos pasas el JSON)
  personasIndex: new Map(), // key: persona.id
  usuariosIndex: new Map(), // key: usuario.id
  roleIndex: new Map(),     // key: rol.id
  tipoDocIndex: new Map(),  // key: tipoDoc.idTipoDoc
  editing: null,
};

/* ================= UTILIDADES ================= */
function formatDate(s) {
  if (!s) return "N/A";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-ES");
}
function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function chipClassByRoleName(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("admin")) return "admin";
  if (n.includes("mesero")) return "mesero";
  if (n.includes("cocin")) return "cocinero";
  if (n.includes("cajer")) return "cajero";
  if (n.includes("limp")) return "limpieza";
  return "";
}

/* ============== VM CON CAMPOS EXACTOS (según tus JSON) ============== */
function composeVM(emp, personasMap, usuariosMap) {
  const persona = personasMap.get(emp.idPersona) || personasMap.get(String(emp.idPersona)) || {};
  const usuario = usuariosMap.get(emp.idUsuario) || usuariosMap.get(String(emp.idUsuario)) || {};

  const correo = usuario.correo || "";
  const username = correo.split("@")[0] || "";

  return {
    idEmpleado: emp.id,
    idPersona: emp.idPersona,
    idUsuario: emp.idUsuario,
    fContratacion: emp.fcontratacion || null,

    pnombre: persona.pnombre || "",
    snombre: persona.snombre || "",
    apellidoP: persona.apellidoP || "",
    apellidoM: persona.apellidoM || "",
    fechaN: persona.fechaN || null,
    direccion: persona.direccion || "",
    idDoc: persona.idDoc ?? null,

    correo,
    username,

    docTypeName: null,
    docNumber: null
  };
}


/* ================== CARGA DE CATÁLOGOS (roles/TipoDoc) ================== */
async function loadCatalogs() {
  // Roles: [{ id, rol }]
  state.roles = await getRoles(0, 200);
  state.roleIndex = new Map(state.roles.map(r => [r.id, r]));

  // TipoDoc: dejamos soporte si existe; si no, no frena el GET
  try {
    state.tiposDoc = await getTiposDocumento(0, 200);
  } catch { state.tiposDoc = []; }
  state.tipoDocIndex = new Map(
    state.tiposDoc.map(t => {
      const key = t.idTipoDoc ?? t.IdTipoDoc ?? t.idtipoDoc ?? t.IdtipoDoc;
      return [key, t];
    })
  );

  // Selects
  f.role.innerHTML =
    `<option value="">Seleccione un rol</option>` +
    state.roles.map(r => `<option value="${r.id}">${r.rol}</option>`).join("");

  f.docType.innerHTML =
    state.tiposDoc.map(t => {
      const key = t.idTipoDoc ?? t.IdTipoDoc ?? t.idtipoDoc ?? t.IdtipoDoc;
      const label = t.tipoDoc ?? t.TipoDoc ?? "";
      return `<option value="${key}">${label}</option>`;
    }).join("");
}

/* ================== CARGA DE DATOS (GET) ================== */
async function loadData(page = 0, size = 10) {
  state.page = page; state.size = size;

  const empPage = await getEmpleadosPage(page, size); // Page<{id,fcontratacion,idPersona,idUsuario}>
  const empleados = empPage?.content ?? [];

  const [persPage, userPage] = await Promise.all([
    getPersonasPage(0, 1000), // Page<Persona>
    getUsuariosPage(0, 1000), // Page<Usuario>
  ]);

  const personas = persPage?.content ?? [];
  const usuarios = userPage?.content ?? [];

  // Construye índices con doble clave (number y string) para evitar mismatches
state.personasIndex = new Map();
for (const p of personas) {
  if (p?.id == null) continue;
  state.personasIndex.set(p.id, p);
  state.personasIndex.set(String(p.id), p);
}

state.usuariosIndex = new Map();
for (const u of usuarios) {
  if (u?.id == null) continue;
  state.usuariosIndex.set(u.id, u);
  state.usuariosIndex.set(String(u.id), u);
}

// (opcional, pero recomendado) también para roles:
state.roleIndex = new Map();
for (const r of state.roles) {
  if (r?.id == null) continue;
  state.roleIndex.set(r.id, r);
  state.roleIndex.set(String(r.id), r);
}

// Construir VM con los índices ya robustos
state.empleadosVM = empleados.map(e => composeVM(e, state.personasIndex, state.usuariosIndex));

  // Completar documento (si hay)
  await Promise.all(state.empleadosVM.map(async (vm) => {
    if (!vm.idDoc) return;
    try {
      const doc = await getDocumentoIdentidadById(vm.idDoc); // { id, idtipoDoc?/idTipoDoc?, numDoc }
      vm.docNumber = doc?.numDoc ?? null;

      // Resolver nombre de tipo (si tenemos catálogo)
      const tId = doc?.idtipoDoc ?? doc?.idTipoDoc ?? null;
      const t = state.tipoDocIndex.get(tId);
      const label = t?.tipoDoc ?? t?.TipoDoc ?? null;
      vm.docTypeName = label;
    } catch { /* no frena UI */ }
  }));
}

/* ================== RENDER ================== */
function renderTable() {
  const term = (searchInput.value || "").toLowerCase().trim();

  const filtered = state.empleadosVM.filter(vm => {
    const usuario = state.usuariosIndex.get(vm.idUsuario) || state.usuariosIndex.get(String(vm.idUsuario)) || {};
const rol = state.roleIndex.get(usuario.rolId) || state.roleIndex.get(String(usuario.rolId));
const rolName = rol?.rol || "N/A";

    const text = [
      vm.pnombre, vm.apellidoP, vm.username, vm.correo,
      vm.docTypeName, vm.docNumber, rolName, vm.direccion
    ].join(" ").toLowerCase();
    return term === "" ? true : text.includes(term);
  });

  tbody.innerHTML = "";
  for (const vm of filtered) {
    const usuario = state.usuariosIndex.get(vm.idUsuario) || {};
    const rolName = state.roleIndex.get(Number(usuario.rolId))?.rol || "N/A";
    const rolChipClass = chipClassByRoleName(rolName);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="font-semibold text-slate-800">${escapeHTML(vm.pnombre)} ${escapeHTML(vm.apellidoP)}</div></td>
      <td>${escapeHTML(vm.username)}</td>
      <td class="hidden sm:table-cell">${escapeHTML(vm.correo)}</td>
      <td><span class="chip ${rolChipClass}">${escapeHTML(rolName)}</span></td>
      <td class="hidden lg:table-cell">
        <button class="text-blue-600 hover:text-blue-800 text-sm toggle-details" data-target="d-${vm.idEmpleado}">
          Detalles <i class="fa-solid fa-chevron-down text-xs ml-1"></i>
        </button>
      </td>
      <td>
        <div class="flex gap-2">
          <button class="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 btn-edit" data-id="${vm.idEmpleado}" title="Editar">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 btn-delete" data-id="${vm.idEmpleado}" title="Eliminar">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;

    const tr2 = document.createElement("tr");
    tr2.innerHTML = `
      <td colspan="6" class="p-0">
        <div id="d-${vm.idEmpleado}" class="hidden border-t border-slate-200 bg-slate-50/50">
          <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div><div class="font-semibold">Segundo Nombre</div><div>${escapeHTML(vm.nombre || "N/A")}</div></div>
            <div><div class="font-semibold">Apellido Materno</div><div>${escapeHTML(vm.apellidoM || "N/A")}</div></div>
            <div><div class="font-semibold">Fecha de Nacimiento</div><div>${formatDate(vm.fechaN)}</div></div>
            <div><div class="font-semibold">Documento</div><div>${escapeHTML(vm.docTypeName || "N/A")} ${escapeHTML(vm.docNumber || "")}</div></div>
            <div><div class="font-semibold">Fecha Contratación</div><div>${formatDate(vm.fContratacion)}</div></div>
            <div class="lg:col-span-3"><div class="font-semibold">Dirección</div><div>${escapeHTML(vm.direccion || "N/A")}</div></div>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
    tbody.appendChild(tr2);
  }

  $$(".toggle-details").forEach(btn => {
    btn.onclick = () => {
      const tgt = document.getElementById(btn.dataset.target);
      tgt.classList.toggle("hidden");
      const icon = btn.querySelector("i");
      icon.style.transform = tgt.classList.contains("hidden") ? "rotate(0deg)" : "rotate(180deg)";
    };
  });

  $$(".btn-edit").forEach(b => b.addEventListener("click", () => openFormForEdit(Number(b.dataset.id))));
  $$(".btn-delete").forEach(b => b.addEventListener("click", () => onDelete(Number(b.dataset.id))));
}

/* ================== MODAL / FORM ================== */
function openModal() {
  modalWrap.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modalWrap.classList.remove("show");
  document.body.style.overflow = "";
  state.editing = null;
  employeeForm.reset();
  f.email.value = "";
}
function openFormNew() {
  state.editing = null;
  employeeForm.reset();
  f.email.value = "";
  modalTitle.textContent = "Nuevo Empleado";
  clearErrors();
  updateDocPattern();
  openModal();
}
function openFormForEdit(idEmpleado) {
  const vm = state.empleadosVM.find(v => v.idEmpleado === idEmpleado);
  if (!vm) return;

  state.editing = { idEmpleado: vm.idEmpleado, idPersona: vm.idPersona, idUsuario: vm.idUsuario, idDoc: vm.idDoc ?? null };

  f.firstName.value = vm.pnombre || "";
  f.secondName.value = vm.snombre || "";
  f.lastNameP.value = vm.apellidoP || "";
  f.lastNameM.value = vm.apellidoM || "";
  f.birthDate.value = vm.fechaN || "";
  f.address.value = vm.direccion || "";
  f.email.value = vm.correo || "";
  f.username.value = vm.username || "";
  f.password.value = ""; // (requerida por backend en create/update)

  const usuario = state.usuariosIndex.get(vm.idUsuario) || {};
  f.role.value = usuario?.rolId != null ? String(usuario.rolId) : "";

  if (vm.docTypeName) {
    const match = state.tiposDoc.find(t => (t.tipoDoc ?? t.TipoDoc) === vm.docTypeName);
    if (match) f.docType.value = String(match.idTipoDoc ?? match.IdTipoDoc ?? match.idtipoDoc ?? match.IdtipoDoc);
  }
  f.docNumber.value = vm.docNumber || "";
  updateDocPattern();

  f.hireDate.value = vm.fContratacion || "";

  modalTitle.textContent = "Editar Empleado";
  clearErrors();
  openModal();
}

/* ================== SUBMIT (mantengo nombres del form; DTOs los ajustas luego) ================== */
async function onSubmit(e) {
  e.preventDefault();
  clearErrors();
  if (!validateAll()) return;

  try {
    const rolId = Number(f.role.value);
    const correo = f.email.value.trim();
    const contrasenia = f.password.value.trim();

    // Documento (opcional)
    let idDoc = state.editing?.idDoc ?? null;
    const tId = Number(f.docType.value);
    const numDoc = f.docNumber.value.trim();
    if (tId && numDoc) {
      if (!idDoc) {
        const doc = await createDocumentoIdentidad({ IdtipoDoc: tId, numDoc }); // si tu DTO usa idtipoDoc, ajústalo aquí
        idDoc = doc?.id ?? doc?.Id ?? null;
      } else {
        await updateDocumentoIdentidad(idDoc, { IdtipoDoc: tId, numDoc });
      }
    }

    // Persona
    let idPersona = state.editing?.idPersona ?? null;
    const personaDTO = {
      id: idPersona,
      pnombre: f.firstName.value.trim(),
      snombre: f.secondName.value.trim() || null,
      apellidoP: f.lastNameP.value.trim(),
      apellidoM: f.lastNameM.value.trim(),
      fechaN: f.birthDate.value || null,
      direccion: f.address.value.trim(),
      idDoc: idDoc ?? null,
    };
    if (idPersona) {
      await updatePersona(idPersona, personaDTO);
    } else {
      const p = await createPersona(personaDTO);
      idPersona = p?.id ?? p?.Id ?? null;
    }

    // Usuario (tu JSON real usa: { id, rolId, correo, contrasenia })
    let idUsuario = state.editing?.idUsuario ?? null;
    const usuarioDTO = { id: idUsuario, rolId, correo, contrasenia };
    if (idUsuario) {
      await updateUsuario(idUsuario, usuarioDTO);
    } else {
      const u = await createUsuario(usuarioDTO);
      idUsuario = u?.id ?? u?.Id ?? null;
    }

    // Empleado (tu JSON real usa: { id, fcontratacion, idPersona, idUsuario })
    let idEmpleado = state.editing?.idEmpleado ?? null;
    const empleadoDTO = { id: idEmpleado, fcontratacion: f.hireDate.value || null, idPersona, idUsuario };
    if (idEmpleado) {
      await updateEmpleado(idEmpleado, empleadoDTO);
    } else {
      const eRes = await createEmpleado(empleadoDTO);
      idEmpleado = eRes?.id ?? eRes?.Id ?? null;
    }

    closeModal();
    await reload();
  } catch (err) {
    console.error(err);
    alert("Error en operación: " + err.message);
  }
}

/* ================== DELETE ================== */
async function onDelete(idEmpleado) {
  if (!confirm("¿Eliminar este empleado?")) return;
  try {
    await deleteEmpleado(idEmpleado);
    await reload();
  } catch (err) {
    console.error(err);
    alert("No se pudo eliminar: " + err.message);
  }
}

/* ============== VALIDACIONES (UI) ============== */
function clearErrors() {
  $$(".err").forEach(e => e.style.display = "none");
  $$(".invalid").forEach(e => e.classList.remove("invalid"));
}
function validateAll() {
  const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nameRe.test(f.firstName.value.trim())) return markErr(f.firstName, "firstNameError"), false;
  if (f.secondName.value && !nameRe.test(f.secondName.value.trim())) return markErr(f.secondName, "secondNameError"), false;
  if (!nameRe.test(f.lastNameP.value.trim())) return markErr(f.lastNameP, "lastNamePError"), false;
  if (!nameRe.test(f.lastNameM.value.trim())) return markErr(f.lastNameM, "lastNameMError"), false;
  if (!validateBirthDate()) return false;
  if (!validateHireDate()) return false;

  // Si hay docType seleccionado, valida longitud con patrón actual de la UI
  const t = Number(f.docType.value);
  if (t && f.docNumber.value.trim()) {
    const ok =
      (f.docNumber.maxLength === 10 && f.docNumber.value.length === 10) ||
      (f.docNumber.maxLength === 16 && f.docNumber.value.length === 16);
    if (!ok) return markErr(f.docNumber, "docNumberError"), false;
  }

  if (!f.role.value) return markErr(f.role, "roleError"), false;
  if (!/^[A-Za-z0-9]+$/.test(f.username.value.trim())) return markErr(f.username, "usernameError"), false;

  // contrasenia (tu API la exige en create/update)
  if (!/^[\s\S]{8}$/.test(f.password.value.trim())) return markErr(f.password, "passwordError"), false;

  return true;
}
function markErr(input, errId) {
  input.classList.add("invalid");
  const err = document.getElementById(errId);
  if (err) err.style.display = "block";
}
function validateBirthDate() {
  const el = f.birthDate;
  if (!el.value) { el.classList.add("invalid"); $("#birthDateError").style.display = "block"; return false; }
  const d = new Date(el.value), now = new Date();
  if (d > now) { el.classList.add("invalid"); $("#birthDateError").textContent = "La fecha no puede ser futura"; $("#birthDateError").style.display = "block"; return false; }
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  const ok = age >= 18 && age <= 85;
  el.classList.toggle("invalid", !ok);
  $("#birthDateError").textContent = "El empleado debe tener entre 18 y 85 años";
  $("#birthDateError").style.display = ok ? "none" : "block";
  return ok;
}
function validateHireDate() {
  const el = f.hireDate;
  if (!el.value) { el.classList.add("invalid"); $("#hireDateError").style.display = "block"; return false; }
  const h = new Date(el.value), now = new Date();
  if (h > now) { el.classList.add("invalid"); $("#hireDateError").textContent = "La fecha no puede ser futura"; $("#hireDateError").style.display = "block"; return false; }
  if (f.birthDate.value) {
    const bd = new Date(f.birthDate.value);
    const min = new Date(bd); min.setFullYear(min.getFullYear() + 18);
    if (h < min) { el.classList.add("invalid"); $("#hireDateError").textContent = "Debe ser posterior a los 18 años"; $("#hireDateError").style.display = "block"; return false; }
  }
  el.classList.remove("invalid");
  $("#hireDateError").style.display = "none";
  return true;
}

/* ============== PATRÓN DOC ============== */
function updateDocPattern() {
  const typeId = Number(f.docType.value);
  const t = state.tipoDocIndex.get(typeId);
  const typeName = t?.tipoDoc ?? t?.TipoDoc ?? "";
  const isDUI = typeName.toUpperCase().includes("DUI");
  if (isDUI) {
    f.docNumber.placeholder = "xxxxxxxx-x";
    f.docNumber.maxLength = 10;
  } else {
    f.docNumber.placeholder = "xxxx-xxxxxx-xxx-x";
    f.docNumber.maxLength = 16;
  }
}

/* ============== BIND/RELOAD ============== */
function bindUI() {
  searchInput?.addEventListener("input", renderTable);
  addEmployeeBtn?.addEventListener("click", openFormNew);
  cancelBtn?.addEventListener("click", closeModal);
  modalWrap?.addEventListener("click", (e) => { if (e.target === modalWrap) closeModal(); });
  employeeForm?.addEventListener("submit", onSubmit);
  togglePassword?.addEventListener("click", () => {
    const isPass = f.password.type === "password";
    f.password.type = isPass ? "text" : "password";
    togglePassword.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
  });

  f.firstName.addEventListener("input", () => {
    const fn = (f.firstName.value || "").toLowerCase().replace(/\s/g, "");
    const lp = (f.lastNameP.value || "").toLowerCase().replace(/\s/g, "");
    f.email.value = fn && lp ? `${fn}_${lp}@orderly.com` : "";
  });
  f.lastNameP.addEventListener("input", () => {
    const fn = (f.firstName.value || "").toLowerCase().replace(/\s/g, "");
    const lp = (f.lastNameP.value || "").toLowerCase().replace(/\s/g, "");
    f.email.value = fn && lp ? `${fn}_${lp}@orderly.com` : "";
  });

  f.docType.addEventListener("change", updateDocPattern);
  f.docNumber.addEventListener("input", () => {
    const typeId = Number(f.docType.value);
    const t = state.tipoDocIndex.get(typeId);
    const typeName = t?.tipoDoc ?? t?.TipoDoc ?? "";
    const isDUI = typeName.toUpperCase().includes("DUI");
    let v = f.docNumber.value.replace(/\D/g, "");
    if (isDUI) {
      if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8, 9);
      f.docNumber.value = v.slice(0, 10);
    } else {
      if (v.length > 4)  v = v.slice(0, 4)  + "-" + v.slice(4, 10);
      if (v.length > 11) v = v.slice(0, 11) + "-" + v.slice(11, 14);
      if (v.length > 15) v = v.slice(0, 15) + "-" + v.slice(15, 16);
      f.docNumber.value = v.slice(0, 16);
    }
  });
}
async function reload() {
  await loadData(state.page, state.size);
  renderTable();
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadCatalogs();
    bindUI();
    await reload();
  } catch (err) {
    console.error(err);
    alert("Error inicializando vista: " + err.message);
  }
});
