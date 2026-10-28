import { getEvent, getEvents, getRoute, geocodeAddress, reverseGeocode } from '../api.js';
import { DARK_MAP_FILTER, MAP_ATTRIBUTION, MAP_TILE_SUBDOMAINS, MAP_TILE_URL } from '../config.js';
import { emptyState, escapeHtml, formatEventDate, formatEventTime, hasValidCoordinates } from '../utils.js';

function formatDistance(km) {
  if (!Number.isFinite(Number(km))) return '—';
  return Number(km) < 1 ? `${Math.round(Number(km) * 1000)} m` : `${Number(km).toFixed(1)} km`;
}

function formatMinutes(minutes) {
  if (!Number.isFinite(Number(minutes))) return '—';
  const total = Math.round(Number(minutes));
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${total % 60} min`;
}

function stepInstruction(step) {
  const type = step.maneuver?.type || 'continue';
  const modifier = step.maneuver?.modifier || '';
  const name = step.name ? ` por ${step.name}` : '';
  const destination = step.destinations ? ` hacia ${step.destinations}` : '';

  if (type === 'depart') return `Sal${name || ' del punto de origen'}`;
  if (type === 'arrive') return `Llega a ${step.name || 'tu destino'}`;
  if (type === 'roundabout' || type === 'rotary') return `Entra en la rotonda y toma la salida${name}`;
  if (type === 'merge') return `Incorpórate${name}`;
  if (type === 'fork') return `Toma el desvío ${modifier}${name}`;
  if (type === 'end of road') return `Al final de la vía, gira ${modifier}${name}`;
  if (modifier) return `Gira ${modifier}${name}${destination}`;
  return `Continúa${name}${destination}`;
}

export class RouteDetailView {
  constructor(container, props = {}) {
    this.container = container;
    this.eventId = props.eventId || null;
    this.event = null;
    this.error = null;
    this.origin = this.readOrigin();
    this.route = null;
    this.routeError = null;
    this.map = null;
    this.routeLayer = null;
    this.originMarker = null;
    this.eventMarker = null;
    this.handleClick = this.handleClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  readOrigin() {
    try {
      const saved = localStorage.getItem('eventradar.origin');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  saveOrigin(origin) {
    this.origin = origin;
    try {
      localStorage.setItem('eventradar.origin', JSON.stringify(origin));
    } catch {
      // Sin localStorage la ruta sigue funcionando durante la sesión.
    }
  }

  async render() {
    this.destroyMap();
    this.container.innerHTML = `
      <div class="route-page">
        <main class="route-main">
          <div id="routeContent">
            <div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando evento…</span></div>
          </div>
        </main>
      </div>
    `;
    this.container.addEventListener('click', this.handleClick);
    this.container.addEventListener('submit', this.handleSubmit);

    if (!this.eventId) {
      await this.renderPicker();
      return;
    }
    await this.loadEvent();
  }

  async renderPicker() {
    const content = this.container.querySelector('#routeContent');
    if (!content) return;
    content.innerHTML = `
      <div class="route-title-section">
        <div>
          <div class="route-breadcrumb"><span>Rutas</span><span class="route-breadcrumb-dot">•</span><span class="route-breadcrumb-highlight">Selecciona un evento</span></div>
          <h1 class="route-title">Rutas de acceso</h1>
        </div>
      </div>
      <div id="routePicker"><div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando eventos…</span></div></div>
    `;

    const result = await getEvents({ size: 10 });
    const picker = this.container.querySelector('#routePicker');
    if (!picker) return;
    if (result.error) {
      picker.innerHTML = emptyState({
        icon: 'cloud_off',
        title: 'No se pudieron cargar los eventos',
        message: result.error.message
      });
      return;
    }
    if (!result.events?.length) {
      picker.innerHTML = emptyState({
        icon: 'event_busy',
        title: 'No hay eventos disponibles',
        message: 'Ticketmaster no devolvió eventos próximos con recinto.'
      });
      return;
    }

    picker.innerHTML = `
      <div class="event-picker">
        ${result.events.map((event) => `
          <a class="event-picker-item" href="#/ruta/${encodeURIComponent(event.id)}">
            <span class="material-symbols-outlined">location_on</span>
            <span><strong>${escapeHtml(event.name)}</strong><small>${escapeHtml(event.venue || 'Recinto por confirmar')}${event.city ? ` · ${escapeHtml(event.city)}` : ''}</small></span>
            <span class="material-symbols-outlined">chevron_right</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  async loadEvent() {
    const result = await getEvent(this.eventId);
    this.event = result.event;
    this.error = result.error;

    if (!this.event) {
      const content = this.container.querySelector('#routeContent');
      if (content) {
        content.innerHTML = emptyState({
          icon: 'wrong_location',
          title: 'No se pudo cargar el evento',
          message: this.error?.message || 'El evento no existe o ya no está disponible.',
          action: '<a class="event-card-ref-btn glass" href="#/ruta">Elegir otro evento</a>'
        });
      }
      return;
    }

    this.renderEvent();
    await this.initMap();
    if (this.origin && this.hasCoordinates()) {
      await this.calculateRoute();
    }
  }

  hasCoordinates() {
    return hasValidCoordinates(this.event?.lat, this.event?.lng);
  }

  renderEvent() {
    this.destroyMap();
    const content = this.container.querySelector('#routeContent');
    if (!content) return;
    const event = this.event;
    const hasCoords = this.hasCoordinates();
    const googleOrigin = this.origin ? `${this.origin.lat},${this.origin.lng}` : '';
    const googleDestination = hasCoords ? `${event.lat},${event.lng}` : '';
    const googleUrl = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(googleOrigin)}&destination=${encodeURIComponent(googleDestination)}&travelmode=driving`
      : null;

    content.innerHTML = `
      <div class="route-title-section">
        <div>
          <div class="route-breadcrumb">
            <a href="#/match">Eventos</a>
            <span class="route-breadcrumb-dot">•</span>
            <span class="route-breadcrumb-highlight">${escapeHtml(event.name)}</span>
          </div>
          <h1 class="route-title">Ruta hasta ${escapeHtml(event.venue || 'el recinto')}</h1>
          <p class="route-subtitle">${escapeHtml(formatEventDate(event))}${formatEventTime(event) ? ` · ${escapeHtml(formatEventTime(event))}` : ''} · ${escapeHtml(event.city || 'Ciudad por confirmar')}</p>
        </div>
        <a class="route-status-pill" href="#/clima/${encodeURIComponent(event.id)}">
          <span class="route-status-dot-wrapper"><span class="route-status-dot"></span><span class="route-status-dot-ping"></span></span>
          <span class="route-status-text">Ver clima</span>
          <span class="material-symbols-outlined">chevron_right</span>
        </a>
      </div>

      <section class="route-origin-card" aria-label="Punto de partida">
        <div class="route-origin-copy">
          <span class="material-symbols-outlined">my_location</span>
          <div>
            <strong>${this.origin ? 'Origen seleccionado' : 'Elige tu punto de partida'}</strong>
            <p>${this.origin ? escapeHtml(this.origin.label || 'Ubicación guardada') : 'Usa tu ubicación actual o busca una dirección para calcular la ruta.'}</p>
          </div>
        </div>
        <div class="route-origin-actions">
          <button class="route-action-btn" type="button" data-action="locate"><span class="material-symbols-outlined">my_location</span> Usar mi ubicación</button>
          <form class="route-origin-form" id="originForm">
            <input type="search" name="address" placeholder="Buscar dirección de origen" aria-label="Dirección de origen" autocomplete="off">
            <button class="route-action-btn" type="submit"><span class="material-symbols-outlined">search</span> Buscar</button>
          </form>
        </div>
      </section>

      ${hasCoords ? `
        <div class="route-grid">
          <div class="route-card">
            <div class="route-card-header">
              <div>
                <span class="route-card-badge">Ruta en auto</span>
                <h2 class="route-card-title" id="routeSummaryTitle">${this.route ? `${formatDistance(this.route.distance)} · ${formatMinutes(this.route.duration)}` : 'Calcula tu ruta'}</h2>
              </div>
              <div class="route-card-time-box">
                <div class="route-card-time" id="routeEta">${this.route ? this.etaText() : '—'}</div>
                <div class="route-card-dist" id="routeDistance">${this.route ? formatDistance(this.route.distance) : 'Sin calcular'}</div>
              </div>
            </div>
            <div id="routeSteps" class="route-steps">
              ${this.route ? this.renderSteps() : '<p class="route-empty-inline">Selecciona un origen para ver las indicaciones.</p>'}
            </div>
            <div class="route-card-actions">
              ${googleUrl ? `<a class="route-action-btn" href="${escapeHtml(googleUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">open_in_new</span> Abrir en Google Maps</a>` : ''}
            </div>
          </div>
          <div class="route-map-section">
            <div class="route-map-container">
              <div id="routeMap" class="route-map${DARK_MAP_FILTER ? ' dark-map' : ''}"></div>
            </div>
            <div class="route-map-telemetry">
              <div class="route-map-telemetry-item"><div class="route-map-telemetry-label">Distancia</div><div class="route-map-telemetry-value" id="telemetryDistance">${this.route ? formatDistance(this.route.distance) : '—'}</div></div>
              <div class="route-map-telemetry-divider"></div>
              <div class="route-map-telemetry-item"><div class="route-map-telemetry-label">Duración</div><div class="route-map-telemetry-value green" id="telemetryDuration">${this.route ? formatMinutes(this.route.duration) : '—'}</div></div>
              <div class="route-map-telemetry-divider"></div>
              <div class="route-map-telemetry-item"><div class="route-map-telemetry-label">Recinto</div><div class="route-map-telemetry-value">${escapeHtml(event.venue || '—')}</div></div>
            </div>
          </div>
        </div>
      ` : `
        ${emptyState({
          icon: 'wrong_location',
          title: 'El recinto no tiene coordenadas',
          message: 'Ticketmaster no proporcionó la ubicación exacta de este recinto, así que no se puede calcular una ruta real.',
          action: `<a class="event-card-ref-btn glass" href="#/ruta">Elegir otro evento</a>`
        })}
        <div class="route-venue-note"><strong>Dirección:</strong> ${escapeHtml([event.address, event.city, event.country].filter(Boolean).join(', ') || 'No disponible')}</div>
      `}
    `;
  }

  etaText() {
    if (!this.route) return '—';
    const eta = new Date(Date.now() + this.route.duration * 60000);
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(eta);
  }

  renderSteps() {
    const steps = this.route?.legs?.[0]?.steps || [];
    if (steps.length === 0) {
      return '<p class="route-empty-inline">OSRM no devolvió indicaciones paso a paso para esta ruta.</p>';
    }
    return steps.map((step, index) => `
      <div class="route-step">
        <div class="route-step-number ${index === 0 ? 'blue' : index === steps.length - 1 ? 'green' : 'yellow'}">${index + 1}</div>
        <div class="route-step-content">
          <div class="route-step-header">
            <div class="route-step-title">${escapeHtml(stepInstruction(step))}</div>
            <span class="route-step-tag">${escapeHtml(formatDistance((step.distance || 0) / 1000))}</span>
          </div>
          <div class="route-step-desc">${escapeHtml(formatMinutes((step.duration || 0) / 60))}</div>
        </div>
      </div>
    `).join('');
  }

  async initMap() {
    const container = this.container.querySelector('#routeMap');
    if (!container) return;
    if (!window.L) {
      container.innerHTML = emptyState({
        icon: 'map',
        title: 'Mapa no disponible',
        message: 'No se pudo cargar Leaflet. Revisa la conexión y vuelve a intentarlo.'
      });
      return;
    }
    if (!this.hasCoordinates()) return;

    this.map = window.L.map(container, { zoomControl: true, scrollWheelZoom: false });
    window.L.tileLayer(MAP_TILE_URL, {
      attribution: MAP_ATTRIBUTION,
      subdomains: MAP_TILE_SUBDOMAINS,
      maxZoom: 19
    }).addTo(this.map);

    const eventPoint = [Number(this.event.lat), Number(this.event.lng)];
    this.map.setView(eventPoint, 13);
    this.eventMarker = window.L.marker(eventPoint, {
      icon: window.L.divIcon({ className: 'event-map-pin', html: '<span class="material-symbols-outlined">location_on</span>', iconSize: [34, 34], iconAnchor: [17, 34] })
    }).addTo(this.map).bindPopup(escapeHtml(this.event.venue || this.event.name));

    if (this.origin) this.addOriginMarker();
    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  addOriginMarker() {
    if (!this.map || !this.origin) return;
    if (this.originMarker) this.originMarker.remove();
    this.originMarker = window.L.marker([Number(this.origin.lat), Number(this.origin.lng)], {
      icon: window.L.divIcon({ className: 'origin-map-pin', html: '<span class="material-symbols-outlined">my_location</span>', iconSize: [30, 30], iconAnchor: [15, 15] })
    }).addTo(this.map).bindPopup(escapeHtml(this.origin.label || 'Tu ubicación'));
  }

  async calculateRoute() {
    if (!this.event || !this.origin || !this.hasCoordinates()) return;
    const origin = this.origin;
    this.setRouteStatus('Calculando ruta…', false);
    const result = await getRoute(origin.lng, origin.lat, this.event.lng, this.event.lat, 'driving');
    this.route = result.route;
    this.routeError = result.error;

    if (!this.route) {
      const title = this.container.querySelector('#routeSummaryTitle');
      if (title) title.textContent = 'Ruta no disponible';
      this.setRouteStatus(this.routeError?.message || 'No se pudo calcular la ruta.', true);
      return;
    }

    this.updateRouteUI();
    this.drawRoute();
  }

  updateRouteUI() {
    const title = this.container.querySelector('#routeSummaryTitle');
    const eta = this.container.querySelector('#routeEta');
    const distance = this.container.querySelector('#routeDistance');
    const steps = this.container.querySelector('#routeSteps');
    const telemetryDistance = this.container.querySelector('#telemetryDistance');
    const telemetryDuration = this.container.querySelector('#telemetryDuration');

    if (title) title.textContent = `${formatDistance(this.route.distance)} · ${formatMinutes(this.route.duration)}`;
    if (eta) eta.textContent = this.etaText();
    if (distance) distance.textContent = formatDistance(this.route.distance);
    if (steps) steps.innerHTML = this.renderSteps();
    if (telemetryDistance) telemetryDistance.textContent = formatDistance(this.route.distance);
    if (telemetryDuration) telemetryDuration.textContent = formatMinutes(this.route.duration);
  }

  drawRoute() {
    if (!this.map || !this.route?.geometry?.coordinates) return;
    if (this.routeLayer) this.routeLayer.remove();
    const latLngs = this.route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    this.routeLayer = window.L.polyline(latLngs, {
      color: '#0a84ff',
      weight: 5,
      opacity: 0.9
    }).addTo(this.map);
    this.map.fitBounds(this.routeLayer.getBounds(), { padding: [40, 40] });
    this.addOriginMarker();
  }

  setRouteStatus(message, isError) {
    const steps = this.container.querySelector('#routeSteps');
    if (!steps) return;
    steps.innerHTML = `<p class="route-empty-inline ${isError ? 'route-error-inline' : ''}">${escapeHtml(message)}</p>`;
  }

  async useCurrentLocation() {
    if (!navigator.geolocation) {
      this.setRouteStatus('Tu navegador no permite geolocalización.', true);
      return;
    }
    this.setRouteStatus('Obteniendo tu ubicación…', false);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const reverse = await reverseGeocode(latitude, longitude);
        this.saveOrigin({
          lat: latitude,
          lng: longitude,
          label: reverse.result?.address?.city || reverse.result?.address?.town || reverse.result?.displayName || 'Mi ubicación'
        });
        this.route = null;
        this.routeError = null;
        this.renderEvent();
        await this.initMap();
        await this.calculateRoute();
      },
      () => this.setRouteStatus('No se pudo obtener tu ubicación. Revisa los permisos del navegador.', true),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  async searchOrigin(address) {
    if (!address || !address.trim()) return;
    this.setRouteStatus('Buscando la dirección…', false);
    const result = await geocodeAddress(address);
    if (!result.result) {
      this.setRouteStatus(result.error?.message || 'No se encontró esa dirección.', true);
      return;
    }
    this.saveOrigin({
      lat: result.result.lat,
      lng: result.result.lng,
      label: result.result.displayName
    });
    this.route = null;
    this.routeError = null;
    this.renderEvent();
    await this.initMap();
    await this.calculateRoute();
  }

  handleClick(event) {
    if (event.target.closest('[data-action="locate"]')) {
      this.useCurrentLocation();
    }
  }

  handleSubmit(event) {
    if (event.target.id !== 'originForm') return;
    event.preventDefault();
    const input = event.target.querySelector('input[name="address"]');
    this.searchOrigin(input?.value || '');
  }

  destroyMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.routeLayer = null;
    this.originMarker = null;
    this.eventMarker = null;
  }

  destroy() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.removeEventListener('submit', this.handleSubmit);
    this.destroyMap();
  }
}
