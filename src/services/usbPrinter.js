/**
 * Servicio de conexión para Impresoras Térmicas por USB y Conexiones de PC
 * Soporta:
 *  1. Web Serial API (Puertos COM y adaptadores USB-Serial / USB CDC)
 *  2. WebUSB API (Dispositivos USB directos)
 *  3. Impresión mediante cola de Windows (Diálogo de impresión 50x30mm)
 */

export class UsbThermalPrinter {
    constructor(onStatusChange = null) {
        this.serialPort = null;
        this.usbDevice = null;
        this.connectionType = null; // 'serial' | 'webusb' | null
        this.isConnected = false;
        this.deviceName = "Sin conexión USB";
        this.onStatusChange = onStatusChange;
        this.currentBaudRate = 9600;
    }

    notify(status, connected, deviceName, subInfo = "") {
        this.isConnected = connected;
        this.deviceName = deviceName;
        if (this.onStatusChange) {
            this.onStatusChange({
                status,
                connected,
                deviceName,
                subInfo,
                connectionType: this.connectionType
            });
        }
    }

    /**
     * Verifica si las APIs de conexión de PC están disponibles en el navegador
     */
    static getCapabilities() {
        return {
            hasSerial: Boolean(navigator.serial),
            hasUsb: Boolean(navigator.usb),
            isSecureContext: window.isSecureContext
        };
    }

    /**
     * 1. Conexión mediante Web Serial API (Puertos USB / COM virtuales de PC)
     */
    async connectSerial(baudRate = 9600) {
        if (!navigator.serial) {
            throw new Error(
                "La Web Serial API no está soportada en este navegador. Por favor utiliza Google Chrome, Microsoft Edge u Opera en tu PC."
            );
        }

        try {
            this.notify("Buscando puertos...", false, "Selecciona tu impresora...");
            
            // Abre el selector nativo de Chrome con los puertos USB / COM de la PC
            const port = await navigator.serial.requestPort();
            
            const info = port.getInfo ? port.getInfo() : {};
            const usbVendorId = info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : null;
            const usbProductId = info.usbProductId ? `0x${info.usbProductId.toString(16)}` : null;
            
            const devLabel = usbVendorId 
                ? `Impresora USB (${usbVendorId}:${usbProductId})` 
                : "Puerto Serial / USB PC";

            // Si el puerto ya estaba abierto, cerrarlo primero
            if (this.serialPort && this.serialPort.readable) {
                try { await this.serialPort.close(); } catch (_) {}
            }

            this.currentBaudRate = Number(baudRate) || 9600;
            await port.open({ 
                baudRate: this.currentBaudRate,
                dataBits: 8,
                stopBits: 1,
                parity: "none"
            });

            this.serialPort = port;
            this.connectionType = 'serial';
            this.isConnected = true;
            this.deviceName = devLabel;

            this.notify("Conectado USB (Serial)", true, devLabel, `${this.currentBaudRate} baudios`);
            return devLabel;
        } catch (err) {
            if (err.name === 'NotFoundError') {
                this.notify("Cancelado", false, "No se seleccionó dispositivo", "Reintentar conexión");
                throw new Error("No seleccionaste ningún puerto USB / Serial de la lista.");
            }
            this.notify("Error de conexión", false, "Fallo USB Serial", err.message);
            throw err;
        }
    }

    /**
     * 2. Conexión mediante WebUSB API (Acceso directo a endpoints USB)
     */
    async connectWebUsb() {
        if (!navigator.usb) {
            throw new Error(
                "La WebUSB API no está soportada en este navegador. Utiliza Google Chrome o Microsoft Edge."
            );
        }

        try {
            this.notify("Buscando USB...", false, "Selecciona tu impresora...");
            
            // Filtros abiertos para permitir seleccionar cualquier impresora USB conectada
            const device = await navigator.usb.requestDevice({ filters: [] });
            
            await device.open();
            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }

            // Reclamar la primera interfaz disponible
            const iface = device.configuration.interfaces[0];
            await device.claimInterface(iface.interfaceNumber);

            const devName = device.productName || device.manufacturerName || "Impresora Térmica USB";
            this.usbDevice = device;
            this.connectionType = 'webusb';
            this.isConnected = true;
            this.deviceName = devName;

            this.notify("Conectado USB Directo", true, devName, "Listo para imprimir");
            return devName;
        } catch (err) {
            if (err.name === 'NotFoundError') {
                this.notify("Cancelado", false, "Sin impresora", "Reintentar");
                throw new Error("No seleccionaste ningún dispositivo USB.");
            }
            this.notify("Error WebUSB", false, "Fallo al conectar", err.message);
            throw err;
        }
    }

    /**
     * Envía comandos raw (ZPL II, TSPL, ESC/POS) a la impresora conectada
     */
    async printRaw(commandString) {
        if (!commandString || !commandString.trim()) {
            throw new Error("No hay comandos para imprimir.");
        }

        if (!this.isConnected) {
            throw new Error("No hay ninguna impresora USB conectada a la PC. Conéctala primero.");
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(commandString);

        if (this.connectionType === 'serial' && this.serialPort) {
            if (!this.serialPort.writable) {
                // Reabrir si se cerró inesperadamente
                await this.serialPort.open({ baudRate: this.currentBaudRate });
            }
            const writer = this.serialPort.writable.getWriter();
            try {
                await writer.write(data);
            } finally {
                writer.releaseLock();
            }
            return { success: true, bytesSent: data.length, method: 'serial' };
        } 
        
        if (this.connectionType === 'webusb' && this.usbDevice) {
            // Buscar endpoint de salida (OUT direction)
            let outEndpoint = null;
            for (const iface of this.usbDevice.configuration.interfaces) {
                for (const alt of iface.alternates) {
                    const ep = alt.endpoints.find(e => e.direction === 'out');
                    if (ep) {
                        outEndpoint = ep;
                        break;
                    }
                }
                if (outEndpoint) break;
            }

            if (!outEndpoint) {
                throw new Error("No se encontró canal de salida (OUT endpoint) en el dispositivo USB.");
            }

            const result = await this.usbDevice.transferOut(outEndpoint.endpointNumber, data);
            if (result.status !== 'ok') {
                throw new Error(`Error en transferencia USB: ${result.status}`);
            }
            return { success: true, bytesSent: data.length, method: 'webusb' };
        }

        throw new Error("Tipo de conexión no reconocido.");
    }

    /**
     * 3. Fallback de impresión nativa (Diálogo de Windows para controladores USB de Windows)
     */
    static printViaBrowserDialog(title, labelHtml) {
        const printWindow = window.open('', '_blank', 'width=450,height=400');
        if (!printWindow) {
            throw new Error("La ventana emergente de impresión fue bloqueada por el navegador.");
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${title || 'Imprimir Etiqueta'}</title>
                <style>
                    @page {
                        size: 50mm 30mm;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        background: #fff;
                    }
                    .print-container {
                        width: 50mm;
                        height: 30mm;
                        box-sizing: border-box;
                        padding: 2mm;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    ${labelHtml}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
        return true;
    }

    /**
     * Cierra las conexiones activas
     */
    async disconnect() {
        try {
            if (this.serialPort) {
                if (this.serialPort.readable) {
                    try { await this.serialPort.close(); } catch (_) {}
                }
                this.serialPort = null;
            }
            if (this.usbDevice) {
                try { await this.usbDevice.close(); } catch (_) {}
                this.usbDevice = null;
            }
        } finally {
            this.connectionType = null;
            this.isConnected = false;
            this.notify("Desconectado", false, "Sin conexión USB", "Toca para conectar");
        }
    }
}
