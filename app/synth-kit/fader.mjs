/**
 * Вертикальный фейдер: та же модель дельты по Y, что у крутилки.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {number} [opts.min]
 * @param {number} [opts.max]
 * @param {number} [opts.value]
 * @param {number} [opts.step]
 * @param {number} [opts.pixelsPerFullRange]
 * @param {string} [opts.label]
 * @param {string} [opts.id]
 */
export function createFader(opts) {
  const {
    mount,
    min = 0,
    max = 1,
    value: startValue = 0,
    step = 0,
    pixelsPerFullRange = 120,
    label = '',
    id: idOpt,
  } = opts;

  const id = idOpt ?? `synth-fader-${Math.random().toString(36).slice(2, 9)}`;

  const wrap = document.createElement('div');
  wrap.className = 'synth-block synth-fader';

  const track = document.createElement('div');
  track.className = 'synth-fader__track';
  track.id = id;
  track.setAttribute('role', 'slider');
  track.setAttribute('tabindex', '0');
  track.setAttribute('aria-valuemin', String(min));
  track.setAttribute('aria-valuemax', String(max));
  track.setAttribute('aria-orientation', 'vertical');
  track.setAttribute('aria-labelledby', `${id}-lbl`);

  const thumb = document.createElement('div');
  thumb.className = 'synth-fader__thumb';
  thumb.setAttribute('aria-hidden', 'true');
  track.appendChild(thumb);

  const lbl = document.createElement('span');
  lbl.className = 'synth-knob__label';
  lbl.id = `${id}-lbl`;
  lbl.textContent = label;

  wrap.appendChild(track);
  wrap.appendChild(lbl);
  if (mount) mount.appendChild(wrap);

  const range = max - min || 1;
  let pxFull = pixelsPerFullRange;
  let sens = range / Math.max(1e-6, pxFull);

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function quantize(v, st, lo, hi) {
    if (!st || st <= 0) return clamp(v, lo, hi);
    const q = Math.round((v - lo) / st) * st + lo;
    return clamp(q, lo, hi);
  }

  let value = clamp(quantize(startValue, step, min, max), min, max);

  /** @type {Set<(v: number) => void>} */
  const listeners = new Set();

  function syncAria() {
    track.setAttribute('aria-valuenow', String(Math.round(value * 1e6) / 1e6));
  }

  function layoutThumb() {
    const t = (value - min) / range;
    const th = track.clientHeight;
    const h = thumb.offsetHeight || 1;
    const maxBottom = Math.max(0, th - h);
    thumb.style.bottom = `${t * maxBottom}px`;
    thumb.style.removeProperty('left');
    thumb.style.removeProperty('transform');
    syncAria();
  }

  function emit() {
    for (const cb of listeners) cb(value);
  }

  function setValue(v) {
    value = quantize(v, step, min, max);
    layoutThumb();
    emit();
  }

  /** @param {number} px пикселей на полный диапазон min…max */
  function setPixelsPerFullRange(px) {
    pxFull = Math.max(1e-6, px);
    sens = range / pxFull;
  }

  function getValue() {
    return value;
  }

  /** @param {(v: number) => void} cb */
  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  let lastY = 0;
  let active = false;

  /** @param {PointerEvent} ev */
  function onPointerDown(ev) {
    active = true;
    lastY = ev.clientY;
    track.setPointerCapture(ev.pointerId);
  }

  /** @param {PointerEvent} ev */
  function onPointerMove(ev) {
    if (!active) return;
    const dy = ev.clientY - lastY;
    lastY = ev.clientY;
    const next = clamp(quantize(value - dy * sens, step, min, max), min, max);
    if (next !== value) {
      value = next;
      layoutThumb();
      emit();
    }
  }

  function endPointer() {
    active = false;
  }

  /** @param {WheelEvent} ev */
  function onWheel(ev) {
    ev.preventDefault();
    const delta = ev.deltaY;
    const next = clamp(
      quantize(value - Math.sign(delta) * sens * 12, step, min, max),
      min,
      max,
    );
    if (next !== value) {
      value = next;
      layoutThumb();
      emit();
    }
  }

  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', endPointer);
  track.addEventListener('pointercancel', endPointer);
  track.addEventListener('wheel', onWheel, { passive: false });

  const ro = new ResizeObserver(() => layoutThumb());
  ro.observe(track);

  requestAnimationFrame(() => layoutThumb());

  function destroy() {
    ro.disconnect();
    track.removeEventListener('pointerdown', onPointerDown);
    track.removeEventListener('pointermove', onPointerMove);
    track.removeEventListener('pointerup', endPointer);
    track.removeEventListener('pointercancel', endPointer);
    track.removeEventListener('wheel', onWheel);
    listeners.clear();
    wrap.remove();
  }

  return {
    element: wrap,
    getValue,
    setValue,
    setPixelsPerFullRange,
    onChange,
    destroy,
  };
}
