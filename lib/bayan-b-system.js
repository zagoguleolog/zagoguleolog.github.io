/**
 * @file bayan-b-system.js
 *
 * Геометрия раскладки B-system для хроматической кнопочной клавиатуры (баян).
 * Теория и формулы: docs/bayan-b-system.md.
 */

/** Число рядов в B-system. */
export const B_SYSTEM_ROW_COUNT = 3;

/** Имена для подписи кнопок (диезы на «чёрных» PC). Индекс = PC. */
export const BAYAN_DISPLAY_NAME_BY_PC = Object.freeze([
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
]);

/** PC «белых» кнопок в смысле окраски UI (C, D, E, F, G, A, B). */
const WHITE_PC_SET = new Set([0, 2, 4, 5, 7, 9, 11]);

/**
 * @param {number} pc 0…11
 * @returns {number}
 */
function normalizePc(pc) {
  const x = Number(pc);
  if (!Number.isInteger(x)) throw new Error(`pc must be integer, got ${pc}`);
  return ((x % 12) + 12) % 12;
}

/**
 * Индекс ряда сверху вниз на горизонтальной схеме: 0 = 3-й ряд, 1 = 2-й, 2 = 1-й.
 * @param {number} midiNote
 * @returns {0|1|2}
 */
export function rowIndexTopDownFromMidi(midiNote) {
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  if (m < 0 || m > 127) throw new Error(`midiNote out of 0…127: ${midiNote}`);
  const r = 2 - (m % 3);
  return /** @type {0|1|2} */ (r);
}

/**
 * Хроматическая колонка для горизонтального размещения (лесенка B-system).
 * @param {number} midiNote
 * @returns {number}
 */
export function chromaticColumnFromMidi(midiNote) {
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  return Math.floor(m / 3);
}

/**
 * Абсцисса в условных единицах до нормализации по минимуму.
 * @param {number} midiNote
 * @param {number} [staggerFraction] доля сдвига (0…1), по умолчанию 1/3
 * @returns {number}
 */
export function layoutXUnitsFromMidi(midiNote, staggerFraction = 1 / 3) {
  const s = Number(staggerFraction);
  if (!(s >= 0 && s <= 1)) throw new Error(`staggerFraction must be in [0,1], got ${staggerFraction}`);
  return chromaticColumnFromMidi(midiNote) + (midiNote % 3) * s;
}

/**
 * Научная октава из номера ноты MIDI (C4 → 4).
 * @param {number} midiNote
 * @returns {number}
 */
export function scientificOctaveFromMidi(midiNote) {
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  return Math.floor(m / 12) - 1;
}

/**
 * @param {number} pc 0…11
 * @returns {boolean}
 */
export function isBayanWhiteButtonPc(pc) {
  return WHITE_PC_SET.has(normalizePc(pc));
}

/**
 * Подпись вида C#4 для кнопки.
 * @param {number} midiNote
 * @returns {string}
 */
export function bayanButtonLabelFromMidi(midiNote) {
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  const pc = ((m % 12) + 12) % 12;
  const name = BAYAN_DISPLAY_NAME_BY_PC[pc];
  const oct = scientificOctaveFromMidi(m);
  return `${name}${oct}`;
}

/**
 * Одна кнопка поля B-system.
 * @typedef {{ midi: number, rowTopDown: 0|1|2, xUnits: number, xUnits0: number, label: string, whiteKeyStyle: boolean, pc: number, octave: number }} BayanButtonModel
 */

/**
 * Список кнопок в диапазоне MIDI с нормализованной абсциссой xUnits0 (минимум = 0).
 * @param {{ midiMin: number, midiMax: number, staggerFraction?: number }} range
 * @returns {BayanButtonModel[]}
 */
export function buildBayanButtonModels(range) {
  const midiMin = Number(range.midiMin);
  const midiMax = Number(range.midiMax);
  if (!Number.isInteger(midiMin) || !Number.isInteger(midiMax)) {
    throw new Error(`midiMin/midiMax must be integers`);
  }
  if (midiMin < 0 || midiMax > 127 || midiMin > midiMax) {
    throw new Error(`invalid MIDI range: ${midiMin}…${midiMax}`);
  }
  const stagger = range.staggerFraction ?? 1 / 3;
  /** @type {BayanButtonModel[]} */
  const raw = [];
  for (let m = midiMin; m <= midiMax; m++) {
    const pc = ((m % 12) + 12) % 12;
    raw.push({
      midi: m,
      rowTopDown: rowIndexTopDownFromMidi(m),
      xUnits: layoutXUnitsFromMidi(m, stagger),
      label: bayanButtonLabelFromMidi(m),
      whiteKeyStyle: isBayanWhiteButtonPc(pc),
      pc,
      octave: scientificOctaveFromMidi(m),
    });
  }
  const xMin = raw.length ? Math.min(...raw.map((b) => b.xUnits)) : 0;
  return raw.map((b) => ({ ...b, xUnits0: b.xUnits - xMin }));
}
