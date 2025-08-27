// Datos iniciales con imágenes corregidas
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
        descripcion: "Pescado marinado con jugo de limón y condimentos.",
        precio: 25.90,
        imagen: "https://images.unsplash.com/photo-1633613286848-e6f43bbafb8d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80"
    },
    {
        id: 2,
        nombre: "Lomo Saltado",
        categoriaId: 2,
        descripcion: "Carne salteada con verduras y papas fritas.",
        precio: 18.50,
        imagen: "https://images.unsplash.com/photo-1559847844-5315695dadae?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1138&q=80"
    },
    {
        id: 3,
        nombre: "Tiramisú",
        categoriaId: 3,
        descripcion: "Postre italiano de café y mascarpone.",
        precio: 7.90,
        imagen: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=627&q=80"
    },
    {
        id: 4,
        nombre: "Limonada Natural",
        categoriaId: 4,
        descripcion: "Bebida refrescante a base de limón natural.",
        precio: 3.50,
        imagen: "https://images.unsplash.com/photo-1603569283847-aa295f0d016a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=764&q=80"
    }
];

// Variables de estado
let editingPlatilloId = null;
let editingCategoriaId = null;
let currentAction = 'add'; // 'add', 'edit', 'delete'

// Elementos del DOM
const menuContainer = document.getElementById('menuContainer');
const noResults = document.getElementById('noResults');
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const editCategoryBtn = document.getElementById('editCategoryBtn');
const deleteCategoryBtn = document.getElementById('deleteCategoryBtn');

// Modales
const platilloModal = document.getElementById('platilloModal');
const categoriaModal = document.getElementById('categoriaModal');
const confirmModal = document.getElementById('confirmModal');

// Formularios
const platilloForm = document.getElementById('platilloForm');
const categoriaForm = document.getElementById('categoriaForm');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    renderCategorias();
    renderPlatillos();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Filtros
    searchInput.addEventListener('input', filterPlatillos);
    categoryFilter.addEventListener('change', filterPlatillos);
    
    // Botones CRUD Platillos
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-platillo-btn')) {
            openPlatilloModal();
        } else if (e.target.classList.contains('edit-platillo-btn')) {
            const id = parseInt(e.target.closest('[data-id]').dataset.id);
            openPlatilloModal(id);
        } else if (e.target.classList.contains('delete-platillo-btn')) {
            const id = parseInt(e.target.closest('[data-id]').dataset.id);
            confirmDeletePlatillo(id);
        }
    });
    
    // Botones CRUD Categorías
    addCategoryBtn.addEventListener('click', () => {
        currentAction = 'add';
        openCategoriaModal();
    });
    
    editCategoryBtn.addEventListener('click', () => {
        if (categorias.length === 0) {
            showCategoryError('No hay categorías para editar');
            return;
        }
        currentAction = 'edit';
        openCategoriaModal();
    });
    
    deleteCategoryBtn.addEventListener('click', () => {
        if (categorias.length === 0) {
            showCategoryError('No hay categorías para eliminar');
            return;
        }
        currentAction = 'delete';
        openCategoriaModal();
    });
    
    // Formularios
    platilloForm.addEventListener('submit', handlePlatilloSubmit);
    categoriaForm.addEventListener('submit', handleCategoriaSubmit);
    
    // Botones de cancelar
    document.getElementById('cancelPlatilloBtn').addEventListener('click', closePlatilloModal);
    document.getElementById('cancelCategoriaBtn').addEventListener('click', closeCategoriaModal);
    document.getElementById('cancelConfirmBtn').addEventListener('click', closeConfirmModal);
    
    // Botón de confirmación
    document.getElementById('acceptConfirmBtn').addEventListener('click', handleConfirmAction);
}

// Renderizar categorías en los selects
function renderCategorias() {
    // Limpiar selects
    categoryFilter.innerHTML = '<option value="all">Todas las categorías</option>';
    document.getElementById('platilloCategoria').innerHTML = '<option value="">Seleccione una categoría</option>';
    document.getElementById('categoriaSelect').innerHTML = '<option value="">Seleccione una categoría</option>';
    
    // Llenar selects
    categorias.forEach(categoria => {
        const option1 = document.createElement('option');
        option1.value = categoria.id;
        option1.textContent = categoria.nombre;
        categoryFilter.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = categoria.id;
        option2.textContent = categoria.nombre;
        document.getElementById('platilloCategoria').appendChild(option2.cloneNode(true));
        
        const option3 = document.createElement('option');
        option3.value = categoria.id;
        option3.textContent = categoria.nombre;
        document.getElementById('categoriaSelect').appendChild(option3.cloneNode(true));
    });
}

// Renderizar platillos
function renderPlatillos(platillosToRender = platillos) {
    menuContainer.innerHTML = '';
    
    if (platillosToRender.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    
    noResults.classList.add('hidden');
    
    platillosToRender.forEach(platillo => {
        const categoria = categorias.find(c => c.id === platillo.categoriaId)?.nombre || 'Sin categoría';
        
        const card = document.createElement('div');
        card.className = 'platillo-card bg-white rounded-lg shadow-md overflow-hidden flex flex-col';
        card.dataset.id = platillo.id;
        card.innerHTML = `
            <div class="relative">
                <img src="${platillo.imagen || 'https://via.placeholder.com/300x200?text=Imagen+no+disponible'}" 
                     alt="${platillo.nombre}" class="platillo-img w-full h-48 object-cover"
                     onerror="this.onerror=null;this.src='https://via.placeholder.com/300x200?text=Imagen+no+disponible'">
                <span class="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">${categoria}</span>
            </div>
            <div class="p-4 flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="text-lg font-semibold text-gray-800">${platillo.nombre}</h3>
                    <span class="text-lg font-bold text-blue-600">$${platillo.precio.toFixed(2)}</span>
                </div>
                <p class="text-gray-600 text-sm mb-4 flex-1">${platillo.descripcion || 'Sin descripción'}</p>
                <div class="flex justify-end gap-2">
                    <button class="edit-platillo-btn px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition" 
                            data-id="${platillo.id}">
                        <i class="fas fa-edit mr-1"></i> Editar
                    </button>
                    <button class="delete-platillo-btn px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition" 
                            data-id="${platillo.id}">
                        <i class="fas fa-trash mr-1"></i> Eliminar
                    </button>
                </div>
            </div>
        `;
        
        menuContainer.appendChild(card);
    });
}

// Filtrar platillos
function filterPlatillos() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    
    const filtered = platillos.filter(platillo => {
        const matchesSearch = platillo.nombre.toLowerCase().includes(searchTerm) || 
                             (platillo.descripcion && platillo.descripcion.toLowerCase().includes(searchTerm));
        
        const matchesCategory = selectedCategory === 'all' || platillo.categoriaId === parseInt(selectedCategory);
        
        return matchesSearch && matchesCategory;
    });
    
    renderPlatillos(filtered);
}

// Modal Platillo
function openPlatilloModal(id = null) {
    // Resetear formulario
    platilloForm.reset();
    document.getElementById('platilloId').value = '';
    document.getElementById('platilloImagenPreview').innerHTML = '<i class="fas fa-image text-4xl text-gray-300"></i>';
    document.getElementById('platilloImagenUrl').value = '';
    document.getElementById('platilloImagen').value = '';
    
    // Ocultar errores
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
    
    if (id) {
        // Modo edición
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
                    <img src="${platillo.imagen}" alt="Preview" class="w-full h-full object-cover"
                         onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fas fa-image text-4xl text-gray-300\\'></i>'">
                `;
                document.getElementById('platilloImagenUrl').value = platillo.imagen;
            }
        }
    } else {
        // Modo agregar
        editingPlatilloId = null;
        document.getElementById('platilloModalTitle').textContent = 'Nuevo Platillo';
    }
    
    platilloModal.classList.remove('hidden');
}

function closePlatilloModal() {
    platilloModal.classList.add('hidden');
}

// Modal Categoría
function openCategoriaModal() {
    // Resetear formulario
    categoriaForm.reset();
    const errorContainer = document.getElementById('categoriaErrorContainer');
    if (errorContainer) {
        errorContainer.remove();
    }
    
    document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.invalid-input').forEach(el => el.classList.remove('invalid-input'));
    
    // Configurar según la acción
    const selectContainer = document.getElementById('categoriaSelectContainer');
    const nombreContainer = document.getElementById('categoriaNombreContainer');
    const submitBtn = categoriaForm.querySelector('button[type="submit"]');
    
    // Resetear el botón a estado por defecto
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
    submitBtn.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2';
    
    if (currentAction === 'add') {
        document.getElementById('categoriaModalTitle').textContent = 'Nueva Categoría';
        selectContainer.classList.add('hidden');
        nombreContainer.classList.remove('hidden');
        document.getElementById('categoriaNombre').value = '';
    } else if (currentAction === 'edit') {
        document.getElementById('categoriaModalTitle').textContent = 'Editar Categoría';
        selectContainer.classList.remove('hidden');
        nombreContainer.classList.remove('hidden');
        document.getElementById('categoriaSelect').value = '';
        document.getElementById('categoriaNombre').value = '';
    } else if (currentAction === 'delete') {
        document.getElementById('categoriaModalTitle').textContent = 'Eliminar Categoría';
        selectContainer.classList.remove('hidden');
        nombreContainer.classList.add('hidden');
        document.getElementById('categoriaSelect').value = '';
        
        // Cambiar el botón a estilo de eliminación
        submitBtn.innerHTML = '<i class="fas fa-trash"></i> Eliminar';
        submitBtn.className = 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2';
    }
    
    categoriaModal.classList.remove('hidden');
}

function closeCategoriaModal() {
    categoriaModal.classList.add('hidden');
}

// Modal Confirmación
function openConfirmModal(title, message, action, id = null) {
    document.getElementById('confirmModalTitle').textContent = title;
    document.getElementById('confirmModalMessage').textContent = message;
    document.getElementById('acceptConfirmBtn').dataset.action = action;
    if (id) {
        document.getElementById('acceptConfirmBtn').dataset.id = id;
    } else {
        document.getElementById('acceptConfirmBtn').removeAttribute('data-id');
    }
    confirmModal.classList.remove('hidden');
}

function closeConfirmModal() {
    confirmModal.classList.add('hidden');
}

function handleConfirmAction() {
    const action = document.getElementById('acceptConfirmBtn').dataset.action;
    const id = document.getElementById('acceptConfirmBtn').dataset.id ? 
               parseInt(document.getElementById('acceptConfirmBtn').dataset.id) : null;
    
    if (action === 'deletePlatillo') {
        deletePlatillo(id);
        closeConfirmModal();
    } else if (action === 'deleteCategoria') {
        if (deleteCategoria(id)) {
            closeConfirmModal();
        }
    } else {
        closeConfirmModal();
    }
}

// Manejar formulario de platillo
function handlePlatilloSubmit(e) {
    e.preventDefault();
    
    // Validar campos
    const nombre = document.getElementById('platilloNombre');
    const categoria = document.getElementById('platilloCategoria');
    const precio = document.getElementById('platilloPrecio');
    const imagenUrl = document.getElementById('platilloImagenUrl');
    const imagenFile = document.getElementById('platilloImagen');
    
    let isValid = true;
    
    // Validar nombre
    if (!nombre.value.trim()) {
        document.getElementById('platilloNombreError').style.display = 'block';
        nombre.classList.add('invalid-input');
        isValid = false;
    } else {
        document.getElementById(('platilloNombreError').style.display = 'none');
        nombre.classList.remove('invalid-input');
    }
    
    // Validar categoría
    if (!categoria.value) {
        document.getElementById(('platilloCategoriaError').style.display = 'block');
        categoria.classList.add('invalid-input');
        isValid = false;
    } else {
        document.getElementById(('platilloCategoriaError').style.display = 'none');
        categoria.classList.remove('invalid-input');
    }
    
    // Validar precio
    if (!precio.value || !/^\d+(\.\d{1,2})?$/.test(precio.value)) {
        document.getElementById(('platilloPrecioError').style.display = 'block');
        precio.classList.add('invalid-input');
        isValid = false;
    } else {
        document.getElementById(('platilloPrecioError').style.display = 'none');
        precio.classList.remove('invalid-input');
    }
    
    // Validar imagen (URL o archivo)
    const hasImageUrl = imagenUrl.value.trim() !== '';
    const hasImageFile = imagenFile.files.length > 0;
    const preview = document.getElementById('platilloImagenPreview');
    const hasImagePreview = preview.querySelector('img') !== null;
    
    if (!hasImageUrl && !hasImageFile && !hasImagePreview) {
        document.getElementById(('platilloImagenError').style.display = 'block');
        isValid = false;
    } else {
        document.getElementById(('platilloImagenError').style.display = 'none');
    }
    
    if (!isValid) return;
    
    // Crear/actualizar platillo
    const platilloData = {
        id: editingPlatilloId || Date.now(),
        nombre: nombre.value.trim(),
        categoriaId: parseInt(categoria.value),
        descripcion: document.getElementById('platilloDescripcion').value.trim(),
        precio: parseFloat(precio.value)
    };
    
    // Manejar imagen (prioridad: archivo > URL > imagen existente al editar)
    if (hasImageFile) {
        const file = imagenFile.files[0];
        getBase64(file).then(base64 => {
            platilloData.imagen = base64;
            savePlatillo(platilloData);
        });
    } else if (hasImageUrl) {
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

function savePlatillo(platilloData) {
    if (editingPlatilloId) {
        // Editar platillo existente
        const index = platillos.findIndex(p => p.id === editingPlatilloId);
        if (index !== -1) {
            platillos[index] = platilloData;
        }
    } else {
        // Agregar nuevo platillo
        platillos.push(platilloData);
    }
    
    renderPlatillos();
    closePlatilloModal();
}

function confirmDeletePlatillo(id) {
    const platillo = platillos.find(p => p.id === id);
    if (!platillo) return;
    
    openConfirmModal(
        'Eliminar Platillo',
        `¿Estás seguro que deseas eliminar el platillo "${platillo.nombre}"?`,
        'deletePlatillo',
        id
    );
}

function deletePlatillo(id) {
    platillos = platillos.filter(p => p.id !== id);
    renderPlatillos();
}

// Manejar formulario de categoría
function handleCategoriaSubmit(e) {
    e.preventDefault();
    
    let isValid = true;
    
    if (currentAction === 'add' || currentAction === 'edit') {
        const nombre = document.getElementById('categoriaNombre');
        
        if (!nombre.value.trim()) {
            document.getElementById(('categoriaNombreError').style.display = 'block');
            nombre.classList.add('invalid-input');
            isValid = false;
        } else if (categorias.some(c => c.nombre.toLowerCase() === nombre.value.trim().toLowerCase() && 
                                      (currentAction === 'add' || c.id !== editingCategoriaId))) {
            document.getElementById('categoriaNombreError').textContent = 'Esta categoría ya existe';
            document.getElementById(('categoriaNombreError').style.display = 'block');
            nombre.classList.add('invalid-input');
            isValid = false;
        } else {
            document.getElementById(('categoriaNombreError').style.display = 'none');
            nombre.classList.remove('invalid-input');
        }
    }
    
    if (currentAction === 'edit' || currentAction === 'delete') {
        const select = document.getElementById('categoriaSelect');
        
        if (!select.value) {
            document.getElementById(('categoriaSelectError').style.display = 'block');
            select.classList.add('invalid-input');
            isValid = false;
        } else {
            document.getElementById(('categoriaSelectError').style.display = 'none');
            select.classList.remove('invalid-input');
        }
    }
    
    if (!isValid) return;
    
    if (currentAction === 'add') {
        const newCategoria = {
            id: Date.now(),
            nombre: document.getElementById('categoriaNombre').value.trim()
        };
        categorias.push(newCategoria);
        renderCategorias();
        renderPlatillos();
        closeCategoriaModal();
    } 
    else if (currentAction === 'edit') {
        const id = parseInt(document.getElementById('categoriaSelect').value);
        const newName = document.getElementById('categoriaNombre').value.trim();
        
        const index = categorias.findIndex(c => c.id === id);
        if (index !== -1) {
            categorias[index].nombre = newName;
            
            // Actualizar platillos que usan esta categoría
            platillos.forEach(p => {
                if (p.categoriaId === id) {
                    p.categoriaId = id;
                }
            });
            
            renderCategorias();
            renderPlatillos();
            closeCategoriaModal();
        }
    }
    else if (currentAction === 'delete') {
        const id = parseInt(document.getElementById('categoriaSelect').value);
        const categoria = categorias.find(c => c.id === id);
        
        if (!categoria) {
            showCategoryError('Categoría no encontrada');
            return;
        }
        
        // Verificar si la categoría está en uso
        const platillosConCategoria = platillos.filter(p => p.categoriaId === id);
        
        if (platillosConCategoria.length > 0) {
            // Mostrar mensaje de error en el modal
            showCategoryError(`No se puede eliminar "${categoria.nombre}" porque está siendo usada por ${platillosConCategoria.length} platillo(s).`);
        } else {
            // Cerrar el modal de categoría primero
            closeCategoriaModal();
            // Luego abrir el modal de confirmación
            openConfirmModal(
                'Confirmar eliminación',
                `¿Estás seguro que deseas eliminar la categoría "${categoria.nombre}"?`,
                'deleteCategoria',
                id
            );
        }
    }
}

// Función para mostrar errores en el modal de categoría
function showCategoryError(message) {
    let errorContainer = document.getElementById('categoriaErrorContainer');
    
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.id = 'categoriaErrorContainer';
        errorContainer.className = 'bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded';
        errorContainer.role = 'alert';
        
        const closeButton = document.createElement('button');
        closeButton.className = 'float-right font-bold';
        closeButton.innerHTML = '&times;';
        closeButton.onclick = () => errorContainer.remove();
        
        const messageSpan = document.createElement('span');
        messageSpan.className = 'block';
        messageSpan.textContent = message;
        
        errorContainer.appendChild(closeButton);
        errorContainer.appendChild(messageSpan);
        
        const form = document.getElementById('categoriaForm');
        form.insertBefore(errorContainer, form.firstChild);
    } else {
        errorContainer.querySelector('span').textContent = message;
    }
}

// Función para eliminar categoría
function deleteCategoria(id) {
    // Verificar nuevamente que no haya platillos usando esta categoría
    const platillosConCategoria = platillos.filter(p => p.categoriaId === id);
    if (platillosConCategoria.length > 0) {
        console.error('Error: Intento de eliminar categoría en uso');
        return false;
    }
    
    const categoriaNombre = categorias.find(c => c.id === id)?.nombre || '';
    categorias = categorias.filter(c => c.id !== id);
    
    renderCategorias();
    renderPlatillos();
    
    // Mostrar notificación de éxito
    showNotification(`Categoría "${categoriaNombre}" eliminada correctamente`, 'success');
    return true;
}

function showNotification(message, type = 'info') {
    // Implementar lógica para mostrar notificación
    console.log(`${type.toUpperCase()}: ${message}`);
    // Podrías usar Toastify, SweetAlert o similar aquí
}

// Funciones de utilidad
function previewImage() {
    const file = document.getElementById('platilloImagen').files[0];
    if (!file) return;
    
    const preview = document.getElementById('platilloImagenPreview');
    const reader = new FileReader();
    
    reader.onload = function(e) {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview" class="w-full h-full object-cover">`;
    }
    
    reader.readAsDataURL(file);
    document.getElementById('platilloImagenUrl').value = '';
}

function previewImageUrl() {
    const url = document.getElementById('platilloImagenUrl').value.trim();
    if (!url) return;
    
    const preview = document.getElementById('platilloImagenPreview');
    preview.innerHTML = `<img src="${url}" alt="Preview" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fas fa-image text-4xl text-gray-300\\'></i>';">`;
    document.getElementById('platilloImagen').value = '';
}

function formatPrice(input) {
    // Permitir solo números y un punto decimal
    input.value = input.value.replace(/[^0-9.]/g, '');
    
    // Asegurar que solo haya un punto decimal
    if ((input.value.match(/\./g) || []).length > 1) {
        input.value = input.value.substring(0, input.value.lastIndexOf('.'));
    }
    
    // Limitar a 2 decimales
    if (input.value.includes('.')) {
        const parts = input.value.split('.');
        if (parts[1].length > 2) {
            input.value = parts[0] + '.' + parts[1].substring(0, 2);
        }
    }
}

function validateName(input) {
    // Permitir letras, espacios y algunos caracteres especiales
    input.value = input.value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s\-',.]/g, '');
}

function validateCategoryName(input) {
    // Permitir letras, espacios y algunos caracteres especiales
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

// ------- Menú usuario navbar: se inyecta automáticamente --------
document.addEventListener('DOMContentLoaded', function() {
    // Encuentra el avatar del usuario en tu estructura específica
    let userBtn = document.querySelector('header .relative button.flex.items-center');
    
    if (userBtn) {
        // Crea el menú solo si no existe aún
        if (!document.getElementById('userDropdown')) {
            // Contenedor de dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50';
            dropdown.id = 'userDropdown';
            dropdown.style.display = 'none'; // Oculto inicialmente
            dropdown.innerHTML = `
                <div class="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
                    <button class="user-dropdown-item block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" id="logoutBtn" role="menuitem">
                        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
                    </button>
                </div>
            `;
            
            // Agrega el dropdown al DOM
            userBtn.parentNode.appendChild(dropdown);

            // Mostrar/ocultar menú al hacer click en el avatar
            userBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isShowing = dropdown.style.display === 'block';
                dropdown.style.display = isShowing ? 'none' : 'block';
            });

            // Cerrar si clic fuera
            document.addEventListener('click', function(e) {
                if (!userBtn.contains(e.target)) {
                    dropdown.style.display = 'none';
                }
            });

            // Cerrar con Esc
            document.addEventListener('keydown', function(ev) {
                if (ev.key === "Escape") {
                    dropdown.style.display = 'none';
                }
            });

            // Acción cerrar sesión
            document.getElementById('logoutBtn').addEventListener('click', function() {
                dropdown.style.display = 'none';
                // Redirección a la página de inicio de sesión
                window.location.href = "inicioSesion.html";
            });
        }
    }
});