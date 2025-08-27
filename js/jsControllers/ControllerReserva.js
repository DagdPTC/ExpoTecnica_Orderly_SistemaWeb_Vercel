import{

    getReserva,
    createReserva,
    updateReserva,
    deleteReserva
} from "../jsService/ServiceReservas,js";

document.addEventListener("DOMContentLoaded", () =>{

    const tableBody = document.querySelector("#reservations-container");
    const form = document.getElementById("reservation-form");
    const modal = new boostrap.Modal ( document.getElementById("reservation-modal") )
    const lbModal = document.getElementById("modal-title")
    const btnAdd = document.getElementById("add-reservation-btn");

    btnAdd.addEventListener("click", ()=>{
            form.reset();
            form.id.value = ""; 
            lbModal.textContent = "Agregar factura"
            modal.show();

    });

    form.addEventListener("submit", async (e) =>{ 
        e.preventDefault();//evita que el formulario se envie
        const id = form.id.value; // se obtiene el id del form
            const facturaData  = {
                    NombreCliente: document.getElementById("customer-name").value.trim(),
                    Telefono: document.getElementById("customer-phone").value.trim(),
                    FechaReserva: document.getElementById("reservation-date").value.trim(),
                    HoraInicio: document.getElementById("reservation-time").value.trim(),
                    Horafin: document.getElementById("reservation-end-time").value.trim(),
                    CantidadPersonas: document.getElementById("guest-count").value.trim(),
                    IdMesa: document.getElementById("tables-count").value.trim(), // ← depende si asignas mesa desde otro select
                    IdTipoReserva: 1,   // ejemplo: 1 = Normal, 2 = Cumpleaños, 3 = Evento
                    IdEstadoReserva: 1  // ejemplo: 1 = Pendiente, 2 = Confirmada, 3 = Cancelada
        };
        
        try{
            if(id){

                await updateReserva(id, facturaData );
            }
            else{
                await createReserva(facturaData);
            }
        }
        catch(err){


        }
    });


});