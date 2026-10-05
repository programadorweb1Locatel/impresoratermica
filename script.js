const videoElement = document.getElementById('video');
const resultadoElement = document.getElementById('resultado');
const inputCodigo = document.getElementById('codigo-manual');
const btnConsultar = document.getElementById('btn-consultar');
const btnClear = document.getElementById('btnClear');
const conectarBtn = document.getElementById('conectarBtn');
const btStatus = document.getElementById('btStatus');
const btDeviceChip = document.getElementById('btDeviceChip');
const btDot = document.getElementById('btDot');
const btSubInfo = document.getElementById('btSubInfo');
const btnImprimir = document.getElementById('btnImprimir');
const btnRescan = document.getElementById('btnRescan');
const autoPrintCheck = document.getElementById('autoPrintCheck');
const btnTestNormal = document.getElementById('btnTestNormal');
const btnTestPromo = document.getElementById('btnTestPromo');
const tsplDebug = document.getElementById('tsplDebug');
const labelPreview = document.getElementById('labelPreview');

const modalBluetooth = document.getElementById('modalBluetooth');
const btModalBody = document.getElementById('btModalBody');
const btnCerrarModalBt = document.getElementById('btnCerrarModalBt');

const modalImpresion = document.getElementById('modalImpresion');
const printModalBody = document.getElementById('printModalBody');

const URL_DIRECTA = "https://consultor344.locatel.com.ve/api";
const URL_TUNEL = URL_DIRECTA;
const codeReader = new ZXing.BrowserMultiFormatReader();

let leyendoCodigo = false;
let ultimoProducto = null;
let ultimoTSPL = "";


function formatDecimal(val) {
    if (val === null || val === undefined || isNaN(Number(val))) return "0,00";
    const partes = Number(val).toFixed(2).split('.');
    partes[0] = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return partes.join(',');
}

function sanitizarTexto(texto) {
    if (!texto) return "";
    return String(texto)
        .replace(/"/g, '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .trim();
}

function dividirTexto(texto, maxChars = 27) {
    const limpio = sanitizarTexto(texto);
    if (limpio.length <= maxChars) {
        return [limpio];
    }
    let corte = limpio.lastIndexOf(' ', maxChars);
    if (corte === -1 || corte < 8) {
        corte = maxChars;
        return [limpio.substring(0, corte), limpio.substring(corte, corte + maxChars).trim()];
    }
    const linea1 = limpio.substring(0, corte).trim();
    const linea2 = limpio.substring(corte + 1, corte + 1 + maxChars).trim();
    return [linea1, linea2];
}

function generarTSPL(datos) {
    if (!datos) return "";

    const rateDollar = (datos.rate && Number(datos.rate.dollar)) ? Number(datos.rate.dollar) : 1;
    const barCode = datos.barCode ? String(datos.barCode).trim() : "";
    const articleCode = datos.articleCode ? String(datos.articleCode).trim() : "";
    const lineasDesc = dividirTexto(datos.description, 27);
    const tieneDosLineas = lineasDesc.length > 1;

    const isPromo = Boolean(datos.promotion && typeof datos.promotion === 'object');

    if (isPromo) {
        // --- PLANTILLA PROMOCIÓN ---
        const promo = datos.promotion;
        const promoName = sanitizarTexto(promo.name || "DESCUENTO").substring(0, 20);

        const promoBaseBs = promo.basePrice !== undefined ? Number(promo.basePrice) : 0;
        const promoTaxBs = promo.taxAmount !== undefined ? Number(promo.taxAmount) : 0;
        const refPromoBase = formatDecimal(promoBaseBs / rateDollar);
        const refPromoTax = formatDecimal(promoTaxBs / rateDollar);

        let refRegularVal;
        if (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null) {
            refRegularVal = datos.prices.referencePrice;
        } else {
            refRegularVal = (datos.prices?.priceWithTax || 0) / rateDollar;
        }
        const refRegular = formatDecimal(refRegularVal);

        let refPromoVal;
        if (promo.referencePrice !== undefined && promo.referencePrice !== null) {
            refPromoVal = promo.referencePrice;
        } else {
            refPromoVal = (promo.priceWithTax || 0) / rateDollar;
        }
        const refPromo = formatDecimal(refPromoVal);

        const bannerX = Math.max(10, Math.floor((400 - (promoName.length * 14)) / 2));

        const comandos = [
            'SIZE 50 mm, 30 mm',
            'GAP 3 mm, 0 mm',
            'REFERENCE 0, 0',
            'OFFSET 0 mm',
            'DIRECTION 0',
            'CLS',
            `TEXT ${bannerX}, 3, "3", 0, 1, 1, "${promoName}"`,
            'REVERSE 0, 0, 400, 28'
        ];

        if (tieneDosLineas) {
            comandos.push(`TEXT 15, 33, "2", 0, 1, 1, "${lineasDesc[0]}"`);
            comandos.push(`TEXT 15, 53, "2", 0, 1, 1, "${lineasDesc[1]}"`);
            comandos.push(`TEXT 15, 74, "1", 0, 1, 1, "REF. ${refPromoBase} + iva REF. ${refPromoTax}"`);
            comandos.push(`TEXT 15, 108, "2", 0, 1, 1, "TOTAL REF. ${refRegular}"`);
            comandos.push('BAR 15, 114, 200, 3');
            comandos.push('TEXT 15, 152, "3", 0, 1, 1, "REF."');
            comandos.push(`TEXT 90, 142, "3", 0, 2, 2, "${refPromo}"`);
        } else {
            comandos.push(`TEXT 15, 35, "2", 0, 1, 1, "${lineasDesc[0]}"`);
            comandos.push(`TEXT 15, 65, "1", 0, 1, 1, "REF. ${refPromoBase} + iva REF. ${refPromoTax}"`);
            comandos.push(`TEXT 15, 104, "2", 0, 1, 1, "TOTAL REF. ${refRegular}"`);
            comandos.push('BAR 15, 110, 200, 3');
            comandos.push('TEXT 15, 150, "3", 0, 1, 1, "REF."');
            comandos.push(`TEXT 90, 140, "3", 0, 2, 2, "${refPromo}"`);
        }

        comandos.push(`TEXT 15, 205, "2", 0, 1, 1, "${barCode}"`);
        if (articleCode) {
            comandos.push(`TEXT 280, 205, "2", 0, 1, 1, "${articleCode}"`);
        }
        comandos.push('PRINT 1,1');

        return comandos.join('\r\n');

    } else {
        // --- PLANTILLA NORMAL ---
        const baseBs = datos.prices?.base !== undefined ? Number(datos.prices.base) : 0;
        const taxAmountBs = datos.prices?.taxAmount !== undefined ? Number(datos.prices.taxAmount) : 0;

        const refBase = formatDecimal(baseBs / rateDollar);
        const refTax = formatDecimal(taxAmountBs / rateDollar);

        let refTotalVal;
        if (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null) {
            refTotalVal = datos.prices.referencePrice;
        } else {
            refTotalVal = (datos.prices?.priceWithTax || 0) / rateDollar;
        }
        const refTotal = formatDecimal(refTotalVal);

        const comandos = [
            'SIZE 50 mm, 30 mm',
            'GAP 3 mm, 0 mm',
            'DIRECTION 2',
            'CLS'
        ];

        if (tieneDosLineas) {
            comandos.push(`TEXT 15,15,"2",0,1,1,"${lineasDesc[0]}"`);
            comandos.push(`TEXT 15,38,"2",0,1,1,"${lineasDesc[1]}"`);
            comandos.push(`TEXT 15,65,"1",0,1,1,"REF. ${refBase} + iva REF. ${refTax}"`);
            comandos.push('TEXT 15,100,"2",0,1,1,"TOTAL A PAGAR:"');
            comandos.push('TEXT 15,140,"3",0,1,1,"REF."');
            comandos.push(`TEXT 90,125,"3",0,2,2,"${refTotal}"`);
        } else {
            comandos.push(`TEXT 15,15,"2",0,1,1,"${lineasDesc[0]}"`);
            comandos.push(`TEXT 15,45,"1",0,1,1,"REF. ${refBase} + iva REF. ${refTax}"`);
            comandos.push('TEXT 15,80,"2",0,1,1,"TOTAL A PAGAR:"');
            comandos.push('TEXT 15,120,"3",0,1,1,"REF."');
            comandos.push(`TEXT 90,105,"3",0,2,2,"${refTotal}"`);
        }

        comandos.push(`TEXT 15,205,"2",0,1,1,"${barCode}"`);
        if (articleCode) {
            comandos.push(`TEXT 280,205,"2",0,1,1,"${articleCode}"`);
        }
        comandos.push('PRINT 1,1');

        return comandos.join('\r\n');
    }
}

// ==========================================
// RENDERIZADO VISUAL DE LA ETIQUETA (50x30mm)
// ==========================================

function renderizarVistaEtiqueta(datos, estado = 'normal') {
    if (!labelPreview) return;

    if (estado === 'loading') {
        labelPreview.innerHTML = `
            <div class="empty-label-state">
              <span class="empty-icon">⏳</span>
              <p>Consultando producto...</p>
            </div>
        `;
        return;
    }

    if (estado === 'error') {
        labelPreview.innerHTML = `
            <div class="error-label-state">
              <div class="error-icon-circle">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              </div>
              <h4 class="error-label-title">Producto no encontrado</h4>
              <p class="error-label-desc">No se encontró información para este código de barras. Verifica el código e intenta nuevamente.</p>
            </div>
        `;
        return;
    }

    if (!datos) {
        labelPreview.innerHTML = `
            <div class="empty-label-state">
              <span class="empty-icon">🏷️</span>
              <p>Apunta al código de barras con la cámara para visualizar la etiqueta</p>
            </div>
        `;
        return;
    }

    const rateDollar = (datos.rate && Number(datos.rate.dollar)) ? Number(datos.rate.dollar) : 1;
    const barCode = datos.barCode ? String(datos.barCode).trim() : "";
    const articleCode = datos.articleCode ? String(datos.articleCode).trim() : "";
    const lineasDesc = dividirTexto(datos.description, 27);
    const isPromo = Boolean(datos.promotion && typeof datos.promotion === 'object');

    if (isPromo) {
        const promo = datos.promotion;
        const promoName = sanitizarTexto(promo.name || "DESCUENTO").substring(0, 20);

        const promoBaseBs = promo.basePrice !== undefined ? Number(promo.basePrice) : 0;
        const promoTaxBs = promo.taxAmount !== undefined ? Number(promo.taxAmount) : 0;
        const refPromoBase = formatDecimal(promoBaseBs / rateDollar);
        const refPromoTax = formatDecimal(promoTaxBs / rateDollar);

        let refRegularVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);

        let refPromoVal = (promo.referencePrice !== undefined && promo.referencePrice !== null)
            ? promo.referencePrice
            : ((promo.priceWithTax || 0) / rateDollar);

        const refRegular = formatDecimal(refRegularVal);
        const refPromo = formatDecimal(refPromoVal);

        labelPreview.innerHTML = `
            <div class="thermal-label promo-mode">
              <div class="th-banner">${promoName}</div>
              <div class="th-desc-box">
                <div class="th-desc-l1">${lineasDesc[0] || ''}</div>
                ${lineasDesc[1] ? `<div class="th-desc-l2">${lineasDesc[1]}</div>` : ''}
              </div>
              <div class="th-ref-iva">REF. ${refPromoBase} + iva REF. ${refPromoTax}</div>
              <div class="th-strikethrough-row">TOTAL REF. ${refRegular}</div>
              <div class="th-promo-price-row">
                <span class="th-ref-prefix">REF.</span>
                <span class="th-big-price">${refPromo}</span>
              </div>
              <div class="th-footer-row">
                <span>${barCode}</span>
                <span>${articleCode}</span>
              </div>
            </div>
        `;
    } else {
        const baseBs = datos.prices?.base !== undefined ? Number(datos.prices.base) : 0;
        const taxAmountBs = datos.prices?.taxAmount !== undefined ? Number(datos.prices.taxAmount) : 0;
        const refBase = formatDecimal(baseBs / rateDollar);
        const refTax = formatDecimal(taxAmountBs / rateDollar);

        let refTotalVal = (datos.prices?.referencePrice !== undefined && datos.prices.referencePrice !== null)
            ? datos.prices.referencePrice
            : ((datos.prices?.priceWithTax || 0) / rateDollar);
        const refTotal = formatDecimal(refTotalVal);

        labelPreview.innerHTML = `
            <div class="thermal-label normal-mode">
              <div class="th-desc-box">
                <div class="th-desc-l1">${lineasDesc[0] || ''}</div>
                ${lineasDesc[1] ? `<div class="th-desc-l2">${lineasDesc[1]}</div>` : ''}
              </div>
              <div class="th-ref-iva">REF. ${refBase} + iva REF. ${refTax}</div>
              <div class="th-total-heading">TOTAL A PAGAR:</div>
              <div class="th-main-price-row">
                <span class="th-ref-prefix">REF.</span>
                <span class="th-big-price">${refTotal}</span>
              </div>
              <div class="th-footer-row">
                <span>${barCode}</span>
                <span>${articleCode}</span>
              </div>
            </div>
        `;
    }
}

// ==========================================
// CONTROLADOR BLUETOOTH (WEB BLUETOOTH API)
// ==========================================

class BluetoothThermalPrinter {
    constructor() {
        this.device = null;
        this.characteristic = null;
        this.isConnected = false;
    }

    async connect() {
        if (!navigator.bluetooth) {
            throw new Error("Web Bluetooth no está disponible en este navegador. Abre la página con Google Chrome en Android bajo conexión HTTPS.");
        }

        const commonPrinterServices = [
            '000018f0-0000-1000-8000-00805f9b34fb', // Servicio impresora
            '0000ff00-0000-1000-8000-00805f9b34fb',
            '0000ffe0-0000-1000-8000-00805f9b34fb',
            '0000fff0-0000-1000-8000-00805f9b34fb',
            '0000fee7-0000-1000-8000-00805f9b34fb',
            '0000ae00-0000-1000-8000-00805f9b34fb',
            '0000ff80-0000-1000-8000-00805f9b34fb',
            '000018f1-0000-1000-8000-00805f9b34fb',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            'de5bf728-d711-4e4b-960d-04b23563f303'
        ];

        this.device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: commonPrinterServices
        });

        this.device.addEventListener('gattserverdisconnected', () => {
            this.isConnected = false;
            this.characteristic = null;
            this.setEstado("Desconectado", false, "Sin impresora");
            renderizarModalBluetooth();
        });

        this.setEstado("Conectando...", false, this.device.name || "Impresora");
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
            throw new Error("No se encontró canal de escritura compatible en la impresora.");
        }

        this.characteristic = targetChar;
        this.isConnected = true;
        this.setEstado("Conectado", true, this.device.name || "Térmica 50mm", "Lista para imprimir");
    }

    async disconnect() {
        if (this.device && this.device.gatt && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.isConnected = false;
        this.characteristic = null;
        this.setEstado("Desconectado", false, "Sin impresora");
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

    setEstado(estado, conectado = false, deviceName = "", sub = "") {
        if (btStatus) btStatus.textContent = estado;
        if (btDeviceChip && deviceName) btDeviceChip.textContent = deviceName;
        if (btDot) btDot.classList.toggle('connected', conectado);
        if (btSubInfo) {
            btSubInfo.textContent = sub || (conectado ? "Impresora Térmica 50x30mm" : "Toca para conectar térmica BLE");
        }
        console.log("[Bluetooth]", estado, deviceName);
    }
}

const btPrinter = new BluetoothThermalPrinter();

// ==========================================
// MODAL BLUETOOTH PERSONALIZADA Y BONITA
// ==========================================

function abrirModalBluetooth() {
    renderizarModalBluetooth();
    modalBluetooth.classList.add('active');
}

function cerrarModalBluetooth() {
    modalBluetooth.classList.remove('active');
}

if (btnCerrarModalBt) {
    btnCerrarModalBt.addEventListener('click', cerrarModalBluetooth);
}

if (modalBluetooth) {
    modalBluetooth.addEventListener('click', (e) => {
        if (e.target === modalBluetooth) cerrarModalBluetooth();
    });
}

function renderizarModalBluetooth(mensajeError = "") {
    if (!btModalBody) return;

    if (btPrinter.isConnected) {
        btModalBody.innerHTML = `
            <div class="radar-box">
              <div class="radar-center-icon" style="background: linear-gradient(135deg, #16a34a, #15803d); box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              </div>
            </div>
            <div class="modal-status-text">
              <h4>Impresora Conectada</h4>
              <p style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 4px;">
                ${btPrinter.device.name || 'Térmica 50mm'}
              </p>
              <p style="font-size: 12px; color: #16a34a; font-weight: 600; margin-top: 6px;">
                ● Canal BLE activo y listo para imprimir
              </p>
            </div>
            <button class="modal-btn-danger" id="btnDesconectarBt">Desconectar Impresora</button>
            <button class="modal-btn-secondary" id="btnCerrarBtModal">Cerrar</button>
        `;

        document.getElementById('btnDesconectarBt')?.addEventListener('click', async () => {
            await btPrinter.disconnect();
            renderizarModalBluetooth();
        });

        document.getElementById('btnCerrarBtModal')?.addEventListener('click', cerrarModalBluetooth);

    } else {
        btModalBody.innerHTML = `
            <div class="radar-box">
              <div class="radar-circle"></div>
              <div class="radar-circle"></div>
              <div class="radar-circle"></div>
              <div class="radar-center-icon">
                <svg viewBox="0 0 24 24"><path d="M14.24 12.01l4.23-4.24a1 1 0 000-1.42l-5.65-5.65a1 1 0 00-1.71.71v6.76L7.71 4.77a1 1 0 00-1.42 1.42L10.46 10.36 6.29 14.53a1 1 0 101.42 1.42l3.4-3.4v6.76a1 1 0 001.71.71l5.65-5.65a1 1 0 000-1.42l-4.23-4.24zM13.11 4.83l3.24 3.24-3.24 3.24V4.83zm0 13.65v-6.48l3.24 3.24-3.24 3.24z"/></svg>
              </div>
            </div>
            <div class="modal-status-text">
              <h4>Vincular Impresora Térmica</h4>
              <p>Enciende tu impresora térmica y asegúrate de tener el Bluetooth encendido en el teléfono.</p>
              ${mensajeError ? `<p style="font-size: 12px; color: #dc2626; font-weight: 600; margin-top: 6px; background: #fee2e2; padding: 6px 10px; border-radius: 8px;">⚠️ ${mensajeError}</p>` : ''}
            </div>
            <button class="modal-btn-primary" id="btnIniciarBusquedaBt">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Buscar Dispositivos Cercanos
            </button>
            <button class="modal-btn-secondary" id="btnCerrarBtModal">Cancelar</button>
        `;

        document.getElementById('btnIniciarBusquedaBt')?.addEventListener('click', async () => {
            const btn = document.getElementById('btnIniciarBusquedaBt');
            if (btn) {
                btn.disabled = true;
                btn.textContent = "Abriendo selector Bluetooth...";
            }
            try {
                await btPrinter.connect();
                renderizarModalBluetooth();
                setTimeout(() => {
                    cerrarModalBluetooth();
                }, 1200);
            } catch (err) {
                renderizarModalBluetooth(err.message);
            }
        });

        document.getElementById('btnCerrarBtModal')?.addEventListener('click', cerrarModalBluetooth);
    }
}

if (conectarBtn) {
    conectarBtn.addEventListener('click', abrirModalBluetooth);
}

// ==========================================
// MODAL DE IMPRESIÓN ELEGANTE
// ==========================================

function abrirModalImpresion(estado, datosExtra = {}) {
    if (!printModalBody || !modalImpresion) return;

    if (estado === "imprimiendo") {
        printModalBody.innerHTML = `
            <div class="printing-icon-bubble">
              <svg viewBox="0 0 24 24"><path d="M19 8h-1V3H6v5H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zM8 5h8v3H8V5zm8 14H8v-4h8v4zm2-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg>
            </div>
            <div>
              <h3 style="font-size: 19px; font-weight: 800; color: #0f172a;">Imprimiendo Etiqueta...</h3>
              <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Transmitiendo comandos TSPL a la impresora</p>
            </div>
        `;
    } else if (estado === "exito") {
        printModalBody.innerHTML = `
            <div class="success-icon-bubble">
              <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div>
              <h3 style="font-size: 19px; font-weight: 800; color: #0f172a;">¡Etiqueta Impresa!</h3>
              <p style="font-size: 13px; color: #16a34a; font-weight: 600; margin-top: 4px;">Enviada correctamente a la impresora</p>
            </div>
            <div class="print-receipt-preview">
              <div class="receipt-row">
                <span style="color:#64748b;">Producto:</span>
                <span style="font-weight:700; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${datosExtra.desc || 'Etiqueta'}</span>
              </div>
              <div class="receipt-row">
                <span style="color:#64748b;">Código:</span>
                <span>${datosExtra.codigo || ''}</span>
              </div>
              <div class="receipt-row bold">
                <span>Total Ref:</span>
                <span style="color:#059669;">$${datosExtra.precio || '0,00'}</span>
              </div>
            </div>
            <button class="modal-btn-primary" id="btnCerrarPrintModal" style="background:#5b38b8;">Aceptar</button>
        `;

        document.getElementById('btnCerrarPrintModal')?.addEventListener('click', cerrarModalImpresion);
        setTimeout(cerrarModalImpresion, 2600);

    } else if (estado === "error") {
        printModalBody.innerHTML = `
            <div class="success-icon-bubble" style="background:#fee2e2; color:#dc2626; box-shadow:0 0 0 10px rgba(220,38,38,0.12);">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
            <div>
              <h3 style="font-size: 18px; font-weight: 800; color: #0f172a;">Error de Impresión</h3>
              <p style="font-size: 13px; color: #dc2626; margin-top: 4px;">${datosExtra.error || 'Ocurrió un problema al imprimir.'}</p>
            </div>
            <button class="modal-btn-primary" id="btnIrBtDesdeError" style="background:#059669;">Vincular Bluetooth</button>
            <button class="modal-btn-secondary" id="btnCerrarPrintModal">Cerrar</button>
        `;

        document.getElementById('btnIrBtDesdeError')?.addEventListener('click', () => {
            cerrarModalImpresion();
            abrirModalBluetooth();
        });

        document.getElementById('btnCerrarPrintModal')?.addEventListener('click', cerrarModalImpresion);
    }

    modalImpresion.classList.add('active');
}

function cerrarModalImpresion() {
    if (modalImpresion) modalImpresion.classList.remove('active');
}

if (modalImpresion) {
    modalImpresion.addEventListener('click', (e) => {
        if (e.target === modalImpresion) cerrarModalImpresion();
    });
}

// ==========================================
// APLICAR Y MOSTRAR DATOS
// ==========================================

function aplicarYMostrarEtiqueta(datos) {
    ultimoProducto = datos;
    ultimoTSPL = generarTSPL(datos);

    if (tsplDebug) {
        tsplDebug.value = ultimoTSPL;
    }
    if (btnImprimir) {
        btnImprimir.disabled = false;
    }

    renderizarVistaEtiqueta(datos);

    const desc = datos.description || "Sin descripción";
    const ref = datos.promotion ? datos.promotion.referencePrice : datos.prices?.referencePrice;
    if (resultadoElement) {
        resultadoElement.textContent = `${desc.substring(0, 20)}... ($${ref})`;
    }
}

// Acción del botón imprimir
if (btnImprimir) {
    btnImprimir.addEventListener('click', async () => {
        if (!ultimoTSPL) {
            abrirModalImpresion("error", { error: "No hay ninguna etiqueta generada para imprimir." });
            return;
        }

        if (!btPrinter.isConnected) {
            abrirModalImpresion("error", { error: "Primero debes conectar la impresora térmica por Bluetooth." });
            return;
        }

        const desc = ultimoProducto?.description || "Etiqueta Térmica";
        const precio = ultimoProducto?.promotion ? ultimoProducto.promotion.referencePrice : ultimoProducto?.prices?.referencePrice;
        const codigo = ultimoProducto?.barCode || "";

        try {
            abrirModalImpresion("imprimiendo");
            await btPrinter.print(ultimoTSPL);
            abrirModalImpresion("exito", { desc, precio, codigo });
            // Limpiar la etiqueta tras completarse la impresión
            ultimoProducto = null;
            ultimoTSPL = "";
            renderizarVistaEtiqueta(null);
            if (btnImprimir) btnImprimir.disabled = true;
            if (resultadoElement) resultadoElement.textContent = "Impresión completada.";
        } catch (error) {
            console.error("Error imprimiendo:", error);
            abrirModalImpresion("error", { error: error.message });
        }
    });
}

if (btnRescan) {
    btnRescan.addEventListener('click', () => {
        leyendoCodigo = false;
        ultimoProducto = null;
        ultimoTSPL = "";
        if (inputCodigo) {
            inputCodigo.value = "";
            btnClear.classList.remove('visible');
        }
        if (resultadoElement) {
            resultadoElement.textContent = "Esperando acción...";
        }
        if (btnImprimir) {
            btnImprimir.disabled = true;
        }
        renderizarVistaEtiqueta(null);
        reiniciarLector();
    });
}

if (inputCodigo && btnClear) {
    inputCodigo.addEventListener('input', () => {
        if (inputCodigo.value.trim().length > 0) {
            btnClear.classList.add('visible');
        } else {
            btnClear.classList.remove('visible');
        }
    });

    btnClear.addEventListener('click', () => {
        inputCodigo.value = "";
        btnClear.classList.remove('visible');
        inputCodigo.focus();
    });
}

// Botones de prueba rápida
const EJEMPLO_NORMAL = {
    "isBlocked": false,
    "barCode": 7591127104540,
    "articleCode": 2082146,
    "description": "COCA COLA REFRESCO ORIGINAL PE",
    "prices": {
        "base": 508.91,
        "tax": 16,
        "taxAmount": 81.43,
        "priceWithTax": 590.34,
        "referencePrice": 0.69
    },
    "promotion": null,
    "rate": {
        "validDate": "2026-09-28T00:00:00.000Z",
        "dollar": 857.01,
        "euro": 976.9
    }
};

const EJEMPLO_PROMO = {
    "isBlocked": false,
    "barCode": 7591440409131,
    "articleCode": 2107262,
    "description": "ELEMENTAL CREM MANOS TE VERDE",
    "prices": {
        "base": 2091.1,
        "tax": 16,
        "taxAmount": 334.58,
        "priceWithTax": 2425.68,
        "referencePrice": 2.83
    },
    "promotion": {
        "name": "Descuento 20%",
        "basePrice": 1672.88,
        "taxAmount": 267.66,
        "priceWithTax": 1940.54,
        "referencePrice": 2.26,
        "savings": 485.1399999999999,
        "dolarSavings": 0.5700000000000003,
        "discountPercentage": 20
    },
    "rate": {
        "validDate": "2026-09-28T00:00:00.000Z",
        "dollar": 857.01,
        "euro": 976.9
    }
};

if (btnTestNormal) {
    btnTestNormal.addEventListener('click', async () => {
        aplicarYMostrarEtiqueta(EJEMPLO_NORMAL);
        if (btPrinter.isConnected) {
            try {
                abrirModalImpresion("imprimiendo");
                await btPrinter.print(ultimoTSPL);
                abrirModalImpresion("exito", {
                    desc: EJEMPLO_NORMAL.description,
                    precio: "0,69",
                    codigo: EJEMPLO_NORMAL.barCode
                });
            } catch (err) {
                abrirModalImpresion("error", { error: err.message });
            }
        }
    });
}

if (btnTestPromo) {
    btnTestPromo.addEventListener('click', async () => {
        aplicarYMostrarEtiqueta(EJEMPLO_PROMO);
        if (btPrinter.isConnected) {
            try {
                abrirModalImpresion("imprimiendo");
                await btPrinter.print(ultimoTSPL);
                abrirModalImpresion("exito", {
                    desc: EJEMPLO_PROMO.description,
                    precio: "2,26",
                    codigo: EJEMPLO_PROMO.barCode
                });
            } catch (err) {
                abrirModalImpresion("error", { error: err.message });
            }
        }
    });
}

// ==========================================
// CONSULTA A LA API Y ESCANER ZXING
// ==========================================

btnConsultar.addEventListener('click', () => {
    const codigo = inputCodigo.value.trim();
    if (codigo) {
        buscarProductoEnAPI(codigo);
    } else {
        resultadoElement.textContent = "Ingresa o escanea un código.";
    }
});

inputCodigo.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnConsultar.click();
    }
});

async function buscarProductoEnAPI(codigo) {
    try {
        resultadoElement.textContent = `Consultando: ${codigo}...`;
        console.log("Consultando código en Locatel:", codigo);

        // 1. Limpiar el campo de la etiqueta al iniciar una nueva consulta
        ultimoProducto = null;
        ultimoTSPL = "";
        if (btnImprimir) btnImprimir.disabled = true;
        renderizarVistaEtiqueta(null, 'loading');

        const respuesta = await fetch(`${URL_DIRECTA}/check-price?code=${encodeURIComponent(codigo)}`);

        if (!respuesta.ok) {
            resultadoElement.textContent = "Producto no encontrado.";
            renderizarVistaEtiqueta(null, 'error');
            return;
        }

        const datos = await respuesta.json();
        console.log("Datos recibidos:", datos);

        if (datos && datos.description) {
            aplicarYMostrarEtiqueta(datos);

            if (autoPrintCheck && autoPrintCheck.checked && btPrinter.isConnected) {
                try {
                    abrirModalImpresion("imprimiendo");
                    await btPrinter.print(ultimoTSPL);
                    abrirModalImpresion("exito", {
                        desc: datos.description,
                        precio: datos.promotion ? datos.promotion.referencePrice : datos.prices?.referencePrice,
                        codigo: datos.barCode
                    });
                    // Limpiar la etiqueta tras completarse la impresión automática
                    ultimoProducto = null;
                    ultimoTSPL = "";
                    renderizarVistaEtiqueta(null);
                    if (btnImprimir) btnImprimir.disabled = true;
                    resultadoElement.textContent = "Impresión automática completada.";
                } catch (printErr) {
                    console.error("Error en auto-impresión:", printErr);
                    abrirModalImpresion("error", { error: printErr.message });
                }
            }
        } else {
            resultadoElement.textContent = "Producto no encontrado.";
            renderizarVistaEtiqueta(null, 'error');
        }

    } catch (error) {
        console.error("Error de conexión:", error);
        resultadoElement.textContent = "Error al conectar con la API.";
        renderizarVistaEtiqueta(null, 'error');
    } finally {
        setTimeout(() => { leyendoCodigo = false; }, 2500);
    }
}

let selectedCameraId = null;

async function iniciarEscaner() {
    try {
        const videoDevices = await codeReader.listVideoInputDevices();

        if (!videoDevices || videoDevices.length === 0) {
            resultadoElement.textContent = "No se detectó cámara.";
            return;
        }

        let backCamera = videoDevices.find(device =>
            /back|posterior|environment|trasera|principal/i.test(device.label)
        );

        selectedCameraId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
        conectarCamara();

    } catch (err) {
        console.log("Nota sobre cámara:", err.message);
    }
}

function conectarCamara() {
    if (!selectedCameraId) return;

    codeReader.decodeFromVideoDevice(
        selectedCameraId,
        videoElement,
        async (result) => {
            if (result && !leyendoCodigo) {
                leyendoCodigo = true;
                const codigoEscaneado = result.getText();

                if (inputCodigo) {
                    inputCodigo.value = codigoEscaneado;
                    btnClear.classList.add('visible');
                }

                await buscarProductoEnAPI(codigoEscaneado);
            }
        }
    );
}

function reiniciarLector() {
    try {
        codeReader.reset();
        conectarCamara();
    } catch (e) {
        console.warn("Reinicio de cámara:", e);
    }
}

iniciarEscaner();