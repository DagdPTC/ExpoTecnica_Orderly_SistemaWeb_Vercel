// URL base de la API
const API_HOST = "http://localhost:8080";  // Cambia según la configuración de tu API
const URL_EMPLEADOS = `${API_HOST}/apiEmpleado`;  // Endpoint para obtener los empleados

// Función para obtener los empleados
async function getEmpleados(page = 0, size = 10) {
    try {
        // Realizamos la solicitud GET para obtener los empleados
        const response = await fetch(`${URL_EMPLEADOS}/getDataEmpleado?page=${page}&size=${size}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,  // Usando el token almacenado en el localStorage
            },
        });

        // Verificamos si la respuesta fue exitosa
        if (!response.ok) {
            throw new Error(`Error al obtener los empleados: ${response.statusText}`);
        }

        // Intentamos obtener los datos en formato JSON
        const data = await response.json();

        // Depuración para ver el formato de la respuesta
        console.log("Datos recibidos:", data);

        // Verificamos que 'data.content' exista y sea un array, sino retornamos un array vacío
        if (Array.isArray(data.content)) {
            return data.content;
        } else {
            console.error('La respuesta no contiene un array de empleados en "content"');
            return [];
        }
    } catch (error) {
        console.error("Error al obtener empleados:", error);
        return [];  // Retornamos un array vacío si hay error
    }
}

// Exportar la función para usarla en el controlador
export { getEmpleados };
