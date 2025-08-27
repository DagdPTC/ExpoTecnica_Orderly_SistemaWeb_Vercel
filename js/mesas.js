// =======================
// === DATOS INICIALES ===
// =======================
let mesas = [
    { id: 1, numero: 1, capacidad: 4, estado: 'libre', responsable: '', cliente: '' },
    { id: 2, numero: 2, capacidad: 2, estado: 'ocupada', responsable: 'Juan Pérez', cliente: '' },
    { id: 3, numero: 3, capacidad: 6, estado: 'reservada', responsable: '', cliente: 'María García' },
    { id: 4, numero: 4, capacidad: 4, estado: 'limpieza', responsable: '', cliente: '' },
    { id: 5, numero: 5, capacidad: 8, estado: 'libre', responsable: '', cliente: '' }
];

// =======================
// === INICIALIZACIÓN ====
// =======================
document.addEventListener('DOMContentLoaded', () => {
    renderMesas();
    updateCounters();
});

// =======================
// === RENDER DINÁMICO ====
// =======================
function renderMesas(filter = 'all') {
    const container = document.getElementById('mesas-container');
    container.innerHTML = '';

    const lista = filter === 'all' ? mesas : mesas.filter(m => m.estado === filter);

    lista.forEach(mesa => {
        const card = document.createElement('div');
        card.className = `card bg-white rounded-lg shadow overflow-hidden border-l-4 status-${mesa.estado}`;

        let responsable = mesa.estado === 'ocupada' && mesa.responsable ? `<p class="text-sm mt-1">Atendida por: ${mesa.responsable}</p>` : '';
        let cliente = mesa.estado === 'reservada' && mesa.cliente ? `<p class="text-sm mt-1">Reservada por: ${mesa.cliente}</p>` : '';

        card.innerHTML = `
            <div class="p-4">
                <h3 class="text-lg font-bold text-gray-800">Mesa ${mesa.numero}</h3>
                <div class="flex items-center mt-1">
                    <span class="status-dot-${mesa.estado} w-2 h-2 rounded-full mr-2"></span>
                    <span class="text-sm capitalize">${mesa.estado}</span>
                </div>
                <div class="text-sm text-gray-600 mt-1">Capacidad: ${mesa.capacidad} personas</div>
                ${responsable}
                ${cliente}
            </div>
        `;
        container.appendChild(card);
    });
}

// =======================
// === CONTADORES ========
// =======================
function updateCounters() {
    document.getElementById('count-libre').innerText = mesas.filter(m => m.estado === 'libre').length;
    document.getElementById('count-ocupada').innerText = mesas.filter(m => m.estado === 'ocupada').length;
    document.getElementById('count-reservada').innerText = mesas.filter(m => m.estado === 'reservada').length;
    document.getElementById('count-limpieza').innerText = mesas.filter(m => m.estado === 'limpieza').length;
}

// =======================
// === FILTRO BOTONES ====
// =======================
function filterTables(status) {
    renderMesas(status);
}

// =======================
// === FAB (BOTÓN +) =====
// =======================
const fab = document.getElementById('fab');
const fabMenu = document.getElementById('fab-menu');

fab.onclick = () => {
    fabMenu.classList.toggle('hidden');
};

document.getElementById('add-btn').onclick = () => {
    document.getElementById('add-modal').classList.remove('hidden');
};
document.getElementById('update-btn').onclick = () => {
    document.getElementById('update-modal-step1').classList.remove('hidden');
};
document.getElementById('delete-btn').onclick = () => {
    document.getElementById('delete-modal').classList.remove('hidden');
};

// =======================
// === CRUD ==============
// =======================
function closeAdd() {
    document.getElementById('add-modal').classList.add('hidden');
    clearAdd();
}

function closeUpdate() {
    document.getElementById('update-modal-step1').classList.add('hidden');
    document.getElementById('update-modal-step2').classList.add('hidden');
    clearUpdate();
}

function closeDelete() {
    document.getElementById('delete-modal').classList.add('hidden');
    clearDelete();
}

function clearAdd() {
    document.getElementById('add-numero').value = '';
    document.getElementById('add-capacidad').value = '';
    document.getElementById('add-message').innerText = '';
}

function clearUpdate() {
    document.getElementById('update-search-numero').value = '';
    document.getElementById('update-numero').value = '';
    document.getElementById('update-capacidad').value = '';
    document.getElementById('update-message-step1').innerText = '';
    document.getElementById('update-message-step2').innerText = '';
}

function clearDelete() {
    document.getElementById('delete-numero').value = '';
    document.getElementById('delete-message').innerText = '';
}

function addMesa() {
    const numero = parseInt(document.getElementById('add-numero').value);
    const capacidad = parseInt(document.getElementById('add-capacidad').value);
    const msg = document.getElementById('add-message');

    if (isNaN(numero) || numero < 1 || numero > 99) {
        msg.innerText = "Número de mesa inválido.";
        return;
    }
    if (mesas.some(m => m.numero === numero)) {
        msg.innerText = "Número de mesa duplicado.";
        return;
    }
    if (isNaN(capacidad) || capacidad < 1 || capacidad > 99) {
        msg.innerText = "Capacidad inválida.";
        return;
    }

    const newId = mesas.length ? Math.max(...mesas.map(m => m.id)) + 1 : 1;
    mesas.push({ id: newId, numero, capacidad, estado: 'libre', responsable: '', cliente: '' });

    msg.innerText = "Mesa agregada correctamente.";
    renderMesas();
    updateCounters();
}

let currentMesaId = null;

function nextUpdate() {
    const numero = parseInt(document.getElementById('update-search-numero').value);
    const msg = document.getElementById('update-message-step1');
    const mesa = mesas.find(m => m.numero === numero);
    if (!mesa) {
        msg.innerText = "Mesa no encontrada.";
        return;
    }
    if (mesa.estado !== 'libre') {
        msg.innerText = "No se puede actualizar una mesa ocupada/reservada/limpieza.";
        return;
    }

    currentMesaId = mesa.id;
    document.getElementById('update-numero').value = mesa.numero;
    document.getElementById('update-capacidad').value = mesa.capacidad;

    document.getElementById('update-modal-step1').classList.add('hidden');
    document.getElementById('update-modal-step2').classList.remove('hidden');
}

function updateMesa() {
    const numero = parseInt(document.getElementById('update-numero').value);
    const capacidad = parseInt(document.getElementById('update-capacidad').value);
    const msg = document.getElementById('update-message-step2');

    const mesa = mesas.find(m => m.id === currentMesaId);
    if (!mesa) {
        msg.innerText = "Mesa no encontrada.";
        return;
    }

    if (isNaN(numero) || numero < 1 || numero > 99) {
        msg.innerText = "Número inválido.";
        return;
    }
    if (mesas.some(m => m.numero === numero && m.id !== currentMesaId)) {
        msg.innerText = "Número de mesa duplicado.";
        return;
    }
    if (isNaN(capacidad) || capacidad < 1 || capacidad > 99) {
        msg.innerText = "Capacidad inválida.";
        return;
    }

    mesa.numero = numero;
    mesa.capacidad = capacidad;

    msg.innerText = "Mesa actualizada correctamente.";
    renderMesas();
    updateCounters();
}

function deleteMesa() {
    const numero = parseInt(document.getElementById('delete-numero').value);
    const msg = document.getElementById('delete-message');

    const index = mesas.findIndex(m => m.numero === numero);
    if (index === -1) {
        msg.innerText = "Mesa no encontrada.";
        return;
    }
    if (mesas[index].estado !== 'libre') {
        msg.innerText = "No se puede eliminar una mesa ocupada/reservada/limpieza.";
        return;
    }

    mesas.splice(index, 1);
    msg.innerText = "Mesa eliminada correctamente.";
    renderMesas();
    updateCounters();
}
