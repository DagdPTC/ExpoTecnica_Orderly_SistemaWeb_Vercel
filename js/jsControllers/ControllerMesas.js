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
  const $ = (s, el = document) => el.querySelector(s);

  let MESAS = [];
  let CURRENT_FILTER = "all";

  const ref = {
    counters: {
      libre: $("#count-libre"),
      ocupada: $("#count-ocupada"),
      reservada: $("#count-reservada"),
      limpieza: $("#count-limpieza"),
    },
    container: $("#mesas-container"),
    empty: $("#empty-state"),
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    await reloadMesas();
    exposeGlobals(); // funciones globales para onclick
  }

  async function reloadMesas() {
    const res = await getMesas();
    MESAS = res?.content || res || [];
    renderMesas();
  }

  function renderMesas() {
    ref.container.innerHTML = "";
    let visibles = 0;

    // contadores
    const counts = { libre: 0, ocupada: 0, reservada: 0, limpieza: 0 };

    MESAS.forEach((mesa) => {
      const estado = getEstadoMesa(mesa);
      counts[estado.key]++;

      if (CURRENT_FILTER !== "all" && CURRENT_FILTER !== estado.key) return;

      visibles++;

      const card = document.createElement("div");
      card.className =
        "mesa-card p-6 rounded-xl shadow hover:shadow-lg transition-all hover-lift bg-white border border-slate-200 flex flex-col";

      card.innerHTML = `
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-slate-800">Mesa ${mesa.NumMesa ?? mesa.numMesa ?? "?"}</h3>
          <span class="px-3 py-1 text-sm rounded-full font-medium ${estadoBadgeClass(
            estado.key
          )}">
            ${estado.label}
          </span>
        </div>
        <p class="text-slate-600 mb-2">Capacidad: ${mesa.Capacidad ?? mesa.capacidad ?? "-"}</p>
        <p class="text-slate-500 text-sm">ID: ${getMesaId(mesa) ?? "-"}</p>
        <div class="mt-4 flex space-x-2">
          <button class="flex-1 py-2 px-3 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition"
            onclick="openUpdate(${getMesaId(mesa)})">
            Editar
          </button>
          <button class="flex-1 py-2 px-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            onclick="confirmDelete(${getMesaId(mesa)})">
            Eliminar
          </button>
        </div>
      `;
      ref.container.appendChild(card);
    });

    // actualizar contadores
    ref.counters.libre.textContent = counts.libre;
    ref.counters.ocupada.textContent = counts.ocupada;
    ref.counters.reservada.textContent = counts.reservada;
    ref.counters.limpieza.textContent = counts.limpieza;

    ref.empty.classList.toggle("hidden", visibles > 0);
  }

  function estadoBadgeClass(key) {
    switch (key) {
      case "libre":
        return "bg-emerald-100 text-emerald-700";
      case "ocupada":
        return "bg-red-100 text-red-700";
      case "reservada":
        return "bg-blue-100 text-blue-700";
      case "limpieza":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  }

  // ---- Filtros ----
  window.filterTables = function (estado) {
    CURRENT_FILTER = estado;
    renderMesas();
    document
      .querySelectorAll(".btn-modern")
      .forEach((btn) => btn.classList.remove("active-filter"));
    const btn = document.querySelector(
      `button[onclick="filterTables('${estado}')"]`
    );
    if (btn) btn.classList.add("active-filter");
  };

  // ---- Acciones (placeholders: conecta con tus modales) ----
  window.openUpdate = function (id) {
    alert("Abrir modal para editar mesa ID " + id);
  };

  window.confirmDelete = async function (id) {
    if (confirm("¿Eliminar mesa ID " + id + "?")) {
      await svcDeleteMesa(id);
      await reloadMesas();
    }
  };

  function exposeGlobals() {
    window.addMesa = async function () {
      const numero = prompt("Número de mesa:");
      const capacidad = prompt("Capacidad:");
      if (!numero || !capacidad) return;
      await createMesa({ NumMesa: numero, Capacidad: capacidad });
      await reloadMesas();
    };
  }
})();
