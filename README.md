# Invernadero — Frontend

Panel web para administrar invernaderos, sensores, actuadores y accesos, consumiendo el backend de `Invernadero-Backend` (Django/DRF).

## Qué hace (y qué NO hace) este frontend

- Crea invernaderos, sensores, actuadores, zonas y dispositivos (con rotación de `api_key`), y gestiona membresías (invitar por username/email, cambiar rol, quitar acceso).
- Muestra lecturas de sensores y estado de actuadores **en vivo** vía WebSocket, con historial y gráfica para cada sensor.
- **Alertas:** reglas por sensor (umbral alto/bajo con duración, o aviso de "sin señal"), alertas activas con aviso en el panel, historial paginado, reconocer alertas y limpiar las ya resueltas (solo propietarios).
- **Catálogo de tipos** con dos alcances: globales (los administra staff) y propios de cada invernadero (los administra su propietario). El enlace del menú solo aparece cuando ya hay un invernadero.
- Enciende/apaga actuadores a mano.
- Exporta un invernadero a Excel.
- A propósito, **nunca** manda una lectura de sensor manualmente. Ese dato lo generan los controladores físicos (Arduino/ESP32/Raspberry Pi, etc.) llamando al endpoint de ingesta del backend con su propia `X-Device-Key`. Este frontend es de solo-lectura para lecturas: verlas, graficarlas, exportarlas — nunca escribirlas.
- Para sensores/actuadores nuevos, ofrece una lista de **tipos predesignados** (con ícono y unidad/rango sugeridos) que hacen match con el catálogo real del backend por su `code`.
- **Responsivo:** se adapta a celular, tablet y escritorio (ver la sección "Diseño adaptable").

## Stack

- React 18 + Vite + TypeScript
- TanStack Query (React Query) v5 para todo el estado de servidor (fetch, cache, invalidación)
- axios, configurado para las cookies de sesión + CSRF de Django (`csrftoken` / `X-CSRFToken`)
- react-router-dom v6
- recharts (gráficas de sensores)
- lucide-react (íconos, incluidos los de los "sensores predesignados")
- Tailwind CSS v3

## Cómo se conecta con el backend (importante)

El backend usa autenticación por **sesión + cookie** para el navegador (`SessionAuthentication` + CSRF), lo cual solo funciona bien si el navegador ve todo como **el mismo origen** — si no, las cookies `SameSite` bloquean las peticiones entre `localhost:5173` (frontend) y `localhost:8000` (backend).

Para evitar ese problema **sin tocar la configuración de cookies/CORS del backend**, `vite.config.ts` levanta un proxy de desarrollo:

- `/api/*` → `http://localhost:8000`
- `/ws/*` → `ws://localhost:8000` (WebSockets)

Así, desde el punto de vista del navegador, todo vive en `http://localhost:5173`, y `axios` con `withCredentials: true` + las cookies de Django funcionan sin ninguna configuración especial de CORS.

**Este proxy solo aplica en desarrollo** (`npm run dev`). Para producción, hay que decidir cómo se van a servir juntos frontend y backend (mismo dominio detrás de un reverse proxy, subdominios con `CSRF_TRUSTED_ORIGINS`/`CORS_ALLOWED_ORIGINS` configurados en el backend, etc.) — eso depende del hosting real y queda fuera del alcance de este repo, igual que la sección "Producción" del backend.

## Flujo de autenticación

1. Al arrancar, `main.tsx` llama a `GET /api/v1/auth/csrf/` una vez (`ensureCsrfCookie`) para que el navegador tenga la cookie `csrftoken` antes de cualquier `POST`.
2. Login: `POST /api/v1/auth/login/` con `{ username, password }` → crea la sesión (cookie `sessionid`).
3. Cada carga de la app pregunta `GET /api/v1/auth/me/`; si responde 401, `ProtectedRoute` redirige a `/login`.
4. Logout: `POST /api/v1/auth/logout/`.
5. Registro: `POST /api/v1/auth/register/`.
6. Recuperar contraseña: `POST /api/v1/auth/password-reset/` (siempre responde igual, exista o no el email) → el backend manda un email (o lo imprime en los logs del contenedor en desarrollo) con un enlace a `/reset-password?uid=...&token=...` de este frontend → `ResetPasswordPage` lee esos dos parámetros y llama a `POST /api/v1/auth/password-reset/confirm/`.

## Tiempo real (WebSocket)

`src/hooks/useRealtime.ts` encapsula todo el flujo:

1. Pide un token corto de un solo uso: `POST /api/v1/realtime/ws-token/` con `{ greenhouse: <id> }` (requiere sesión y ser miembro del invernadero).
2. Abre `ws://.../ws/greenhouses/<id>/?token=...` (vía el proxy de Vite).
3. Recibe un evento `snapshot` inicial y después `sensor_reading` / `actuator_state_changed` / `alert_opened` / `alert_resolved` / `alert_acknowledged` en vivo, que actualizan la UI y invalidan las queries de historial correspondientes.
4. Si el socket se cae, reconecta solo con backoff exponencial (pidiendo un token nuevo cada vez, porque el anterior ya expiró).

## Estructura

```
src/
  types.ts              Tipos TS que reflejan los serializers del backend
  lib/
    api.ts               Cliente axios + manejo de errores + cookie CSRF
    queryClient.ts        Configuración de React Query + claves de query
    sensorPresets.ts       Catálogo de sensores predesignados (ícono, unidad, rango)
    actuatorPresets.ts      Catálogo de actuadores predesignados
  hooks/
    useAuth.ts            Login/logout/registro/recuperación + sesión actual
    useGreenhouses.ts      CRUD contra la API (invernaderos, sensores, actuadores, zonas, dispositivos, membresías, export)
    useAlerts.ts           Reglas de alerta, alertas activas/historial, reconocer y limpiar
    useRealtime.ts         WebSocket por invernadero
  components/              Layout, Sidebar, badges, primitivas de UI (Button, Card, Modal...)
  pages/                   Una página por ruta
```

## Diseño adaptable

Breakpoints de Tailwind: celular (< 640 px), tablet (640–1023 px) y escritorio (≥ 1024 px, `lg`).

- **Menú:** en escritorio es una columna fija a la izquierda. En celular y tablet se convierte en un cajón que se abre con el botón de la barra superior (que queda fija) y se cierra al elegir una opción, al tocar fuera o con Escape (`Layout.tsx` + `Sidebar.tsx`).
- **Ventanas emergentes (`Modal` en `components/ui.tsx`):** en celular salen desde abajo como una hoja y hacen scroll interno; en pantallas grandes se centran.
- **Listas y tarjetas:** las acciones se reacomodan en varias líneas en vez de desbordarse; los textos largos y códigos se truncan o se parten.
- **Táctil:** botones e íconos de acción con área de toque cómoda (≥ 40 px).
- Se usa `dvh` para que la barra del navegador móvil no tape contenido.

Al agregar páginas nuevas, revisa que no haya scroll horizontal a 375 px de ancho (en Chrome: `F12` → `Ctrl+Shift+M`).

## Cómo correrlo

Requiere que el backend (`Invernadero-Backend`) esté corriendo en `http://localhost:8000` (por ejemplo con `docker compose up -d`).

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Para compilar para producción:

```bash
npm run build   # genera dist/
npm run preview # sirve dist/ localmente para probarlo
```

### Abrirlo desde otro equipo de la red (celular, tablet)

1. Averigua la IP de tu PC (`ipconfig` en Windows, la IPv4 del Wi-Fi), por ejemplo `192.168.100.55`.
2. En el `.env` del **backend**, agrega esa IP a:
   ```
   DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1,192.168.100.55
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://192.168.100.55:5173
   CSRF_TRUSTED_ORIGINS=http://localhost:5173,http://192.168.100.55:5173
   ```
   y reinicia con `docker compose up -d`.
3. Arranca el frontend exponiéndolo a la red:
   ```bash
   npm run dev -- --host
   ```
4. En Windows, permite los puertos 5173 y 8000 en el firewall para redes privadas.
5. Desde el celular (mismo Wi-Fi) abre `http://192.168.100.55:5173`.

Es HTTP sin cifrar: úsalo solo en una red de confianza. Si la IP de tu PC cambia, actualiza el `.env`.

## Con Docker (correrlo donde sea)

El frontend se empaqueta en una imagen de nginx: compila la app y la sirve, y reenvía `/api` y `/ws` al backend. Para el navegador todo sigue siendo un solo origen, igual que con el proxy de Vite, así que las cookies y el CSRF funcionan sin CORS.

```bash
docker compose up -d --build
```

Abre `http://localhost:8080` (o `http://<IP-de-la-PC>:8080` desde otro equipo). Variables opcionales, en un `.env` junto al `docker-compose.yml`:

| Variable | Por defecto | Para qué |
|---|---|---|
| `FRONTEND_PORT` | `8080` | Puerto donde se publica el frontend |
| `BACKEND_URL` | `http://host.docker.internal:8000` | Dónde está el backend. Si está en otra máquina: `http://192.168.100.20:8000` |

Notas:
- nginx reenvía el `Host` original, así que en el `.env` del **backend** solo hace falta agregar el host o IP desde donde se abre el frontend en `DJANGO_ALLOWED_HOSTS` (no hace falta tocar `CSRF_TRUSTED_ORIGINS`).
- Si el frontend y el backend están en el mismo `docker-compose`, pon `BACKEND_URL=http://web:8000`.
- Para HTTPS, pon un proxy con certificado delante (Caddy, Traefik, nginx del servidor, Cloudflare Tunnel) y el backend deberá confiar en `X-Forwarded-Proto` (`SECURE_PROXY_SSL_HEADER`).
- Cambiar `BACKEND_URL` no requiere recompilar: basta `docker compose up -d`.

## Pendientes / ideas para seguir

- Code-splitting (el bundle actual pasa los 500 kB; recharts y react-router pueden ir en chunks separados).
- Paginación real en `/readings/` (cursor) para historiales muy largos — hoy se pide la primera página.
- Notificaciones toast en vez de solo texto de error inline.
- Tema oscuro.
