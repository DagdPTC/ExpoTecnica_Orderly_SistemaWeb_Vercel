import {
  getMesas,
  createMesa,
  updateMesa as updateMesaApi,
  deleteMesa as deleteMesaApi,
  patchEstadoMesa
} from "../services/mesaService.js";

const STATE_BY_ID = {
  1:  { id: 1,  key: "libre",     label: "Disponible", classes: "bg-emerald-100 text-emerald-600" },
  3:  { id: 3,  key: "ocupada",   label: "Ocupada",    classes: "bg-red-100 text-red-600" },
  2:  { id: 2,  key: "reservada", label: "Reservada",  classes: "bg-blue-100 text-blue-600" },
  21: { id: 21, key: "limpieza",  label: "Limpieza",   classes: "bg-amber-100 text-amber-600" },
};
const NEXT_ID = { 1: 3, 3: 2, 2: 21, 21: 1 };
const VALID_IDS = new Set([1, 2, 3, 21]);

const toInt = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
function extractNumberFromName(name){ const m = String(name||"").match(/(\d+)/); return m ? parseInt(m[1],10) : 0; }
function resolveMesaNumber(dto){
  const n2 = extractNumberFromName(dto.NomMesa ?? dto.nomMesa);
  if (n2 > 0) return n2;
  const id = toInt(dto.Id ?? dto.id ?? dto.idMesa);
  return id > 0 ? id : 1;
}
function stateFromId(id){ return STATE_BY_ID[id] ?? STATE_BY_ID[1]; }
function getTypeByNumber(n){ if(n>=1&&n<=4) return "dos"; if(n>=5&&n<=8) return "cuatro"; return "familiar"; }
function typeLabel(t){ return t==="dos" ? "2 personas" : (t==="cuatro" ? "4 personas" : "Familiar"); }

const mesasCache = new Map();
let currentFilter = "all";

let grid, emptyState;
let countLibre, countOcupada, countReservada, countLimpieza;

document.addEventListener("DOMContentLoaded", () => {
  grid = document.getElementById("mesas-container");
  emptyState = document.getElementById("empty-state");
  countLibre = document.getElementById("count-libre");
  countOcupada = document.getElementById("count-ocupada");
  countReservada = document.getElementById("count-reservada");
  countLimpieza = document.getElementById("count-limpieza");

  setupSidebar();
  setupFAB();
  setupModals();
  setupAnimations();

  cargarMesas();

  window.filterTables   = filterTables;
  window.addMesa        = addMesa;
  window.closeAdd       = () => hideModal('add-modal');
  window.nextUpdate     = nextUpdate;
  window.updateMesa     = updateMesaUI;
  window.closeUpdate    = () => { hideModal('update-modal-step1'); hideModal('update-modal-step2'); };
  window.deleteMesa     = deleteMesaUI;
  window.closeDelete    = () => hideModal('delete-modal');
  window.cambiarEstadoMesa = cambiarEstadoMesa;
});

async function cargarMesas() {
  if (grid) grid.innerHTML = `<div class="col-span-full text-center py-6 text-slate-500">Cargando mesas...</div>`;
  try {
    const page = await getMesas(0, 50);
    const mesas = Array.isArray(page) ? page : (page?.content || []);
    mesasCache.clear();
    mesas.forEach(m => {
      const id = m.Id ?? m.id ?? m.idMesa;
      if (id != null) mesasCache.set(String(id), m);
    });
    renderMesas(currentFilter);
  } catch (e) {
    console.error(e);
    if (grid) grid.innerHTML = `<div class="col-span-full text-center py-6 text-red-600">Error cargando mesas.</div>`;
  }
}

function filterTables(status) {
  document.querySelectorAll('.btn-modern').forEach(btn => {
    btn.classList.remove('active-filter', 'ring-4', 'ring-opacity-50');
  });
  if (window.event?.target) {
    window.event.target.classList.add('active-filter', 'ring-4', 'ring-opacity-50');
  }
  currentFilter = status;
  renderMesas(status);
}

function renderMesas(filter = 'all') {
  if (!grid) return;
  grid.innerHTML = "";

  const all = Array.from(mesasCache.values());
  const filtered = all.filter(dto => {
    if (filter === 'all') return true;
    const stId = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa);
    const key = stateFromId(VALID_IDS.has(stId) ? stId : 1).key;
    return key === filter;
  });

  if (filtered.length === 0) {
    emptyState?.classList.remove('hidden');
  } else {
    emptyState?.classList.add('hidden');
  }

  filtered.forEach((dto, idx) => grid.appendChild(createMesaCard(dto, idx)));
  updateCounters(all);
}

function updateCounters(allDtos) {
  const counts = { libre: 0, ocupada: 0, reservada: 0, limpieza: 0 };
  allDtos.forEach(dto => {
    const stId = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa);
    const st = stateFromId(VALID_IDS.has(stId) ? stId : 1).key;
    counts[st] = (counts[st] || 0) + 1;
  });
  animateCounter(countLibre, counts.libre);
  animateCounter(countOcupada, counts.ocupada);
  animateCounter(countReservada, counts.reservada);
  animateCounter(countLimpieza, counts.limpieza);
}

function animateCounter(el, val) {
  if (!el) return;
  el.style.transform = 'scale(1.2)';
  setTimeout(() => {
    el.textContent = String(val);
    el.style.transform = 'scale(1)';
  }, 150);
}

function createMesaCard(dto, index) {
  const id = dto.Id ?? dto.id ?? dto.idMesa;
  const number = resolveMesaNumber(dto);
  const type   = getTypeByNumber(number);
  const stId   = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa);
  const st     = stateFromId(VALID_IDS.has(stId) ? stId : 1);

  const card = document.createElement('div');
  card.className = `mesa-card mesa-${st.key} bg-white rounded-2xl shadow-lg p-6 border border-slate-100 animate-fade-in`;
  card.style.animationDelay = `${index * 0.1}s`;

  card.dataset.mesaId   = String(id);
  card.dataset.mesaNum  = String(number);
  card.dataset.estadoId = String(st.id);
  card.dataset.busy     = "0";

  card.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-2xl font-bold text-slate-800">Mesa ${number}</h3>
        <p class="text-slate-500 text-sm">ID: ${id}</p>
      </div>
      <div class="w-14 h-14 ${st.classes.replace('text-','bg-').replace('100','200')} rounded-xl flex items-center justify-center">
        <span class="text-xl ${st.classes.split(' ').find(c=>c.startsWith('text-'))}">${st.label[0]}</span>
      </div>
    </div>

    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Estado</span>
        <div class="flex items-center">
          <div class="w-3 h-3 ${st.classes.split(' ').find(c=>c.startsWith('text-'))?.replace('text-','bg-') || 'bg-emerald-500'} rounded-full mr-2"></div>
          <span class="font-semibold ${st.classes.split(' ').find(c=>c.startsWith('text-'))}">${st.label}</span>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Tipo</span>
        <div class="flex items-center">
          <i class="fas fa-users text-slate-400 mr-2"></i>
          <span class="text-slate-800 font-semibold">${typeLabel(type)}</span>
        </div>
      </div>
    </div>

    <div class="mt-6 pt-4 border-t border-slate-100">
      <div class="flex justify-center">
        <button class="btn-modern px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800 cambiar-estado">
          <i class="fas fa-sync-alt mr-2"></i>
          Cambiar Estado
        </button>
      </div>
    </div>
  `;

  card.querySelector(".cambiar-estado").addEventListener("click", () => cambiarEstadoMesa(id));
  return card;
}

function applyCardState(card, state) {
  const number = card.dataset.mesaNum;
  card.className = `mesa-card mesa-${state.key} bg-white rounded-2xl shadow-lg p-6 border border-slate-100`;
  card.dataset.estadoId = String(state.id);
  card.innerHTML = `
    <div class="flex items-center justify-between mb-6">
      <div>
        <h3 class="text-2xl font-bold text-slate-800">Mesa ${number}</h3>
        <p class="text-slate-500 text-sm">ID: ${card.dataset.mesaId}</p>
      </div>
      <div class="w-14 h-14 ${state.classes.replace('text-','bg-').replace('100','200')} rounded-xl flex items-center justify-center">
        <span class="text-xl ${state.classes.split(' ').find(c=>c.startsWith('text-'))}">${state.label[0]}</span>
      </div>
    </div>
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Estado</span>
        <div class="flex items-center">
          <div class="w-3 h-3 ${state.classes.split(' ').find(c=>c.startsWith('text-'))?.replace('text-','bg-') || 'bg-emerald-500'} rounded-full mr-2"></div>
          <span class="font-semibold ${state.classes.split(' ').find(c=>c.startsWith('text-'))}">${state.label}</span>
        </div>
      </div>
      <div class="flex items-center justify-between">
        <span class="text-slate-600 font-medium">Tipo</span>
        <div class="flex items-center">
          <i class="fas fa-users text-slate-400 mr-2"></i>
          <span class="text-slate-800 font-semibold">${typeLabel(getTypeByNumber(Number(number)))}</span>
        </div>
      </div>
    </div>
    <div class="mt-6 pt-4 border-t border-slate-100">
      <div class="flex justify-center">
        <button class="btn-modern px-6 py-2 bg-gradient-to-r from-slate-600 to-slate-700 text-white rounded-lg text-sm font-medium hover:from-slate-700 hover:to-slate-800 cambiar-estado">
          <i class="fas fa-sync-alt mr-2"></i>
          Cambiar Estado
        </button>
      </div>
    </div>
  `;
  card.querySelector(".cambiar-estado").addEventListener("click", () => cambiarEstadoMesa(card.dataset.mesaId));
}

async function cambiarEstadoMesa(mesaId) {
  const card = grid?.querySelector(`[data-mesa-id="${mesaId}"]`);
  if (!card || card.dataset.busy === "1") return;
  card.dataset.busy = "1";

  const dto = mesasCache.get(String(mesaId));
  if (!dto) { card.dataset.busy = "0"; return; }

  const beforeId = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa) || 1;
  const nextId   = NEXT_ID[VALID_IDS.has(beforeId) ? beforeId : 1];
  const nextSt   = stateFromId(nextId);

  applyCardState(card, nextSt);

  try {
    const body = {
      NomMesa: dto.NomMesa ?? dto.nomMesa ?? `Mesa ${resolveMesaNumber(dto)}`,
      IdTipoMesa: toInt(dto.IdTipoMesa ?? dto.idTipoMesa) || 1,
      IdEstadoMesa: nextId,
    };
    const resp = await patchEstadoMesa(mesaId, body);
    const real = resp || {};
    const realId = toInt(real.IdEstadoMesa ?? real.idEstadoMesa) || nextId;
    dto.IdEstadoMesa = realId;
    mesasCache.set(String(mesaId), { ...dto, ...real });
    applyCardState(card, stateFromId(realId));
  } catch (err) {
    console.error("Cambio de estado falló:", err);
    applyCardState(card, stateFromId(beforeId));
  } finally {
    card.dataset.busy = "0";
    renderMesas(currentFilter);
  }
}

async function addMesa() {
  const numero = parseInt(document.getElementById('add-numero').value, 10);
  const capacidad = parseInt(document.getElementById('add-capacidad').value, 10);
  const msg = document.getElementById('add-message');

  if (!Number.isFinite(numero) || numero < 1 || numero > 99) return showMessage(msg, 'El número de mesa debe ser entre 1 y 99', 'error');
  if (!Number.isFinite(capacidad) || capacidad < 1 || capacidad > 20) return showMessage(msg, 'La capacidad debe ser entre 1 y 20 personas', 'error');

  const body = {
    NomMesa: `Mesa ${numero}`,
    IdTipoMesa: (numero <= 4 ? 1 : (numero <= 8 ? 2 : 3)),
    IdEstadoMesa: 1,
  };

  try {
    const resp = await createMesa(body);
    if (!resp) return showMessage(msg, 'No se pudo crear la mesa', 'error');
    showMessage(msg, '¡Mesa creada exitosamente!', 'success');
    setTimeout(() => {
      hideModal('add-modal');
      document.getElementById('add-numero').value = '';
      document.getElementById('add-capacidad').value = '';
      cargarMesas();
    }, 900);
  } catch (e) {
    console.error(e);
    showMessage(msg, 'Error al crear la mesa', 'error');
  }
}

function nextUpdate() {
  const numero = parseInt(document.getElementById('update-search-numero').value, 10);
  const msg1 = document.getElementById('update-message-step1');
  const msg2 = document.getElementById('update-message-step2');

  if (!Number.isFinite(numero)) return showMessage(msg1, 'Ingresa un número válido', 'error');

  const pair = Array.from(mesasCache.entries()).find(([,dto]) => resolveMesaNumber(dto) === numero);
  if (!pair) return showMessage(msg1, 'No se encontró ninguna mesa con ese número', 'error');

  const [, dto] = pair;
  const estadoId = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa);
  if (estadoId !== 1) return showMessage(msg1, 'Solo se pueden editar mesas disponibles', 'warning');

  document.getElementById('update-numero').value = numero;
  document.getElementById('update-capacidad').value = 4;
  msg1.textContent = ""; msg2.textContent = "";

  hideModal('update-modal-step1');
  setTimeout(()=> showModal('update-modal-step2'), 300);
}

async function updateMesaUI() {
  const num = parseInt(document.getElementById('update-numero').value, 10);
  const cap = parseInt(document.getElementById('update-capacidad').value, 10);
  const msg = document.getElementById('update-message-step2');

  if (!Number.isFinite(num) || num < 1 || num > 99) return showMessage(msg, 'El número debe ser entre 1 y 99', 'error');
  if (!Number.isFinite(cap) || cap < 1 || cap > 20) return showMessage(msg, 'La capacidad debe ser entre 1 y 20', 'error');

  const pair = Array.from(mesasCache.entries()).find(([,dto]) => resolveMesaNumber(dto) === num);
  if (!pair) return showMessage(msg, 'No se encontró la mesa', 'error');

  const [idStr, dto] = pair;
  const body = {
    NomMesa: `Mesa ${num}`,
    IdTipoMesa: (num <= 4 ? 1 : (num <= 8 ? 2 : 3)),
    IdEstadoMesa: toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa) || 1,
  };

  try {
    const resp = await updateMesaApi(idStr, body);
    if (!resp) return showMessage(msg, 'No se pudo actualizar', 'error');
    showMessage(msg, '¡Mesa actualizada correctamente!', 'success');
    setTimeout(() => { hideModal('update-modal-step2'); cargarMesas(); }, 900);
  } catch (e) {
    console.error(e);
    showMessage(msg, 'Error al actualizar la mesa', 'error');
  }
}

async function deleteMesaUI() {
  const numero = parseInt(document.getElementById('delete-numero').value, 10);
  const msg = document.getElementById('delete-message');

  if (!Number.isFinite(numero)) return showMessage(msg, 'Ingresa un número válido', 'error');

  const pair = Array.from(mesasCache.entries()).find(([,dto]) => resolveMesaNumber(dto) === numero);
  if (!pair) return showMessage(msg, 'No se encontró la mesa', 'error');

  const [idStr, dto] = pair;
  const estadoId = toInt(dto.IdEstadoMesa ?? dto.idEstadoMesa);
  if (estadoId !== 1) return showMessage(msg, 'Solo se pueden eliminar mesas disponibles', 'warning');

  try {
    const ok = await deleteMesaApi(idStr);
    if (!ok) return showMessage(msg, 'No se pudo eliminar', 'error');
    showMessage(msg, '¡Mesa eliminada correctamente!', 'success');
    setTimeout(() => { hideModal('delete-modal'); cargarMesas(); }, 900);
  } catch (e) {
    console.error(e);
    showMessage(msg, 'Error al eliminar la mesa', 'error');
  }
}

function showMessage(element, message, type = 'info') {
  if (!element) return;
  const classes = {
    success: 'text-emerald-600 bg-emerald-50 border border-emerald-200',
    error:   'text-red-600 bg-red-50 border border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200 border',
    info:    'text-blue-600 bg-blue-50 border-blue-200 border'
  }[type] || 'text-blue-600 bg-blue-50 border-blue-200 border';
  element.textContent = message;
  element.className = `text-center text-sm p-3 rounded-lg ${classes}`;
}

function setupFAB() {
  const fabMain = document.getElementById('fab-main');
  const fabMenu = document.getElementById('fab-menu');
  const addBtn = document.getElementById('add-btn');
  const editBtn = document.getElementById('edit-btn');
  const deleteBtn = document.getElementById('delete-btn');
  if (!fabMain) return;

  fabMain.addEventListener('click', function() {
    fabMenu.classList.toggle('hidden');
    const icon = fabMain.querySelector('i');
    if (fabMenu.classList.contains('hidden')) { icon.classList.remove('fa-times'); icon.classList.add('fa-plus'); }
    else { icon.classList.remove('fa-plus'); icon.classList.add('fa-times'); }
  });

  addBtn?.addEventListener('click', function() { showModal('add-modal'); closeFABMenu(); });
  editBtn?.addEventListener('click', function() { showModal('update-modal-step1'); closeFABMenu(); });
  deleteBtn?.addEventListener('click', function() { showModal('delete-modal'); closeFABMenu(); });

  function closeFABMenu() {
    fabMenu.classList.add('hidden');
    const icon = fabMain.querySelector('i');
    icon.classList.remove('fa-times'); icon.classList.add('fa-plus');
  }
}

function setupModals() {
  document.addEventListener('click', function(e) { if (e.target.classList?.contains('modal')) hideModal(e.target.id); });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape') hideAllModals(); });
}
function showModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden'); modal.classList.add('show');
  setTimeout(() => {
    const mc = modal.querySelector('.modal-content');
    if (mc) { mc.style.transform='scale(1)'; mc.style.opacity='1'; }
  }, 10);
}
function hideModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  const mc = modal.querySelector('.modal-content');
  if (mc) { mc.style.transform='scale(0.9)'; mc.style.opacity='0'; }
  setTimeout(() => { modal.classList.add('hidden'); modal.classList.remove('show'); }, 300);
}
function hideAllModals() { ['add-modal','update-modal-step1','update-modal-step2','delete-modal'].forEach(hideModal); }

function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebarToggleDesktop = document.getElementById('sidebarToggleDesktop');
  const mobileOverlay = document.getElementById('mobileOverlay');

  sidebarToggle?.addEventListener('click', function() {
    sidebar?.classList.toggle('mobile-open');
    mobileOverlay?.classList.toggle('active');
  });
  sidebarToggleDesktop?.addEventListener('click', function() {
    sidebar?.classList.toggle('collapsed');
  });
  mobileOverlay?.addEventListener('click', function() {
    sidebar?.classList.remove('mobile-open');
    mobileOverlay?.classList.remove('active');
  });
  window.addEventListener('resize', function() {
    if (window.innerWidth >= 1024) {
      sidebar?.classList.remove('mobile-open');
      mobileOverlay?.classList.remove('active');
    }
  });
}

function setupAnimations() {
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const observer = new IntersectionObserver((entries)=>{
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.style.opacity = '1'; entry.target.style.transform = 'translateY(0)'; } });
  }, observerOptions);

  document.querySelectorAll('.animate-fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
    observer.observe(el);
  });
}
