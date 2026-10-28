import { getWeather } from '../api.js';

export class WeatherDetailView {
  constructor(container) {
    this.container = container;
    this.eventId = null;
    this.weatherData = null;
  }
  
  render() {
    const hash = window.location.hash;
    const match = hash.match(/#\/clima\/(.+)/);
    if (match) {
      this.eventId = match[1];
    }
    
    this.container.innerHTML = `
      <div class="weather-page" style="padding-top: 6rem;">
        <div class="weather-bg">
          <div class="weather-bg-glow1"></div>
          <div class="weather-bg-glow2"></div>
          <div class="weather-bg-glow3"></div>
        </div>
        
        <main class="weather-main">
          <section class="weather-hero">
            <div class="weather-hero-location">
              <span class="weather-hero-location-text">Parc del Fòrum • Barcelona</span>
              <span class="weather-hero-dot"></span>
            </div>
            <h1 class="weather-hero-event">Primavera Sound 2025</h1>
            <div class="weather-hero-temp">
              <span class="weather-hero-temp-value" id="heroTemp">24°</span>
            </div>
            <div class="weather-hero-desc">
              <span class="material-symbols-outlined">sunny</span>
              <span id="heroDesc">Despejado • Brisa costera</span>
            </div>
            <div class="weather-hero-meta">
              <span class="weather-hero-meta-text">Máx 25° • Mín 17°</span>
              <span class="weather-hero-badge" id="weatherAdviceBadge">
                <span class="material-symbols-outlined">celebration</span>
                <span id="weatherAdviceText">Ideal para festival</span>
              </span>
            </div>
          </section>
          
          <div class="weather-grid">
            <div class="weather-glass-card weather-hourly">
              <div class="weather-section-header">
                <div class="weather-section-header-left">
                  <span class="material-symbols-outlined">schedule</span>
                  <span>PRONÓSTICO POR HORAS • FRANJA FESTIVAL</span>
                </div>
                <span>Precipitación máx 10%</span>
              </div>
              <div class="weather-hourly-grid">
                <div class="weather-hourly-item">
                  <span class="weather-hourly-time">16:00</span>
                  <span class="material-symbols-outlined weather-hourly-icon" style="color: #ffd166;">sunny</span>
                  <span class="weather-hourly-temp">24°</span>
                  <span class="weather-hourly-precip">5%</span>
                </div>
                <div class="weather-hourly-item">
                  <span class="weather-hourly-time">19:00</span>
                  <span class="material-symbols-outlined weather-hourly-icon" style="color: #ff9f1c;">wb_twilight</span>
                  <span class="weather-hourly-temp">24°</span>
                  <span class="weather-hourly-precip">10%</span>
                </div>
                <div class="weather-hourly-item">
                  <span class="weather-hourly-time active">22:00</span>
                  <span class="material-symbols-outlined weather-hourly-icon" style="color: #989eb2;">bedtime</span>
                  <span class="weather-hourly-temp">20°</span>
                  <span class="weather-hourly-precip zero">0%</span>
                </div>
                <div class="weather-hourly-item">
                  <span class="weather-hourly-time">01:00</span>
                  <span class="material-symbols-outlined weather-hourly-icon" style="color: #989eb2;">nights_stay</span>
                  <span class="weather-hourly-temp">18°</span>
                  <span class="weather-hourly-precip zero">0%</span>
                </div>
                <div class="weather-hourly-item">
                  <span class="weather-hourly-time">04:00</span>
                  <span class="material-symbols-outlined weather-hourly-icon" style="color: #989eb2;">air</span>
                  <span class="weather-hourly-temp">17°</span>
                  <span class="weather-hourly-precip">5%</span>
                </div>
              </div>
            </div>
            
            <div class="weather-glass-card weather-forecast-3day">
              <div class="weather-section-header">
                <div class="weather-section-header-left">
                  <span class="material-symbols-outlined">calendar_month</span>
                  <span>PRONÓSTICO 3 DÍAS</span>
                </div>
              </div>
              <div class="weather-forecast-list">
                <div class="weather-forecast-item">
                  <span class="weather-forecast-day">Jueves 29</span>
                  <span class="material-symbols-outlined weather-forecast-icon" style="color: #ffd166;">sunny</span>
                  <div class="weather-forecast-range">
                    <span class="weather-forecast-temp">17°</span>
                    <div class="weather-forecast-bar">
                      <div class="weather-forecast-bar-fill" style="left: 30%; right: 10%;"></div>
                    </div>
                    <span class="weather-forecast-temp high">24°</span>
                  </div>
                </div>
                <div class="weather-forecast-item">
                  <span class="weather-forecast-day other">Viernes 30</span>
                  <span class="material-symbols-outlined weather-forecast-icon" style="color: #989eb2;">partly_cloudy_day</span>
                  <div class="weather-forecast-range">
                    <span class="weather-forecast-temp">16°</span>
                    <div class="weather-forecast-bar">
                      <div class="weather-forecast-bar-fill" style="left: 20%; right: 20%;"></div>
                    </div>
                    <span class="weather-forecast-temp high">23°</span>
                  </div>
                </div>
                <div class="weather-forecast-item">
                  <span class="weather-forecast-day other">Sábado 31</span>
                  <span class="material-symbols-outlined weather-forecast-icon" style="color: #ffd166;">wb_sunny</span>
                  <div class="weather-forecast-range">
                    <span class="weather-forecast-temp">18°</span>
                    <div class="weather-forecast-bar">
                      <div class="weather-forecast-bar-fill" style="left: 40%; right: 5%;"></div>
                    </div>
                    <span class="weather-forecast-temp high">25°</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="weather-metrics-grid">
              <div class="weather-glass-card weather-metric-card">
                <div class="weather-metric-header">
                  <span class="material-symbols-outlined">wb_sunny</span>
                  <span>ÍNDICE UV</span>
                </div>
                <div>
                  <div class="weather-metric-value">6.4</div>
                  <div class="weather-metric-label highlight">Alto</div>
                </div>
                <div style="font-size: 0.6875rem; color: #989eb2;">Protección hasta 19:30</div>
              </div>
              <div class="weather-glass-card weather-metric-card">
                <div class="weather-metric-header">
                  <span class="material-symbols-outlined">air</span>
                  <span>VIENTO</span>
                </div>
                <div>
                  <div class="weather-metric-value">14 <span style="font-size: 1rem;">km/h</span></div>
                  <div class="weather-metric-label">Brisa Sur</div>
                </div>
                <div style="font-size: 0.6875rem; color: #989eb2;">Rachas hasta 20 km/h</div>
              </div>
              <div class="weather-glass-card weather-metric-card">
                <div class="weather-metric-header">
                  <span class="material-symbols-outlined">water_drop</span>
                  <span>HUMEDAD</span>
                </div>
                <div>
                  <div class="weather-metric-value" id="humidity">62%</div>
                  <div class="weather-metric-label">Punto rocío: 14°</div>
                </div>
                <div style="font-size: 0.6875rem; color: #989eb2;">Incrementa de madrugada</div>
              </div>
              <div class="weather-glass-card weather-metric-card">
                <div class="weather-metric-header">
                  <span class="material-symbols-outlined">nest_eco_leaf</span>
                  <span>CALIDAD DEL AIRE</span>
                </div>
                <div>
                  <div class="weather-metric-value">22 <span style="font-size: 0.75rem; color: #47e266; font-weight: 600;">AQI</span></div>
                  <div class="weather-metric-label green">Excelente</div>
                </div>
                <div style="font-size: 0.6875rem; color: #989eb2;">Condición óptima</div>
              </div>
            </div>
          </div>
          
          <div class="weather-bottom">
            <div class="weather-glass-card weather-checklist">
              <div class="weather-checklist-header">
                <div class="weather-checklist-title-group">
                  <div class="weather-checklist-icon">
                    <span class="material-symbols-outlined">checklist</span>
                  </div>
                  <div class="weather-checklist-titles">
                    <span class="weather-checklist-main-title">Checklist de Equipaje</span>
                    <span class="weather-checklist-subtitle">Ajustado al clima</span>
                  </div>
                </div>
                <span class="weather-checklist-count" id="checklistCount">6 de 7 listos</span>
              </div>
              <div class="weather-checklist-grid">
                <div class="weather-checklist-group">
                  <div class="weather-checklist-group-title">
                    <span class="material-symbols-outlined">key</span>
                    Esenciales
                  </div>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">DNI / Pasaporte Original</span>
                  </label>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Entrada QR Offline</span>
                  </label>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Pulsera Cashless</span>
                  </label>
                </div>
                <div class="weather-checklist-group">
                  <div class="weather-checklist-group-title">
                    <span class="material-symbols-outlined">spa</span>
                    Confort & Protección
                  </div>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Cortavientos Ligero</span>
                  </label>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Tapones Hi-Fi</span>
                  </label>
                  <label class="weather-checklist-item">
                    <input type="checkbox" checked class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Power Bank</span>
                  </label>
                  <label class="weather-checklist-item">
                    <input type="checkbox" class="weather-checklist-checkbox" onchange="updateChecklist()">
                    <span class="weather-checklist-text">Botella Vacía Reutilizable</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <script>
        function updateChecklist() {
          const checks = document.querySelectorAll('.weather-checklist-checkbox');
          let checked = 0;
          checks.forEach(c => { if (c.checked) checked++; });
          const count = document.getElementById('checklistCount');
          count.textContent = checked + ' de ' + checks.length + ' listos';
          if (checked === checks.length) {
            count.style.background = '#47e266';
            count.style.color = 'black';
            count.style.borderColor = '#47e266';
            count.textContent = '100% Equipado';
          }
        }
      </script>
    `;
    
    this.loadWeather();
    this.buildChecklist();
  }
  
  buildChecklist() {
    const hash = window.location.hash;
    const match = hash.match(/#\/clima\/(.+)/);
    const eventId = match ? match[1] : 'demo';
    const key = `checklist:${eventId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    
    const items = [
      { id: 'id', label: 'DNI / Pasaporte Original', cat: 'essentials' },
      { id: 'ticket', label: 'Entrada QR Offline', cat: 'essentials' },
      { id: 'card', label: 'Pulsera Cashless / Tarjeta', cat: 'essentials' },
      { id: 'phone', label: 'Celular + Power Bank', cat: 'essentials' },
      { id: 'bottle', label: 'Botella Vacía Reutilizable', cat: 'essentials' },
      { id: 'rain', label: 'Impermeable / Paraguas compacto', cat: 'protection', condition: 'rain' },
      { id: 'shoes', label: 'Calzado que se pueda mojar', cat: 'protection', condition: 'rain' },
      { id: 'sun', label: 'Protector solar', cat: 'protection', condition: 'sun' },
      { id: 'hat', label: 'Gorra / Lentes de sol', cat: 'protection', condition: 'sun' },
      { id: 'cold', label: 'Abrigo / Cortavientos', cat: 'protection', condition: 'cold' },
      { id: 'ear', label: 'Tapones para oídos', cat: 'protection', condition: 'festival' }
    ];
    
    const essentials = items.filter(i => i.cat === 'essentials');
    const protection = items.filter(i => i.cat === 'protection' && (!i.condition || i.condition === 'festival' || i.condition === this.weatherCond));
    
    const allItems = [...essentials, ...protection];
    const total = allItems.length;
    const checked = saved.filter(id => allItems.find(i => i.id === id)).length;
    
    const essDiv = document.querySelectorAll('.weather-checklist-group')[0];
    const protDiv = document.querySelectorAll('.weather-checklist-group')[1];
    
    if (essDiv) {
      essDiv.querySelector('.weather-checklist-group-title').innerHTML = `<span class="material-symbols-outlined">key</span> Esenciales`;
      const itemsHtml = essentials.map(item => `
        <label class="weather-checklist-item">
          <input type="checkbox" class="weather-checklist-checkbox" data-id="${item.id}" ${saved.includes(item.id) ? 'checked' : ''}>
          <span class="weather-checklist-text">${item.label}</span>
        </label>
      `).join('');
      essDiv.querySelectorAll('.weather-checklist-item').forEach(el => el.remove());
      essDiv.insertAdjacentHTML('beforeend', itemsHtml);
    }
    
    if (protDiv) {
      protDiv.querySelector('.weather-checklist-group-title').innerHTML = `<span class="material-symbols-outlined">spa</span> Confort y protección`;
      const itemsHtml = protection.map(item => `
        <label class="weather-checklist-item">
          <input type="checkbox" class="weather-checklist-checkbox" data-id="${item.id}" ${saved.includes(item.id) ? 'checked' : ''}>
          <span class="weather-checklist-text">${item.label}</span>
        </label>
      `).join('');
      protDiv.querySelectorAll('.weather-checklist-item').forEach(el => el.remove());
      protDiv.insertAdjacentHTML('beforeend', itemsHtml);
    }
    
    document.querySelectorAll('.weather-checklist-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        const current = JSON.parse(localStorage.getItem(key) || '[]');
        if (cb.checked && !current.includes(id)) current.push(id);
        else if (!cb.checked) {
          const idx = current.indexOf(id);
          if (idx > -1) current.splice(idx, 1);
        }
        localStorage.setItem(key, JSON.stringify(current));
        this.updateChecklistCount();
        cb.parentElement.style.transition = 'all 0.2s';
        if (cb.checked) {
          cb.nextElementSibling.style.textDecoration = 'line-through';
          cb.nextElementSibling.style.opacity = '0.5';
        } else {
          cb.nextElementSibling.style.textDecoration = 'none';
          cb.nextElementSibling.style.opacity = '1';
        }
      });
    });
    
    document.querySelectorAll('.weather-checklist-checkbox').forEach(cb => {
      if (cb.checked) {
        cb.nextElementSibling.style.textDecoration = 'line-through';
        cb.nextElementSibling.style.opacity = '0.5';
      }
    });
    
    this.updateChecklistCount();
    
    const subtitle = document.querySelector('.weather-checklist-subtitle');
    if (subtitle) {
      if (this.weatherCond === 'rain') subtitle.textContent = 'Lluvia prevista';
      else if (this.weatherCond === 'cold') subtitle.textContent = 'Frío previsto';
      else if (this.weatherCond === 'sun') subtitle.textContent = 'Sol intenso previsto';
      else subtitle.textContent = 'Ajustado al clima';
    }
    
    let resetBtn = document.getElementById('resetChecklist');
    if (!resetBtn) {
      resetBtn = document.createElement('button');
      resetBtn.id = 'resetChecklist';
      resetBtn.textContent = 'Reiniciar lista';
      resetBtn.style.cssText = 'margin-top:0.75rem;padding:0.375rem 0.75rem;background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);border-radius:0.5rem;cursor:pointer;font-size:0.75rem;';
      document.querySelector('.weather-checklist-header').appendChild(resetBtn);
    }
    resetBtn.onclick = () => {
      localStorage.removeItem(key);
      this.buildChecklist();
    };
  }
  
  updateChecklistCount() {
    const hash = window.location.hash;
    const match = hash.match(/#\/clima\/(.+)/);
    const eventId = match ? match[1] : 'demo';
    const key = `checklist:${eventId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    const checks = document.querySelectorAll('.weather-checklist-checkbox');
    let checked = 0;
    checks.forEach(c => { if (c.checked) checked++; });
    const count = document.getElementById('checklistCount');
    if (count) {
      count.textContent = checked + ' de ' + checks.length + ' listos';
      if (checked === checks.length && checks.length > 0) {
        count.style.background = '#47e266';
        count.style.color = 'black';
        count.style.borderColor = '#47e266';
        count.textContent = '100% Equipado';
      }
    }
  }
  
  async loadWeather() {
    try {
      const weather = await getWeather(41.4128, 2.2208);
      this.weatherCond = 'mild';
      if (weather && weather.list && weather.list[0]) {
        const current = weather.list[0];
        document.getElementById('heroTemp').textContent = Math.round(current.main.temp) + '°';
        document.getElementById('heroDesc').textContent = current.weather[0].description.charAt(0).toUpperCase() + current.weather[0].description.slice(1) + ' • Brisa costera';
        document.getElementById('humidity').textContent = current.main.humidity + '%';
        if (current.weather[0].main === 'Rain' || current.weather[0].main === 'Drizzle' || current.weather[0].main === 'Thunderstorm') {
          this.weatherCond = 'rain';
        } else if (current.main.temp < 12) {
          this.weatherCond = 'cold';
        } else if (current.main.temp > 26) {
          this.weatherCond = 'sun';
        }
        if (weather.advice) {
          document.getElementById('weatherAdviceText').textContent = weather.advice.message;
        }
      }
      this.buildChecklist();
    } catch (e) {
      console.log('Using demo weather');
      this.weatherCond = 'mild';
      this.buildChecklist();
    }
  }
}
