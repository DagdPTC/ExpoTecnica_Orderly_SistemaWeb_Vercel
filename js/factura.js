// js/factura.js

let invoicesData = [
  {
    id: 1,
    invoiceNumber: "FAC-001",
    orderNumber:   "ORD-001",
    clientName:    "Roberto Sánchez",
    waiterName:    "Juan Pérez",
    date:          "2023-05-15",
    products: [
      { name:"Pizza Margarita", quantity:1, price:12.50 },
      { name:"Ensalada César", quantity:2, price: 8.00 },
      { name:"Refresco",       quantity:3, price: 2.50 }
    ]
  },
  {
    id: 2,
    invoiceNumber: "FAC-002",
    orderNumber:   "ORD-002",
    clientName:    "Laura Gómez",
    waiterName:    "María García",
    date:          "2023-05-16",
    products: [
      { name:"Pasta Carbonara", quantity:1, price:10.50 },
      { name:"Vino Tinto",      quantity:1, price:15.00 }
    ]
  },
  {
    id: 3,
    invoiceNumber: "FAC-003",
    orderNumber:   "ORD-003",
    clientName:    "Carlos Mendoza",
    waiterName:    "Carlos López",
    date:          "2023-05-17",
    products: [
      { name:"Hamburguesa", quantity:2, price:9.00 },
      { name:"Papas Fritas",quantity:2, price:4.50 },
      { name:"Limonada",    quantity:2, price:3.00 }
    ]
  }
];
let filteredInvoices = [];


function formatDate(str) {
  return new Date(str).toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
}
function calculateTotals(products) {
  let sub=0; products.forEach(p=> sub+=p.price*p.quantity);
  let tip=sub*0.10, tot=sub+tip;
  return { sub, tip, tot };
}

function renderInvoicesTable(invoices) {
  const tbody = document.getElementById('invoicesTableBody');
  tbody.innerHTML = '';
  invoices.forEach((inv,i)=>{
    const { sub, tip, tot } = calculateTotals(inv.products);
    // fila resumen
    const tr1 = document.createElement('tr');
    tr1.className='hover:bg-gray-50 transition-colors';
    tr1.innerHTML=`
      <td class="px-6 py-4 text-sm font-medium text-gray-900">${inv.invoiceNumber}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${inv.orderNumber}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${inv.clientName}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${inv.waiterName}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${formatDate(inv.date)}</td>
      <td class="px-6 py-4 text-blue-600 cursor-pointer toggle-details" data-target="details-${i}">
        Detalles <i class="fas fa-chevron-down text-blue-600 ml-1"></i>
      </td>
      <td class="px-6 py-4 text-right">
        <button class="mr-2 btn-animate edit-btn" data-id="${inv.id}" title="Editar">
          <i class="fas fa-edit text-green-600"></i>
        </button>
        <button class="btn-animate delete-btn" data-id="${inv.id}" title="Eliminar">
          <i class="fas fa-trash text-red-600"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr1);

    // fila detalles
    const tr2 = document.createElement('tr');
    tr2.innerHTML=`
      <td colspan="7" class="px-0 py-0">
        <div id="details-${i}" class="order-details">
          <div class="px-6 py-4 text-sm text-gray-700">
            <div class="grid grid-cols-4 gap-4 font-medium text-gray-500 mb-2">
              <div>Producto</div>
              <div class="text-right">Cantidad</div>
              <div class="text-right">Precio Unit.</div>
              <div class="text-right">Subtotal</div>
            </div>
            ${inv.products.map(p=>`
              <div class="grid grid-cols-4 gap-4 mb-1">
                <div>${p.name}</div>
                <div class="text-right">${p.quantity}</div>
                <div class="text-right">$${p.price.toFixed(2)}</div>
                <div class="text-right">$${(p.price*p.quantity).toFixed(2)}</div>
              </div>
            `).join('')}
            <div class="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <div><strong>Subtotal:</strong> $${sub.toFixed(2)}</div>
              <div><strong>Propina:</strong> $${tip.toFixed(2)}</div>
              <div><strong>Total:</strong> <span class="text-blue-600">$${tot.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr2);
  });

  // toggle detalles
  document.querySelectorAll('.toggle-details').forEach(btn=>{
    btn.onclick = ()=>{
      const det = document.getElementById(btn.dataset.target);
      det.classList.toggle('active');
      const icon = btn.querySelector('i');
      icon.classList.toggle('fa-chevron-down');
      icon.classList.toggle('fa-chevron-up');
    };
  });

  // editar y eliminar
  document.querySelectorAll('.edit-btn').forEach(b=> b.onclick = ()=> openEditModal(parseInt(b.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(b=> b.onclick = ()=> confirmDelete(parseInt(b.dataset.id)));
}

function filterInvoices(){
  const term = document.getElementById('searchInput').value.toLowerCase();
  const waiter = document.getElementById('waiterFilter').value;
  const date   = document.getElementById('dateFilter').value;
  filteredInvoices = invoicesData.filter(inv=>{
    const byText  = inv.invoiceNumber.toLowerCase().includes(term)
                  || inv.orderNumber.toLowerCase().includes(term)
                  || inv.clientName.toLowerCase().includes(term);
    const byWait  = !waiter || inv.waiterName===waiter;
    const byDate  = !date   || inv.date===date;
    return byText && byWait && byDate;
  });
  renderInvoicesTable(filteredInvoices);
}

function openEditModal(id){
  const inv = invoicesData.find(i=>i.id===id);
  document.getElementById('editInvoiceId').value      = inv.id;
  document.getElementById('editInvoiceNumber').value = inv.invoiceNumber;
  document.getElementById('editOrderNumber').value   = inv.orderNumber;
  document.getElementById('editClientName').value    = inv.clientName;
  document.getElementById('editWaiterName').value    = inv.waiterName;
  document.getElementById('editDate').value          = inv.date;
  ['editInvoiceNumberError','editOrderNumberError','editClientNameError','editWaiterNameError','editDateError']
    .forEach(e=> document.getElementById(e).style.display='none');
  document.getElementById('editModal').classList.remove('hidden');
}

function saveInvoice(){
  let ok = true;
  const id   = parseInt(document.getElementById('editInvoiceId').value);
  const idx  = invoicesData.findIndex(i=>i.id===id);
  const inv  = invoicesData[idx];
  const invNumInp = document.getElementById('editInvoiceNumber');
  const ordNumInp = document.getElementById('editOrderNumber');
  const dateInp   = document.getElementById('editDate');
  const cliInp    = document.getElementById('editClientName');
  const waiInp    = document.getElementById('editWaiterName');

  // validar que no se modifiquen factura, orden, fecha
  if(invNumInp.value !== inv.invoiceNumber){
    invNumInp.classList.add('error-input');
    const e = document.getElementById('editInvoiceNumberError');
    e.textContent = 'No puedes modificar el número de factura';
    e.style.display = 'block';
    ok=false;
  }
  if(ordNumInp.value !== inv.orderNumber){
    ordNumInp.classList.add('error-input');
    const e = document.getElementById('editOrderNumberError');
    e.textContent = 'No puedes modificar el número de orden';
    e.style.display = 'block';
    ok=false;
  }
  if(dateInp.value !== inv.date){
    dateInp.classList.add('error-input');
    const e = document.getElementById('editDateError');
    e.textContent = 'No puedes modificar la fecha';
    e.style.display = 'block';
    ok=false;
  }

  // validar cliente y mesero
  if(!cliInp.value.trim()){
    document.getElementById('editClientNameError').textContent='Requerido';
    document.getElementById('editClientNameError').style.display='block';
    ok=false;
  }
  if(!waiInp.value){
    document.getElementById('editWaiterNameError').textContent='Requerido';
    document.getElementById('editWaiterNameError').style.display='block';
    ok=false;
  }

  if(!ok) return;

  // guardar cambios
  inv.clientName = cliInp.value.trim();
  inv.waiterName = waiInp.value;
  filterInvoices();
  document.getElementById('editModal').classList.add('hidden');
}

function confirmDelete(id){
  document.getElementById('confirmDeleteBtn').dataset.id = id;
  document.getElementById('confirmModal').classList.remove('hidden');
}
function doDelete(){
  const id = parseInt(document.getElementById('confirmDeleteBtn').dataset.id);
  invoicesData = invoicesData.filter(i=>i.id!==id);
  filterInvoices();
  document.getElementById('confirmModal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded',()=>{
  filteredInvoices = [...invoicesData];
  renderInvoicesTable(filteredInvoices);
  document.getElementById('searchInput').oninput   = filterInvoices;
  document.getElementById('waiterFilter').onchange = filterInvoices;
  document.getElementById('dateFilter').onchange   = filterInvoices;
  document.getElementById('sidebarToggle').onclick = ()=>{
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('mainContent').classList.toggle('collapsed');
  };
  document.getElementById('cancelEditBtn').onclick    = ()=>document.getElementById('editModal').classList.add('hidden');
  document.getElementById('saveInvoiceBtn').onclick   = saveInvoice;
  document.getElementById('closeModalBtn').onclick    = ()=>document.getElementById('detailsModal').classList.add('hidden');
  document.getElementById('confirmDeleteBtn').onclick = doDelete;
  document.getElementById('cancelDeleteBtn').onclick  = ()=>document.getElementById('confirmModal').classList.add('hidden');
});



// Eventos inic
document.addEventListener('DOMContentLoaded',()=>{
  filteredInvoices = [...invoicesData];
  renderInvoicesTable(filteredInvoices);
  document.getElementById('searchInput').oninput     = filterInvoices;
  document.getElementById('waiterFilter').onchange   = filterInvoices;
  document.getElementById('dateFilter').onchange     = filterInvoices;
  document.getElementById('sidebarToggle').onclick   = ()=>{
    document.getElementById('sidebar').classList.toggle('collapsed');
    document.getElementById('mainContent').classList.toggle('collapsed');
  };
  document.getElementById('addInvoiceBtn').onclick   = openAddModal;
  document.getElementById('cancelAddBtn').onclick    = ()=>document.getElementById('addModal').classList.add('hidden');
  document.getElementById('saveAddBtn').onclick      = saveNewInvoice;
  document.getElementById('cancelEditBtn').onclick   = ()=>document.getElementById('editModal').classList.add('hidden');
  document.getElementById('saveInvoiceBtn').onclick  = saveInvoice;
  document.getElementById('closeModalBtn').onclick   = ()=>document.getElementById('detailsModal').classList.add('hidden');
  document.getElementById('confirmDeleteBtn').onclick= doDelete;
  document.getElementById('cancelDeleteBtn').onclick = ()=>document.getElementById('confirmModal').classList.add('hidden');
});
