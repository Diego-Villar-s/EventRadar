import { getWeather } from '../api.js';

export class WeatherView {
  constructor(container) {
    this.container = container;
  }
  
  async render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div>
          <div class="view-breadcrumb">
            <span>Eventos</span>
            <span>•</span>
            <span style="color: var(--accent-blue);">Clima & Checklist</span>
          </div>
          <h1 class="view-title">Clima y Equipaje</h1>
        </div>
      </div>
      
      <section class="weather-hero">
        <div class="weather-hero-location">
          <span class="material-symbols-outlined" style="color: var(--accent-blue);">location_on</span>
          <span>Parc del Fòrum • Barcelona</span>
          <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green);"></span>
        </div>
        <h2 class="weather-hero-event">Primavera Sound 2025</h2>
        <div class="weather-hero-temp">
          <span id="weatherTemp">24°</span>
        </div>
        <div class="weather-hero-desc">
          <span class="material-symbols-outlined" style="color: #FFD60A;">sunny</span>
          <span id="weatherDesc">Despejado • Brisa costera</span>
        </div>
        <div class="weather-hero-range">
          <span>Máx 25° • Mín 17°</span>
          <span class="badge badge-green">Ideal para festival</span>
        </div>
      </section>
      
      <div class="weather-grid">
        <div class="weather-hourly glass-card">
          <div class="weather-section-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="color: var(--accent-blue);">schedule</span>
              <span class="text-label-sm">PRONÓSTICO POR HORAS</span>
            </div>
          </div>
          <div class="weather-hourly-list">
            <div class="weather-hourly-item">
              <span class="weather-hourly-time">16:00</span>
              <span class="material-symbols-outlined" style="color: #FFD60A;">sunny</span>
              <span class="weather-hourly-temp">24°</span>
            </div>
            <div class="weather-hourly-item">
              <span class="weather-hourly-time">19:00</span>
              <span class="material-symbols-outlined" style="color: #FF9F0A;">wb_twilight</span>
              <span class="weather-hourly-temp">24°</span>
            </div>
            <div class="weather-hourly-item">
              <span class="weather-hourly-time">22:00</span>
              <span class="material-symbols-outlined" style="color: rgba(255,255,255,0.6);">bedtime</span>
              <span class="weather-hourly-temp">20°</span>
            </div>
            <div class="weather-hourly-item">
              <span class="weather-hourly-time">01:00</span>
              <span class="material-symbols-outlined" style="color: rgba(255,255,255,0.5);">nights_stay</span>
              <span class="weather-hourly-temp">18°</span>
            </div>
            <div class="weather-hourly-item">
              <span class="weather-hourly-time">04:00</span>
              <span class="material-symbols-outlined" style="color: rgba(255,255,255,0.4);">air</span>
              <span class="weather-hourly-temp">17°</span>
            </div>
          </div>
        </div>
        
        <div class="weather-metrics">
          <div class="weather-metric-card glass-card">
            <div class="weather-metric-header">
              <span class="material-symbols-outlined" style="color: #FFD60A;">wb_sunny</span>
              <span class="text-label-sm">ÍNDICE UV</span>
            </div>
            <div class="weather-metric-value">6.4</div>
            <div class="weather-metric-label">Alto</div>
          </div>
          <div class="weather-metric-card glass-card">
            <div class="weather-metric-header">
              <span class="material-symbols-outlined" style="color: var(--accent-blue);">air</span>
              <span class="text-label-sm">VIENTO</span>
            </div>
            <div class="weather-metric-value">14 <span style="font-size: 1rem;">km/h</span></div>
            <div class="weather-metric-label">Brisa marítima</div>
          </div>
          <div class="weather-metric-card glass-card">
            <div class="weather-metric-header">
              <span class="material-symbols-outlined" style="color: var(--accent-blue);">water_drop</span>
              <span class="text-label-sm">HUMEDAD</span>
            </div>
            <div class="weather-metric-value">62%</div>
            <div class="weather-metric-label">Cómodo</div>
          </div>
          <div class="weather-metric-card glass-card">
            <div class="weather-metric-header">
              <span class="material-symbols-outlined" style="color: var(--accent-green);">nest_eco_leaf</span>
              <span class="text-label-sm">CALIDAD AIRE</span>
            </div>
            <div class="weather-metric-value">22</div>
            <div class="weather-metric-label">Excelente</div>
          </div>
        </div>
      </div>
      
      <div class="weather-bottom">
        <div class="weather-checklist glass-card">
          <div class="weather-section-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <div style="width: 1.5rem; height: 1.5rem; border-radius: 0.375rem; background: rgba(48, 209, 88, 0.2); display: flex; align-items: center; justify-content: center;">
                <span class="material-symbols-outlined" style="color: var(--accent-green); font-size: 0.875rem;">checklist</span>
              </div>
              <div>
                <div class="text-body-md" style="font-weight: 600;">Checklist de Equipaje</div>
                <div class="text-body-sm" style="color: var(--text-tertiary);">Ajustado al clima</div>
              </div>
            </div>
            <span class="badge badge-green" id="checklistCount">6 de 7 listos</span>
          </div>
          <div class="checklist-grid">
            <div class="checklist-group">
              <div class="text-label-sm" style="color: var(--text-tertiary); margin-bottom: 0.75rem;">ESENCIALES</div>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>DNI / Pasaporte</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>Entrada QR</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>Pulsera Cashless</span>
              </label>
            </div>
            <div class="checklist-group">
              <div class="text-label-sm" style="color: var(--text-tertiary); margin-bottom: 0.75rem;">CONFORT</div>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>Cortavientos ligero</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>Tapones para oídos</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" checked>
                <span>Power Bank</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox">
                <span>Botella reutilizable</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.loadWeather();
  }
  
  async loadWeather() {
    try {
      // Use demo coordinates for Barcelona
      const weather = await getWeather(41.3851, 2.1734);
      if (weather && weather.list && weather.list[0]) {
        const current = weather.list[0];
        document.getElementById('weatherTemp').textContent = Math.round(current.main.temp) + '°';
        document.getElementById('weatherDesc').textContent = current.weather[0].description.charAt(0).toUpperCase() + current.weather[0].description.slice(1);
      }
    } catch (e) {
      console.log('Using demo weather data');
    }
  }
}
