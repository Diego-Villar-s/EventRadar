export class SegmentedControl {
  constructor(container, options = {}) {
    this.container = container;
    this.items = options.items || [];
    this.onChange = options.onChange || (() => {});
    this.activeIndex = options.activeIndex || 0;
    this.render();
    this.setup();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="seg">
        <span class="seg-thumb"></span>
        ${this.items.map((item, i) => `
          <a href="javascript:void(0)" class="seg-item" data-index="${i}">${item.label || item}</a>
        `).join('')}
      </div>
    `;
    this.thumb = this.container.querySelector('.seg-thumb');
    this.itemsEl = this.container.querySelectorAll('.seg-item');
  }
  
  setup() {
    this.itemsEl.forEach((el, i) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        this.setActive(i);
        this.onChange(i, this.items[i]);
      });
    });
    this.container.classList.add('no-anim');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.moveThumb(false);
        this.container.classList.remove('no-anim');
      });
    });
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
      this.thumb.style.width = rect.width + 'px';
      setTimeout(() => {
        this.thumb.style.transform = `translateX(${left}px) scaleX(1) scaleY(1)`;
      }, 120);
    } else {
      this.thumb.style.transition = 'none';
      this.thumb.style.width = rect.width + 'px';
      this.thumb.style.transform = `translateX(${left}px)`;
      void this.thumb.offsetHeight;
    }
  }
  
  setActive(i) {
    this.activeIndex = i;
    this.itemsEl.forEach((el, idx) => {
      el.classList.toggle('active', idx === i);
    });
    this.moveThumb(true);
  }
}
