// js/interface.js

// Navbar: menú usuario (logout simple a inicioSesion.html)
function setupUserDropdown() {
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (!userBtn) return;

  userBtn.style.position = "relative";

  if (!document.getElementById("userDropdown")) {
    const dropdown = document.createElement("div");
    dropdown.className = "user-dropdown";
    dropdown.id = "userDropdown";
    dropdown.innerHTML = `
      <button class="user-dropdown-item" id="logoutBtn">
        <i class="fas fa-sign-out-alt mr-2"></i> Cerrar sesión
      </button>
    `;
    userBtn.parentNode.style.position = "relative";
    userBtn.parentNode.appendChild(dropdown);

    const overlay = document.createElement("div");
    overlay.className = "user-dropdown-overlay";
    overlay.id = "userDropdownOverlay";
    document.body.appendChild(overlay);

    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") {
        dropdown.classList.remove("show");
        overlay.classList.remove("active");
      }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }
}

// Sidebar móvil / desktop
function setupSidebarToggles() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");
  const sidebar = document.getElementById("sidebar");
  const mobileOverlay = document.getElementById("mobileOverlay");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      mobileOverlay?.classList.toggle("active");
    });
  }

  if (sidebarToggleDesktop && sidebar) {
    sidebarToggleDesktop.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
    });
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    });
  }

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      sidebar.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupUserDropdown();
  setupSidebarToggles();
});
