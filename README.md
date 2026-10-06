# Invernadero — Frontend

Panel web para administrar invernaderos, sensores, actuadores y accesos, consumiendo el backend de `Invernadero-Backend` (Django/DRF).

## Qué hace (y qué NO hace) este frontend

- Crea invernaderos, sensores, actuadores y gestiona membresías (invitar por username/email, cambiar rol, quitar acceso).
- Muestra lecturas de sensores y estado de actuadores **en vivo** vía WebSocket, con historial y gráfica para cada sensor.
- Enciende/apaga actuadores a mano.
- Exporta un invernadero a Excel.
- A propósito, **nunca** manda una lectura de sensor manualmente. Ese dato lo generan los controladores físicos (Arduino/ESP32/Raspberry Pi, etc.) llamando a `POST /api/v1/readings/` con su propia `X-Device-Key`. Este frontend es de solo-lectura para lecturas: verlas, graficarlas, exportarlas — nunca escribirlas.
- Para sensores/actuadores nuevos, ofrece una lista de **tipos predesignados** (con ícono y unidad/rango sugeridos) que hacen match con el catálogo real (`SensorType`/`ActuatorType`) del backend por su `code`. Un usuario normal solo puede elegir entre tipos que ya existen en ese catálogo; un usuario `staff` además puede sembrar tipos nuevos con un clic usando esos valores sugeridos (el backend exige `IsAdminUser` para crear tipos — ver `apps/sensors/views.py` y `apps/actuators/views.py` en el backend).

## Stack

- React 18 + Vite + TypeScript
- TanStack Query (React Query) v5 para todo el estado de servidor (fetch, cache, invalidación)
- axios, configurado para las cookies de sesión + CSRF de Django (`csrftoken` / `X-CSRFToken`)
- react-router-dom v6
- recharts (gráficas de sensores)
- lucide-react (íconos, incluidos los de los "sensores predesignados")
- Tailwind CSS v3 (con tokens por variables CSS: tema claro y oscuro)
- framer-motion (resortes, transiciones de página, modales y listas animadas)
- Fuentes alojadas localmente con `@fontsource`: Bricolage Grotesque (títulos) e IBM Plex Sans (interfaz y datos). No dependen de internet.

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
3. Recibe un evento `snapshot` inicial y después `sensor_reading` / `actuator_state_changed` en vivo, que actualizan la UI y invalidan las queries de historial correspondientes.
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
    useGreenhouses.ts      Todo el CRUD contra la API (invernaderos, sensores, actuadores, membresías, export)
    useRealtime.ts         WebSocket por invernadero
  components/              Layout/AppShell, Sidebar, badges, primitivas de UI (Button, Card, Modal...)
    GreenhouseScene.tsx    Escena SVG del invernadero (cielo según la hora, condensación, luces, ventilador, riego)
    ZonePlan.tsx           Plano de zonas visto desde arriba
    Illustrations.tsx      Ilustraciones de estados vacíos ("brote", "planta sana")
    Toaster.tsx            Avisos breves: toast("Copiado")
    AnimatedNumber.tsx     Número que rueda al cambiar de valor
  lib/theme.ts             Tema claro / oscuro / sistema
  lib/motion.ts            Curvas y duraciones únicas de toda la app
  pages/                   Una página por ruta
```

## Cómo correrlo

Requiere que el backend (`Invernadero-Backend`) esté corriendo en `http://localhost:8000` (por ejemplo con `docker compose up`).

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Para compilar para producción:

```bash
npm run build   # genera dist/
npm run preview # sirve dist/ localmente para probarlo
```

## Sistema de diseño ("invernadero vivo")

**Colores.** Todo sale de `tailwind.config.js`. Las paletas se resuelven a variables CSS, así que las mismas clases (`bg-brand-50`, `text-neutral-600`, `bg-emerald-100`...) funcionan en los dos temas:

| Token | Claro | Uso |
|---|---|---|
| `brand` (clorofila) | `#1F5E3B` en 700 | Botones, navegación, acentos |
| `neutral` (vidrio) | grises teñidos de verde | Texto y bordes |
| `canvas` / `surface` | `#E9F0E7` / `#FBFCF9` | Fondo de página / tarjetas |
| `amber`, `sky`, `red`... | Tailwind | Luz, agua, alertas |

En oscuro ("noche de cultivo") las variables cambian solas: los extremos de cada escala se invierten. Para agregar un color nuevo, súmalo a `STANDARD` (o define su escala clara/oscura) en `tailwind.config.js`.

**Tema.** Día / Noche / Sistema desde el menú (o el botón de sol/luna en celular y login). Se guarda en `localStorage` y un script de `index.html` lo aplica antes de pintar para que no parpadee.

**Tipografía.** Títulos `h1–h3` usan `font-display` (Bricolage Grotesque); el resto IBM Plex Sans. Para números que cambian en vivo usa la clase `num` (cifras tabulares).

**Movimiento.** Curvas y duraciones en `src/lib/motion.ts` (`spring`, `EASE_LEAF`, `pageVariants`). Reglas:

- El movimiento continuo solo está en la escena del invernadero, el login y los medidores en vivo. El resto se mueve cuando el usuario hace algo (abrir, cambiar de página, confirmar).
- **Control "Animaciones" en el menú:** *Sistema* respeta la preferencia de movimiento reducido del sistema operativo (en Windows: Configuración → Accesibilidad → Efectos visuales → Efectos de animación). *Sí* anima siempre. *Quietas* no anima nunca. Se guarda en el navegador (`localStorage`, clave `motion`).
- Con movimiento reducido, todas las animaciones CSS se detienen (`index.css`) y los componentes de framer-motion usan `useCalm()` para aparecer sin desplazamiento.
- **Pestaña oculta:** las animaciones CSS se pausan (`usePauseWhenHidden` en `lib/theme.ts`) para no gastar batería.

**La escena del invernadero** (`GreenhouseScene`) solo refleja datos reales: la hora local del invernadero (su `timezone`), la humedad del primer sensor de humedad y el estado real de los actuadores:

| Tipo (código) | En la escena |
|---|---|
| Ventilador (`fan`) | Gira el ventilador del frontón |
| Iluminación (`light`) | Luz de cultivo violeta |
| Bomba de agua / válvula (`water_pump`, `valve`) | Gotas desde la tubería de riego |
| Nebulizador (`mister`) | Neblina entre las plantas |
| Calefactor (`heater`) | Resplandor cálido y ondas de calor |
| Enfriador (`cooler`) | Tinte frío y corrientes de aire |
| Cortina / malla (`curtain`) | La malla de sombra baja sobre el techo |
| Cualquier actuador | Un foco en el tablero de control (verde = encendido) |

El tipo se reconoce por su código o por palabras de su nombre (ver `findActuatorPreset` en `lib/actuatorPresets.ts`). En el login es decorativa y usa la hora del dispositivo.

**Cómo añadir un tipo de medidor.**
1. Agrega el preset en `src/lib/sensorPresets.ts` (código, nombre, unidad, rango, ícono, color `hex`).
2. Agrega su código a `SensorKind` y su dibujo en `SensorArt.tsx`, en un `viewBox` de 64×64. Usa `pct` (0..1) para llenar o mover.
3. Si no lo dibujas, se usa el medidor genérico automáticamente.

**Accesibilidad.** Foco visible en todo, modales con foco atrapado y cierre con Escape, interruptores con `role="switch"`, enlace "Saltar al contenido", contraste AA en los dos temas, y los estados nunca dependen solo del color (llevan texto o ícono).

## Pendientes / ideas para seguir

- Paginación real en `/readings/` (cursor) para historiales muy largos — hoy se pide la primera página.
