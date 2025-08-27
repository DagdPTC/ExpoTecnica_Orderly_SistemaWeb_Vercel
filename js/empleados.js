// Datos pre-registrados
const employees = [
  {
    id: 1,
    firstName: "Juan",
    secondName: "Carlos",
    lastNameP: "Pérez",
    lastNameM: "Gómez",
    birthDate: "1985-05-15",
    phone: "+503 7890-1234",
    docType: "DUI",
    docNumber: "12345678-9",
    role: "Administrador",
    username: "jperez",
    password: "Admin123#",
    email: "juan_perez@orderly.com",
    hireDate: "2020-01-10",
    address: "Calle Principal #123, Colonia Centro"
  },
  {
    id: 2,
    firstName: "María",
    secondName: "Isabel",
    lastNameP: "Rodríguez",
    lastNameM: "Martínez",
    birthDate: "1990-08-22",
    phone: "+503 6789-4321",
    docType: "DUI",
    docNumber: "98765432-1",
    role: "Mesero",
    username: "mrodriguez",
    password: "Mesero123#",
    email: "maria_rodriguez@orderly.com",
    hireDate: "2021-03-15",
    address: "Avenida Norte #456, Colonia Escalón"
  },
  {
    id: 3,
    firstName: "Pedro",
    secondName: "Antonio",
    lastNameP: "González",
    lastNameM: "",
    birthDate: "1995-11-30",
    phone: "+503 7654-9876",
    docType: "Licencia",
    docNumber: "1234-567890-123-4",
    role: "Cocinero",
    username: "pgonzalez",
    password: "Cocinero123#",
    email: "pedro_gonzalez@orderly.com",
    hireDate: "2022-05-20",
    address: "Calle Oriente #789, Colonia San Benito"
  }
];

let editingId = null;

// DOM elements
const employeeForm = document.getElementById('employeeForm');
const addEmployeeBtn = document.getElementById('addEmployeeBtn');
const employeeModal = document.getElementById('employeeModal');
const cancelBtn = document.getElementById('cancelBtn');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');
const emailInput = document.getElementById('email');
const searchInput = document.getElementById('searchInput');
const employeesTbody = document.getElementById('employees-tbody');
const roleFilterButton = document.getElementById('roleFilterButton');
const roleFilterDropdown = document.getElementById('roleFilterDropdown');
const roleFilters = document.querySelectorAll('.role-filter');
const docTypeSelect = document.getElementById('docType');
const docNumberInput = document.getElementById('docNumber');
const sidebarToggleBtn = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('mainContent');

// Sidebar toggle
sidebarToggleBtn.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('collapsed');
});

// User dropdown
document.addEventListener('DOMContentLoaded', () => {
  const userBtn = document.getElementById('navbarUserBtn');
  if (userBtn) {
    if (!document.getElementById('userDropdown')) {
      const dropdown = document.createElement('div');
      dropdown.className = 'user-dropdown';
      dropdown.id = 'userDropdown';
      dropdown.innerHTML = `
        <button class="user-dropdown-item" id="logoutBtn">
          <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
        </button>`;
      userBtn.parentNode.appendChild(dropdown);
      userBtn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
      });
      document.addEventListener('click', () => dropdown.classList.remove('show'));
      document.getElementById('logoutBtn').addEventListener('click', () => {
        window.location.href = 'inicioSesion.html';
      });
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  addEmployeeBtn.addEventListener('click', () => openForm());
  cancelBtn.addEventListener('click', () => closeForm());
  togglePassword.addEventListener('click', togglePasswordVisibility);
  document.getElementById('firstName').addEventListener('input', updateEmail);
  document.getElementById('lastNameP').addEventListener('input', updateEmail);
  searchInput.addEventListener('input', renderTable);
  roleFilterButton.addEventListener('click', () => roleFilterDropdown.classList.toggle('hidden'));
  roleFilters.forEach(cb => cb.addEventListener('change', renderTable));
  docTypeSelect.addEventListener('change', updateDocNumberPattern);
  employeeForm.addEventListener('submit', handleFormSubmit);
  renderTable();
});

// Validation helpers
function validateNameInput(input) {
  const re = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]*$/;
  const valid = re.test(input.value);
  if (!valid) input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
  input.classList.toggle('invalid-input', !valid && input.value);
  document.getElementById(input.id + 'Error').style.display = (!valid && input.value) ? 'block' : 'none';
}

function formatPhone(input) {
  let v = input.value.replace(/\D/g,'');
  if (v.length>4) v=v.slice(0,4)+'-'+v.slice(4,8);
  input.value=v;
  const ok=v.length===9;
  input.classList.toggle('invalid-input', !ok && v);
  document.getElementById('phoneError').style.display = (!ok && v) ? 'block':'none';
}

function formatDocNumber(input) {
  const docType = docTypeSelect.value;
  let v = input.value.replace(/\D/g,'');
  
  if (docType === 'DUI') {
    if (v.length > 8) v = v.slice(0,8) + '-' + v.slice(8,9);
    input.value = v;
    const ok = v.length === 10;
    input.classList.toggle('invalid-input', !ok && v);
    document.getElementById('docNumberError').style.display = (!ok && v) ? 'block' : 'none';
  } 
  else if (docType === 'Licencia') {
    // Formato: xxxx-xxxxxx-xxx-x (4-6-3-1)
    if (v.length > 4) v = v.slice(0,4) + '-' + v.slice(4,10);
    if (v.length > 11) v = v.slice(0,11) + '-' + v.slice(11,14);
    if (v.length > 15) v = v.slice(0,15) + '-' + v.slice(15,16);
    input.value = v;
    const ok = v.length === 16;
    input.classList.toggle('invalid-input', !ok && v);
    document.getElementById('docNumberError').style.display = (!ok && v) ? 'block' : 'none';
  }
}

function validateUsername(input) {
  const re=/^[A-Za-z0-9]*$/;
  const ok=re.test(input.value);
  if (!ok) input.value=input.value.replace(/[^A-Za-z0-9]/g,'');
  input.classList.toggle('invalid-input', !ok && input.value);
  document.getElementById(input.id+'Error').style.display = (!ok&&input.value)?'block':'none';
}

function validateBirthDate() {
  const bd = document.getElementById('birthDate');
  const d = new Date(bd.value);
  const t = new Date();
  
  if (!bd.value) {
    bd.classList.add('invalid-input');
    document.getElementById('birthDateError').style.display = 'block';
    return false;
  }

  // Validar que no sea fecha futura
  if (d > t) {
    bd.classList.add('invalid-input');
    document.getElementById('birthDateError').textContent = 'La fecha no puede ser futura';
    document.getElementById('birthDateError').style.display = 'block';
    return false;
  }

  // Calcular edad (18-85 años)
  let age = t.getFullYear() - d.getFullYear();
  const monthDiff = t.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && t.getDate() < d.getDate())) {
    age--;
  }

  const ok = age >= 18 && age <= 85;
  bd.classList.toggle('invalid-input', !ok);
  document.getElementById('birthDateError').textContent = 'El empleado debe tener entre 18 y 85 años';
  document.getElementById('birthDateError').style.display = !ok ? 'block' : 'none';
  return ok;
}

function validateHireDate() {
  const hd = document.getElementById('hireDate');
  const h = new Date(hd.value);
  const t = new Date();
  const bd = new Date(document.getElementById('birthDate').value);

  if (!hd.value) {
    hd.classList.add('invalid-input');
    document.getElementById('hireDateError').style.display = 'block';
    return false;
  }

  // Validar que no sea fecha futura
  if (h > t) {
    hd.classList.add('invalid-input');
    document.getElementById('hireDateError').textContent = 'La fecha no puede ser futura';
    document.getElementById('hireDateError').style.display = 'block';
    return false;
  }

  // Validar que sea posterior a la fecha de nacimiento + 18 años
  if (bd) {
    const minHireDate = new Date(bd);
    minHireDate.setFullYear(minHireDate.getFullYear() + 18);
    
    if (h < minHireDate) {
      hd.classList.add('invalid-input');
      document.getElementById('hireDateError').textContent = 'La fecha debe ser posterior a los 18 años de edad';
      document.getElementById('hireDateError').style.display = 'block';
      return false;
    }
  }

  hd.classList.remove('invalid-input');
  document.getElementById('hireDateError').style.display = 'none';
  return true;
}

function validateAddress(input) {
  const re=/^[A-Za-z0-9 #ÁÉÍÓÚáéíóúÑñ,.\s]*$/;
  const ok=re.test(input.value)&&input.value.length<=160;
  if (!ok) input.value=input.value.replace(/[^A-Za-z0-9 #ÁÉÍÓÚáéíóúÑñ,.\s]/g,'');
  input.classList.toggle('invalid-input', !ok&&input.value);
  document.getElementById(input.id+'Error').style.display = (!ok&&input.value)?'block':'none';
}

function togglePasswordVisibility() {
  if (passwordInput.type==='password') {
    passwordInput.type='text';
    togglePassword.innerHTML='<i class="fas fa-eye-slash"></i>';
  } else {
    passwordInput.type='password';
    togglePassword.innerHTML='<i class="fas fa-eye"></i>';
  }
}

function updateDocNumberPattern() {
  docNumberInput.value='';
  docNumberInput.classList.remove('invalid-input');
  document.getElementById('docNumberError').style.display='none';
  
  if (docTypeSelect.value==='DUI') {
    docNumberInput.placeholder='xxxxxxxx-x';
    docNumberInput.maxLength=10;
  } 
  else if (docTypeSelect.value==='Licencia') {
    docNumberInput.placeholder='xxxx-xxxxxx-xxx-x';
    docNumberInput.maxLength=16;
  } 
  else {
    docNumberInput.placeholder='';
    docNumberInput.removeAttribute('maxLength');
  }
  
  // Actualizar el evento de input según el tipo de documento
  docNumberInput.removeEventListener('input', formatDocNumber);
  docNumberInput.addEventListener('input', function() {
    formatDocNumber(this);
  });
}

function updateEmail() {
  const fn=getValue('firstName').toLowerCase().replace(/\s/g,''), lp=getValue('lastNameP').toLowerCase().replace(/\s/g,'');
  emailInput.value = fn&&lp ? `${fn}_${lp}@orderly.com` : '';
}

// Form handlers
function openForm(emp=null) {
  document.getElementById('modalTitle').textContent = emp?'Editar Empleado':'Nuevo Empleado';
  document.querySelectorAll('.error-message').forEach(e=>e.style.display='none');
  document.querySelectorAll('.invalid-input').forEach(e=>e.classList.remove('invalid-input'));
  if (emp) {
    editingId=emp.id;
    ['firstName','secondName','lastNameP','lastNameM','birthDate','phone','docNumber','role','username','password','hireDate','address'].forEach(f=>{
      const el=document.getElementById(f);
      let v= emp[f] || '';
      if (f==='phone') v=v.replace('+503 ','');
      el.value=v;
    });
    docTypeSelect.value=emp.docType;
    updateDocNumberPattern();
    emailInput.value=emp.email;
  } else {
    editingId=null;
    employeeForm.reset();
    emailInput.value='';
    updateDocNumberPattern();
  }
  employeeModal.classList.remove('hidden');
  document.body.style.overflow='hidden';
}

function closeForm() {
  employeeModal.classList.add('hidden');
  document.body.style.overflow='';
  editingId=null;
  employeeForm.reset();
  emailInput.value='';
  document.querySelectorAll('.invalid-input').forEach(e=>e.classList.remove('invalid-input'));
  document.querySelectorAll('.error-message').forEach(e=>e.style.display='none');
}

function handleFormSubmit(e) {
  e.preventDefault();
  if (!validateForm()) return;
  const emp = {
    id: editingId||Date.now(),
    firstName:getValue('firstName').trim(),
    secondName:getValue('secondName').trim(),
    lastNameP:getValue('lastNameP').trim(),
    lastNameM:getValue('lastNameM').trim(),
    birthDate:getValue('birthDate'),
    phone:`+503 ${getValue('phone')}`,
    docType:getValue('docType'),
    docNumber:getValue('docNumber').trim(),
    role:getValue('role'),
    username:getValue('username').trim(),
    password:getValue('password').trim(),
    email:emailInput.value,
    hireDate:getValue('hireDate'),
    address:getValue('address').trim()
  };
  if (editingId) {
    const idx=employees.findIndex(x=>x.id===editingId);
    employees[idx]=emp;
  } else {
    employees.push(emp);
  }
  closeForm();
  renderTable();
}

function validateForm() {
  let ok = true;
  
  // Validar campos requeridos
  ['firstName','lastNameP','birthDate','phone','docNumber','role','username','password','hireDate','address'].forEach(f=>{
    const el = document.getElementById(f);
    const err = document.getElementById(f+'Error');
    if (!el.value.trim()) {
      el.classList.add('invalid-input'); 
      err.style.display='block'; 
      ok=false;
    }
  });

  // Validar fechas
  if (!validateBirthDate()) ok = false;
  if (!validateHireDate()) ok = false;

  return ok;
}

// Render tabla
function renderTable() {
  employeesTbody.innerHTML='';
  const term=searchInput.value.toLowerCase();
  const roles=Array.from(document.querySelectorAll('.role-filter:checked')).map(cb=>cb.value);
  employees.filter(emp=>{
    const matchSearch=[emp.firstName,emp.lastNameP,emp.username,emp.email].join(' ').toLowerCase().includes(term);
    const matchRole=roles.includes('all')||roles.includes(emp.role);
    return matchSearch&&matchRole;
  }).forEach((emp,i)=>{
    const tr=document.createElement('tr');
    tr.className='hover:bg-gray-50';
    tr.innerHTML=`
      <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${emp.firstName} ${emp.lastNameP}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.username}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.email}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${emp.role}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600 cursor-pointer toggle-details" data-target="details-${i+1}">
        Detalles <i class="fas fa-chevron-down ml-1 text-xs"></i>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button class="employee-action-edit mr-2" onclick="openForm(employees[${i}])" title="Editar">
          <i class="fas fa-edit"></i>
        </button>
        <button class="employee-action-delete" onclick="deleteEmployee(${i})" title="Eliminar">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    const detailTr=document.createElement('tr');
    detailTr.innerHTML=`
      <td colspan="6" class="px-0 py-0">
        <div id="details-${i+1}" class="order-details">
          <div class="details-content px-6 py-4">
            <div class="grid grid-cols-2 gap-4">
              <div><span class="font-medium">Segundo Nombre:</span> ${emp.secondName||'N/A'}</div>
              <div><span class="font-medium">Apellido Materno:</span> ${emp.lastNameM||'N/A'}</div>
              <div><span class="font-medium">Fecha Nac.:</span> ${formatDate(emp.birthDate)}</div>
              <div><span class="font-medium">Teléfono:</span> ${emp.phone}</div>
              <div><span class="font-medium">Documento:</span> ${emp.docType} ${emp.docNumber}</div>
              <div><span class="font-medium">Fecha Contr.:</span> ${formatDate(emp.hireDate)}</div>
              <div class="col-span-2"><span class="font-medium">Dirección:</span> ${emp.address}</div>
              <div class="col-span-2">
                <span class="font-medium">Contraseña:</span>
                <span id="pw-${emp.id}">••••••••</span>
                <button onclick="togglePwd(${emp.id},'${emp.password}')" class="text-gray-500 ml-1">
                  <i class="fas fa-eye"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </td>
    `;
    employeesTbody.appendChild(tr);
    employeesTbody.appendChild(detailTr);
  });
  attachEvents();
}

// Helpers
function getValue(id){return document.getElementById(id).value}
function formatDate(s){return new Date(s).toLocaleDateString('es-ES')}

// Attach events for details & delete
function attachEvents() {
  document.querySelectorAll('.toggle-details').forEach(btn=>{
    btn.onclick=()=>{
      const tgt=document.getElementById(btn.dataset.target);
      tgt.classList.toggle('active');
      btn.querySelector('i').classList.toggle('fa-chevron-down');
      btn.querySelector('i').classList.toggle('fa-chevron-up');
    };
  });
}

function deleteEmployee(idx){
  if(confirm('¿Eliminar empleado?')){
    employees.splice(idx,1);
    renderTable();
  }
}

window.togglePwd = function(id,pw){
  const span=document.getElementById(`pw-${id}`), icon=span.nextElementSibling.querySelector('i');
  if(span.textContent==='••••••••'){
    span.textContent=pw; icon.classList.replace('fa-eye','fa-eye-slash');
  } else {
    span.textContent='••••••••'; icon.classList.replace('fa-eye-slash','fa-eye');
  }
};