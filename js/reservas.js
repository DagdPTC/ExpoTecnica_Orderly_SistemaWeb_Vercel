// js/reservas.js
document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mobileOverlay");
  const btnMobile = document.getElementById("sidebarToggle");
  const btnDesktop = document.getElementById("sidebarToggleDesktop");

  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("open");
    if (overlay) overlay.style.display = "block";
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("open");
    if (overlay) overlay.style.display = "none";
  }
  btnMobile?.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
  });
  btnDesktop?.addEventListener("click", () => {
    // en desktop solo colapsa/expande si lo necesitas
    if (sidebar.classList.contains("open")) closeSidebar(); else openSidebar();
  });
  overlay?.addEventListener("click", closeSidebar);

  // Cierra si se cambia a layout grande
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) { closeSidebar(); }
  });
});
