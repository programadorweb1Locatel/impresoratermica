import React, { useState, useRef, useCallback } from 'react';
import { BluetoothThermalPrinter } from './services/bluetooth';
import { buscarProductoPorCodigo } from './services/api';
import { generarTSPL, formatDecimal, EJEMPLO_NORMAL, EJEMPLO_PROMO } from './utils/tsplGenerator';

import { BluetoothCard } from './components/BluetoothCard';
import { BluetoothModal } from './components/BluetoothModal';
import { ScannerCamera } from './components/ScannerCamera';
import { InputBar } from './components/InputBar';
import { ThermalLabelPreview } from './components/ThermalLabelPreview';
import { ActionButtons } from './components/ActionButtons';
import { PrintModal } from './components/PrintModal';
import { ToolsDrawer } from './components/ToolsDrawer';

export function App() {
    // Estado del Bluetooth
    const [btState, setBtState] = useState({
        status: "Desconectado",
        connected: false,
        deviceName: "Sin impresora",
        subInfo: "Toca para conectar térmica BLE"
    });

    const btPrinterRef = useRef(new BluetoothThermalPrinter((newState) => {
        setBtState(newState);
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

        // Si auto-print está activo e impresora conectada
        if (autoPrint && btPrinterRef.current.isConnected) {
            try {
                setPrintModal({
                    isOpen: true,
                    state: 'imprimiendo',
                    data: {}
                });
                await btPrinterRef.current.print(tspl);
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
            // Si no se encuentra, dejar limpio y activar mensaje de error genérico
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

    // Imprimir etiqueta actual
    const handlePrint = async () => {
        if (!tsplCode) {
            setPrintModal({
                isOpen: true,
                state: 'error',
                data: { error: "No hay ninguna etiqueta generada para imprimir." }
            });
            return;
        }

        if (!btPrinterRef.current.isConnected) {
            setPrintModal({
                isOpen: true,
                state: 'error',
                data: { error: "Primero debes conectar la impresora por Bluetooth." }
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
            await btPrinterRef.current.print(tsplCode);
            setPrintModal({
                isOpen: true,
                state: 'exito',
                data: { desc, precio, codigo }
            });
            // Limpiar la etiqueta tras completarse la impresión
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

    return (
        <div className="app-viewport">
            {/* 1. Barra superior Bluetooth */}
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
                isPrintDisabled={!tsplCode}
            />

            {/* 6. Cajón de opciones y pruebas rápidas */}
            <ToolsDrawer 
                autoPrint={autoPrint}
                onToggleAutoPrint={setAutoPrint}
                onTestNormal={() => cargarProducto(EJEMPLO_NORMAL)}
                onTestPromo={() => cargarProducto(EJEMPLO_PROMO)}
                tsplCode={tsplCode}
            />

            {/* Modal de vinculación Bluetooth */}
            <BluetoothModal 
                isOpen={isBtModalOpen}
                onClose={() => setIsBtModalOpen(false)}
                btState={btState}
                onConnect={handleConnectBluetooth}
                onDisconnect={handleDisconnectBluetooth}
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
