// ===== Datos simulados =====
let historial = [
  {
    id: "H001",
    pedido: "P1001",
    cliente: "Roberto Sánchez",
    mesero: "Carlos López",
    mesa: "5",
    fecha: "2023-06-15",
    reserva: true,
    factura: "FAC-2023-1001",
    estado: "Entregado",
    productos: [
      { nombre: "Pizza Margarita", cantidad: 2, precioUnit: 12.00 },
      { nombre: "Ensalada César", cantidad: 1, precioUnit: 12.00 },
      { nombre: "Refresco", cantidad: 3, precioUnit: 3.00 }
    ],
    descuento: 0
  },
  {
    id: "H002",
    pedido: "P1002",
    cliente: "Laura Méndez",
    mesero: "María García",
    mesa: "8",
    fecha: "2023-06-15",
    reserva: false,
    factura: "",
    estado: "En proceso",
    productos: [
      { nombre: "Sopa del día", cantidad: 1, precioUnit: 8.00 },
      { nombre: "Pasta Carbonara", cantidad: 1, precioUnit: 15.00 },
      { nombre: "Agua mineral", cantidad: 2, precioUnit: 3.00 }
    ],
    descuento: 0
  },
  {
    id: "H003",
    pedido: "P1003",
    cliente: "Carlos Ruiz",
    mesero: "Carlos López",
    mesa: "3",
    fecha: "2023-06-14",
    reserva: true,
    factura: "",
    estado: "Cancelado",
    productos: [
      { nombre: "Hamburguesa", cantidad: 1, precioUnit: 10.00 },
      { nombre: "Papas fritas", cantidad: 1, precioUnit: 5.00 },
      { nombre: "Cerveza", cantidad: 2, precioUnit: 6.00 }
    ],
    descuento: 0
  },
  {
    id: "H004",
    pedido: "P1004",
    cliente: "Sofía Vargas",
    mesero: "Ana Martínez",
    mesa: "12",
    fecha: "2023-06-13",
    reserva: true,
    factura: "FAC-2023-1004",
    estado: "Entregado",
    productos: [
      { nombre: "Ensalada griega", cantidad: 1, precioUnit: 11.00 },
      { nombre: "Filete de salmón", cantidad: 1, precioUnit: 22.00 },
      { nombre: "Vino tinto", cantidad: 1, precioUnit: 15.00 },
      { nombre: "Tarta de manzana", cantidad: 1, precioUnit: 8.00 }
    ],
    descuento: 0
  }
];
const meseros = ["Juan Pérez","María García","Carlos López","Ana Martínez"];
const mesas   = ["1","2","3","4","5","6","7","8","9","10","11","12"];
let editIdx = null;

// Renderizar tabla
function renderHistorial() {
  const tbody = document.getElementById("historial-tbody");
  tbody.innerHTML = "";
  historial.forEach((h,i)=>{
    const estadoColor = h.estado==="Entregado"
      ? "bg-green-100 text-green-800"
      : h.estado==="Cancelado"
        ? "bg-red-100 text-red-800"
        : "bg-yellow-100 text-yellow-800";
    const reservaCheckbox = h.reserva
      ? `<input type="checkbox" checked disabled>`
      : `<input type="checkbox" disabled>`;
    const facturaTxt = h.factura
      ? `<span class="font-medium">${h.factura}</span>`
      : `<span class="font-medium text-red-600">No generada</span>`;

    tbody.innerHTML += `
      <tr class="hover:bg-gray-50 transition-colors">
        <td class="px-6 py-4">${h.id}</td>
        <td class="px-6 py-4">${h.pedido}</td>
        <td class="px-6 py-4">${h.cliente}</td>
        <td class="px-6 py-4">${h.mesero}</td>
        <td class="px-6 py-4">${h.mesa}</td>
        <td class="px-6 py-4">${h.fecha}</td>
        <td class="px-6 py-4">${reservaCheckbox}</td>
        <td class="px-6 py-4">
          <span class="px-2 inline-flex text-xs font-semibold rounded-full ${estadoColor}">${h.estado}</span>
        </td>
        <td class="px-6 py-4 text-blue-600 cursor-pointer toggle-details" data-target="details-${i}">
          Detalles <i class="fas fa-chevron-down ml-2 text-xs"></i>
        </td>
        <td class="px-6 py-4">
          <button class="edit-btn" data-idx="${i}" title="Editar">
            <i class="fas fa-edit text-green-500"></i>
          </button>
          <button class="delete-btn ml-3" data-idx="${i}" title="Eliminar">
            <i class="fas fa-trash text-red-500"></i>
          </button>
        </td>
      </tr>
      <tr>
        <td colspan="10" class="p-0">
          <div id="details-${i}" class="order-details bg-gray-50">
            <div class="p-6">
              <h4 class="font-medium mb-2">Productos:</h4>
              <div class="grid grid-cols-4 gap-4 font-medium text-sm text-gray-500 mb-2">
                <div>Producto</div><div class="text-right">Cant.</div><div class="text-right">P.Unit</div><div class="text-right">Total</div>
              </div>
              ${h.productos.map(p=>`
                <div class="grid grid-cols-4 gap-4 text-sm mb-1">
                  <div>${p.nombre}</div>
                  <div class="text-right">${p.cantidad}</div>
                  <div class="text-right">$${p.precioUnit.toFixed(2)}</div>
                  <div class="text-right">$${(p.cantidad*p.precioUnit).toFixed(2)}</div>
                </div>
              `).join("")}
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div><span class="text-sm text-gray-500">Subtotal:</span><span class="block font-medium">$${getSubtotal(h).toFixed(2)}</span></div>
                <div><span class="text-sm text-gray-500">Propina:</span><span class="block font-medium">$${getPropina(h).toFixed(2)}</span></div>
                <div><span class="text-sm text-gray-500">Descuento:</span><span class="block font-medium">-$${getDescuento(h).toFixed(2)}</span></div>
                <div><span class="text-sm text-gray-500">Total:</span><span class="block font-medium text-blue-600">$${getTotal(h).toFixed(2)}</span></div>
              </div>
              <div class="mt-4 pt-4 border-t"><span class="text-sm text-gray-500">Factura:</span> ${facturaTxt}</div>
            </div>
          </div>
        </td>
      </tr>
    `;
  });
  attachTableEvents();
}

// Búsqueda
document.getElementById('searchInput').addEventListener('input', ()=> {
  const term = document.getElementById('searchInput').value.toLowerCase();
  document.querySelectorAll('#historial-tbody tr').forEach((row,idx)=>{
    if(idx % 2 === 0){
      const visible = row.textContent.toLowerCase().includes(term);
      row.style.display = visible ? '' : 'none';
      const det = row.nextElementSibling;
      if(det) det.style.display = visible ? '' : 'none';
    }
  });
});

// Filtros
function applyFilters(){
  const w = document.getElementById('waiterFilter').value.toLowerCase();
  const d = document.getElementById('dateFilter').value;
  const s = document.getElementById('statusFilter').value.toLowerCase();
  document.querySelectorAll('#historial-tbody tr').forEach((row,idx)=>{
    if(idx%2===0){
      const cells = row.querySelectorAll('td');
      const mw = cells[3].textContent.toLowerCase();
      const dt = cells[5].textContent;
      const st = cells[7].textContent.toLowerCase();
      const ok = (!w||mw.includes(w)) && (!d||dt===d) && (!s||st.includes(s));
      row.style.display = ok?'':'none';
      const det = row.nextElementSibling;
      if(det) det.style.display = ok?'':'none';
    }
  });
}
['waiterFilter','dateFilter','statusFilter'].forEach(id=>{
  document.getElementById(id).addEventListener('change', applyFilters);
});

// Toggle detalles y CRUD
function attachTableEvents(){
  document.querySelectorAll('.toggle-details').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const det = document.getElementById(btn.dataset.target);
      det.classList.toggle('active');
      const ic = btn.querySelector('i');
      ic.classList.toggle('fa-chevron-down');
      ic.classList.toggle('fa-chevron-up');
    });
  });
  document.querySelectorAll('.edit-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      openEditHistorial(+btn.dataset.idx);
    });
  });
  document.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      if(confirm('¿Eliminar este registro?')){
        historial.splice(+btn.dataset.idx,1);
        renderHistorial();
      }
    });
  });
}

// Cálculos
const getSubtotal = h => h.productos.reduce((sum,p)=>sum + p.cantidad*p.precioUnit,0);
const getPropina  = h => getSubtotal(h)*0.10;
const getDescuento= h => getSubtotal(h)*(h.descuento||0);
const getTotal    = h => getSubtotal(h) - getDescuento(h) + getPropina(h);

// Abrir modal de edición
function openEditHistorial(idx){
  editIdx = idx;
  const h = historial[idx];
  document.getElementById('edit-pedido-id').value = h.pedido;
  document.getElementById('edit-cliente').value   = h.cliente;
  document.getElementById('edit-fecha').value     = h.fecha;
  document.getElementById('edit-reserva').value   = h.reserva? 'Sí':'No';
  document.getElementById('edit-factura').value   = h.factura|| '';
  document.getElementById('edit-estado').value    = h.estado;

  // Carga meseros y mesas
  const selM = document.getElementById('edit-mesero');
  selM.innerHTML = '';
  meseros.forEach(m=>{
    selM.innerHTML += `<option ${m===h.mesero?'selected':''}>${m}</option>`;
  });
  const selT = document.getElementById('edit-mesa');
  selT.innerHTML = '';
  mesas.forEach(m=>{
    selT.innerHTML += `<option ${m===h.mesa?'selected':''}>${m}</option>`;
  });

  // Productos (cantidad editable)
  const prodDiv = document.getElementById('edit-productos-list');
  prodDiv.innerHTML = '';
  h.productos.forEach((p,i)=>{
    prodDiv.innerHTML += `
      <div class="flex items-center gap-2">
        <input type="text" class="w-32 border rounded px-2 py-1 bg-gray-100" value="${p.nombre}" readonly>
        <input type="number" min="1" max="9999" id="prod-cant-${i}" class="w-20 border rounded px-2 py-1 prod-cant-input" value="${p.cantidad}">
        <span class="text-gray-600 font-semibold ml-1">x $${p.precioUnit.toFixed(2)}</span>
      </div>
      <span class="text-xs text-red-500 hidden" id="prod-cant-${i}-error"></span>
    `;
  });

  // Descuento
  document.getElementById('edit-descuento').value = h.descuento|| 0;
  recalcularModal();

  // Mostrar modal
  document.getElementById('edit-historial-modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Cerrar modal
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('edit-cancelar-btn').addEventListener('click', ()=>{
    document.getElementById('edit-historial-modal').classList.add('hidden');
    document.body.style.overflow = '';
  });
});

// Recalcular totales en modal
document.addEventListener('input', e=>{
  if(e.target.classList.contains('prod-cant-input') || e.target.id==='edit-descuento'){
    recalcularModal();
  }
});
function recalcularModal(){
  if(editIdx===null) return;
  const h = historial[editIdx];
  let sub = 0;
  h.productos.forEach((p,i)=>{
    const val = parseInt(document.getElementById('prod-cant-'+i).value)||0;
    sub += val*p.precioUnit;
  });
  const desc = sub * (parseFloat(document.getElementById('edit-descuento').value)||0);
  const prop = sub*0.10;
  document.getElementById('edit-subtotal').textContent = `$${sub.toFixed(2)}`;
  document.getElementById('edit-propina').textContent   = `$${prop.toFixed(2)}`;
  document.getElementById('edit-total').textContent    = `$${(sub - desc + prop).toFixed(2)}`;
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  renderHistorial();
  document.getElementById('sidebarToggle').addEventListener('click', ()=>{
    document.querySelector('.sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content').classList.toggle('ml-64');
  });
});
