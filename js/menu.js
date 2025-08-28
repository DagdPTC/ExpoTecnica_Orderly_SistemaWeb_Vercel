// Datos iniciales
let categorias = [
    { id: 1, nombre: "Entradas" },
    { id: 2, nombre: "Platos Fuertes" },
    { id: 3, nombre: "Postres" },
    { id: 4, nombre: "Bebidas" }
];

let platillos = [
    {
        id: 1,
        nombre: "Ceviche Clásico",
        categoriaId: 1,
        descripcion: "Pescado marinado con jugo de limón y condimentos frescos.",
        precio: 25.90,
        imagen: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80"
    },
    {
        id: 2,
        nombre: "Lomo Saltado",
        categoriaId: 2,
        descripcion: "Carne salteada con verduras y papas fritas al estilo peruano.",
        precio: 18.50,
        imagen: "https://images.unsplash.com/photo-1559847844-5315695dadae?ixlib=rb-4.0.3&auto=format&fit=crop&w=1138&q=80"
    },
    {
        id: 3,
        nombre: "Tiramisú",
        categoriaId: 3,
        descripcion: "Postre italiano tradicional con café y mascarpone.",
        precio: 7.90,
        imagen: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=627&q=80"
    },
    {
        id: 4,
        nombre: "Limonada Natural",
        categoriaId: 4,
        descripcion: "Bebida refrescante preparada con limones frescos.",
        precio: 3.50,
        imagen: "https://images.unsplash.com/photo-1603569283847-aa295f0d016a?ixlib=rb-4.0.3&auto=format&fit=crop&w=764&q=80"
    }
];

// Variables de estado
let editingPlatilloId = null;
let currentAction = 'add';
let selectedPlatilloId = null;

// Elementos del DOM
const menuContainer = document.getElementById('menuContainer');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');

// Modales
const platilloModal = document.getElementById('platilloModal');
const categoriaModal = document.getElementById('categoriaModal');
const confirmModal = document.getElementById('confirmModal');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    setupMobileMenu();
    setupUserMenu();
    setupFAB();
    renderCategorias();
    renderPlatillos();
}

function setupEventListeners() {
    // Búsqueda y filtros
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(filterPlatillos, 300);
    });
    categoryFilter.addEventListener('change', filterPlatillos);

    // Botones de categoría
    document.getElementById('addCategoryBtn').addEventListener('click', () => {
        currentAction = 'add';
        openCategoriaModal();
    });

    document.getElementById('editCategoryBtn').addEventListener('click', () => {
        if (categorias.length === 0) {
            showToast('No hay categorías para editar', 'error');
            return;
        }
        currentAction = 'edit';
        openCategoriaModal();
    });

    document.getElementById('deleteCategoryBtn').addEventListener('click', () => {
        if (categorias.length === 0) {
            showToast('No hay categorías para eliminar', 'error');
            return;
        }
        currentAction = 'delete';
        openCategoriaModal();
    });

    // Event delegation para botones dinámicos
    document.addEventListener('click', handleClick);

    // Formularios
    document.getElementById('platilloForm').addEventListener('submit', handlePlatilloSubmit);
    document.getElementById('categoriaForm').addEventListener('submit', handleCategoriaSubmit);

    // Cerrar modales
    document.getElementById('closePlatilloModal').addEventListener('click', closePlatilloModal);
    document.getElementById('cancelPlatilloBtn').addEventListener('click', closePlatilloModal);
    document.getElementById('closeCategoriaModal').addEventListener('click', closeCategoriaModal);
    document.getElementById('cancelCategoriaBtn').addEventListener('click', closeCategoriaModal);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
    document.getElementById('acceptConfirmBtn').addEventListener('click', handleConfirmAction);

    // Previsualización de imágenes
    document.getElementById('platilloImagen').addEventListener('change', previewImage);
    document.getElementById('platilloImagenUrl').addEventListener('input', previewImageUrl);

    // Formateo de precio
    document.getElementById('platilloPrecio').addEventListener('input', (e) => formatPrice(e.target));

    // Validación de nombres
    document.getElementById('platilloNombre').addEventListener('input', (e) => validateName(e.target));
    document.getElementById('categoriaNombre').addEventListener('input', (e) => validateCategoryName(e.target));

    // Cerrar modales con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePlatilloModal();
            closeCategoriaModal();
            closeConfirmModal();
            closeFABMenu();
        }
    });

    // Cerrar modales clickeando fuera
    [platilloModal, categoriaModal, confirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                if (modal === platilloModal) closePlatilloModal();
                else if (modal === categoriaModal) closeCategoriaModal();
                else if (modal === confirmModal) closeConfirmModal();
            }
        });
    });
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        mobileOverlay.classList.toggle('active');
    });

    mobileOverlay.addEventListener('click', () => {
        sidebar.classList.add('hidden');
        mobileOverlay.classList.remove('active');
    });

    // Cerrar menú al hacer click en enlaces
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth < 1024) {
                sidebar.classList.add('hidden');
                mobileOverlay.classList.remove('active');
            }
        });
    });
}

function setupUserMenu() {
    const userMenuBtn = document.querySelector('.navbar-user-avatar');
    const userDropdown = document.getElementById('userDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!userMenuBtn.contains(e.target)) {
            userDropdown.classList.remove('show');
        }
    });

    logoutBtn.addEventListener('click', () => {
        userDropdown.classList.remove('show');
        showToast('Cerrando sesión...', 'info');
        setTimeout(() => {
            window.location.href = 'inicioSesion.html';
        }, 1500);
    });
}

function setupFAB() {
    const fabMain = document.getElementById('fab-main');
    const fabMenu = document.getElementById('fab-menu');
    const addBtn = document.getElementById('add-platillo-btn');
    const editBtn = document.getElementById('edit-platillo-btn');
    const deleteBtn = document.getElementById('delete-platillo-btn');

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
        openPlatilloModal();
        closeFABMenu();
    });

    editBtn.addEventListener('click', function () {
        if (platillos.length === 0) {
            showToast('No hay platillos para editar', 'error');
            closeFABMenu();
            return;
        }
        openEditPlatilloModal();
        closeFABMenu();
    });

    deleteBtn.addEventListener('click', function () {
        if (platillos.length === 0) {
            showToast('No hay platillos para eliminar', 'error');
            closeFABMenu();
            return;
        }
        openDeletePlatilloModal();
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

function renderCategorias() {
    // Limpiar selects
    categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
    document.getElementById('platilloCategoria').innerHTML = '<option value="">Seleccione una categoría</option>';
    document.getElementById('categoriaSelect').innerHTML = '<option value="">Seleccione una categoría</option>';

    // Llenar selects con categorías
    categorias.forEach(categoria => {
        // Filter select
        const option1 = document.createElement('option');
        option1.value = categoria.id;
        option1.textContent = categoria.nombre;
        categoryFilter.appendChild(option1);

        // Platillo category select
        const option2 = document.createElement('option');
        option2.value = categoria.id;
        option2.textContent = categoria.nombre;
        document.getElementById('platilloCategoria').appendChild(option2);

        // Category management select
        const option3 = document.createElement('option');
        option3.value = categoria.id;
        option3.textContent = categoria.nombre;
        document.getElementById('categoriaSelect').appendChild(option3);
    });
}

function renderPlatillos(platillosToRender = platillos) {
    menuContainer.innerHTML = '';

    if (platillosToRender.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');

    // Render existing dishes
    platillosToRender.forEach((platillo, index) => {
        const categoria = categorias.find(c => c.id === platillo.categoriaId)?.nombre || 'Sin categoría';

        const card = document.createElement('div');
        card.className = 'platillo-card glass card animate-fade-in';
        card.style.animationDelay = `${index * 0.1}s`;
        card.dataset.id = platillo.id;

        card.innerHTML = `
                    <div class="relative overflow-hidden">
                        <img src="${platillo.imagen || 'https://via.placeholder.com/400x300/667eea/ffffff?text=Sin+Imagen'}" 
                             alt="${platillo.nombre}" 
                             class="platillo-img w-full"
                             onerror="this.onerror=null;this.src='https://via.placeholder.com/400x300/667eea/ffffff?text=Sin+Imagen'">
                        <div class="absolute top-4 right-4">
                            <span class="category-badge">${categoria}</span>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                            <div class="flex space-x-3">
                                <button class="edit-platillo-btn bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="delete-platillo-btn bg-white/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/30 transition-colors">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                        <div class="flex justify-between items-start mb-3">
                            <h3 class="text-xl font-bold text-gray-800 leading-tight">${platillo.nombre}</h3>
                        </div>
                        <p class="text-gray-600 mb-4 flex-1 leading-relaxed">${platillo.descripcion || 'Sin descripción disponible'}</p>
                        <div class="flex justify-between items-center">
                            <span class="price-badge">${platillo.precio.toFixed(2)}</span>
                            <div class="flex items-center text-sm text-gray-500">
                                <i class="fas fa-star text-yellow-400 mr-1"></i>
                                <span>4.8</span>
                            </div>
                        </div>
                    </div>
                `;

        menuContainer.appendChild(card);
    });

    // Add "Add New Dish" card
    const addCard = document.createElement('div');
    addCard.className = 'glass card hover:scale-105 transition-all duration-300 cursor-pointer animate-fade-in';
    addCard.style.animationDelay = `${platillosToRender.length * 0.1}s`;

    addCard.innerHTML = `
                <div class="p-8 text-center h-full flex flex-col items-center justify-center">
                    <div class="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                        <i class="fas fa-plus text-4xl text-blue-600"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">Agregar Platillo</h3>
                    <p class="text-gray-500">Añade un nuevo platillo al menú</p>
                </div>
            `;

    addCard.addEventListener('click', () => openPlatilloModal());
    menuContainer.appendChild(addCard);
}

function filterPlatillos() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const selectedCategory = categoryFilter.value;

    const filtered = platillos.filter(platillo => {
        const matchesSearch = !searchTerm ||
            platillo.nombre.toLowerCase().includes(searchTerm) ||
            (platillo.descripcion && platillo.descripcion.toLowerCase().includes(searchTerm));

        const matchesCategory = selectedCategory === 'all' ||
            platillo.categoriaId === parseInt(selectedCategory);

        return matchesSearch && matchesCategory;
    });

    renderPlatillos(filtered);
}

// Modal Functions
function openPlatilloModal(id = null) {
    resetPlatilloForm();

    if (id) {
        editingPlatilloId = id;
        document.getElementById('platilloModalTitle').textContent = 'Editar Platillo';

        const platillo = platillos.find(p => p.id === id);
        if (platillo) {
            document.getElementById('platilloId').value = platillo.id;
            document.getElementById('platilloNombre').value = platillo.nombre;
            document.getElementById('platilloCategoria').value = platillo.categoriaId;
            document.getElementById('platilloDescripcion').value = platillo.descripcion || '';
            document.getElementById('platilloPrecio').value = platillo.precio.toFixed(2);

            if (platillo.imagen) {
                document.getElementById('platilloImagenPreview').innerHTML = `
                            <img src="${platillo.imagen}" alt="Preview" class="w-full h-full object-cover rounded-lg">
                        `;
                document.getElementById('platilloImagenUrl').value = platillo.imagen;
            }
        }
    } else {
        editingPlatilloId = null;
        document.getElementById('platilloModalTitle').textContent = 'Nuevo Platillo';
    }

    platilloModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closePlatilloModal() {
    platilloModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function openEditPlatilloModal() {
    // Crear modal de selección para editar
    openConfirmModal(
        'Seleccionar Platillo',
        'Selecciona el platillo que deseas editar:',
        'selectPlatilloForEdit'
    );

    // Crear lista de platillos
    const messageElement = document.getElementById('confirmModalMessage');
    messageElement.innerHTML = `
                <p class="text-gray-600 mb-4">Selecciona el platillo que deseas editar:</p>
                <div class="max-h-60 overflow-y-auto">
                    ${platillos.map(platillo => `
                        <div class="p-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between platillo-select-item" data-id="${platillo.id}">
                            <div class="flex items-center">
                                <img src="${platillo.imagen}" alt="${platillo.nombre}" class="w-12 h-12 rounded-lg object-cover mr-3">
                                <div>
                                    <div class="font-medium text-gray-800">${platillo.nombre}</div>
                                    <div class="text-sm text-gray-500">${categorias.find(c => c.id === platillo.categoriaId)?.nombre || 'Sin categoría'}</div>
                                </div>
                            </div>
                            <div class="text-lg font-bold text-green-600">$${platillo.precio.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
            `;

    // Agregar event listeners a los items
    setTimeout(() => {
        document.querySelectorAll('.platillo-select-item').forEach(item => {
            item.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                closeConfirmModal();
                openPlatilloModal(id);
            });
        });
    }, 100);
}

function openDeletePlatilloModal() {
    // Crear modal de selección para eliminar
    openConfirmModal(
        'Seleccionar Platillo',
        'Selecciona el platillo que deseas eliminar:',
        'selectPlatilloForDelete'
    );

    // Crear lista de platillos
    const messageElement = document.getElementById('confirmModalMessage');
    messageElement.innerHTML = `
                <p class="text-gray-600 mb-4">Selecciona el platillo que deseas eliminar:</p>
                <div class="max-h-60 overflow-y-auto">
                    ${platillos.map(platillo => `
                        <div class="p-3 border-b border-gray-100 hover:bg-gray-50 rounded-lg cursor-pointer flex items-center justify-between platillo-select-item" data-id="${platillo.id}">
                            <div class="flex items-center">
                                <img src="${platillo.imagen}" alt="${platillo.nombre}" class="w-12 h-12 rounded-lg object-cover mr-3">
                                <div>
                                    <div class="font-medium text-gray-800">${platillo.nombre}</div>
                                    <div class="text-sm text-gray-500">${categorias.find(c => c.id === platillo.categoriaId)?.nombre || 'Sin categoría'}</div>
                                </div>
                            </div>
                            <div class="text-lg font-bold text-green-600">$${platillo.precio.toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
            `;

    // Agregar event listeners a los items
    setTimeout(() => {
        document.querySelectorAll('.platillo-select-item').forEach(item => {
            item.addEventListener('click', function () {
                const id = parseInt(this.dataset.id);
                const platillo = platillos.find(p => p.id === id);
                closeConfirmModal();

                // Mostrar confirmación de eliminación
                openConfirmModal(
                    'Eliminar Platillo',
                    `¿Estás seguro que deseas eliminar "${platillo.nombre}"? Esta acción no se puede deshacer.`,
                    'deletePlatillo',
                    id
                );
            });
        });
    }, 100);
}

function openCategoriaModal() {
    resetCategoriaForm();

    const selectContainer = document.getElementById('categoriaSelectContainer');
    const nombreContainer = document.getElementById('categoriaNombreContainer');
    const submitBtn = document.getElementById('submitCategoriaBtn');

    if (currentAction === 'add') {
        document.getElementById('categoriaModalTitle').textContent = 'Nueva Categoría';
        selectContainer.classList.add('hidden');
        nombreContainer.classList.remove('hidden');
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Guardar';
        submitBtn.className = 'btn btn-primary px-6 py-3 flex items-center justify-center';
    } else if (currentAction === 'edit') {
        document.getElementById('categoriaModalTitle').textContent = 'Editar Categoría';
        selectContainer.classList.remove('hidden');
        nombreContainer.classList.remove('hidden');
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Actualizar';
        submitBtn.className = 'btn btn-primary px-6 py-3 flex items-center justify-center';
    } else if (currentAction === 'delete') {
        document.getElementById('categoriaModalTitle').textContent = 'Eliminar Categoría';
        selectContainer.classList.remove('hidden');
        nombreContainer.classList.add('hidden');
        submitBtn.innerHTML = '<i class="fas fa-trash mr-2"></i>Eliminar';
        submitBtn.className = 'btn btn-danger px-6 py-3 flex items-center justify-center';
    }

    categoriaModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeCategoriaModal() {
    categoriaModal.classList.add('hidden');
    document.body.style.overflow = '';
}

function openConfirmModal(title, message, action, id = null) {
    document.getElementById('confirmModalTitle').textContent = title;

    if (typeof message === 'string') {
        document.getElementById('confirmModalMessage').textContent = message;
    }

    document.getElementById('acceptConfirmBtn').dataset.action = action;
    if (id) {
        document.getElementById('acceptConfirmBtn').dataset.id = id;
    } else {
        document.getElementById('acceptConfirmBtn').removeAttribute('data-id');
    }
    confirmModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Form Handlers
function handlePlatilloSubmit(e) {
    e.preventDefault();

    const nombre = document.getElementById('platilloNombre');
    const categoria = document.getElementById('platilloCategoria');
    const precio = document.getElementById('platilloPrecio');
    const imagenUrl = document.getElementById('platilloImagenUrl');
    const imagenFile = document.getElementById('platilloImagen');

    let isValid = true;

    // Validate name
    if (!validateField(nombre, 'platilloNombreError', nombre.value.trim() !== '')) {
        isValid = false;
    }

    // Validate category
    if (!validateField(categoria, 'platilloCategoriaError', categoria.value !== '')) {
        isValid = false;
    }

    // Validate price
    if (!validateField(precio, 'platilloPrecioError', /^\d+(\.\d{1,2})?$/.test(precio.value))) {
        isValid = false;
    }

    // Validate image
    const hasImage = imagenUrl.value.trim() !== '' || imagenFile.files.length > 0 ||
        document.getElementById('platilloImagenPreview').querySelector('img') !== null;
    if (!validateField(imagenUrl, 'platilloImagenError', hasImage)) {
        isValid = false;
    }

    if (!isValid) return;

    const platilloData = {
        id: editingPlatilloId || Date.now(),
        nombre: nombre.value.trim(),
        categoriaId: parseInt(categoria.value),
        descripcion: document.getElementById('platilloDescripcion').value.trim(),
        precio: parseFloat(precio.value)
    };

    // Handle image
    if (imagenFile.files.length > 0) {
        getBase64(imagenFile.files[0]).then(base64 => {
            platilloData.imagen = base64;
            savePlatillo(platilloData);
        });
    } else if (imagenUrl.value.trim()) {
        platilloData.imagen = imagenUrl.value.trim();
        savePlatillo(platilloData);
    } else if (editingPlatilloId) {
        const existingPlatillo = platillos.find(p => p.id === editingPlatilloId);
        if (existingPlatillo) {
            platilloData.imagen = existingPlatillo.imagen;
        }
        savePlatillo(platilloData);
    }
}

function handleCategoriaSubmit(e) {
    e.preventDefault();

    let isValid = true;

    if (currentAction === 'edit' || currentAction === 'delete') {
        const select = document.getElementById('categoriaSelect');
        if (!validateField(select, 'categoriaSelectError', select.value !== '')) {
            isValid = false;
        }
    }

    if (currentAction === 'add' || currentAction === 'edit') {
        const nombre = document.getElementById('categoriaNombre');
        const isDuplicate = categorias.some(c =>
            c.nombre.toLowerCase() === nombre.value.trim().toLowerCase() &&
            (currentAction === 'add' || c.id !== parseInt(document.getElementById('categoriaSelect').value))
        );

        if (!validateField(nombre, 'categoriaNombreError', nombre.value.trim() !== '' && !isDuplicate)) {
            if (isDuplicate) {
                document.getElementById('categoriaNombreError').textContent = 'Esta categoría ya existe';
                document.getElementById('categoriaNombreError').style.display = 'block';
            }
            isValid = false;
        }
    }

    if (!isValid) return;

    if (currentAction === 'add') {
        addCategoria();
    } else if (currentAction === 'edit') {
        editCategoria();
    } else if (currentAction === 'delete') {
        deleteCategoria();
    }
}

// CRUD Operations
function savePlatillo(platilloData) {
    if (editingPlatilloId) {
        const index = platillos.findIndex(p => p.id === editingPlatilloId);
        if (index !== -1) {
            platillos[index] = platilloData;
            showToast('Platillo actualizado correctamente', 'success');
        }
    } else {
        platillos.push(platilloData);
        showToast('Platillo agregado correctamente', 'success');
    }

    renderPlatillos();
    closePlatilloModal();
}

function deletePlatillo(id) {
    const platillo = platillos.find(p => p.id === id);
    platillos = platillos.filter(p => p.id !== id);
    renderPlatillos();
    showToast(`Platillo "${platillo.nombre}" eliminado correctamente`, 'success');
}

function addCategoria() {
    const newCategoria = {
        id: Date.now(),
        nombre: document.getElementById('categoriaNombre').value.trim()
    };

    categorias.push(newCategoria);
    renderCategorias();
    renderPlatillos();
    closeCategoriaModal();
    showToast('Categoría agregada correctamente', 'success');
}

function editCategoria() {
    const id = parseInt(document.getElementById('categoriaSelect').value);
    const newName = document.getElementById('categoriaNombre').value.trim();

    const index = categorias.findIndex(c => c.id === id);
    if (index !== -1) {
        const oldName = categorias[index].nombre;
        categorias[index].nombre = newName;

        renderCategorias();
        renderPlatillos();
        closeCategoriaModal();
        showToast(`Categoría "${oldName}" actualizada a "${newName}"`, 'success');
    }
}

function deleteCategoria() {
    const id = parseInt(document.getElementById('categoriaSelect').value);
    const categoria = categorias.find(c => c.id === id);

    if (!categoria) return;

    // Check if category is in use
    const platillosEnUso = platillos.filter(p => p.categoriaId === id);

    if (platillosEnUso.length > 0) {
        showCategoryError(`No se puede eliminar "${categoria.nombre}" porque está siendo usada por ${platillosEnUso.length} platillo(s).`);
        return;
    }

    closeCategoriaModal();
    openConfirmModal(
        'Eliminar Categoría',
        `¿Estás seguro que deseas eliminar la categoría "${categoria.nombre}"? Esta acción no se puede deshacer.`,
        'deleteCategoria',
        id
    );
}

function executeDeleteCategoria(id) {
    const categoria = categorias.find(c => c.id === id);
    categorias = categorias.filter(c => c.id !== id);

    renderCategorias();
    renderPlatillos();
    showToast(`Categoría "${categoria.nombre}" eliminada correctamente`, 'success');
}

// Utility Functions
function resetPlatilloForm() {
    document.getElementById('platilloForm').reset();
    document.getElementById('platilloId').value = '';
    document.getElementById('platilloImagenPreview').innerHTML = '<i class="fas fa-image text-5xl text-gray-300"></i>';
    hideAllErrors();
}

function resetCategoriaForm() {
    document.getElementById('categoriaForm').reset();
    document.getElementById('categoriaAction').value = currentAction;
    hideAllErrors();

    // Remove any existing error containers
    const errorContainer = document.getElementById('categoriaErrorContainer');
    if (errorContainer) {
        errorContainer.remove();
    }
}

function validateField(field, errorId, condition) {
    const errorElement = document.getElementById(errorId);
    if (condition) {
        errorElement.style.display = 'none';
        field.classList.remove('invalid-input');
        return true;
    } else {
        errorElement.style.display = 'block';
        field.classList.add('invalid-input');
        return false;
    }
}

function hideAllErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelectorAll('.invalid-input').forEach(el => {
        el.classList.remove('invalid-input');
    });
}

function showCategoryError(message) {
    let errorContainer = document.getElementById('categoriaErrorContainer');

    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'categoriaErrorContainer';
        errorContainer.className = 'bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg relative';

        const closeButton = document.createElement('button');
        closeButton.className = 'absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl font-bold';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => errorContainer.remove();

        const messageSpan = document.createElement('div');
        messageSpan.className = 'flex items-center';
        messageSpan.innerHTML = `
                    <i class="fas fa-exclamation-triangle mr-3"></i>
                    <span>${message}</span>
                `;

        errorContainer.appendChild(closeButton);
        errorContainer.appendChild(messageSpan);

        const form = document.getElementById('categoriaForm');
        form.insertBefore(errorContainer, form.firstChild);
    } else {
        errorContainer.querySelector('span').textContent = message;
    }
}

function previewImage() {
    const file = document.getElementById('platilloImagen').files[0];
    if (!file) return;

    const preview = document.getElementById('platilloImagenPreview');
    const reader = new FileReader();

    reader.onload = function (e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover rounded-lg">`;
    };

    reader.readAsDataURL(file);
    document.getElementById('platilloImagenUrl').value = '';
}

function previewImageUrl() {
    const url = document.getElementById('platilloImagenUrl').value.trim();
    if (!url) return;

    const preview = document.getElementById('platilloImagenPreview');
    preview.innerHTML = `<img src="${url}" alt="Preview" class="w-full h-full object-cover rounded-lg" 
                onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fas fa-image text-5xl text-gray-300\\'></i>';">`;
    document.getElementById('platilloImagen').value = '';
}

function formatPrice(input) {
    let value = input.value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point
    const parts = value.split('.');
    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    }

    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
        value = parts[0] + '.' + parts[1].substring(0, 2);
    }

    input.value = value;
}

function validateName(input) {
    input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s\-',.]/g, '');
}

function validateCategoryName(input) {
    input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s\-']/g, '');
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    toast.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-3"></i>
                    <span>${message}</span>
                </div>
            `;

    document.body.appendChild(toast);

    // Show toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    // Hide and remove toast
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(toast)) {
                document.body.removeChild(toast);
            }
        }, 400);
    }, 4000);
}

// Handle click events for dynamic elements
function handleClick(e) {
    // Edit platillo button
    if (e.target.closest('.edit-platillo-btn')) {
        const card = e.target.closest('.platillo-card');
        if (card) {
            const id = parseInt(card.dataset.id);
            openPlatilloModal(id);
        }
    }

    // Delete platillo button
    if (e.target.closest('.delete-platillo-btn')) {
        const card = e.target.closest('.platillo-card');
        if (card) {
            const id = parseInt(card.dataset.id);
            const platillo = platillos.find(p => p.id === id);

            openConfirmModal(
                'Eliminar Platillo',
                `¿Estás seguro que deseas eliminar "${platillo.nombre}"? Esta acción no se puede deshacer.`,
                'deletePlatillo',
                id
            );
        }
    }
}

// Handle confirm action
function handleConfirmAction() {
    const action = this.dataset.action;
    const id = this.dataset.id ? parseInt(this.dataset.id) : null;

    if (action === 'deletePlatillo' && id) {
        deletePlatillo(id);
    } else if (action === 'deleteCategoria' && id) {
        executeDeleteCategoria(id);
    }

    closeConfirmModal();
}

// Category select change handler for edit mode
document.getElementById('categoriaSelect').addEventListener('change', function () {
    if (currentAction === 'edit' && this.value) {
        const categoria = categorias.find(c => c.id === parseInt(this.value));
        if (categoria) {
            document.getElementById('categoriaNombre').value = categoria.nombre;
        }
    }
});

// Window resize handler
window.addEventListener('resize', () => {
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');

    if (window.innerWidth >= 1024) {
        sidebar.classList.remove('hidden');
        mobileOverlay.classList.remove('active');
    } else if (window.innerWidth < 1024 && !sidebar.classList.contains('hidden')) {
        // Keep sidebar hidden on smaller screens unless explicitly opened
        sidebar.classList.add('hidden');
        mobileOverlay.classList.remove('active');
    }
});

// Initialize sidebar state based on screen size
window.addEventListener('load', () => {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 1024) {
        sidebar.classList.add('hidden');
    }
});
