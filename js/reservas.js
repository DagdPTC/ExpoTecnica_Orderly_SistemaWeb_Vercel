document.addEventListener("DOMContentLoaded", () => {
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

    const logoutBtn = document.getElementById("logoutBtn");
    logoutBtn?.addEventListener("click", () => {
      dropdown.classList.remove("show");
      overlay.classList.remove("active");
      window.location.href = "inicioSesion.html";
    });
  }

  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebarToggleDesktop = document.getElementById("sidebarToggleDesktop");
  const sidebar = document.getElementById("sidebar");
  const mobileOverlay = document.getElementById("mobileOverlay");

  sidebarToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("mobile-open");
    mobileOverlay?.classList.toggle("active");
  });

  sidebarToggleDesktop?.addEventListener("click", () => {
    sidebar?.classList.toggle("collapsed");
  });

  mobileOverlay?.addEventListener("click", () => {
    sidebar?.classList.remove("mobile-open");
    mobileOverlay?.classList.remove("active");
  });

  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) {
      sidebar?.classList.remove("mobile-open");
      mobileOverlay?.classList.remove("active");
    }
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );

  document.querySelectorAll(".animate-fade-in").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    observer.observe(el);
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
});
