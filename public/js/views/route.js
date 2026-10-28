import { getRoute } from '../api.js';

export class RouteView {
  constructor(container) {
    this.container = container;
    this.map = null;
  }
  
  render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-breadcrumb">
            <span>Eventos</span>
            <span>•</span>
            <span style="color: var(--accent-blue);">Rutas & Acceso</span>
          </div>
          <h1 class="view-title">Rutas y Acceso al Recinto</h1>
        </div>
      </div>
      
      <div class="route-segmented">
        <button class="route-segment active" data-mode="foot">
          <span class="material-symbols-outlined">directions_walk</span>
          <div>
            <div class="route-segment-label">A pie</div>
            <div class="route-segment-time">45 min</div>
          </div>
        </button>
        <button class="route-segment" data-mode="driving">
          <span class="material-symbols-outlined">directions_car</span>
          <div>
            <div class="route-segment-label">Auto</div>
            <div class="route-segment-time">18 min</div>
          </div>
        </button>
        <button class="route-segment" data-mode="cycling">
          <span class="material-symbols-outlined">pedal_bike</span>
          <div>
            <div class="route-segment-label">Bici</div>
            <div class="route-segment-time">32 min</div>
          </div>
        </button>
      </div>
      
      <div class="route-grid">
        <div class="route-info glass-card">
          <div class="route-info-header">
            <div>
              <span class="text-label-sm" style="color: var(--accent-blue);">RUTA RECOMENDADA</span>
              <h2 class="text-headline-sm" style="margin-top: 0.25rem;">Dirección al Parc del Fòrum</h2>
            </div>
            <div style="text-align: right;">
              <div class="text-headline-sm" id="routeTime">45 min</div>
              <div class="text-body-sm" style="color: var(--text-tertiary);" id="routeDist">4.9 km</div>
            </div>
          </div>
          <div class="route-steps">
            <div class="route-step">
              <div class="route-step-number" style="background: rgba(10, 132, 255, 0.15); color: var(--accent-blue);">1</div>
              <div class="route-step-content">
                <div class="route-step-title">Origen</div>
                <div class="route-step-desc">Tu ubicación actual</div>
              </div>
            </div>
            <div class="route-step">
              <div class="route-step-number" style="background: rgba(191, 90, 242, 0.15); color: var(--accent-purple);">2</div>
              <div class="route-step-content">
                <div class="route-step-title">Ruta peatonal</div>
                <div class="route-step-desc">Por Rambla del Poblenou</div>
              </div>
            </div>
            <div class="route-step">
              <div class="route-step-number" style="background: rgba(48, 209, 88, 0.15); color: var(--accent-green);">3</div>
              <div class="route-step-content">
                <div class="route-step-title">Destino</div>
                <div class="route-step-desc">Parc del Fòrum, Barcelona</div>
              </div>
            </div>
          </div>
          <button class="btn-primary" style="width: 100%; margin-top: 1rem;" onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=41.4128,2.2208&travelmode=transit', '_blank')">
            <span class="material-symbols-outlined">directions</span>
            <span>Abrir en Google Maps</span>
          </button>
        </div>
        
        <div class="route-map-container glass-card">
          <div id="routeMap" style="width: 100%; height: 500px; border-radius: var(--radius-xl);"></div>
        </div>
      </div>
    `;
    
    this.initMap();
    this.initSegments();
  }
  
  initMap() {
    // Initialize Leaflet map
    this.map = L.map('routeMap', {
      center: [41.3851, 2.1734],
      zoom: 12,
      zoomControl: true
    });
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);
    
    // Add markers
    const venueIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="width: 32px; height: 32px; background: var(--accent-green); border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(48, 209, 88, 0.7); border: 3px solid black;">
        <span class="material-symbols-outlined" style="color: black; font-size: 18px; font-weight: 700;">stadium</span>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
    
    L.marker([41.4128, 2.2208], { icon: venueIcon })
      .addTo(this.map)
      .bindPopup('<b>Parc del Fòrum</b><br>Primavera Sound 2025');
    
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        const userIcon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="width: 28px; height: 28px; background: var(--accent-blue); border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(10, 132, 255, 0.8); border: 3px solid black;">
            <span class="material-symbols-outlined" style="color: white; font-size: 16px;">navigation</span>
          </div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });
        
        L.marker([userLat, userLng], { icon: userIcon })
          .addTo(this.map)
          .bindPopup('<b>Tu ubicación</b>');
        
        // Fit bounds
        const group = L.featureGroup([
          L.marker([userLat, userLng]),
          L.marker([41.4128, 2.2208])
        ]);
        this.map.fitBounds(group.getBounds().pad(0.1));
      });
    }
  }
  
  initSegments() {
    document.querySelectorAll('.route-segment').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.route-segment').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const mode = btn.dataset.mode;
        if (mode === 'foot') {
          document.getElementById('routeTime').textContent = '45 min';
          document.getElementById('routeDist').textContent = '4.9 km';
        } else if (mode === 'driving') {
          document.getElementById('routeTime').textContent = '18 min';
          document.getElementById('routeDist').textContent = '14.5 km';
        } else if (mode === 'cycling') {
          document.getElementById('routeTime').textContent = '32 min';
          document.getElementById('routeDist').textContent = '6.8 km';
        }
      });
    });
  }
}
