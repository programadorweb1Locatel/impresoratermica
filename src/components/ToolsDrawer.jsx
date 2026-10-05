import React from 'react';
import { Settings } from 'lucide-react';

export function ToolsDrawer({ autoPrint, onToggleAutoPrint, onTestNormal, onTestPromo, tsplCode }) {
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
                    rows={5} 
                    readOnly 
                    value={tsplCode}
                    placeholder="Comandos TSPL de la etiqueta generada..."
                />
            </div>
        </details>
    );
}
