/**
 * Матрица чекбоксов: булева сетка rows×cols, стили «аппаратного» контрола.
 */

/**
 * @param {object} opts
 * @param {HTMLElement} [opts.mount]
 * @param {number} opts.rows
 * @param {number} opts.cols
 * @param {boolean[][] | boolean[]} [opts.initial] по строкам или плоский row-major
 */
export function createCheckboxMatrix(opts) {
  const { mount, rows, cols, initial } = opts;

  if (!Number.isFinite(rows) || rows < 1 || !Number.isFinite(cols) || cols < 1) {
    throw new Error('createCheckboxMatrix: rows и cols должны быть положительными числами');
  }

  const initialIs2d =
    initial &&
    initial.length > 0 &&
    Array.isArray(initial[0]);

  /** @type {boolean[][]} */
  const state = [];
  for (let r = 0; r < rows; r += 1) {
    const row = [];
    for (let c = 0; c < cols; c += 1) {
      let v = false;
      if (initial) {
        if (initialIs2d) {
          v = Boolean(initial[r]?.[c]);
        } else {
          const flat = /** @type {boolean[]} */ (initial);
          v = Boolean(flat[r * cols + c]);
        }
      }
      row.push(v);
    }
    state.push(row);
  }

  const grid = document.createElement('div');
  grid.className = 'synth-matrix';
  grid.style.gridTemplateColumns = `repeat(${cols}, auto)`;

  /** @type {HTMLInputElement[][]} */
  const inputs = [];

  /** @type {Set<() => void>} */
  const listeners = new Set();

  function emit() {
    for (const cb of listeners) cb();
  }

  for (let r = 0; r < rows; r += 1) {
    const rowInputs = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = document.createElement('label');
      cell.className = 'synth-matrix__cell';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = state[r][c];

      const face = document.createElement('span');
      face.className = 'synth-matrix__face';

      cell.appendChild(input);
      cell.appendChild(face);

      const rr = r;
      const cc = c;
      input.addEventListener('change', () => {
        state[rr][cc] = input.checked;
        emit();
      });

      grid.appendChild(cell);
      rowInputs.push(input);
    }
    inputs.push(rowInputs);
  }

  if (mount) mount.appendChild(grid);

  function getState() {
    return state.map((row) => row.slice());
  }

  /** @param {boolean[][] | boolean[]} next */
  function setState(next) {
    const nextIs2d = next && next.length > 0 && Array.isArray(next[0]);
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        let v = false;
        if (nextIs2d) {
          v = Boolean(next[r]?.[c]);
        } else {
          const flat = /** @type {boolean[]} */ (next);
          v = Boolean(flat[r * cols + c]);
        }
        state[r][c] = v;
        inputs[r][c].checked = v;
      }
    }
  }

  function onChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function destroy() {
    listeners.clear();
    grid.remove();
  }

  return {
    element: grid,
    getState,
    setState,
    onChange,
    destroy,
  };
}
