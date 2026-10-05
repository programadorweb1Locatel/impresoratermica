import React from 'react';
import { Tag, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatDecimal, sanitizarTexto, dividirTexto } from '../utils/tsplGenerator';

export function ThermalLabelPreview({ producto, resultadoTexto, hasError, isLoading }) {
    const renderLabelContent = () => {
        if (isLoading) {
            return (
                <div className="empty-label-state">
                    <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Consultando producto...</p>
                </div>
            );
        }

        if (hasError) {
            return (
                <div className="error-label-state">
                    <div className="error-icon-circle">
                        <AlertCircle size={26} color="#dc2626" strokeWidth={2.4} />
                    </div>
                    <h4 className="error-label-title">Producto no encontrado</h4>
                    <p className="error-label-desc">No se encontró información para este código de barras. Verifica el código e intenta nuevamente.</p>
                </div>
            );
        }

        if (!producto) {
            return (
                <div className="empty-label-state">
                    <span className="empty-icon">🏷️</span>
                    <p>Apunta al código de barras con la cámara para visualizar la etiqueta</p>
                </div>
            );
        }

        const rateDollar = (producto.rate && Number(producto.rate.dollar)) ? Number(producto.rate.dollar) : 1;
        const barCode = producto.barCode ? String(producto.barCode).trim() : "";
        const articleCode = producto.articleCode ? String(producto.articleCode).trim() : "";
        const lineasDesc = dividirTexto(producto.description, 27);
        const isPromo = Boolean(producto.promotion && typeof producto.promotion === 'object');

        if (isPromo) {
            const promo = producto.promotion;
            const promoName = sanitizarTexto(promo.name || "DESCUENTO").substring(0, 20);

            const promoBaseBs = promo.basePrice !== undefined ? Number(promo.basePrice) : 0;
            const promoTaxBs = promo.taxAmount !== undefined ? Number(promo.taxAmount) : 0;
            const refPromoBase = formatDecimal(promoBaseBs / rateDollar);
            const refPromoTax = formatDecimal(promoTaxBs / rateDollar);

            const refRegularVal = (producto.prices?.referencePrice !== undefined && producto.prices.referencePrice !== null)
                ? producto.prices.referencePrice
                : ((producto.prices?.priceWithTax || 0) / rateDollar);

            const refPromoVal = (promo.referencePrice !== undefined && promo.referencePrice !== null)
                ? promo.referencePrice
                : ((promo.priceWithTax || 0) / rateDollar);

            const refRegular = formatDecimal(refRegularVal);
            const refPromo = formatDecimal(refPromoVal);

            return (
                <div className="thermal-label promo-mode">
                    <div className="th-banner">{promoName}</div>
                    <div className="th-desc-box">
                        <div className="th-desc-l1">{lineasDesc[0] || ''}</div>
                        {lineasDesc[1] && <div className="th-desc-l2">{lineasDesc[1]}</div>}
                    </div>
                    <div className="th-ref-iva">REF. {refPromoBase} + iva REF. {refPromoTax}</div>
                    <div className="th-strikethrough-row">TOTAL REF. {refRegular}</div>
                    <div className="th-promo-price-row">
                        <span className="th-ref-prefix">REF.</span>
                        <span className="th-big-price">{refPromo}</span>
                    </div>
                    <div className="th-footer-row">
                        <span>{barCode}</span>
                        <span>{articleCode}</span>
                    </div>
                </div>
            );
        }

        // Modo Normal
        const baseBs = producto.prices?.base !== undefined ? Number(producto.prices.base) : 0;
        const taxAmountBs = producto.prices?.taxAmount !== undefined ? Number(producto.prices.taxAmount) : 0;
        const refBase = formatDecimal(baseBs / rateDollar);
        const refTax = formatDecimal(taxAmountBs / rateDollar);

        const refTotalVal = (producto.prices?.referencePrice !== undefined && producto.prices.referencePrice !== null)
            ? producto.prices.referencePrice
            : ((producto.prices?.priceWithTax || 0) / rateDollar);
        const refTotal = formatDecimal(refTotalVal);

        return (
            <div className="thermal-label normal-mode">
                <div className="th-desc-box">
                    <div className="th-desc-l1">{lineasDesc[0] || ''}</div>
                    {lineasDesc[1] && <div className="th-desc-l2">{lineasDesc[1]}</div>}
                </div>
                <div className="th-ref-iva">REF. {refBase} + iva REF. {refTax}</div>
                <div className="th-total-heading">TOTAL A PAGAR:</div>
                <div className="th-main-price-row">
                    <span className="th-ref-prefix">REF.</span>
                    <span className="th-big-price">{refTotal}</span>
                </div>
                <div className="th-footer-row">
                    <span>{barCode}</span>
                    <span>{articleCode}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="product-card">
            <div className="card-header-status">
                {producto ? (
                    <span className="status-badge success">
                        <CheckCircle2 size={13} color="#059669" strokeWidth={2.6} />
                        PRODUCTO LOCALIZADO
                    </span>
                ) : hasError ? (
                    <span className="status-badge error" style={{ background: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                        <AlertCircle size={13} color="#dc2626" strokeWidth={2.6} />
                        NO LOCALIZADO
                    </span>
                ) : isLoading ? (
                    <span className="status-badge loading" style={{ background: '#e0e7ff', color: '#4f46e5', borderColor: '#c7d2fe' }}>
                        <Tag size={13} color="#4f46e5" strokeWidth={2.4} />
                        CONSULTANDO...
                    </span>
                ) : (
                    <span className="status-badge idle" style={{ background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>
                        <Tag size={13} color="#64748b" strokeWidth={2.2} />
                        LISTO PARA ESCANEAR
                    </span>
                )}
                <span className="product-status-text">
                    {resultadoTexto || 'Esperando acción...'}
                </span>
            </div>

            {/* CONTENEDOR DE ALTURA BLOQUEADA: NO SALTA NI SE REAJUSTA EL ESPACIO */}
            <div className="label-fixed-viewport">
                {renderLabelContent()}
            </div>
        </div>
    );
}
