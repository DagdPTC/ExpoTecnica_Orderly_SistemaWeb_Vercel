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
const hasK   = (obj,K1,K2)=>(K1 in obj?K1:K2);
const getV   = (obj,K1,K2)=>(K1 in obj?obj[K1]:obj[K2]);

const fmtDate=(iso)=>{
  if(!iso||iso==='-') return '-';
  try{
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)){
      const [y,m,d]=iso.split('-').map(Number);
      return new Date(y,m-1,d).toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
    }
    const d=new Date(iso); if(!isNaN(d)) return d.toLocaleDateString('es-ES',{year:'numeric',month:'long',day:'numeric'});
  }catch{}
  return iso;
};

/* ========================= DOM refs ========================= */
let $tbody,$search,$date;
// NUEVO paginación tipo Reservas
let $itemsPerPage,$pagContainer,$prev,$next,$nums,$curr,$tot;

/* ========================= Init ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  $tbody=$("#invoicesTableBody"); 
  $search=$("#searchInput"); 
  $date=$("#dateFilter");

  // refs paginación
  $itemsPerPage = $("#itemsPerPage");
  $pagContainer = $("#paginationContainer");
  $prev = $("#prevPage"); 
  $next = $("#nextPage");
  $nums = $("#pageNumbers"); 
  $curr = $("#currentPage"); 
  $tot  = $("#totalPages");

  attachFilters();

  // Listener del selector "Mostrar"
  if ($itemsPerPage) {
    $itemsPerPage.value = String(state.size || 10);
    $itemsPerPage.addEventListener("change", async (e)=>{
      state.size = parseInt(e.target.value,10) || 10;
      state.page = 0;
      await loadAndRender();
    });
  }

  await preloadPlatillos();
  await loadAndRender();
});

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
    const page=await getPlatillos(0,100);
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

async function resolvePlatillo(id){
  if(!id && id!==0) return null;
  let pl=findPlatilloLocally(id);
  if(pl) return pl;
  try{
    const dto=await getPlatilloById(id);
    if(dto){
      const obj={
        id: getV(dto,"Id","id"),
        nombre: getV(dto,"NomPlatillo","nomPlatillo"),
        precio: Number(getV(dto,"Precio","precio")||0),
      };
      if(!findPlatilloLocally(obj.id)) state.platillos.push(obj);
      return obj;
    }
  }catch{ /* ignore */ }
  return null;
}

function populatePlatillosSelect(selectId="editPlatilloSelect"){
  const sel=document.getElementById(selectId);
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

function ensureOption(sel,id,nombre){
  const exists=Array.from(sel.options).some(o=>o.value===String(id));
  if(!exists){
    const op=document.createElement("option");
    op.value=String(id); op.textContent=nombre;
    sel.appendChild(op);
  }
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

    // filtros de texto/fecha si aplican (lado cliente)
    const filtered = items.filter(fx=>{
      if(state.search){
        const idF = String(getV(fx,"Id","id") ?? "");
        const idP = String(getV(fx,"IdPedido","idPedido") ?? "");
        const txt = (idF + " " + idP).toLowerCase();
        if(!txt.includes(state.search.toLowerCase())) return false;
      }
      // el filtro de fecha se aplicará desde el pedido en el render (cliente/fecha)
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

  if(!$pagContainer || !$prev || !$next || !$nums || !$curr || !$tot){
    return;
  }

  $curr.textContent = String(number + 1);
  $tot.textContent  = String(totalPages);

  $prev.disabled = number <= 0;
  $next.disabled = number >= totalPages - 1;

  $prev.onclick = async ()=>{ if(state.page > 0){ state.page--; await loadAndRender(); } };
  $next.onclick = async ()=>{ if(state.page < totalPages - 1){ state.page++; await loadAndRender(); } };

  // números centrados
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
    tr.dataset.fid=idFactura; tr.dataset.pid=idPedido;
    tr.dataset.desc=String(desc); tr.dataset.totalfx=String(totalFx);
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
    const cliente=getV(ped,"Nombrecliente","nombrecliente")||"-";
    const fecha=getV(ped,"FPedido","fPedido")||"-";
    // filtro por fecha (si hay filtro activo)
    if(state.date){
      const ymd = String(fecha).slice(0,10);
      if(ymd !== state.date){
        tr.remove();
        return;
      }
    }
    tr.querySelector(".js-cli").textContent=cliente;
    tr.querySelector(".js-fecha").textContent=fmtDate(fecha);
  }catch{
    tr.querySelector(".js-cli").textContent="-";
    tr.querySelector(".js-fecha").textContent="-";
  }
}

/* ========================= Detalles ========================= */
async function onShowDetails(ev){
  const tr=ev.currentTarget.closest("tr");
  const idFactura=Number(tr.dataset.fid);
  const idPedido =Number(tr.dataset.pid);

  const $modal=$("#detailsModal");
  $("#modalInvoiceNumber").textContent=fmtPref(idFactura,"FAC-");
  $("#modalOrderNumber").textContent  =fmtPref(idPedido,"PED-");

  const $cli=$("#modalClientName"), $date=$("#modalDate");
  const $mb=$("#modalProductsBody"), $sub=$("#modalSubtotal");
  const $tip=$("#modalTip"), $tot=$("#modalTotal");
  $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>`;

  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }

    const cliente=getV(ped,"Nombrecliente","nombrecliente")||"-";
    const fecha  =getV(ped,"FPedido","fPedido")||"-";
    const cant   =safeNum(getV(ped,"Cantidad","cantidad"));
    const subV   =safeNum(getV(ped,"Subtotal","subtotal"));
    const prop   =safeNum(getV(ped,"Propina","propina"));
    const totV   =safeNum(getV(ped,"TotalPedido","totalPedido"))||round2(subV+prop);
    const idPlat =getV(ped,"IdPlatillo","idPlatillo");

    let pl=await resolvePlatillo(idPlat);
    const nombre = pl?.nombre ?? `Platillo #${idPlat}`;
    const unit   = pl?.precio ?? (cant>0?round2(subV/cant):0);

    $cli.textContent=cliente; $date.textContent=fmtDate(fecha);
    $mb.innerHTML="";
    const trp=document.createElement("tr");
    trp.innerHTML=`
      <td class="px-4 py-3">${nombre}</td>
      <td class="px-4 py-3 text-right">${cant}</td>
      <td class="px-4 py-3 text-right">${unit?money(unit):"-"}</td>
      <td class="px-4 py-3 text-right">${money(subV)}</td>`;
    $mb.appendChild(trp);

    $sub.textContent=money(subV);
    $tip.textContent=money(prop);
    $tot.textContent=money(totV);
  }catch{
    $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-red-400">No se pudo cargar el pedido.</td></tr>`;
    $cli.textContent="-"; $date.textContent="-"; $sub.textContent="—"; $tip.textContent="—"; $tot.textContent="—";
  }

  $modal.classList.remove("hidden");
  $("#closeModalBtn").onclick=()=> $modal.classList.add("hidden");
}

/* ========================= Editar (descuento %) ========================= */
let currentEdit={ factura:null, pedido:null };

function refreshPreview(){
  const ped=currentEdit.pedido||{};
  const cantI=Math.max(1,safeNum($("#editCantidad").value)||1);
  let pct=clamp(safeNum($("#editDescuento").value)||0,0,100);
  $("#editDescuento").value=pct;

  const sel=$("#editPlatilloSelect");
  const selId=sel.value?Number(sel.value):null;

  let unitPrice=null;
  const plLocal = selId!=null ? findPlatilloLocally(selId) : null;
  if(plLocal && plLocal.precio>0){
    unitPrice=plLocal.precio;
  }else{
    const subPed=safeNum(getV(ped,"Subtotal","subtotal"));
    const cantPed=Math.max(1,safeNum(getV(ped,"Cantidad","cantidad")));
    unitPrice=cantPed>0?round2(subPed/cantPed):0;
  }

  $("#editPrecioUnit").textContent=unitPrice?money(unitPrice):"—";

  const subtotal=round2(unitPrice*cantI);
  const propina =round2(subtotal*0.10);
  const totalP  =round2(subtotal+propina);
  const desc    =round2(totalP*(pct/100));
  const totalF  =round2(Math.max(0,totalP-desc));

  $("#editDescuentoMonto").textContent = money(desc);
  $("#editPreviewSubtotal").textContent= money(subtotal);
  $("#editPreviewPropina").textContent = money(propina);
  $("#editPreviewTotalPedido").textContent = money(totalP);
  $("#editPreviewTotalFactura").textContent = money(totalF);
}

async function onOpenEdit(ev){
  const tr=ev.currentTarget.closest("tr");
  const idFactura=Number(tr.dataset.fid);
  const idPedido =Number(tr.dataset.pid);

  currentEdit={ factura:{id:idFactura}, pedido:null };

  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }
    currentEdit.pedido=ped;
  }catch{ alert("No se pudo cargar el pedido para editar."); return; }

  $("#editFacturaId").value  = idFactura;
  $("#editPedidoId").value   = idPedido;
  $("#editFacturaNum").value = fmtPref(idFactura,"FAC-");
  $("#editPedidoNum").value  = fmtPref(idPedido ,"PED-");

  populatePlatillosSelect();

  const ped=currentEdit.pedido;
  const idPlat=getV(ped,"IdPlatillo","idPlatillo");
  const cant  =Math.max(1,safeNum(getV(ped,"Cantidad","cantidad")));
  const sub   =safeNum(getV(ped,"Subtotal","subtotal"));
  const prop  =safeNum(getV(ped,"Propina","propina"));
  const totP  =safeNum(getV(ped,"TotalPedido","totalPedido"))||round2(sub+prop);

  // asegurar opción en el combo
  const sel=$("#editPlatilloSelect");
  const plLocal=findPlatilloLocally(idPlat);
  if(!plLocal && idPlat!=null){
    try{
      const plApi=await resolvePlatillo(idPlat);
      if(plApi) ensureOption(sel, plApi.id, plApi.nombre);
      else      ensureOption(sel, idPlat, `Platillo #${idPlat}`);
    }catch{
      ensureOption(sel, idPlat, `Platillo #${idPlat}`);
    }
  }
  $("#editPlatilloSelect").value=String(idPlat ?? "");
  $("#editCantidad").value=cant;

  const descMontoActual=safeNum(tr.dataset.desc||0);
  const pctIni=totP>0 ? clamp(round2((descMontoActual/totP)*100),0,100) : 0;
  $("#editDescuento").value=pctIni;

  $("#editPlatilloSelect").onchange=refreshPreview;
  $("#editCantidad").oninput=refreshPreview;
  $("#editDescuento").oninput=refreshPreview;

  refreshPreview();
  $("#editModal").classList.remove("hidden");
  $("#saveInvoiceBtn").onclick=onSaveEdit;
  $("#cancelEditBtn").onclick=()=> $("#editModal").classList.add("hidden");
}

/* ======= NUEVO: ayuda para refrescar tras guardar ======= */
async function refreshAfterUpdate(idPedido) {
  state.pedidoCache.delete(idPedido); // invalida cache
  await loadAndRender();
}

/* ======= Guardar ======= */
async function onSaveEdit(){
  const idFactura=Number($("#editFacturaId").value);
  const idPedido =Number($("#editPedidoId").value);
  const ped=currentEdit.pedido||{};
  const sel=$("#editPlatilloSelect");
  const idPlat = sel.value ? Number(sel.value) : getV(ped,"IdPlatillo","idPlatillo");
  const cant   = Math.max(1,safeNum($("#editCantidad").value)||1);
  const pct    = clamp(safeNum($("#editDescuento").value)||0,0,100);

  const payloadPlano = {
    IdPedido: idPedido,
    IdPlatillo: idPlat,   // opcional
    Cantidad: cant,       // opcional
    DescuentoPct: pct     // 0..100, 0 permitido
  };

  const $btn = $("#saveInvoiceBtn");
  $btn.disabled = true;

  try{
    await updateFacturaCompleta(idFactura, payloadPlano);
    $("#editModal").classList.add("hidden");
    await refreshAfterUpdate(idPedido);
  }catch(e){
    console.error(e);
    try{
      const v=JSON.parse(e.message);
      const msg=v.errors ? v.errors.map(x=>`• ${x.field||""}: ${x.defaultMessage||x.message||""}`).join("\n")
                         : Object.entries(v).map(([k,val])=>`• ${k}: ${val}`).join("\n");
      alert("Errores de validación:\n\n"+msg);
    }catch{
      alert("No se pudo guardar los cambios:\n\n"+(e.message||"Error desconocido"));
    }
  }finally{
    $btn.disabled = false;
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
