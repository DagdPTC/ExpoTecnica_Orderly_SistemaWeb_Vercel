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
    page: 0, 
    size: 10, 
    totalPages: 0, 
    totalElements: 0,
    search: "", 
    date: "",
    platillos: [],           // [{id, nombre, precio}]
    estadosFactura: [],      // [{Id, EstadoFactura}] - derivados de facturas
    pedidoCache: new Map(),  // id -> PedidoDTO
};

const $ = (s) => document.querySelector(s);
const clamp  = (n, a, b) => Math.min(Math.max(Number(n)||0, a), b);
const round2 = (x) => Math.round((Number(x)||0) * 100) / 100;
const money  = (n) => Number(n ?? 0).toLocaleString("es-SV",{style:"currency",currency:"USD",minimumFractionDigits:2});
const fmtPref= (id,pfx)=>`${pfx}${String(Number(id||0)).padStart(4,"0")}`;
const safeNum= (v)=> (Number.isFinite(Number(v))?Number(v):0);
const getV   = (obj,K1,K2)=>(K1 in obj?obj[K1]:obj[K2]);

/* ---------- helper paths & pick ---------- */
const path = (obj, p) => p?.toString().split('.').reduce((a,k)=> (a && a[k]!==undefined ? a[k] : undefined), obj);
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

const detailsArray=(ped)=>{
    for(const k of DETAIL_KEYS){
        const v = ped?.[k];
        if(Array.isArray(v) && v.length) return v;
    }
    for(const k of DETAIL_KEYS){
        const v = ped?.pedido?.[k];
        if(Array.isArray(v) && v.length) return v;
    }
    return [];
};

const firstDetail=(ped)=>{ 
    const d = detailsArray(ped); 
    return d[0]; 
};

/* ---------- fechas/horas ---------- */
function toDate(val){
    if(!val) return null;
    if(val instanceof Date) return val;
    if(typeof val === "number") return new Date(val);
    const s = String(val).replace(" ", "T");
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatHora(val){
    const d = toDate(val);
    if(!d) return "-";
    return d.toLocaleTimeString("es-SV",{hour:"2-digit",minute:"2-digit",hour12:false});
}

function formatFecha(val){
    const d = toDate(val);
    if(!d) return "-";
    return d.toLocaleDateString("es-SV",{day:"2-digit",month:"2-digit",year:"numeric"});
}

/* ========================= DOM refs ========================= */
let $tbody, $search, $date;
let $itemsPerPage, $pagContainer, $prev, $next, $nums, $curr, $tot;

/* ========================= Init ========================= */
document.addEventListener("DOMContentLoaded", async () => { 
    await initializeApp(); 
});

async function initializeApp() {
    try {
        initializeDOMReferences();
        attachFilters();
        attachPaginationEvents();
        attachModalEvents();

        // Habilitar scroll horizontal sin tocar HTML
        makeTableResponsive();

        await preloadPlatillos();
        await loadAndRender();
        console.log("Aplicación de facturas inicializada correctamente");
    } catch (error) {
        console.error("Error al inicializar la aplicación:", error);
        showNotification("Error al cargar la aplicación", "error");
    }
}

function makeTableResponsive(){
    const container = document.querySelector(".table-container");
    if (container) container.classList.add("overflow-x-auto");
    const table = container?.querySelector("table");
    // Forzamos un ancho mínimo para permitir el scroll en pantallas pequeñas
    if (table) table.classList.add("min-w-[1000px]");
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
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            $("#editModal")?.classList.add("hidden");
            $("#detailsModal")?.classList.add("hidden");
            $("#confirmModal")?.classList.add("hidden");
        }
    });
    document.querySelectorAll(".modal-overlay").forEach(modal => {
        modal.addEventListener("click", (e) => { 
            if (e.target === modal) modal.classList.add("hidden"); 
        });
    });
}

/* ========================= Filtros ========================= */
function attachFilters(){
    let t;
    $search?.addEventListener("input",()=>{
        clearTimeout(t);
        t=setTimeout(async()=>{ 
            state.search=$search.value.trim(); 
            state.page=0; 
            await loadAndRender(); 
        },300);
    });
    $date?.addEventListener("change",async()=>{ 
        state.date=$date.value||""; 
        state.page=0; 
        await loadAndRender(); 
    });
}

/* ========================= Preloads ========================= */
async function preloadPlatillos(){
    try{
        const page=await getPlatillos(0,50);
        const content=Array.isArray(page?.content)?page.content:[];
        state.platillos=content.map(x=>({ 
            id: getV(x,"Id","id"), 
            nombre: getV(x,"NomPlatillo","nomPlatillo"), 
            precio: Number(getV(x,"Precio","precio")||0) 
        }));
    }catch(e){ 
        console.error("Error cargando platillos:", e);
        state.platillos=[]; 
    }
}

const findPlatilloLocally=(id)=> state.platillos.find(p=>String(p.id)===String(id))||null;

function mapPlatilloDTO(dto){
    if(!dto) return null;
    return { 
        id: getV(dto,"Id","id"), 
        nombre: getV(dto,"NomPlatillo","nomPlatillo","nombre"), 
        precio: Number(getV(dto,"Precio","precio")||0) 
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
    }catch(e){ 
        console.error("Error cargando platillo:", e);
        return null; 
    }
}

/* ====== Estados: extraer de facturas (incluye campos anidados) ====== */
function extractUniqueStatesFromInvoices(invoices) {
    const statesMap = new Map();
    invoices.forEach(invoice => {
        const estadoId = pick(
            invoice,
            "IdEstadoFactura",
            "idEstadoFactura",
            "estadoFactura.Id",
            "estadoFactura.id",
            "estadoFactura.IdEstadoFactura",
            "estadoFactura.idEstadoFactura"
        );
        const estadoNombre = pick(
            invoice,
            "EstadoFactura",
            "estadoFactura",
            "estadoFactura.EstadoFactura",
            "estadoFactura.estadoFactura",
            "estadoFactura.nombre",
            "estadoFactura.nombreEstado",
            "estadoFactura.estado"
        );

        if (estadoId != null) {
            statesMap.set(String(estadoId), {
                Id: estadoId,
                EstadoFactura: String(estadoNombre || `Estado #${estadoId}`)
            });
        }
    });
    return Array.from(statesMap.values());
}

const getEstadoFacturaById=(id)=> {
    return state.estadosFactura.find(e => String(e.Id) === String(id)) || null;
};

/* ========================= Tabla ========================= */
async function loadAndRender(){
    try{
        $tbody.innerHTML=`<tr><td colspan="9" class="px-8 py-10 text-center text-gray-400">Cargando facturas...</td></tr>`;
        const page = await getFacturas(state.page, state.size);
        const items = Array.isArray(page?.content) ? page.content : [];
        
        state.totalElements = Number(page?.totalElements || 0);
        state.totalPages = Number(page?.totalPages || 0);
        state.page = Number(page?.number || 0);
        state.size = Number(page?.size || state.size);

        // Refrescar catálogo local de estados a partir de las facturas cargadas
        const found = extractUniqueStatesFromInvoices(items);
        const map = new Map(state.estadosFactura.map(e => [String(e.Id), e]));
        found.forEach(e => map.set(String(e.Id), e));
        state.estadosFactura = Array.from(map.values());

        const filtered = items.filter(fx => {
            if(state.search){
                const idF = String(pick(fx,"Id","id") ?? "");
                const idP = String(pick(fx,"IdPedido","idPedido") ?? "");
                const txt = (idF + " " + idP).toLowerCase();
                if(!txt.includes(state.search.toLowerCase())) return false;
            }
            return true;
        });

        renderRows(filtered);
        renderPagination();
    }catch(e){
        console.error("Error cargando facturas:", e);
        $tbody.innerHTML=`<tr><td colspan="9" class="px-8 py-12 text-center text-red-500">No se pudieron cargar las facturas.</td></tr>`;
        if ($pagContainer) $pagContainer.style.display = "none";
    }
}

function renderPagination(){
    const totalPages = Number(state.totalPages || 1);
    const number     = Number(state.page || 0);
    if(!$pagContainer||!$prev||!$next||!$nums||!$curr||!$tot) return;

    $curr.textContent = String(number + 1);
    $tot.textContent  = String(totalPages);

    $prev.disabled = number <= 0;
    $next.disabled = number >= totalPages - 1;

    $prev.onclick = async ()=>{ 
        if(state.page > 0){ 
            state.page--; 
            await loadAndRender(); 
        } 
    };
    $next.onclick = async ()=>{ 
        if(state.page < totalPages - 1){ 
            state.page++; 
            await loadAndRender(); 
        } 
    };

    $nums.innerHTML = "";
    const max = 5;
    let start = Math.max(0, number - Math.floor(max/2));
    let end = Math.min(totalPages-1, start+max-1);
    if (end - start + 1 < max) start = Math.max(0, end - max + 1);
    
    for (let i = start; i <= end; i++){
        const b = document.createElement("button");
        b.className = `pagination-btn ${i===number?"active":""}`;
        b.textContent = String(i+1);
        if(i!==number) b.onclick = async() => { 
            state.page = i; 
            await loadAndRender(); 
        };
        $nums.appendChild(b);
    }
    $pagContainer.style.display = totalPages > 1 ? "flex" : "none";
}

/* ===== Colores del estado (ajuste para "sin pagar" en amarillo) ===== */
function getEstadoBadgeClass(estado) {
    const s = (estado || "").toLowerCase();
    // Rojo para cancelado/anulado
    if (s.includes("anul") || s.includes("cancel")) return "bg-red-100 text-red-800";
    // Amarillo para no pagado / sin pagar / impago / pendiente
    if (
        s.includes("sin pag") ||
        s.includes("no pag") ||
        s.includes("impag") ||
        s.includes("pend")
    ) return "bg-yellow-100 text-yellow-800";
    // Verde para pagado/completado/cobrado (evitando falsos positivos por "sin pagar")
    if (s.includes("pag")) return "bg-green-100 text-green-800";
    // Gris por defecto
    return "bg-gray-100 text-gray-800";
}

function renderRows(items){
    $tbody.innerHTML = "";
    if(!items.length){
        $tbody.innerHTML=`<tr><td colspan="9" class="px-8 py-12 text-center text-gray-500">No se encontraron facturas</td></tr>`;
        return;
    }

    items.forEach(fx => {
        const idFactura = pick(fx,"Id","id");
        const idPedido = pick(fx,"IdPedido","idPedido");
        const desc = safeNum(pick(fx,"Descuento","descuento"));
        const totalFx = safeNum(pick(fx,"Total","total"));

        // Soporta campos anidados de estado
        const estadoFacturaId = pick(
            fx,
            "IdEstadoFactura",
            "idEstadoFactura",
            "estadoFactura.Id",
            "estadoFactura.id",
            "estadoFactura.IdEstadoFactura",
            "estadoFactura.idEstadoFactura"
        );
        const estadoFacturaNombre = pick(
            fx,
            "EstadoFactura",
            "estadoFactura",
            "estadoFactura.EstadoFactura",
            "estadoFactura.estadoFactura",
            "estadoFactura.nombre",
            "estadoFactura.nombreEstado",
            "estadoFactura.estado"
        );

        const estadoFromCatalog = getEstadoFacturaById(estadoFacturaId);
        const estadoNombreFinal =
            (estadoFromCatalog?.EstadoFactura) ||
            (estadoFacturaNombre ? String(estadoFacturaNombre) : "Pendiente");

        const tr = document.createElement("tr");
        tr.className = "table-row hover:bg-gray-50";
        tr.dataset.fid = idFactura; 
        tr.dataset.pid = idPedido;
        tr.dataset.desc = String(desc); 
        tr.dataset.totalfx = String(totalFx);
        tr.dataset.estado = (estadoFacturaId ?? "");
        tr.dataset.estadoname = estadoNombreFinal;

        tr.innerHTML = `
            <td class="px-8 py-6 text-sm font-bold text-gray-900">
                <div class="flex items-center">
                    <div class="w-3 h-3 rounded-full bg-green-400 mr-3"></div>
                    ${fmtPref(idFactura,"FAC-")}
                </div>
            </td>
            <td class="px-8 py-6 text-sm text-gray-600 font-medium">${fmtPref(idPedido,"PED-")}</td>
            <td class="px-8 py-6 text-sm text-gray-700 font-medium js-cli">-</td>
            <td class="px-8 py-6 text-sm text-gray-600 js-fecha">-</td>
            <td class="px-8 py-6 text-sm text-gray-600 js-hora-inicio">-</td>
            <td class="px-8 py-6 text-sm text-gray-600 js-hora-fin">-</td>
            <td class="px-8 py-6">
                <span class="px-3 py-1 rounded-full text-xs font-semibold estado-badge ${getEstadoBadgeClass(estadoNombreFinal)}">
                    ${estadoNombreFinal}
                </span>
            </td>
            <td class="px-8 py-6">
                <button class="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 py-2 rounded-lg transition-all text-sm btn-detalles">
                    <i class="fas fa-eye mr-2"></i>Ver Detalles
                </button>
            </td>
            <td class="px-8 py-6 text-right">
                <div class="flex justify-end space-x-2">
                    <button class="bg-green-50 hover:bg-green-100 text-green-600 p-3 rounded-xl transition-all btn-editar" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bg-red-50 hover:bg-red-100 text-red-600 p-3 rounded-xl transition-all btn-eliminar" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>`;
        
        $tbody.appendChild(tr);
        tr.querySelector(".btn-detalles").addEventListener("click", onShowDetails);
        tr.querySelector(".btn-editar").addEventListener("click", onOpenEdit);
        tr.querySelector(".btn-eliminar").addEventListener("click", onAskDelete);
        fillClienteHoras(tr, idPedido);
    });
}

async function fillClienteHoras(tr, idPedido){
    try{
        let ped = state.pedidoCache.get(idPedido);
        if(!ped){ 
            ped = await getPedidoById(idPedido); 
            state.pedidoCache.set(idPedido, ped); 
        }

        const cliente = (
            pick(ped,'Nombrecliente','nombrecliente','nombreCliente') ??
            pick(ped,'cliente.nombre','persona.nombre','cliente.persona.nombre') ?? "-"
        );

        const fechaBase = pick(ped,'FechaPedido','fechaPedido','FPedido','fPedido','HoraInicio','horaInicio');
        const horaInicio = pick(ped,'HoraInicio','horaInicio','FechaPedido','fechaPedido');
        const horaFin = pick(ped,'HoraFin','horaFin');

        tr.querySelector(".js-cli").textContent = String(cliente);
        tr.querySelector(".js-fecha").textContent = formatFecha(fechaBase);
        tr.querySelector(".js-hora-inicio").textContent = formatHora(horaInicio);
        tr.querySelector(".js-hora-fin").textContent = formatHora(horaFin);
    }catch(e){
        console.error("Error llenando datos cliente:", e);
        tr.querySelector(".js-cli").textContent = "-";
        tr.querySelector(".js-fecha").textContent = "-";
        tr.querySelector(".js-hora-inicio").textContent = "-";
        tr.querySelector(".js-hora-fin").textContent = "-";
    }
}

/* ========================= Detalles ========================= */
async function onShowDetails(ev){
    const tr = ev.currentTarget.closest("tr");
    const idFactura = Number(tr.dataset.fid);
    const idPedido = Number(tr.dataset.pid);

    const estadoFacturaId = tr.dataset.estado;
    const estadoLabel =
        tr.dataset.estadoname ||
        getEstadoFacturaById(estadoFacturaId)?.EstadoFactura ||
        "Pendiente";

    const $modal = $("#detailsModal");
    if(!$modal) return alert("Agrega el modal de detalles al HTML.");

    $("#modalInvoiceNumber").textContent = fmtPref(idFactura,"FAC-");
    $("#modalOrderNumber").textContent = fmtPref(idPedido,"PED-");

    const $cli = $("#modalClientName"),
          $fecha = $("#modalDate"),
          $hIni = $("#modalHoraInicio"),
          $hFin = $("#modalHoraFin"),
          $estado = $("#modalEstado");
    const $mb = $("#modalProductsBody"),
          $sub = $("#modalSubtotal"),
          $tip = $("#modalTip"),
          $tot = $("#modalTotal");

    $mb.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-gray-400">Cargando...</td></tr>`;

    try{
        let ped = state.pedidoCache.get(idPedido);
        if(!ped){ 
            ped = await getPedidoById(idPedido); 
            state.pedidoCache.set(idPedido, ped); 
        }

        const cliente = (
            pick(ped,'Nombrecliente','nombrecliente','nombreCliente') ??
            pick(ped,'cliente.nombre','persona.nombre','cliente.persona.nombre') ?? "-"
        );
        const fecha = pick(ped,'FechaPedido','fechaPedido','FPedido','fPedido','HoraInicio','horaInicio');
        const hIni  = pick(ped,'HoraInicio','horaInicio','FechaPedido','fechaPedido');
        const hFin  = pick(ped,'HoraFin','horaFin');

        $cli.textContent = cliente;
        $fecha.textContent = formatFecha(fecha);
        $hIni.textContent = formatHora(hIni);
        $hFin.textContent = formatHora(hFin);
        $estado.textContent = estadoLabel;
        $estado.className = `px-3 py-1 rounded-full text-xs font-semibold ${getEstadoBadgeClass(estadoLabel)}`;

        const lines = detailsArray(ped);
        $mb.innerHTML = "";
        let subtotalCalc = 0;

        if(lines.length){
            for(const it of lines){
                const idPlat = pick(it,'IdPlatillo','idPlatillo','platilloId','platillo.id');
                let nombre = pick(it,'nombre','nombrePlatillo','NomPlatillo','platillo.nombre','platillo.nomPlatillo');
                const cant = Number(pick(it,'Cantidad','cantidad','cant','qty') || 0);
                let unit = Number(pick(it,'precio','Precio','precioUnitario','precio_unitario','platillo.precio') || 0);
                let sub = Number(pick(it,'subtotal','Subtotal','importe','importeLinea') || 0);

                if(!nombre && idPlat != null){
                    const pl = findPlatilloLocally(idPlat) || await getPlatilloSafeById(idPlat);
                    if(pl){ 
                        nombre = pl.nombre; 
                        if(unit <= 0) unit = Number(pl.precio || 0); 
                    }
                }
                if(sub <= 0) sub = round2((unit > 0 ? unit : 0) * (cant > 0 ? cant : 0));
                subtotalCalc = round2(subtotalCalc + sub);

                const trp = document.createElement("tr");
                trp.innerHTML = `
                    <td class="px-4 py-3">${nombre || `Platillo #${idPlat ?? '—'}`}</td>
                    <td class="px-4 py-3 text-right">${cant || 0}</td>
                    <td class="px-4 py-3 text-right">${unit ? money(unit) : "-"}</td>
                    <td class="px-4 py-3 text-right">${money(sub)}</td>`;
                $mb.appendChild(trp);
            }
        } else {
            const detalle = firstDetail(ped);
            const idPlat = pick(ped,'IdPlatillo','idPlatillo','id_platillo','platilloId') ??
                           pick(detalle||{},'IdPlatillo','idPlatillo','platilloId','platillo.id');
            const cant = Number(pick(ped,'Cantidad','cantidad') ?? pick(detalle||{},'Cantidad','cantidad','cant','qty')) || 1;
            const subV = Number(pick(ped,'Subtotal','subtotal') ?? pick(detalle||{},'subtotal','Subtotal','importe','importeLinea')) || 0;

            let nombre = pick(detalle||{},'nombre','nombrePlatillo','platillo.nombre');
            let unit = Number(pick(detalle||{},'precio','Precio','precioUnitario','precio_unitario','platillo.precio') || 0);

            if(!nombre && idPlat != null){
                const pl = findPlatilloLocally(idPlat) || await getPlatilloSafeById(idPlat);
                if(pl){ 
                    nombre = pl.nombre; 
                    if(unit <= 0) unit = Number(pl.precio || 0); 
                }
            }
            const unitFinal = unit > 0 ? unit : (cant > 0 ? round2(subV/cant) : 0);
            subtotalCalc = subV || round2(unitFinal * cant);

            const trp = document.createElement("tr");
            trp.innerHTML = `
                <td class="px-4 py-3">${nombre || `Platillo #${idPlat ?? '—'}`}</td>
                <td class="px-4 py-3 text-right">${cant}</td>
                <td class="px-4 py-3 text-right">${unitFinal ? money(unitFinal) : "-"}</td>
                <td class="px-4 py-3 text-right">${money(subtotalCalc)}</td>`;
            $mb.appendChild(trp);
        }

        const prop = Number(pick(ped,'Propina','propina')) || round2(subtotalCalc * 0.10);
        const totalPedido = round2(subtotalCalc + prop);

        let descuentoMonto = 0;
        const totalFx = safeNum(tr.dataset.totalfx || 0);
        if(totalFx > 0){
            const diff = round2(totalPedido - totalFx);
            if(diff > 0) descuentoMonto = diff;
        }
        const totalFinal = round2(Math.max(0, totalPedido - descuentoMonto));

        $sub.textContent = money(subtotalCalc);
        $tip.textContent = money(prop);
        $("#modalDiscount").textContent = money(descuentoMonto);
        $tot.textContent = money(totalFinal);
    }catch(e){
        console.error("Error cargando detalles:", e);
        $mb.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-red-400">No se pudo cargar el pedido.</td></tr>`;
        $("#modalClientName").textContent = "-";
        $("#modalDate").textContent = "-";
        $("#modalHoraInicio").textContent = "-";
        $("#modalHoraFin").textContent = "-";
        $("#modalEstado").textContent = "-";
        $("#modalSubtotal").textContent = "—"; 
        $("#modalTip").textContent = "—"; 
        $("#modalDiscount").textContent = "—"; 
        $("#modalTotal").textContent = "—";
    }

    $modal.classList.remove("hidden");
    $("#closeModalBtn").onclick = () => $modal.classList.add("hidden");
}

/* ========================= Notificaciones ========================= */
function showNotification(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `fixed top-4 right-4 p-4 rounded-xl shadow-lg z-50 transform transition-all duration-300 ${
        type === "success" ? "bg-green-500 text-white" :
        type === "error" ? "bg-red-500 text-white" :
        "bg-blue-500 text-white"
    }`;
    toast.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${ type === "success" ? "fa-check-circle" : type === "error" ? "fa-exclamation-triangle" : "fa-info-circle" } mr-2"></i>
            <span>${message}</span>
        </div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = "translateX(100%)";
        setTimeout(() => { 
            if(toast.parentNode) toast.parentNode.removeChild(toast); 
        }, 300);
    }, 5000);
}

/* ========================= Editar (descuento + estado) ========================= */
let currentEdit = { factura: null, pedido: null };

function renderPlatillosTable(platillos) {
    const $tableBody = $("#editPlatillosTableBody");
    if (!$tableBody) return;
    $tableBody.innerHTML = "";
    
    if (!platillos || !platillos.length) {
        $tableBody.innerHTML = `<tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">No hay platillos en este pedido</td></tr>`;
        $("#editSubtotal").textContent = "$0.00";
        $("#editPropina").textContent = "$0.00";
        $("#editTotalPedido").textContent = "$0.00";
        return { subtotal:0, propina:0, totalPedido:0 };
    }
    
    let subtotalTotal = 0;
    platillos.forEach((p, i) => {
        const sub = round2(p.precio * p.cantidad);
        subtotalTotal += sub;
        
        const tr = document.createElement("tr");
        tr.className = i % 2 === 0 ? "bg-white" : "bg-gray-50";
        tr.innerHTML = `
            <td class="px-4 py-3 text-sm text-gray-900">${p.nombre}</td>
            <td class="px-4 py-3 text-sm text-gray-600 text-right">${p.cantidad}</td>
            <td class="px-4 py-3 text-sm text-gray-600 text-right">${money(p.precio)}</td>
            <td class="px-4 py-3 text-sm text-gray-900 font-medium text-right">${money(sub)}</td>`;
        $tableBody.appendChild(tr);
    });
    
    const propina = round2(subtotalTotal * 0.10);
    const totalPedido = round2(subtotalTotal + propina);
    
    $("#editSubtotal").textContent = money(subtotalTotal);
    $("#editPropina").textContent = money(propina);
    $("#editTotalPedido").textContent = money(totalPedido);
    
    return { subtotal: subtotalTotal, propina, totalPedido };
}

function refreshPreview() {
    const descuentoPct = clamp(Number($("#editDescuento").value) || 0, 0, 100);
    const totalPedido = parseFloat($("#editTotalPedido").textContent.replace(/[^\d.-]/g,'')) || 0;
    const descuentoMonto = round2(totalPedido * (descuentoPct/100));
    const totalFactura = round2(Math.max(0, totalPedido - descuentoMonto));
    
    $("#editDescuentoMonto").textContent = money(descuentoMonto);
    $("#editPreviewTotalFactura").textContent = money(totalFactura);
}

async function onOpenEdit(ev) {
    const tr = ev.currentTarget.closest("tr");
    const idFactura = Number(tr.dataset.fid);
    const idPedido = Number(tr.dataset.pid);
    const estadoFacturaId = tr.dataset.estado;

    currentEdit = { factura: { id: idFactura }, pedido: null };

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

    $("#editFacturaId").value = idFactura;
    $("#editPedidoId").value = idPedido;
    $("#editFacturaNum").value = fmtPref(idFactura, "FAC-");
    $("#editPedidoNum").value = fmtPref(idPedido, "PED-");

    const ped = currentEdit.pedido;
    $("#editHoraInicio").value = formatHora(pick(ped,'HoraInicio','horaInicio','FechaPedido','fechaPedido'));
    $("#editHoraFin").value = formatHora(pick(ped,'HoraFin','horaFin'));

    // Construye el catálogo del select desde lo que tengamos
    const $estadoSelect = $("#editEstadoFactura");
    $estadoSelect.innerHTML = '<option value="">Seleccionar estado</option>';

    // Asegurar que el estado actual siempre esté disponible
    const currentName =
        (getEstadoFacturaById(estadoFacturaId)?.EstadoFactura) ||
        pick(ped,
             "EstadoFactura","estadoFactura",
             "estadoFactura.EstadoFactura","estadoFactura.estadoFactura",
             "estadoFactura.nombre","estadoFactura.nombreEstado","estadoFactura.estado") ||
        tr.dataset.estadoname ||
        `Estado #${estadoFacturaId || "-"}`;

    const map = new Map(state.estadosFactura.map(e => [String(e.Id), e]));
    if (!map.has(String(estadoFacturaId)) && (estadoFacturaId != null && estadoFacturaId !== "")) {
        map.set(String(estadoFacturaId), { Id: estadoFacturaId, EstadoFactura: String(currentName) });
    }
    const options = Array.from(map.values());

    options.forEach(estado=>{
        const opt = document.createElement("option");
        opt.value = estado.Id;
        opt.textContent = estado.EstadoFactura;
        if(String(estado.Id) === String(estadoFacturaId)) {
            opt.selected = true;
        }
        $estadoSelect.appendChild(opt);
    });

    const detalles = detailsArray(ped);
    const platillosData = [];
    
    for(const d of detalles){
        const idPlat = pick(d,'IdPlatillo','idPlatillo','platilloId','platillo.id');
        const cantidad = Math.max(1, Number(pick(d,'Cantidad','cantidad')) || 1);
        
        if(idPlat){
            const pl = findPlatilloLocally(idPlat) || await getPlatilloSafeById(idPlat);
            platillosData.push({ 
                id: idPlat, 
                nombre: pl?.nombre ?? `Platillo #${idPlat}`, 
                precio: pl?.precio ?? 0, 
                cantidad 
            });
        }
    }
    
    const totales = renderPlatillosTable(platillosData);

    const descuentoActual = safeNum(tr.dataset.desc || 0);
    const totalPedidoActual = totales?.totalPedido || safeNum(pick(ped, 'TotalPedido','totalPedido','total')) || 1;
    const descuentoPctActual = totalPedidoActual > 0 ? round2((descuentoActual/totalPedidoActual)*100) : 0;
    
    $("#editDescuento").value = clamp(descuentoPctActual, 0, 100);
    $("#editDescuento").addEventListener("input", refreshPreview);
    refreshPreview();

    $("#editModal").classList.remove("hidden");
    $("#saveInvoiceBtn").onclick = onSaveEdit;
    $("#cancelEditBtn").onclick = () => {
        $("#editModal").classList.add("hidden");
        $("#editDescuento").oninput = null;
    };
}

async function onSaveEdit() {
    const idFactura = Number($("#editFacturaId").value);
    const idPedido  = Number($("#editPedidoId").value);

    const $btn = $("#saveInvoiceBtn");
    const original = $btn.innerHTML;
    $btn.disabled = true; 
    $btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';

    try {
        const descuentoPct = Number($("#editDescuento").value) || 0;
        const idEstadoFactura = Number($("#editEstadoFactura").value);
        
        if (descuentoPct < 0 || descuentoPct > 100) {
            throw new Error("El descuento debe estar entre 0% y 100%");
        }
        if (!idEstadoFactura) {
            throw new Error("Debe seleccionar un estado de factura");
        }

        const payload = { 
            IdPedido: idPedido, 
            DescuentoPct: descuentoPct, 
            IdEstadoFactura: idEstadoFactura 
        };
        
        console.log("Enviando payload:", payload);
        
        await updateFacturaCompleta(idFactura, payload);

        $("#editModal").classList.add("hidden");
        state.pedidoCache.delete(idPedido);
        await loadAndRender();
        showNotification("Factura actualizada correctamente", "success");
    } catch (error) {
        console.error("Error al actualizar factura:", error);
        showNotification(`Error al actualizar: ${error.message}`, "error");
    } finally {
        $btn.disabled = false; 
        $btn.innerHTML = original;
    }
}

/* ========================= Eliminar ========================= */
function onAskDelete(ev){
    const tr = ev.currentTarget.closest("tr");
    const id = Number(tr.dataset.fid);
    const $m = $("#confirmModal"), $ok = $("#confirmDeleteBtn"), $cc = $("#cancelDeleteBtn");
    
    $ok.dataset.id = id; 
    $m.classList.remove("hidden");
    
    $ok.onclick = async() => {
        try{ 
            await deleteFactura(Number($ok.dataset.id)); 
            $m.classList.add("hidden"); 
            await loadAndRender();
            showNotification("Factura eliminada correctamente", "success");
        } catch(e) { 
            console.error("Error eliminando factura:", e);
            showNotification("No se pudo eliminar la factura", "error");
        }
    };
    
    $cc.onclick = () => $m.classList.add("hidden");
}
