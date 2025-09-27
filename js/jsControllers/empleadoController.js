import { getEmpleados } from "../jsService/empleadoService.js";

// Función para renderizar los empleados en la tabla
function renderEmpleados(empleados) {
    const tbody = document.getElementById('employees-tbody');
    tbody.innerHTML = '';  // Limpiar la tabla antes de llenarla

    if (Array.isArray(empleados)) {  // Verificar que 'empleados' sea un array
        empleados.forEach(empleado => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${empleado.firstName} ${empleado.lastNameP}</td>
                <td>${empleado.username}</td>
                <td class="hidden sm:table-cell">${empleado.email}</td>
                <td>${empleado.role}</td>
                <td class="hidden lg:table-cell"><button class="btn btn-primary">Detalles</button></td>
                <td><button class="btn btn-danger">Eliminar</button></td>
            `;
            tbody.appendChild(tr);
        });
    } else {
        console.error("Los datos recibidos no son un array de empleados", empleados);
    }
}


// Función para cargar los empleados al cargar la página
async function loadEmpleados() {
    const empleados = await getEmpleados(0, 10);  // Cambia los parámetros de página según sea necesario
    renderEmpleados(empleados);  // Llamar la función para renderizar la tabla
}

// Ejecutar la carga de empleados al cargar la página
document.addEventListener('DOMContentLoaded', loadEmpleados);

// Opcional: Función para manejar el filtrado por rol
document.getElementById('roleBtn').addEventListener('click', async () => {
    const selectedRoles = Array.from(document.querySelectorAll('.role-filter:checked'))
        .map(checkbox => checkbox.value);
    
    // Aquí se puede modificar la lógica para filtrar los empleados
    // Por ejemplo, si seleccionamos "Administrador", solo mostramos esos empleados
    const empleados = await getEmpleados(0, 10); // Actualizar para tomar los roles filtrados
    renderEmpleados(empleados);  // Renderizar los empleados filtrados
});
