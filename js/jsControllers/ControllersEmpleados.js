import{

    getEmpleado,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado
} from "../jsService/ServiceEmpleado.js";

document.addEventListener("DOMContentLoaded", () =>{

    const tableBody = document.querySelector("#EmpleadosTable tbody");
    const form = document.getElementById("employeeForm");
    const modal = new boostrap.Modal ( document.getElementById("employeeModal") )
    const lbModal = document.getElementById("modalTitle")
    const btnAdd = document.getElementById("addEmployeeBtn");

    btnAdd.addEventListener("click", ()=>{
            form.reset();
            form.id.value = ""; // como estamos agregando no necesitamos ID
            lbModal.textContent = "Agregar Categoria"
            modal.show();

    });

    form.addEventListener("submit", async (e) =>{ 
        e.preventDefault();//evita que el formulario se envie
        const id = form.id.value; // se obtiene el id del form
        const data = {
            PrimerNombre  :  form.firstName.value.trim(),
            SegundoNombre : form.secondName.value.trim(),
            ApellidoPaterno : form.lastNameP.value.trim(),
            ApellidoMaterno : form.lastNameM.value.trim(),
            FechaNacimiento: form.birthDate.value.trim(),
            telefono: form.phone.value.trim(),
            TipoDocumento    : form.docType.value.trim(),
            NumeroDocumento : form.docNumber.value.trim(),
            Rol: form.role.trim(),
            



        }
    })


});