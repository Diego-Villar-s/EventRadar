import { getRoute, geocodeAddress } from '../api.js';

export class RouteDetailView {
  constructor(container) {
    this.container = container;
    this.map = null;
    this.eventId = null;
    this.currentMode = 'foot';
    this.userLocation = null;
    this.eventLocation = { lat: 41.4128, lng: 2.2208, name: 'Parc del Fòrum' };
  }
  
  render() {
    // Get eventId from hash
    const hash = window.location.hash;
    const match = hash.match(/#\/ruta\/(.+)/);
    if (match) {
      this.eventId = match[1];
    }
    
    this.container.innerHTML = `
      <div class="route-page" style="padding-top: 5rem;">
        
        <main class="route-main">
          <!-- Title Section -->
          <div class="route-title-section">
            <div>
              <div class="route-breadcrumb">
                <span>Primavera Sound 2025</span>
                <span class="route-breadcrumb-dot">•</span>
                <span class="route-breadcrumb-highlight">Apple Maps Engine</span>
              </div>
              <h1 class="route-title">Rutas y Acceso al Fòrum</h1>
            </div>
            <div class="route-status-pill">
              <div class="route-status-dot-wrapper">
                <span class="route-status-dot"></span>
                <span class="route-status-dot-ping"></span>
              </div>
              <div class="route-status-text">
                <span class="route-status-label">Tránsito fluido</span>
                <div class="route-status-divider"></div>
                <span class="route-status-time" id="statusTime">24 min</span>
              </div>
              <div class="route-status-divider"></div>
              <span class="route-status-path">Plaça Catalunya → Parc del Fòrum</span>
            </div>
          </div>
          
          <!-- Segmented Control -->
          <div class="route-segmented" style="margin-top: 1.5rem;">
            <button class="route-segment yellow active" data-mode="foot" id="segFoot">
              <span class="material-symbols-outlined">directions_walk</span>
              <div class="route-segment-info">
                <span class="route-segment-label">A pie</span>
                <span class="route-segment-time">45 min</span>
                <span class="route-segment-detail">• 4.9 km</span>
              </div>
            </button>
            <button class="route-segment blue" data-mode="driving" id="segDriving">
              <span class="material-symbols-outlined">directions_car</span>
              <div class="route-segment-info">
                <span class="route-segment-label">Auto</span>
                <span class="route-segment-time">18 min</span>
                <span class="route-segment-detail">• ~14 €</span>
              </div>
            </button>
            <button class="route-segment green" data-mode="cycling" id="segCycling">
              <span class="material-symbols-outlined">pedal_bike</span>
              <div class="route-segment-info">
                <span class="route-segment-label">Bici</span>
                <span class="route-segment-time">32 min</span>
                <span class="route-segment-detail">• 0 €</span>
              </div>
            </button>
            <button class="route-segment purple" data-mode="transit" id="segTransit">
              <span class="material-symbols-outlined">directions_transit</span>
              <div class="route-segment-info">
                <span class="route-segment-label">Transporte</span>
                <span class="route-segment-time">24 min</span>
                <span class="route-segment-detail">• ~2.40 €</span>
              </div>
            </button>
          </div>
          
          <!-- Main Grid -->
          <div class="route-grid" style="margin-top: 1.5rem;">
            <!-- Sidebar -->
            <div class="route-sidebar">
              <div class="route-card">
                <div class="route-card-header">
                  <div>
                    <span class="route-card-badge">RUTA RECOMENDADA</span>
                    <h2 class="route-card-title" id="routeCardTitle">Rambla Poblenou</h2>
                  </div>
                  <div class="route-card-time-box">
                    <div class="route-card-time" id="routeCardTime">45 min</div>
                    <div class="route-card-dist" id="routeCardDist">4.9 km</div>
                  </div>
                </div>
                <div class="route-steps">
                  <div class="route-step">
                    <div class="route-step-number blue">1</div>
                    <div class="route-step-content">
                      <div class="route-step-header">
                        <span class="route-step-title">Salida Centro</span>
                        <span class="route-step-tag gray">10 min</span>
                      </div>
                      <span class="route-step-desc">Carrer de Casp dirección Glòries</span>
                    </div>
                  </div>
                  <div class="route-step">
                    <div class="route-step-number purple">2</div>
                    <div class="route-step-content">
                      <div class="route-step-header">
                        <span class="route-step-title">Rambla del Poblenou</span>
                        <span class="route-step-tag gray">2.4 km • 25 min</span>
                      </div>
                      <span class="route-step-desc">Eje peatonal iluminado</span>
                    </div>
                  </div>
                  <div class="route-step">
                    <div class="route-step-number green">3</div>
                    <div class="route-step-content">
                      <div class="route-step-header">
                        <span class="route-step-title">Acceso Puerta Marina</span>
                        <span class="route-step-tag">Llegada</span>
                      </div>
                      <span class="route-step-desc">Ingreso directo a taquillas</span>
                    </div>
                  </div>
                </div>
                <button class="route-action-btn" id="openGoogleMapsBtn">
                  <span class="material-symbols-outlined">near_me</span>
                  <span>Abrir ruta en Google Maps</span>
                </button>
              </div>
              
              <div class="route-card">
                <div class="route-card-header" style="padding-bottom: 0.75rem;">
                  <span class="route-card-badge" style="color: #8E8E93;">PUNTOS CLAVE FÒRUM</span>
                  <span style="font-size: 0.6875rem; font-weight: 600; color: #30D158;">Abierto</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                  <div style="padding: 0.625rem; border-radius: 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.6875rem; font-weight: 600; color: #BF5AF2;">Acceso VIP</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: white; margin-top: 0.125rem;">Puerta 3</div>
                    <div style="font-size: 0.625rem; color: rgba(255,255,255,0.4);">Sin espera</div>
                  </div>
                  <div style="padding: 0.625rem; border-radius: 0.75rem; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.05);">
                    <div style="font-size: 0.6875rem; font-weight: 600; color: #0A84FF;">Taquillas</div>
                    <div style="font-size: 0.75rem; font-weight: 700; color: white; margin-top: 0.125rem;">Módulos A-D</div>
                    <div style="font-size: 0.625rem; color: rgba(255,255,255,0.4);">Canje NFC</div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Map Section -->
            <div class="route-map-section">
              <div class="route-map-container">
                <div id="routeMap" class="route-map"></div>
                <div class="route-map-controls">
                  <div class="route-map-pill">
                    <span class="material-symbols-outlined">explore</span>
                    <span>Vista Satélite Oscuro</span>
                  </div>
                  <button class="route-map-btn" id="locateBtn">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">my_location</span>
                  </button>
                </div>
                <div class="route-map-zoom">
                  <button class="route-map-zoom-btn" id="zoomInBtn">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">add</span>
                  </button>
                  <div class="route-map-zoom-divider"></div>
                  <button class="route-map-zoom-btn" id="zoomOutBtn">
                    <span class="material-symbols-outlined" style="font-size: 1rem;">remove</span>
                  </button>
                </div>
                <div class="route-map-telemetry">
                  <div class="route-map-telemetry-item">
                    <span class="route-map-telemetry-label">Distancia</span>
                    <span class="route-map-telemetry-value" id="telemetryDist">4.9 km</span>
                  </div>
                  <div class="route-map-telemetry-divider"></div>
                  <div class="route-map-telemetry-item">
                    <span class="route-map-telemetry-label">Llegada</span>
                    <span class="route-map-telemetry-value green" id="telemetryEta">19:03</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;
    
    this.initMap();
    this.initSegments();
    this.initControls();
  }
  
  initMap() {
    this.map = L.map('routeMap', {
      center: [41.4128, 2.2208],
      zoom: 13,
      zoomControl: false
    });
    
    import('../config.js').then(cfg => {
      L.tileLayer(cfg.MAP_TILE_URL, {
        attribution: cfg.MAP_ATTRIBUTION,
        subdomains: cfg.MAP_TILE_SUBDOMAINS || ['a', 'b', 'c'],
        maxZoom: 19
      }).addTo(this.map);
      if (cfg.DARK_MAP_FILTER) {
        setTimeout(() => {
          const pane = document.querySelector('.leaflet-tile-pane');
          if (pane) pane.style.filter = 'invert(1) hue-rotate(180deg) brightness(.95) contrast(.9) saturate(.6)';
        }, 100);
      }
    });
    
    const venueIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 36px; height: 36px; border-radius: 16px; background: linear-gradient(135deg, #30D158 0%, #10b981 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(48, 209, 88, 0.7);">
        <span class="material-symbols-outlined" style="color: black; font-size: 20px; font-weight: 700;">stadium</span>
      </div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
    
    L.marker([41.4128, 2.2208], { icon: venueIcon })
      .addTo(this.map)
      .bindPopup('<b>Parc del Fòrum</b><br>Primavera Sound 2025');
  }
  
  initSegments() {
    document.querySelectorAll('.route-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.route-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMode = btn.dataset.mode;
        
        const modeData = {
          foot: { time: '45 min', dist: '4.9 km', title: 'Rambla Poblenou' },
          driving: { time: '18 min', dist: '14.5 km', title: 'Ronda Litoral' },
          cycling: { time: '32 min', dist: '6.8 km', title: 'Passeig Marítim' },
          transit: { time: '24 min', dist: '6.2 km', title: 'Metro L4' }
        };
        
        const data = modeData[this.currentMode] || modeData.foot;
        document.getElementById('routeCardTime').textContent = data.time;
        document.getElementById('routeCardDist').textContent = data.dist;
        document.getElementById('routeCardTitle').textContent = data.title;
        document.getElementById('statusTime').textContent = data.time;
        document.getElementById('telemetryDist').textContent = data.dist;
      });
    });
  }
  
  initControls() {
    document.getElementById('locateBtn').addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const userIcon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="width: 28px; height: 28px; border-radius: 50%; background: #0A84FF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(10, 132, 255, 0.8);">
              <span class="material-symbols-outlined" style="color: white; font-size: 16px;">navigation</span>
            </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          L.marker([pos.coords.latitude, pos.coords.longitude], { icon: userIcon })
            .addTo(this.map)
            .bindPopup('<b>Tu ubicación</b>');
          this.map.setView([pos.coords.latitude, pos.coords.longitude], 14);
          this.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        });
      }
    });
    
    document.getElementById('zoomInBtn').addEventListener('click', () => this.map.zoomIn());
    document.getElementById('zoomOutBtn').addEventListener('click', () => this.map.zoomOut());
    
    document.getElementById('openGoogleMapsBtn').addEventListener('click', () => {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${this.eventLocation.lat},${this.eventLocation.lng}&travelmode=${this.currentMode === 'driving' ? 'driving' : this.currentMode === 'cycling' ? 'bicycling' : this.currentMode === 'transit' ? 'transit' : 'walking'}`;
      window.open(url, '_blank');
    });
  }
}
