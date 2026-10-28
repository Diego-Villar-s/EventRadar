export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeHttpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '?';
}

export function avatarUrl(images, name = 'Usuario') {
  const image = Array.isArray(images) ? images.find((item) => item?.url) : null;
  if (image) {
    const safe = safeHttpUrl(image.url);
    if (safe) return safe;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#2c2c2e"/><text x="48" y="57" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#ffffff">${initials(name)}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function formatEventDate(event) {
  if (!event) return 'Fecha por confirmar';
  const date = event.date ? new Date(`${event.date}T12:00:00`) : (event.datetime ? new Date(event.datetime) : null);
  if (!date || Number.isNaN(date.getTime())) return 'Fecha por confirmar';
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatEventTime(event) {
  if (!event) return '';
  if (event.time) return event.time.slice(0, 5);
  if (!event.datetime) return '';
  const date = new Date(event.datetime);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatPrice(event) {
  if (!event || event.priceMin === null || event.priceMin === undefined) return null;
  if (Number(event.priceMin) === 0) return 'Gratis';
  const currency = event.currency || 'EUR';
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(Number(event.priceMin));
  } catch {
    return `${event.priceMin} ${currency}`;
  }
}

export function formatDuration(ms) {
  const total = Math.round(Number(ms) / 1000);
  if (!Number.isFinite(total) || total <= 0) return '';
  const minutes = Math.floor(total / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function emptyState({ icon = 'info', title, message, action = '' }) {
  return `
    <div class="empty-state" role="status">
      <span class="material-symbols-outlined empty-state-icon">${escapeHtml(icon)}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${action}
    </div>
  `;
}

export function eventImage(event) {
  return safeHttpUrl(event?.image);
}

export function artistHash(name) {
  return `#/artista/${encodeURIComponent(name)}`;
}
