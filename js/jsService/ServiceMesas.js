// js/services/mesasService.js

const API_HOST = "http://localhost:8080"; // Cambia esta URL según tu configuración

// js/services/mesasService.js

// js/services/mesasService.js

const getMesas = async (page = 0, size = 20) => {
    try {
        const token = localStorage.getItem("authToken");  // Asegúrate de que el token esté guardado en el localStorage
        const response = await fetch(`${API_HOST}/apiMesa/getDataMesa?page=${page}&size=${size}`, {
            headers: {
                'Authorization': `Bearer ${token}`, // Incluyendo el token en la cabecera
            },
            credentials: "include"
        });

        // Si la respuesta no es ok, lanza un error
        if (!response.ok) throw new Error("Error fetching mesas");

        // Intentamos obtener la respuesta en formato JSON
        const data = await response.json();
        console.log("Data received from API:", data); // Imprime la respuesta de la API para depuración

        // Accede a la propiedad 'content' que contiene las mesas
        const mesas = data.content || [];  // Si 'content' no existe, retornamos un arreglo vacío
        return mesas;
    } catch (error) {
        console.error("Error fetching mesas:", error);
        return [];  // Si hay un error, retornamos un arreglo vacío para evitar el segundo error
    }
};



const createMesa = async (mesaData) => {
    try {
        const response = await fetch(`${BASE_URL}/createMesa`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mesaData),
            credentials:"include",
        });
        if (!response.ok) throw new Error("Error creating mesa");
        return await response.json();
    } catch (error) {
        console.error(error);
    }
};

const updateMesa = async (id, mesaData) => {
    try {
        const response = await fetch(`${BASE_URL}/modificarMesa/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mesaData),
        });
        if (!response.ok) throw new Error("Error updating mesa");
        return await response.json();
    } catch (error) {
        console.error(error);
    }
};

const deleteMesa = async (id) => {
    try {
        const response = await fetch(`${BASE_URL}/eliminarMesa/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error("Error deleting mesa");
        return await response.json();
    } catch (error) {
        console.error(error);
    }
};

export { getMesas, createMesa, updateMesa, deleteMesa };
