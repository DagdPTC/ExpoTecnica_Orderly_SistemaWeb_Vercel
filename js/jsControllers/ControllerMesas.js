// mesasController.js
import { getMesas, getMesaById, addMesa, updateMesa, deleteMesa } from '../jsService/ServiceMesas';

// Obtener todas las mesas y mostrarlas
export async function mostrarMesas() {
    const mesasData = await getMesas();
    console.log("Mesas actuales:", mesasData);
    // Aquí se pueden agregar funciones para actualizar la vista en el frontend
    // Ejemplo: actualizar el DOM con la lista de mesas
}

// Mostrar una mesa por ID
export async function mostrarMesa(id) {
    const mesa = await getMesaById(id);
    if (mesa) {
        console.log("Mesa encontrada:", mesa);
        // Aquí podrías mostrarla en el frontend
    } else {
        console.log(`Mesa con ID ${id} no encontrada`);
    }
}

// Agregar una nueva mesa
export async function agregarMesa() {
    const nuevaMesa = {
        numero: 7,
        capacidad: 4,
        estado: 'libre',
        responsable: '',
        cliente: ''
    };
    const mesa = await addMesa(nuevaMesa);
    console.log("Mesa agregada:", mesa);
    mostrarMesas();  // Actualizar la vista
}

// Actualizar una mesa existente
export async function actualizarMesa() {
    const idMesa = 1;
    const mesaActualizada = { estado: 'ocupada', responsable: 'Carlos' };
    const mesa = await updateMesa(idMesa, mesaActualizada);
    console.log("Mesa actualizada:", mesa);
    mostrarMesas();  // Actualizar la vista
}

// Eliminar una mesa
export async function eliminarMesa() {
    const idMesa = 2;
    const mesaId = await deleteMesa(idMesa);
    console.log("Mesa eliminada:", mesaId);
    mostrarMesas();  // Actualizar la vista
}
