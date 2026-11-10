/**
 * Utilidades para generación y prueba de etiquetas térmicas en lenguaje ZPL II (Zebra Programming Language)
 * Diseñado para etiquetas estándar de 50mm x 30mm (203 DPI: 400x240 dots)
 */

import { formatDecimal, sanitizarTexto, dividirTexto } from './tsplGenerator';

/**
 * Genera código ZPL II a partir de los datos del producto (50mm x 30mm @ 203 DPI)
 */
export function generarZPL(datos) {
    if (!datos) return "";

    const rateDollar = (datos.rate && Number(datos.rate.dollar)) ? Number(datos.rate.dollar) : 1;
    const barCode = datos.barCode ? String(datos.barCode).trim() : "";
    const articleCode = datos.articleCode ? String(datos.articleCode).trim() : "";
    const lineasDesc = dividirTexto(datos.description, 27);
    const tieneDosLineas = lineasDesc.length > 1;

    const isPromo = Boolean(datos.promotion && typeof datos.promotion === 'object');

    if (isPromo) {
        // --- PLANTILLA PROMOCIÓN EN ZPL II ---
        const promo = datos.promotion;
        const promoName = sanitizarTexto(promo.name || "DESCUENTO").substring(0, 24);

        const promoBaseBs = promo.basePrice !== undefined ? Number(promo.basePrice) : 0;
        const promoTaxBs = promo.taxAmount !== undefined ? Number(promo.taxAmount) : 0;
        const refPromoBase = formatDecimal(promoBaseBs / rateDollar);
        const refPromoTax = formatDecimal(promoTaxBs / rateDollar);

        const refRegularVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);

        const refPromoVal = (promo.referencePrice !== undefined && promo.referencePrice !== null)
            ? promo.referencePrice
            : ((promo.priceWithTax || 0) / rateDollar);

        const refRegular = formatDecimal(refRegularVal);
        const refPromo = formatDecimal(refPromoVal);

        const zpl = [
            "^XA",
            "^PW400",          // Ancho: 50mm * 8 dots = 400 dots
            "^LL240",          // Alto: 30mm * 8 dots = 240 dots
            "^LH0,0",          // Origen
            "^CI28",           // Tabla de caracteres UTF-8
            
            // Banner superior invertido para promoción
            "^FO0,0^GB400,28,28,B,0^FS",
            `^FO20,5^A0N,20,20^FR^FD${promoName}^FS`
        ];

        if (tieneDosLineas) {
            zpl.push(`^FO15,34^A0N,20,20^FD${lineasDesc[0]}^FS`);
            zpl.push(`^FO15,54^A0N,20,20^FD${lineasDesc[1]}^FS`);
            zpl.push(`^FO15,76^A0N,16,16^FDREF. ${refPromoBase} + iva REF. ${refPromoTax}^FS`);
            zpl.push(`^FO15,98^A0N,20,20^FDTOTAL REF. ${refRegular}^FS`);
            zpl.push("^FO15,108^GB180,2,2^FS"); // Línea de tachado del precio anterior
            zpl.push("^FO15,124^A0N,22,22^FDREF.^FS");
            zpl.push(`^FO75,116^A0N,42,42^FD${refPromo}^FS`);
        } else {
            zpl.push(`^FO15,36^A0N,22,22^FD${lineasDesc[0]}^FS`);
            zpl.push(`^FO15,62^A0N,16,16^FDREF. ${refPromoBase} + iva REF. ${refPromoTax}^FS`);
            zpl.push(`^FO15,88^A0N,20,20^FDTOTAL REF. ${refRegular}^FS`);
            zpl.push("^FO15,98^GB180,2,2^FS"); // Línea de tachado
            zpl.push("^FO15,116^A0N,22,22^FDREF.^FS");
            zpl.push(`^FO75,108^A0N,44,44^FD${refPromo}^FS`);
        }

        // Código de barras Code 128 inferior y código de artículo
        if (barCode) {
            zpl.push(`^FO15,165^BY2,2,40^BCN,40,Y,N,N^FD${barCode}^FS`);
        }
        if (articleCode) {
            zpl.push(`^FO270,195^A0N,20,20^FD${articleCode}^FS`);
        }

        zpl.push("^XZ");
        return zpl.join("\r\n");

    } else {
        // --- PLANTILLA REGULAR EN ZPL II ---
        const baseBs = datos.prices?.base !== undefined ? Number(datos.prices.base) : 0;
        const taxAmountBs = datos.prices?.taxAmount !== undefined ? Number(datos.prices.taxAmount) : 0;

        const refBase = formatDecimal(baseBs / rateDollar);
        const refTax = formatDecimal(taxAmountBs / rateDollar);

        const refTotalVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);
        const refTotal = formatDecimal(refTotalVal);

        const zpl = [
            "^XA",
            "^PW400",
            "^LL240",
            "^LH0,0",
            "^CI28"
        ];

        if (tieneDosLineas) {
            zpl.push(`^FO15,15^A0N,22,22^FD${lineasDesc[0]}^FS`);
            zpl.push(`^FO15,38^A0N,22,22^FD${lineasDesc[1]}^FS`);
            zpl.push(`^FO15,64^A0N,16,16^FDREF. ${refBase} + iva REF. ${refTax}^FS`);
            zpl.push("^FO15,90^A0N,20,20^FDTOTAL A PAGAR:^FS");
            zpl.push("^FO15,120^A0N,24,24^FDREF.^FS");
            zpl.push(`^FO85,110^A0N,46,46^FD${refTotal}^FS`);
        } else {
            zpl.push(`^FO15,18^A0N,24,24^FD${lineasDesc[0]}^FS`);
            zpl.push(`^FO15,48^A0N,16,16^FDREF. ${refBase} + iva REF. ${refTax}^FS`);
            zpl.push("^FO15,78^A0N,20,20^FDTOTAL A PAGAR:^FS");
            zpl.push("^FO15,112^A0N,24,24^FDREF.^FS");
            zpl.push(`^FO85,102^A0N,48,48^FD${refTotal}^FS`);
        }

        // Código de barras Code 128 inferior y código de artículo
        if (barCode) {
            zpl.push(`^FO15,165^BY2,2,40^BCN,40,Y,N,N^FD${barCode}^FS`);
        }
        if (articleCode) {
            zpl.push(`^FO270,195^A0N,20,20^FD${articleCode}^FS`);
        }

        zpl.push("^XZ");
        return zpl.join("\r\n");
    }
}

/**
 * Ejemplos y presets listos para pruebas en el módulo de ZPL2
 */
export const PRESETS_ZPL = {
    LOCATEL_NORMAL: {
        id: "locatel_normal",
        titulo: "Etiqueta Normal (50x30mm)",
        descripcion: "Formato estándar Locatel con descripción, desglose REF y código de barras.",
        codigo: `^XA
^PW400
^LL240
^LH0,0
^CI28
^FO15,18^A0N,24,24^FDCOCA COLA REFRESCO 1.5L^FS
^FO15,48^A0N,16,16^FDREF. 1,45 + iva REF. 0,23^FS
^FO15,78^A0N,20,20^FDTOTAL A PAGAR:^FS
^FO15,112^A0N,24,24^FDREF.^FS
^FO85,102^A0N,48,48^FD1,68^FS
^FO15,165^BY2,2,40^BCN,40,Y,N,N^FD7591127104540^FS
^FO270,195^A0N,20,20^FD2082146^FS
^XZ`
    },
    LOCATEL_PROMO: {
        id: "locatel_promo",
        titulo: "Etiqueta Promoción / Descuento",
        descripcion: "Encabezado invertido con banner, precio anterior tachado y precio especial.",
        codigo: `^XA
^PW400
^LL240
^LH0,0
^CI28
^FO0,0^GB400,28,28,B,0^FS
^FO20,5^A0N,20,20^FR^FDDESCUENTO ESPECIAL 20%^FS
^FO15,34^A0N,20,20^FDELEMENTAL CREMA MANOS 100ML^FS
^FO15,54^A0N,20,20^FDTE VERDE HIDRATANTE^FS
^FO15,76^A0N,16,16^FDREF. 1,95 + iva REF. 0,31^FS
^FO15,98^A0N,20,20^FDTOTAL REF. 2,83^FS
^FO15,108^GB180,2,2^FS
^FO15,124^A0N,22,22^FDREF.^FS
^FO75,116^A0N,42,42^FD2,26^FS
^FO15,165^BY2,2,40^BCN,40,Y,N,N^FD7591440409131^FS
^FO270,195^A0N,20,20^FD2107262^FS
^XZ`
    },
    BARCODE_TEST: {
        id: "barcode_test",
        titulo: "Prueba Códigos de Barras",
        descripcion: "Verificación de lectura de Code 128, Code 39 y QR Code.",
        codigo: `^XA
^PW400
^LL240
^LH0,0
^FO15,15^A0N,22,22^FDPRUEBA DE CODIGOS DE BARRA^FS
^FO15,45^BY2,2,45^BCN,45,Y,N,N^FDLOCATEL-344^FS
^FO260,110^BQN,2,4^FDMA,https://locatel.com.ve^FS
^FO15,130^A0N,20,20^FDQR Y CODE 128 OK^FS
^FO15,170^A0N,18,18^FDIMPRESORA TERMICA USB OK^FS
^XZ`
    },
    HARDWARE_SELFTEST: {
        id: "hardware_selftest",
        titulo: "Prueba Rápida de Hardware (Zebra)",
        descripcion: "Comandos simples de test para comprobar comunicación USB de inmediato.",
        codigo: `^XA
^PW400
^LL240
^FO30,30^GB340,180,3,B,0^FS
^FO50,50^A0N,32,32^FDCONEXION USB OK^FS
^FO50,90^A0N,24,24^FDPROTOCOLO: ZPL II^FS
^FO50,125^A0N,20,20^FDRESOLUCION: 203 DPI^FS
^FO50,155^A0N,18,18^FDFECHA: ${new Date().toLocaleDateString()}^FS
^XZ`
    }
};

/**
 * Obtiene la URL de preview de una etiqueta ZPL a través de Labelary API (50x30mm @ 8dpmm / 203 dpi)
 * 50mm = ~1.97 pulgadas, 30mm = ~1.18 pulgadas (aprox 2x1.2)
 */
export async function fetchLabelaryPreview(zplCode) {
    if (!zplCode || !zplCode.trim()) return null;
    try {
        const response = await fetch('https://api.labelary.com/v1/printers/8dpmm/labels/2x1.2/0/', {
            method: 'POST',
            headers: {
                'Accept': 'image/png'
            },
            body: zplCode
        });

        if (!response.ok) {
            throw new Error(`Labelary error ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (err) {
        console.warn("No se pudo obtener preview de Labelary (modo offline o error de red):", err);
        return null;
    }
}
