// JavaScript original con mejoras para responsive

// ------- Menú usuario navbar: se inyecta automáticamente --------
document.addEventListener('DOMContentLoaded', function () {
  // Encuentra el avatar del usuario
  let userBtn = document.querySelector('.navbar-user-avatar');
  if (userBtn) {
    userBtn.style.position = 'relative';

    // Crea el menú solo si no existe aún
    if (!document.getElementById('userDropdown')) {
      // Contenedor de dropdown
      const dropdown = document.createElement('div');
      dropdown.className = 'user-dropdown';
      dropdown.id = 'userDropdown';
      dropdown.innerHTML = `
                        <button class="user-dropdown-item" id="logoutBtn">
                            <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
                        </button>
                    `;
      userBtn.parentNode.style.position = "relative";
      userBtn.parentNode.appendChild(dropdown);

      // Overlay para cerrar el menú al hacer click fuera
      const overlay = document.createElement('div');
      overlay.className = 'user-dropdown-overlay';
      overlay.id = 'userDropdownOverlay';
      document.body.appendChild(overlay);

      // Mostrar/ocultar menú al hacer click en el avatar
      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        overlay.classList.toggle('active');
      });

      // Cerrar si clic fuera
      overlay.addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
      });

      // Cerrar con Esc
      document.addEventListener('keydown', function (ev) {
        if (ev.key === "Escape") {
          dropdown.classList.remove('show');
          overlay.classList.remove('active');
        }
      });

      // Acción cerrar sesión
      document.getElementById('logoutBtn').addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
        window.location.href = "inicioSesion.html";
      });
    }
  }
});

// Toggle sidebar para móvil y desktop
document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  // Toggle móvil
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('mobile-open');
      mobileOverlay.classList.toggle('active');
    });
  }

  // Toggle desktop (colapsar sidebar)
  if (sidebarToggleDesktop && sidebar) {
    sidebarToggleDesktop.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  // Cerrar sidebar móvil al hacer click en overlay
  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    });
  }

  // Cerrar sidebar móvil con Escape
  document.addEventListener('keydown', function (ev) {
    if (ev.key === "Escape") {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });

  // Cerrar sidebar móvil al cambiar a desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });
});

// Animaciones de entrada escalonada para las cards
document.addEventListener('DOMContentLoaded', function () {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observar elementos con animación
  document.querySelectorAll('.animate-fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
});

// Efectos hover mejorados para las mesas
document.addEventListener('DOMContentLoaded', function () {
  const tableStatus = document.querySelectorAll('.table-status');

  tableStatus.forEach(table => {
    table.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.05) rotate(2deg)';
    });

    table.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1) rotate(0deg)';
    });

    table.addEventListener('click', function () {
      // Efecto de click
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1.05) rotate(2deg)';
      }, 150);
    });
  });
});

// Smooth scroll para enlaces internos
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
});

// ======= EMPLEADOS (datos + lógica) =======
const employees = [
  { id: 1, firstName: "Juan", secondName: "Carlos", lastNameP: "Pérez", lastNameM: "Gómez", birthDate: "1985-05-15", phone: "+503 7890-1234", docType: "DUI", docNumber: "12345678-9", role: "Administrador", username: "jperez", password: "Admin123#", email: "juan_perez@orderly.com", hireDate: "2020-01-10", address: "Calle Principal #123, Colonia Centro" },
  { id: 2, firstName: "María", secondName: "Isabel", lastNameP: "Rodríguez", lastNameM: "Martínez", birthDate: "1990-08-22", phone: "+503 6789-4321", docType: "DUI", docNumber: "98765432-1", role: "Mesero", username: "mrodriguez", password: "Mesero123#", email: "maria_rodriguez@orderly.com", hireDate: "2021-03-15", address: "Avenida Norte #456, Colonia Escalón" },
  { id: 3, firstName: "Pedro", secondName: "Antonio", lastNameP: "González", lastNameM: "", birthDate: "1995-11-30", phone: "+503 7654-9876", docType: "Licencia", docNumber: "1234-567890-123-4", role: "Cocinero", username: "pgonzalez", password: "Cocinero123#", email: "pedro_gonzalez@orderly.com", hireDate: "2022-05-20", address: "Calle Oriente #789, Colonia San Benito" }
];

const searchInput = document.getElementById('searchInput');
const tbody = document.getElementById('employees-tbody');
const roleBtn = document.getElementById('roleBtn');
const roleMenu = document.getElementById('roleMenu');
roleBtn.addEventListener('click', (e) => { e.stopPropagation(); roleMenu.classList.toggle('hidden'); });
document.addEventListener('click', () => roleMenu.classList.add('hidden'));
roleMenu.querySelectorAll('input.role-filter').forEach(cb => cb.addEventListener('change', renderTable));
searchInput.addEventListener('input', renderTable);

function chipClass(role) { return role === 'Administrador' ? 'admin' : role === 'Mesero' ? 'mesero' : role === 'Cocinero' ? 'cocinero' : role === 'Cajero' ? 'cajero' : role === 'Limpieza' ? 'limpieza' : ''; }
function formatDate(s) { return new Date(s).toLocaleDateString('es-ES'); }

function renderTable() {
  const term = (searchInput.value || '').toLowerCase();
  const roles = Array.from(document.querySelectorAll('.role-filter:checked')).map(x => x.value);
  const filtered = employees.filter(e => {
    const t = [e.firstName, e.lastNameP, e.username, e.email].join(' ').toLowerCase();
    const okText = t.includes(term);
    const okRole = roles.includes('all') || roles.includes(e.role);
    return okText && okRole;
  });

  tbody.innerHTML = '';
  filtered.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
                    <td><div class="font-semibold text-slate-800">${emp.firstName} ${emp.lastNameP}</div></td>
                    <td>${emp.username}</td>
                    <td class="hidden sm:table-cell">${emp.email}</td>
                    <td><span class="chip ${chipClass(emp.role)}">${emp.role}</span></td>
                    <td class="hidden lg:table-cell"><button class="text-blue-600 hover:text-blue-800 text-sm toggle-details" data-target="d-${emp.id}">Detalles <i class="fa-solid fa-chevron-down text-xs ml-1"></i></button></td>
                    <td>
                        <div class="flex gap-2">
                            <button class="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50" onclick='openForm(${JSON.stringify(emp)})' title="Editar"><i class="fa-solid fa-pen"></i></button>
                            <button class="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50" onclick="deleteEmployee(${emp.id})" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </td>`;
    const tr2 = document.createElement('tr');
    tr2.innerHTML = `
                    <td colspan="6" class="p-0">
                        <div id="d-${emp.id}" class="hidden border-t border-slate-200 bg-slate-50/50">
                            <div class="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                <div><div class="font-semibold">Segundo Nombre</div><div>${emp.secondName || 'N/A'}</div></div>
                                <div><div class="font-semibold">Apellido Materno</div><div>${emp.lastNameM || 'N/A'}</div></div>
                                <div><div class="font-semibold">Fecha de Nacimiento</div><div>${formatDate(emp.birthDate)}</div></div>
                                <div><div class="font-semibold">Teléfono</div><div>${emp.phone}</div></div>
                                <div><div class="font-semibold">Documento</div><div>${emp.docType} ${emp.docNumber}</div></div>
                                <div><div class="font-semibold">Fecha Contratación</div><div>${formatDate(emp.hireDate)}</div></div>
                                <div class="lg:col-span-3"><div class="font-semibold">Dirección</div><div>${emp.address}</div></div>
                            </div>
                        </div>
                    </td>`;
    tbody.appendChild(tr); tbody.appendChild(tr2);
  });

  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.onclick = () => {
      const tgt = document.getElementById(btn.dataset.target);
      tgt.classList.toggle('hidden');
      const icon = btn.querySelector('i');
      icon.style.transform = tgt.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    };
  });
}
renderTable();

/* ===== Modal / CRUD ===== */
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const modalWrap = document.getElementById('employeeModal');
const modalTitle = document.getElementById('modalTitle');
const cancelBtn = document.getElementById('cancelBtn');
const employeeForm = document.getElementById('employeeForm');
const togglePassword = document.getElementById('togglePassword');
const emailInput = document.getElementById('email');
let editingId = null;

addEmployeeBtn.addEventListener('click', () => openForm());
cancelBtn.addEventListener('click', closeForm);
modalWrap.addEventListener('click', e => { if (e.target === modalWrap) closeForm(); });
employeeForm.addEventListener('submit', submitForm);
document.getElementById('firstName').addEventListener('input', updateEmail);
document.getElementById('lastNameP').addEventListener('input', updateEmail);
togglePassword.addEventListener('click', () => {
  const input = document.getElementById('password'); const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  togglePassword.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
});

function openForm(emp = null) {
  modalTitle.textContent = emp ? 'Editar Empleado' : 'Nuevo Empleado';
  document.querySelectorAll('.err').forEach(e => e.style.display = 'none');
  document.querySelectorAll('.invalid').forEach(e => e.classList.remove('invalid'));
  if (emp) {
    editingId = emp.id;
    ['firstName', 'secondName', 'lastNameP', 'lastNameM', 'birthDate', 'phone', 'docNumber', 'role', 'username', 'password', 'hireDate', 'address']
      .forEach(id => { const el = document.getElementById(id); let v = emp[id] || ''; if (id === 'phone') v = v.replace('+503 ', ''); el.value = v; });
    document.getElementById('docType').value = emp.docType; updateDocNumberPattern();
    emailInput.value = emp.email;
  } else {
    editingId = null; employeeForm.reset(); emailInput.value = ''; updateDocNumberPattern();
  }
  modalWrap.classList.add('show'); document.body.style.overflow = 'hidden';
}
function closeForm() { modalWrap.classList.remove('show'); document.body.style.overflow = ''; editingId = null; employeeForm.reset(); emailInput.value = ''; }
function submitForm(e) {
  e.preventDefault();
  if (!validateBirthDate() || !validateHireDate()) return;

  const emp = {
    id: editingId || Date.now(),
    firstName: val('firstName'), secondName: val('secondName'),
    lastNameP: val('lastNameP'), lastNameM: val('lastNameM'),
    birthDate: val('birthDate'), phone: `+503 ${val('phone')}`,
    docType: val('docType'), docNumber: val('docNumber'),
    role: val('role'), username: val('username'),
    password: val('password'), email: emailInput.value,
    hireDate: val('hireDate'), address: val('address')
  };
  if (editingId) { const i = employees.findIndex(x => x.id === editingId); if (i > -1) employees[i] = emp; } else { employees.push(emp); }
  closeForm(); renderTable();
}

/* Validaciones */
function val(id) { return document.getElementById(id).value.trim(); }
function validateNameInput(el) { const re = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/; const ok = re.test(el.value); if (!ok) el.value = el.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, ''); el.classList.toggle('invalid', !ok && el.value); const e = document.getElementById(el.id + 'Error'); if (e) e.style.display = (!ok && el.value) ? 'block' : 'none'; }
function validateUsername(el) { const re = /^[A-Za-z0-9]*$/; const ok = re.test(el.value); if (!ok) el.value = el.value.replace(/[^A-Za-z0-9]/g, ''); el.classList.toggle('invalid', !ok && el.value); document.getElementById('usernameError').style.display = (!ok && el.value) ? 'block' : 'none'; }
function formatPhone(el) { let v = el.value.replace(/\D/g, ''); if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 8); el.value = v; const ok = v.length === 9; el.classList.toggle('invalid', !ok && v); document.getElementById('phoneError').style.display = (!ok && v) ? 'block' : 'none'; }
function updateDocNumberPattern() { const el = document.getElementById('docNumber'); const type = document.getElementById('docType').value; el.value = ''; el.classList.remove('invalid'); document.getElementById('docNumberError').style.display = 'none'; if (type === 'DUI') { el.placeholder = 'xxxxxxxx-x'; el.maxLength = 10; } else { el.placeholder = 'xxxx-xxxxxx-xxx-x'; el.maxLength = 16; } }
function formatDocNumber(el) { const t = document.getElementById('docType').value; let v = el.value.replace(/\D/g, ''); if (t === 'DUI') { if (v.length > 8) v = v.slice(0, 8) + '-' + v.slice(8, 9); el.value = v; const ok = v.length === 10; el.classList.toggle('invalid', !ok && v); document.getElementById('docNumberError').style.display = (!ok && v) ? 'block' : 'none'; } else { if (v.length > 4) v = v.slice(0, 4) + '-' + v.slice(4, 10); if (v.length > 11) v = v.slice(0, 11) + '-' + v.slice(11, 14); if (v.length > 15) v = v.slice(0, 15) + '-' + v.slice(15, 16); el.value = v; const ok = v.length === 16; el.classList.toggle('invalid', !ok && v); document.getElementById('docNumberError').style.display = (!ok && v) ? 'block' : 'none'; } }
function validateBirthDate() { const el = document.getElementById('birthDate'); if (!el.value) { el.classList.add('invalid'); document.getElementById('birthDateError').style.display = 'block'; return false; } const d = new Date(el.value), now = new Date(); if (d > now) { el.classList.add('invalid'); document.getElementById('birthDateError').textContent = 'La fecha no puede ser futura'; document.getElementById('birthDateError').style.display = 'block'; return false; } let age = now.getFullYear() - d.getFullYear(); const m = now.getMonth() - d.getMonth(); if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--; const ok = age >= 18 && age <= 85; el.classList.toggle('invalid', !ok); document.getElementById('birthDateError').textContent = 'El empleado debe tener entre 18 y 85 años'; document.getElementById('birthDateError').style.display = ok ? 'none' : 'block'; return ok; }
function validateHireDate() { const el = document.getElementById('hireDate'); if (!el.value) { el.classList.add('invalid'); document.getElementById('hireDateError').style.display = 'block'; return false; } const h = new Date(el.value), now = new Date(); if (h > now) { el.classList.add('invalid'); document.getElementById('hireDateError').textContent = 'La fecha no puede ser futura'; document.getElementById('hireDateError').style.display = 'block'; return false; } const bdv = document.getElementById('birthDate').value; if (bdv) { const bd = new Date(bdv); const min = new Date(bd); min.setFullYear(min.getFullYear() + 18); if (h < min) { el.classList.add('invalid'); document.getElementById('hireDateError').textContent = 'Debe ser posterior a los 18 años'; document.getElementById('hireDateError').style.display = 'block'; return false; } } el.classList.remove('invalid'); document.getElementById('hireDateError').style.display = 'none'; return true; }
function validateAddress(el) { const re = /^[A-Za-z0-9 #ÁÉÍÓÚáéíóúÑñ,.\s]*$/; const ok = re.test(el.value) && el.value.length <= 160; if (!ok) el.value = el.value.replace(/[^A-Za-z0-9 #ÁÉÍÓÚáéíóúÑñ,.\s]/g, ''); el.classList.toggle('invalid', !ok && el.value); document.getElementById('addressError').style.display = (!ok && el.value) ? 'block' : 'none'; }
function updateEmail() { const fn = (document.getElementById('firstName').value || '').toLowerCase().replace(/\s/g, ''); const lp = (document.getElementById('lastNameP').value || '').toLowerCase().replace(/\s/g, ''); emailInput.value = fn && lp ? `${fn}_${lp}@orderly.com` : ''; }
function deleteEmployee(id) { if (confirm('¿Eliminar este empleado?')) { const i = employees.findIndex(e => e.id === id); if (i > -1) { employees.splice(i, 1); renderTable(); } } }
