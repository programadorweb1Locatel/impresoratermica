/**
 * Servicio de consulta directa a la API de Locatel
 */

export const API_URL_DEFECTO = "https://consultor344.locatel.com.ve/api";
export const URL_TUNEL_DEFECTO = API_URL_DEFECTO; 

export async function buscarProductoPorCodigo(codigo, endpointUrl = API_URL_DEFECTO) {
    if (!codigo) {
        throw new Error("Debes proporcionar un código de barras.");
    }

    const cleanBase = endpointUrl.replace(/\/check-price\/?$/, '').replace(/\/+$/, '');
    const encoded = encodeURIComponent(codigo.trim());
    const directUrl = `${cleanBase}/check-price?code=${encoded}`;

    try {
        const respuesta = await fetch(directUrl);

        if (!respuesta.ok) {
            throw new Error(`Error (${respuesta.status}): Producto no encontrado o problema en el servidor.`);
        }

        const datos = await respuesta.json();

        if (!datos || !datos.description) {
            throw new Error(`El código ${codigo} no se encuentra registrado en el sistema.`);
        }

        return datos;
    } catch (error) {
        // En caso de bloqueo por CORS en el navegador durante desarrollo, probar fallback relativo /api
        if (error.name === 'TypeError' && directUrl.startsWith('http')) {
            try {
                const resFallback = await fetch(`/api/check-price?code=${encoded}`);
                if (resFallback.ok) {
                    const datosFallback = await resFallback.json();
                    if (datosFallback && datosFallback.description) {
                        return datosFallback;
                    }
                }
            } catch {
                // Si el fallback tampoco responde, lanzamos el error original
            }
        }
        throw error;
    }
}
