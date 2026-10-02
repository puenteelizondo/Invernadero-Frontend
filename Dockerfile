# ---------- Etapa 1: compilar el frontend ----------
FROM node:22-alpine AS build
WORKDIR /app

# Primero solo los archivos de dependencias: mientras no cambien, Docker
# reutiliza esta capa y no reinstala todo en cada compilación.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servir con nginx ----------
FROM nginx:1.27-alpine

# La imagen oficial de nginx procesa los archivos de /etc/nginx/templates
# y reemplaza ${VARIABLES} con las variables de entorno al arrancar.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# URL del backend al que nginx reenvía /api y /ws (sin "/" al final).
ENV BACKEND_URL=http://host.docker.internal:8000

# Solo sustituir BACKEND_URL; las variables propias de nginx ($host, etc.) se quedan igual.
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/healthz || exit 1
