# EventRadar & Festival Match

**Universidad Andina del Cusco - Curso Plataformas para el desarrollo de aplicaciones**

Aplicación web completa y funcional para descubrir festivales musicales basados en tu afinidad con Spotify, planificar rutas, consultar el clima y conocer más sobre los artistas.

## Características

- **Autenticación con Spotify** (OAuth 2.0 con PKCE)
- **Perfil de afinidad musical** calculado desde tus top artistas y tracks
- **Descubrimiento de eventos** con Ticketmaster (modo demo si no hay API key)
- **Sistema de match** entre tu perfil y eventos (0-100%)
- **Rutas e itinerarios** con Leaflet y OSRM
- **Pronóstico del clima** con OpenWeatherMap
- **Información de artistas** con Genius API
- **Letras de canciones** con Musixmatch (snippet gratuito)
- **Reproductor integrado** con Spotify

## Tecnologías

- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript + HTML + CSS
- **APIs**: Spotify, Ticketmaster, OpenWeatherMap, Genius, Musixmatch, OSRM, Nominatim
- **Mapas**: Leaflet
- **Diseño**: Sistema Luminescent Slate (Apple-inspired dark UI)

## Instalación

### 1. Clonar o descargar el proyecto

```bash
cd eventradar
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env` y configura las API keys:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
PORT=3000
BASE_URL=http://127.0.0.1:3000
SESSION_SECRET=tu_secreto_aleatorio_aqui

# Spotify
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/callback

# Otras APIs
TICKETMASTER_API_KEY=tu_ticketmaster_key
OPENWEATHER_API_KEY=tu_openweather_key
GENIUS_ACCESS_TOKEN=tu_genius_token
MUSIXMATCH_API_KEY=tu_musixmatch_key
```

### 4. Configurar Spotify

1. Ve a [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Crea una nueva app
3. En "Edit Settings", agrega `http://127.0.0.1:3000/callback` como Redirect URI
4. Copia Client ID y Client Secret al `.env`
5. **Importante**: En modo desarrollo, ve a "Users and Access" y agrega el email de la cuenta Spotify que usarás para probar

### 5. Obtener otras API Keys

- **Ticketmaster**: [developer.ticketmaster.com](https://developer.ticketmaster.com/) - Gratis
- **OpenWeatherMap**: [openweathermap.org/api](https://openweathermap.org/api) - Gratis (plan free)
- **Genius**: [genius.com/api-clients](https://genius.com/api-clients) - Gratis
- **Musixmatch**: [developer.musixmatch.com](https://developer.musixmatch.com/) - Gratis

### 6. Ejecutar la aplicación

**Modo desarrollo (con auto-reload):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

Abre [http://127.0.0.1:3000](http://127.0.0.1:3000) en tu navegador.

## Uso

1. **Conectar Spotify**: Haz clic en "Iniciar sesión con Spotify" para autenticarte
2. **Explorar eventos**: Ve a la pestaña "Radar" para ver festivales recomendados con tu % de match
3. **Planificar ruta**: En "Rutas & Acceso" puedes ver cómo llegar al recinto
4. **Consultar clima**: En "Clima" revisa el pronóstico y tu checklist de equipaje
5. **Conocer artistas**: En "Artistas" ve letras y más información

## Modo Demo

Si no configuras algunas API keys, la aplicación seguirá funcionando con:
- **Ticketmaster**: 4 eventos de ejemplo (Primavera Sound, Sónar, Mad Cool, Lollapalooza)
- **OpenWeatherMap**: Datos climáticos simulados
- **Genius/Musixmatch**: Sin información de letras/artistas externa
- **Spotify**: Requiere configuración obligatoria para login

## Estructura del Proyecto

```
eventradar/
├── server.js           # Servidor Express
├── src/
│   ├── routes/         # Rutas de API
│   ├── services/       # Integración con APIs externas
│   └── utils/          # Utilidades (cache, matchScore, etc.)
├── public/
│   ├── css/            # Estilos
│   ├── js/             # Frontend JavaScript
│   │   ├── views/      # Vistas de la app
│   │   ├── components/ # Componentes reutilizables
│   │   └── app.js      # Entry point
│   └── index.html      # HTML principal
└── reference/          # HTMLs de referencia
```

## Características Técnicas

- **Caché en memoria** con TTL (5-15 minutos) para reducir llamadas a APIs
- **Tokens Spotify** con refresh automático
- **Cálculo de match** sin usar endpoints deprecados de Spotify
- **Diseño responsive** (Desktop, Tablet, Móvil)
- **Accesibilidad**: ARIA labels, foco visible, soporte prefers-reduced-motion
- **Manejo de errores** graceful con fallbacks

## Notas

- Las keys de APIs nunca se exponen al cliente, todas las llamadas pasan por el backend
- En desarrollo usa `127.0.0.1` en lugar de `localhost` para evitar problemas con Spotify
- El reproductor usa Spotify Embed API y Web Playback SDK cuando está disponible
- OSRM usa `router.project-osrm.org` (público, sin key requerida)

## Autor

Proyecto desarrollado para el curso Plataformas para el desarrollo de aplicaciones - Universidad Andina del Cusco
