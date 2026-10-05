import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

export function ScannerCamera({ onScan, isScanningDisabled }) {
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null);

    useEffect(() => {
        const codeReader = new BrowserMultiFormatReader();
        codeReaderRef.current = codeReader;

        async function initCamera() {
            try {
                const videoDevices = await codeReader.listVideoInputDevices();
                if (!videoDevices || videoDevices.length === 0) {
                    console.warn("No se detectaron cámaras en este dispositivo.");
                    return;
                }

                let backCamera = videoDevices.find(device =>
                    /back|posterior|environment|trasera|principal/i.test(device.label)
                );

                const deviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;

                if (videoRef.current) {
                    codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
                        if (result && !isScanningDisabled) {
                            onScan(result.getText());
                        }
                    });
                }
            } catch (err) {
                console.warn("Error inicializando cámara:", err.message);
            }
        }

        initCamera();

        return () => {
            try {
                codeReader.reset();
            } catch (e) {}
        };
    }, [onScan, isScanningDisabled]);

    return (
        <div className="scanner-card">
            <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
            {/* Animación del rayo láser rojo */}
            <div className="laser-line" />
            <div className="scan-reticle" />
            <div className="scan-badge">
                <span className="live-dot" />
                <span>ESCÁNER ACTIVO</span>
            </div>
        </div>
    );
}
