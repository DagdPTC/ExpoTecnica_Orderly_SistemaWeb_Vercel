
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

let invoicesData = [
  {
    id: 1,
    invoiceNumber: "FAC-001",
    orderNumber: "ORD-001",
    clientName: "Roberto Sánchez",
    waiterName: "Juan Pérez",
    date: "2023-05-15",
    products: [
      { name: "Pizza Margarita", quantity: 1, price: 12.50 },
      { name: "Ensalada César", quantity: 2, price: 8.00 },
      { name: "Refresco", quantity: 3, price: 2.50 }
    ]
  },
  {
    id: 2,
    invoiceNumber: "FAC-002",
    orderNumber: "ORD-002",
    clientName: "Laura Gómez",
    waiterName: "María García",
    date: "2023-05-16",
    products: [
      { name: "Pasta Carbonara", quantity: 1, price: 10.50 },
      { name: "Vino Tinto", quantity: 1, price: 15.00 }
    ]
  },
  {
    id: 3,
    invoiceNumber: "FAC-003",
    orderNumber: "ORD-003",
    clientName: "Carlos Mendoza",
    waiterName: "Carlos López",
    date: "2023-05-17",
    products: [
      { name: "Hamburguesa", quantity: 2, price: 9.00 },
      { name: "Papas Fritas", quantity: 2, price: 4.50 },
      { name: "Limonada", quantity: 2, price: 3.00 }
    ]
  },
  {
    id: 4,
    invoiceNumber: "FAC-004",
    orderNumber: "ORD-004",
    clientName: "Ana Rodríguez",
    waiterName: "Ana Martínez",
    date: "2023-05-18",
    products: [
      { name: "Salmón Grillado", quantity: 1, price: 18.00 },
      { name: "Arroz con Vegetales", quantity: 1, price: 6.50 },
      { name: "Agua Mineral", quantity: 2, price: 2.00 }
    ]
  },
  {
    id: 5,
    invoiceNumber: "FAC-005",
    orderNumber: "ORD-005",
    clientName: "Miguel Torres",
    waiterName: "Juan Pérez",
    date: "2023-05-19",
    products: [
      { name: "Tacos de Pollo", quantity: 3, price: 7.50 },
      { name: "Guacamole", quantity: 1, price: 4.00 },
      { name: "Cerveza", quantity: 2, price: 3.50 }
    ]
  }
];
let filteredInvoices = [];

function formatDate(str) {
  return new Date(str).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function calculateTotals(products) {
  let sub = 0;
  products.forEach(p => sub += p.price * p.quantity);
  let tip = sub * 0.10;
  let tot = sub + tip;
  return { sub, tip, tot };
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoicesTableBody');
  tbody.innerHTML = '';

  if (invoices.length === 0) {
    tbody.innerHTML = `
          <tr>
            <td colspan="7" class="px-8 py-12 text-center">
              <div class="flex flex-col items-center">
                <i class="fas fa-file-invoice text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-500 mb-2">No se encontraron facturas</h3>
                <p class="text-gray-400">Intenta ajustar los filtros de búsqueda</p>
              </div>
            </td>
          </tr>
        `;
    return;
  }

  invoices.forEach((inv, i) => {
    const { sub, tip, tot } = calculateTotals(inv.products);

    const tr1 = document.createElement('tr');
    tr1.className = 'table-row hover:bg-gray-50';
    tr1.innerHTML = `
          <td class="px-8 py-6 text-sm font-bold text-gray-900">
            <div class="flex items-center">
              <div class="w-3 h-3 rounded-full bg-green-400 mr-3"></div>
              ${inv.invoiceNumber}
            </div>
          </td>
          <td class="px-8 py-6 text-sm text-gray-600 font-medium">${inv.orderNumber}</td>
          <td class="px-8 py-6 text-sm text-gray-700 font-medium">${inv.clientName}</td>
          <td class="px-8 py-6 text-sm text-gray-600">
            <div class="flex items-center">
              <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold mr-3">
                ${inv.waiterName.split(' ').map(n => n[0]).join('')}
              </div>
              ${inv.waiterName}
            </div>
          </td>
          <td class="px-8 py-6 text-sm text-gray-600">${formatDate(inv.date)}</td>
          <td class="px-8 py-6">
            <button class="toggle-details bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg transition-all font-medium text-sm micro-bounce" data-target="details-${i}">
              <i class="fas fa-eye mr-2"></i>Ver Detalles
              <i class="fas fa-chevron-down ml-2 transition-transform"></i>
            </button>
          </td>
          <td class="px-8 py-6 text-right">
            <div class="flex justify-end space-x-2">
              <button class="edit-btn bg-green-50 hover:bg-green-100 text-green-600 p-3 rounded-xl transition-all micro-bounce" data-id="${inv.id}" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="delete-btn bg-red-50 hover:bg-red-100 text-red-600 p-3 rounded-xl transition-all micro-bounce" data-id="${inv.id}" title="Eliminar">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
    tbody.appendChild(tr1);

    const tr2 = document.createElement('tr');
    tr2.innerHTML = `
          <td colspan="7" class="px-0 py-0">
            <div id="details-${i}" class="order-details">
              <div class="p-6">
                <h4 class="font-bold text-gray-800 mb-4 text-lg">Productos Ordenados</h4>
                <div class="grid grid-cols-4 gap-4 font-bold text-gray-600 text-sm mb-4 pb-2 border-b border-gray-200">
                  <div>Producto</div>
                  <div class="text-right">Cantidad</div>
                  <div class="text-right">Precio Unit.</div>
                  <div class="text-right">Subtotal</div>
                </div>
                ${inv.products.map(p => `
                  <div class="grid grid-cols-4 gap-4 mb-3 py-2 rounded-lg hover:bg-gray-50 transition-all">
                    <div class="font-medium text-gray-800">${p.name}</div>
                    <div class="text-right text-gray-600">
                      <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">${p.quantity}</span>
                    </div>
                    <div class="text-right text-gray-600 font-medium">${p.price.toFixed(2)}</div>
                    <div class="text-right text-gray-800 font-bold">${(p.price * p.quantity).toFixed(2)}</div>
                  </div>
                `).join('')}
                
                <div class="mt-6 pt-4 border-t border-gray-200">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-blue-50 rounded-xl p-4 text-center">
                      <div class="text-sm text-gray-600 font-medium mb-1">Subtotal</div>
                      <div class="text-xl font-bold text-blue-600">${sub.toFixed(2)}</div>
                    </div>
                    <div class="bg-green-50 rounded-xl p-4 text-center">
                      <div class="text-sm text-gray-600 font-medium mb-1">Propina (10%)</div>
                      <div class="text-xl font-bold text-green-600">${tip.toFixed(2)}</div>
                    </div>
                    <div class="bg-purple-50 rounded-xl p-4 text-center">
                      <div class="text-sm text-gray-600 font-medium mb-1">Total</div>
                      <div class="text-2xl font-bold text-purple-600">${tot.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </td>
        `;
    tbody.appendChild(tr2);
  });

  document.querySelectorAll('.toggle-details').forEach(btn => {
    btn.onclick = () => {
      const det = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector('.fa-chevron-down, .fa-chevron-up');

      det.classList.toggle('active');
      if (det.classList.contains('active')) {
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        btn.innerHTML = '<i class="fas fa-eye mr-2"></i>Ocultar Detalles<i class="fas fa-chevron-up ml-2"></i>';
      } else {
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        btn.innerHTML = '<i class="fas fa-eye mr-2"></i>Ver Detalles<i class="fas fa-chevron-down ml-2"></i>';
      }
    };
  });

  document.querySelectorAll('.edit-btn').forEach(b => b.onclick = () => openEditModal(parseInt(b.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(b => b.onclick = () => confirmDelete(parseInt(b.dataset.id)));
}

function filterInvoices() {
  const term = document.getElementById('searchInput').value.toLowerCase();
  const waiter = document.getElementById('waiterFilter').value;
  const date = document.getElementById('dateFilter').value;

  filteredInvoices = invoicesData.filter(inv => {
    const byText = inv.invoiceNumber.toLowerCase().includes(term) ||
      inv.orderNumber.toLowerCase().includes(term) ||
      inv.clientName.toLowerCase().includes(term);
    const byWait = !waiter || inv.waiterName === waiter;
    const byDate = !date || inv.date === date;
    return byText && byWait && byDate;
  });

  renderInvoicesTable(filteredInvoices);
}

function openEditModal(id) {
  const inv = invoicesData.find(i => i.id === id);
  document.getElementById('editInvoiceId').value = inv.id;
  document.getElementById('editInvoiceNumber').value = inv.invoiceNumber;
  document.getElementById('editOrderNumber').value = inv.orderNumber;
  document.getElementById('editClientName').value = inv.clientName;
  document.getElementById('editWaiterName').value = inv.waiterName;
  document.getElementById('editDate').value = inv.date;

  ['editInvoiceNumberError', 'editOrderNumberError', 'editClientNameError', 'editWaiterNameError', 'editDateError']
    .forEach(e => document.getElementById(e).style.display = 'none');

  document.getElementById('editModal').classList.remove('hidden');
}

function saveInvoice() {
  let ok = true;
  const id = parseInt(document.getElementById('editInvoiceId').value);
  const idx = invoicesData.findIndex(i => i.id === id);
  const inv = invoicesData[idx];
  const invNumInp = document.getElementById('editInvoiceNumber');
  const ordNumInp = document.getElementById('editOrderNumber');
  const dateInp = document.getElementById('editDate');
  const cliInp = document.getElementById('editClientName');
  const waiInp = document.getElementById('editWaiterName');

  // Clear previous error states
  [invNumInp, ordNumInp, dateInp, cliInp, waiInp].forEach(inp => {
    inp.classList.remove('error-input');
  });

  // Validate readonly fields
  if (invNumInp.value !== inv.invoiceNumber) {
    invNumInp.classList.add('invalid-input');
    const e = document.getElementById('editInvoiceNumberError');
    e.textContent = 'No puedes modificar el número de factura';
    e.style.display = 'block';
    ok = false;
  }
  if (ordNumInp.value !== inv.orderNumber) {
    ordNumInp.classList.add('invalid-input');
    const e = document.getElementById('editOrderNumberError');
    e.textContent = 'No puedes modificar el número de orden';
    e.style.display = 'block';
    ok = false;
  }
  if (dateInp.value !== inv.date) {
    dateInp.classList.add('invalid-input');
    const e = document.getElementById('editDateError');
    e.textContent = 'No puedes modificar la fecha';
    e.style.display = 'block';
    ok = false;
  }

  // Validate required fields
  if (!cliInp.value.trim()) {
    cliInp.classList.add('invalid-input');
    document.getElementById('editClientNameError').textContent = 'El nombre del cliente es requerido';
    document.getElementById('editClientNameError').style.display = 'block';
    ok = false;
  }
  if (!waiInp.value) {
    waiInp.classList.add('invalid-input');
    document.getElementById('editWaiterNameError').textContent = 'Debes seleccionar un mesero';
    document.getElementById('editWaiterNameError').style.display = 'block';
    ok = false;
  }

  if (!ok) return;

  // Save changes
  inv.clientName = cliInp.value.trim();
  inv.waiterName = waiInp.value;
  filterInvoices();
  document.getElementById('editModal').classList.add('hidden');

  // Show success notification (you can enhance this with a toast notification)
  console.log('Factura actualizada exitosamente');
}

function confirmDelete(id) {
  document.getElementById('confirmDeleteBtn').dataset.id = id;
  document.getElementById('confirmModal').classList.remove('hidden');
}

function doDelete() {
  const id = parseInt(document.getElementById('confirmDeleteBtn').dataset.id);
  invoicesData = invoicesData.filter(i => i.id !== id);
  filterInvoices();
  document.getElementById('confirmModal').classList.add('hidden');

  // Show success notification
  console.log('Factura eliminada exitosamente');
}

// Sidebar toggle functionality
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');

  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('collapsed');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  filteredInvoices = [...invoicesData];
  renderInvoicesTable(filteredInvoices);

  // Event listeners
  document.getElementById('searchInput').oninput = filterInvoices;
  document.getElementById('waiterFilter').onchange = filterInvoices;
  document.getElementById('dateFilter').onchange = filterInvoices;
  document.getElementById('sidebarToggle').onclick = toggleSidebar;

  // Modal event listeners
  document.getElementById('cancelEditBtn').onclick = () => document.getElementById('editModal').classList.add('hidden');
  document.getElementById('saveInvoiceBtn').onclick = saveInvoice;
  document.getElementById('closeModalBtn').onclick = () => document.getElementById('detailsModal').classList.add('hidden');
  document.getElementById('confirmDeleteBtn').onclick = doDelete;
  document.getElementById('cancelDeleteBtn').onclick = () => document.getElementById('confirmModal').classList.add('hidden');

  // Close modals when clicking outside
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    };
  });

  // ESC key to close modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.add('hidden');
      });
    }
  });
});

// Add some loading animation when filtering
let filterTimeout;
const originalFilter = filterInvoices;
filterInvoices = function () {
  clearTimeout(filterTimeout);
  const tbody = document.getElementById('invoicesTableBody');
  tbody.classList.add('loading');

  filterTimeout = setTimeout(() => {
    originalFilter();
    tbody.classList.remove('loading');
  }, 300);
};
