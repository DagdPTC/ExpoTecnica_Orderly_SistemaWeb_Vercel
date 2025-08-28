document.addEventListener("DOMContentLoaded", function () {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");
  const sidebar = document.getElementById("sidebar");
  const mobileOverlay = document.getElementById("mobileOverlay");

  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      sidebar.classList.toggle("mobile-open");
      mobileOverlay.classList.toggle("active");
    });
  }
  if (sidebarToggleDesktop) {
    sidebarToggleDesktop.addEventListener("click", function () {
      sidebar.classList.toggle("collapsed");
    });
  }
  if (mobileOverlay) {
    mobileOverlay.addEventListener("click", function () {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    });
  }
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    }
  });
  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("mobile-open");
      mobileOverlay.classList.remove("active");
    }
  });

  // aparición suave
  document.querySelectorAll(".animate-fade-in").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    el.style.transition = "all .45s cubic-bezier(0.4,0,0.2,1)";
    requestAnimationFrame(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    });
  });

  // mini dropdown usuario
  const userBtn = document.querySelector(".navbar-user-avatar");
  if (userBtn && !document.getElementById("userDropdown")) {
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

    userBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      dropdown.classList.toggle("show");
      overlay.classList.toggle("active");
    });
    overlay.addEventListener("click", function () {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        dropdown.classList.remove("show");
        overlay.classList.remove("active");
      }
    });
    document.getElementById("logoutBtn").addEventListener("click", function () {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }
});
