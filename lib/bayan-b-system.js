/**
 * @file bayan-b-system.js
 *
 * Геометрия раскладки B-system для хроматической кнопочной клавиатуры (баян).
 * Теория и формулы для трёх рядов: docs/bayan-b-system.md.
 * Четырёхрядная хроматическая сетка (мод 4) — отдельный режим в том же файле; см. docs/bayan-b-system.md.
 */

/** Число рядов в B-system. */
export const B_SYSTEM_ROW_COUNT = 3;

/**
 * Число рядов в четырёхрядной хроматической сетке (не синоним B-system: вдоль ряда шаг **б3**, не **м3**).
 * @see docs/bayan-b-system.md — подраздел «Четырёхрядная хроматическая сетка (мод 4)»
 */
export const BAYAN_CHROMATIC_4_ROW_COUNT = 4;

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
 * @param {number} rowCount
 */
function assertRowCount(rowCount) {
  const n = Number(rowCount);
  if (!Number.isInteger(n) || n < 2 || n > 12) {
    throw new Error(`rowCount must be integer 2…12, got ${rowCount}`);
  }
}

/**
 * Индекс ряда сверху вниз на горизонтальной схеме: для B-system (rowCount=3) — 0 = 3-й ряд, 1 = 2-й, 2 = 1-й.
 * Для четырёхрядной сетки (rowCount=4) — 0 = 4-й ряд … 3 = 1-й ряд.
 * @param {number} midiNote
 * @param {number} [rowCount=3]
 * @returns {number}
 */
export function rowIndexTopDownFromMidi(midiNote, rowCount = B_SYSTEM_ROW_COUNT) {
  assertRowCount(rowCount);
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  if (m < 0 || m > 127) throw new Error(`midiNote out of 0…127: ${midiNote}`);
  const r = rowCount - 1 - (m % rowCount);
  return r;
}

/**
 * Хроматическая колонка для горизонтального размещения (лесенка B-system или сетки мод N).
 * @param {number} midiNote
 * @param {number} [rowCount=3]
 * @returns {number}
 */
export function chromaticColumnFromMidi(midiNote, rowCount = B_SYSTEM_ROW_COUNT) {
  assertRowCount(rowCount);
  const m = Number(midiNote);
  if (!Number.isInteger(m)) throw new Error(`midiNote must be integer, got ${midiNote}`);
  return Math.floor(m / rowCount);
}

/**
 * Абсцисса в условных единицах до нормализации по минимуму.
 * @param {number} midiNote
 * @param {number} [staggerFraction] доля сдвига (0…1), по умолчанию 1/3 для B-system
 * @param {number} [rowCount=3]
 * @returns {number}
 */
export function layoutXUnitsFromMidi(midiNote, staggerFraction = 1 / 3, rowCount = B_SYSTEM_ROW_COUNT) {
  assertRowCount(rowCount);
  const s = Number(staggerFraction);
  if (!(s >= 0 && s <= 1)) throw new Error(`staggerFraction must be in [0,1], got ${staggerFraction}`);
  return chromaticColumnFromMidi(midiNote, rowCount) + (midiNote % rowCount) * s;
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
 * Одна кнопка поля баяна (B-system или четырёхрядная хроматическая сетка).
 * @typedef {{ midi: number, rowTopDown: number, xUnits: number, xUnits0: number, label: string, whiteKeyStyle: boolean, pc: number, octave: number }} BayanButtonModel
 */

/**
 * Список кнопок в диапазоне MIDI с нормализованной абсциссой xUnits0 (минимум = 0).
 * @param {{ midiMin: number, midiMax: number, staggerFraction?: number, rowCount?: number }} range
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
  const rowCount = range.rowCount ?? B_SYSTEM_ROW_COUNT;
  assertRowCount(rowCount);
  const stagger = range.staggerFraction ?? 1 / 3;
  /** @type {BayanButtonModel[]} */
  const raw = [];
  for (let m = midiMin; m <= midiMax; m++) {
    const pc = ((m % 12) + 12) % 12;
    raw.push({
      midi: m,
      rowTopDown: rowIndexTopDownFromMidi(m, rowCount),
      xUnits: layoutXUnitsFromMidi(m, stagger, rowCount),
      label: bayanButtonLabelFromMidi(m),
      whiteKeyStyle: isBayanWhiteButtonPc(pc),
      pc,
      octave: scientificOctaveFromMidi(m),
    });
  }
  const xMin = raw.length ? Math.min(...raw.map((b) => b.xUnits)) : 0;
  return raw.map((b) => ({ ...b, xUnits0: b.xUnits - xMin }));
}
