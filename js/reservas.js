// reservas.js - Código completo con tabla y paginación
// ========== CONFIGURACIÓN INICIAL ==========
const dishes = [
    { id: 1, name: "Pasta Carbonara", price: 12.99, image: "img/dishes/pasta.jpg", category: "Platos fuertes", disponible: true },
    { id: 2, name: "Ensalada César", price: 8.50, image: "img/dishes/salad.jpg", category: "Entradas", disponible: true },
    { id: 3, name: "Filete Mignon", price: 24.99, image: "img/dishes/steak.jpg", category: "Platos fuertes", disponible: true },
    { id: 4, name: "Sopa de Tomate", price: 6.99, image: "img/dishes/soup.jpg", category: "Entradas", disponible: true },
    { id: 5, name: "Tiramisú", price: 7.50, image: "img/dishes/tiramisu.jpg", category: "Postres", disponible: true },
    { id: 6, name: "Limonada Natural", price: 3.99, image: "img/dishes/lemonade.jpg", category: "Bebidas", disponible: true }
];

const mesasConfig = [
    { id: 1, capacidad: 4, unible: true, posicion: { x: 1, y: 1 }, area: "interior" },
    { id: 2, capacidad: 4, unible: true, posicion: { x: 2, y: 1 }, area: "interior" },
    { id: 3, capacidad: 4, unible: true, posicion: { x: 3, y: 1 }, area: "interior" },
    { id: 4, capacidad: 4, unible: true, posicion: { x: 4, y: 1 }, area: "interior" },
    { id: 5, capacidad: 6, unible: true, posicion: { x: 1, y: 2 }, area: "interior" },
    { id: 6, capacidad: 6, unible: true, posicion: { x: 2, y: 2 }, area: "interior" },
    { id: 7, capacidad: 8, unible: false, posicion: { x: 3, y: 2 }, area: "interior" },
    { id: 8, capacidad: 2, unible: true, posicion: { x: 4, y: 2 }, area: "exterior" },
    { id: 9, capacidad: 4, unible: true, posicion: { x: 1, y: 3 }, area: "exterior" },
    { id: 10, capacidad: 4, unible: true, posicion: { x: 2, y: 3 }, area: "exterior" },
    { id: 11, capacidad: 6, unible: true, posicion: { x: 3, y: 3 }, area: "exterior" },
    { id: 12, capacidad: 6, unible: true, posicion: { x: 4, y: 3 }, area: "exterior" },
    { id: 13, capacidad: 8, unible: false, posicion: { x: 1, y: 4 }, area: "exterior" },
    { id: 14, capacidad: 10, unible: false, posicion: { x: 2, y: 4 }, area: "exterior" },
    { id: 15, capacidad: 12, unible: false, posicion: { x: 3, y: 4 }, area: "exterior" }
];

let reservations = [
    {
        id: 1,
        customerName: "Juan Pérez",
        customerPhone: "7890-1234",
        date: "2023-12-15",
        startTime: "19:00",
        endTime: "20:30",
        dishes: [1, 2, 5],
        guestCount: 4,
        selectedTables: [1, 2],
        specialNotes: "Sin gluten por favor",
        status: "confirmed",
        createdAt: new Date()
    },
    {
        id: 2,
        customerName: "María García",
        customerPhone: "6789-4321",
        date: "2023-12-16",
        startTime: "14:00",
        endTime: "15:30",
        dishes: [3, 4],
        guestCount: 6,
        selectedTables: [5],
        specialNotes: "",
        status: "pending",
        createdAt: new Date()
    }
];

// ========== VARIABLES GLOBALES ==========
let currentAction = null;
let currentReservationId = null;
let isEditing = false;
let selectedDishes = [];
let selectedTables = [];
let allDishes = [...dishes];

// Variables de paginación
let currentPage = 1;
let itemsPerPage = 10;
let totalPages = 1;
let filteredReservations = [];

// ========== ELEMENTOS DOM ==========
const reservationsContainer = document.getElementById('reservations-container');
const filterStatus = document.getElementById('filter-status');
const searchInput = document.getElementById('search-input');
const reservationModal = document.getElementById('reservation-modal');
const confirmModal = document.getElementById('confirm-modal');
const dishesModal = document.getElementById('dishes-modal');
const reservationForm = document.getElementById('reservation-form');
const closeModalBtn = document.getElementById('close-modal');
const cancelReservationBtn = document.getElementById('cancel-reservation');
const closeConfirmModalBtn = document.getElementById('close-confirm-modal');
const cancelActionBtn = document.getElementById('cancel-action');
const confirmActionBtn = document.getElementById('confirm-action');
const closeDishesModalBtn = document.getElementById('close-dishes-modal');
const cancelDishesSelectionBtn = document.getElementById('cancel-dishes-selection');
const saveDishesSelectionBtn = document.getElementById('save-dishes-selection');
const addDishBtn = document.getElementById('add-dish-btn');
const dishSearchInput = document.getElementById('dish-search');
const confirmMessage = document.getElementById('confirm-message');
const confirmError = document.getElementById('confirm-error');
const modalTitle = document.getElementById('modal-title');
const dishesContainer = document.getElementById('dishes-container');
const allDishesContainer = document.getElementById('all-dishes-container');
const dishesTotalElement = document.getElementById('dishes-total');
const selectedDishesInput = document.getElementById('selected-dishes');
const tablesContainer = document.getElementById('tables-container');
const totalCapacityElement = document.getElementById('total-capacity');
const capacityMessageElement = document.getElementById('capacity-message');

// Elementos de paginación
const paginationContainer = document.getElementById('pagination-container');
const itemsPerPageSelect = document.getElementById('items-per-page');
const currentPageSpan = document.getElementById('current-page');
const totalPagesSpan = document.getElementById('total-pages');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageNumbersContainer = document.getElementById('page-numbers');

// Elementos de estadísticas
const totalReservationsElement = document.getElementById('total-reservations');
const pendingReservationsElement = document.getElementById('pending-reservations');
const inProgressReservationsElement = document.getElementById('in-progress-reservations');
const cancelledReservationsElement = document.getElementById('cancelled-reservations');

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', function() {
    initializeApplication();
    setupUserMenu();
});

function initializeApplication() {
    setupEventListeners();
    applyFilters();
    updateStatistics();
    renderAllDishes();
    createAddReservationButton();
}

function setupEventListeners() {
    // Event listeners de filtros y búsqueda
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    
    // Event listeners de modales
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelReservationBtn) cancelReservationBtn.addEventListener('click', closeModal);
    if (reservationForm) reservationForm.addEventListener('submit', handleReservationSubmit);
    
    if (closeConfirmModalBtn) closeConfirmModalBtn.addEventListener('click', closeConfirmModal);
    if (cancelActionBtn) cancelActionBtn.addEventListener('click', closeConfirmModal);
    if (confirmActionBtn) confirmActionBtn.addEventListener('click', executeAction);
    
    if (closeDishesModalBtn) closeDishesModalBtn.addEventListener('click', closeDishesModal);
    if (cancelDishesSelectionBtn) cancelDishesSelectionBtn.addEventListener('click', closeDishesModal);
    if (saveDishesSelectionBtn) saveDishesSelectionBtn.addEventListener('click', saveDishesSelection);
    if (addDishBtn) addDishBtn.addEventListener('click', openDishesModal);
    if (dishSearchInput) dishSearchInput.addEventListener('input', filterDishes);
    
    // Event listeners de paginación
    if (itemsPerPageSelect) {
        itemsPerPageSelect.addEventListener('change', function() {
            itemsPerPage = parseInt(this.value);
            currentPage = 1;
            applyFilters();
        });
    }
    
    if (prevPageBtn) prevPageBtn.addEventListener('click', goToPrevPage);
    if (nextPageBtn) nextPageBtn.addEventListener('click', goToNextPage);
    
    // Event listeners de validación en tiempo real
    const reservationTimeInput = document.getElementById('reservation-time');
    const guestCountInput = document.getElementById('guest-count');
    
    if (reservationTimeInput) {
        reservationTimeInput.addEventListener('change', updateEndTimeMin);
    }
    
    if (guestCountInput) {
        guestCountInput.addEventListener('input', validateGuestCountInput);
        guestCountInput.addEventListener('change', updateTablesSelection);
    }
    
    // Validación de inputs en tiempo real
    setupInputValidation();
}

// ========== SISTEMA DE PAGINACIÓN ==========
function applyFilters() {
    const statusFilter = filterStatus ? filterStatus.value : 'all';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    filteredReservations = reservations.filter(res => {
        const matchesStatus = statusFilter === 'all' || res.status === statusFilter;
        const matchesSearch = searchTerm === '' || 
            res.customerName.toLowerCase().includes(searchTerm) || 
            res.customerPhone.includes(searchTerm) ||
            res.date.includes(searchTerm);
        return matchesStatus && matchesSearch;
    });
    
    // Ordenar por fecha de creación (más recientes primero)
    filteredReservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Calcular paginación
    totalPages = Math.ceil(filteredReservations.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    renderReservationsTable();
    updatePagination();
}

function renderReservationsTable() {
    if (!reservationsContainer) return;
    
    // Calcular índices para la página actual
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredReservations.length);
    const currentReservations = filteredReservations.slice(startIndex, endIndex);
    
    let tableHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horario</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Personas</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mesas</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
    `;
    
    if (currentReservations.length === 0) {
        tableHTML += `
            <tr>
                <td colspan="8" class="px-6 py-4 text-center text-gray-500">
                    <i class="fas fa-calendar-alt text-2xl mb-2"></i>
                    <p>No se encontraron reservaciones</p>
                </td>
            </tr>
        `;
    } else {
        currentReservations.forEach(reservation => {
            const statusInfo = getStatusInfo(reservation.status);
            const formattedDate = new Date(reservation.date).toLocaleDateString('es-ES');
            
            tableHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${reservation.customerName}</div>
                        ${reservation.specialNotes ? `<div class="text-xs text-gray-500">${reservation.specialNotes}</div>` : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${reservation.customerPhone}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formattedDate}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${reservation.startTime} - ${reservation.endTime}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${reservation.guestCount}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${reservation.selectedTables.join(', ')}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs font-medium rounded-full ${statusInfo.class}">
                            <i class="${statusInfo.icon} mr-1"></i>${statusInfo.text}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="openEditReservationModal(${reservation.id})" class="text-blue-600 hover:text-blue-900 mr-3" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="confirmDeleteReservation(${reservation.id})" class="text-red-600 hover:text-red-900" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
    }
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    reservationsContainer.innerHTML = tableHTML;
}

function updatePagination() {
    if (!paginationContainer) return;
    
    // Actualizar contadores
    if (currentPageSpan) currentPageSpan.textContent = currentPage;
    if (totalPagesSpan) totalPagesSpan.textContent = totalPages;
    
    // Habilitar/deshabilitar botones de navegación
    if (prevPageBtn) prevPageBtn.disabled = currentPage === 1;
    if (nextPageBtn) nextPageBtn.disabled = currentPage === totalPages;
    
    // Generar números de página
    if (pageNumbersContainer) {
        pageNumbersContainer.innerHTML = '';
        
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `px-3 py-1 mx-1 rounded ${
                i === currentPage 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => goToPage(i));
            pageNumbersContainer.appendChild(pageButton);
        }
    }
    
    // Mostrar u ocultar paginación
    paginationContainer.style.display = totalPages > 1 ? 'flex' : 'none';
}

function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        applyFilters();
    }
}

function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        applyFilters();
    }
}

function goToNextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        applyFilters();
    }
}

// ========== VALIDACIÓN DE INPUTS ==========
function setupInputValidation() {
    const customerNameInput = document.getElementById('customer-name');
    const customerPhoneInput = document.getElementById('customer-phone');
    const guestCountInput = document.getElementById('guest-count');
    
    // Validación de nombre (solo letras y espacios)
    if (customerNameInput) {
        customerNameInput.addEventListener('input', function(e) {
            const cursorPosition = this.selectionStart;
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            this.setSelectionRange(cursorPosition, cursorPosition);
            validateNameInput(this);
        });
    }
    
    // Validación de teléfono (solo números y formato)
    if (customerPhoneInput) {
        customerPhoneInput.addEventListener('input', function(e) {
            const cursorPosition = this.selectionStart;
            let value = this.value.replace(/\D/g, '');
            
            if (value.length > 8) {
                value = value.substring(0, 8);
            }
            
            if (value.length > 4) {
                value = value.substring(0, 4) + '-' + value.substring(4);
            }
            
            this.value = value;
            this.setSelectionRange(cursorPosition, cursorPosition);
            validatePhoneInput(this);
        });
    }
    
    // Validación de cantidad de personas (solo números)
    if (guestCountInput) {
        guestCountInput.addEventListener('input', function(e) {
            this.value = this.value.replace(/\D/g, '');
            if (this.value.length > 3) {
                this.value = this.value.substring(0, 3);
            }
            validateGuestCountInput();
        });
    }
}

function validateNameInput(input) {
    const isValid = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{2,50}$/.test(input.value) && input.value.split(' ').length >= 2;
    input.classList.toggle('invalid-input', !isValid && input.value !== '');
    return isValid;
}

function validatePhoneInput(input) {
    const isValid = /^\d{4}-\d{4}$/.test(input.value);
    input.classList.toggle('invalid-input', !isValid && input.value !== '');
    return isValid;
}

function validateGuestCountInput() {
    const input = document.getElementById('guest-count');
    const value = parseInt(input.value) || 0;
    const isValid = value > 0 && value <= 999;
    input.classList.toggle('invalid-input', !isValid && input.value !== '');
    return isValid;
}

// ========== VALIDACIÓN DE HORARIOS ==========
function updateEndTimeMin() {
    const startTimeInput = document.getElementById('reservation-time');
    const endTimeInput = document.getElementById('reservation-end-time');
    
    if (!startTimeInput.value) return;
    
    const [hours, minutes] = startTimeInput.value.split(':').map(Number);
    const minEndTime = new Date(0, 0, 0, hours, minutes + 30);
    
    endTimeInput.min = `${minEndTime.getHours().toString().padStart(2, '0')}:${minEndTime.getMinutes().toString().padStart(2, '0')}`;
    
    if (endTimeInput.value && endTimeInput.value < endTimeInput.min) {
        endTimeInput.value = endTimeInput.min;
    }
}

function validateTimes() {
    const startTime = document.getElementById('reservation-time').value;
    const endTime = document.getElementById('reservation-end-time').value;
    const messageElement = document.getElementById('reservation-message');
    
    if (!startTime || !endTime) return true;
    
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    
    // Validar que hora fin sea mayor a hora inicio
    if (endH < startH || (endH === startH && endM <= startM)) {
        messageElement.textContent = "La hora final debe ser posterior a la hora de inicio.";
        return false;
    }
    
    // Validar duración mínima de 30 minutos
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (totalMinutes < 30) {
        messageElement.textContent = "La reservación debe durar al menos 30 minutos.";
        return false;
    }
    
    // Validar horario comercial (9:00 AM - 11:00 PM)
    if (startH < 9 || endH > 23 || (endH === 23 && endM > 0)) {
        messageElement.textContent = "El horario debe estar entre 9:00 AM y 11:00 PM.";
        return false;
    }
    
    messageElement.textContent = '';
    return true;
}

// ========== VALIDACIÓN DE FECHAS ==========
function validateDate() {
    const dateInput = document.getElementById('reservation-date');
    const messageElement = document.getElementById('reservation-message');
    
    if (!dateInput.value) return true;
    
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // No permitir fechas pasadas
    if (selectedDate < today) {
        messageElement.textContent = "No se pueden seleccionar fechas pasadas.";
        return false;
    }
    
    // Límite de antelación (90 días)
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 90);
    
    if (selectedDate > maxDate) {
        messageElement.textContent = "Solo se permiten reservas con hasta 90 días de antelación.";
        return false;
    }
    
    messageElement.textContent = '';
    return true;
}

// ========== SISTEMA DE MESAS ==========
function renderTablesSelector() {
    if (!tablesContainer) return;
    
    tablesContainer.innerHTML = '';
    let totalCapacity = 0;
    
    mesasConfig.forEach(mesa => {
        const isAvailable = isTableAvailable(mesa.id);
        const isSelected = selectedTables.includes(mesa.id);
        
        const mesaElement = document.createElement('div');
        mesaElement.className = `table-item ${isSelected ? 'selected' : ''} ${!isAvailable ? 'occupied' : 'available'}`;
        mesaElement.dataset.id = mesa.id;
        mesaElement.dataset.capacity = mesa.capacidad;
        mesaElement.innerHTML = `
            <div class="table-number">${mesa.id}</div>
            <div class="table-capacity">${mesa.capacidad} pers.</div>
            ${!isAvailable ? '<div class="table-status">OCUPADA</div>' : ''}
        `;
        
        if (isAvailable) {
            mesaElement.addEventListener('click', () => toggleTableSelection(mesa.id));
        }
        
        tablesContainer.appendChild(mesaElement);
        
        if (isSelected) {
            totalCapacity += mesa.capacidad;
        }
    });
    
    updateCapacityDisplay(totalCapacity);
}

function toggleTableSelection(tableId) {
    const index = selectedTables.indexOf(tableId);
    
    if (index === -1) {
        // Validar límite máximo de mesas
        if (selectedTables.length >= 5) {
            showCapacityMessage("Máximo 5 mesas por reserva", "error");
            return;
        }
        
        // Validar que la mesa esté disponible
        if (!isTableAvailable(tableId)) {
            showCapacityMessage("Mesa no disponible en este horario", "error");
            return;
        }
        
        selectedTables.push(tableId);
    } else {
        selectedTables.splice(index, 1);
    }
    
    renderTablesSelector();
    validateTableSelection();
}

function isTableAvailable(tableId) {
    const date = document.getElementById('reservation-date').value;
    const startTime = document.getElementById('reservation-time').value;
    const endTime = document.getElementById('reservation-end-time').value;
    
    if (!date || !startTime || !endTime) return true;
    
    // Verificar conflicto con otras reservas
    return !reservations.some(res => {
        if (res.status === 'cancelled') return false;
        
        const sameDate = res.date === date;
        const timeConflict = !(endTime <= res.startTime || startTime >= res.endTime);
        const tableConflict = res.selectedTables.includes(tableId);
        
        return sameDate && timeConflict && tableConflict;
    });
}

function validateTableSelection() {
    const guestCount = parseInt(document.getElementById('guest-count').value) || 0;
    const totalCapacity = selectedTables.reduce((sum, tableId) => {
        const mesa = mesasConfig.find(m => m.id === tableId);
        return sum + (mesa ? mesa.capacidad : 0);
    }, 0);
    
    if (selectedTables.length === 0) {
        showCapacityMessage("Selecciona al menos una mesa", "error");
        return false;
    }
    
    if (guestCount > 0 && totalCapacity < guestCount) {
        showCapacityMessage(`Capacidad insuficiente. Necesitas ${guestCount - totalCapacity} personas más de capacidad`, "error");
        return false;
    }
    
    // Validar contigüidad de mesas
    if (!areTablesContiguous()) {
        showCapacityMessage("Las mesas seleccionadas deben estar contiguas", "warning");
        return true; // No es error crítico, solo advertencia
    }
    
    showCapacityMessage("Configuración válida", "success");
    return true;
}

function areTablesContiguous() {
    if (selectedTables.length <= 1) return true;
    
    const selectedMesas = selectedTables.map(id => mesasConfig.find(m => m.id === id));
    
    // Verificar que todas estén en la misma área
    const areas = new Set(selectedMesas.map(m => m.area));
    if (areas.size > 1) return false;
    
    // Verificar proximidad (simplificado)
    const positions = selectedMesas.map(m => m.posicion);
    const avgX = positions.reduce((sum, pos) => sum + pos.x, 0) / positions.length;
    const avgY = positions.reduce((sum, pos) => sum + pos.y, 0) / positions.length;
    
    return positions.every(pos => {
        const distance = Math.sqrt(Math.pow(pos.x - avgX, 2) + Math.pow(pos.y - avgY, 2));
        return distance <= 2; // Máximo 2 unidades de distancia
    });
}

function updateCapacityDisplay(totalCapacity) {
    if (!totalCapacityElement) return;
    
    const guestCount = parseInt(document.getElementById('guest-count').value) || 0;
    
    totalCapacityElement.textContent = totalCapacity;
    totalCapacityElement.className = `capacity-display ${totalCapacity >= guestCount ? 'sufficient' : 'insufficient'}`;
    
    if (guestCount > 0) {
        const difference = totalCapacity - guestCount;
        if (difference < 0) {
            showCapacityMessage(`Faltan ${Math.abs(difference)} personas de capacidad`, "error");
        } else if (difference > 0) {
            showCapacityMessage(`${difference} personas de capacidad extra`, "warning");
        } else {
            showCapacityMessage("Capacidad perfecta", "success");
        }
    }
}

function showCapacityMessage(message, type) {
    if (!capacityMessageElement) return;
    
    capacityMessageElement.textContent = message;
    capacityMessageElement.className = `capacity-message ${type}`;
}

function updateTablesSelection() {
    if (!validateGuestCountInput()) return;
    
    const guestCount = parseInt(document.getElementById('guest-count').value) || 0;
    
    // Auto-seleccionar mesas si no hay selección
    if (selectedTables.length === 0 && guestCount > 0) {
        suggestTables(guestCount);
    } else {
        validateTableSelection();
    }
}

function suggestTables(requiredCapacity) {
    const availableTables = mesasConfig.filter(mesa => isTableAvailable(mesa.id));
    
    // Ordenar por capacidad descendente
    availableTables.sort((a, b) => b.capacidad - a.capacidad);
    
    selectedTables = [];
    let currentCapacity = 0;
    
    for (const mesa of availableTables) {
        if (currentCapacity >= requiredCapacity) break;
        if (selectedTables.length >= 5) break; // Límite de mesas
        
        selectedTables.push(mesa.id);
        currentCapacity += mesa.capacidad;
    }
    
    renderTablesSelector();
}

// ========== SISTEMA DE PLATILLOS ==========
function renderAllDishes() {
    if (!allDishesContainer) return;
    
    allDishesContainer.innerHTML = '';
    
    allDishes.forEach(dish => {
        const isSelected = selectedDishes.includes(dish.id);
        const isAvailable = dish.disponible;
        
        const dishElement = document.createElement('div');
        dishElement.className = `dish-option ${isSelected ? 'selected' : ''} ${!isAvailable ? 'unavailable' : ''}`;
        dishElement.innerHTML = `
            <img src="${dish.image}" alt="${dish.name}" class="dish-image">
            <div class="dish-info">
                <h4 class="dish-name">${dish.name}</h4>
                <p class="dish-price">$${dish.price.toFixed(2)}</p>
                <p class="dish-category">${dish.category}</p>
            </div>
            ${isSelected ? '<div class="dish-selected"><i class="fas fa-check"></i></div>' : ''}
            ${!isAvailable ? '<div class="dish-unavailable">No disponible</div>' : ''}
        `;
        
        if (isAvailable) {
            dishElement.addEventListener('click', () => toggleDishSelection(dish.id));
        }
        
        allDishesContainer.appendChild(dishElement);
    });
}

function toggleDishSelection(dishId) {
    const index = selectedDishes.indexOf(dishId);
    
    if (index === -1) {
        const dish = dishes.find(d => d.id === dishId);
        if (dish && dish.disponible) {
            selectedDishes.push(dishId);
        }
    } else {
        selectedDishes.splice(index, 1);
    }
    
    renderAllDishes();
}

function renderSelectedDishes() {
    if (!dishesContainer) return;
    
    dishesContainer.innerHTML = '';
    let total = 0;
    
    selectedDishes.forEach(dishId => {
        const dish = dishes.find(d => d.id === dishId);
        if (dish) {
            total += dish.price;
            
            const dishElement = document.createElement('div');
            dishElement.className = 'selected-dish';
            dishElement.innerHTML = `
                <img src="${dish.image}" alt="${dish.name}" class="dish-thumb">
                <span class="dish-name">${dish.name}</span>
                <span class="dish-price">$${dish.price.toFixed(2)}</span>
                <button class="remove-dish" data-id="${dishId}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            dishesContainer.appendChild(dishElement);
            
            dishElement.querySelector('.remove-dish').addEventListener('click', (e) => {
                e.stopPropagation();
                selectedDishes = selectedDishes.filter(id => id !== dishId);
                renderSelectedDishes();
            });
        }
    });
    
    if (dishesTotalElement) {
        dishesTotalElement.textContent = total.toFixed(2);
    }
    
    if (selectedDishesInput) {
        selectedDishesInput.value = selectedDishes.join(',');
    }
}

function filterDishes() {
    const searchTerm = dishSearchInput.value.toLowerCase();
    allDishes = dishes.filter(dish => 
        dish.name.toLowerCase().includes(searchTerm) ||
        dish.category.toLowerCase().includes(searchTerm)
    );
    renderAllDishes();
}

function saveDishesSelection() {
    renderSelectedDishes();
    closeDishesModal();
}

// ========== VALIDACIÓN COMPLETA DEL FORMULARIO ==========
function validateReservationForm() {
    const messageElement = document.getElementById('reservation-message');
    messageElement.textContent = '';
    
    // Validar campos básicos
    if (!validateNameInput(document.getElementById('customer-name'))) {
        messageElement.textContent = "Nombre inválido. Debe contener solo letras y mínimo 2 palabras.";
        return false;
    }
    
    if (!validatePhoneInput(document.getElementById('customer-phone'))) {
        messageElement.textContent = "Teléfono inválido. Formato: xxxx-xxxx.";
        return false;
    }
    
    if (!validateDate()) return false;
    if (!validateTimes()) return false;
    if (!validateGuestCountInput()) return false;
    
    // Validar selección de mesas
    if (!validateTableSelection()) {
        return false;
    }
    
    // Validar capacidad de mesas vs personas
    const guestCount = parseInt(document.getElementById('guest-count').value);
    const totalCapacity = selectedTables.reduce((sum, tableId) => {
        const mesa = mesasConfig.find(m => m.id === tableId);
        return sum + (mesa ? mesa.capacidad : 0);
    }, 0);
    
    if (totalCapacity < guestCount) {
        messageElement.textContent = `Capacidad insuficiente. Las mesas seleccionadas soportan ${totalCapacity} personas pero tienes ${guestCount}.`;
        return false;
    }
    
    // Validar platillos
    if (selectedDishes.length === 0) {
        messageElement.textContent = "Selecciona al menos un platillo.";
        return false;
    }
    
    // Validar disponibilidad de platillos
    const unavailableDishes = selectedDishes.filter(dishId => {
        const dish = dishes.find(d => d.id === dishId);
        return dish && !dish.disponible;
    });
    
    if (unavailableDishes.length > 0) {
        messageElement.textContent = "Algunos platillos seleccionados no están disponibles.";
        return false;
    }
    
    return true;
}

// ========== MANEJO DE RESERVACIONES ==========
function handleReservationSubmit(e) {
    e.preventDefault();
    
    if (!validateReservationForm()) return;
    
    const reservationData = {
        id: isEditing ? currentReservationId : Date.now(),
        customerName: document.getElementById('customer-name').value.trim(),
        customerPhone: document.getElementById('customer-phone').value.trim(),
        date: document.getElementById('reservation-date').value,
        startTime: document.getElementById('reservation-time').value,
        endTime: document.getElementById('reservation-end-time').value,
        dishes: [...selectedDishes],
        guestCount: parseInt(document.getElementById('guest-count').value),
        selectedTables: [...selectedTables],
        specialNotes: document.getElementById('special-notes').value.trim(),
        status: isEditing ? 
            reservations.find(r => r.id === currentReservationId).status : 
            'pending',
        createdAt: isEditing ?
            reservations.find(r => r.id === currentReservationId).createdAt :
            new Date()
    };
    
    if (isEditing) {
        const index = reservations.findIndex(r => r.id === currentReservationId);
        if (index !== -1) {
            reservations[index] = reservationData;
        }
    } else {
        reservations.push(reservationData);
    }
    
    applyFilters();
    updateStatistics();
    closeModal();
}

// ========== ACTUALIZACIÓN DE ESTADÍSTICAS ==========
function updateStatistics() {
    if (!totalReservationsElement) return;
    
    totalReservationsElement.textContent = reservations.length;
    pendingReservationsElement.textContent = reservations.filter(r => r.status === 'pending').length;
    inProgressReservationsElement.textContent = reservations.filter(r => r.status === 'in-progress').length;
    cancelledReservationsElement.textContent = reservations.filter(r => r.status === 'cancelled').length;
}

// ========== GESTIÓN DE MODALES ==========
function openModal() {
    if (reservationModal) {
        reservationModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    if (reservationModal) {
        reservationModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    resetForm();
}

function openConfirmModal() {
    if (confirmModal) {
        confirmModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeConfirmModal() {
    if (confirmModal) {
        confirmModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
    currentAction = null;
    currentReservationId = null;
}

function openDishesModal() {
    if (dishesModal) {
        dishesModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeDishesModal() {
    if (dishesModal) {
        dishesModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

function resetForm() {
    if (reservationForm) {
        reservationForm.reset();
    }
    selectedDishes = [];
    selectedTables = [];
    isEditing = false;
    currentReservationId = null;
    
    if (document.getElementById('reservation-message')) {
        document.getElementById('reservation-message').textContent = '';
    }
    
    renderSelectedDishes();
    renderTablesSelector();
}

// ========== FUNCIONES AUXILIARES ==========
function getStatusInfo(status) {
    const statusMap = {
        'pending': { class: 'bg-yellow-100 text-yellow-800', icon: 'fas fa-clock', text: 'Pendiente' },
        'confirmed': { class: 'bg-blue-100 text-blue-800', icon: 'fas fa-check-circle', text: 'Confirmada' },
        'in-progress': { class: 'bg-green-100 text-green-800', icon: 'fas fa-utensils', text: 'En curso' },
        'completed': { class: 'bg-gray-100 text-gray-800', icon: 'fas fa-clipboard-check', text: 'Completada' },
        'cancelled': { class: 'bg-red-100 text-red-800', icon: 'fas fa-times-circle', text: 'Cancelada' }
    };
    
    return statusMap[status] || { class: 'bg-gray-100 text-gray-800', icon: 'fas fa-question-circle', text: 'Desconocido' };
}

function confirmDeleteReservation(id) {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;
    
    currentAction = 'delete';
    currentReservationId = id;
    
    if (confirmMessage) {
        confirmMessage.textContent = `¿Estás seguro que deseas eliminar la reservación de ${reservation.customerName} para el ${new Date(reservation.date).toLocaleDateString('es-ES')}?`;
    }
    
    if (confirmError) {
        confirmError.textContent = '';
    }
    
    openConfirmModal();
}

function executeAction() {
    if (currentAction === 'delete') {
        reservations = reservations.filter(r => r.id !== currentReservationId);
        applyFilters();
        updateStatistics();
    }
    closeConfirmModal();
}

function createAddReservationButton() {
    const addButton = document.createElement('button');
    addButton.id = 'add-reservation-btn';
    addButton.className = 'fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all';
    addButton.innerHTML = '<i class="fas fa-plus"></i>';
    addButton.title = 'Nueva reservación';
    addButton.addEventListener('click', openNewReservationModal);
    
    document.body.appendChild(addButton);
}

function openNewReservationModal() {
    if (modalTitle) {
        modalTitle.textContent = 'Nueva Reservación';
    }
    resetForm();
    openModal();
}

function openEditReservationModal(id) {
    const reservation = reservations.find(r => r.id === id);
    if (!reservation) return;
    
    if (modalTitle) {
        modalTitle.textContent = 'Editar Reservación';
    }
    
    isEditing = true;
    currentReservationId = id;
    
    // Llenar formulario
    document.getElementById('customer-name').value = reservation.customerName;
    document.getElementById('customer-phone').value = reservation.customerPhone;
    document.getElementById('reservation-date').value = reservation.date;
    document.getElementById('reservation-time').value = reservation.startTime;
    document.getElementById('reservation-end-time').value = reservation.endTime;
    document.getElementById('guest-count').value = reservation.guestCount;
    document.getElementById('special-notes').value = reservation.specialNotes || '';
    
    selectedDishes = [...reservation.dishes];
    selectedTables = [...reservation.selectedTables];
    
    renderSelectedDishes();
    renderTablesSelector();
    
    openModal();
}

// ========== MENÚ DE USUARIO ==========
function setupUserMenu() {
    const userBtn = document.getElementById('navbarUserBtn');
    if (!userBtn) return;
    
    // Crear dropdown si no existe
    if (!document.getElementById('userDropdown')) {
        const dropdown = document.createElement('div');
        dropdown.id = 'userDropdown';
        dropdown.className = 'absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 hidden';
        dropdown.innerHTML = `
            <div class="py-1">
                <button id="logoutBtn" class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
                </button>
            </div>
        `;
        
        userBtn.parentNode.appendChild(dropdown);
        
        // Toggle dropdown
        userBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        
        // Cerrar al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (!userBtn.contains(e.target)) {
                dropdown.classList.add('hidden');
            }
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            window.location.href = 'login.html';
        });
    }
}

// ========== EXPORTAR FUNCIONES GLOBALES ==========
window.openNewReservationModal = openNewReservationModal;
window.openEditReservationModal = openEditReservationModal;
window.confirmDeleteReservation = confirmDeleteReservation;