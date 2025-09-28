document.addEventListener('DOMContentLoaded', function () {
  let userBtn = document.querySelector('.navbar-user-avatar');
  if (userBtn) {
    userBtn.style.position = 'relative';

    if (!document.getElementById('userDropdown')) {
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

      const overlay = document.createElement('div');
      overlay.className = 'user-dropdown-overlay';
      overlay.id = 'userDropdownOverlay';
      document.body.appendChild(overlay);

      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.key === "Escape") {
          dropdown.classList.remove('show');
          overlay.classList.remove('active');
        }
      });

      document.getElementById('logoutBtn').addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
        window.location.href = "inicioSesion.html";
      });
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('mobile-open');
      mobileOverlay.classList.toggle('active');
    });
  }

  if (sidebarToggleDesktop && sidebar) {
    sidebarToggleDesktop.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key === "Escape") {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });
});

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

  document.querySelectorAll('.animate-fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
});

// Función para obtener los empleados desde la API
async function getEmpleados() {
  try {
    const response = await fetch('http://localhost:8080/apiEmpleado/getDataEmpleado', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`  // Usando el token almacenado en el localStorage
      },
      credentials: 'include',  // Permite incluir las cookies si es necesario
    });

    if (!response.ok) {
      throw new Error('Error al obtener los empleados');
    }

    const data = await response.json();
    return data.content;  // Ajusta según la estructura de la respuesta del backend
  } catch (error) {
    console.error("Error al obtener empleados:", error);
    return [];  // Retornamos un array vacío en caso de error
  }
}

// Función para renderizar los empleados en la tabla
function renderTable(empleados) {
  const tbody = document.getElementById('employees-tbody');
  tbody.innerHTML = '';  // Limpiar la tabla antes de llenarla

  empleados.forEach(emp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
                    <td><div class="font-semibold text-slate-800">${emp.firstName} ${emp.lastNameP}</div></td>
                    <td>${emp.username}</td>
                    <td class="hidden sm:table-cell">${emp.email}</td>
                    <td><span class="chip ${(emp.role)}">${emp.role}</span></td>
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
                                <div><div class="font-semibold">Fecha de Nacimiento</div><div>${(emp.birthDate)}</div></div>
                                <div><div class="font-semibold">Teléfono</div><div>${emp.phone}</div></div>
                                <div><div class="font-semibold">Documento</div><div>${emp.docType} ${emp.docNumber}</div></div>
                                <div><div class="font-semibold">Fecha Contratación</div><div>${(emp.hireDate)}</div></div>
                                <div class="lg:col-span-3"><div class="font-semibold">Dirección</div><div>${emp.address}</div></div>
                            </div>
                        </div>
                    </td>`;
    tbody.appendChild(tr);
    tbody.appendChild(tr2);
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


