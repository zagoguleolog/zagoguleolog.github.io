/**
 * Две кнопки в одной квадратной ячейке сетки.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {string} [opts.leftLabel]
 * @param {string} [opts.rightLabel]
 * @param {() => void} [opts.onLeft]
 * @param {() => void} [opts.onRight]
 */
export function createPairButtons(opts) {
  const {
    mount,
    leftLabel = '−',
    rightLabel = '+',
    onLeft,
    onRight,
  } = opts;

  const wrap = document.createElement('div');
  wrap.className = 'synth-pair';
  wrap.setAttribute('role', 'group');

  const left = document.createElement('button');
  left.type = 'button';
  left.className = 'synth-pair__btn';
  left.textContent = leftLabel;

  const right = document.createElement('button');
  right.type = 'button';
  right.className = 'synth-pair__btn';
  right.textContent = rightLabel;

  wrap.appendChild(left);
  wrap.appendChild(right);
  if (mount) mount.appendChild(wrap);

  function handleLeft() {
    onLeft?.();
  }

  function handleRight() {
    onRight?.();
  }

  left.addEventListener('click', handleLeft);
  right.addEventListener('click', handleRight);

  function destroy() {
    left.removeEventListener('click', handleLeft);
    right.removeEventListener('click', handleRight);
    wrap.remove();
  }

  return {
    element: wrap,
    destroy,
  };
}
