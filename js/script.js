        // JavaScript original con mejoras para responsive
        
        // ------- Menú usuario navbar: se inyecta automáticamente --------
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

        // Animaciones de entrada escalonada para las cards
        document.addEventListener('DOMContentLoaded', function() {
            const observerOptions = {
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            };

            const observer = new IntersectionObserver(function(entries) {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            }, observerOptions);

            // Observar elementos con animación
            document.querySelectorAll('.animate-fade-in').forEach(el => {
                el.style.opacity = '0';
                el.style.transform = 'translateY(20px)';
                el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
                observer.observe(el);
            });
        });

        // Efectos hover mejorados para las mesas
        document.addEventListener('DOMContentLoaded', function() {
            const tableStatus = document.querySelectorAll('.table-status');
            
            tableStatus.forEach(table => {
                table.addEventListener('mouseenter', function() {
                    this.style.transform = 'scale(1.05) rotate(2deg)';
                });
                
                table.addEventListener('mouseleave', function() {
                    this.style.transform = 'scale(1) rotate(0deg)';
                });
                
                table.addEventListener('click', function() {
                    // Efecto de click
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = 'scale(1.05) rotate(2deg)';
                    }, 150);
                });
            });
        });

        // Smooth scroll para enlaces internos
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        });
    