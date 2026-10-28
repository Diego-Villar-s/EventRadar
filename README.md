# EventRadar & Festival Match

**Universidad Andina del Cusco - Curso Plataformas para el desarrollo de aplicaciones**

Aplicación web para descubrir eventos musicales, calcular la afinidad con el perfil de Spotify, consultar rutas, revisar el clima del recinto y explorar artistas. El backend de Node.js concentra todas las llamadas a APIs externas; ninguna API key se envía al navegador.

## Funcionalidades

- Login con Spotify OAuth 2.0 + PKCE y validación de `state`.
- Perfil de afinidad calculado con los artistas y canciones más escuchadas.
- Match de 0 a 100 % entre el perfil y cada evento.
- Eventos reales de Ticketmaster con búsqueda, filtros y ordenamiento.
- Detección de ubicación al entrar y cascada **cerca → país → internacional**: si no hay conciertos en el radio elegido (50–500 km), se muestran los del país y luego la cartelera global, siempre indicando el alcance y la distancia de cada evento.
- Rutas con Leaflet y OSRM, geocodificación con Nominatim/Photon.
- Pronóstico del evento con OpenWeatherMap y checklist de equipaje.
- Biografía con Genius y fragmentos de letras con Musixmatch.
- Reproductor global con la API iFrame de Spotify y reproducción de tracks reales.
- Caché en memoria, errores estructurados y estados vacíos honestos.
- Diseño responsive con navbar global, mini player y navegación móvil.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Credenciales de las APIs que quieras habilitar.

## Instalación local

```bash
npm ci
cp .env.example .env
```

En Windows PowerShell:

```powershell
npm ci
Copy-Item .env.example .env
```

Edita `.env` con tus credenciales reales. El archivo `.env` está ignorado por Git.

### Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `PORT` | No | Puerto HTTP. Por defecto `3000`. |
| `HOST` | No | Interfaz de escucha. Por defecto `0.0.0.0`. |
| `BASE_URL` | Sí en producción | URL pública sin barra final. Por defecto `http://127.0.0.1:3000`. |
| `NODE_ENV` | No | `development` o `production`. |
| `TRUST_PROXY` | Producción detrás de proxy | `true` para confiar en `X-Forwarded-*` y usar cookies seguras. |
| `SESSION_SECRET` | Sí en producción | Secreto de 32+ caracteres para firmar la cookie de sesión. |
| `SPOTIFY_CLIENT_ID` | Sí | Client ID de la app de Spotify. |
| `SPOTIFY_CLIENT_SECRET` | Sí | Client Secret de Spotify. |
| `SPOTIFY_REDIRECT_URI` | Recomendada | Debe coincidir exactamente con Spotify Dashboard. Si falta, se usa `${BASE_URL}/callback`. |
| `SPOTIFY_MARKET` | No | Mercado de Spotify; por defecto `ES`. |
| `TICKETMASTER_API_KEY` | Recomendada | Descubrimiento de eventos. |
| `OPENWEATHER_API_KEY` | Recomendada | Clima y pronóstico. |
| `GENIUS_ACCESS_TOKEN` | Recomendada | Biografías de artistas. |
| `MUSIXMATCH_API_KEY` | Recomendada | Fragmentos de letras. |

Genera un secreto de sesión con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configurar Spotify

1. Crea una app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
2. En **Redirect URIs** agrega exactamente:
   - Desarrollo: `http://127.0.0.1:3000/callback`
   - Producción: `https://TU_DOMINIO/callback`
3. Copia `Client ID` y `Client Secret` a `.env`.
4. Si la app de Spotify está en modo desarrollo, agrega tu cuenta en **Users and Access**.
5. El callback se atiende en `/callback` y redirige a `/#callback=success` o `/#callback=error`.

En producción, `SPOTIFY_REDIRECT_URI` debe usar el mismo dominio HTTPS de `BASE_URL`.
Si `SPOTIFY_REDIRECT_URI` no está definido, el servidor lo deriva automáticamente como
`${BASE_URL}/callback`.

### Si el login falla en Render

1. Entra a la app con el mismo dominio que configuraste. Si `SPOTIFY_REDIRECT_URI`
   apunta a otro host, `/auth/login` muestra una página explicando el desajuste en
   lugar de enviarte a un error de Spotify.
2. En Render, `BASE_URL` y `SPOTIFY_REDIRECT_URI` deben ser:
   - `BASE_URL=https://TU_SERVICIO.onrender.com`
   - `SPOTIFY_REDIRECT_URI=https://TU_SERVICIO.onrender.com/callback`
3. En Spotify Dashboard → **Redirect URIs**, agrega exactamente esa misma URL
   (sin barra final). No basta con el callback de localhost.
4. Si la app de Spotify está en **Development mode**, solo pueden entrar las cuentas
   agregadas en **Users and Access**. Para cualquier otra cuenta Spotify devuelve
   `access_denied` y la app muestra el motivo.
5. Si el login termina bien pero la app no muestra tu cuenta y en los logs aparece
   `Spotify profile lookup failed after login: {"status":403,...}`, Spotify autorizó
   el login pero está bloqueando la Web API. El mensaje exacto de Spotify suele ser
   `Active premium subscription required for the owner of the app`. Revisa en este orden:
   - **Premium del dueño**: la cuenta owner de la app debe tener Spotify Premium
     activo. Es un requisito de Development Mode desde 2026. Tras activarlo, Spotify
     puede tardar unas horas en desbloquear las peticiones.
   - **Settings → Web API**: la app debe tener la Web API habilitada.
   - **Users and Access**: agrega el email exacto de tu cuenta. En Development Mode
     solo pueden usar la app las cuentas listadas.
   - Si ya estaba todo bien, puede ser un fallo temporal de Spotify: reintenta más tarde.
   Después de cambiar algo, cierra sesión y vuelve a entrar para obtener un token nuevo.
6. Abre `GET /api/spotify/diagnostics` con la sesión iniciada para ver el estado
   exacto que devuelve Spotify y las pistas de configuración.
7. Revisa `GET /api/health`: `integrations.spotify` debe ser `true`.

El callback guarda una instantánea mínima del perfil en la sesión firmada, así que la
navbar muestra tu cuenta aunque Spotify tarde o falle al responder `/api/me`.

## Otras APIs

- **Ticketmaster**: [developer.ticketmaster.com](https://developer.ticketmaster.com/)
- **OpenWeatherMap**: [openweathermap.org/api](https://openweathermap.org/api)
- **Genius**: [genius.com/api-clients](https://genius.com/api-clients)
- **Musixmatch**: [developer.musixmatch.com](https://developer.musixmatch.com/)

Si falta una clave o una API falla, la interfaz muestra un mensaje o un estado vacío. No se generan eventos, climas, letras ni biografías de ejemplo presentados como reales.

## Ejecutar

```bash
npm run dev   # desarrollo con recarga automática
npm start     # servidor normal
```

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000). Usa `127.0.0.1` en local para que coincida con el redirect de Spotify.

Comprobación de sintaxis e imports del frontend:

```bash
npm run check
```

## Rutas de la SPA

- `#/inicio`: bienvenida si no hay sesión; Match si hay sesión.
- `#/match`: eventos y afinidad.
- `#/ruta/:eventId`: mapa, origen, ruta y pasos.
- `#/clima/:eventId`: pronóstico y checklist.
- `#/artista/:id`: ficha, top tracks, letras, discografía y biografía.

La ruta desconocida vuelve a `#/inicio`.

## API del backend

- `GET /api/health`: estado del proceso y claves configuradas (sin llamadas externas).
- `GET /api/session`: si hay sesión de Spotify, la instantánea del perfil y el último
  error de Spotify (`profileError`), sin llamar a Spotify.
- `GET /api/spotify/diagnostics`: con sesión iniciada, consulta `/me` en vivo y
  devuelve el status real de Spotify más pistas de configuración. No expone tokens.
- `GET /api/events`: listado de Ticketmaster. Acepta `lat`, `lng`, `radius` (1–500),
  `unit`, `countryCode`, `city`, `keyword`, `size` y `page`. La respuesta incluye
  `meta.scope` (`nearby`, `country`, `city` o `global`) y `distanceKm` por evento.
- `GET /api/events/:id`: detalle de un evento.
- `GET /api/weather?lat=...&lng=...`: clima del recinto.
- `GET /api/artist/:id`: detalle de Spotify.
- `GET /api/artist/search?name=...`: búsqueda de artistas.
- `GET /api/artist/lyrics?artist=...&track=...`: letra o fragmento.
- `GET /api/geo/route`: ruta OSRM.
- `GET /api/geo/geocode`: geocodificación.
- `GET /api/me`, `GET /api/profile/affinity`: datos del usuario autenticado.
- `GET /auth/login`, `GET /auth/logout`, `GET /callback`.

## Seguridad y producción

- `helmet` con CSP, `frame-ancestors 'none'`, `object-src 'none'` y HSTS en producción.
  La CSP incluye `'unsafe-eval'` porque la API iFrame de Spotify evalúa su propio código;
  el código propio de la aplicación no usa `eval`.
- `cookie-session` firmada, `httpOnly`, `SameSite=Lax` y `Secure` en producción. No usa `MemoryStore`.
- Rate limiting en `/api` y en autenticación.
- `trust proxy` y cookies seguras detrás de HTTPS.
- Errores 500 genéricos para el cliente; el detalle queda en el log del servidor.
- Claves y tokens solo en el backend.
- En producción el servidor se niega a iniciar si `SESSION_SECRET` falta o es un valor de ejemplo.

### Render

El repositorio incluye `render.yaml` con:
- Build: `npm ci`.
- Start: `npm start`.
- Health check: `/api/health`.
- `SESSION_SECRET` generado por Render.
- Variables secretas marcadas para configurar manualmente.

Después del despliegue configura en Render:
1. `BASE_URL=https://tu-servicio.onrender.com`
2. `SPOTIFY_REDIRECT_URI=https://tu-servicio.onrender.com/callback`
3. Las claves de Spotify y de las demás APIs.
4. Verifica que el Redirect URI esté agregado en Spotify Dashboard.

## Estructura

```text
eventradar/
├── server.js                 # Express, seguridad, sesión y estáticos
├── src/
│   ├── routes/               # Endpoints HTTP
│   ├── services/             # Integraciones externas
│   └── utils/                # Caché, matching y géneros
├── public/
│   ├── css/
│   ├── js/
│   │   ├── components/
│   │   └── views/
│   └── index.html
├── scripts/                  # Verificación de sintaxis e imports
├── render.yaml
├── .env.example
└── package.json
```

## Limitaciones conocidas

- La instancia pública de OSRM no cubre rutas intercontinentales. La app rechaza rutas cuyo trayecto no llega al destino real y muestra un mensaje en lugar de inventar un recorrido.
- Genius puede responder `401` si el token no es válido; la ficha del artista indica el error.
- Musixmatch puede limitar el acceso al fragmento de letras según el plan de la cuenta.
- El reproductor de Spotify requiere una cuenta con sesión y puede necesitar Spotify Premium para controlar la reproducción según las reglas de Spotify.
- Las APIs externas pueden fallar o limitar solicitudes; la app no sustituye esos datos con contenido ficticio.

## Créditos

Proyecto desarrollado para el curso **Plataformas para el desarrollo de aplicaciones** de la Universidad Andina del Cusco.
