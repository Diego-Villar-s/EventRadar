import { getEvent, getEvents, getWeather } from '../api.js';
import { emptyState, escapeHtml, formatEventDate, formatEventTime, hasValidCoordinates, safeHttpUrl } from '../utils.js';

function weatherIcon(item) {
  const code = item?.weather?.[0]?.icon || '';
  const main = (item?.weather?.[0]?.main || '').toLowerCase();
  if (code.startsWith('01')) return 'wb_sunny';
  if (code.startsWith('02')) return 'partly_cloudy_day';
  if (code.startsWith('03') || code.startsWith('04')) return 'cloud';
  if (code.startsWith('09') || code.startsWith('10')) return 'rainy';
  if (code.startsWith('11')) return 'thunderstorm';
  if (code.startsWith('13')) return 'ac_unit';
  if (code.startsWith('50')) return 'foggy';
  if (main.includes('clear')) return 'wb_sunny';
  return 'cloud';
}

function temp(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}°` : '—';
}

function pop(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '—';
}

function isNumericTimezone(timezone) {
  return typeof timezone === 'number' || (typeof timezone === 'string' && /^-?\d+$/.test(timezone));
}

function zonedDate(dt, timezone) {
  const seconds = Number(dt);
  if (isNumericTimezone(timezone)) {
    return new Date((seconds + Number(timezone)) * 1000);
  }
  return new Date(seconds * 1000);
}

function intlZoneOptions(timezone) {
  if (isNumericTimezone(timezone)) return { timeZone: 'UTC' };
  if (typeof timezone === 'string' && timezone.trim()) return { timeZone: timezone };
  return {};
}

function formatHour(dt, timezone) {
  const date = zonedDate(dt, timezone);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      ...intlZoneOptions(timezone)
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
  }
}

function dateKey(dt, timezone) {
  const date = zonedDate(dt, timezone);
  if (isNumericTimezone(timezone)) return date.toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...intlZoneOptions(timezone)
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function formatDay(dt, timezone) {
  const date = zonedDate(dt, timezone);
  try {
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...intlZoneOptions(timezone)
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
  }
}

function groupDays(list, timezone) {
  const groups = new Map();
  list.forEach((item) => {
    const key = dateKey(item.dt, timezone);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.values()].map((items) => {
    const temps = items.flatMap((item) => [item.main?.temp_min, item.main?.temp_max]).filter((value) => Number.isFinite(Number(value)));
    return {
      dt: items[0].dt,
      items,
      min: temps.length ? Math.min(...temps) : null,
      max: temps.length ? Math.max(...temps) : null,
      icon: weatherIcon(items[Math.floor(items.length / 2)] || items[0]),
      description: items[Math.floor(items.length / 2)]?.weather?.[0]?.description || items[0].weather?.[0]?.description || '',
      pop: Math.max(...items.map((item) => Number(item.pop) || 0))
    };
  });
}

export class WeatherDetailView {
  constructor(container, props = {}) {
    this.container = container;
    this.eventId = props.eventId || null;
    this.event = null;
    this.weather = null;
    this.error = null;
    this.checked = new Set();
    this.handleChange = this.handleChange.bind(this);
  }

  async render() {
    this.container.innerHTML = `
      <div class="weather-page">
        <main class="weather-main">
          <div id="weatherContent">
            <div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando pronóstico…</span></div>
          </div>
        </main>
      </div>
    `;
    this.container.addEventListener('change', this.handleChange);

    if (!this.eventId) {
      await this.renderPicker();
      return;
    }
    await this.loadEvent();
  }

  async renderPicker() {
    const content = this.container.querySelector('#weatherContent');
    if (!content) return;
    content.innerHTML = `
      <section class="weather-hero">
        <div class="weather-hero-location"><span class="weather-hero-location-text">Clima</span></div>
        <h1 class="weather-hero-event">Elige un evento</h1>
        <p class="weather-hero-desc">Selecciona un evento con recinto para consultar el pronóstico real.</p>
      </section>
      <div id="weatherPicker"><div class="view-loading" role="status"><span class="material-symbols-outlined">progress_activity</span><span>Cargando eventos…</span></div></div>
    `;

    const result = await getEvents({ size: 10 });
    const picker = this.container.querySelector('#weatherPicker');
    if (!picker) return;
    if (result.error) {
      picker.innerHTML = emptyState({ icon: 'cloud_off', title: 'No se pudieron cargar los eventos', message: result.error.message });
      return;
    }
    if (!result.events?.length) {
      picker.innerHTML = emptyState({ icon: 'event_busy', title: 'No hay eventos disponibles', message: 'Ticketmaster no devolvió eventos próximos.' });
      return;
    }
    picker.innerHTML = `
      <div class="event-picker">
        ${result.events.map((event) => `
          <a class="event-picker-item" href="#/clima/${encodeURIComponent(event.id)}">
            <span class="material-symbols-outlined">cloud</span>
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
      const content = this.container.querySelector('#weatherContent');
      if (content) {
        content.innerHTML = emptyState({
          icon: 'cloud_off',
          title: 'No se pudo cargar el evento',
          message: this.error?.message || 'El evento no existe o ya no está disponible.',
          action: '<a class="event-card-ref-btn glass" href="#/clima">Elegir otro evento</a>'
        });
      }
      return;
    }

    if (!hasValidCoordinates(this.event.lat, this.event.lng)) {
      this.renderEventShell(emptyState({
        icon: 'wrong_location',
        title: 'El recinto no tiene coordenadas',
        message: 'Ticketmaster no proporcionó la ubicación exacta de este recinto, así que no se puede consultar el pronóstico real.'
      }));
      return;
    }

    this.weather = await getWeather(Number(this.event.lat), Number(this.event.lng));
    this.checked = this.loadChecklist();
    this.renderWeather();
  }

  renderEventShell(content) {
    const slot = this.container.querySelector('#weatherContent');
    if (!slot) return;
    slot.innerHTML = `
      <section class="weather-hero">
        <div class="weather-hero-location"><span class="weather-hero-location-text">${escapeHtml(this.event.venue || 'Recinto por confirmar')}${this.event.city ? ` · ${escapeHtml(this.event.city)}` : ''}</span></div>
        <h1 class="weather-hero-event">${escapeHtml(this.event.name)}</h1>
        <p class="weather-hero-desc">${escapeHtml(formatEventDate(this.event))}${formatEventTime(this.event) ? ` · ${escapeHtml(formatEventTime(this.event))}` : ''}</p>
      </section>
      ${content}
      <div class="weather-event-links"><a class="route-action-btn" href="#/ruta/${encodeURIComponent(this.event.id)}"><span class="material-symbols-outlined">route</span> Ver ruta</a></div>
    `;
  }

  loadChecklist() {
    try {
      const saved = JSON.parse(localStorage.getItem(`eventradar.checklist:${this.eventId}`) || '[]');
      return new Set(Array.isArray(saved) ? saved : []);
    } catch {
      return new Set();
    }
  }

  saveChecklist() {
    try {
      localStorage.setItem(`eventradar.checklist:${this.eventId}`, JSON.stringify([...this.checked]));
    } catch {
      // Sin localStorage el checklist sigue funcionando en memoria.
    }
  }

  renderWeather() {
    const slot = this.container.querySelector('#weatherContent');
    if (!slot) return;

    if (this.weather?.error) {
      this.renderEventShell(emptyState({
        icon: 'cloud_off',
        title: 'Pronóstico no disponible',
        message: this.weather.error.message,
        action: '<button class="event-card-ref-btn glass" type="button" data-retry-weather>Reintentar</button>'
      }));
      slot.querySelector('[data-retry-weather]')?.addEventListener('click', () => this.loadEvent());
      return;
    }

    const list = this.weather?.list || [];
    if (list.length === 0) {
      this.renderEventShell(emptyState({
        icon: 'cloud_off',
        title: 'Sin datos de pronóstico',
        message: 'OpenWeatherMap no devolvió datos para estas coordenadas.'
      }));
      return;
    }

    const timezone = this.weather.city?.timezone;
    const current = list[0];
    const nextDay = list.slice(0, 8);
    const daily = groupDays(list, timezone).slice(0, 5);
    const min = Math.min(...nextDay.map((item) => Number(item.main?.temp_min)).filter(Number.isFinite));
    const max = Math.max(...nextDay.map((item) => Number(item.main?.temp_max)).filter(Number.isFinite));
    const advice = this.weather.advice;
    const checklist = advice?.checklist || [];
    const validChecked = new Set([...this.checked].filter((item) => checklist.includes(item)));
    if (validChecked.size !== this.checked.size) {
      this.checked = validChecked;
      this.saveChecklist();
    }
    const eventTime = this.event.datetime ? new Date(this.event.datetime) : null;
    const lastForecast = list[list.length - 1]?.dt ? new Date(list[list.length - 1].dt * 1000) : null;
    const outsideForecast = eventTime && lastForecast && eventTime > lastForecast;
    const ticketUrl = safeHttpUrl(this.event.url);

    slot.innerHTML = `
      <section class="weather-hero">
        <div class="weather-hero-location">
          <span class="material-symbols-outlined">location_on</span>
          <span class="weather-hero-location-text">${escapeHtml(this.event.venue || 'Recinto por confirmar')}${this.event.city ? ` · ${escapeHtml(this.event.city)}` : ''}</span>
          <span class="weather-hero-dot"></span>
        </div>
        <h1 class="weather-hero-event">${escapeHtml(this.event.name)}</h1>
        <div class="weather-hero-temp"><span class="weather-hero-temp-value">${temp(current.main?.temp)}</span></div>
        <div class="weather-hero-desc"><span class="material-symbols-outlined">${weatherIcon(current)}</span><span>${escapeHtml(current.weather?.[0]?.description || 'Condición no disponible')}</span></div>
        <div class="weather-hero-meta">
          <span class="weather-hero-meta-text">Máx ${temp(max)} · Mín ${temp(min)}</span>
          ${advice?.message ? `<span class="weather-hero-badge"><span class="material-symbols-outlined">celebration</span>${escapeHtml(advice.message)}</span>` : ''}
        </div>
      </section>

      ${outsideForecast ? '<p class="weather-note">El evento está fuera del alcance del pronóstico de 5 días. Se muestran las condiciones más cercanas disponibles.</p>' : ''}

      <div class="weather-grid">
        <div class="weather-glass-card weather-hourly">
          <div class="weather-section-header">
            <div class="weather-section-header-left"><span class="material-symbols-outlined">schedule</span><span>Próximas horas · cada 3 h</span></div>
            <span>${escapeHtml(formatEventDate(this.event))}</span>
          </div>
          <div class="weather-hourly-grid">
            ${nextDay.map((item, index) => `
              <div class="weather-hourly-item">
                <span class="weather-hourly-time ${index === 0 ? 'active' : ''}">${escapeHtml(formatHour(item.dt, timezone))}</span>
                <span class="material-symbols-outlined weather-hourly-icon">${weatherIcon(item)}</span>
                <span class="weather-hourly-temp">${temp(item.main?.temp)}</span>
                <span class="weather-hourly-precip ${Number(item.pop) > 0 ? '' : 'zero'}">${pop(item.pop)}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="weather-glass-card weather-forecast-3day">
          <div class="weather-section-header">
            <div class="weather-section-header-left"><span class="material-symbols-outlined">calendar_month</span><span>Próximos días</span></div>
          </div>
          <div class="weather-forecast-list">
            ${daily.map((day, index) => `
              <div class="weather-forecast-item">
                <span class="weather-forecast-day ${index > 0 ? 'other' : ''}">${escapeHtml(formatDay(day.dt, timezone))}</span>
                <span class="material-symbols-outlined weather-forecast-icon">${day.icon}</span>
                <div class="weather-forecast-range">
                  <span class="weather-forecast-temp">${temp(day.min)}</span>
                  <div class="weather-forecast-bar"><div class="weather-forecast-bar-fill" style="width:${Math.max(8, Math.min(100, ((day.max - day.min) / Math.max(max - min, 1)) * 100))}%"></div></div>
                  <span class="weather-forecast-temp high">${temp(day.max)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="weather-metrics-grid">
          <div class="weather-metric-card">
            <div class="weather-metric-header"><span class="material-symbols-outlined">thermostat</span><span>SENSACIÓN</span></div>
            <div class="weather-metric-value">${temp(current.main?.feels_like)}</div>
            <div class="weather-metric-label">Temperatura percibida</div>
          </div>
          <div class="weather-metric-card">
            <div class="weather-metric-header"><span class="material-symbols-outlined">air</span><span>VIENTO</span></div>
            <div class="weather-metric-value">${current.wind?.speed !== undefined ? `${Math.round(Number(current.wind.speed) * 3.6)} <small>km/h</small>` : '—'}</div>
            <div class="weather-metric-label">${current.wind?.deg !== undefined ? `Dirección ${Math.round(Number(current.wind.deg))}°` : 'Dirección no disponible'}</div>
          </div>
          <div class="weather-metric-card">
            <div class="weather-metric-header"><span class="material-symbols-outlined">water_drop</span><span>HUMEDAD</span></div>
            <div class="weather-metric-value">${current.main?.humidity !== undefined ? `${Math.round(Number(current.main.humidity))}%` : '—'}</div>
            <div class="weather-metric-label">Humedad relativa</div>
          </div>
          <div class="weather-metric-card">
            <div class="weather-metric-header"><span class="material-symbols-outlined">umbrella</span><span>PRECIPITACIÓN</span></div>
            <div class="weather-metric-value">${pop(current.pop)}</div>
            <div class="weather-metric-label">Probabilidad en las próximas 3 h</div>
          </div>
        </div>

        <div class="weather-glass-card weather-checklist">
          <div class="weather-checklist-header">
            <div class="weather-checklist-title-group">
              <div class="weather-checklist-icon"><span class="material-symbols-outlined">checklist</span></div>
              <div class="weather-checklist-titles">
                <span class="weather-checklist-main-title">Checklist de equipaje</span>
                <span class="weather-checklist-subtitle">${advice?.message ? escapeHtml(advice.message) : 'Recomendaciones basadas en el pronóstico actual.'}</span>
              </div>
            </div>
            <span class="weather-checklist-count" id="checklistCount">${this.checked.size} de ${checklist.length} listos</span>
          </div>
          ${checklist.length ? `
            <div class="weather-checklist-grid">
              ${checklist.map((item) => `
                <label class="weather-checklist-item">
                  <input class="weather-checklist-checkbox" type="checkbox" data-check="${escapeHtml(item)}" ${this.checked.has(item) ? 'checked' : ''}>
                  <span class="weather-checklist-text">${escapeHtml(item)}</span>
                </label>
              `).join('')}
            </div>
          ` : '<p class="weather-empty-inline">No hay recomendaciones disponibles para este pronóstico.</p>'}
        </div>
      </div>

      <div class="weather-event-links">
        <a class="route-action-btn" href="#/ruta/${encodeURIComponent(this.event.id)}"><span class="material-symbols-outlined">route</span> Ver ruta al recinto</a>
        ${ticketUrl ? `<a class="route-action-btn" href="${escapeHtml(ticketUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined">confirmation_number</span> Entradas</a>` : ''}
      </div>
    `;
  }

  handleChange(event) {
    const checkbox = event.target.closest('[data-check]');
    if (!checkbox) return;
    const item = checkbox.getAttribute('data-check');
    if (checkbox.checked) this.checked.add(item);
    else this.checked.delete(item);
    this.saveChecklist();
    const count = this.container.querySelector('#checklistCount');
    if (count) {
      const total = this.container.querySelectorAll('[data-check]').length;
      count.textContent = `${this.checked.size} de ${total} listos`;
    }
  }

  destroy() {
    this.container.removeEventListener('change', this.handleChange);
  }
}
