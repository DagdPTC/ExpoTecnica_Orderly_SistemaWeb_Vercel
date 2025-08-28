const container = document.querySelector(".container");
const btnSignIn = document.getElementById("btn-sign-in");
const btnSignUp = document.getElementById("btn-sign-up");

btnSignIn.addEventListener("click", () => {
    container.classList.remove("toggle");
    clearAllErrors();
});

btnSignUp.addEventListener("click", (e) => {
    e.preventDefault();
    const emailField = document.getElementById('txtCorreo');
    const validationSystem = new RecoveryValidationSystem();

    if (validationSystem.validateEmail(emailField, 'emailError', 'emailWrapper')) {
        container.classList.add("toggle");
        clearAllErrors();
    }
});

class RecoveryValidationSystem {
    constructor() {
        this.setupEventListeners();
        this.userEmail = '';
    }

    setupEventListeners() {
        const emailInput = document.getElementById('txtCorreo');
        emailInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\s/g, '').toLowerCase();
        });

        const pinInput = document.getElementById('txtPin');
        pinInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });

        emailInput.addEventListener('blur', (e) => this.validateEmail(e.target, 'emailError', 'emailWrapper'));
        pinInput.addEventListener('blur', (e) => this.validatePin(e.target, 'pinError', 'pinWrapper'));

        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                if (input.closest('.input-wrapper').classList.contains('error')) {
                    this.clearFieldError(input);
                }
            });
        });

        document.getElementById('emailForm').addEventListener('submit', (e) => this.handleEmailSubmit(e));
        document.getElementById('pinForm').addEventListener('submit', (e) => this.handlePinSubmit(e));
    }

    validateEmail(field, errorId, wrapperId) {
        const email = field.value.trim().toLowerCase();
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (field.value !== field.value.replace(/\s/g, '')) {
            this.showError(field, errorId, wrapperId, 'El correo no puede contener espacios');
            return false;
        }

        if (field.value !== field.value.toLowerCase()) {
            this.showError(field, errorId, wrapperId, 'El correo debe estar en minúsculas');
            return false;
        }

        if (!email) {
            this.showError(field, errorId, wrapperId, 'El correo electrónico es requerido');
            return false;
        } else if (!emailRegex.test(email)) {
            this.showError(field, errorId, wrapperId, 'Formato de correo inválido (ejemplo: usuario@dominio.com)');
            return false;
        }

        this.clearFieldError(field);
        return true;
    }

    validatePin(field, errorId, wrapperId) {
        const pin = field.value.trim();

        if (!pin) {
            this.showError(field, errorId, wrapperId, 'El PIN es requerido');
            return false;
        } else if (pin.length !== 6) {
            this.showError(field, errorId, wrapperId, 'El PIN debe tener exactamente 6 dígitos');
            return false;
        } else if (!/^\d{6}$/.test(pin)) {
            this.showError(field, errorId, wrapperId, 'El PIN solo puede contener números');
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

    async handleEmailSubmit(e) {
        e.preventDefault();

        const emailField = document.getElementById('txtCorreo');
        emailField.value = emailField.value.trim().toLowerCase();

        const emailValid = this.validateEmail(emailField, 'emailError', 'emailWrapper');

        if (!emailValid) {
            return;
        }

        const btn = document.getElementById('btn-sign-up');
        const btnText = btn.querySelector('.btn-text');

        btn.disabled = true;
        btnText.innerHTML = '<span class="loading"></span>';

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.userEmail = emailField.value;

            this.showSuccessMessage('✅ PIN enviado correctamente a ' + this.userEmail);

            setTimeout(() => {
                container.classList.add("toggle");
                const successMessage = document.querySelector('.success-message');
                if (successMessage) {
                    successMessage.remove();
                }
            }, 2000);

        } catch (error) {
            this.showError(emailField, 'emailError', 'emailWrapper', 'Correo no encontrado en el sistema');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Enviar';
        }
    }

    async handlePinSubmit(e) {
        e.preventDefault();

        const pinField = document.getElementById('txtPin');
        pinField.value = pinField.value.trim();

        const pinValid = this.validatePin(pinField, 'pinError', 'pinWrapper');

        if (!pinValid) {
            return;
        }

        const btn = document.getElementById('checkPinBtn');
        const btnText = btn.querySelector('.btn-text');

        btn.disabled = true;
        btnText.innerHTML = '<span class="loading"></span>';

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            this.showSuccessMessage('✅ PIN verificado correctamente. Redirigiendo...');

            setTimeout(() => {
                window.location.href = 'contraseña.html';
            }, 2000);

        } catch (error) {
            this.showError(pinField, 'pinError', 'pinWrapper', 'PIN incorrecto. Verifique e intente nuevamente');
        } finally {
            btn.disabled = false;
            btnText.textContent = 'Comprobar';
        }
    }

    showSuccessMessage(message) {
        const form = container.classList.contains('toggle') ?
            document.querySelector('.sign-up') :
            document.querySelector('.sign-in');
        const existingMessage = form.querySelector('.success-message');

        if (existingMessage) {
            existingMessage.remove();
        }

        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.textContent = message;

        form.insertBefore(successDiv, form.children[2]);
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
    document.querySelectorAll('.success-message').forEach(msg => {
        msg.remove();
    });
}

document.addEventListener('DOMContentLoaded', () => {
    new RecoveryValidationSystem();
});