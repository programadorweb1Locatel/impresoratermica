# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Compilar la aplicación React con Vite
RUN npm run build

# Etapa 2: Servidor de producción ultraliviano con Nginx
FROM nginx:alpine

# Copiar configuración de Nginx optimizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos compilados desde la etapa de construcción
COPY --from=builder /app/dist /usr/share/nginx/html

# Exponer el puerto estándar HTTP
EXPOSE 80

# Iniciar servidor Nginx
CMD ["nginx", "-g", "daemon off;"]
