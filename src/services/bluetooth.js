/**
 * Servicio de conexión Bluetooth Low Energy (Web Bluetooth API)
 * para impresoras térmicas ESC/POS y TSPL
 */

export class BluetoothThermalPrinter {
    constructor(onStatusChange = null) {
        this.device = null;
        this.characteristic = null;
        this.isConnected = false;
        this.onStatusChange = onStatusChange;
    }

    async connect() {
        if (!navigator.bluetooth) {
            throw new Error("Web Bluetooth no está disponible en este navegador. Abre la página en Google Chrome para Android con HTTPS.");
        }

        const commonPrinterServices = [
            '000018f0-0000-1000-8000-00805f9b34fb', // Impresora estándar
            '0000ff00-0000-1000-8000-00805f9b34fb', // Genéricas / chinas
            '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 transparente
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '0000fee7-0000-1000-8000-00805f9b34fb',
            '0000ae00-0000-1000-8000-00805f9b34fb',
            '0000ff80-0000-1000-8000-00805f9b34fb',
            '000018f1-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            'de5bf728-d711-4e4b-960d-04b23563f303'
        ];

        this.notify("Conectando...", false, "Buscando...");

        this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: commonPrinterServices
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.isConnected = false;
            this.characteristic = null;
            this.notify("Desconectado", false, "Sin impresora");
        });

        this.notify("Vinculando...", false, this.device.name || "Impresora");
        const server = await this.device.gatt.connect();

        let targetChar = null;

        for (const sUuid of commonPrinterServices) {
            try {
                const service = await server.getPrimaryService(sUuid);
                const chars = await service.getCharacteristics();
                for (const c of chars) {
                    if (c.properties.write || c.properties.writeWithoutResponse) {
                        targetChar = c;
                        break;
                    }
                }
                if (targetChar) break;
            } catch (e) {}
        }

        if (!targetChar) {
            try {
                const services = await server.getPrimaryServices();
                for (const service of services) {
                    try {
                        const chars = await service.getCharacteristics();
                        for (const c of chars) {
                            if (c.properties.write || c.properties.writeWithoutResponse) {
                                targetChar = c;
                                break;
                            }
                        }
                        if (targetChar) break;
                    } catch (e) {}
                }
            } catch (e) {}
        }

        if (!targetChar) {
            throw new Error("No se encontró canal de escritura compatible en la impresora térmica.");
        }

        this.characteristic = targetChar;
        this.isConnected = true;
        this.notify("Conectado", true, this.device.name || "Térmica 50mm", "Lista para imprimir");
        return this.device.name || "Impresora Térmica";
    }

    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.isConnected = false;
        this.characteristic = null;
        this.notify("Desconectado", false, "Sin impresora");
    }

    async print(tsplCode) {
        if (!this.isConnected || !this.characteristic) {
            throw new Error("La impresora no está conectada por Bluetooth.");
        }

        const cleanTspl = tsplCode.replace(/\r?\n/g, '\r\n') + '\r\n';
        const encoder = new TextEncoder();
        const data = encoder.encode(cleanTspl);

        const CHUNK_SIZE = 64;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
            const chunk = data.slice(i, i + CHUNK_SIZE);
            if (this.characteristic.properties.writeWithoutResponse) {
                await this.characteristic.writeValueWithoutResponse(chunk);
            } else {
                await this.characteristic.writeValue(chunk);
            }
            await new Promise(res => setTimeout(res, 25));
        }
    }

    notify(status, connected, deviceName, subInfo) {
        if (this.onStatusChange) {
            this.onStatusChange({
                status,
                connected,
                deviceName: deviceName || (connected ? (this.device?.name || "Térmica 50mm") : "Sin impresora"),
                subInfo: subInfo || (connected ? "Impresora Térmica 50x30mm" : "Toca para conectar térmica BLE")
            });
        }
    }
}
