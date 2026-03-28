/**
 * Числовой индикатор (семисегментный шрифт из synth-kit.css) с управлением как у крутилки:
 * перетаскивание по вертикали и колесо мыши, чувствительность через pixelsPerFullRange.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {number} [opts.min]
 * @param {number} [opts.max]
 * @param {number} [opts.value]
 * @param {number} [opts.step] 0 — без квантования
 * @param {number} [opts.pixelsPerFullRange]
 * @param {string} [opts.label]
 * @param {string} [opts.id]
 * @param {number} [opts.width] минимальная ширина в символах (ведущие пробелы)
 * @param {boolean} [opts.padField]
 */
export function createSegmentValueControl(opts) {
  const {
    mount,
    min = 0,
    max = 100,
    value: startValue = 0,
    step = 0,
    pixelsPerFullRange = 200,
    label = '',
    id: idOpt,
    width = 4,
    padField = true,
  } = opts;

  const id = idOpt ?? `synth-seg-ctl-${Math.random().toString(36).slice(2, 9)}`;

  const wrap = document.createElement('div');
  wrap.className = 'synth-block';
  wrap.style.position = 'relative';

  const face = document.createElement('button');
  face.type = 'button';
  face.className = 'synth-seg synth-seg--value-control';
  face.id = id;
  face.setAttribute('role', 'slider');
  face.setAttribute('aria-valuemin', String(min));
  face.setAttribute('aria-valuemax', String(max));
  face.setAttribute('aria-orientation', 'vertical');
  face.setAttribute('aria-labelledby', `${id}-lbl`);

  const a11y = document.createElement('span');
  a11y.className = 'synth-seg__a11y';

  const lbl = document.createElement('span');
  lbl.className = 'synth-knob__label';
  lbl.id = `${id}-lbl`;
  lbl.textContent = label;

  wrap.appendChild(face);
  wrap.appendChild(a11y);
  wrap.appendChild(lbl);
  if (mount) mount.appendChild(wrap);

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function quantize(v, st, lo, hi) {
    if (!st || st <= 0) return clamp(v, lo, hi);
    const q = Math.round((v - lo) / st) * st + lo;
    return clamp(q, lo, hi);
  }

  /**
   * @param {number} v
   * @param {number} w
   * @param {boolean} pad
   */
  function formatIntField(v, w, pad) {
    const s = String(Math.round(v));
    if (!pad || w <= 0) return s;
    const need = w - s.length;
    if (need > 0) return ' '.repeat(need) + s;
    return s;
  }

  const range = max - min || 1;
  let pxFull = pixelsPerFullRange;
  let sens = range / Math.max(1e-6, pxFull);

  let value = clamp(quantize(startValue, step, min, max), min, max);

  /** @type {Set<(v: number) => void>} */
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(value);
  }

  function paint() {
    const text = formatIntField(value, width, padField);
    face.textContent = text;
    a11y.textContent = text;
    face.setAttribute('aria-valuenow', String(Math.round(value * 1e6) / 1e6));
  }

  function setValue(v) {
    value = quantize(v, step, min, max);
    paint();
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
    face.setPointerCapture(ev.pointerId);
  }

  /** @param {PointerEvent} ev */
  function onPointerMove(ev) {
    if (!active) return;
    const dy = ev.clientY - lastY;
    lastY = ev.clientY;
    const next = clamp(quantize(value - dy * sens, step, min, max), min, max);
    if (next !== value) {
      value = next;
      paint();
      emit();
    }
  }

  function endPointer() {
    active = false;
  }

  /** @param {WheelEvent} ev */
  function onWheel(ev) {
    ev.preventDefault();
    const next = clamp(
      quantize(value - Math.sign(ev.deltaY) * sens * 10, step, min, max),
      min,
      max,
    );
    if (next !== value) {
      value = next;
      paint();
      emit();
    }
  }

  face.addEventListener('pointerdown', onPointerDown);
  face.addEventListener('pointermove', onPointerMove);
  face.addEventListener('pointerup', endPointer);
  face.addEventListener('pointercancel', endPointer);
  face.addEventListener('wheel', onWheel, { passive: false });

  paint();

  function destroy() {
    face.removeEventListener('pointerdown', onPointerDown);
    face.removeEventListener('pointermove', onPointerMove);
    face.removeEventListener('pointerup', endPointer);
    face.removeEventListener('pointercancel', endPointer);
    face.removeEventListener('wheel', onWheel);
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
