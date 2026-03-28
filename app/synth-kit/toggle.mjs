/**
 * Тоггл: одна ячейка, aria-pressed.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {string} [opts.label]
 * @param {boolean} [opts.pressed]
 * @param {string} [opts.id]
 */
export function createToggle(opts) {
  const { mount, label = 'On', pressed: startPressed = false, id: idOpt } = opts;

  const id = idOpt ?? `synth-toggle-${Math.random().toString(36).slice(2, 9)}`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'synth-toggle';
  btn.id = id;
  btn.textContent = label;
  btn.setAttribute('aria-pressed', startPressed ? 'true' : 'false');

  if (mount) mount.appendChild(btn);

  let pressed = startPressed;

  /** @type {Set<(p: boolean) => void>} */
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb(pressed);
  }

  function onClick() {
    pressed = !pressed;
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    emit();
  }

  btn.addEventListener('click', onClick);

  function getValue() {
    return pressed;
  }

  function setValue(p) {
    pressed = Boolean(p);
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    emit();
  }

  /** @param {(p: boolean) => void} cb */
  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function destroy() {
    btn.removeEventListener('click', onClick);
    listeners.clear();
    btn.remove();
  }

  return {
    element: btn,
    getValue,
    setValue,
    onChange,
    destroy,
  };
}
