/* ==========================
   Ofertas: datos + lógica UI
   ========================== */

// Datos de ejemplo (puedes quitarlos si vienes de API)
let offers = [
  {
    id: 1,
    title: "Pizza Familiar 2x1",
    description: "Llévate dos pizzas familiares al precio de una. Solo los viernes.",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=500&q=80",
    startDate: "2025-07-21",
    endDate: "2025-07-28",
    discount: "50%"
  },
  {
    id: 2,
    title: "Hamburguesa con Papas Gratis",
    description: "Pide tu hamburguesa y recibe papas fritas gratis.",
    image: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=500&q=80",
    startDate: "2025-07-27",
    endDate: "2025-08-05",
    discount: "Incluye papas"
  },
  {
    id: 3,
    title: "Bebidas al 2x1",
    description: "Promoción en todas las bebidas de la casa. Solo en restaurante.",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=500&q=80",
    startDate: "2025-07-11",
    endDate: "2025-07-13",
    discount: "2x1"
  }
];

let editMode = false;
let editId = null;
let lastImg = "";

/* ---------- Helpers de DOM ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- Renderizado ---------- */
function renderOffers(filteredList = offers) {
  const container = $('#offersContainer');
  const emptyState = $('#emptyState');
  container.innerHTML = '';

  if (!filteredList.length) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filteredList.forEach(offer => {
    const status = getStatus(offer.startDate, offer.endDate);
    const statusColor = status === "Activo" ? "bg-green-500" : status === "Próximo" ? "bg-blue-500" : "bg-red-500";
    const card = document.createElement('div');
    card.className = 'card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 relative flex flex-col';
    card.innerHTML = `
      <div class="relative">
        <img src="${offer.image || 'https://via.placeholder.com/500x300?text=Oferta'}" alt="${offer.title}" class="w-full h-48 object-cover">
        <div class="absolute top-4 right-4 bg-white rounded-full px-3 py-1 shadow-md font-semibold text-indigo-700">
          ${offer.discount}
        </div>
      </div>
      <div class="p-6 flex flex-col flex-1">
        <div class="flex justify-between items-start mb-2">
          <h3 class="text-xl font-bold text-gray-800">${offer.title}</h3>
          <span class="text-xs px-2 py-1 rounded-full text-white ${statusColor}">
            ${status}
          </span>
        </div>
        <p class="text-gray-600 mb-4">${offer.description}</p>
        <div class="flex justify-between text-sm text-gray-500 mb-4">
          <div>
            <i class="fas fa-calendar-alt mr-1"></i>
            <span>Inicio: ${formatDate(offer.startDate)}</span>
          </div>
          <div>
            <i class="fas fa-calendar-times mr-1"></i>
            <span>Fin: ${formatDate(offer.endDate)}</span>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-auto">
          <button class="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm" data-edit="${offer.id}">
            <i class="fas fa-pen"></i> Editar
          </button>
          <button class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm" data-del="${offer.id}">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });

  // Delegación de eventos editar/eliminar
  container.onclick = (e) => {
    const editBtn = e.target.closest('[data-edit]');
    const delBtn = e.target.closest('[data-del]');
    if (editBtn) {
      const id = Number(editBtn.getAttribute('data-edit'));
      openOfferModal(id);
    }
    if (delBtn) {
      const id = Number(delBtn.getAttribute('data-del'));
      deleteOffer(id);
    }
  };
}

/* ---------- Estado y filtros ---------- */
function getStatus(start, end) {
  const hoy = new Date();
  const inicio = new Date(start + "T00:00:00");
  const fin = new Date(end + "T23:59:59");
  if (hoy < inicio) return "Próximo";
  if (hoy > fin) return "Vencido";
  return "Activo";
}

function filterOffers() {
  const search = $('#searchInput').value.toLowerCase();
  const status = $('#statusFilter').value;

  let filtered = offers.filter(o =>
    (o.title.toLowerCase().includes(search) || o.description.toLowerCase().includes(search))
  );

  if (status !== "all") {
    filtered = filtered.filter(o => {
      const s = getStatus(o.startDate, o.endDate);
      if (status === 'active') return s === "Activo";
      if (status === 'upcoming') return s === "Próximo";
      if (status === 'expired') return s === "Vencido";
      return true;
    });
  }
  renderOffers(filtered);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ---------- Modal ---------- */
function openOfferModal(id = null) {
  clearOfferModal();
  editMode = false;
  editId = null;
  lastImg = "";

  $('#modal-title').innerText = id ? "Editar Oferta" : "Agregar Oferta";

  if (id) {
    editMode = true;
    editId = id;
    const o = offers.find(x => x.id === id);
    if (o) {
      $('#offer-title').value = o.title;
      $('#offer-description').value = o.description;
      $('#offer-discount').value = o.discount;
      $('#offer-start').value = o.startDate;
      $('#offer-end').value = o.endDate;
      $('#img-preview').innerHTML = `<img src="${o.image}" class="w-full h-28 object-cover rounded mb-2">`;
      lastImg = o.image;
    }
  } else {
    $('#img-preview').innerHTML = '';
  }

  // Mostrar modal y bloquear scroll del body
  $('#offer-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Foco sin hacer scroll brusco
  $('#offer-title')?.focus({ preventScroll: true });
}

function closeOfferModal() {
  $('#offer-modal').classList.add('hidden');
  document.body.style.overflow = '';
  clearOfferModal();
}

function clearOfferModal() {
  $('#offerForm').reset();
  $('#img-preview').innerHTML = '';
  lastImg = "";
  $$('.error-text').forEach(e => e.innerText = '');
  $$('#offerForm input, #offerForm textarea').forEach(f => f.classList.remove('invalid'));
}

/* ---------- Imagen ---------- */
function previewImg(e) {
  const file = e.target.files[0];
  const prev = $('#img-preview');
  if (!file) { prev.innerHTML = ""; lastImg = ""; return; }
  const reader = new FileReader();
  reader.onload = x => {
    prev.innerHTML = `<img src="${x.target.result}" class="w-full h-28 object-cover rounded mb-2">`;
    lastImg = x.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Guardar ---------- */
async function saveOffer(e) {
  // Evitar saltos/reload
  if (e && typeof e.preventDefault === 'function') e.preventDefault();

  const title = $('#offer-title');
  const description = $('#offer-description');
  const discount = $('#offer-discount');
  const start = $('#offer-start');
  const end = $('#offer-end');
  const imgInput = $('#offer-image');

  let valid = true;

  if (!title.value.trim() || title.value.trim().length < 5) {
    title.classList.add('invalid');
    $('#offer-title-err').innerText = "El título debe tener al menos 5 caracteres.";
    valid = false;
  } else {
    title.classList.remove('invalid');
    $('#offer-title-err').innerText = "";
  }

  if (!description.value.trim() || description.value.trim().length < 10) {
    description.classList.add('invalid');
    $('#offer-description-err').innerText = "La descripción debe tener al menos 10 caracteres.";
    valid = false;
  } else {
    description.classList.remove('invalid');
    $('#offer-description-err').innerText = "";
  }

  if (!discount.value.trim() || discount.value.trim().length < 2) {
    discount.classList.add('invalid');
    $('#offer-discount-err').innerText = "Ingresa una promoción válida (ej: 2x1, 20% dcto, etc).";
    valid = false;
  } else {
    discount.classList.remove('invalid');
    $('#offer-discount-err').innerText = "";
  }

  const todayStr = new Date().toISOString().split('T')[0];

  if (!start.value) {
    start.classList.add('invalid');
    $('#offer-start-err').innerText = "La fecha de inicio es requerida.";
    valid = false;
  } else if (start.value <= todayStr) {
    start.classList.add('invalid');
    $('#offer-start-err').innerText = "La fecha de inicio debe ser después de hoy.";
    valid = false;
  } else {
    start.classList.remove('invalid');
    $('#offer-start-err').innerText = "";
  }

  if (!end.value) {
    end.classList.add('invalid');
    $('#offer-end-err').innerText = "La fecha de fin es requerida.";
    valid = false;
  } else if (end.value <= start.value) {
    end.classList.add('invalid');
    $('#offer-end-err').innerText = "La fecha de fin debe ser posterior a la de inicio.";
    valid = false;
  } else {
    const startD = new Date(start.value);
    const endD = new Date(end.value);
    if (endD > new Date(startD.getTime() + (365 * 24 * 60 * 60 * 1000))) {
      end.classList.add('invalid');
      $('#offer-end-err').innerText = "La fecha de fin no puede ser más de un año después de la de inicio.";
      valid = false;
    } else {
      end.classList.remove('invalid');
      $('#offer-end-err').innerText = "";
    }
  }

  let imgData = lastImg;
  if (!editMode && (!imgInput.files[0] && !imgData)) {
    imgInput.classList.add('invalid');
    $('#offer-image-err').innerText = "Selecciona una imagen.";
    valid = false;
  } else {
    imgInput.classList.remove('invalid');
    $('#offer-image-err').innerText = "";
    if (imgInput.files[0]) {
      imgData = await fileToBase64(imgInput.files[0]);
    }
  }

  if (!valid) return;

  if (editMode) {
    const idx = offers.findIndex(o => o.id === editId);
    if (idx !== -1) {
      offers[idx] = {
        ...offers[idx],
        title: title.value.trim(),
        description: description.value.trim(),
        discount: discount.value.trim(),
        startDate: start.value,
        endDate: end.value,
        image: imgData
      };
    }
  } else {
    const newId = offers.length ? Math.max(...offers.map(o => o.id)) + 1 : 1;
    offers.push({
      id: newId,
      title: title.value.trim(),
      description: description.value.trim(),
      discount: discount.value.trim(),
      startDate: start.value,
      endDate: end.value,
      image: imgData
    });
  }

  closeOfferModal();
  renderOffers(offers);
  filterOffers();
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function deleteOffer(id) {
  if (window.confirm("¿Seguro que deseas eliminar esta oferta?")) {
    offers = offers.filter(o => o.id !== id);
    renderOffers(offers);
    filterOffers();
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', () => {
  renderOffers(offers);

  $('#searchInput').addEventListener('input', filterOffers);
  $('#statusFilter').addEventListener('change', filterOffers);
  $('#fab').onclick = () => openOfferModal();

  // Evitar que el form "salte" o recargue
  const form = $('#offerForm');
  form.addEventListener('submit', (e) => saveOffer(e));
  form.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault(); // evita submit por Enter en inputs
    }
  });

  $('#offer-image').addEventListener('change', previewImg);

  // ✅ Botón Cancelar funcionando
  $('#offer-cancel-btn').addEventListener('click', () => closeOfferModal());

  // Cerrar modal con tecla ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#offer-modal').classList.contains('hidden')) {
      closeOfferModal();
    }
  });

  // Cerrar modal si clic fuera del contenido
  $('#offer-modal').addEventListener('click', (e) => {
    if (e.target.id === 'offer-modal') closeOfferModal();
  });
});
