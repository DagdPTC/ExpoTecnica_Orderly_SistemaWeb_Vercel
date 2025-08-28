document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const newPasswordError = document.getElementById('newPasswordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const newPasswordWrapper = document.getElementById('newPasswordWrapper');
    const confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
    const submitBtn = document.getElementById('loginBtn');

    function showError(inputWrapper, errorElement, message) {
        inputWrapper.classList.add('error');
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }

    function clearError(inputWrapper, errorElement) {
        inputWrapper.classList.remove('error');
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }

    function validatePassword(password) {
        const errors = [];

        if (password.length < 8) {
            errors.push("La contraseña debe tener al menos 8 caracteres");
        }

        if (/\s/.test(password)) {
            errors.push("La contraseña no puede contener espacios");
        }

        if (!/\d/.test(password)) {
            errors.push("La contraseña debe contener al menos 1 número");
        }

        if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push("La contraseña debe contener al menos 1 caracter especial");
        }

        return errors;
    }

    newPasswordInput.addEventListener('input', function () {
        const password = newPasswordInput.value;
        const errors = validatePassword(password);

        if (errors.length > 0) {
            showError(newPasswordWrapper, newPasswordError, errors.join('. '));
        } else {
            clearError(newPasswordWrapper, newPasswordError);
        }

        if (confirmPasswordInput.value) {
            if (password !== confirmPasswordInput.value) {
                showError(confirmPasswordWrapper, confirmPasswordError, "Las contraseñas no coinciden");
            } else {
                clearError(confirmPasswordWrapper, confirmPasswordError);
            }
        }
    });

    confirmPasswordInput.addEventListener('input', function () {
        if (newPasswordInput.value !== confirmPasswordInput.value) {
            showError(confirmPasswordWrapper, confirmPasswordError, "Las contraseñas no coinciden");
        } else {
            clearError(confirmPasswordWrapper, confirmPasswordError);
        }
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const passwordErrors = validatePassword(newPassword);
        let isValid = true;

        if (passwordErrors.length > 0) {
            showError(newPasswordWrapper, newPasswordError, passwordErrors.join('. '));
            isValid = false;
        }

        if (newPassword !== confirmPassword) {
            showError(confirmPasswordWrapper, confirmPasswordError, "Las contraseñas no coinciden");
            isValid = false;
        }

        if (isValid) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="btn-text">Procesando...</span>';

            setTimeout(function () {
                window.location.href = 'inicioSesion.html';
            }, 1500);
        }
    });

    document.getElementById('toggleNewPassword').addEventListener('click', function () {
        togglePasswordVisibility(newPasswordInput, this);
    });

    document.getElementById('toggleConfirmPassword').addEventListener('click', function () {
        togglePasswordVisibility(confirmPasswordInput, this);
    });

    function togglePasswordVisibility(input, icon) {
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        icon.setAttribute('name', type === 'password' ? 'eye-outline' : 'eye-off-outline');
    }
});