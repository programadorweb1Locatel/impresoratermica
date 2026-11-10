# Consultor de Precios y Escáner Térmico Bluetooth

Aplicación web progresiva desarrollada con **React** y **Vite** para la consulta de productos, escaneo de códigos de barra mediante cámara y emisión directa de etiquetas de precios a impresoras térmicas portátiles vía **Web Bluetooth API** (comandos TSPL/TSPL2).

---

## 🚀 Características Principales

- **Escaneo con Cámara:** Integración con `@zxing/library` para lectura rápida de códigos de barras (EAN-13, CODE128, etc.).
- **Impresión Térmica Bluetooth (BLE):** Envío directo de comandos TSPL a impresoras térmicas portátiles (etiquetas 50mm x 30mm).
- **Vista Previa de Etiqueta:** Renderizado interactivo del diseño de la etiqueta térmica antes de imprimir (soporte de precios regulares y promociones).
- **Consulta de Precios:** Conexión a la API de productos de Locatel.
- **Docker Ready:** Multi-stage build con Node.js y servidor Nginx alpine ultra liviano con proxy inverso preconfigurado.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18, Vite 6, Lucide React
- **Lector de Código de Barras:** ZXing Library
- **Protocolo de Impresión:** Web Bluetooth API (GATT) + TSPL / TSPL2
- **Servidor Web y Proxy:** Nginx (Alpine Linux)
- **Contenedores:** Docker & Docker Compose

---

## 📦 Instalación y Desarrollo Local

### Prerrequisitos
- Node.js 18+ o superior
- Administrador de paquetes `npm`

### Pasos

1. Clonar el repositorio y situarse en la rama de trabajo:
   ```bash
   git clone https://github.com/programadorweb1Locatel/impresoratermica.git
   cd impresoratermica
   git checkout pruebas
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador (preferiblemente Chrome / Edge con soporte Web Bluetooth):
   ```
   http://localhost:5173
   ```

---

## 🐳 Despliegue con Docker

El proyecto incluye configuración lista para producción con Docker y Nginx (manejando CORS y proxy hacia la API).

### Usando Docker Compose:
```bash
docker compose up -d --build
```
La aplicación estará disponible en: `http://localhost:8080`

### Usando Docker directamente:
```bash
docker build -t scaner-locatel .
docker run -d -p 8080:80 --name scaner-locatel scaner-locatel
```

---

## 🏷️ Estructura del Proyecto

```text
├── src/
│   ├── components/       # Componentes React (Scanner, Modal Bluetooth, Preview, etc.)
│   ├── services/         # Servicios de Bluetooth BLE y consumo de API
│   ├── styles/           # Hojas de estilo CSS
│   ├── utils/            # Generador de comandos TSPL y formateadores
│   ├── App.jsx           # Componente principal
│   └── main.jsx          # Punto de entrada Vite
├── nginx.conf            # Configuración Nginx y reverse proxy
├── Dockerfile            # Multi-stage build para producción
├── docker-compose.yml    # Orquestación de contenedores
└── package.json          # Dependencias y scripts
```

---

## 📄 Licencia

Proyecto de uso interno para Locatel.

