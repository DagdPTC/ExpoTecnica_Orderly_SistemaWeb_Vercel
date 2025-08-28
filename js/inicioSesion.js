const container = document.querySelector(".container");
const btnSignIn = document.getElementById("btn-sign-in");
const btnSignUp = document.getElementById("btn-sign-up");
const togglePassword = document.getElementById('togglePassword');
const password = document.getElementById('password');
const toggleRegisterPassword = document.getElementById('toggleRegisterPassword');
const registerPassword = document.getElementById('txtPassr');

btnSignIn.addEventListener("click", () => {
    container.classList.remove("toggle");
    clearAllErrors();
});

btnSignUp.addEventListener("click", () => {
    container.classList.add("toggle");
    clearAllErrors();
});

togglePassword.addEventListener('click', () => {
    const isPassword = password.type === 'password';
    password.type = isPassword ? 'text' : 'password';
    togglePassword.setAttribute('name', isPassword ? 'eye-off-outline' : 'eye-outline');
});

toggleRegisterPassword.addEventListener('click', () => {
    const isPassword = registerPassword.type === 'password';
    registerPassword.type = isPassword ? 'text' : 'password';
    toggleRegisterPassword.setAttribute('name', isPassword ? 'eye-off-outline' : 'eye-outline');
});

class ValidationSystem {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('txtUser').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/\s/g, '');
            this.validateEmail(e.target, 'emailError', 'emailWrapper');
        });

        document.getElementById('password').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '');
            this.validateLoginPassword(e.target, 'passwordError', 'passwordWrapper');
        });

        document.getElementById('txtNombre').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s']/g, '');
            this.validateName(e.target, 'nameError', 'nameWrapper');
        });

        document.getElementById('txtCorreoE').addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().replace(/\s/g, '');
            this.validateEmail(e.target, 'registerEmailError', 'registerEmailWrapper');
        });

        document.getElementById('txtPassr').addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '');
            this.validateRegisterPassword(e.target, 'registerPasswordError', 'registerPasswordWrapper');
        });

        document.getElementById('txtUser').addEventListener('blur', (e) => this.validateEmail(e.target, 'emailError', 'emailWrapper'));
        document.getElementById('password').addEventListener('blur', (e) => this.validateLoginPassword(e.target, 'passwordError', 'passwordWrapper'));
        document.getElementById('txtNombre').addEventListener('blur', (e) => this.validateName(e.target, 'nameError', 'nameWrapper'));
        document.getElementById('txtCorreoE').addEventListener('blur', (e) => this.validateEmail(e.target, 'registerEmailError', 'registerEmailWrapper'));
        document.getElementById('txtPassr').addEventListener('blur', (e) => this.validateRegisterPassword(e.target, 'registerPasswordError', 'registerPasswordWrapper'));

        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));

        document.getElementById('forgotPassword').addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'recuperacion.html';
        });
    }

    validateEmail(field, errorId, wrapperId) {
        const email = field.value.trim();
        const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

        if (!email) {
            this.showError(field, errorId, wrapperId, 'El correo electrónico es requerido');
            return false;
        } else if (!emailRegex.test(email)) {
            this.showError(field, errorId, wrapperId, 'Ingresa un correo electrónico válido (ejemplo: usuario@dominio.com)');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validateLoginPassword(field, errorId, wrapperId) {
        const password = field.value.trim();

        if (!password) {
            this.showError(field, errorId, wrapperId, 'La contraseña es requerida');
            return false;
        } else if (password.length < 8) {
            this.showError(field, errorId, wrapperId, 'La contraseña debe tener al menos 8 caracteres');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validateRegisterPassword(field, errorId, wrapperId) {
        const password = field.value.trim();
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /\d/.test(password);

        if (!password) {
            this.showError(field, errorId, wrapperId, 'La contraseña es requerida');
            return false;
        } else if (password.length < 8) {
            this.showError(field, errorId, wrapperId, 'La contraseña debe tener al menos 8 caracteres');
            return false;
        } else if (!hasUpperCase || !hasLowerCase || !hasNumber) {
            this.showError(field, errorId, wrapperId, 'Debe incluir mayúsculas, minúsculas y números');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validateName(field, errorId, wrapperId) {
        const name = field.value.trim();
        const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s']+$/;

        if (!name) {
            this.showError(field, errorId, wrapperId, 'El nombre es requerido');
            return false;
        } else if (name.length < 2) {
            this.showError(field, errorId, wrapperId, 'El nombre debe tener al menos 2 caracteres');
            return false;
        } else if (!nameRegex.test(name)) {
            this.showError(field, errorId, wrapperId, 'El nombre solo puede contener letras y espacios');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    showError(field, errorId, wrapperId, message) {
        const wrapper = document.getElementById(wrapperId);
        const errorElement = document.getElementById(errorId);

        wrapper.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    clearFieldError(field) {
        const wrapper = field.closest('.input-wrapper');
        const errorElement = wrapper.parentNode.querySelector('.error-message');

        wrapper.classList.remove('error');
        errorElement.classList.remove('show');
        errorElement.textContent = '';
    }

    async handleLogin(e) {
        e.preventDefault();

        const emailField = document.getElementById('txtUser');
        const passwordField = document.getElementById('password');

        emailField.value = emailField.value.trim();
        passwordField.value = passwordField.value.trim();

        const emailValid = this.validateEmail(emailField, 'emailError', 'emailWrapper');
        const passwordValid = this.validateLoginPassword(passwordField, 'passwordError', 'passwordWrapper');

        if (!emailValid || !passwordValid) {
            if (!emailValid) {
                emailField.focus();
            } else if (!passwordValid) {
                passwordField.focus();
            }
            return;
        }

        const btn = document.getElementById('loginBtn');
        const btnText = btn.querySelector('.btn-text');

        btn.disabled = true;
        btnText.innerHTML = '<span class="loading"></span>';

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            window.location.href = 'index.html';

        } catch (error) {
            this.showError(passwordField, 'passwordError', 'passwordWrapper', 'Credenciales incorrectas');
            passwordField.focus();
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Iniciar Sesión';
        }
    }

    async handleRegister(e) {
        e.preventDefault();

        const nameField = document.getElementById('txtNombre');
        const emailField = document.getElementById('txtCorreoE');
        const passwordField = document.getElementById('txtPassr');

        nameField.value = nameField.value.trim();
        emailField.value = emailField.value.trim();
        passwordField.value = passwordField.value.trim();

        const nameValid = this.validateName(nameField, 'nameError', 'nameWrapper');
        const emailValid = this.validateEmail(emailField, 'registerEmailError', 'registerEmailWrapper');
        const passwordValid = this.validateRegisterPassword(passwordField, 'registerPasswordError', 'registerPasswordWrapper');

        if (!nameValid || !emailValid || !passwordValid) {
            if (!nameValid) {
                nameField.focus();
            } else if (!emailValid) {
                emailField.focus();
            } else if (!passwordValid) {
                passwordField.focus();
            }
            return;
        }

        const btn = document.getElementById('registerBtn');
        const btnText = btn.querySelector('.btn-text');

        btn.disabled = true;
        btnText.innerHTML = '<span class="loading"></span>';

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.showSuccessMessage('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');

            setTimeout(() => {
                this.clearRegisterForm();
                container.classList.remove("toggle");
            }, 2000);

        } catch (error) {
            this.showError(emailField, 'registerEmailError', 'registerEmailWrapper', 'Este correo ya está registrado');
            emailField.focus();
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Registrarse';
        }
    }

    showSuccessMessage(message) {
        const form = document.querySelector('.sign-up');
        const existingMessage = form.querySelector('.success-message');

        if (existingMessage) {
            existingMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;

        form.insertBefore(successDiv, form.children[2]);
    }

    clearRegisterForm() {
        document.getElementById('txtNombre').value = '';
        document.getElementById('txtCorreoE').value = '';
        document.getElementById('txtPassr').value = '';

        const successMessage = document.querySelector('.success-message');
        if (successMessage) {
            successMessage.remove();
        }
    }
}

function clearAllErrors() {
    document.querySelectorAll('.input-wrapper').forEach(wrapper => {
        wrapper.classList.remove('error');
    });
    document.querySelectorAll('.error-message').forEach(error => {
        error.classList.remove('show');
        error.textContent = '';
    });
    document.querySelectorAll('input').forEach(input => {
        input.value = input.value.trim();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    new ValidationSystem();
});
