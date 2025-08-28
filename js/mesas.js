// ==========================================
// DATOS INICIALES
// ==========================================
let mesas = [
    { id: 1, numero: 1, capacidad: 4, estado: 'libre', responsable: '', cliente: '' },
    { id: 2, numero: 2, capacidad: 2, estado: 'ocupada', responsable: 'Juan Pérez', cliente: '' },
    { id: 3, numero: 3, capacidad: 6, estado: 'reservada', responsable: '', cliente: 'María García' },
    { id: 4, numero: 4, capacidad: 4, estado: 'limpieza', responsable: '', cliente: '' },
    { id: 5, numero: 5, capacidad: 8, estado: 'libre', responsable: '', cliente: '' },
    { id: 6, numero: 6, capacidad: 2, estado: 'ocupada', responsable: 'Ana López', cliente: '' },
    { id: 7, numero: 7, capacidad: 6, estado: 'reservada', responsable: '', cliente: 'Carlos Ruiz' },
    { id: 8, numero: 8, capacidad: 4, estado: 'libre', responsable: '', cliente: '' }
];

let currentMesaId = null;
let currentFilter = 'all';

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    setupSidebar();
    setupFAB();
    setupModals();
    renderMesas();
    updateCounters();
}

// ==========================================
// CONFIGURACIÓN DEL SIDEBAR
// ==========================================
function setupSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
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
}

// ==========================================
// CONFIGURACIÓN DEL FAB
// ==========================================
function setupFAB() {
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const addBtn = document.getElementById('add-btn');
    const editBtn = document.getElementById('edit-btn');
    const deleteBtn = document.getElementById('delete-btn');

    fabMain.addEventListener('click', function () {
        fabMenu.classList.toggle('hidden');
        const icon = fabMain.querySelector('i');
        if (fabMenu.classList.contains('hidden')) {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-plus');
        } else {
            icon.classList.remove('fa-plus');
            icon.classList.add('fa-times');
        }
    });

    addBtn.addEventListener('click', function () {
        showModal('add-modal');
        closeFABMenu();
    });

    editBtn.addEventListener('click', function () {
        showModal('update-modal-step1');
        closeFABMenu();
    });

    deleteBtn.addEventListener('click', function () {
        showModal('delete-modal');
        closeFABMenu();
    });
}

function closeFABMenu() {
    const fabMenu = document.getElementById('fab-menu');
    const fabMain = document.getElementById('fab-main');
    fabMenu.classList.add('hidden');
    const icon = fabMain.querySelector('i');
    icon.classList.remove('fa-times');
    icon.classList.add('fa-plus');
}

// ==========================================
// CONFIGURACIÓN DE MODALES
// ==========================================
function setupModals() {
    // Close modals when clicking outside
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            hideModal(e.target.id);
        }
    });

    // Close modals with Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            hideAllModals();
            closeFABMenu();
        }
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('show');
    setTimeout(() => {
        modal.querySelector('.modal-content').style.transform = 'scale(1)';
        modal.querySelector('.modal-content').style.opacity = '1';
    }, 10);
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.transform = 'scale(0.9)';
    modalContent.style.opacity = '0';
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('show');
    }, 300);
}

function hideAllModals() {
    const modals = ['add-modal', 'update-modal-step1', 'update-modal-step2', 'delete-modal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (!modal.classList.contains('hidden')) {
            hideModal(modalId);
        }
    });
}

// ==========================================
// RENDERIZADO DE MESAS
// ==========================================
function renderMesas(filter = 'all') {
    const container = document.getElementById('mesas-container');
    const emptyState = document.getElementById('empty-state');

    currentFilter = filter;
    container.innerHTML = '';

    const filteredMesas = filter === 'all' ? mesas : mesas.filter(mesa => mesa.estado === filter);

    if (filteredMesas.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    filteredMesas.forEach((mesa, index) => {
        const card = createMesaCard(mesa, index);
        container.appendChild(card);
    });
}

function createMesaCard(mesa, index) {
    const card = document.createElement('div');
    card.className = `mesa-card mesa-${mesa.estado} bg-white rounded-2xl shadow-lg p-6 border border-slate-100`;
    card.style.animationDelay = `${index * 0.1}s`;
    card.classList.add('animate-fade-in');

    const statusConfig = {
        libre: { icon: 'fa-check-circle', color: 'emerald', text: 'Disponible' },
        ocupada: { icon: 'fa-users', color: 'red', text: 'Ocupada' },
        reservada: { icon: 'fa-bookmark', color: 'blue', text: 'Reservada' },
        limpieza: { icon: 'fa-broom', color: 'amber', text: 'Limpieza' }
    };

    const config = statusConfig[mesa.estado];

    let extraInfo = '';
    if (mesa.estado === 'ocupada' && mesa.responsable) {
        extraInfo = `
                    <div class="mt-4 p-3 bg-slate-50 rounded-xl">
                        <div class="flex items-center text-slate-600">
                            <i class="fas fa-user-tie mr-2"></i>
                            <span class="text-sm">Mesero: <strong>${mesa.responsable}</strong></span>
                        </div>
                    </div>
                `;
    } else if (mesa.estado === 'reservada' && mesa.cliente) {
        extraInfo = `
                    <div class="mt-4 p-3 bg-slate-50 rounded-xl">
                        <div class="flex items-center text-slate-600">
                            <i class="fas fa-user mr-2"></i>
                            <span class="text-sm">Cliente: <strong>${mesa.cliente}</strong></span>
                        </div>
                    </div>
                `;
    }

    card.innerHTML = `
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h3 class="text-2xl font-bold text-slate-800">Mesa ${mesa.numero}</h3>
                        <p class="text-slate-500 text-sm">ID: ${mesa.id}</p>
                    </div>
                    <div class="w-14 h-14 bg-${config.color}-100 rounded-xl flex items-center justify-center">
                        <i class="fas ${config.icon} text-${config.color}-600 text-xl"></i>
                    </div>
                </div>

                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-600 font-medium">Estado</span>
                        <div class="flex items-center">
                            <div class="w-3 h-3 bg-${config.color}-500 rounded-full mr-2"></div>
                            <span class="text-${config.color}-600 font-semibold">${config.text}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between">
                        <span class="text-slate-600 font-medium">Capacidad</span>
                        <div class="flex items-center">
                            <i class="fas fa-users text-slate-400 mr-2"></i>
                            <span class="text-slate-800 font-semibold">${mesa.capacidad} personas</span>
                        </div>
                    </div>
                </div>

                ${extraInfo}

                <div class="mt-6 pt-4 border-t border-slate-100">
                    <div class="flex justify-center">
                        <button onclick="cambiarEstadoMesa(${mesa.id})" class="btn-modern px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800">
                            <i class="fas fa-sync-alt mr-2"></i>
                            Cambiar Estado
                        </button>
                    </div>
                </div>
            `;

    return card;
}

// ==========================================
// ACTUALIZACIÓN DE CONTADORES
// ==========================================
function updateCounters() {
    const estados = ['libre', 'ocupada', 'reservada', 'limpieza'];
    estados.forEach(estado => {
        const count = mesas.filter(mesa => mesa.estado === estado).length;
        const element = document.getElementById(`count-${estado}`);
        if (element) {
            // Animación del contador
            element.style.transform = 'scale(1.2)';
            setTimeout(() => {
                element.textContent = count;
                element.style.transform = 'scale(1)';
            }, 150);
        }
    });
}

// ==========================================
// FILTROS
// ==========================================
function filterTables(status) {
    // Update active button
    document.querySelectorAll('.btn-modern').forEach(btn => {
        btn.classList.remove('active-filter', 'ring-4', 'ring-opacity-50');
    });

    event.target.classList.add('active-filter', 'ring-4', 'ring-opacity-50');

    renderMesas(status);
}

// ==========================================
// FUNCIONES CRUD
// ==========================================
function closeAdd() {
    hideModal('add-modal');
    clearForm('add');
}

function closeUpdate() {
    hideModal('update-modal-step1');
    hideModal('update-modal-step2');
    clearForm('update');
}

function closeDelete() {
    hideModal('delete-modal');
    clearForm('delete');
}

function clearForm(type) {
    const elements = {
        add: ['add-numero', 'add-capacidad', 'add-message'],
        update: ['update-search-numero', 'update-numero', 'update-capacidad', 'update-message-step1', 'update-message-step2'],
        delete: ['delete-numero', 'delete-message']
    };

    elements[type].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.value = '';
            } else {
                element.textContent = '';
                element.className = 'text-center text-sm';
            }
        }
    });
}

function showMessage(elementId, message, type = 'info') {
    const element = document.getElementById(elementId);
    const colors = {
        success: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
        error: 'text-red-600 bg-red-50 border border-red-200',
        warning: 'text-amber-600 bg-amber-50 border border-amber-200',
        info: 'text-blue-600 bg-blue-50 border border-blue-200'
    };

    element.textContent = message;
    element.className = `text-center text-sm p-3 rounded-lg ${colors[type]}`;
}

// ==========================================
// AGREGAR MESA
// ==========================================
function addMesa() {
    const numero = parseInt(document.getElementById('add-numero').value);
    const capacidad = parseInt(document.getElementById('add-capacidad').value);

    // Validaciones
    if (isNaN(numero) || numero < 1 || numero > 99) {
        showMessage('add-message', 'El número de mesa debe ser entre 1 y 99', 'error');
        return;
    }

    if (mesas.some(mesa => mesa.numero === numero)) {
        showMessage('add-message', 'Ya existe una mesa con este número', 'error');
        return;
    }

    if (isNaN(capacidad) || capacidad < 1 || capacidad > 20) {
        showMessage('add-message', 'La capacidad debe ser entre 1 y 20 personas', 'error');
        return;
    }

    // Crear nueva mesa
    const newId = Math.max(...mesas.map(mesa => mesa.id), 0) + 1;
    const newMesa = {
        id: newId,
        numero: numero,
        capacidad: capacidad,
        estado: 'libre',
        responsable: '',
        cliente: ''
    };

    mesas.push(newMesa);
    showMessage('add-message', '¡Mesa creada exitosamente!', 'success');

    // Update UI
    renderMesas(currentFilter);
    updateCounters();

    // Close modal after delay
    setTimeout(() => {
        closeAdd();
    }, 1500);
}

// ==========================================
// BUSCAR Y ACTUALIZAR MESA
// ==========================================
function nextUpdate() {
    const numero = parseInt(document.getElementById('update-search-numero').value);

    if (isNaN(numero)) {
        showMessage('update-message-step1', 'Ingresa un número válido', 'error');
        return;
    }

    const mesa = mesas.find(m => m.numero === numero);
    if (!mesa) {
        showMessage('update-message-step1', 'No se encontró ninguna mesa con ese número', 'error');
        return;
    }

    if (mesa.estado !== 'libre') {
        showMessage('update-message-step1', 'Solo se pueden editar mesas disponibles', 'warning');
        return;
    }

    // Preparar segundo modal
    currentMesaId = mesa.id;
    document.getElementById('update-numero').value = mesa.numero;
    document.getElementById('update-capacidad').value = mesa.capacidad;

    // Switch modals
    hideModal('update-modal-step1');
    setTimeout(() => {
        showModal('update-modal-step2');
    }, 300);
}

function updateMesa() {
    const numero = parseInt(document.getElementById('update-numero').value);
    const capacidad = parseInt(document.getElementById('update-capacidad').value);

    // Validaciones
    if (isNaN(numero) || numero < 1 || numero > 99) {
        showMessage('update-message-step2', 'El número debe ser entre 1 и 99', 'error');
        return;
    }

    if (mesas.some(mesa => mesa.numero === numero && mesa.id !== currentMesaId)) {
        showMessage('update-message-step2', 'Ya existe otra mesa con este número', 'error');
        return;
    }

    if (isNaN(capacidad) || capacidad < 1 || capacidad > 20) {
        showMessage('update-message-step2', 'La capacidad debe ser entre 1 y 20', 'error');
        return;
    }

    // Actualizar mesa
    const mesa = mesas.find(m => m.id === currentMesaId);
    if (mesa) {
        mesa.numero = numero;
        mesa.capacidad = capacidad;

        showMessage('update-message-step2', '¡Mesa actualizada correctamente!', 'success');

        // Update UI
        renderMesas(currentFilter);
        updateCounters();

        // Close modal
        setTimeout(() => {
            closeUpdate();
        }, 1500);
    }
}

// ==========================================
// ELIMINAR MESA
// ==========================================
function deleteMesa() {
    const numero = parseInt(document.getElementById('delete-numero').value);

    if (isNaN(numero)) {
        showMessage('delete-message', 'Ingresa un número válido', 'error');
        return;
    }

    const index = mesas.findIndex(mesa => mesa.numero === numero);
    if (index === -1) {
        showMessage('delete-message', 'No se encontró la mesa', 'error');
        return;
    }

    const mesa = mesas[index];
    if (mesa.estado !== 'libre') {
        showMessage('delete-message', 'Solo se pueden eliminar mesas disponibles', 'warning');
        return;
    }

    // Eliminar mesa
    mesas.splice(index, 1);
    showMessage('delete-message', '¡Mesa eliminada correctamente!', 'success');

    // Update UI
    renderMesas(currentFilter);
    updateCounters();

    // Close modal
    setTimeout(() => {
        closeDelete();
    }, 1500);
}

// ==========================================
// CAMBIAR ESTADO DE MESA
// ==========================================
function cambiarEstadoMesa(mesaId) {
    const mesa = mesas.find(m => m.id === mesaId);
    if (!mesa) return;

    const estados = ['libre', 'ocupada', 'reservada', 'limpieza'];
    const currentIndex = estados.indexOf(mesa.estado);
    const nextIndex = (currentIndex + 1) % estados.length;

    mesa.estado = estados[nextIndex];

    // Simulate responsable/cliente data
    if (mesa.estado === 'ocupada') {
        const meseros = ['Juan Pérez', 'Ana López', 'Carlos Ruiz', 'María González'];
        mesa.responsable = meseros[Math.floor(Math.random() * meseros.length)];
        mesa.cliente = '';
    } else if (mesa.estado === 'reservada') {
        const clientes = ['María García', 'Pedro Martínez', 'Laura Sánchez', 'Diego Torres'];
        mesa.cliente = clientes[Math.floor(Math.random() * clientes.length)];
        mesa.responsable = '';
    } else {
        mesa.responsable = '';
        mesa.cliente = '';
    }

    renderMesas(currentFilter);
    updateCounters();
}

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
    const tableStatus = document.querySelectorAll('.mesa-card');

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
