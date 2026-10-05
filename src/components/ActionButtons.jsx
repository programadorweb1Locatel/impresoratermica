import React from 'react';
import { Printer, RotateCcw } from 'lucide-react';

export function ActionButtons({ onPrint, onRescan, isPrintDisabled }) {
    return (
        <div className="action-row">
            <button 
                className="btn-print" 
                type="button" 
                onClick={onPrint}
                disabled={isPrintDisabled}
            >
                <Printer size={24} color="#ffffff" strokeWidth={2.2} />
                <span>imprimir</span>
            </button>

            <button 
                className="btn-rescan" 
                type="button" 
                onClick={onRescan}
                title="Reactivar escáner / limpiar"
            >
                <RotateCcw size={22} color="#ffffff" strokeWidth={2.4} />
            </button>
        </div>
    );
}
