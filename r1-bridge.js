window.R1Bridge = (() => {
  const listeners = { up: [], down: [], click: [], long: [], longEnd: [] };
  const KEY = 'theory_roulette_r1_v1';

  const encode = (value) => {
    const json = JSON.stringify(value);
    return btoa(unescape(encodeURIComponent(json)));
  };
  const decode = (value) => JSON.parse(decodeURIComponent(escape(atob(value))));

  async function save(value) {
    try {
      if (window.creationStorage?.plain?.setItem) {
        await window.creationStorage.plain.setItem(KEY, encode(value));
      } else {
        localStorage.setItem(KEY, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.warn('Theory Roulette save failed', error);
      return false;
    }
  }

  async function load() {
    try {
      if (window.creationStorage?.plain?.getItem) {
        const raw = await window.creationStorage.plain.getItem(KEY);
        return raw ? decode(raw) : null;
      }
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Theory Roulette load failed', error);
      return null;
    }
  }

  async function clear() {
    try {
      if (window.creationStorage?.plain?.removeItem) {
        await window.creationStorage.plain.removeItem(KEY);
      } else {
        localStorage.removeItem(KEY);
      }
    } catch (error) {
      console.warn('Theory Roulette clear failed', error);
    }
  }

  function emit(type) { (listeners[type] || []).forEach(fn => fn()); }
  function on(type, fn) { listeners[type].push(fn); }

  window.addEventListener('scrollUp', () => emit('up'));
  window.addEventListener('scrollDown', () => emit('down'));
  window.addEventListener('sideClick', () => emit('click'));
  window.addEventListener('longPressStart', () => emit('long'));
  window.addEventListener('longPressEnd', () => emit('longEnd'));

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') emit('up');
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') emit('down');
    if (event.key === 'Enter' || event.key === ' ') emit('click');
    if (event.key.toLowerCase() === 'h') emit('long');
    if (event.key.toLowerCase() === 'e') emit('longEnd');
  });

  let touchX = null;
  let touchY = null;
  let touchAt = 0;
  window.addEventListener('touchstart', (event) => {
    touchX = event.touches[0]?.clientX ?? null;
    touchY = event.touches[0]?.clientY ?? null;
    touchAt = Date.now();
  }, { passive: true });
  window.addEventListener('touchend', (event) => {
    if (touchX === null || touchY === null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchX;
    const endY = event.changedTouches[0]?.clientY ?? touchY;
    const dx = endX - touchX;
    const dy = endY - touchY;
    const duration = Date.now() - touchAt;
    if (duration > 650) emit('long');
    else if (Math.abs(dx) > 28) emit(dx > 0 ? 'up' : 'down');
    else if (Math.abs(dy) > 28) emit(dy > 0 ? 'up' : 'down');
    else emit('click');
    touchX = touchY = null;
  }, { passive: true });

  return {
    onUp: fn => on('up', fn),
    onDown: fn => on('down', fn),
    onClick: fn => on('click', fn),
    onLong: fn => on('long', fn),
    onLongEnd: fn => on('longEnd', fn),
    save, load, clear,
    isR1: () => !!window.creationStorage || typeof window.PluginMessageHandler !== 'undefined'
  };
})();
