document.addEventListener('DOMContentLoaded', function () {
  let userBtn = document.querySelector('.navbar-user-avatar');
  if (userBtn) {
    userBtn.style.position = 'relative';

    if (!document.getElementById('userDropdown')) {
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

      const overlay = document.createElement('div');
      overlay.className = 'user-dropdown-overlay';
      overlay.id = 'userDropdownOverlay';
      document.body.appendChild(overlay);

      userBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        overlay.classList.toggle('active');
      });

      overlay.addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.key === "Escape") {
          dropdown.classList.remove('show');
          overlay.classList.remove('active');
        }
      });

      document.getElementById('logoutBtn').addEventListener('click', function () {
        dropdown.classList.remove('show');
        overlay.classList.remove('active');
        window.location.href = "inicioSesion.html";
      });
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('mobile-open');
      mobileOverlay.classList.toggle('active');
    });
  }

  if (sidebarToggleDesktop && sidebar) {
    sidebarToggleDesktop.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', function () {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    });
  }

  document.addEventListener('keydown', function (ev) {
    if (ev.key === "Escape") {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove('mobile-open');
      mobileOverlay.classList.remove('active');
    }
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
});

document.addEventListener('DOMContentLoaded', function () {
  const tableStatus = document.querySelectorAll('.table-status');

  tableStatus.forEach(table => {
    table.addEventListener('mouseenter', function () {
      this.style.transform = 'scale(1.05) rotate(2deg)';
    });

    table.addEventListener('mouseleave', function () {
      this.style.transform = 'scale(1) rotate(0deg)';
    });

    table.addEventListener('click', function () {
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = 'scale(1.05) rotate(2deg)';
      }, 150);
    });
  });
});

document.addEventListener('DOMContentLoaded', function () {
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
