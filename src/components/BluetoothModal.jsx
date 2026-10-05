import React, { useState } from 'react';
import { Bluetooth, Search, Check, AlertCircle, X, Radio } from 'lucide-react';

export function BluetoothModal({ isOpen, onClose, btState, onConnect, onDisconnect }) {
    const [connecting, setConnecting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleConnectClick = async () => {
        setConnecting(true);
        setErrorMsg('');
        try {
            await onConnect();
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err) {
            setErrorMsg(err.message || 'Error al conectar.');
        } finally {
            setConnecting(false);
        }
    };

    return (
        <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-card">
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <Radio size={20} color="#059669" />
                        <div>
                            <h3>Vincular Impresora</h3>
                            <p>Conexión inalámbrica BLE</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={18} color="currentColor" />
                    </button>
                </div>

                <div className="modal-body">
                    {btState.connected ? (
                        <>
                            <div className="radar-box">
                                <div className="radar-center-icon" style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)' }}>
                                    <Check size={28} color="#ffffff" strokeWidth={3} />
                                </div>
                            </div>

                            <div className="modal-status-text">
                                <h4>Impresora Conectada</h4>
                                <p style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                                    {btState.deviceName}
                                </p>
                                <p style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600, marginTop: '6px' }}>
                                    ● Canal BLE activo y listo para imprimir
                                </p>
                            </div>

                            <button className="modal-btn-danger" onClick={onDisconnect}>
                                Desconectar Impresora
                            </button>
                            <button className="modal-btn-secondary" onClick={onClose}>
                                Cerrar
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="radar-box">
                                <div className="radar-circle" />
                                <div className="radar-circle" />
                                <div className="radar-circle" />
                                <div className="radar-center-icon">
                                    <Bluetooth size={26} color="#ffffff" />
                                </div>
                            </div>

                            <div className="modal-status-text">
                                <h4>Buscar Impresora Térmica</h4>
                                <p>Enciende tu impresora térmica y mantén el Bluetooth encendido en tu celular.</p>
                                {errorMsg && (
                                    <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, marginTop: '6px', background: '#fee2e2', padding: '6px 10px', borderRadius: '8px' }}>
                                        <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                                        {errorMsg}
                                    </p>
                                )}
                            </div>

                            <button 
                                className="modal-btn-primary" 
                                onClick={handleConnectClick}
                                disabled={connecting}
                            >
                                <Search size={18} color="#ffffff" />
                                <span>{connecting ? 'Buscando en Chrome...' : 'Buscar Dispositivos Cercanos'}</span>
                            </button>
                            <button className="modal-btn-secondary" onClick={onClose}>
                                Cancelar
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
