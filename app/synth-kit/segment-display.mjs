/**
 * Семисегментный индикатор: шрифт DSEG из synth-kit.css, форматирование в модуле.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {number} [opts.value]
 * @param {number} [opts.decimals] число знаков после запятой
 * @param {number} [opts.width] минимальная ширина в символах (ведущие пробелы/нули)
 * @param {boolean} [opts.padZeros]
 * @param {string} [opts.id]
 */
export function createSegmentDisplay(opts) {
  const {
    mount,
    value: startValue = 0,
    decimals = 0,
    width = 4,
    padZeros = false,
    id: idOpt,
  } = opts;

  const id = idOpt ?? `synth-seg-${Math.random().toString(36).slice(2, 9)}`;

  const wrap = document.createElement('div');
  wrap.className = 'synth-block';
  wrap.style.position = 'relative';

  const face = document.createElement('div');
  face.className = 'synth-seg';
  face.id = id;
  face.setAttribute('aria-live', 'polite');

  const a11y = document.createElement('span');
  a11y.className = 'synth-seg__a11y';
  a11y.textContent = formatValue(startValue, decimals, width, padZeros);

  wrap.appendChild(face);
  wrap.appendChild(a11y);
  if (mount) mount.appendChild(wrap);

  let value = startValue;

  /** @type {Set<(v: number) => void>} */
  const listeners = new Set();

  /**
   * @param {number} v
   * @param {number} dec
   * @param {number} w
   * @param {boolean} pad
   */
  function formatValue(v, dec, w, pad) {
    const sign = v < 0 ? '-' : '';
    const abs = Math.abs(v);
    const fixed = abs.toFixed(dec);
    const [intPart, frac] = fixed.split('.');
    let body = intPart;
    if (frac !== undefined) body = `${intPart}.${frac}`;
    let s = sign + body;
    if (pad && w > 0) {
      const need = w - s.length;
      if (need > 0) s = ' '.repeat(need) + s;
    }
    return s;
  }

  function render() {
    const text = formatValue(value, decimals, width, padZeros);
    face.textContent = text;
    a11y.textContent = text;
  }

  function setValue(v) {
    value = v;
    render();
    for (const cb of listeners) cb(value);
  }

  function getValue() {
    return value;
  }

  /** @param {(v: number) => void} cb */
  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  render();

  function destroy() {
    listeners.clear();
    wrap.remove();
  }

  return {
    element: wrap,
    getValue,
    setValue,
    onChange,
    destroy,
  };
}
