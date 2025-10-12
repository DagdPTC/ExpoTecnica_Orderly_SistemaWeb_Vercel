// js/jsService/ServiceFactura.js
const API_BASE = "https://orderly-api-b53514e40ebd.herokuapp.com";
const API_FACTURA = `${API_BASE}/apiFactura`;
const API_PEDIDO = `${API_BASE}/apiPedido`;
const API_PLATILLO = `${API_BASE}/apiPlatillo`;

function authFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});

    // Buscar token
    for (const k of ["jwt", "token", "authToken", "access_token"]) {
        const t = localStorage.getItem(k) || sessionStorage.getItem(k);
        if (t && !headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${t}`);
            break;
        }
    }

    if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
        credentials: "include",
        cache: "no-store",
        ...options,
        headers,
    });
}

/* ------------------------- FACTURA ---------------------------- */
export async function getFacturas(page = 0, size = 10) {
    try {
        const res = await authFetch(
            `${API_FACTURA}/getDataFactura?page=${page}&size=${size}`,
            { credentials: "include" }
        );
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return await res.json();
    } catch (error) {
        console.error("Error en getFacturas:", error);
        throw error;
    }
}

export async function getFacturaById(id) {
    try {
        const res = await authFetch(`${API_FACTURA}/getFacturaById/${id}`, {
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return await res.json();
    } catch (error) {
        console.error("Error en getFacturaById:", error);
        throw error;
    }
}

export async function updateFacturaCompleta(idFactura, payload) {
    try {
        console.log("Actualizando factura:", idFactura, payload);
        
        const res = await authFetch(`${API_FACTURA}/actualizarCompleto/${idFactura}`, {
            method: "PUT",
            body: JSON.stringify(payload),
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return res.status === 204 ? {} : await res.json();
    } catch (error) {
        console.error("Error en updateFacturaCompleta:", error);
        throw error;
    }
}

export async function updateFactura(idFactura, payload) {
    try {
        const res = await authFetch(`${API_FACTURA}/actualizarFactura/${idFactura}`, {
            method: "PUT",
            body: JSON.stringify(payload),
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return res.status === 204 ? {} : await res.json();
    } catch (error) {
        console.error("Error en updateFactura:", error);
        throw error;
    }
}

export async function deleteFactura(id) {
    try {
        const res = await authFetch(`${API_FACTURA}/eliminarFactura/${id}`, {
            method: "DELETE",
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return await res.json();
    } catch (error) {
        console.error("Error en deleteFactura:", error);
        throw error;
    }
}

/* ------------------------- PEDIDO ----------------------------- */
export async function getPedidoById(id) {
    try {
        const res = await authFetch(`${API_PEDIDO}/getPedidoById/${id}`, {
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        const json = await res.json();
        let p = json;
        
        if (p && typeof p === "object") {
            if (p.data) p = p.data;
            if (p.pedido) p = p.pedido;
            if (Array.isArray(p.content) && p.content.length === 1) p = p.content[0];
        }
        
        return p;
    } catch (error) {
        console.error("Error en getPedidoById:", error);
        throw error;
    }
}

export async function updatePedido(idPedido, payload) {
    try {
        const res = await authFetch(`${API_PEDIDO}/actualizarPedido/${idPedido}`, {
            method: "PUT",
            body: JSON.stringify(payload),
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return res.status === 204 ? {} : await res.json();
    } catch (error) {
        console.error("Error en updatePedido:", error);
        throw error;
    }
}

/* ------------------------ PLATILLO ---------------------------- */
export async function getPlatillos(page = 0, size = 50) {
    try {
        const safe = Math.max(1, Math.min(Number(size) || 10, 50));
        const res = await authFetch(
            `${API_PLATILLO}/getDataPlatillo?page=${page}&size=${safe}`,
            { credentials: "include" }
        );
        
        if (res.status === 204) {
            return { content: [], totalElements: 0, totalPages: 0, number: 0, size: safe };
        }
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        const text = await res.text();
        if (!text?.trim()) {
            return { content: [], totalElements: 0, totalPages: 0, number: 0, size: safe };
        }
        
        return JSON.parse(text);
    } catch (error) {
        console.error("Error en getPlatillos:", error);
        throw error;
    }
}

export async function getPlatilloById(id) {
    try {
        const res = await authFetch(`${API_PLATILLO}/getPlatilloById/${id}`, {
            credentials: "include",
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Error ${res.status}: ${errorText}`);
        }
        
        return await res.json();
    } catch (error) {
        console.error("Error en getPlatilloById:", error);
        throw error;
    }
}
