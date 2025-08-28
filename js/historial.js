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

// ===== Datos simulados =====
let historial = [
  {
    id: "H001",
    pedido: "P1001",
    cliente: "Roberto Sánchez",
    mesero: "Carlos López",
    mesa: "5",
    fecha: "2023-06-15",
    reserva: true,
    factura: "FAC-2023-1001",
    estado: "Entregado",
    productos: [
      { nombre: "Pizza Margarita", cantidad: 2, precioUnit: 12.00 },
      { nombre: "Ensalada César", cantidad: 1, precioUnit: 12.00 },
      { nombre: "Refresco", cantidad: 3, precioUnit: 3.00 }
    ],
    descuento: 0
  },
  {
    id: "H002",
    pedido: "P1002",
    cliente: "Laura Méndez",
    mesero: "María García",
    mesa: "8",
    fecha: "2023-06-15",
    reserva: false,
    factura: "",
    estado: "En proceso",
    productos: [
      { nombre: "Sopa del día", cantidad: 1, precioUnit: 8.00 },
      { nombre: "Pasta Carbonara", cantidad: 1, precioUnit: 15.00 },
      { nombre: "Agua mineral", cantidad: 2, precioUnit: 3.00 }
    ],
    descuento: 0
  },
  {
    id: "H003",
    pedido: "P1003",
    cliente: "Carlos Ruiz",
    mesero: "Carlos López",
    mesa: "3",
    fecha: "2023-06-14",
    reserva: true,
    factura: "",
    estado: "Cancelado",
    productos: [
      { nombre: "Hamburguesa", cantidad: 1, precioUnit: 10.00 },
      { nombre: "Papas fritas", cantidad: 1, precioUnit: 5.00 },
      { nombre: "Cerveza", cantidad: 2, precioUnit: 6.00 }
    ],
    descuento: 0
  }
];

const meseros = ["Juan Pérez", "María García", "Carlos López", "Ana Martínez"];
const mesas = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
let editIdx = null;

// Renderizar tabla
function renderHistorial() {
  const tbody = document.getElementById("historial-tbody");
  tbody.innerHTML = "";

  historial.forEach((h, i) => {
    const estadoClass = h.estado === "Entregado"
      ? "status-entregado"
      : h.estado === "Cancelado"
        ? "status-cancelado"
        : "status-proceso-historial";

    const reservaIcon = h.reserva
      ? `<i class="fas fa-check-circle text-green-500" title="Con reserva"></i>`
      : `<i class="fas fa-times-circle text-red-500" title="Sin reserva"></i>`;

    const facturaTxt = h.factura
      ? `<span class="font-medium text-green-600">${h.factura}</span>`
      : `<span class="font-medium text-red-500">No generada</span>`;

    // Mobile-friendly row structure
    tbody.innerHTML += `
          <tr class="table-row hover:bg-gray-50 transition-colors">
            <td class="px-4 py-4 font-medium text-gray-900">${h.id}</td>
            <td class="px-4 py-4 font-medium text-blue-600">${h.pedido}</td>
            <td class="px-4 py-4">
              <div class="font-medium text-gray-900">${h.cliente}</div>
              <div class="md:hidden text-sm text-gray-500">
                Mesa: ${h.mesa} | ${h.mesero} | ${h.fecha}
              </div>
            </td>
            <td class="px-4 py-4 text-gray-700 hide-mobile">${h.mesero}</td>
            <td class="px-4 py-4 text-gray-700 hide-mobile">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Mesa ${h.mesa}
              </span>
            </td>
            <td class="px-4 py-4 text-gray-700 hide-mobile">${h.fecha}</td>
            <td class="px-4 py-4 hide-mobile">${reservaIcon}</td>
            <td class="px-4 py-4">
              <span class="status-badge ${estadoClass}">${h.estado}</span>
            </td>
            <td class="px-4 py-4">
              <button class="text-blue-600 hover:text-blue-800 font-medium transition-colors toggle-details" data-target="details-${i}">
                <i class="fas fa-eye mr-1"></i>
                Ver detalles
                <i class="fas fa-chevron-down ml-1 text-xs transition-transform"></i>
              </button>
            </td>
            <td class="px-4 py-4">
              <div class="flex items-center space-x-2">
                <button class="p-2 rounded-lg hover:bg-green-100 edit-btn" data-idx="${i}" title="Editar">
                  <i class="fas fa-edit text-green-500 text-lg"></i>
                </button>
                <button class="p-2 rounded-lg hover:bg-red-100 delete-btn" data-idx="${i}" title="Eliminar">
                  <i class="fas fa-trash text-red-500 text-lg"></i>
                </button>
              </div>
            </td>
          </tr>
          <tr>
            <td colspan="10" class="p-0">
              <div id="details-${i}" class="order-details">
                <div class="space-y-4">
                  <h4 class="font-semibold text-gray-800 text-lg mb-4">
                    <i class="fas fa-list-ul mr-2 text-blue-500"></i>
                    Detalles del Pedido
                  </h4>
                  
                  <div class="bg-white rounded-lg p-4 shadow-sm">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm mb-4 font-semibold text-gray-600 border-b pb-2">
                      <div>Producto</div>
                      <div class="text-right">Cantidad</div>
                      <div class="text-right">Precio Unit.</div>
                      <div class="text-right">Total</div>
                    </div>
                    ${h.productos.map(p => `
                      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm py-2 border-b border-gray-100 hover:bg-gray-50 rounded">
                        <div class="font-medium text-gray-800">${p.nombre}</div>
                        <div class="text-right text-gray-600">${p.cantidad}</div>
                        <div class="text-right text-gray-600">${p.precioUnit.toFixed(2)}</div>
                        <div class="text-right font-semibold text-gray-800">${(p.cantidad * p.precioUnit).toFixed(2)}</div>
                      </div>
                    `).join("")}
                  </div>
                  
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                    <div class="text-center">
                      <div class="text-sm text-gray-500 mb-1">Subtotal</div>
                      <div class="text-lg font-bold text-gray-800">${getSubtotal(h).toFixed(2)}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-sm text-gray-500 mb-1">Propina (10%)</div>
                      <div class="text-lg font-bold text-gray-800">${getPropina(h).toFixed(2)}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-sm text-gray-500 mb-1">Descuento</div>
                      <div class="text-lg font-bold text-red-500">-${getDescuento(h).toFixed(2)}</div>
                    </div>
                    <div class="text-center">
                      <div class="text-sm text-gray-500 mb-1">Total Final</div>
                      <div class="text-xl font-bold text-blue-600">${getTotal(h).toFixed(2)}</div>
                    </div>
                  </div>
                  
                  <div class="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div class="text-sm text-gray-500 mb-1">Estado de Factura:</div>
                    <div>${facturaTxt}</div>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        `;
  });

  attachTableEvents();
}

// Búsqueda
document.getElementById('searchInput').addEventListener('input', () => {
  const term = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('#historial-tbody tr').forEach((row, idx) => {
    if (idx % 2 === 0) {
      const visible = row.textContent.toLowerCase().includes(term);
      row.style.display = visible ? '' : 'none';
      const det = row.nextElementSibling;
      if (det) det.style.display = visible ? '' : 'none';
    }
  });
});

// Filtros
function applyFilters() {
  const w = document.getElementById('waiterFilter').value.toLowerCase();
  const d = document.getElementById('dateFilter').value;
  const s = document.getElementById('statusFilter').value.toLowerCase();

  document.querySelectorAll('#historial-tbody tr').forEach((row, idx) => {
    if (idx % 2 === 0) {
      const cells = row.querySelectorAll('td');
      const mw = cells[3] ? cells[3].textContent.toLowerCase() : '';
      const dt = cells[5] ? cells[5].textContent : '';
      const st = cells[7] ? cells[7].textContent.toLowerCase() : '';

      const ok = (!w || mw.includes(w)) && (!d || dt === d) && (!s || st.includes(s));
      row.style.display = ok ? '' : 'none';
      const det = row.nextElementSibling;
      if (det) det.style.display = ok ? '' : 'none';
    }
  });
}

['waiterFilter', 'dateFilter', 'statusFilter'].forEach(id => {
  document.getElementById(id).addEventListener('change', applyFilters);
});

// Toggle detalles y CRUD
function attachTableEvents() {
  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.addEventListener('click', () => {
      const det = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');

      det.classList.toggle('active');
      if (icon) {
        icon.classList.toggle('fa-chevron-down');
        icon.classList.toggle('fa-chevron-up');
      }
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditHistorial(+btn.dataset.idx);
    });
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Está seguro de que desea eliminar este registro del historial?')) {
        historial.splice(+btn.dataset.idx, 1);
        renderHistorial();
      }
    });
  });
}

// Cálculos
const getSubtotal = h => h.productos.reduce((sum, p) => sum + p.cantidad * p.precioUnit, 0);
const getPropina = h => getSubtotal(h) * 0.10;
const getDescuento = h => getSubtotal(h) * (h.descuento || 0);
const getTotal = h => getSubtotal(h) - getDescuento(h) + getPropina(h);

// Abrir modal de edición
function openEditHistorial(idx) {
  editIdx = idx;
  const h = historial[idx];

  document.getElementById('edit-pedido-id').value = h.pedido;
  document.getElementById('edit-cliente').value = h.cliente;
  document.getElementById('edit-fecha').value = h.fecha;
  document.getElementById('edit-reserva').value = h.reserva ? 'Sí' : 'No';
  document.getElementById('edit-factura').value = h.factura || '';
  document.getElementById('edit-estado').value = h.estado;

  // Carga meseros y mesas
  const selM = document.getElementById('edit-mesero');
  selM.innerHTML = '';
  meseros.forEach(m => {
    selM.innerHTML += `<option ${m === h.mesero ? 'selected' : ''}>${m}</option>`;
  });

  const selT = document.getElementById('edit-mesa');
  selT.innerHTML = '';
  mesas.forEach(m => {
    selT.innerHTML += `<option ${m === h.mesa ? 'selected' : ''}>${m}</option>`;
  });

  // Productos (cantidad editable)
  const prodDiv = document.getElementById('edit-productos-list');
  prodDiv.innerHTML = '';
  h.productos.forEach((p, i) => {
    prodDiv.innerHTML += `
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-white rounded-lg border">
            <div class="flex-1">
              <input type="text" class="modern-input w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-700 font-medium" value="${p.nombre}" readonly>
            </div>
            <div class="flex items-center gap-3">
              <div class="flex items-center">
                <label class="text-sm font-medium text-gray-600 mr-2">Cant:</label>
                <input type="number" min="1" max="9999" id="prod-cant-${i}" class="modern-input w-20 px-3 py-2 border rounded-lg prod-cant-input text-center font-semibold" value="${p.cantidad}">
              </div>
              <div class="text-gray-600 font-semibold whitespace-nowrap">× ${p.precioUnit.toFixed(2)}</div>
            </div>
            <span class="error-message hidden" id="prod-cant-${i}-error"></span>
          </div>
        `;
  });

  // Descuento
  document.getElementById('edit-descuento').value = h.descuento || 0;
  recalcularModal();

  // Mostrar modal
  document.getElementById('edit-historial-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeModal() {
  document.getElementById('edit-historial-modal').classList.add('hidden');
  document.body.style.overflow = '';
}

// Recalcular totales en modal
document.addEventListener('input', e => {
  if (e.target.classList.contains('prod-cant-input') || e.target.id === 'edit-descuento') {
    recalcularModal();
  }
});

function recalcularModal() {
  if (editIdx === null) return;

  const h = historial[editIdx];
  let sub = 0;

  h.productos.forEach((p, i) => {
    const val = parseInt(document.getElementById('prod-cant-' + i).value) || 0;
    sub += val * p.precioUnit;
  });

  const desc = sub * (parseFloat(document.getElementById('edit-descuento').value) || 0);
  const prop = sub * 0.10;

  document.getElementById('edit-subtotal').textContent = `$${sub.toFixed(2)}`;
  document.getElementById('edit-propina').textContent = `$${prop.toFixed(2)}`;
  document.getElementById('edit-total').textContent = `$${(sub - desc + prop).toFixed(2)}`;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderHistorial();

  // Modal close events
  document.getElementById('edit-cancelar-btn').addEventListener('click', closeModal);
  document.getElementById('edit-cancelar-btn-footer').addEventListener('click', closeModal);

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
});
