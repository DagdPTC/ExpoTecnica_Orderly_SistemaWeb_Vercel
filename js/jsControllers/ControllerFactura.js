// js/jsControllers/ControllerFactura.js
import {
  getFacturas,
  deleteFactura,
  getPedidoById,
  getPlatillos,
  getPlatilloById,
  updateFacturaCompleta,
} from "../jsService/ServiceFactura.js";

/* ========================= Estado / helpers ========================= */
const state = {
  page: 0, size: 10, totalPages: 0, totalElements: 0,
  search: "", date: "",
  platillos: [],           // [{id, nombre, precio}]
  pedidoCache: new Map(),  // id -> PedidoDTO
};

const $ = (s) => document.querySelector(s);
const clamp  = (n, a, b) => Math.min(Math.max(Number(n)||0, a), b);
const round2 = (x) => Math.round((Number(x)||0) * 100) / 100;
const money  = (n) => Number(n ?? 0).toLocaleString("es-SV",{style:"currency",currency:"USD",minimumFractionDigits:2});
const fmtPref= (id,pfx)=>`${pfx}${String(Number(id||0)).padStart(4,"0")}`;
const safeNum= (v)=> (Number.isFinite(Number(v))?Number(v):0);
const getV   = (obj,K1,K2)=>(K1 in obj?obj[K1]:obj[K2]);

/* ---------- helpers alias / paths ---------- */
const path = (obj, p) => p.split('.').reduce((a,k)=> (a && a[k]!==undefined ? a[k] : undefined), obj);
function pick(obj, ...keys){
  for(const k of keys){
    const v = k.includes('.') ? path(obj,k) : obj?.[k];
    if(v!==undefined && v!==null && v!=="") return v;
  }
  return undefined;
}

const DETAIL_KEYS = [
  'detalles','detalle','pedidoDetalles','pedidoDetalle',
  'detallePedido','items','lineas','lineasPedido',
  'detallesPedido','detallePedidos'
];
function detailsArray(ped){
  for(const k of DETAIL_KEYS){
    const v = ped?.[k];
    if(Array.isArray(v) && v.length) return v;
  }
  for(const k of DETAIL_KEYS){
    const v = ped?.pedido?.[k];
    if(Array.isArray(v) && v.length) return v;
  }
  return [];
}
function firstDetail(ped){ const d = detailsArray(ped); return d[0]; }

function getDetalleId(det){
  return pick(det,
    'IdDetalle','idDetalle','idPedidoDetalle','IdPedidoDetalle',
    'detalleId','DetalleId','id','Id'
  );
}

/* ========================= DOM refs ========================= */
let $tbody,$search,$date;
let $itemsPerPage,$pagContainer,$prev,$next,$nums,$curr,$tot;

/* ========================= Init ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  await initializeApp();
});

async function initializeApp() {
  try {
    // Inicializar referencias DOM
    initializeDOMReferences();
    
    // Adjuntar event listeners
    attachFilters();
    attachPaginationEvents();
    attachModalEvents();
    
    // Precargar datos
    await preloadPlatillos();
    
    // Cargar datos iniciales
    await loadAndRender();
    
    console.log("Aplicación de facturas inicializada correctamente");
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
    showNotification("Error al cargar la aplicación", "error");
  }
}

function initializeDOMReferences() {
  $tbody = $("#invoicesTableBody"); 
  $search = $("#searchInput"); 
  $date = $("#dateFilter");
  $itemsPerPage = $("#itemsPerPage");
  $pagContainer = $("#paginationContainer");
  $prev = $("#prevPage"); 
  $next = $("#nextPage");
  $nums = $("#pageNumbers"); 
  $curr = $("#currentPage"); 
  $tot = $("#totalPages");
}

function attachPaginationEvents() {
  if ($itemsPerPage) {
    $itemsPerPage.addEventListener("change", async (e) => {
      state.size = parseInt(e.target.value, 10) || 10;
      state.page = 0;
      await loadAndRender();
    });
  }
}

function attachModalEvents() {
  // Cerrar modales con ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      $("#editModal")?.classList.add("hidden");
      $("#detailsModal")?.classList.add("hidden");
      $("#confirmModal")?.classList.add("hidden");
    }
  });
  
  // Cerrar modales haciendo click fuera
  document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.add("hidden");
      }
    });
  });
}

/* ========================= Filtros ========================= */
function attachFilters(){
  let t;
  $search?.addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(async()=>{
    state.search=$search.value.trim(); state.page=0; await loadAndRender();
  },300); });
  $date?.addEventListener("change",async()=>{ state.date=$date.value||""; state.page=0; await loadAndRender(); });
}

/* ========================= Platillos ========================= */
async function preloadPlatillos(){
  try{
    const page=await getPlatillos(0,50); // <= 50 para respetar tu API
    const content=Array.isArray(page?.content)?page.content:[];
    state.platillos=content.map(x=>({
      id:     getV(x,"Id","id"),
      nombre: getV(x,"NomPlatillo","nomPlatillo"),
      precio: Number(getV(x,"Precio","precio")||0),
    }));
  }catch(e){
    console.warn("No se pudieron cargar platillos",e);
    state.platillos=[];
  }
}
function findPlatilloLocally(id){
  return state.platillos.find(p=>String(p.id)===String(id))||null;
}
function mapPlatilloDTO(dto){
  if(!dto) return null;
  return {
    id:     getV(dto,"Id","id"),
    nombre: getV(dto,"NomPlatillo","nomPlatillo","nombre"),
    precio: Number(getV(dto,"Precio","precio")||0),
  };
}
async function getPlatilloSafeById(id){
  if(id==null) return null;
  const local = findPlatilloLocally(id);
  if(local) return local;
  try{
    const dto = await getPlatilloById(id);
    const obj = mapPlatilloDTO(dto);
    if(obj && !findPlatilloLocally(obj.id)) state.platillos.push(obj);
    return obj;
  }catch{ return null; }
}

/* ========================= Tabla ========================= */
async function loadAndRender(){
  try{
    $tbody.innerHTML=`<tr><td colspan="6" class="px-8 py-10 text-center text-gray-400">Cargando facturas...</td></tr>`;
    const page=await getFacturas(state.page,state.size);
    const items=Array.isArray(page?.content)?page.content:[];
    state.totalElements=Number(page?.totalElements||0);
    state.totalPages=Number(page?.totalPages||0);
    state.page=Number(page?.number||0);
    state.size=Number(page?.size||state.size);

    const filtered = items.filter(fx=>{
      if(state.search){
        const idF = String(getV(fx,"Id","id") ?? "");
        const idP = String(getV(fx,"IdPedido","idPedido") ?? "");
        const txt = (idF + " " + idP).toLowerCase();
        if(!txt.includes(state.search.toLowerCase())) return false;
      }
      return true;
    });

    renderRows(filtered);
    renderPagination();
  }catch(e){
    console.error(e);
    $tbody.innerHTML=`
      <tr><td colspan="6" class="px-8 py-12 text-center">
        <div class="flex flex-col items-center">
          <i class="fas fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
          <div class="text-gray-600">No se pudieron cargar las facturas.</div>
        </div>
      </td></tr>`;
    if ($pagContainer) $pagContainer.style.display = "none";
  }
}

function renderPagination(){
  const totalPages = Number(state.totalPages || 1);
  const number     = Number(state.page || 0);
  if(!$pagContainer || !$prev || !$next || !$nums || !$curr || !$tot) return;

  $curr.textContent = String(number + 1);
  $tot.textContent  = String(totalPages);

  $prev.disabled = number <= 0;
  $next.disabled = number >= totalPages - 1;

  $prev.onclick = async ()=>{ if(state.page > 0){ state.page--; await loadAndRender(); } };
  $next.onclick = async ()=>{ if(state.page < totalPages - 1){ state.page++; await loadAndRender(); } };

  $nums.innerHTML = "";
  const max = 5;
  let start = Math.max(0, number - Math.floor(max/2));
  let end   = Math.min(totalPages - 1, start + max - 1);
  if (end - start + 1 < max) start = Math.max(0, end - max + 1);
  for (let i = start; i <= end; i++){
    const b = document.createElement("button");
    b.className = `pagination-btn ${i === number ? "active" : ""}`;
    b.textContent = String(i + 1);
    if (i !== number) b.onclick = async ()=>{ state.page = i; await loadAndRender(); };
    $nums.appendChild(b);
  }
  $pagContainer.style.display = totalPages > 1 ? "flex" : "none";
}

function renderRows(items){
  $tbody.innerHTML="";
  if(!items.length){
    $tbody.innerHTML=`
      <tr><td colspan="6" class="px-8 py-12 text-center">
        <div class="flex flex-col items-center">
          <i class="fas fa-file-invoice text-6xl text-gray-300 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-500 mb-2">No se encontraron facturas</h3>
          <p class="text-gray-400">Intenta ajustar los filtros de búsqueda</p>
        </div>
      </td></tr>`;
    return;
  }

  items.forEach(fx=>{
    const idFactura=getV(fx,"Id","id");
    const idPedido =getV(fx,"IdPedido","idPedido");
    const desc     =safeNum(getV(fx,"Descuento","descuento"));
    const totalFx  =safeNum(getV(fx,"Total","total"));

    const tr=document.createElement("tr");
    tr.className="table-row hover:bg-gray-50";
    tr.dataset.fid=idFactura; 
    tr.dataset.pid=idPedido;
    tr.dataset.desc=String(desc); 
    tr.dataset.totalfx=String(totalFx);

    tr.innerHTML=`
      <td class="px-8 py-6 text-sm font-bold text-gray-900">
        <div class="flex items-center">
          <div class="w-3 h-3 rounded-full bg-green-400 mr-3"></div>
          ${fmtPref(idFactura,"FAC-")}
        </div>
      </td>
      <td class="px-8 py-6 text-sm text-gray-600 font-medium">${fmtPref(idPedido,"PED-")}</td>
      <td class="px-8 py-6 text-sm text-gray-700 font-medium js-cli">-</td>
      <td class="px-8 py-6 text-sm text-gray-600 js-fecha">-</td>
      <td class="px-8 py-6">
        <button class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg transition-all text-sm btn-detalles">
          <i class="fas fa-eye mr-2"></i>Ver Detalles
        </button>
      </td>
      <td class="px-8 py-6 text-right">
        <div class="flex justify-end space-x-2">
          <button class="bg-green-50 hover:bg-green-100 text-green-600 p-3 rounded-xl transition-all btn-editar" title="Editar"><i class="fas fa-edit"></i></button>
          <button class="bg-red-50 hover:bg-red-100 text-red-600 p-3 rounded-xl transition-all btn-eliminar" title="Eliminar"><i class="fas fa-trash"></i></button>
        </div>
      </td>`;
    $tbody.appendChild(tr);
    tr.querySelector(".btn-detalles").addEventListener("click",onShowDetails);
    tr.querySelector(".btn-editar").addEventListener("click",onOpenEdit);
    tr.querySelector(".btn-eliminar").addEventListener("click",onAskDelete);
    fillClienteFecha(tr,idPedido);
  });
}

async function fillClienteFecha(tr,idPedido){
  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }

    const cliente = (
      pick(ped,'Nombrecliente','nombrecliente','nombreCliente') ??
      pick(ped,'cliente.nombre','persona.nombre','cliente.persona.nombre') ??
      "-"
    );

    tr.querySelector(".js-cli").textContent=String(cliente);
    tr.querySelector(".js-fecha").textContent="-"; // (fecha pausada por ahora)
  }catch{
    tr.querySelector(".js-cli").textContent="-";
    tr.querySelector(".js-fecha").textContent="-";
  }
}

/* ========================= Detalles (mostrar) ========================= */
async function onShowDetails(ev){
  const tr=ev.currentTarget.closest("tr");
  const idFactura=Number(tr.dataset.fid);
  const idPedido =Number(tr.dataset.pid);

  const $modal=$("#detailsModal");
  if(!$modal) return alert("Agrega el modal de detalles al HTML.");

  $("#modalInvoiceNumber").textContent=fmtPref(idFactura,"FAC-");
  $("#modalOrderNumber").textContent  =fmtPref(idPedido,"PED-");

  const $cli=$("#modalClientName"), $date=$("#modalDate");
  const $mb=$("#modalProductsBody"), $sub=$("#modalSubtotal");
  const $tip=$("#modalTip"), $tot=$("#modalTotal"), $disc=$("#modalDiscount");
  $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>`;

  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }

    const cliente = (
      pick(ped,'Nombrecliente','nombrecliente','nombreCliente') ??
      pick(ped,'cliente.nombre','persona.nombre','cliente.persona.nombre') ??
      "-"
    );
    $cli.textContent=cliente;
    $date.textContent="-";

    const lines = detailsArray(ped);
    $mb.innerHTML="";
    let subtotalCalc = 0;

    if(lines.length){
      for(const it of lines){
        const idPlat = pick(it,'IdPlatillo','idPlatillo','platilloId','platillo.id');
        let   nombre = pick(it,'nombre','nombrePlatillo','NomPlatillo','platillo.nombre','platillo.nomPlatillo');
        const cant   = Number(pick(it,'Cantidad','cantidad','cant','qty') || 0);
        let   unit   = Number(pick(it,'precio','Precio','precioUnitario','precio_unitario','platillo.precio') || 0);
        let   sub    = Number(pick(it,'subtotal','Subtotal','importe','importeLinea') || 0);

        if(!nombre && idPlat!=null){
          const pl = findPlatilloLocally(idPlat) || await getPlatilloSafeById(idPlat);
          if(pl){ nombre = pl.nombre; if(unit<=0) unit = Number(pl.precio || 0); }
        }
        if(sub<=0) sub = round2((unit>0 ? unit : 0) * (cant>0 ? cant : 0));
        subtotalCalc = round2(subtotalCalc + sub);

        const trp=document.createElement("tr");
        trp.innerHTML=`
          <td class="px-4 py-3">${nombre || `Platillo #${idPlat ?? '—'}`}</td>
          <td class="px-4 py-3 text-right">${cant || 0}</td>
          <td class="px-4 py-3 text-right">${unit?money(unit):"-"}</td>
          <td class="px-4 py-3 text-right">${money(sub)}</td>`;
        $mb.appendChild(trp);
      }
    }else{
      const detalle = firstDetail(ped);
      const idPlat = pick(ped,'IdPlatillo','idPlatillo','id_platillo','platilloId') ??
                     pick(detalle||{},'IdPlatillo','idPlatillo','platilloId','platillo.id');
      const cant   = Number(pick(ped,'Cantidad','cantidad') ?? pick(detalle||{},'Cantidad','cantidad','cant','qty')) || 1;
      const subV   = Number(pick(ped,'Subtotal','subtotal') ?? pick(detalle||{},'subtotal','Subtotal','importe','importeLinea')) || 0;

      let nombre = pick(detalle||{},'nombre','nombrePlatillo','platillo.nombre');
      let unit   = Number(pick(detalle||{},'precio','Precio','precioUnitario','precio_unitario','platillo.precio') || 0);

      if(!nombre && idPlat!=null){
        const pl = findPlatilloLocally(idPlat) || await getPlatilloSafeById(idPlat);
        if(pl){ nombre = pl.nombre; if(unit<=0) unit = Number(pl.precio || 0); }
      }
      const unitFinal = unit>0 ? unit : (cant>0 ? round2(subV/cant) : 0);
      subtotalCalc = subV || round2(unitFinal*cant);

      const trp=document.createElement("tr");
      trp.innerHTML=`
        <td class="px-4 py-3">${nombre || `Platillo #${idPlat ?? '—'}`}</td>
        <td class="px-4 py-3 text-right">${cant}</td>
        <td class="px-4 py-3 text-right">${unitFinal?money(unitFinal):"-"}</td>
        <td class="px-4 py-3 text-right">${money(subtotalCalc)}</td>`;
      $mb.appendChild(trp);
    }

    const prop   = Number(pick(ped,'Propina','propina')) || round2(subtotalCalc*0.10);
    const totalPedido = round2(subtotalCalc + prop);

    let descuentoMonto = 0;
    const totalFx = safeNum(tr.dataset.totalfx || 0);
    if(totalFx > 0){
      const diff = round2(totalPedido - totalFx);
      if(diff > 0) descuentoMonto = diff;
    }
    const totalFinal = round2(Math.max(0, totalPedido - descuentoMonto));

    $sub.textContent  = money(subtotalCalc);
    $tip.textContent  = money(prop);
    $("#modalDiscount").textContent = money(descuentoMonto);
    $tot.textContent  = money(totalFinal);
  }catch{
    $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-red-400">No se pudo cargar el pedido.</td></tr>`;
    $("#modalClientName").textContent = "-";
    $("#modalDate").textContent= "-";
    $("#modalSubtotal").textContent="—"; 
    $("#modalTip").textContent="—"; 
    $("#modalDiscount").textContent="—"; 
    $("#modalTotal").textContent="—";
  }

  $modal.classList.remove("hidden");
  $("#closeModalBtn").onclick=()=> $modal.classList.add("hidden");
}

/* ========================= Notificaciones ========================= */
function showNotification(message, type = "info") {
  // Crear notificación toast
  const toast = document.createElement("div");
  toast.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-300 ${
    type === "success" ? "bg-green-500 text-white" :
    type === "error" ? "bg-red-500 text-white" :
    "bg-blue-500 text-white"
  }`;
  
  toast.innerHTML = `
    <div class="flex items-center">
      <i class="fas ${
        type === "success" ? "fa-check-circle" :
        type === "error" ? "fa-exclamation-triangle" :
        "fa-info-circle"
      } mr-2"></i>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  // Auto-remover después de 5 segundos
  setTimeout(() => {
    toast.style.transform = "translateX(100%)";
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 5000);
}

/* ========================= Manejo de Errores ========================= */
function handleUpdateError(error) {
  let errorMessage = "Error al actualizar la factura";
  
  try {
    // Intentar parsear como JSON de validación
    const errorData = JSON.parse(error.message);
    
    if (errorData.errors && Array.isArray(errorData.errors)) {
      // Errores de validación de Spring
      errorMessage = "Errores de validación:\n" + 
        errorData.errors.map(err => `• ${err.field}: ${err.defaultMessage}`).join('\n');
    } else if (errorData.message) {
      // Error general del backend
      errorMessage = errorData.message;
    }
  } catch {
    // Si no es JSON, usar el mensaje directo
    errorMessage = error.message || errorMessage;
  }
  
  showNotification(errorMessage, "error");
}

/* ========================= Editar (PUT) - CORREGIDO ========================= */
let currentEdit={ factura:null, pedido:null, original:null };

function populatePlatillosSelect(selectId="editPlatilloSelect"){
  const sel=document.getElementById(selectId);
  if(!sel) return;
  sel.innerHTML="";
  const op0=document.createElement("option");
  op0.value=""; op0.textContent="(sin platillos)";
  sel.appendChild(op0);
  state.platillos.forEach(pl=>{
    const op=document.createElement("option");
    op.value=String(pl.id); op.textContent=pl.nombre;
    sel.appendChild(op);
  });
}

function refreshPreview(){
  const ped = currentEdit.pedido || {};
  
  // Obtener valores actuales del formulario
  const platilloId = $("#editPlatilloSelect").value ? Number($("#editPlatilloSelect").value) : null;
  const cantidad = Math.max(1, Number($("#editCantidad").value) || 1);
  const descuentoPct = clamp(Number($("#editDescuento").value) || 0, 0, 100);
  
  $("#editDescuento").value = descuentoPct;

  let precioUnitario = 0;
  let nombrePlatillo = "Seleccione un platillo";

  // Si hay un platillo seleccionado, obtener su precio
  if (platilloId) {
    const platillo = findPlatilloLocally(platilloId);
    if (platillo) {
      precioUnitario = platillo.precio;
      nombrePlatillo = platillo.nombre;
    }
  }

  // Calcular valores
  const subtotal = round2(precioUnitario * cantidad);
  const propina = round2(subtotal * 0.10);
  const totalPedido = round2(subtotal + propina);
  const descuentoMonto = round2(totalPedido * (descuentoPct / 100));
  const totalFactura = round2(Math.max(0, totalPedido - descuentoMonto));

  // Actualizar UI
  $("#editPrecioUnit").textContent = precioUnitario ? money(precioUnitario) : "$0.00";
  $("#editDescuentoMonto").textContent = money(descuentoMonto);
  $("#editPreviewSubtotal").textContent = money(subtotal);
  $("#editPreviewPropina").textContent = money(propina);
  $("#editPreviewTotalPedido").textContent = money(totalPedido);
  $("#editPreviewTotalFactura").textContent = money(totalFactura);
}

async function onOpenEdit(ev) {
  const tr = ev.currentTarget.closest("tr");
  const idFactura = Number(tr.dataset.fid);
  const idPedido = Number(tr.dataset.pid);

  currentEdit = { factura: { id: idFactura }, pedido: null, original: null };

  try {
    let ped = state.pedidoCache.get(idPedido);
    if (!ped) { 
      ped = await getPedidoById(idPedido); 
      state.pedidoCache.set(idPedido, ped); 
    }
    currentEdit.pedido = ped;
  } catch (error) {
    console.error("Error cargando pedido:", error);
    showNotification("No se pudo cargar el pedido para editar", "error");
    return;
  }

  // Llenar datos básicos
  $("#editFacturaId").value = idFactura;
  $("#editPedidoId").value = idPedido;
  $("#editFacturaNum").value = fmtPref(idFactura, "FAC-");
  $("#editPedidoNum").value = fmtPref(idPedido, "PED-");

  // Cargar platillos en el select
  populatePlatillosSelect("editPlatilloSelect");

  const ped = currentEdit.pedido;
  const detalles = detailsArray(ped);
  
  // Si hay detalles, usar el primero para pre-cargar datos
  if (detalles.length > 0) {
    const detalle = detalles[0];
    const idPlatillo = pick(detalle, 'IdPlatillo', 'idPlatillo', 'platilloId', 'platillo.id');
    const cantidad = Math.max(1, Number(pick(detalle, 'Cantidad', 'cantidad')) || 1);
    
    if (idPlatillo) {
      $("#editPlatilloSelect").value = String(idPlatillo);
    }
    $("#editCantidad").value = cantidad;
  }

  // Obtener descuento actual de la factura
  const descuentoActual = safeNum(tr.dataset.desc || 0);
  const totalPedidoActual = safeNum(pick(ped, 'TotalPedido', 'totalPedido', 'total')) || 1;
  const descuentoPctActual = totalPedidoActual > 0 ? round2((descuentoActual / totalPedidoActual) * 100) : 0;
  
  $("#editDescuento").value = clamp(descuentoPctActual, 0, 100);

  // Configurar event listeners
  $("#editPlatilloSelect").addEventListener("change", refreshPreview);
  $("#editCantidad").addEventListener("input", refreshPreview);
  $("#editDescuento").addEventListener("input", refreshPreview);

  // Calcular vista previa inicial
  refreshPreview();

  // Mostrar modal
  $("#editModal").classList.remove("hidden");
  
  // Configurar botones
  $("#saveInvoiceBtn").onclick = onSaveEdit;
  $("#cancelEditBtn").onclick = () => {
    $("#editModal").classList.add("hidden");
    // Limpiar event listeners para evitar duplicados
    $("#editPlatilloSelect").onchange = null;
    $("#editCantidad").oninput = null;
    $("#editDescuento").oninput = null;
  };
}

async function onSaveEdit() {
  const idFactura = Number($("#editFacturaId").value);
  const idPedido = Number($("#editPedidoId").value);
  
  const $btn = $("#saveInvoiceBtn");
  const originalBtnText = $btn.innerHTML;
  $btn.disabled = true;
  $btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';

  try {
    // 1. Obtener datos del formulario
    const platilloId = $("#editPlatilloSelect").value ? Number($("#editPlatilloSelect").value) : null;
    const cantidad = $("#editCantidad").value ? Number($("#editCantidad").value) : null;
    const descuentoPct = Number($("#editDescuento").value) || 0;

    // Validaciones básicas
    if (descuentoPct < 0 || descuentoPct > 100) {
      throw new Error("El descuento debe estar entre 0% y 100%");
    }

    if (cantidad !== null && cantidad < 1) {
      throw new Error("La cantidad debe ser al menos 1");
    }

    // 2. Preparar payload EXACTO como espera el backend
    const payload = {
      IdPedido: idPedido,
      DescuentoPct: descuentoPct
    };

    // Solo incluir platillo y cantidad si fueron modificados/seleccionados
    if (platilloId) {
      payload.IdPlatillo = platilloId;
    }
    
    if (cantidad !== null) {
      payload.Cantidad = cantidad;
    }

    console.log("Enviando payload al backend:", payload);

    // 3. Ejecutar actualización
    const resultado = await updateFacturaCompleta(idFactura, payload);
    
    // 4. Cerrar modal y refrescar
    $("#editModal").classList.add("hidden");
    
    // Limpiar cache y recargar
    state.pedidoCache.delete(idPedido);
    await loadAndRender();
    
    // Mostrar confirmación
    showNotification("Factura actualizada correctamente", "success");
    
  } catch (error) {
    console.error("Error al actualizar factura:", error);
    handleUpdateError(error);
  } finally {
    $btn.disabled = false;
    $btn.innerHTML = originalBtnText;
  }
}

/* ========================= Eliminar ========================= */
function onAskDelete(ev){
  const tr=ev.currentTarget.closest("tr");
  const id=Number(tr.dataset.fid);
  const $m=$("#confirmModal"),$ok=$("#confirmDeleteBtn"),$cc=$("#cancelDeleteBtn");
  $ok.dataset.id=id; $m.classList.remove("hidden");
  $ok.onclick=async()=>{
    try{ 
      await deleteFactura(Number($ok.dataset.id)); 
      $m.classList.add("hidden"); 
      await loadAndRender(); 
    }catch{ 
      alert("No se pudo eliminar la factura."); 
    } 
  };
  $cc.onclick=()=> $m.classList.add("hidden");
}