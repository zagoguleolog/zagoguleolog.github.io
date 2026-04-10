/**
 * Физическая клавиатура ПК (`event.code`, US QWERTY): индекс в общем ряду, карты для piano и bayiano.
 * Термины — см. docs/domain.md (октава, класс высоты тона, номер ноты MIDI, ряд (баян)).
 */
import {
  BAYAN_CHROMATIC_4_ROW_COUNT,
  B_SYSTEM_ROW_COUNT,
  chromaticColumnFromMidi,
  rowIndexTopDownFromMidi,
} from '../lib/bayan-b-system.js';
import { CANONICAL_TONIC_BY_PC, midiNoteFromPcOctave } from '../lib/music-theory.js';

/** Четыре ряда клавиш: сверху вниз, слева направо (как на US QWERTY). */
const ROW0 = (() => {
  const a = ['Backquote'];
  for (let d = 1; d <= 9; d++) a.push(`Digit${d}`);
  a.push('Digit0', 'Minus', 'Equal');
  return a;
})();

const ROW1 = [
  ...'QWERTYUIOP'.split('').map((ch) => `Key${ch}`),
  'BracketLeft',
  'BracketRight',
  'Backslash',
];

const ROW2 = [...'ASDFGHJKL'.split('').map((ch) => `Key${ch}`), 'Semicolon', 'Quote'];

const ROW3 = [...'ZXCVBNM'.split('').map((ch) => `Key${ch}`), 'Comma', 'Period', 'Slash'];

/**
 * Четыре ряда ПК сверху вниз — для четырёхрядной хроматической сетки (`rowCount === 4`), та же логика привязки, что у **bayiano** (префикс по `chromaticColumnFromMidi`, избыток кнопок справа).
 * `rowTopDown` = 0…3 ↔ ряды (баян) 4-й…1-й: `Digit4`…`Equal`, `KeyE`…`Backslash`, `KeyS`…`Quote`, `KeyZ`…`Slash`.
 */
const BAYAN_CHROMATIC_4_PC_ROWS_FROM_TOP = [
  ['Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'],
  [
    ...'ERTYUIOP'.split('').map((ch) => `Key${ch}`),
    'BracketLeft',
    'BracketRight',
    'Backslash',
  ],
  [...'SDFGHJKL'.split('').map((ch) => `Key${ch}`), 'Semicolon', 'Quote'],
  [...'ZXCVBNM'.split('').map((ch) => `Key${ch}`), 'Comma', 'Period', 'Slash'],
];

/** Ряд ПК для bayiano: 1-й ряд (баян) ↔ `asdf…`: от `KeyA` до `Quote` (11 кодов), как `ROW2`. */
const BAYAN_PC_ROW_1 = [...'ASDFGHJKL'.split('').map((ch) => `Key${ch}`), 'Semicolon', 'Quote'];

/** Ряд ПК для bayiano: 2-й ряд ↔ от `KeyW` до `Backslash` через `ERTYUIOP` и `[]` (12 кодов). */
const BAYAN_PC_ROW_2 = [
  'KeyW',
  ...'ERTYUIOP'.split('').map((ch) => `Key${ch}`),
  'BracketLeft',
  'BracketRight',
  'Backslash',
];

/** Ряд ПК для bayiano: 3-й ряд ↔ ряд цифр без `Backquote`…`Digit2`: от `Digit3` до `Equal` (10 кодов). */
const BAYAN_PC_ROW_3 = [
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'Minus',
  'Equal',
];

/** Объединённый список кодов для режима linear (добор октав) и устаревшей привязки bayiano без `createBayanCodeMap`. */
export const SEQUENTIAL_ROW_CODES = [...ROW0, ...ROW1, ...ROW2, ...ROW3];

/**
 * Линейный режим: одна октава UI = один физический ряд US QWERTY слева направо; первая клавиша ряда — до (C)
 * первой ноты октавы на экране.
 * Ряд 1: `1234567890-=` (без Backquote).
 */
const LINEAR_ROW_DIGITS = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'Minus',
  'Equal',
];

/** Ряд 2: `qwertyuiop[]` */
const LINEAR_ROW_Q = [
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
  'BracketLeft',
  'BracketRight',
];

/**
 * Ряд 3: `asdfghjkl;'` — в ряду 11 клавиш; двенадцатая нота октавы — `Backslash` (как на типичной US-клавиатуре).
 */
const LINEAR_ROW_A = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
  'Quote',
  'Backslash',
];

/**
 * Ряд 4: `zxcvbnm,./` — 10 клавиш; до дюжины нот октавы: `Backquote`, `Space` (уникальные среди уже занятых).
 */
const LINEAR_ROW_Z = [
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'KeyM',
  'Comma',
  'Period',
  'Slash',
  'Backquote',
  'Space',
];

/** i-я октава в диапазоне (0…3) → ряд ПК для 12 полутонов подряд. */
const LINEAR_OCTAVE_ROWS = [LINEAR_ROW_DIGITS, LINEAR_ROW_Q, LINEAR_ROW_A, LINEAR_ROW_Z];

/**
 * Коды вне основного блока: добор для пятой и далее октав в диапазоне.
 */
const LINEAR_EXTRA_CODES = [
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'Numpad0',
  'NumpadDecimal',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'NumpadEnter',
];

/**
 * Порядок `event.code` для линейной клавиатуры: совпадает с порядком кнопок после `buildLinearKeys`
 * (одна сетка на октаву по `NOTE_NAMES`). Каждая октава в диапазоне привязана к **своему** ряду ПК:
 * 1-я — `1234567890-=`, 2-я — `qwertyuiop[]`, 3-я — `asdfghjkl;'` + `Backslash`, 4-я — `zxcvbnm,./` + `Backquote` + `Space`.
 * Пятая и далее — по 12 кодов из неиспользованных в `SEQUENTIAL_ROW_CODES`, затем `LINEAR_EXTRA_CODES`.
 * @param {number} octaveMin
 * @param {number} octaveMax
 * @returns {string[]}
 */
export function linearComputerCodesForOctaveRange(octaveMin, octaveMax) {
  const nOctaves = octaveMax - octaveMin + 1;
  const used = new Set();
  /** @type {string[]} */
  const out = [];

  function pushUnique(code) {
    out.push(code);
    used.add(code);
  }

  for (let oi = 0; oi < nOctaves; oi++) {
    if (oi < LINEAR_OCTAVE_ROWS.length) {
      for (const c of LINEAR_OCTAVE_ROWS[oi]) {
        pushUnique(c);
      }
    } else {
      const pool = [...SEQUENTIAL_ROW_CODES, ...LINEAR_EXTRA_CODES];
      let added = 0;
      for (const c of pool) {
        if (added >= 12) break;
        if (used.has(c)) continue;
        pushUnique(c);
        added++;
      }
      if (added < 12) {
        throw new Error(
          `linearComputerCodesForOctaveRange: не хватает уникальных event.code для октавы с индексом ${oi} в диапазоне`,
        );
      }
    }
  }

  return out;
}

/**
 * Индекс кнопки линейного режима по `event.code` или −1.
 * @param {string} code
 * @param {readonly string[]} codesOrdered результат `linearComputerCodesForOctaveRange` для текущего диапазона октав
 * @returns {number}
 */
export function linearIndexFromCode(code, codesOrdered) {
  return codesOrdered.indexOf(code);
}

/**
 * Индекс в `SEQUENTIAL_ROW_CODES` или −1. Для bayiano предпочтительна `createBayanCodeMap` + `getBayanCodeMap` в контроллере.
 * @param {string} code
 * @returns {number}
 */
export function linearBayianoIndexFromCode(code) {
  const i = SEQUENTIAL_ROW_CODES.indexOf(code);
  return i;
}

/**
 * Карта `event.code` → { name, octave } для режима bayiano / bayiano4.
 * **B-system (`rowCount` 3):** три ряда ПК снизу вверх соответствуют рядам (баян) 1-й…3-й
 * (индекс ряда сверху вниз в `rowIndexTopDownFromMidi`: 2 → 1-й ряд → `BAYAN_PC_ROW_1` от `KeyA`, 1 → 2-й → `BAYAN_PC_ROW_2` от `KeyW`, 0 → 3-й → `BAYAN_PC_ROW_3` от `Digit3`).
 * **Четырёхрядная сетка (`rowCount` 4):** четыре ряда ПК сверху вниз — `Digit4`…`Equal`, `KeyE`…`Backslash`, `KeyS`…`Quote`, `KeyZ`…`Slash` ↔ ряды (баян) 4-й…1-й.
 * Первая клавиша каждого ряда ПК — к **наименьшей** `chromaticColumnFromMidi` в этом ряду (при **octave-min** = 3 и охвате октавы 3: **C3 / C#3 / D3** в рядах 1-й…3-й либо **C3 / C#3 / D3 / Eb3** в рядах 1-й…4-й); при избытке кнопок — усечение **справа**
 * (крайние правые кнопки ряда без клавиш, игра мышью). В режиме 3 рядов ряд `zxcv…` не используется. Границы MIDI — как у переданного диапазона.
 * @param {number} midiMin
 * @param {number} midiMax
 * @param {{ rowCount?: number, namesByPc?: readonly string[] }} [options]
 * @returns {Map<string, { name: string, octave: number }>}
 */
export function createBayanCodeMap(midiMin, midiMax, options) {
  const rowCount = options?.rowCount ?? B_SYSTEM_ROW_COUNT;
  const namesByPc = options?.namesByPc ?? CANONICAL_TONIC_BY_PC;
  const lo = Math.round(Number(midiMin));
  const hi = Math.round(Number(midiMax));
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo > hi) {
    throw new Error(`createBayanCodeMap: invalid MIDI range ${midiMin}…${midiMax}`);
  }
  /** @type {number[][]} */
  const buckets = Array.from({ length: rowCount }, () => []);
  for (let m = lo; m <= hi; m++) {
    if (m < 0 || m > 127) continue;
    buckets[rowIndexTopDownFromMidi(m, rowCount)].push(m);
  }
  /** Индекс = rowTopDown: для 3 рядов — 0 → 3-й ряд (баян), 1 → 2-й, 2 → 1-й. */
  const pcRows =
    rowCount === BAYAN_CHROMATIC_4_ROW_COUNT
      ? BAYAN_CHROMATIC_4_PC_ROWS_FROM_TOP
      : [BAYAN_PC_ROW_3, BAYAN_PC_ROW_2, BAYAN_PC_ROW_1];
  /** @type {Map<string, { name: string, octave: number }>} */
  const map = new Map();

  for (let rowTopDown = 0; rowTopDown < rowCount; rowTopDown++) {
    const midis = buckets[rowTopDown].sort((a, b) => {
      const d = chromaticColumnFromMidi(a, rowCount) - chromaticColumnFromMidi(b, rowCount);
      return d !== 0 ? d : a - b;
    });
    const codes = pcRows[rowTopDown];
    const n = Math.min(midis.length, codes.length);
    for (let i = 0; i < n; i++) {
      const m = midis[i];
      const { name, octave } = noteNameOctaveFromMidi(m, namesByPc);
      map.set(codes[i], { name, octave });
    }
  }

  return map;
}

/**
 * @param {number} midi
 * @param {readonly string[]} [namesByPc] длина 12, индекс = PC
 * @returns {{ name: string, octave: number }}
 */
function noteNameOctaveFromMidi(midi, namesByPc = CANONICAL_TONIC_BY_PC) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: namesByPc[pc], octave };
}

/**
 * Карта `event.code` → { name, octave } для режима piano; клавиши вне диапазона MIDI по октавам не попадают в карту.
 * Раскладка: четыре ряда сверху вниз — чёрные (ряд цифр), белые (Q…\\), чёрные (ASDF…'), белые (Z…/).
 * Опорная октава белых с `KeyQ` — `octaveMin` (`base`); чёрные ряды — диезы и «немые» позиции между ми–фа и си–до в охвате белых.
 * @param {number} octaveMin
 * @param {number} octaveMax
 * @param {{ namesByPc?: readonly string[] }} [options] подписи по PC (длина 12); по умолчанию канонические имена каталога
 * @returns {Map<string, { name: string, octave: number }>}
 */
export function createPianoCodeMap(octaveMin, octaveMax, options = {}) {
  const namesByPc = options.namesByPc ?? CANONICAL_TONIC_BY_PC;
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  /** @type {Map<string, { name: string, octave: number }>} */
  const map = new Map();

  function add(code, midi) {
    if (midi < midiMin || midi > midiMax) return;
    const { name, octave } = noteNameOctaveFromMidi(midi, namesByPc);
    map.set(code, { name, octave });
  }

  const base = octaveMin;

  // Ряд цифр: C# D# (октава base−1), затем C# D# (base), пропуск EF, F# G# A# (base), пропуск BC, C# D# (base+1), пропуск EF, F# (base+1).
  add('Backquote', midiNoteFromPcOctave(1, base - 1));
  add('Digit1', midiNoteFromPcOctave(3, base - 1));
  add('Digit2', midiNoteFromPcOctave(1, base));
  add('Digit3', midiNoteFromPcOctave(3, base));
  add('Digit5', midiNoteFromPcOctave(6, base));
  add('Digit6', midiNoteFromPcOctave(8, base));
  add('Digit7', midiNoteFromPcOctave(10, base));
  add('Digit9', midiNoteFromPcOctave(1, base + 1));
  add('Digit0', midiNoteFromPcOctave(3, base + 1));
  add('Equal', midiNoteFromPcOctave(6, base + 1));

  // Белые ROW1: C D E F G A B C D E F G A (13 натуральных ступеней подряд).
  const qNaturalOctaves = [
    base,
    base,
    base,
    base,
    base,
    base,
    base,
    base + 1,
    base + 1,
    base + 1,
    base + 1,
    base + 1,
    base + 1,
  ];
  const qPcs = [0, 2, 4, 5, 7, 9, 11, 0, 2, 4, 5, 7, 9];
  for (let i = 0; i < ROW1.length; i++) {
    add(ROW1[i], midiNoteFromPcOctave(qPcs[i], qNaturalOctaves[i]));
  }

  // Ряд ASDF…': чёрные над стыком Q/Z и между белыми Z…/ (пропуски BC, EF).
  add('KeyA', midiNoteFromPcOctave(10, base + 1));
  add('KeyD', midiNoteFromPcOctave(1, base + 2));
  add('KeyF', midiNoteFromPcOctave(3, base + 2));
  add('KeyH', midiNoteFromPcOctave(6, base + 2));
  add('KeyJ', midiNoteFromPcOctave(8, base + 2));
  add('KeyK', midiNoteFromPcOctave(10, base + 2));
  add('Semicolon', midiNoteFromPcOctave(1, base + 3));
  add('Quote', midiNoteFromPcOctave(3, base + 3));

  // Белые ROW3: продолжение натурального ряда после Key\\.
  const zNaturalOctaves = [
    base + 1,
    base + 2,
    base + 2,
    base + 2,
    base + 2,
    base + 2,
    base + 2,
    base + 2,
    base + 3,
    base + 3,
  ];
  const zPcs = [11, 0, 2, 4, 5, 7, 9, 11, 0, 2];
  for (let i = 0; i < ROW3.length; i++) {
    add(ROW3[i], midiNoteFromPcOctave(zPcs[i], zNaturalOctaves[i]));
  }

  return map;
}
