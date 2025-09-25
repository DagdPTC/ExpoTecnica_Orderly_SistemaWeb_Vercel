document.addEventListener('DOMContentLoaded', function() {
    // Función para manejar el inicio de sesión
    async function loginUser() {
        const correo = document.getElementById('txtUser').value;
        const contrasena = document.getElementById('password').value;

        // Validar que los campos no estén vacíos
        if (!correo || !contrasena) {
            Swal.fire({
                icon: 'error',
                title: 'Campos Vacíos',
                text: 'Por favor, complete ambos campos.',
            });
            return;
        }

        const data = {
            correo: correo,            // Asegúrate de que "correo" esté en minúsculas
            contrasenia: contrasena   // Asegúrate de que "contrasenia" esté en minúsculas
        };

        try {
            // Realiza la solicitud POST al backend para autenticar al usuario
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data),
                credentials: 'include'  // Permite incluir las cookies en la solicitud
            });

            // Verifica si la respuesta es exitosa (código 200)
            if (response.ok) {
                const result = await response.json();
                // Muestra la alerta bonita usando SweetAlert2
                Swal.fire({
                    icon: 'success',
                    title: '¡Inicio de sesión exitoso!',
                    text: 'Bienvenido al sistema.',
                    showConfirmButton: false,
                    timer: 1500  // La alerta desaparecerá después de 1.5 segundos
                });

                // Redirigir al index.html después de mostrar la alerta
                setTimeout(function() {
                    window.location.href = '/ExpoTecnica_Orderly_SistemaWeb/index.html';  // Redirigir al dashboard
                }, 1500);  // Tiempo que debe esperar para redirigir
            } else {
                // Si no es exitosa, maneja el error de manera adecuada
                const error = await response.json();
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.error || 'Credenciales inválidas',
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Hubo un problema con la conexión: ' + error.message,
            });
        }
    }

    // Asignamos el evento de submit al formulario
    const form = document.querySelector('.sign-in');
    if (form) {
        form.addEventListener('submit', function(event) {
            event.preventDefault();
            loginUser();
        });
    }

    // Lógica para la interacción de los botones "Iniciar sesión" y "Registrar"
    const container = document.querySelector(".container");
    const btnSingIn = document.getElementById("btn-sign-in");
    const btnSingUp = document.getElementById("btn-sign-up");

    btnSingIn.addEventListener("click", () => {
        container.classList.remove("toggle");
    });

    btnSingUp.addEventListener("click", () => {
        container.classList.add("toggle");
    });

    // Mostrar y ocultar la contraseña con el ícono del ojo
    const togglePassword = document.getElementById('togglePassword');
    const password = document.getElementById('password');

    togglePassword.addEventListener('click', () => {
        const isPassword = password.type === 'password';
        password.type = isPassword ? 'text' : 'password';

        togglePassword.setAttribute('name', isPassword ? 'eye-outline' : 'eye-off-outline');
    });

    // Función para limpiar el campo de correo
    function btnCorreo() {
        document.getElementById("txtPass").value = "";
    }

    // Función para limpiar el campo de contraseña
    function btnSiguiente() {
        document.getElementById("txtCorreo").value = "";
    }

    // Función para limpiar los campos del registro
    function Registrar() {
        document.getElementById("txtUser").value = "";
        document.getElementById("password").value = "";
    }

    // Función para limpiar los campos de inicio
    function Iniciar() {
        document.getElementById("txtNombre").value = "";
        document.getElementById("txtCorreoE").value = "";
        document.getElementById("txtPassr").value = "";
    }
});
