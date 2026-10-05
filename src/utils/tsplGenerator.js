/**
 * Utilidades para generación de etiquetas térmicas en lenguaje TSPL/TSPL2 (50mm x 30mm)
 */

// Formatea números con separador de miles con punto y coma decimal (ej: 1.000,00 o 1,97)
export function formatDecimal(val) {
    if (val === null || val === undefined || isNaN(Number(val))) return "0,00";
    const partes = Number(val).toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return partes.join(',');
}

// Limpia caracteres no soportados o comillas que romperían los comandos TSPL
export function sanitizarTexto(texto) {
    if (!texto) return "";
    return String(texto)
        .replace(/"/g, '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Quita tildes para compatibilidad con impresoras térmicas
        .toUpperCase()
        .trim();
}

// Divide el texto en hasta 2 líneas si supera maxChars (27 caracteres)
export function dividirTexto(texto, maxChars = 27) {
    const limpio = sanitizarTexto(texto);
    if (limpio.length <= maxChars) {
        return [limpio];
    }
    let corte = limpio.lastIndexOf(' ', maxChars);
    if (corte === -1 || corte < 8) {
        corte = maxChars;
        return [limpio.substring(0, corte), limpio.substring(corte, corte + maxChars).trim()];
    }
    const linea1 = limpio.substring(0, corte).trim();
    const linea2 = limpio.substring(corte + 1, corte + 1 + maxChars).trim();
    return [linea1, linea2];
}

// Genera los comandos TSPL para la etiqueta física de 50mm x 30mm
export function generarTSPL(datos) {
    if (!datos) return "";

    const rateDollar = (datos.rate && Number(datos.rate.dollar)) ? Number(datos.rate.dollar) : 1;
    const barCode = datos.barCode ? String(datos.barCode).trim() : "";
    const articleCode = datos.articleCode ? String(datos.articleCode).trim() : "";
    const lineasDesc = dividirTexto(datos.description, 27);
    const tieneDosLineas = lineasDesc.length > 1;

    const isPromo = Boolean(datos.promotion && typeof datos.promotion === 'object');

    if (isPromo) {
        // --- PLANTILLA PROMOCIÓN ---
        const promo = datos.promotion;
        const promoName = sanitizarTexto(promo.name || "DESCUENTO").substring(0, 20);

        const promoBaseBs = promo.basePrice !== undefined ? Number(promo.basePrice) : 0;
        const promoTaxBs = promo.taxAmount !== undefined ? Number(promo.taxAmount) : 0;
        const refPromoBase = formatDecimal(promoBaseBs / rateDollar);
        const refPromoTax = formatDecimal(promoTaxBs / rateDollar);

        let refRegularVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);

        let refPromoVal = (promo.referencePrice !== undefined && promo.referencePrice !== null)
            ? promo.referencePrice
            : ((promo.priceWithTax || 0) / rateDollar);

        const refRegular = formatDecimal(refRegularVal);
        const refPromo = formatDecimal(refPromoVal);

        const bannerX = Math.max(10, Math.floor((400 - (promoName.length * 14)) / 2));

        const comandos = [
            'SIZE 50 mm, 30 mm',
            'GAP 3 mm, 0 mm',
            'REFERENCE 0, 0',
            'OFFSET 0 mm',
            'DIRECTION 0',
            'CLS',
            `TEXT ${bannerX}, 3, "3", 0, 1, 1, "${promoName}"`,
            'REVERSE 0, 0, 400, 28'
        ];

        if (tieneDosLineas) {
            comandos.push(`TEXT 15, 33, "2", 0, 1, 1, "${lineasDesc[0]}"`);
            comandos.push(`TEXT 15, 53, "2", 0, 1, 1, "${lineasDesc[1]}"`);
            comandos.push(`TEXT 15, 74, "1", 0, 1, 1, "REF. ${refPromoBase} + iva REF. ${refPromoTax}"`);
            comandos.push(`TEXT 15, 108, "2", 0, 1, 1, "TOTAL REF. ${refRegular}"`);
            comandos.push('BAR 15, 114, 200, 3');
            comandos.push('TEXT 15, 152, "3", 0, 1, 1, "REF."');
            comandos.push(`TEXT 90, 142, "3", 0, 2, 2, "${refPromo}"`);
        } else {
            comandos.push(`TEXT 15, 35, "2", 0, 1, 1, "${lineasDesc[0]}"`);
            comandos.push(`TEXT 15, 65, "1", 0, 1, 1, "REF. ${refPromoBase} + iva REF. ${refPromoTax}"`);
            comandos.push(`TEXT 15, 104, "2", 0, 1, 1, "TOTAL REF. ${refRegular}"`);
            comandos.push('BAR 15, 110, 200, 3');
            comandos.push('TEXT 15, 150, "3", 0, 1, 1, "REF."');
            comandos.push(`TEXT 90, 140, "3", 0, 2, 2, "${refPromo}"`);
        }

        comandos.push(`TEXT 15, 205, "2", 0, 1, 1, "${barCode}"`);
        if (articleCode) {
            comandos.push(`TEXT 280, 205, "2", 0, 1, 1, "${articleCode}"`);
        }
        comandos.push('PRINT 1,1');

        return comandos.join('\r\n');

    } else {
        // --- PLANTILLA NORMAL ---
        const baseBs = datos.prices?.base !== undefined ? Number(datos.prices.base) : 0;
        const taxAmountBs = datos.prices?.taxAmount !== undefined ? Number(datos.prices.taxAmount) : 0;

        const refBase = formatDecimal(baseBs / rateDollar);
        const refTax = formatDecimal(taxAmountBs / rateDollar);

        let refTotalVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);
        const refTotal = formatDecimal(refTotalVal);

        const comandos = [
            'SIZE 50 mm, 30 mm',
            'GAP 3 mm, 0 mm',
            'DIRECTION 2',
            'CLS'
        ];

        if (tieneDosLineas) {
            comandos.push(`TEXT 15,15,"2",0,1,1,"${lineasDesc[0]}"`);
            comandos.push(`TEXT 15,38,"2",0,1,1,"${lineasDesc[1]}"`);
            comandos.push(`TEXT 15,65,"1",0,1,1,"REF. ${refBase} + iva REF. ${refTax}"`);
            comandos.push('TEXT 15,100,"2",0,1,1,"TOTAL A PAGAR:"');
            comandos.push('TEXT 15,140,"3",0,1,1,"REF."');
            comandos.push(`TEXT 90,125,"3",0,2,2,"${refTotal}"`);
        } else {
            comandos.push(`TEXT 15,15,"2",0,1,1,"${lineasDesc[0]}"`);
            comandos.push(`TEXT 15,45,"1",0,1,1,"REF. ${refBase} + iva REF. ${refTax}"`);
            comandos.push('TEXT 15,80,"2",0,1,1,"TOTAL A PAGAR:"');
            comandos.push('TEXT 15,120,"3",0,1,1,"REF."');
            comandos.push(`TEXT 90,105,"3",0,2,2,"${refTotal}"`);
        }

        comandos.push(`TEXT 15,205,"2",0,1,1,"${barCode}"`);
        if (articleCode) {
            comandos.push(`TEXT 280,205,"2",0,1,1,"${articleCode}"`);
        }
        comandos.push('PRINT 1,1');

        return comandos.join('\r\n');
    }
}

// Datos de prueba rápida
export const EJEMPLO_NORMAL = {
    isBlocked: false,
    barCode: 7591127104540,
    articleCode: 2082146,
    description: "COCA COLA REFRESCO ORIGINAL PE",
    prices: {
        base: 508.91,
        tax: 16,
        taxAmount: 81.43,
        priceWithTax: 590.34,
        referencePrice: 0.69
    },
    promotion: null,
    rate: {
        validDate: "2026-09-28T00:00:00.000Z",
        dollar: 857.01,
        euro: 976.9
    }
};

export const EJEMPLO_PROMO = {
    isBlocked: false,
    barCode: 7591440409131,
    articleCode: 2107262,
    description: "ELEMENTAL CREM MANOS TE VERDE",
    prices: {
        base: 2091.1,
        tax: 16,
        taxAmount: 334.58,
        priceWithTax: 2425.68,
        referencePrice: 2.83
    },
    promotion: {
        name: "Descuento 20%",
        basePrice: 1672.88,
        taxAmount: 267.66,
        priceWithTax: 1940.54,
        referencePrice: 2.26,
        savings: 485.1399999999999,
        dolarSavings: 0.5700000000000003,
        discountPercentage: 20
    },
    rate: {
        validDate: "2026-09-28T00:00:00.000Z",
        dollar: 857.01,
        euro: 976.9
    }
};
