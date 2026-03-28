/**
 * Связка формы и renderBayanKeyboard.
 */
import { renderBayanKeyboard } from './bayan-keyboard.mjs';

import { BAYAN_CHROMATIC_4_ROW_COUNT, B_SYSTEM_ROW_COUNT } from '../lib/bayan-b-system.js';

const wrap = document.getElementById('byk-svg-wrap');
const warn = document.getElementById('byk-warning');

const ids = [
  'byk-midi-min',
  'byk-midi-max',
  'byk-cell',
  'byk-radius',
  'byk-rowgap',
  'byk-stagger',
  'byk-brick',
];

function readNum(id) {
  const el = document.getElementById(id);
  const v = Number(el?.value);
  return Number.isFinite(v) ? v : NaN;
}

function redraw() {
  const midiMin = Math.round(readNum('byk-midi-min'));
  const midiMax = Math.round(readNum('byk-midi-max'));
  const cellWidth = readNum('byk-cell');
  const buttonRadius = readNum('byk-radius');
  const rowGap = readNum('byk-rowgap');
  const staggerFraction = readNum('byk-stagger');
  const brickHalfSteps = readNum('byk-brick');
  const rowMode = document.querySelector('input[name="byk-row-mode"]:checked')?.value;
  const rowCount = rowMode === '4' ? BAYAN_CHROMATIC_4_ROW_COUNT : B_SYSTEM_ROW_COUNT;

  warn.hidden = true;
  if (
    [midiMin, midiMax, cellWidth, buttonRadius, rowGap, staggerFraction, brickHalfSteps].some(
      (n) => !Number.isFinite(n),
    )
  ) {
    warn.textContent = 'Проверьте числовые поля.';
    warn.hidden = false;
    return;
  }
  if (midiMin < 0 || midiMax > 127 || midiMin > midiMax) {
    warn.textContent = 'Диапазон MIDI: 0…127, «с» не больше «по».';
    warn.hidden = false;
    return;
  }
  if (staggerFraction < 0 || staggerFraction > 1) {
    warn.textContent = 'Доля диагонали должна быть от 0 до 1.';
    warn.hidden = false;
    return;
  }

  try {
    renderBayanKeyboard(wrap, {
      midiMin,
      midiMax,
      cellWidth,
      buttonRadius,
      rowGap,
      staggerFraction,
      brickHalfSteps,
      rowCount,
    });
  } catch (e) {
    warn.textContent = e instanceof Error ? e.message : String(e);
    warn.hidden = false;
  }
}

for (const id of ids) {
  document.getElementById(id)?.addEventListener('input', redraw);
  document.getElementById(id)?.addEventListener('change', redraw);
}

for (const el of document.querySelectorAll('input[name="byk-row-mode"]')) {
  el.addEventListener('change', redraw);
}

redraw();
