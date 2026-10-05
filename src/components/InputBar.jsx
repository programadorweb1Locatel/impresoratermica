import React from 'react';
import { Search, X } from 'lucide-react';

export function InputBar({ value, onChange, onSearch, onClear }) {
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            onSearch();
        }
    };

    return (
        <div className="input-bar">
            <input 
                type="text"
                className="barcode-input"
                placeholder="Escribe o pega el código..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
            />

            {value.trim().length > 0 && (
                <button 
                    className="btn-clear" 
                    type="button" 
                    onClick={onClear}
                    title="Limpiar campo"
                >
                    <X size={15} color="#64748b" />
                </button>
            )}

            <button 
                className="btn-search" 
                type="button" 
                onClick={onSearch}
                title="Consultar API"
            >
                <Search size={20} color="#ffffff" strokeWidth={2.4} />
            </button>
        </div>
    );
}
