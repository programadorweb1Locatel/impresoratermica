import React from 'react';
import { Check, Printer, AlertTriangle, X } from 'lucide-react';

export function PrintModal({ isOpen, onClose, state, data, onConnectBluetooth }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card print-modal-card">
                {state === "imprimiendo" && (
                    <>
                        <div className="printing-icon-bubble">
                            <Printer size={36} color="#6366f1" />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                                Imprimiendo Etiqueta...
                            </h3>
                            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                Transmitiendo comandos TSPL a la impresora térmica
                            </p>
                        </div>
                    </>
                )}

                {state === "exito" && (
                    <>
                        <div className="success-icon-bubble">
                            <Check size={36} strokeWidth={3} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '19px', fontWeight: 800, color: '#0f172a' }}>
                                ¡Etiqueta Impresa!
                            </h3>
                            <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: 600, marginTop: '4px' }}>
                                Enviada correctamente a la impresora
                            </p>
                        </div>
                        <div className="print-receipt-preview">
                            <div className="receipt-row">
                                <span style={{ color: '#64748b' }}>Producto:</span>
                                <span style={{ fontWeight: 700, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {data?.desc || 'Etiqueta Térmica'}
                                </span>
                            </div>
                            <div className="receipt-row">
                                <span style={{ color: '#64748b' }}>Código:</span>
                                <span>{data?.codigo || ''}</span>
                            </div>
                            <div className="receipt-row bold">
                                <span>Total Ref:</span>
                                <span style={{ color: '#059669' }}>${data?.precio || '0,00'}</span>
                            </div>
                        </div>
                        <button 
                            className="modal-btn-primary" 
                            onClick={onClose}
                            style={{ background: '#6366f1' }}
                        >
                            Aceptar
                        </button>
                    </>
                )}

                {state === "error" && (
                    <>
                        <div className="success-icon-bubble" style={{ background: '#fee2e2', color: '#dc2626', boxShadow: '0 0 0 10px rgba(220,38,38,0.12)' }}>
                            <AlertTriangle size={36} strokeWidth={2.4} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                Error de Impresión
                            </h3>
                            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '4px' }}>
                                {data?.error || 'Ocurrió un problema al enviar la etiqueta.'}
                            </p>
                        </div>
                        {onConnectBluetooth && (
                            <button 
                                className="modal-btn-primary" 
                                onClick={() => { onClose(); onConnectBluetooth(); }}
                                style={{ background: '#059669' }}
                            >
                                Vincular Bluetooth
                            </button>
                        )}
                        <button className="modal-btn-secondary" onClick={onClose}>
                            Cerrar
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
