import React from 'react';
import { Settings, FileCode, Usb } from 'lucide-react';

export function ToolsDrawer({ 
    autoPrint, 
    onToggleAutoPrint, 
    onTestNormal, 
    onTestPromo, 
    tsplCode,
    onOpenZplTester,
    usbConnected,
    usbDeviceName
}) {
    return (
        <details className="tools-drawer">
            <summary>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} />
                    <span>Opciones & Pruebas</span>
                </span>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>▼</span>
            </summary>
            <div className="tools-content">
                {/* Botón destacado para Módulo ZPL2 & USB */}
                <button 
                    className="btn-open-zpl-module"
                    type="button"
                    onClick={onOpenZplTester}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCode size={18} />
                        <span style={{ fontWeight: 600 }}>Módulo de Pruebas ZPL II & USB</span>
                    </div>
                    {usbConnected ? (
                        <span className="badge-usb-pill">
                            <Usb size={12} /> USB Activo
                        </span>
                    ) : (
                        <span className="badge-usb-pill neutral">
                            <Usb size={12} /> Probar USB
                        </span>
                    )}
                </button>

                <label className="checkbox-label">
                    <input 
                        type="checkbox" 
                        checked={autoPrint}
                        onChange={(e) => onToggleAutoPrint(e.target.checked)}
                    />
                    <span>Imprimir automático al escanear/consultar</span>
                </label>
                
                <div className="test-btn-group">
                    <button className="btn-test" type="button" onClick={onTestNormal}>
                        Probar Normal
                    </button>
                    <button className="btn-test" type="button" onClick={onTestPromo}>
                        Probar Promo
                    </button>
                </div>
                
                <textarea 
                    className="tspl-debug-area" 
                    rows={4} 
                    readOnly 
                    value={tsplCode}
                    placeholder="Comandos TSPL de la etiqueta generada..."
                />
            </div>
        </details>
    );
}
