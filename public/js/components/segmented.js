import { escapeHtml } from '../utils.js';

export class SegmentedControl {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.onChange = options.onChange || (() => {});
    this.activeIndex = Math.min(Math.max(options.activeIndex || 0, 0), Math.max(this.items.length - 1, 0));
    this.handleKeydown = this.handleKeydown.bind(this);
    this.render();
    this.setup();
  }

  render() {
    this.container.innerHTML = `
      <div class="seg" role="tablist" aria-label="${escapeHtml(this.items.map((item) => item.label || item).join(', '))}">
        <span class="seg-thumb" aria-hidden="true"></span>
        ${this.items.map((item, index) => `
          <button
            type="button"
            class="seg-item ${index === this.activeIndex ? 'active' : ''}"
            data-index="${index}"
            role="tab"
            aria-selected="${index === this.activeIndex}"
            tabindex="${index === this.activeIndex ? '0' : '-1'}"
          >${escapeHtml(item.label || item)}</button>
        `).join('')}
      </div>
    `;
    this.thumb = this.container.querySelector('.seg-thumb');
    this.itemsEl = this.container.querySelectorAll('.seg-item');
  }

  setup() {
    this.itemsEl.forEach((element, index) => {
      element.addEventListener('click', () => {
        this.setActive(index);
        this.onChange(index, this.items[index]);
      });
    });
    this.container.addEventListener('keydown', this.handleKeydown);
    this.container.classList.add('no-anim');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.moveThumb(false);
        this.container.classList.remove('no-anim');
      });
    });
  }

  handleKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let next = this.activeIndex;
    if (event.key === 'ArrowLeft') next = (this.activeIndex - 1 + this.items.length) % this.items.length;
    if (event.key === 'ArrowRight') next = (this.activeIndex + 1) % this.items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = this.items.length - 1;
    this.setActive(next);
    this.onChange(next, this.items[next]);
    this.itemsEl[next]?.focus();
  }

  moveThumb(animate = true) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) animate = false;

    const active = this.itemsEl[this.activeIndex];
    if (!active || !this.thumb) return;

    const containerRect = this.container.querySelector('.seg').getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    const left = rect.left - containerRect.left;

    if (animate) {
      this.thumb.style.transition = 'transform .5s cubic-bezier(.34,1.45,.64,1), width .5s cubic-bezier(.34,1.45,.64,1)';
      this.thumb.style.transform = `translateX(${left}px) scaleX(1.04) scaleY(.94)`;
      this.thumb.style.width = `${rect.width}px`;
      setTimeout(() => {
        this.thumb.style.transform = `translateX(${left}px) scaleX(1) scaleY(1)`;
      }, 120);
    } else {
      this.thumb.style.transition = 'none';
      this.thumb.style.width = `${rect.width}px`;
      this.thumb.style.transform = `translateX(${left}px)`;
      void this.thumb.offsetHeight;
    }
  }

  setActive(index) {
    this.activeIndex = index;
    this.itemsEl.forEach((element, idx) => {
      const isActive = idx === index;
      element.classList.toggle('active', isActive);
      element.setAttribute('aria-selected', String(isActive));
      element.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    this.moveThumb(true);
  }

  destroy() {
    this.container.removeEventListener('keydown', this.handleKeydown);
  }
}
