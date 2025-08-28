// js/jsControllers/ControllersEmpleados.js
import {
  getRoles, getTiposDocumento,
  getEmpleadosPage, deleteEmpleado,
  getPersonasPage, getUsuariosPage,
  createDocumentoIdentidad, updateDocumentoIdentidad, getDocumentoIdentidadById,
  createPersona, updatePersona,
  createUsuario, updateUsuario,
  createEmpleado, updateEmpleado
} from "../jsService/ServiceEmpleado.js"; // <--- ruta corregida

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const tbody = $("#employees-tbody");
const searchInput = $("#searchInput");
const roleBtn = $("#roleBtn");
const roleMenu = $("#roleMenu");
const addEmployeeBtn = $("#addEmployeeBtn");

const modalWrap = $("#employeeModal");
const modalTitle = $("#modalTitle");
const employeeForm = $("#employeeForm");
const cancelBtn = $("#cancelBtn");
const togglePassword = $("#togglePassword");
const emailInput = $("#email");

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
  address: $("#address")
};

let state = {
  page: 0,
  size: 10,
  empleadosVM: [],
  roles: [],
  tiposDoc: [],
  personasIndex: new Map(),
  usuariosIndex: new Map(),
  roleIndex: new Map(),
  tipoDocIndex: new Map(),
  editing: null
};

function composeVM(emp, personasMap, usuariosMap) {
  const persona = personasMap.get(emp.idPersona) || {};
  const usuario = usuariosMap.get(emp.idUsuario) || {};
  return {
    idEmpleado: emp.id,
    idPersona: emp.idPersona,
    idUsuario: emp.idUsuario,
    fContratacion: emp.fContratacion || null,
    pnombre: persona.pnombre || "",
    snombre: persona.snombre || "",
    apellidoP: persona.apellidoP || "",
    apellidoM: persona.apellidoM || "",
    fechaN: persona.fechaN || null,
    direccion: persona.direccion || "",
    idDoc: persona.idDoc || null,
    correo: usuario.correo || "",
    username: (usuario.correo || "").split("@")[0] || "",
    docTypeName: null,
    docNumber: null
  };
}

async function loadCatalogs() {
  state.roles = await getRoles(0, 200);
  state.roleIndex = new Map(state.roles.map(r => [r.id, r]));
  state.tiposDoc = await getTiposDocumento(0, 200);
  state.tipoDocIndex = new Map(state.tiposDoc.map(t => [t.idTipoDoc, t]));
  roleMenu.innerHTML = `
    <div class="px-4 py-3 border-b border-slate-100">
      <label class="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" class="role-filter w-4 h-4 text-blue-600" value="__all__" checked>
        <span class="font-medium text-slate-700">Todos los roles</span>
      </label>
    </div>
    ${state.roles.map(r => `
      <div class="px-4 py-2 hover:bg-slate-50">
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" class="role-filter w-4 h-4 text-blue-600" value="${r.id}">
          <span>${r.rol}</span>
        </label>
      </div>`).join("")}
  `;
  f.role.innerHTML = `<option value="">Seleccione un rol</option>` +
    state.roles.map(r => `<option value="${r.id}">${r.rol}</option>`).join("");
  f.docType.innerHTML = state.tiposDoc.map(t => `<option value="${t.idTipoDoc}">${t.tipoDoc}</option>`).join("");
}

async function loadData(page = 0, size = 10) {
  state.page = page; state.size = size;

  const empPage = await getEmpleadosPage(page, size);
  const empleados = empPage?.content ?? [];

  const [persPage, userPage] = await Promise.all([
    getPersonasPage(0, 1000),
    getUsuariosPage(0, 1000)
  ]);

  const personas = persPage?.content ?? [];
  const usuarios = userPage?.content ?? [];

  state.personasIndex = new Map(personas.map(p => [p.id, p]));
  state.usuariosIndex = new Map(usuarios.map(u => [u.id, u]));
  state.empleadosVM = empleados.map(e => composeVM(e, state.personasIndex, state.usuariosIndex));

  await Promise.all(state.empleadosVM.map(async (vm) => {
    if (vm?.idDoc != null) {
      try {
        const doc = await getDocumentoIdentidadById(vm.idDoc);
        vm.docNumber = doc?.numDoc ?? null;
        vm.docTypeName = state.tipoDocIndex.get(doc?.idtipoDoc || null)?.tipoDoc || null;
      } catch { /* ignorar si no existe controller */ }
    }
  }));
}

function chipClassByRoleId(roleId) {
  const rol = state.roleIndex.get(Number(roleId));
  if (!rol) return "";
  const name = (rol.rol || "").toLowerCase();
  if (name.includes("admin")) return "admin";
  if (name.includes("mesero")) return "mesero";
  if (name.includes("cocin")) return "cocinero";
  if (name.includes("cajer")) return "cajero";
  if (name.includes("limp")) return "limpieza";
  return "";
}

function formatDate(s) {
  if (!s) return "N/A";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("es-ES");
}

function escapeHTML(str) {
  return String(str ?? "").replace(/[&<>"']/g, (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

function renderTable() {
  const term = (searchInput.value || "").toLowerCase().trim();
  const selectedRoleIds = $$(".role-filter:checked").map(c => c.value);
  const allOn = selectedRoleIds.includes("__all__");

  const filtered = state.empleadosVM.filter(vm => {
    const usuario = state.usuariosIndex.get(vm.idUsuario) || {};
    const rolId = usuario.rolId;
    const text = [vm.pnombre, vm.apellidoP, vm.username, vm.correo, vm.docTypeName, vm.docNumber]
      .join(" ").toLowerCase();
    const okText = term === "" ? true : text.includes(term);
    const okRole = allOn ? true : selectedRoleIds.some(id => Number(id) === Number(rolId));
    return okText && okRole;
  });

  tbody.innerHTML = "";
  for (const vm of filtered) {
    const usuario = state.usuariosIndex.get(vm.idUsuario) || {};
    const rolId = usuario.rolId;
    const rolChipClass = chipClassByRoleId(rolId);
    const rolName = state.roleIndex.get(Number(rolId))?.rol || "N/A";

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
            <div><div class="font-semibold">Segundo Nombre</div><div>${escapeHTML(vm.snombre || "N/A")}</div></div>
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

// ==== Modal / CRUD ====

function openModal() {
  modalWrap.classList.add("show");
  document.body.style.overflow = "hidden";
}
function closeModal() {
  modalWrap.classList.remove("show");
  document.body.style.overflow = "";
  state.editing = null;
  employeeForm.reset();
  emailInput.value = "";
}

function clearErrors() {
  document.querySelectorAll(".err").forEach(e => e.style.display = "none");
  document.querySelectorAll(".invalid").forEach(e => e.classList.remove("invalid"));
}

function updateDocPattern() {
  const typeId = Number(f.docType.value);
  const typeName = state.tipoDocIndex.get(typeId)?.tipoDoc || "";
  const isDUI = typeName.toUpperCase().includes("DUI");
  if (isDUI) { f.docNumber.placeholder = "xxxxxxxx-x"; f.docNumber.maxLength = 10; }
  else { f.docNumber.placeholder = "xxxx-xxxxxx-xxx-x"; f.docNumber.maxLength = 16; }
}

function updateEmail() {
  const fn = (f.firstName.value || "").toLowerCase().replace(/\s/g, "");
  const lp = (f.lastNameP.value || "").toLowerCase().replace(/\s/g, "");
  f.email.value = fn && lp ? `${fn}_${lp}@orderly.com` : "";
}

function validateBirthDate() {
  const el = f.birthDate;
  if (!el.value) return false;
  const d = new Date(el.value), now = new Date();
  if (d > now) return false;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 18 && age <= 85;
}

function validateHireDate() {
  const el = f.hireDate;
  if (!el.value) return false;
  const h = new Date(el.value), now = new Date();
  if (h > now) return false;
  if (f.birthDate.value) {
    const bd = new Date(f.birthDate.value);
    const min = new Date(bd); min.setFullYear(min.getFullYear() + 18);
    if (h < min) return false;
  }
  return true;
}

function validateAll() {
  const nameRe = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/;
  if (!nameRe.test(f.firstName.value.trim())) return false;
  if (f.secondName.value && !nameRe.test(f.secondName.value.trim())) return false;
  if (!nameRe.test(f.lastNameP.value.trim())) return false;
  if (f.lastNameM.value && !nameRe.test(f.lastNameM.value.trim())) return false;
  if (!validateBirthDate()) return false;
  if (!validateHireDate()) return false;
  if (!f.role.value) return false;
  if (!/^[A-Za-z0-9]+$/.test(f.username.value.trim())) return false;
  return true;
}

function openFormNew() {
  state.editing = null;
  employeeForm.reset();
  emailInput.value = "";
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
  f.password.value = "";
  const usuario = state.usuariosIndex.get(vm.idUsuario) || {};
  f.role.value = usuario?.rolId != null ? String(usuario.rolId) : "";
  const foundDoc = state.tiposDoc.find(t => t.tipoDoc === vm.docTypeName);
  f.docType.value = foundDoc ? String(foundDoc.idTipoDoc) : (state.tiposDoc[0]?.idTipoDoc ?? "");
  f.docNumber.value = vm.docNumber || "";
  updateDocPattern();
  f.hireDate.value = vm.fContratacion || "";
  modalTitle.textContent = "Editar Empleado";
  clearErrors();
  openModal();
}

async function onSubmit(e) {
  e.preventDefault();
  clearErrors();
  if (!validateAll()) return;

  try {
    const rolId = Number(f.role.value);
    const correo = f.email.value.trim();
    const contrasenia = f.password.value.trim();
    const contraseniaSet = !!contrasenia;

    let idDoc = state.editing?.idDoc ?? null;
    const idtipoDoc = Number(f.docType.value);
    const numDoc = f.docNumber.value.trim();

    if (!idDoc) {
      if (idtipoDoc && numDoc) {
        const doc = await createDocumentoIdentidad({ idtipoDoc, numDoc });
        idDoc = doc?.id ?? null;
      }
    } else {
      if (idtipoDoc && numDoc) {
        await updateDocumentoIdentidad(idDoc, { idtipoDoc, numDoc });
      }
    }

    let idPersona = state.editing?.idPersona ?? null;
    const personaDTO = {
      id: idPersona,
      pnombre: f.firstName.value.trim(),
      snombre: f.secondName.value.trim() || null,
      apellidoP: f.lastNameP.value.trim(),
      apellidoM: f.lastNameM.value.trim() || null,
      fechaN: f.birthDate.value || null,
      direccion: f.address.value.trim(),
      idDoc: idDoc
    };
    if (idPersona) {
      await updatePersona(idPersona, personaDTO);
    } else {
      const p = await createPersona(personaDTO);
      idPersona = p?.data?.id ?? p?.id ?? null;
    }

    let idUsuario = state.editing?.idUsuario ?? null;
    const usuarioDTO = {
      id: idUsuario,
      rolId: rolId,
      correo: correo,
      ...(contraseniaSet ? { contrasenia } : {})
    };
    if (idUsuario) {
      await updateUsuario(idUsuario, usuarioDTO);
    } else {
      const u = await createUsuario(usuarioDTO);
      idUsuario = u?.data?.id ?? u?.id ?? null;
    }

    let idEmpleado = state.editing?.idEmpleado ?? null;
    const empleadoDTO = { id: idEmpleado, idPersona, idUsuario, fContratacion: f.hireDate.value || null };
    if (idEmpleado) {
      await updateEmpleado(idEmpleado, empleadoDTO);
    } else {
      const eRes = await createEmpleado(empleadoDTO);
      idEmpleado = eRes?.data?.id ?? eRes?.id ?? null;
    }

    closeModal();
    await reload();
  } catch (err) {
    console.error(err);
    alert("Error en operación: " + err.message);
  }
}

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

function bindUI() {
  roleBtn?.addEventListener("click", (e) => { e.stopPropagation(); roleMenu.classList.toggle("hidden"); });
  document.addEventListener("click", () => roleMenu.classList.add("hidden"));
  roleMenu.addEventListener("change", (e) => { if (e.target.classList.contains("role-filter")) renderTable(); });
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
  f.firstName.addEventListener("input", updateEmail);
  f.lastNameP.addEventListener("input", updateEmail);
  f.docType.addEventListener("change", updateDocPattern);
  f.docNumber.addEventListener("input", () => {
    const typeId = Number(f.docType.value);
    const typeName = state.tipoDocIndex.get(typeId)?.tipoDoc || "";
    const isDUI = typeName.toUpperCase().includes("DUI");
    let v = f.docNumber.value.replace(/\D/g, "");
    if (isDUI) {
      if (v.length > 8) v = v.slice(0, 8) + "-" + v.slice(8, 9);
      f.docNumber.value = v.slice(0, 10);
    } else {
      if (v.length > 4) v = v.slice(0, 4) + "-" + v.slice(4, 10);
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
