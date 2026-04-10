/**
 * @file music-theory.js
 * @module music-theory
 *
 * Программное отражение [docs/music-theory.md](../docs/music-theory.md): сиды-паттерны,
 * производные структуры и граф связей (запрос в любом направлении через рёбра и индексы).
 *
 * ## Сущности и взаимозависимости
 *
 * 1. **PitchClass (PC)** — число 0…11 (C=0). Связан с: именем тоники по соглашению,
 *    интервалами до других PC, вхождением в ступени гамм.
 * 2. **IntervalDef** — запись каталога интервалов (id, полутоны, русское имя, ruShort). Связь:
 *    semitone → определение; определение ↔ все пары (fromPc,toPc) с этим шагом.
 * 3. **ScalePattern** — именованный лад: строка **T/t** (опционально), **semitoneSteps**
 *    (генерируются из T/t или задаются явно), **letterOffsetsFromTonicLetter** — слоты букв
 *    относительно буквы тоники (не хардкод таблиц гамм).
 * 4. **ScaleInstance** — паттерн + тоника → ступени: PC, имя ноты, интервал от тоники,
 *    шаг к следующей ступени.
 * 5. **NoteSpelling** — буква A–G + альтерация → строка вида `Eb`, `F#`; связь с PC.
 * 6. **Частоты (равномерная темпация)** — опорная частота A4 (по умолчанию 440 Гц), опционально
 *    432 Гц или другая; связь PC + научной октавы с номером ноты MIDI и формула f(m).
 * 7. **MusicTheoryGraph** — объединение узлов (`pitchClass`, `interval`, `scalePattern`,
 *    `scale`) и рёбер (`intervalDirected`, `scaleDegree`, `scaleStep`, `tonicOf`,
 *    `patternDefinesStep`). Обход: `edgesFrom`, `edgesTo`, `edgesByKind`.
 *
 * Импорт как библиотеки:
 *   import { buildScale, getMusicTheoryGraph, renderTheoryTables } from './music-theory.js';
 */

/** Буквы в порядке по кругу квинт/четвертей для диатоники (индекс 0 = C). */
export const LETTER_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** Натуральный PC для буквы без знаков. */
export const NATURAL_LETTER_PC = Object.freeze({
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
});

/** Опорная частота A4 по умолчанию (Гц); см. docs/music-theory.md. */
export const DEFAULT_A4_HZ = 440;

/**
 * Номер ноты MIDI для A4 при соглашении C4 = 60; см. docs/music-theory.md.
 */
export const A4_MIDI_NOTE = 69;

/**
 * Соглашение документа: одно каноническое имя тоники на каждый PC (энгармоника выбрана
 * как в docs/music-theory.md).
 */
export const CANONICAL_TONIC_BY_PC = Object.freeze([
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]);

/**
 * Хроматический ряд по индексу PC (0=C) в **диезной** записи; для подписи клавиатуры в однородной диезной системе.
 */
export const CHROMATIC_NAMES_SHARP_BY_PC = Object.freeze([
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

/**
 * Хроматический ряд по индексу PC (0=C) в **бемольной** записи; для подписи клавиатуры в однородной бемольной системе.
 */
export const CHROMATIC_NAMES_FLAT_BY_PC = Object.freeze([
  'C',
  'Db',
  'D',
  'Eb',
  'E',
  'F',
  'Gb',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
]);

/**
 * @param {'sharp' | 'flat'} system
 * @returns {readonly string[]}
 */
export function chromaticNamesByAccidentalSystem(system) {
  return system === 'flat' ? CHROMATIC_NAMES_FLAT_BY_PC : CHROMATIC_NAMES_SHARP_BY_PC;
}

/**
 * Система знаков для хроматической подписи клавиатуры по ступеням уже построенной гаммы:
 * есть ступень с **бемольной** альтерацией → **бемольная**, иначе **диезная** (в т.ч. без знаков).
 * Смешение диезов и бемолей в одной гамме не ожидается; при аномалии — **диезная** и предупреждение в консоль.
 * @param {ReturnType<typeof buildScale>} scaleInstance
 * @returns {'sharp' | 'flat'}
 */
export function accidentalSystemFromScale(scaleInstance) {
  let hasSharp = false;
  let hasFlat = false;
  for (const d of scaleInstance.degrees) {
    if (d.alteration > 0) hasSharp = true;
    if (d.alteration < 0) hasFlat = true;
  }
  if (hasSharp && hasFlat) {
    console.warn(
      'accidentalSystemFromScale: в ступенях гаммы смешаны диезы и бемоли — подпись клавиатуры: диезная',
    );
    return 'sharp';
  }
  return hasFlat ? 'flat' : 'sharp';
}

/**
 * Строка подписей внешнего кольца кварто-квинтового круга по умолчанию (порядок по квинтам от C).
 * См. docs/music-theory.md — раздел «Кварто-квинтовый круг: тройка IV–I–V», подраздел «Подписи секторов…».
 */
export const CIRCLE_OF_FIFTHS_OUTER_LINE =
  'C G D A E B F# Db Ab Eb Bb F';

/**
 * Строка подписей внутреннего кольца по умолчанию (относительные миноры к внешним).
 * См. тот же раздел в docs/music-theory.md.
 */
export const CIRCLE_OF_FIFTHS_INNER_LINE =
  'Am Em Bm F#m C#m G#m D#m Bbm Fm Cm Gm Dm';

/** Сиды интервалов: [id, semitones, nameRu, ruShort] — порядок и ruShort как в music-theory.md. */
export const INTERVAL_CATALOG_SEED = Object.freeze([
  ['P1', 0, 'унисон / прима', '0'],
  ['m2', 1, 'малая секунда', 'м2'],
  ['M2', 2, 'большая секунда', 'б2'],
  ['m3', 3, 'малая терция', 'м3'],
  ['M3', 4, 'большая терция', 'б3'],
  ['P4', 5, 'чистая кварта', 'ч4'],
  ['d5', 6, 'уменьшённая квинта / тритон', 'у5'],
  ['P5', 7, 'чистая квинта', 'ч5'],
  ['m6', 8, 'малая секста', 'м6'],
  ['M6', 9, 'большая секста', 'б6'],
  ['m7', 10, 'малая септима', 'м7'],
  ['M7', 11, 'большая септима', 'б7'],
  ['P8', 12, 'чистая октава', '8'],
]);

/**
 * Сиды септаккордов: типы аккордов 1–3–5–7 как три терции подряд.
 * intervalsFromRootIds — интервалы от основания к 3, 5 и 7 ступеням по каталогу INTERVAL_CATALOG_SEED.
 * thirdQuality / seventhQuality — качество терций на 3 и 7 ступенях: 'M' (большая), 'm' (малая) или null
 * для особых случаев (уменьшённая септима трактуется отдельно в описании).
 */
export const SEVENTH_CHORD_SEED = Object.freeze([
  Object.freeze({
    id: 'maj7',
    nameRu: 'Большой мажорный септаккорд',
    ruShort: 'БМ',
    intervalsFromRootIds: Object.freeze(['M3', 'P5', 'M7']),
    thirdQuality: 'M',
    seventhQuality: 'M',
    symbol: '△7',
  }),
  Object.freeze({
    id: 'm7',
    nameRu: 'Малый минорный септаккорд',
    ruShort: 'ММин',
    intervalsFromRootIds: Object.freeze(['m3', 'P5', 'm7']),
    thirdQuality: 'm',
    seventhQuality: 'm',
    symbol: null,
  }),
  Object.freeze({
    id: '7',
    nameRu: 'Малый мажорный (доминантовый) септаккорд',
    ruShort: 'MM',
    intervalsFromRootIds: Object.freeze(['M3', 'P5', 'm7']),
    thirdQuality: 'M',
    seventhQuality: 'm',
    symbol: null,
  }),
  Object.freeze({
    id: 'mMaj7',
    nameRu: 'Большой минорный септаккорд',
    ruShort: 'БМ (min‑maj7)',
    intervalsFromRootIds: Object.freeze(['m3', 'P5', 'M7']),
    thirdQuality: 'm',
    seventhQuality: 'M',
    symbol: null,
  }),
  Object.freeze({
    id: 'm7b5',
    nameRu: 'Полууменьшенный септаккорд',
    ruShort: 'полуум.',
    intervalsFromRootIds: Object.freeze(['m3', 'd5', 'm7']),
    thirdQuality: 'm',
    seventhQuality: 'm',
    symbol: 'ø7',
  }),
  Object.freeze({
    id: 'dim7',
    nameRu: 'Уменьшенный септаккорд',
    ruShort: 'ум.',
    intervalsFromRootIds: Object.freeze(['m3', 'd5', 'M6']),
    thirdQuality: 'm',
    /** традиционно трактуется как уменьшённая септима; здесь помечаем как особый случай */
    seventhQuality: null,
    symbol: '°7',
  }),
]);

/**
 * Сиды гамм из music-theory.md. Полутоновые шаги либо явны, либо выводятся из `tt`.
 * letterOffsetsFromTonicLetter — смещения индекса буквы от буквы тоники по LETTER_ORDER (mod 7).
 */
export const SCALE_PATTERN_SEEDS = Object.freeze([
  Object.freeze({
    id: 'major',
    nameRu: 'мажор (ionian)',
    tt: 'TTtTTTt',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'ionian',
    nameRu: 'ионийский (натуральный мажор)',
    tt: 'TTtTTTt',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'minorPentatonic',
    nameRu: 'минорная пентатоника',
    tt: null,
    semitoneSteps: Object.freeze([3, 2, 2, 3, 2]),
    letterOffsetsFromTonicLetter: Object.freeze([0, 2, 3, 4, 6]),
  }),
  Object.freeze({
    id: 'naturalMinor',
    nameRu: 'натуральный минор (aeolian)',
    tt: 'TtTTtTT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'dorian',
    nameRu: 'дорийский минор',
    tt: 'TtTTTtT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'phrygian',
    nameRu: 'фригийский минор',
    tt: 'tTTTtTT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'lydian',
    nameRu: 'лидийский мажор',
    tt: 'TTTtTTt',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'mixolydian',
    nameRu: 'миксолидийский мажор',
    tt: 'TTtTTtT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'aeolian',
    nameRu: 'натуральный минор (aeolian)',
    tt: 'TtTTtTT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'locrian',
    nameRu: 'локрийский минор',
    tt: 'tTTtTTT',
    semitoneSteps: null,
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  }),
  Object.freeze({
    id: 'majorPentatonic',
    nameRu: 'мажорная пентатоника',
    tt: null,
    semitoneSteps: Object.freeze([2, 2, 3, 2, 3]),
    letterOffsetsFromTonicLetter: Object.freeze([0, 1, 2, 4, 5]),
  }),
]);

const TT_MAP = Object.freeze({ T: 2, t: 1 });

/**
 * Перевод строки T/t в массив полутонов (как в music-theory.md).
 * @param {string} tt
 * @returns {number[]}
 */
export function ttToSteps(tt) {
  return [...tt].map((ch) => {
    const v = TT_MAP[ch];
    if (v === undefined) throw new Error(`Unknown T/t symbol: ${ch}`);
    return v;
  });
}

/**
 * @param {number[]} steps
 * @returns {number}
 */
export function sumSteps(steps) {
  return steps.reduce((a, b) => a + b, 0);
}

/**
 * Нормализованные паттерны: всегда есть semitoneSteps, проверка суммы 12.
 * @returns {ReadonlyArray<{ id: string, nameRu: string, tt: string|null, semitoneSteps: number[], letterOffsetsFromTonicLetter: number[] }>}
 */
export function resolveScalePatterns() {
  return SCALE_PATTERN_SEEDS.map((raw) => {
    const steps =
      raw.semitoneSteps != null ? [...raw.semitoneSteps] : ttToSteps(/** @type {string} */ (raw.tt));
    if (sumSteps(steps) !== 12) {
      throw new Error(`Pattern ${raw.id}: sum(semitoneSteps) must be 12, got ${sumSteps(steps)}`);
    }
    if (steps.length !== raw.letterOffsetsFromTonicLetter.length) {
      throw new Error(`Pattern ${raw.id}: steps and letterOffsets length mismatch`);
    }
    return Object.freeze({
      id: raw.id,
      nameRu: raw.nameRu,
      tt: raw.tt ?? null,
      semitoneSteps: Object.freeze(steps),
      letterOffsetsFromTonicLetter: raw.letterOffsetsFromTonicLetter,
    });
  });
}

/** @type {ReadonlyArray<ReturnType<typeof resolveScalePatterns>[number]>} */
let _cachedPatterns = null;

export function getScalePatterns() {
  if (!_cachedPatterns) _cachedPatterns = resolveScalePatterns();
  return _cachedPatterns;
}

/**
 * @returns {ReadonlyArray<{ id: string, semitones: number, nameRu: string, ruShort: string }>}
 */
export function getIntervalCatalog() {
  return Object.freeze(
    INTERVAL_CATALOG_SEED.map(([id, semitones, nameRu, ruShort]) =>
      Object.freeze({ id, semitones, nameRu, ruShort }),
    ),
  );
}

/**
 * Каталог септаккордов, развёрнутый из SEVENTH_CHORD_SEED через каталог интервалов.
 * Для каждого типа считаем интервалы и полутоновые расстояния от основания.
 * @returns {ReadonlyArray<{
 *   id: string,
 *   nameRu: string,
 *   ruShort: string,
 *   symbol: string | null,
 *   intervalsFromRootIds: ReadonlyArray<string>,
 *   thirdQuality: 'M' | 'm' | null,
 *   seventhQuality: 'M' | 'm' | null,
 *   intervals: ReadonlyArray<{ id: string, semitones: number, nameRu: string, ruShort: string }>,
 *   semitonesFromRoot: ReadonlyArray<number>
 * }>}
 */
export function getSeventhChordCatalog() {
  const intervalCatalog = getIntervalCatalog();
  const byId = new Map(intervalCatalog.map((iv) => [iv.id, iv]));
  return Object.freeze(
    SEVENTH_CHORD_SEED.map((seed) => {
      const intervals = seed.intervalsFromRootIds.map((id) => {
        const def = byId.get(id);
        if (!def) {
          throw new Error(`Unknown interval id in SEVENTH_CHORD_SEED for ${seed.id}: ${id}`);
        }
        return def;
      });
      const semitonesFromRoot = intervals.map((iv) => iv.semitones);
      return Object.freeze({
        id: seed.id,
        nameRu: seed.nameRu,
        ruShort: seed.ruShort,
        symbol: seed.symbol ?? null,
        intervalsFromRootIds: seed.intervalsFromRootIds,
        thirdQuality: seed.thirdQuality,
        seventhQuality: seed.seventhQuality,
        intervals: Object.freeze(intervals.slice()),
        semitonesFromRoot: Object.freeze(semitonesFromRoot),
      });
    }),
  );
}

/**
 * Первое определение интервала с данным классом в пределах октавы (0…11; P8 = 12 отдельно в каталоге).
 * @param {number} semitonesModOctave 0…11
 */
export function intervalDefForSemitoneClass(semitonesModOctave) {
  const s = ((semitonesModOctave % 12) + 12) % 12;
  return getIntervalCatalog().find((iv) => iv.semitones === s) ?? null;
}

/**
 * @param {number} pc
 * @returns {number}
 */
export function normalizePc(pc) {
  return ((pc % 12) + 12) % 12;
}

/**
 * Алгоритм из music-theory.md: pcs[0] = tonic, далее прибавление шагов по mod 12.
 * @param {number} tonicPc
 * @param {number[]} semitoneSteps
 * @returns {number[]} длина semitoneSteps + 1, последний элемент снова tonic (на октаву выше по классу совпадает с первым)
 */
export function buildPitchClassesFromSteps(tonicPc, semitoneSteps) {
  const out = [normalizePc(tonicPc)];
  let cur = out[0];
  for (const st of semitoneSteps) {
    cur = normalizePc(cur + st);
    out.push(cur);
  }
  return out;
}

/**
 * @param {string} letter
 * @returns {number}
 */
export function letterIndex(letter) {
  const u = letter.toUpperCase();
  const i = LETTER_ORDER.indexOf(u);
  if (i < 0) throw new Error(`Invalid letter: ${letter}`);
  return i;
}

/**
 * @param {string} noteName например C#, Bb, Eb
 * @returns {{ letter: string, alteration: number, pc: number, letterIdx: number }}
 */
export function parseNoteName(noteName) {
  const m = String(noteName).trim().match(/^([A-Ga-g])([#b]*)$/);
  if (!m) throw new Error(`Invalid note name: ${noteName}`);
  const letter = m[1].toUpperCase();
  const suf = m[2];
  let alteration = 0;
  for (const ch of suf) {
    if (ch === '#') alteration += 1;
    else if (ch === 'b') alteration -= 1;
  }
  const base = NATURAL_LETTER_PC[/** @type {keyof typeof NATURAL_LETTER_PC} */ (letter)];
  const pc = normalizePc(base + alteration);
  return { letter, alteration, pc, letterIdx: letterIndex(letter) };
}

/**
 * Номер ноты MIDI из класса высоты тона и научной октавы (C4 = 60, A4 = 69); см. music-theory.md.
 * @param {number} pc 0…11
 * @param {number} octave цифра октавы в научной записи (например C4 → 4)
 * @returns {number}
 */
export function midiNoteFromPcOctave(pc, octave) {
  const p = normalizePc(pc);
  const o = Number(octave);
  if (!Number.isInteger(o)) {
    throw new Error(`octave must be an integer, got ${octave}`);
  }
  return (o + 1) * 12 + p;
}

/**
 * Частота в Гц в равномерной темпации; см. music-theory.md.
 * @param {number} midiNote
 * @param {{ referenceHz?: number, referenceMidi?: number }} [opts] по умолчанию опора A4 = 440 Гц, MIDI 69
 * @returns {number}
 */
export function frequencyFromMidi(midiNote, opts = {}) {
  const m = Number(midiNote);
  if (!Number.isFinite(m)) throw new Error(`Invalid midi: ${midiNote}`);
  const refMidi = opts.referenceMidi ?? A4_MIDI_NOTE;
  const refHz = opts.referenceHz ?? DEFAULT_A4_HZ;
  if (typeof refHz !== 'number' || !(refHz > 0) || !Number.isFinite(refHz)) {
    throw new Error(`referenceHz must be a finite number > 0, got ${refHz}`);
  }
  if (!Number.isInteger(refMidi)) {
    throw new Error(`referenceMidi must be an integer, got ${refMidi}`);
  }
  return refHz * 2 ** ((m - refMidi) / 12);
}

/**
 * @param {string} noteName например C#, Bb
 * @param {number} octave научная октава
 * @param {{ referenceHz?: number, referenceMidi?: number }} [opts]
 * @returns {number}
 */
export function frequencyFromNoteNameOctave(noteName, octave, opts) {
  const { pc } = parseNoteName(noteName);
  return frequencyFromMidi(midiNoteFromPcOctave(pc, octave), opts);
}

/**
 * @param {string} letter A-G
 * @param {number} alteration положительный — диезы, отрицательный — бемоли
 */
export function formatNoteName(letter, alteration) {
  const acc =
    alteration === 0
      ? ''
      : alteration > 0
        ? '#'.repeat(alteration)
        : 'b'.repeat(-alteration);
  return `${letter.toUpperCase()}${acc}`;
}

/**
 * Подбор альтерации для буквы, чтобы получить targetPc (предпочтение диапазона около 0).
 * @param {string} letter
 * @param {number} targetPc
 */
export function alterationForLetterToPc(letter, targetPc) {
  const base = NATURAL_LETTER_PC[/** @type {keyof typeof NATURAL_LETTER_PC} */ (letter.toUpperCase())];
  let diff = normalizePc(targetPc) - base;
  if (diff > 6) diff -= 12;
  if (diff < -6) diff += 12;
  return diff;
}

/**
 * @param {string} tonicName
 * @param {{ semitoneSteps: number[], letterOffsetsFromTonicLetter: number[] }} pattern
 * @returns {{ tonic: ReturnType<typeof parseNoteName>, degrees: Array<{ index: number, pc: number, name: string, letter: string, alteration: number, intervalFromTonic: number, intervalFromTonicId: string|null, stepToNext: number|null, stepToNextDef: ReturnType<typeof intervalDefForSemitoneClass> }> }}
 */
export function spellScaleFromPattern(tonicName, pattern) {
  const tonic = parseNoteName(tonicName);
  const pcsFull = buildPitchClassesFromSteps(tonic.pc, pattern.semitoneSteps);
  const pcs = pcsFull.slice(0, -1);
  const degrees = pcs.map((pc, index) => {
    const off = pattern.letterOffsetsFromTonicLetter[index];
    const li = normalizeLetterIndex(tonic.letterIdx + off);
    const L = LETTER_ORDER[li];
    const alt = alterationForLetterToPc(L, pc);
    const name = formatNoteName(L, alt);
    const intervalFromTonic = normalizePc(pc - tonic.pc);
    const intervalFromTonicId = intervalDefForSemitoneClass(intervalFromTonic)?.id ?? null;
    const stepToNext =
      index < pattern.semitoneSteps.length ? pattern.semitoneSteps[index] : null;
    const stepToNextDef =
      stepToNext != null ? intervalDefForSemitoneClass(stepToNext) : null;
    return {
      index,
      pc,
      name,
      letter: L,
      alteration: alt,
      intervalFromTonic,
      intervalFromTonicId,
      stepToNext,
      stepToNextDef,
    };
  });
  return { tonic, degrees };
}

/**
 * @param {number} idx
 */
function normalizeLetterIndex(idx) {
  return ((idx % 7) + 7) % 7;
}

/**
 * @param {string} patternId
 * @param {string} tonicName
 */
export function buildScale(patternId, tonicName) {
  const pattern = getScalePatterns().find((p) => p.id === patternId);
  if (!pattern) throw new Error(`Unknown pattern: ${patternId}`);
  const { tonic, degrees } = spellScaleFromPattern(tonicName, pattern);
  return Object.freeze({
    patternId: pattern.id,
    patternNameRu: pattern.nameRu,
    tt: pattern.tt,
    semitoneSteps: pattern.semitoneSteps,
    tonicName: tonicName,
    tonicPc: tonic.pc,
    degrees: Object.freeze(degrees.map(Object.freeze)),
  });
}

/**
 * Линейный ряд ступеней лада в пределах **той же MIDI-полосы, что и клавиатура** `lads`/`lads2`:
 * от **C** научной октавы `octaveMin` до **B** научной октавы `octaveMax` (как порядок клавиш пиано/линейки).
 * Ступени лада, попадающие в эту полосу, идут **по возрастанию MIDI**; подпись `name`/`octave`/`key` — из спеллинга лада
 * (энгармоника и октава по фактическому MIDI, без скачков вниз).
 *
 * @param {ReturnType<typeof buildScale>} scaleInstance
 * @param {number} octaveMin нижняя научная октава (нижняя граница — C этой октавы)
 * @param {number} octaveMax верхняя научная октава (верхняя граница — B этой октавы)
 * @returns {Array<{ pc: number, name: string, octave: number, key: string }>}
 */
export function buildScaleDegreeRowsByMidiOrder(scaleInstance, octaveMin, octaveMax) {
  const degs = scaleInstance.degrees;
  /** pc (0…11) → ступень лада с этим классом высоты */
  const pcToDeg = new Map();
  for (const d of degs) {
    pcToDeg.set(normalizePc(d.pc), d);
  }
  const minMidi = midiNoteFromPcOctave(0, octaveMin);
  const maxMidi = midiNoteFromPcOctave(11, octaveMax);
  const out = [];
  for (let m = minMidi; m <= maxMidi; m++) {
    const mpc = normalizePc(m % 12);
    const deg = pcToDeg.get(mpc);
    if (!deg) continue;
    const sciOct = Math.floor(m / 12) - 1;
    out.push({
      pc: deg.pc,
      name: deg.name,
      octave: sciOct,
      key: `${deg.name}|${sciOct}`,
    });
  }
  return out;
}

/**
 * Классы высот корней диатонических триад в тональности (мажор или натуральный минор):
 * те же семь PC, что и ступени соответствующей гаммы; см. docs/music-theory.md (тональности и круг).
 * @param {string} tonicName каноническое имя тоники
 * @param {'major' | 'naturalMinor'} keyMode лад тональности
 * @returns {ReadonlySet<number>} pitch class 0…11
 */
export function diatonicTriadRootPcsInKey(tonicName, keyMode) {
  const patternId = keyMode === 'major' ? 'major' : 'naturalMinor';
  const inst = buildScale(patternId, tonicName);
  return new Set(inst.degrees.map((d) => d.pc));
}

/**
 * Каноническое имя тоники относительного мажора для натурального минора (малая терция вверх от тоники минора).
 * @param {string} naturalMinorTonicName имя тоники нат. минора (как для buildScale)
 * @returns {string}
 */
export function relativeMajorTonicNameFromNaturalMinorTonic(naturalMinorTonicName) {
  const { pc } = parseNoteName(naturalMinorTonicName);
  return CANONICAL_TONIC_BY_PC[(pc + 3) % 12];
}

/**
 * Классы высот корней I, IV, V мажорной тональности (для поиска трёх спиц IV–I–V на круге).
 * @param {string} majorTonicName
 * @returns {ReadonlySet<number>}
 */
export function majorIvRootPcSet(majorTonicName) {
  const inst = buildScale('major', majorTonicName);
  return new Set([inst.degrees[0].pc, inst.degrees[3].pc, inst.degrees[4].pc]);
}

/**
 * Имя мажорной тоники, по которой на круге ищется тройка IV–I–V: при мажоре — текущая тоника, при нат. миноре — относительный мажор.
 * @param {string} tonicName
 * @param {'major' | 'naturalMinor'} keyMode
 * @returns {string}
 */
export function referenceMajorTonicForIvIvCluster(tonicName, keyMode) {
  return keyMode === 'major'
    ? tonicName
    : relativeMajorTonicNameFromNaturalMinorTonic(tonicName);
}

/**
 * Включает ли подсветку «в тональности» один сектор при заданных множествах (чистая логика для тестов и UI).
 * @param {{ diatonicPcs: ReadonlySet<number>, t3Indices: ReadonlySet<string>, coveredPcs: ReadonlySet<number>, showSeventhChord: boolean, sectorIndex: string, rootPc: number | null }} p
 * @returns {boolean}
 */
export function isSectorTonalityHighlightOn(p) {
  const { diatonicPcs, t3Indices, coveredPcs, showSeventhChord, sectorIndex, rootPc } = p;
  if (rootPc == null || !diatonicPcs.has(rootPc)) return false;
  if (t3Indices.has(sectorIndex)) return true;
  if (showSeventhChord && !coveredPcs.has(rootPc)) return true;
  return false;
}

/**
 * Все 12 гамм данного паттерна с каноническими тониками из документа.
 * @param {string} patternId
 */
export function allCanonicalScales(patternId) {
  return CANONICAL_TONIC_BY_PC.map((tonic) => buildScale(patternId, tonic));
}

/**
 * Разница directed: from → to в полутонах по модулю 12.
 * @param {number} fromPc
 * @param {number} toPc
 */
export function directedSemitoneClass(fromPc, toPc) {
  return normalizePc(toPc - fromPc);
}

/**
 * Построить полный граф теории: PC, интервалы, паттерны, все канонические гаммы и рёбра.
 */
export function buildMusicTheoryGraph() {
  const nodes = new Map();
  const edges = [];

  /** @param {string} id @param {object} payload */
  function addNode(id, payload) {
    nodes.set(id, Object.freeze({ id, ...payload }));
  }

  const intervals = getIntervalCatalog();
  const patterns = getScalePatterns();

  for (let pc = 0; pc < 12; pc++) {
    addNode(`pc:${pc}`, {
      type: 'pitchClass',
      pc,
      canonicalTonicName: CANONICAL_TONIC_BY_PC[pc],
    });
  }

  for (const iv of intervals) {
    addNode(`interval:${iv.id}`, { type: 'interval', ...iv });
  }

  for (const p of patterns) {
    addNode(`pattern:${p.id}`, { type: 'scalePattern', ...p });
    p.semitoneSteps.forEach((st, i) => {
      const def = intervalDefForSemitoneClass(st);
      if (!def) throw new Error(`No interval catalog entry for step ${st} in pattern ${p.id}`);
      edges.push(
        Object.freeze({
          from: `pattern:${p.id}`,
          to: `interval:${def.id}`,
          kind: 'patternStepInterval',
          stepIndex: i,
          semitones: st,
          intervalId: def.id,
        }),
      );
    });
  }

  for (let a = 0; a < 12; a++) {
    for (let b = 0; b < 12; b++) {
      const sem = directedSemitoneClass(a, b);
      const def = intervalDefForSemitoneClass(sem);
      edges.push(
        Object.freeze({
          from: `pc:${a}`,
          to: `pc:${b}`,
          kind: 'intervalDirected',
          semitones: sem,
          intervalId: def?.id ?? null,
        }),
      );
    }
  }

  for (const p of patterns) {
    for (let tpc = 0; tpc < 12; tpc++) {
      const tonicName = CANONICAL_TONIC_BY_PC[tpc];
      const scale = buildScale(p.id, tonicName);
      const sid = `scale:${p.id}|${tonicName}`;
      addNode(sid, {
        type: 'scale',
        patternId: p.id,
        tonicName,
        tonicPc: tpc,
        degreeCount: scale.degrees.length,
      });

      edges.push(
        Object.freeze({
          from: sid,
          to: `pattern:${p.id}`,
          kind: 'scaleUsesPattern',
        }),
      );
      edges.push(
        Object.freeze({
          from: sid,
          to: `pc:${tpc}`,
          kind: 'tonicOf',
        }),
      );

      scale.degrees.forEach((d) => {
        edges.push(
          Object.freeze({
            from: sid,
            to: `pc:${d.pc}`,
            kind: 'scaleDegree',
            degreeIndex: d.index,
            noteName: d.name,
            intervalFromTonic: d.intervalFromTonic,
            intervalId: d.intervalFromTonicId,
          }),
        );
        if (d.stepToNext != null) {
          const nextPc = scale.degrees[d.index + 1]?.pc ?? tpc;
          edges.push(
            Object.freeze({
              from: `pc:${d.pc}`,
              to: `pc:${nextPc}`,
              kind: 'scaleStep',
              scaleId: sid,
              stepSemitones: d.stepToNext,
              fromDegree: d.index,
            }),
          );
        }
      });
    }
  }

  const byFrom = new Map();
  const byTo = new Map();
  const byKind = new Map();

  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
    if (!byTo.has(e.to)) byTo.set(e.to, []);
    byTo.get(e.to).push(e);
    if (!byKind.has(e.kind)) byKind.set(e.kind, []);
    byKind.get(e.kind).push(e);
  }

  return Object.freeze({
    nodes,
    edges,
    edgesFrom: (nodeId) => Object.freeze([...(byFrom.get(nodeId) ?? [])]),
    edgesTo: (nodeId) => Object.freeze([...(byTo.get(nodeId) ?? [])]),
    edgesByKind: (kind) => Object.freeze([...(byKind.get(kind) ?? [])]),
    getNode: (id) => nodes.get(id) ?? null,
  });
}

let _graphCache = null;

export function getMusicTheoryGraph() {
  if (!_graphCache) _graphCache = buildMusicTheoryGraph();
  return _graphCache;
}

/**
 * Сброс кэша графа (например после будущего изменения сидов в рантайме).
 */
export function resetMusicTheoryGraphCache() {
  _graphCache = null;
}

/*
 * -----------------------------------------------------------------------------
 * Генеративная модель, граф, визуализация (таблицы в браузере)
 * -----------------------------------------------------------------------------
 *
 * Источник правды по смыслу — docs/music-theory.md. Здесь в коде:
 * - сиды (INTERVAL_CATALOG_SEED, SCALE_PATTERN_SEEDS, CANONICAL_TONIC_BY_PC);
 * - производные: полутоновые шаги из T/t, классы высот ступеней, орфография по
 *   слотам букв; таблицы гамм из документа не хардкодятся — строятся из паттерна.
 * - getMusicTheoryGraph() связывает PC, интервалы, паттерны и экземпляры гамм
 *   рёбрами; обход в любом направлении — через edgesFrom / edgesTo / edgesByKind.
 *
 * Визуализация — это не отдельная «база», а DOM-отрисовка тех же структур:
 * export renderTheoryTables(container) строит блоки с таблицами и списками.
 *
 * Открытие с диска: файл music/theory-tables.html (рядом с каталогом lib/)
 * подключает этот модуль как import from './lib/music-theory.js'. В Chromium /
 * Edge обычно работает по file:///…; если браузер блокирует ES-модули с file,
 * откройте страницу на опубликованном сайте по HTTPS.
 * -----------------------------------------------------------------------------
 */

/**
 * Отрисовка таблиц и списков по данным этого модуля (только браузер).
 * @param {HTMLElement} rootEl контейнер, например document.getElementById('root')
 */
export function renderTheoryTables(rootEl) {
  if (typeof document === 'undefined' || !rootEl) {
    throw new Error('renderTheoryTables: нужен браузер и непустой HTMLElement');
  }

  function appendBlock(titleText, inner) {
    const wrap = document.createElement('section');
    wrap.className = 'block';
    const h = document.createElement('h2');
    h.textContent = titleText;
    wrap.appendChild(h);
    wrap.appendChild(inner);
    rootEl.appendChild(wrap);
  }

  function tableEl(headers, rows) {
    const tbl = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    for (const h of headers) {
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    }
    thead.appendChild(trh);
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const row of rows) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        if (cell instanceof Node) td.appendChild(cell);
        else td.textContent = cell == null ? '' : String(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    tbl.appendChild(tbody);
    return tbl;
  }

  function scrollWrap(node) {
    const d = document.createElement('div');
    d.className = 'scroll-x';
    d.appendChild(node);
    return d;
  }

  function listEl(items) {
    const ul = document.createElement('ul');
    ul.className = 'compact';
    for (const t of items) {
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    }
    return ul;
  }

  const ivRows = getIntervalCatalog().map((row) => [
    row.ruShort,
    row.id,
    String(row.semitones),
    row.nameRu,
  ]);
  appendBlock(
    'Каталог строк (getIntervalCatalog)',
    tableEl(['рус. кратко', 'id', 'полутоны', 'подпись'], ivRows),
  );

  const seventhRows = getSeventhChordCatalog().map((ch) => {
    const intervalsRuShort = ch.intervals.map((iv) => iv.ruShort).join(', ');
    const semitones = ch.semitonesFromRoot.join(', ');
    const thirdQ =
      ch.thirdQuality === 'M' ? 'б3' : ch.thirdQuality === 'm' ? 'м3' : '';
    const seventhQ =
      ch.seventhQuality === 'M'
        ? 'б7'
        : ch.seventhQuality === 'm'
          ? 'м7'
          : '(ум.7 / особ.)';
    return [
      ch.ruShort,
      ch.id,
      ch.symbol ?? '',
      intervalsRuShort,
      semitones,
      thirdQ,
      seventhQ,
      ch.nameRu,
    ];
  });
  appendBlock(
    'Типы септаккордов (getSeventhChordCatalog)',
    tableEl(
      [
        'тип (рус. кратко)',
        'код',
        'символ',
        'интервалы от основания',
        'полутона от основания',
        'качество 3 ступени',
        'качество 7 ступени',
        'пояснение имени',
      ],
      seventhRows,
    ),
  );

  const pcRows = CANONICAL_TONIC_BY_PC.map((label, idx) => [String(idx), label]);
  appendBlock('Индекс → подпись (CANONICAL_TONIC_BY_PC)', tableEl(['index', 'подпись'], pcRows));

  const letterRows = LETTER_ORDER.map((ch) => [ch, String(NATURAL_LETTER_PC[ch])]);
  appendBlock('Буква → число (LETTER_ORDER + NATURAL_LETTER_PC)', tableEl(['буква', 'число'], letterRows));

  const patRows = getScalePatterns().map((p) => [
    p.id,
    p.nameRu,
    p.tt ?? '—',
    p.semitoneSteps.join(','),
    p.letterOffsetsFromTonicLetter.join(','),
  ]);
  appendBlock('Паттерны (getScalePatterns)', tableEl(['id', 'имя', 'T/t', 'шаги', 'смещения букв'], patRows));

  for (const p of getScalePatterns()) {
    const rows = allCanonicalScales(p.id).map((inst) => [
      inst.tonicName,
      inst.degrees.map((d) => d.name).join(', '),
      inst.degrees.map((d) => String(d.pc)).join(', '),
    ]);
    appendBlock(`Строки по паттерну «${p.id}» (allCanonicalScales)`, tableEl(
      ['тоника', 'имена', 'классы 0–11'],
      rows,
    ));
  }

  const g = getMusicTheoryGraph();
  const byType = new Map();
  for (const n of g.nodes.values()) {
    const t = n.type;
    byType.set(t, (byType.get(t) ?? 0) + 1);
  }
  const nodeSummary = [...byType.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [
    k,
    String(v),
  ]);
  appendBlock('Узлы графа: тип → количество (getMusicTheoryGraph)', tableEl(['type', 'count'], nodeSummary));

  const kindCount = new Map();
  for (const e of g.edges) {
    kindCount.set(e.kind, (kindCount.get(e.kind) ?? 0) + 1);
  }
  const edgeSummary = [...kindCount.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([k, v]) => [
    k,
    String(v),
  ]);
  appendBlock('Рёбра графа: kind → количество', tableEl(['kind', 'count'], edgeSummary));

  const labels = CANONICAL_TONIC_BY_PC;
  const hdr = ['from \\ to', ...labels];
  const dir = g.edgesByKind('intervalDirected');
  const cell = new Map();
  for (const e of dir) {
    cell.set(`${e.from}\t${e.to}`, e.intervalId ?? String(e.semitones));
  }
  const matRows = labels.map((_, ri) => {
    const fromId = `pc:${ri}`;
    return [
      labels[ri],
      ...labels.map((__, ci) => {
        const toId = `pc:${ci}`;
        return cell.get(`${fromId}\t${toId}`) ?? '';
      }),
    ];
  });
  appendBlock(
    'Матрица направленных шагов между классами 0–11 (intervalDirected, в ячейке intervalId)',
    scrollWrap(tableEl(hdr, matRows)),
  );

  const sampleKinds = [
    'patternStepInterval',
    'scaleUsesPattern',
    'tonicOf',
    'scaleDegree',
    'scaleStep',
  ];
  for (const k of sampleKinds) {
    const list = g.edgesByKind(k).slice(0, 24).map((e) => JSON.stringify(e));
    appendBlock(`Пример рёбер kind=${k} (первые 24)`, listEl(list.length ? list : ['(пусто)']));
  }
}

export default Object.freeze({
  LETTER_ORDER,
  NATURAL_LETTER_PC,
  DEFAULT_A4_HZ,
  A4_MIDI_NOTE,
  CANONICAL_TONIC_BY_PC,
  CHROMATIC_NAMES_SHARP_BY_PC,
  CHROMATIC_NAMES_FLAT_BY_PC,
  chromaticNamesByAccidentalSystem,
  accidentalSystemFromScale,
  INTERVAL_CATALOG_SEED,
  SEVENTH_CHORD_SEED,
  SCALE_PATTERN_SEEDS,
  ttToSteps,
  getScalePatterns,
  getIntervalCatalog,
  getSeventhChordCatalog,
  intervalDefForSemitoneClass,
  normalizePc,
  buildPitchClassesFromSteps,
  parseNoteName,
  midiNoteFromPcOctave,
  frequencyFromMidi,
  frequencyFromNoteNameOctave,
  formatNoteName,
  alterationForLetterToPc,
  spellScaleFromPattern,
  buildScale,
  buildScaleDegreeRowsByMidiOrder,
  diatonicTriadRootPcsInKey,
  relativeMajorTonicNameFromNaturalMinorTonic,
  majorIvRootPcSet,
  referenceMajorTonicForIvIvCluster,
  isSectorTonalityHighlightOn,
  allCanonicalScales,
  directedSemitoneClass,
  buildMusicTheoryGraph,
  getMusicTheoryGraph,
  resetMusicTheoryGraphCache,
  renderTheoryTables,
});
