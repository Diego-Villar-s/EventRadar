# EventRadar & Festival Match

**Universidad Andina del Cusco - Curso Plataformas para el desarrollo de aplicaciones**

Aplicación web para descubrir eventos musicales, calcular la afinidad con tu perfil de Last.fm, consultar rutas, revisar el clima del recinto y explorar artistas. El backend de Node.js concentra todas las llamadas a APIs externas; ninguna API key se envía al navegador.

## Funcionalidades

- Conexión con **Last.fm** mediante nombre de usuario público, sin OAuth ni contraseña.
- Perfil de afinidad calculado con los artistas, canciones y etiquetas más escuchadas.
- Match de 0 a 100 % entre el perfil y cada evento.
- Eventos reales de Ticketmaster con búsqueda, filtros y ordenamiento.
- Detección de ubicación al entrar y cascada **cerca → país → internacional**: si no hay conciertos en el radio elegido (50–500 km), se muestran los del país y luego la cartelera global, siempre indicando el alcance y la distancia de cada evento.
- Rutas con Leaflet y OSRM, geocodificación con Nominatim/Photon.
- Pronóstico del evento con OpenWeatherMap y checklist de equipaje.
- Biografía con Genius y letras completas con LRCLIB; Musixmatch queda como respaldo opcional.
- Catálogo de artistas con **Deezer**: búsqueda, ficha, top de canciones y discografía.
- Reproductor global de **previews de 30 segundos** de Deezer usando `<audio>`.
- Caché en memoria, errores estructurados y estados vacíos honestos.
- Diseño responsive con navbar global, mini player y navegación móvil.

> **Spotify está temporalmente en pausa.** Su Web API exige una suscripción Premium en la cuenta dueña de la app (Development Mode). El código de Spotify se conserva para reactivarlo, pero el login y la afinidad activos usan Last.fm y Deezer, que son gratuitos.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.
- Una API key gratuita de Last.fm.
- Credenciales de las demás APIs que quieras habilitar.

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
| `LASTFM_API_KEY` | Sí para afinidad | API key gratuita de Last.fm. |
| `TICKETMASTER_API_KEY` | Recomendada | Descubrimiento de eventos. |
| `OPENWEATHER_API_KEY` | Recomendada | Clima y pronóstico. |
| `GENIUS_ACCESS_TOKEN` | Recomendada | Biografías de artistas. |
| `MUSIXMATCH_API_KEY` | No | Respaldo opcional de letras. LRCLIB (principal) no necesita clave. |
| `SPOTIFY_CLIENT_ID` | No (en pausa) | Se conserva para reactivar Spotify. |
| `SPOTIFY_CLIENT_SECRET` | No (en pausa) | Se conserva para reactivar Spotify. |
| `SPOTIFY_REDIRECT_URI` | No (en pausa) | Debe coincidir con Spotify Dashboard al reactivarlo. |
| `SPOTIFY_MARKET` | No (en pausa) | Mercado de Spotify; por defecto `ES`. |

Deezer no necesita variables: su API pública de catálogo es keyless y se consulta desde el servidor.

Genera un secreto de sesión con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Configurar Last.fm

1. Crea una cuenta gratuita en [last.fm/join](https://www.last.fm/join).
2. Entra a [last.fm/api/account/create](https://www.last.fm/api/account/create) y crea una API key.
3. Copia la key en `LASTFM_API_KEY` dentro de `.env` (local) o en Render → Environment.
4. Abre `GET /auth/login` y escribe tu **nombre de usuario público** de Last.fm.
5. La app valida el usuario con `user.getInfo` y guarda el nombre en la sesión firmada.

No se pide contraseña ni se realizan scrobbles: la API solo se usa para leer los artistas, canciones y etiquetas principales del perfil.

Si el usuario no tiene scrobbles, la app muestra estados vacíos honestos en lugar de inventar afinidad.

## Configurar Deezer

Deezer no requiere registro para leer su catálogo público:

- Búsqueda de artistas: `https://api.deezer.com/search/artist`.
- Ficha, top de canciones y álbumes: `/artist/:id`, `/artist/:id/top`, `/artist/:id/albums`.
- Previews: MP3 de 30 segundos incluidos en cada track cuando Deezer los ofrece.

Las llamadas se hacen desde el servidor porque la API de Deezer no habilita CORS para el navegador. Las previews se reproducen en el navegador con un elemento `<audio>`.

## Reactivar Spotify en el futuro

El código de Spotify sigue en `src/services/spotify.js` y `src/routes/spotify.js`, y el callback sigue disponible en `/callback`. Para volver a usarlo:

1. Configura `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` y `SPOTIFY_REDIRECT_URI`.
2. Agrega el redirect exacto en Spotify Dashboard.
3. Cambia el enlace de login del frontend de `/auth/login` a `/auth/spotify`.
4. Sustituye la fuente de afinidad en `src/routes/events.js` y `src/routes/spotify.js` por el flujo de Spotify.
5. Verifica el estado con `GET /api/spotify/diagnostics` y `GET /api/health`.

El handler de Spotify se conserva en `GET /auth/spotify` justamente para no perder la implementación OAuth + PKCE.

## Otras APIs

- **Ticketmaster**: [developer.ticketmaster.com](https://developer.ticketmaster.com/)
- **OpenWeatherMap**: [openweathermap.org/api](https://openweathermap.org/api)
- **Genius**: [genius.com/api-clients](https://genius.com/api-clients)
- **LRCLIB**: [lrclib.net](https://lrclib.net/) (letras libres, sin clave)
- **Musixmatch**: [developer.musixmatch.com](https://developer.musixmatch.com/) (respaldo opcional)

Si falta una clave o una API falla, la interfaz muestra un mensaje o un estado vacío. No se generan eventos, climas, letras ni biografías de ejemplo presentados como reales.

## Ejecutar

```bash
npm run dev   # desarrollo con recarga automática
npm start     # servidor normal
```

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000).

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

- `GET /api/health`: estado del proceso y claves configuradas (sin llamadas externas). Incluye `integrations.lastfm`, `integrations.deezer`, `integrations.lrclib` y `integrations.spotifyPaused`.
- `GET /api/session`: sesión activa de Last.fm (usuario e imagen), sin llamar a Last.fm.
- `GET /api/me`: perfil normalizado del usuario de Last.fm conectado.
- `GET /api/profile/affinity`: artistas, canciones y géneros principales del usuario.
- `POST /api/lastfm/connect`: conecta un usuario de Last.fm por JSON (`{ "username": "..." }`).
- `POST /api/lastfm/disconnect`: borra la conexión de Last.fm de la sesión.
- `GET /api/lastfm/status`: indica si Last.fm está configurado y si hay usuario conectado.
- `GET /api/events`: listado de Ticketmaster. Acepta `lat`, `lng`, `radius` (1–500), `unit`, `countryCode`, `city`, `keyword`, `size` y `page`. La respuesta incluye `meta.scope` (`nearby`, `country`, `city` o `global`) y `distanceKm` por evento.
- `GET /api/events/:id`: detalle de un evento.
- `GET /api/weather?lat=...&lng=...`: clima del recinto.
- `GET /api/artist/:id`: detalle de Deezer (acepta id numérico o nombre).
- `GET /api/artist/search?name=...`: búsqueda de artistas en Deezer.
- `GET /api/artist/preview?name=...`: preview de 30 s del artista en Deezer.
- `GET /api/artist/:id/albums`: discografía desde Deezer.
- `GET /api/artist/lyrics?artist=...&track=...`: letra o fragmento.
- `GET /api/geo/route`: ruta OSRM.
- `GET /api/geo/geocode`: geocodificación.
- `GET /api/spotify/diagnostics`: diagnóstico del flujo Spotify (en pausa).
- `GET /auth/login`: página para conectar Last.fm.
- `POST /auth/lastfm`: valida el usuario y crea la sesión.
- `GET /auth/spotify`: flujo OAuth de Spotify conservado para reactivarlo.
- `GET /auth/logout`: cierra la sesión.
- `GET /callback`: callback OAuth de Spotify (en pausa).

## Seguridad y producción

- `helmet` con CSP, `frame-ancestors 'none'`, `object-src 'none'` y HSTS en producción.
- La CSP ya no necesita `'unsafe-eval'`: no se carga la API iFrame de Spotify.
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
2. `LASTFM_API_KEY` con la key gratuita de Last.fm.
3. Las claves de Ticketmaster, OpenWeather y Genius. Musixmatch es opcional.
4. Opcionalmente, las variables de Spotify si decides reactivarlo.

## Estructura

```text
eventradar/
├── server.js                 # Express, seguridad, sesión y estáticos
├── src/
│   ├── routes/               # Endpoints HTTP
│   ├── services/             # Integraciones externas (Deezer, Last.fm, etc.)
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

- Deezer no ofrece preview de 30 s para todo su catálogo; el botón de reproducción se deshabilita cuando no hay fragmento.
- Last.fm necesita que el usuario tenga scrobbles para calcular una afinidad útil.
- La instancia pública de OSRM no cubre rutas intercontinentales. La app rechaza rutas cuyo trayecto no llega al destino real y muestra un mensaje en lugar de inventar un recorrido.
- Genius puede responder `401` si el token no es válido; la ficha del artista indica el error.
- LRCLIB puede responder `503` si está saturado; la app reintenta una vez y muestra un mensaje para reintentar.
- Si configuras Musixmatch, su plan gratuito suele devolver solo fragmentos de letra.
- Las APIs externas pueden fallar o limitar solicitudes; la app no sustituye esos datos con contenido ficticio.

## Créditos

Proyecto desarrollado para el curso **Plataformas para el desarrollo de aplicaciones** de la Universidad Andina del Cusco.
