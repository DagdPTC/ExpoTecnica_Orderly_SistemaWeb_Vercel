// JavaScript para el menú de usuario en la barra superior
document.addEventListener('DOMContentLoaded', function() {
    // Encuentra el avatar del usuario
    let userBtn = document.querySelector('.navbar-user-avatar');
    if (userBtn) {
        userBtn.style.position = 'relative';
        
        // Crea el menú solo si no existe aún
        if (!document.getElementById('userDropdown')) {
            // Contenedor de dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.id = 'userDropdown';
            dropdown.innerHTML = `
                <button class="user-dropdown-item" id="logoutBtn">
                    <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
                </button>
            `;
            userBtn.parentNode.style.position = "relative";
            userBtn.parentNode.appendChild(dropdown);

            // Overlay para cerrar el menú al hacer click fuera
            const overlay = document.createElement('div');
            overlay.className = 'user-dropdown-overlay';
            overlay.id = 'userDropdownOverlay';
            document.body.appendChild(overlay);

            // Mostrar/ocultar menú al hacer click en el avatar
            userBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                overlay.classList.toggle('active');
            });

            // Cerrar si clic fuera
            overlay.addEventListener('click', function() {
                dropdown.classList.remove('show');
                overlay.classList.remove('active');
            });

            // Cerrar con Esc
            document.addEventListener('keydown', function(ev) {
                if (ev.key === "Escape") {
                    dropdown.classList.remove('show');
                    overlay.classList.remove('active');
                }
            });

            // Acción cerrar sesión
            document.getElementById('logoutBtn').addEventListener('click', function() {
                dropdown.classList.remove('show');
                overlay.classList.remove('active');
                window.location.href = "inicioSesion.html";
            });
        }
    }
});

// Toggle sidebar para móvil y desktop
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    // Toggle móvil
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
            mobileOverlay.classList.toggle('active');
        });
    }
    
    // Toggle desktop (colapsar sidebar)
    if (sidebarToggleDesktop && sidebar) {
        sidebarToggleDesktop.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
        });
    }
    
    // Cerrar sidebar móvil al hacer click en overlay
    if (mobileOverlay) {
        mobileOverlay.addEventListener('click', function() {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        });
    }
    
    // Cerrar sidebar móvil con Escape
    document.addEventListener('keydown', function(ev) {
        if (ev.key === "Escape") {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        }
    });
    
    // Cerrar sidebar móvil al cambiar a desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('mobile-open');
            mobileOverlay.classList.remove('active');
        }
    });
});