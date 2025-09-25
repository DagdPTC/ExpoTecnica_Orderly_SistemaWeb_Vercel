// js/controllers/mesasController.js

import { getMesas, createMesa, updateMesa, deleteMesa } from "../jsService/ServiceMesas.js";

// Elements
const mesasContainer = document.getElementById("mesas-container");
const emptyState = document.getElementById("empty-state");

// Function to render mesas as cards
// js/controllers/mesasController.js

// js/controllers/mesasController.js

const renderMesas = (mesas) => {
    console.log("Mesas received in renderMesas:", mesas);

    if (!Array.isArray(mesas)) { // Verifica que 'mesas' sea un arreglo
        console.error("El dato no es un arreglo:", mesas);
        return;
    }

    if (mesas.length === 0) {
        emptyState.classList.remove("hidden");
        return;
    }

    emptyState.classList.add("hidden");

    mesasContainer.innerHTML = ""; // Limpiar el contenedor de mesas
    mesas.forEach((mesa) => {
        const card = document.createElement("div");
        card.className = "counter stat-card p-6 hover-lift";
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-gray-600 text-sm font-medium mb-1">Mesa #${mesa.nomMesa}</p>
                    <h3 class="text-3xl font-bold ${getMesaClass(mesa.idEstadoMesa)}">${mesa.idTipoMesa} personas</h3>
                </div>
                <div class="stat-icon w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                    <i class="fas fa-chair text-gray-600 text-xl"></i>
                </div>
            </div>
        `;
        mesasContainer.appendChild(card);
    });
};

// Manejo de la carga de mesas
const fetchMesas = async () => {
    const mesas = await getMesas();
    renderMesas(mesas || []);  // Asegúrate de pasar un arreglo vacío si mesas es undefined
};



// Handle filter buttons
const filterTables = (status) => {
    const mesas = document.querySelectorAll(".counter");
    mesas.forEach((mesa) => {
        if (mesa.classList.contains(status)) {
            mesa.classList.remove("hidden");
        } else {
            mesa.classList.add("hidden");
        }
    });
};

// Function to handle adding a new mesa
const handleAddMesa = async () => {
    const numero = document.getElementById("add-numero").value;
    const capacidad = document.getElementById("add-capacidad").value;

    if (numero && capacidad) {
        const newMesa = { numero, capacidad };
        await createMesa(newMesa);
        fetchMesas();
    } else {
        alert("Complete todos los campos");
    }
};

// Function to handle editing a mesa
const handleUpdateMesa = async () => {
    const id = document.getElementById("update-numero").value;
    const capacidad = document.getElementById("update-capacidad").value;

    if (id && capacidad) {
        const updatedMesa = { capacidad };
        await updateMesa(id, updatedMesa);
        fetchMesas();
    } else {
        alert("Complete todos los campos");
    }
};

// Function to handle deleting a mesa
const handleDeleteMesa = async () => {
    const id = document.getElementById("delete-numero").value;
    if (id) {
        await deleteMesa(id);
        fetchMesas();
    } else {
        alert("Indique el número de la mesa a eliminar");
    }
};

// Helper function to set the color based on the mesa's estado
const getMesaClass = (estado) => {
    switch (estado) {
        case "libre": return "text-emerald-600";
        case "ocupada": return "text-red-600";
        case "reservada": return "text-blue-600";
        case "limpieza": return "text-amber-600";
        default: return "text-gray-600";
    }
};

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    fetchMesas();

    // Add event listeners for buttons (for adding, updating, and deleting)
    document.getElementById("add-btn").addEventListener("click", handleAddMesa);
    document.getElementById("edit-btn").addEventListener("click", handleUpdateMesa);
    document.getElementById("delete-btn").addEventListener("click", handleDeleteMesa);
});
