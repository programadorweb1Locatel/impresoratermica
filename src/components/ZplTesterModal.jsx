import React, { useState, useEffect, useCallback } from 'react';
import { 
    X, 
    Printer, 
    Usb, 
    RefreshCw, 
    Copy, 
    Check, 
    Download, 
    Play, 
    Sliders, 
    FileCode, 
    Sparkles, 
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { PRESETS_ZPL, generarZPL, fetchLabelaryPreview } from '../utils/zplGenerator';
import { UsbThermalPrinter } from '../services/usbPrinter';

export function ZplTesterModal({ 
    isOpen, 
    onClose, 
    productoActual,
    usbPrinter,
    usbState,
    onConnectUsb,
    onDisconnectUsb
}) {
    if (!isOpen) return null;

    const [zplCode, setZplCode] = useState(PRESETS_ZPL.LOCATEL_NORMAL.codigo);
    const [selectedPreset, setSelectedPreset] = useState('locatel_normal');
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [baudRate, setBaudRate] = useState(9600);
    const [connectionMode, setConnectionMode] = useState('serial'); // 'serial' | 'webusb'
    const [copied, setCopied] = useState(false);
    const [printStatus, setPrintStatus] = useState({ state: 'idle', message: '' }); // 'idle' | 'printing' | 'success' | 'error'

    // Generar preview en Labelary al cambiar el código ZPL
    const actualizarPreview = useCallback(async (codigo) => {
        const codeToRender = codigo !== undefined ? codigo : zplCode;
        if (!codeToRender || !codeToRender.trim()) {
            setPreviewUrl(null);
            return;
        }

        setIsPreviewLoading(true);
        try {
            const url = await fetchLabelaryPreview(codeToRender);
            setPreviewUrl(url);
        } catch (err) {
            console.warn("Fallo preview:", err);
        } finally {
            setIsPreviewLoading(false);
        }
    }, [zplCode]);

    // Cargar preview inicial al abrir
    useEffect(() => {
        if (isOpen) {
            actualizarPreview(zplCode);
        }
    }, [isOpen]);

    // Cambiar preset seleccionado
    const handleSelectPreset = (key) => {
        const preset = PRESETS_ZPL[key];
        if (preset) {
            setSelectedPreset(preset.id);
            setZplCode(preset.codigo);
            actualizarPreview(preset.codigo);
            setPrintStatus({ state: 'idle', message: '' });
        }
    };

    // Convertir producto actual escaneado a ZPL II
    const handleCargarProductoActual = () => {
        if (!productoActual) return;
        const zplGenerado = generarZPL(productoActual);
        setZplCode(zplGenerado);
        setSelectedPreset('custom_producto');
        actualizarPreview(zplGenerado);
        setPrintStatus({ 
            state: 'idle', 
            message: `ZPL generado desde producto: ${productoActual.description || 'Producto'}` 
        });
    };

    // Copiar código ZPL al portapapeles
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(zplCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (_) {}
    };

    // Descargar archivo .zpl
    const handleDownload = () => {
        const blob = new Blob([zplCode], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `etiqueta_${Date.now()}.zpl`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Conectar USB buscando desde las conexiones de la PC
    const handleConectarUsb = async () => {
        setPrintStatus({ state: 'idle', message: '' });
        try {
            if (connectionMode === 'serial') {
                await onConnectUsb('serial', baudRate);
            } else {
                await onConnectUsb('webusb');
            }
        } catch (err) {
            setPrintStatus({ state: 'error', message: err.message });
        }
    };

    // Enviar impresión a la impresora USB de la PC
    const handlePrintUsb = async () => {
        if (!zplCode.trim()) {
            setPrintStatus({ state: 'error', message: 'El código ZPL está vacío.' });
            return;
        }

        setPrintStatus({ state: 'printing', message: 'Enviando comandos a la impresora USB...' });

        try {
            // Si no está conectada, solicitar selección primero
            if (!usbState.connected) {
                if (connectionMode === 'serial') {
                    await onConnectUsb('serial', baudRate);
                } else {
                    await onConnectUsb('webusb');
                }
            }

            const result = await usbPrinter.printRaw(zplCode);
            setPrintStatus({ 
                state: 'success', 
                message: `¡Impreso con éxito! Se enviaron ${result.bytesSent} bytes vía ${result.method.toUpperCase()}.` 
            });
        } catch (err) {
            console.error("Error al imprimir por USB:", err);
            setPrintStatus({ 
                state: 'error', 
                message: `Error de impresión: ${err.message}` 
            });
        }
    };

    const isConnected = Boolean(usbState?.connected);

    return (
        <div className="zpl-modal-overlay">
            <div className="zpl-modal-container">
                {/* 1. Encabezado */}
                <div className="zpl-modal-header">
                    <div className="zpl-header-title">
                        <div className="zpl-badge-icon">
                            <FileCode size={20} className="text-purple" />
                        </div>
                        <div>
                            <h2>Módulo de Pruebas ZPL II & USB</h2>
                            <p>Edita, previsualiza y envía código Zebra a tu impresora por USB</p>
                        </div>
                    </div>
                    <button className="zpl-close-btn" onClick={onClose} aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </div>

                {/* 2. Barra de Conexión USB de la PC */}
                <div className={`zpl-usb-bar ${isConnected ? 'connected' : ''}`}>
                    <div className="zpl-usb-info">
                        <div className="zpl-usb-icon-box">
                            <Usb size={18} />
                        </div>
                        <div>
                            <div className="zpl-usb-name">
                                {isConnected ? usbState.deviceName : 'Sin conexión USB a la PC'}
                            </div>
                            <div className="zpl-usb-sub">
                                {isConnected 
                                    ? `Conectada (${usbState.subInfo || 'Lista para imprimir'})` 
                                    : 'Haz clic en "Buscar Impresora en PC" para seleccionar tu puerto USB/COM'}
                            </div>
                        </div>
                    </div>

                    <div className="zpl-usb-actions">
                        {!isConnected ? (
                            <div className="zpl-connect-group">
                                <select 
                                    className="zpl-select-mode"
                                    value={connectionMode}
                                    onChange={(e) => setConnectionMode(e.target.value)}
                                    title="Modo de conexión USB"
                                >
                                    <option value="serial">USB Serial / COM</option>
                                    <option value="webusb">WebUSB Directo</option>
                                </select>

                                {connectionMode === 'serial' && (
                                    <select 
                                        className="zpl-select-baud"
                                        value={baudRate}
                                        onChange={(e) => setBaudRate(Number(e.target.value))}
                                        title="Velocidad de baudios"
                                    >
                                        <option value="9600">9600 baud</option>
                                        <option value="19200">19200 baud</option>
                                        <option value="38400">38400 baud</option>
                                        <option value="57600">57600 baud</option>
                                        <option value="115200">115200 baud</option>
                                    </select>
                                )}

                                <button 
                                    className="btn-usb-connect"
                                    onClick={handleConectarUsb}
                                    type="button"
                                >
                                    <Usb size={15} />
                                    <span>Buscar Impresora en PC</span>
                                </button>
                            </div>
                        ) : (
                            <div className="zpl-connected-group">
                                <span className="zpl-status-pill online">
                                    <span className="dot" /> Conectado
                                </span>
                                <button 
                                    className="btn-usb-disconnect" 
                                    onClick={onDisconnectUsb}
                                    type="button"
                                >
                                    Desconectar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Selector de Plantillas / Presets */}
                <div className="zpl-presets-wrapper">
                    <span className="zpl-presets-label">
                        <Sparkles size={14} /> Presets rápidos:
                    </span>
                    <div className="zpl-presets-scroll">
                        {productoActual && (
                            <button 
                                className={`preset-chip special ${selectedPreset === 'custom_producto' ? 'active' : ''}`}
                                onClick={handleCargarProductoActual}
                                type="button"
                            >
                                ⚡ Producto Actual ({productoActual.barCode || 'Consultado'})
                            </button>
                        )}
                        <button 
                            className={`preset-chip ${selectedPreset === 'locatel_normal' ? 'active' : ''}`}
                            onClick={() => handleSelectPreset('LOCATEL_NORMAL')}
                            type="button"
                        >
                            🏷️ Locatel Normal
                        </button>
                        <button 
                            className={`preset-chip ${selectedPreset === 'locatel_promo' ? 'active' : ''}`}
                            onClick={() => handleSelectPreset('LOCATEL_PROMO')}
                            type="button"
                        >
                            🏷️ Locatel Promoción
                        </button>
                        <button 
                            className={`preset-chip ${selectedPreset === 'barcode_test' ? 'active' : ''}`}
                            onClick={() => handleSelectPreset('BARCODE_TEST')}
                            type="button"
                        >
                            📊 Test Códigos de Barra
                        </button>
                        <button 
                            className={`preset-chip ${selectedPreset === 'hardware_selftest' ? 'active' : ''}`}
                            onClick={() => handleSelectPreset('HARDWARE_SELFTEST')}
                            type="button"
                        >
                            ⚡ Test Hardware Zebra
                        </button>
                    </div>
                </div>

                {/* 4. Cuerpo Principal: Editor + Previsualizador */}
                <div className="zpl-main-body">
                    {/* Panel Izquierdo: Editor ZPL */}
                    <div className="zpl-editor-panel">
                        <div className="zpl-panel-bar">
                            <span className="panel-title">
                                <FileCode size={14} /> Código ZPL II (50mm x 30mm)
                            </span>
                            <div className="panel-actions">
                                <button 
                                    className="panel-btn" 
                                    onClick={handleCopy} 
                                    title="Copiar código ZPL"
                                    type="button"
                                >
                                    {copied ? <Check size={14} className="text-green" /> : <Copy size={14} />}
                                    <span>{copied ? 'Copiado' : 'Copiar'}</span>
                                </button>
                                <button 
                                    className="panel-btn" 
                                    onClick={handleDownload} 
                                    title="Descargar archivo .zpl"
                                    type="button"
                                >
                                    <Download size={14} />
                                    <span>.zpl</span>
                                </button>
                                <button 
                                    className="panel-btn refresh" 
                                    onClick={() => actualizarPreview(zplCode)} 
                                    title="Actualizar vista previa"
                                    type="button"
                                >
                                    <RefreshCw size={14} className={isPreviewLoading ? 'spin' : ''} />
                                    <span>Vista previa</span>
                                </button>
                            </div>
                        </div>

                        <textarea 
                            className="zpl-code-textarea"
                            value={zplCode}
                            onChange={(e) => {
                                setZplCode(e.target.value);
                                setSelectedPreset('custom');
                            }}
                            placeholder="Escribe o pega comandos ZPL II aquí (^XA ... ^XZ)..."
                            spellCheck={false}
                        />

                        <div className="zpl-editor-footer">
                            <span>Líneas: {zplCode.split('\n').length}</span>
                            <span>Caracteres: {zplCode.length}</span>
                            <span>Resolución: 203 DPI (8 dpmm)</span>
                        </div>
                    </div>

                    {/* Panel Derecho: Vista Previa */}
                    <div className="zpl-preview-panel">
                        <div className="zpl-panel-bar">
                            <span className="panel-title">
                                <Sliders size={14} /> Vista Previa Térmica (Labelary 203 DPI)
                            </span>
                        </div>

                        <div className="zpl-preview-canvas">
                            {isPreviewLoading ? (
                                <div className="preview-loading">
                                    <RefreshCw size={24} className="spin text-purple" />
                                    <span>Generando vista previa...</span>
                                </div>
                            ) : previewUrl ? (
                                <div className="preview-image-wrapper">
                                    <img 
                                        src={previewUrl} 
                                        alt="Vista previa ZPL térmica" 
                                        className="preview-image"
                                    />
                                    <span className="preview-dimensions">50mm × 30mm</span>
                                </div>
                            ) : (
                                <div className="preview-empty">
                                    <AlertCircle size={28} className="text-muted" />
                                    <p>Escribe comandos ZPL válidos (^XA ... ^XZ) y pulsa "Vista previa"</p>
                                </div>
                            )}
                        </div>

                        {/* Mensaje de estado de impresión */}
                        {printStatus.state !== 'idle' && (
                            <div className={`zpl-feedback-card ${printStatus.state}`}>
                                {printStatus.state === 'printing' && <RefreshCw size={16} className="spin" />}
                                {printStatus.state === 'success' && <CheckCircle2 size={16} />}
                                {printStatus.state === 'error' && <AlertCircle size={16} />}
                                <span>{printStatus.message}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5. Pie de Acciones */}
                <div className="zpl-modal-footer">
                    <div className="footer-left-info">
                        <small>
                            💡 Conecta tu impresora térmica a cualquier puerto USB de la PC y pulsa el botón para enviar directamente los comandos.
                        </small>
                    </div>

                    <div className="footer-buttons">
                        <button className="btn-secondary" onClick={onClose} type="button">
                            Cerrar
                        </button>
                        <button 
                            className="btn-print-usb"
                            onClick={handlePrintUsb}
                            disabled={printStatus.state === 'printing'}
                            type="button"
                        >
                            <Printer size={18} />
                            <span>
                                {printStatus.state === 'printing' 
                                    ? 'Imprimiendo...' 
                                    : isConnected 
                                        ? 'Imprimir ZPL por USB' 
                                        : 'Buscar Impresora en PC e Imprimir'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
