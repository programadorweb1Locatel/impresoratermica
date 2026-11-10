import React, { useState, useRef, useCallback } from 'react';
import { BluetoothThermalPrinter } from './services/bluetooth';
import { UsbThermalPrinter } from './services/usbPrinter';
import { buscarProductoPorCodigo } from './services/api';
import { generarTSPL, formatDecimal, EJEMPLO_NORMAL, EJEMPLO_PROMO } from './utils/tsplGenerator';
import { generarZPL } from './utils/zplGenerator';

import { BluetoothCard } from './components/BluetoothCard';
import { BluetoothModal } from './components/BluetoothModal';
import { ScannerCamera } from './components/ScannerCamera';
import { InputBar } from './components/InputBar';
import { ThermalLabelPreview } from './components/ThermalLabelPreview';
import { ActionButtons } from './components/ActionButtons';
import { PrintModal } from './components/PrintModal';
import { ToolsDrawer } from './components/ToolsDrawer';
import { ZplTesterModal } from './components/ZplTesterModal';

export function App() {
    // 1. Estado del Bluetooth
    const [btState, setBtState] = useState({
        status: "Desconectado",
        connected: false,
        deviceName: "Sin impresora",
        subInfo: "Toca para conectar térmica BLE"
    });

    const btPrinterRef = useRef(new BluetoothThermalPrinter((newState) => {
        setBtState(newState);
    }));

    // 2. Estado de la Impresora USB (PC)
    const [usbState, setUsbState] = useState({
        status: "Desconectado",
        connected: false,
        deviceName: "Sin conexión USB",
        subInfo: "Toca para conectar USB PC",
        connectionType: null
    });

    const usbPrinterRef = useRef(new UsbThermalPrinter((newState) => {
        setUsbState(newState);
    }));

    // Estados de UI y producto
    const [codigoInput, setCodigoInput] = useState('');
    const [producto, setProducto] = useState(null);
    const [tsplCode, setTsplCode] = useState('');
    const [resultadoTexto, setResultadoTexto] = useState('Esperando acción...');
    const [autoPrint, setAutoPrint] = useState(false);
    const [isScanningDisabled, setIsScanningDisabled] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Modales
    const [isBtModalOpen, setIsBtModalOpen] = useState(false);
    const [isZplModalOpen, setIsZplModalOpen] = useState(false);
    const [printModal, setPrintModal] = useState({
        isOpen: false,
        state: 'imprimiendo', // 'imprimiendo' | 'exito' | 'error'
        data: {}
    });

    // Cargar y procesar un producto
    const cargarProducto = useCallback(async (datos) => {
        setHasError(false);
        setIsLoading(false);
        setProducto(datos);
        const tspl = generarTSPL(datos);
        setTsplCode(tspl);

        const desc = datos.description || "Sin descripción";
        const rawRef = datos.promotion ? datos.promotion.referencePrice : datos.prices?.referencePrice;
        const ref = formatDecimal(rawRef);
        setResultadoTexto(`${desc.substring(0, 20)}... ($${ref})`);

        // Si auto-print está activo y hay alguna impresora conectada (USB o Bluetooth)
        const canAutoPrint = autoPrint && (btPrinterRef.current.isConnected || usbPrinterRef.current.isConnected);
        if (canAutoPrint) {
            try {
                setPrintModal({
                    isOpen: true,
                    state: 'imprimiendo',
                    data: {}
                });

                if (usbPrinterRef.current.isConnected) {
                    // Si está conectada por USB a la PC, enviamos ZPL II o TSPL
                    const zpl = generarZPL(datos);
                    await usbPrinterRef.current.printRaw(zpl);
                } else if (btPrinterRef.current.isConnected) {
                    await btPrinterRef.current.print(tspl);
                }

                setPrintModal({
                    isOpen: true,
                    state: 'exito',
                    data: {
                        desc,
                        codigo: datos.barCode,
                        precio: ref
                    }
                });
                // Limpiar la etiqueta tras imprimirse
                setProducto(null);
                setTsplCode('');
                setResultadoTexto('Impresión automática completada.');
            } catch (err) {
                console.error("Error en auto-impresión:", err);
                setPrintModal({
                    isOpen: true,
                    state: 'error',
                    data: { error: err.message }
                });
            }
        }
    }, [autoPrint]);

    // Buscar código en la API
    const handleConsultar = useCallback(async (codigoABuscar) => {
        const codigo = codigoABuscar || codigoInput.trim();
        if (!codigo) {
            setResultadoTexto("Ingresa o escanea un código.");
            return;
        }

        // Limpiar etiqueta al realizar una nueva consulta
        setProducto(null);
        setTsplCode('');
        setHasError(false);
        setIsLoading(true);

        try {
            setResultadoTexto(`Consultando: ${codigo}...`);
            const datos = await buscarProductoPorCodigo(codigo);
            await cargarProducto(datos);
        } catch (error) {
            console.error("Error al buscar producto:", error);
            setProducto(null);
            setTsplCode('');
            setHasError(true);
            setIsLoading(false);
            setResultadoTexto("Producto no encontrado");
        }
    }, [codigoInput, cargarProducto]);

    // Callback de lectura de la cámara
    const handleScan = useCallback(async (codigoEscaneado) => {
        if (isScanningDisabled) return;
        setIsScanningDisabled(true);
        setCodigoInput(codigoEscaneado);

        await handleConsultar(codigoEscaneado);

        setTimeout(() => {
            setIsScanningDisabled(false);
        }, 2500);
    }, [isScanningDisabled, handleConsultar]);

    // Imprimir etiqueta actual (USB o Bluetooth)
    const handlePrint = async () => {
        if (!tsplCode && !producto) {
            setPrintModal({
                isOpen: true,
                state: 'error',
                data: { error: "No hay ninguna etiqueta generada para imprimir." }
            });
            return;
        }

        const isUsbConnected = usbPrinterRef.current.isConnected;
        const isBtConnected = btPrinterRef.current.isConnected;

        if (!isUsbConnected && !isBtConnected) {
            setPrintModal({
                isOpen: true,
                state: 'error',
                data: { error: "Primero debes conectar la impresora por USB en tu PC o por Bluetooth." }
            });
            return;
        }

        const desc = producto?.description || "Etiqueta Térmica";
        const rawPrecio = producto?.promotion ? producto.promotion.referencePrice : producto?.prices?.referencePrice;
        const precio = formatDecimal(rawPrecio);
        const codigo = producto?.barCode || "";

        try {
            setPrintModal({
                isOpen: true,
                state: 'imprimiendo',
                data: {}
            });

            if (isUsbConnected) {
                // Impresión por USB: Se genera ZPL II
                const zplCodeToSend = generarZPL(producto);
                await usbPrinterRef.current.printRaw(zplCodeToSend);
            } else {
                // Impresión por Bluetooth: Se envía TSPL
                await btPrinterRef.current.print(tsplCode);
            }

            setPrintModal({
                isOpen: true,
                state: 'exito',
                data: { desc, precio, codigo }
            });
            
            setProducto(null);
            setTsplCode('');
            setResultadoTexto('Impresión completada.');
        } catch (error) {
            console.error("Error al imprimir:", error);
            setPrintModal({
                isOpen: true,
                state: 'error',
                data: { error: error.message }
            });
        }
    };

    // Reiniciar escaneo / limpiar
    const handleRescan = () => {
        setCodigoInput('');
        setProducto(null);
        setTsplCode('');
        setHasError(false);
        setIsLoading(false);
        setResultadoTexto('Esperando acción...');
        setIsScanningDisabled(false);
    };

    // Conectar Bluetooth
    const handleConnectBluetooth = async () => {
        return await btPrinterRef.current.connect();
    };

    // Desconectar Bluetooth
    const handleDisconnectBluetooth = async () => {
        await btPrinterRef.current.disconnect();
    };

    // Conectar USB de PC
    const handleConnectUsb = async (mode = 'serial', baudRate = 9600) => {
        if (mode === 'serial') {
            return await usbPrinterRef.current.connectSerial(baudRate);
        } else {
            return await usbPrinterRef.current.connectWebUsb();
        }
    };

    // Desconectar USB de PC
    const handleDisconnectUsb = async () => {
        await usbPrinterRef.current.disconnect();
    };

    return (
        <div className="app-viewport">
            {/* 1. Barra superior de Conexión de Hardware */}
            <BluetoothCard 
                btState={btState} 
                onOpenModal={() => setIsBtModalOpen(true)} 
            />

            {/* 2. Visor de escáner con rayo láser */}
            <ScannerCamera 
                onScan={handleScan}
                isScanningDisabled={isScanningDisabled}
            />

            {/* 3. Barra de entrada manual */}
            <InputBar 
                value={codigoInput}
                onChange={setCodigoInput}
                onSearch={() => handleConsultar(codigoInput)}
                onClear={() => setCodigoInput('')}
            />

            {/* 4. Etiqueta térmica de altura fija */}
            <ThermalLabelPreview 
                producto={producto}
                resultadoTexto={resultadoTexto}
                hasError={hasError}
                isLoading={isLoading}
            />

            {/* 5. Botones de acción principales (imprimir y refrescar) */}
            <ActionButtons 
                onPrint={handlePrint}
                onRescan={handleRescan}
                isPrintDisabled={!tsplCode && !producto}
            />

            {/* 6. Cajón de opciones, pruebas y acceso al Módulo ZPL2 & USB */}
            <ToolsDrawer 
                autoPrint={autoPrint}
                onToggleAutoPrint={setAutoPrint}
                onTestNormal={() => cargarProducto(EJEMPLO_NORMAL)}
                onTestPromo={() => cargarProducto(EJEMPLO_PROMO)}
                tsplCode={tsplCode}
                onOpenZplTester={() => setIsZplModalOpen(true)}
                usbConnected={usbState.connected}
                usbDeviceName={usbState.deviceName}
            />

            {/* Modal de vinculación Bluetooth */}
            <BluetoothModal 
                isOpen={isBtModalOpen}
                onClose={() => setIsBtModalOpen(false)}
                btState={btState}
                onConnect={handleConnectBluetooth}
                onDisconnect={handleDisconnectBluetooth}
            />

            {/* Módulo de Pruebas ZPL II & Impresión USB de PC */}
            <ZplTesterModal 
                isOpen={isZplModalOpen}
                onClose={() => setIsZplModalOpen(false)}
                productoActual={producto}
                usbPrinter={usbPrinterRef.current}
                usbState={usbState}
                onConnectUsb={handleConnectUsb}
                onDisconnectUsb={handleDisconnectUsb}
            />

            {/* Modal de confirmación de impresión */}
            <PrintModal 
                isOpen={printModal.isOpen}
                onClose={() => setPrintModal(prev => ({ ...prev, isOpen: false }))}
                state={printModal.state}
                data={printModal.data}
                onConnectBluetooth={() => setIsBtModalOpen(true)}
            />
        </div>
    );
}
