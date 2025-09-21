// js/mesas.js
import {
  getMesas,
  createMesa,
  updateMesa as svcUpdateMesa,
  deleteMesa as svcDeleteMesa,
  findMesaByNumero,
  getMesaId,
  getEstadoMesa,
} from "../jsService/ServiceMesas.js";

(() => {
  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $all = (s, el = document) => [...el.querySelectorAll(s)];
  const toInt = (v) => Number(String(v ?? "").trim());
  const safe = (v, fallback = "-") => (v ?? v === 0 ? v : fallback);

  // ---------- Estado ----------
  let MESAS = [];
  let CURRENT_FILTER = "all";
  let SELECTED_MESA_ID = null;  // para update por ID

  // ---------- Referencias UI ----------
  const ref = {
    counters: {
      libre: $("#count-libre"),
      ocupada: $("#count-ocupada"),
      reservada: $("#count-reservada"),
      limpieza: $("#count-limpieza"),
    },
    container: $("#mesas-container"),
    empty: $("#empty-state"),

    // Botones de filtro (por onclick en HTML)
    filterBtns: {
      all: document.querySelector('button[onclick="filterTables(\'all\')"]'),
      libre: document.querySelector('button[onclick="filterTables(\'libre\')"]'),
      ocupada: document.querySelector('button[onclick="filterTables(\'ocupada\')"]'),
      reservada: document.querySelector('button[onclick="filterTables(\'reservada\')"]'),
      limpieza: document.querySelector('button[onclick="filterTables(\'limpieza\')"]'),
    },

    // FAB
    fabMain: $("#fab-main"),
    fabMenu: $("#fab-menu"),
    addBtn: $("#add-btn"),
    editBtn: $("#edit-btn"),
    deleteBtn: $("#delete-btn"),

    // Modales
    addModal: $("#add-modal"),
    upModal1: $("#update-modal-step1"),
    upModal2: $("#update-modal-step2"),
    delModal: $("#delete-modal"),

    // Form Add
    addNumero: $("#add-numero"),
    addCapacidad: $("#add-capacidad"),
    addMessage: $("#add-message"),

    // Update step 1
    upSearchNumero: $("#update-search-numero"),
    upMessage1: $("#update-message-step1"),

    // Update step 2
    upNumero: $("#update-numero"),
    upCapacidad: $("#update-capacidad"),
    upMessage2: $("#update-message-step2"),

    // Delete
    delNumero: $("#delete-numero"),
    delMessage: $("#delete-message"),

    // Sidebar
    sidebarToggle: $("#sidebarToggle"),
    sidebarToggleDesktop: $("#sidebarToggleDesktop"),
    sidebar: $("#sidebar"),
    mobileOverlay: $("#mobileOverlay"),
  };

  // ---------- Init ----------
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    wireSidebar();
    wireFab();
    wireModalShortcuts(); // Esc para cerrar, click fuera, etc.
    await reloadMesas();
    exposeGlobals(); // funciones usadas por los onclick del HTML
  }

  // ---------- Render de tarjetas y contadores ----------
  async function reloadMesas() {
    const res = await getMesas(0, 120);
    MESAS = res?.content || res || [];
    renderMesas();
  }

  function renderMesas() {
    ref.container.innerHTML = "";
    let visibles = 0;

    const counts = { libre: 0, ocupada: 0, reservada: 0, limpieza: 0 };

    MESAS.forEach((mesa) => {
      const id = getMesaId(mesa);
      const numero = mesa?.NumMesa ?? mesa?.numMesa ?? mesa?.numero ?? mesa?.Numero ?? "?";
      const capacidad = mesa?.Capacidad ?? mesa?.capacidad ?? "-";
      const estado = getEstadoMesa(mesa);

      // contadores
      if (counts[estado.key] !== undefined) counts[estado.key]++;

      // filtro
      if (CURRENT_FILTER !== "all" && CURRENT_FILTER !== estado.key) return;

      visibles++;

      // Card
      const card = document.createElement("div");
      card.className =
        "p-6 rounded-xl shadow hover:shadow-lg transition-all hover-lift bg-white border border-slate-200 flex flex-col";

      card.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-800">Mesa ${safe(numero)}</h3>
          <span class="px-3 py-1 text-sm rounded-full font-medium ${estadoBadgeClass(estado.key)}">
            ${estado.label}
          </span>
        </div>
        <p class="text-slate-600 mb-1"><span class="font-semibold">Capacidad:</span> ${safe(capacidad)}</p>
        <p class="text-slate-500 text-sm"><span class="font-semibold">ID:</span> ${safe(id)}</p>

        <div class="mt-4 grid grid-cols-2 gap-2">
          <button class="py-2 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition btn-edit">
            Editar
          </button>
          <button class="py-2 px-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition btn-del">
            Eliminar
          </button>
        </div>
      `;

      // eventos de botones por tarjeta
      card.querySelector(".btn-edit").addEventListener("click", () => {
        // Abre flujo de edición directo con el ID conocido
        SELECTED_MESA_ID = id;
        ref.upNumero.value = toInt(numero);
        ref.upCapacidad.value = toInt(capacidad);
        ref.upMessage2.textContent = "";
        showModal(ref.upModal2);
      });

      card.querySelector(".btn-del").addEventListener("click", () => {
        ref.delNumero.value = toInt(numero);
        ref.delMessage.textContent = "";
        showModal(ref.delModal);
      });

      ref.container.appendChild(card);
    });

    // actualizar contadores
    ref.counters.libre.textContent = counts.libre;
    ref.counters.ocupada.textContent = counts.ocupada;
    ref.counters.reservada.textContent = counts.reservada;
    ref.counters.limpieza.textContent = counts.limpieza;

    // estado vacío
    ref.empty.classList.toggle("hidden", visibles > 0);
  }

  function estadoBadgeClass(key) {
    switch (key) {
      case "libre": return "bg-emerald-100 text-emerald-700";
      case "ocupada": return "bg-red-100 text-red-700";
      case "reservada": return "bg-blue-100 text-blue-700";
      case "limpieza": return "bg-amber-100 text-amber-700";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  // ---------- Filtros (usado por botones con onclick en HTML) ----------
  window.filterTables = function (estado) {
    CURRENT_FILTER = estado;
    // estilos del botón activo
    $all(".btn-modern").forEach((b) => b.classList.remove("active-filter"));
    const btn = document.querySelector(`button[onclick="filterTables('${estado}')"]`);
    if (btn) btn.classList.add("active-filter");
    renderMesas();
  };

  // ---------- FAB & Acciones rápidas ----------
  function wireFab() {
    // abrir/cerrar menú flotante
    ref.fabMain?.addEventListener("click", () => {
      const isHidden = ref.fabMenu?.classList.contains("hidden");
      ref.fabMenu?.classList.toggle("hidden", !isHidden ? true : false);
      // si estaba oculto -> mostrar
      if (isHidden) ref.fabMenu.classList.remove("hidden");
    });

    // Abrir "Agregar"
    ref.addBtn?.addEventListener("click", () => {
      ref.addNumero.value = "";
      ref.addCapacidad.value = "";
      ref.addMessage.textContent = "";
      showModal(ref.addModal);
    });

    // Abrir "Editar" (flujo por número)
    ref.editBtn?.addEventListener("click", () => {
      ref.upSearchNumero.value = "";
      ref.upMessage1.textContent = "";
      showModal(ref.upModal1);
    });

    // Abrir "Eliminar"
    ref.deleteBtn?.addEventListener("click", () => {
      ref.delNumero.value = "";
      ref.delMessage.textContent = "";
      showModal(ref.delModal);
    });
  }

  // ---------- Sidebar (abrir/cerrar) ----------
  function wireSidebar() {
    const open = () => {
      ref.sidebar?.classList.add("open");
      ref.mobileOverlay?.classList.add("show");
    };
    const close = () => {
      ref.sidebar?.classList.remove("open");
      ref.mobileOverlay?.classList.remove("show");
    };
    ref.sidebarToggle?.addEventListener("click", () => {
      if (ref.sidebar?.classList.contains("open")) close(); else open();
    });
    ref.sidebarToggleDesktop?.addEventListener("click", () => {
      if (ref.sidebar?.classList.contains("open")) close(); else open();
    });
    ref.mobileOverlay?.addEventListener("click", close);
  }

  // ---------- Modales utilitarios ----------
  function showModal(el) {
    if (!el) return;
    el.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function hideModal(el) {
    if (!el) return;
    el.classList.add("hidden");
    if (
      ref.addModal.classList.contains("hidden") &&
      ref.upModal1.classList.contains("hidden") &&
      ref.upModal2.classList.contains("hidden") &&
      ref.delModal.classList.contains("hidden")
    ) {
      document.body.style.overflow = "";
    }
  }
  function wireModalShortcuts() {
    // tecla ESC cierra el modal abierto
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        [ref.addModal, ref.upModal1, ref.upModal2, ref.delModal].forEach((m) => hideModal(m));
      }
    });
    // Cerrar al hacer click fuera del contenido (si tu CSS usa overlay)
    $all(".modal").forEach((modal) => {
      modal.addEventListener("mousedown", (e) => {
        if (e.target === modal) hideModal(modal);
      });
    });
  }

  // ---------- Funciones globales para botones del HTML ----------
  // ADD
  window.closeAdd = function () { hideModal(ref.addModal); };
  window.addMesa = async function () {
    const numero = toInt(ref.addNumero.value);
    const capacidad = toInt(ref.addCapacidad.value);

    if (!numero || numero < 1) {
      ref.addMessage.textContent = "Ingresa un número de mesa válido.";
      ref.addMessage.className = "text-center text-sm text-red-600";
      return;
    }
    if (!capacidad || capacidad < 1) {
      ref.addMessage.textContent = "Ingresa una capacidad válida.";
      ref.addMessage.className = "text-center text-sm text-red-600";
      return;
    }

    const resp = await createMesa({ NumMesa: numero, Capacidad: capacidad });
    if (!resp) {
      ref.addMessage.textContent = "No se pudo crear la mesa. Revisa el backend.";
      ref.addMessage.className = "text-center text-sm text-red-600";
      return;
    }
    ref.addMessage.textContent = "Mesa creada correctamente.";
    ref.addMessage.className = "text-center text-sm text-emerald-600";

    // actualizar UI
    await reloadMesas();
    hideModal(ref.addModal);
  };

  // UPDATE paso 1: buscar por número
  window.closeUpdate = function () {
    hideModal(ref.upModal1);
    hideModal(ref.upModal2);
    SELECTED_MESA_ID = null;
  };

  window.nextUpdate = async function () {
    const n = toInt(ref.upSearchNumero.value);
    if (!n) {
      ref.upMessage1.textContent = "Ingresa un número de mesa válido.";
      ref.upMessage1.className = "text-center text-sm text-red-600";
      return;
    }

    // asegurarse de tener la lista fresca
    if (!MESAS?.length) await reloadMesas();
    const mesa = findMesaByNumero(MESAS, n);
    if (!mesa) {
      ref.upMessage1.textContent = `No se encontró la mesa ${n}.`;
      ref.upMessage1.className = "text-center text-sm text-red-600";
      return;
    }

    SELECTED_MESA_ID = getMesaId(mesa);
    ref.upNumero.value = toInt(mesa?.NumMesa ?? mesa?.numMesa ?? n);
    ref.upCapacidad.value = toInt(mesa?.Capacidad ?? mesa?.capacidad ?? 1);
    ref.upMessage2.textContent = "";

    hideModal(ref.upModal1);
    showModal(ref.upModal2);
  };

  // UPDATE paso 2: confirmar cambios
  window.updateMesa = async function () {
    const id = SELECTED_MESA_ID;
    if (!id) {
      ref.upMessage2.textContent = "No hay mesa seleccionada.";
      ref.upMessage2.className = "text-center text-sm text-red-600";
      return;
    }

    const numero = toInt(ref.upNumero.value);
    const capacidad = toInt(ref.upCapacidad.value);

    if (!numero || numero < 1) {
      ref.upMessage2.textContent = "Número de mesa inválido.";
      ref.upMessage2.className = "text-center text-sm text-red-600";
      return;
    }
    if (!capacidad || capacidad < 1) {
      ref.upMessage2.textContent = "Capacidad inválida.";
      ref.upMessage2.className = "text-center text-sm text-red-600";
      return;
    }

    const resp = await svcUpdateMesa(id, { NumMesa: numero, Capacidad: capacidad });
    if (!resp) {
      ref.upMessage2.textContent = "No se pudo actualizar. Revisa el backend.";
      ref.upMessage2.className = "text-center text-sm text-red-600";
      return;
    }

    ref.upMessage2.textContent = "Mesa actualizada correctamente.";
    ref.upMessage2.className = "text-center text-sm text-emerald-600";

    await reloadMesas();
    hideModal(ref.upModal2);
  };

  // DELETE
  window.closeDelete = function () { hideModal(ref.delModal); };
  window.deleteMesa = async function () {
    const n = toInt(ref.delNumero.value);
    if (!n) {
      ref.delMessage.textContent = "Ingresa el número de mesa a eliminar.";
      ref.delMessage.className = "text-center text-sm text-red-600";
      return;
    }

    // buscar ID por número
    const mesa = findMesaByNumero(MESAS, n);
    if (!mesa) {
      ref.delMessage.textContent = `No se encontró la mesa ${n}.`;
      ref.delMessage.className = "text-center text-sm text-red-600";
      return;
    }

    const id = getMesaId(mesa);
    const ok = confirm(`¿Eliminar la mesa ${n} (ID ${id})?`);
    if (!ok) return;

    const resp = await svcDeleteMesa(id);
    if (!resp) {
      ref.delMessage.textContent = "No se pudo eliminar. Revisa el backend.";
      ref.delMessage.className = "text-center text-sm text-red-600";
      return;
    }

    ref.delMessage.textContent = "Mesa eliminada correctamente.";
    ref.delMessage.className = "text-center text-sm text-emerald-600";

    await reloadMesas();
    hideModal(ref.delModal);
  };
})();
