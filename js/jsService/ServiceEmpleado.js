const API_URL =  "http://localhost:8080/apiEmpleado"

 async function getEmpleados(){

    const res = await fetch(`${API_URL}/getDataEmpleado`);
    return res.json();
}


async function crateEmpleado(data) {
    await fetch (`${API_URL}/createEmpleado`,{
        method :"POST",
        headers:{"Content-Type" : "application/json"},
        body: JSON.stringify(data)
    });
    
}

async function updateEmpleado(id,data) {
     await fetch (`${API_URL}//modificarEmpleado/${id}`,{
        method :"PUT",
        headers:{"Content-Type" : "application/json"},
        body: JSON.stringify(data)
    });
    
}