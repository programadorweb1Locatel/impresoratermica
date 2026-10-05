import React from 'react';
import { Bluetooth, MoreVertical } from 'lucide-react';

export function BluetoothCard({ btState, onOpenModal }) {
    return (
        <div 
            className="bt-card" 
            onClick={onOpenModal}
            title="Toca para gestionar impresora Bluetooth"
        >
            <div className="bt-icon-wrapper">
                <Bluetooth size={20} color="currentColor" strokeWidth={2.4} />
                <span className={`bt-pulse-dot ${btState.connected ? 'connected' : ''}`} />
            </div>

            <div className="bt-info">
                <div className="bt-header-row">
                    <span className="bt-title">{btState.status}</span>
                    <span className="bt-chip">{btState.deviceName}</span>
                </div>
                <div className="bt-sub">{btState.subInfo}</div>
            </div>

            <div className="bt-action-btn">
                <MoreVertical size={18} color="currentColor" />
            </div>
        </div>
    );
}
