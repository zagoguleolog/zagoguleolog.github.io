/**
 * Крутилка: перетаскивание по вертикали, чувствительность через pixelsPerFullRange.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount] родитель для корневого узла
 * @param {number} [opts.min]
 * @param {number} [opts.max]
 * @param {number} [opts.value]
 * @param {number} [opts.step] 0 — без квантования
 * @param {number} [opts.pixelsPerFullRange] пикселей для полного диапазона min…max
 * @param {string} [opts.label]
 * @param {string} [opts.id] id для связки label ↔ control
 * @param {boolean} [opts.useKnobsAtlas] фон из knobs.png (класс synth-knob--knobs-atlas), вращается вся крутилка
 */
export function createKnob(opts) {
  const {
    mount,
    min = 0,
    max = 100,
    value: startValue = 0,
    step = 0,
    pixelsPerFullRange = 200,
    label = '',
    id: idOpt,
    useKnobsAtlas = false,
  } = opts;

  const id = idOpt ?? `synth-knob-${Math.random().toString(36).slice(2, 9)}`;

  const wrap = document.createElement('div');
  wrap.className = 'synth-block';

  const knob = document.createElement('button');
  knob.type = 'button';
  knob.className = useKnobsAtlas ? 'synth-knob synth-knob--knobs-atlas' : 'synth-knob';
  knob.id = id;
  knob.setAttribute('role', 'slider');
  knob.setAttribute('aria-valuemin', String(min));
  knob.setAttribute('aria-valuemax', String(max));
  knob.setAttribute('aria-orientation', 'vertical');
  knob.setAttribute('aria-labelledby', `${id}-lbl`);

  const hand = document.createElement('span');
  hand.className = 'synth-knob__hand';
  hand.setAttribute('aria-hidden', 'true');
  knob.appendChild(hand);

  const lbl = document.createElement('span');
  lbl.className = 'synth-knob__label';
  lbl.id = `${id}-lbl`;
  lbl.textContent = label;

  wrap.appendChild(knob);
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

  const range = max - min || 1;
  let pxFull = pixelsPerFullRange;
  let sens = range / Math.max(1e-6, pxFull);

  let value = clamp(quantize(startValue, step, min, max), min, max);

  /** @type {Set<(v: number) => void>} */
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(value);
  }

  function setRotation() {
    const t = (value - min) / range;
    const deg = -135 + t * 270;
    if (useKnobsAtlas) {
      knob.style.transform = `rotate(${deg}deg)`;
      hand.style.transform = '';
    } else {
      knob.style.transform = '';
      hand.style.transform = `rotate(${deg}deg)`;
    }
    knob.setAttribute('aria-valuenow', String(Math.round(value * 1e6) / 1e6));
  }

  function setValue(v) {
    value = quantize(v, step, min, max);
    setRotation();
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
    knob.setPointerCapture(ev.pointerId);
  }

  /** @param {PointerEvent} ev */
  function onPointerMove(ev) {
    if (!active) return;
    const dy = ev.clientY - lastY;
    lastY = ev.clientY;
    const next = clamp(quantize(value - dy * sens, step, min, max), min, max);
    if (next !== value) {
      value = next;
      setRotation();
      emit();
    }
  }

  function endPointer() {
    active = false;
  }

  knob.addEventListener('pointerdown', onPointerDown);
  knob.addEventListener('pointermove', onPointerMove);
  knob.addEventListener('pointerup', endPointer);
  knob.addEventListener('pointercancel', endPointer);

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
      setRotation();
      emit();
    }
  }
  knob.addEventListener('wheel', onWheel, { passive: false });

  setRotation();

  function destroy() {
    knob.removeEventListener('pointerdown', onPointerDown);
    knob.removeEventListener('pointermove', onPointerMove);
    knob.removeEventListener('pointerup', endPointer);
    knob.removeEventListener('pointercancel', endPointer);
    knob.removeEventListener('wheel', onWheel);
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
