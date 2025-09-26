// mesasService.js

const API_URL = 'http://localhost:8080/api/mesas'; // Asegúrate de que la URL de tu API sea la correcta

// Obtener todas las mesas
export async function getMesas() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Error al obtener las mesas');
        const mesas = await response.json();
        return mesas;
    } catch (error) {
        console.error(error);
        return [];
    }
}

// Obtener una mesa por su ID
export async function getMesaById(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`);
        if (!response.ok) throw new Error('Error al obtener la mesa');
        const mesa = await response.json();
        return mesa;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Agregar una nueva mesa
export async function addMesa(mesa) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mesa),
        });

        if (!response.ok) throw new Error('Error al agregar la mesa');
        const newMesa = await response.json();
        return newMesa;
    } catch (error) {
        console.error(error);
    }
}

// Actualizar una mesa existente
export async function updateMesa(id, updatedMesa) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedMesa),
        });

        if (!response.ok) throw new Error('Error al actualizar la mesa');
        const mesa = await response.json();
        return mesa;
    } catch (error) {
        console.error(error);
    }
}

// Eliminar una mesa
export async function deleteMesa(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) throw new Error('Error al eliminar la mesa');
        return id;
    } catch (error) {
        console.error(error);
    }
}
