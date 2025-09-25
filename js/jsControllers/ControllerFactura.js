import {
  getFacturas,
  getPedidoById,
  getPlatillos,
  getPlatilloById,
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
let $tbody,$search,$date,$rangeInfo;

/* ========================= Init ========================= */
document.addEventListener("DOMContentLoaded", async () => {
  $tbody=$("#invoicesTableBody"); $search=$("#searchInput"); $date=$("#dateFilter");
  $rangeInfo=$("#rangeInfo");

  // selector “Mostrar”
  const $itemsPerPage = $("#itemsPerPage");
  if ($itemsPerPage) {
    $itemsPerPage.addEventListener("change", async () => {
      state.size = Number($itemsPerPage.value || 10);
      state.page = 0;
      await loadAndRender();
    });
  }

  attachFilters();
  attachTableDelegation();      // Delegación de eventos en tbody
  attachModalClose();           // Cierre de modales globalmente

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

/* ========================= Delegación en tabla ========================= */
function attachTableDelegation(){
  if (!$tbody) return;
  $tbody.addEventListener("click", (e) => {
    const btnDet = e.target.closest(".btn-detalles");
    if (btnDet) { onShowDetails(btnDet); return; }
  });
}

function attachModalClose() {
  const closeModalBtn = $("#closeModalBtn");
  if (closeModalBtn) closeModalBtn.onclick = () => document.getElementById('detailsModal').classList.add('hidden');
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

// resolver platillo (lista precargada -> API byId -> null)
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
    renderRows(items); renderPagination();
  }catch(e){
    console.error(e);
    $tbody.innerHTML=`<tr><td colspan="6" class="px-8 py-12 text-center">
      <div class="flex flex-col items-center">
        <i class="fas fa-triangle-exclamation text-4xl text-red-400 mb-3"></i>
        <div class="text-gray-600">No se pudieron cargar las facturas.</div>
      </div>
    </td></tr>`;
  }
}

function renderPagination(){
  const $pc = $("#paginationContainer");
  const $pn = $("#pageNumbers");
  const $prev = $("#prevPage");
  const $next = $("#nextPage");
  const $cur  = $("#currentPage");
  const $tot  = $("#totalPages");

  if (!$pc || !$pn || !$prev || !$next || !$cur || !$tot) return;

  if (state.totalPages <= 1) { $pc.style.display = "none"; return; }
  $pc.style.display = "flex";

  $pn.innerHTML = "";
  $cur.textContent = String(state.page + 1);
  $tot.textContent = String(state.totalPages);

  const mkBtn = (n) => {
    const b = document.createElement("button");
    b.className = `pagination-btn ${n===state.page+1?'active':''}`;
    b.textContent = String(n);
    if (n !== state.page+1) {
      b.addEventListener("click", async () => { state.page = n-1; await loadAndRender(); });
    }
    return b;
  };

  const win = 5;
  let s = Math.max(1, state.page + 1 - Math.floor(win/2));
  let e = Math.min(state.totalPages, s + win - 1);
  if (e - s + 1 < win) s = Math.max(1, e - win + 1);
  for (let p = s; p <= e; p++) $pn.appendChild(mkBtn(p));

  $prev.onclick = async () => { if (state.page > 0) { state.page -= 1; await loadAndRender(); } };
  $next.onclick = async () => { if (state.page < state.totalPages - 1) { state.page += 1; await loadAndRender(); } };
}

function renderRows(items){
  $tbody.innerHTML="";
  if(!items.length){
    $tbody.innerHTML=`<tr><td colspan="6" class="px-8 py-12 text-center">
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
          <!-- Eliminamos el botón de editar -->
        </div>
      </td>`;
    $tbody.appendChild(tr);
    fillClienteFecha(tr,idPedido);
  });
}

async function fillClienteFecha(tr,idPedido){
  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }
    const cliente=getV(ped,"NombreCliente","nombreCliente") || getV(ped,"Nombrecliente","nombrecliente") || "-";
    const fechaRaw=getV(ped,"FPedido","fPedido") || "-";
    tr.querySelector(".js-cli").textContent=cliente;
    tr.querySelector(".js-fecha").textContent=fmtDate(fechaRaw);
  }catch{
    tr.querySelector(".js-cli").textContent="-";
    tr.querySelector(".js-fecha").textContent="-";
  }
}

/* ========================= Detalles ========================= */
async function onShowDetails(btnOrEvent){
  const tr = btnOrEvent instanceof Event
    ? btnOrEvent.currentTarget.closest("tr")
    : btnOrEvent.closest("tr");

  if (!tr) return;

  const idFactura=Number(tr.dataset.fid);
  const idPedido =Number(tr.dataset.pid);

  const $mb=$("#modalProductsBody");
  $("#modalInvoiceNumber").textContent=fmtPref(idFactura,"FAC-");
  $("#modalOrderNumber").textContent  =fmtPref(idPedido,"PED-");
  $("#modalClientName").textContent   ="-";
  $("#modalDate").textContent         ="-";
  $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>`;

  openModal("detailsModal");

  try{
    let ped=state.pedidoCache.get(idPedido);
    if(!ped){ ped=await getPedidoById(idPedido); state.pedidoCache.set(idPedido,ped); }

    const cliente=getV(ped,"NombreCliente","nombreCliente") || getV(ped,"Nombrecliente","nombrecliente") || "-";
    const fechaRaw=getV(ped,"FPedido","fPedido") || "-";
    const items = Array.isArray(ped.Items) ? ped.Items : (Array.isArray(ped.items) ? ped.items : []);

    $("#modalClientName").textContent = cliente;
    $("#modalDate").textContent       = fmtDate(fechaRaw);

    $mb.innerHTML="";
    let subtotalCalc = 0;

    if (items.length === 0) {
      const trEmpty = document.createElement("tr");
      trEmpty.innerHTML = `<td colspan="4" class="px-4 py-6 text-center text-gray-500">Este pedido no tiene líneas de detalle.</td>`;
      $mb.appendChild(trEmpty);
    } else {
      for (const it of items) {
        const idPlat = getV(it,"IdPlatillo","idPlatillo");
        const cant   = safeNum(getV(it,"Cantidad","cantidad")) || 0;
        let unit     = safeNum(getV(it,"PrecioUnitario","precioUnitario"));

        let pl = await resolvePlatillo(idPlat);
        const nombre = pl?.nombre ?? `Platillo #${idPlat}`;
        if (!unit || unit <= 0) unit = pl?.precio ?? 0;

        const subRow = round2(unit * cant);
        subtotalCalc = round2(subtotalCalc + subRow);

        const trp = document.createElement("tr");
        trp.innerHTML = `
          <td class="px-4 py-3">${nombre}</td>
          <td class="px-4 py-3 text-right">${cant}</td>
          <td class="px-4 py-3 text-right">${unit ? money(unit) : "-"}</td>
          <td class="px-4 py-3 text-right">${money(subRow)}</td>`;
        $mb.appendChild(trp);
      }
    }

    const subV = safeNum(getV(ped,"Subtotal","subtotal")) || subtotalCalc;
    const prop = safeNum(getV(ped,"Propina","propina"))  || round2(subV * 0.10);
    const totV = safeNum(getV(ped,"TotalPedido","totalPedido")) || round2(subV + prop);

    $("#modalSubtotal").textContent = money(subV);
    $("#modalTip").textContent      = money(prop);
    $("#modalTotal").textContent    = money(totV);

  }catch(e){
    console.error("Detalles modal error:", e);
    $mb.innerHTML=`<tr><td colspan="4" class="px-4 py-6 text-center text-red-400">No se pudo cargar el pedido.</td></tr>`;
    $("#modalSubtotal").textContent="—";
    $("#modalTip").textContent     ="—";
    $("#modalTotal").textContent   ="—";
  }
}

// Definir openModal
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove("hidden");
    el.style.display = "flex";
    el.style.zIndex = 9999;
    el.setAttribute("aria-hidden", "false");
  }
}
