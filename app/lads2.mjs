import {
  accidentalSystemFromScale,
  buildScale,
  buildScaleDegreeRowsByMidiOrder,
  chromaticNamesByAccidentalSystem,
  DEFAULT_A4_HZ,
  frequencyFromNoteNameOctave,
  getScalePatterns,
  midiNoteFromPcOctave,
  parseNoteName,
} from '../lib/music-theory.js';
import { BAYAN_CHROMATIC_4_ROW_COUNT, B_SYSTEM_ROW_COUNT } from '../lib/bayan-b-system.js';
import { createSequencer, stepDurationMs } from '../lib/arp-sequencer.mjs';
import { HARMONIC_END, HARMONIC_START, initToneGenTheory, ToneGen } from './tone-gen-engine.mjs';
import { buildLinearKeys, buildPianoKeys } from './keyboard-layouts.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { renderBayanKeyboard } from './bayan-keyboard.mjs';
import {
  buildBaseParams,
  buildPlayPayload,
  readOctaveRange,
  readToneGenParams,
} from './tone-gen-ui-shared.mjs';
import {
  clearTheoryHighlight,
  clearTheoryMuted,
  findPlayKeyElementByPitch,
  setTheoryMutedOutsidePcs,
  setTheoryPcsHighlight,
} from './keyboard-theory-highlight.mjs';
import { createSegmentValueControl } from './synth-kit/segment-value-control.mjs';
import {
  createBayanCodeMap,
  createPianoCodeMap,
  linearComputerCodesForOctaveRange,
} from './computer-keyboard-music.mjs';
import { mountCtsToneRail } from './cts-tone-rail.mjs';

initToneGenTheory({
  frequencyFromNoteNameOctave,
  DEFAULT_A4_HZ,
});

const PREFIX = 'lads2-ntg-';

/** Римские номера ладов (I-й — ионийский … VII-й — локрийский) в строках 2-й и 3-й таблиц. */
const ROMAN_MODE_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/**
 * Суффиксы буквенных обозначений лада после имени тоники (как в ТЗ для C: Δ, m7+6, m7−2 …).
 * Индекс совпадает с порядком в LAD_PATTERN_ORDER.
 */
const LAD_LETTER_SYMBOL_SUFFIX = Object.freeze([
  'Δ',
  'm7+6',
  'm7−2',
  'Δ+4',
  '7−7',
  'm7',
  'm7ø −2−5',
]);

/** Порядок диатонических ладов для таблицы. */
const LAD_PATTERN_ORDER = [
  'ionian',
  'dorian',
  'phrygian',
  'lydian',
  'mixolydian',
  'aeolian',
  'locrian',
];

/** @type {ToneGen | null} */
let engine = null;
/** @type {ReturnType<typeof createKeyboardSynthController> | null} */
let kbdController = null;
/** @type {ReturnType<typeof createSequencer> | null} */
let sequencer = null;

/** Текущая шкала (buildScale). */
let currentScale = null;
/** Базовый линейный набор ступеней по всем октавам: { name, pc, octave }. */
let baseSeqNotes = [];
/** Массив шагов для секвенсора с учётом выбранной секвенции. */
let currentSeqNotes = [];
/** Имя текущей ноты арпеджио для подсветки. */
let currentSeqKey = null;
/** Индикатор BPM (семисегментный контрол). */
let bpmSegControl = null;
/** Текущий patternId и тоника для buildScale. */
let currentPatternId = 'ionian';
let currentTonicName = 'C';
/** Текущая раскладка клавиатуры. */
/** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */
let keyboardLayout = 'linear';
/** Режим «grey»: ступени лада подсвечены, остальные клавиши серые. */
let greyKeyboardMode = true;
/** Направление секвенции арпеджио. */
/** @type {'up' | 'down' | 'zigzag'} */
let arpDirection = 'up';
/** Тип секвенции арпеджио. */
/** @type {'linear' | 'seq3' | 'seq4' | 'seq5'} */
let arpSequenceMode = 'linear';

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function readSynthParams() {
  return readToneGenParams(PREFIX);
}

function setStatus(text) {
  $('lads2-ntg-status').textContent = text;
}

function fmtPlaying(name, octave, hz) {
  return `${name}${octave} — ${hz.toFixed(2)} Гц`;
}

function refreshStatus() {
  if (!engine) return;
  const p = readSynthParams();
  if (engine.mode === 'latchPoly') {
    const n = engine.polyVoiceCount();
    if (n === 0) {
      setStatus('Тишина');
      return;
    }
    const bits = [];
    for (const key of [...engine.polyVoices.keys()].sort()) {
      const { name, octave } = parseVoiceKeySafe(key);
      const hz = engine.getFreq(name, octave, p.a4Hz);
      bits.push(`${name}${octave} (${hz.toFixed(1)} Гц)`);
    }
    setStatus(`Играют (${n}): ${bits.join('; ')}`);
    return;
  }
  if (!engine.monoVoice || !engine.latchedKey) {
    setStatus('Тишина');
    return;
  }
  const { name, octave } = parseVoiceKeySafe(engine.latchedKey);
  const hz = engine.getFreq(name, octave, p.a4Hz);
  setStatus(fmtPlaying(name, octave, hz));
}

function parseVoiceKeySafe(key) {
  const parts = String(key).split('|');
  if (parts.length < 2) return { name: 'C', octave: 4 };
  const octave = Number(parts[parts.length - 1]);
  const name = parts[parts.length - 2];
  if (!name || !Number.isFinite(octave)) return { name: 'C', octave: 4 };
  return { name, octave };
}

function applyVolumeFromUi() {
  if (!engine) return;
  const p = readSynthParams();
  engine.setOutputLinear(p.volume);
}

function updateIfPlaying() {
  if (!engine) return;
  engine.updateAllPlaying(buildBaseParams(PREFIX));
  refreshStatus();
  kbdController?.syncExecutionHighlight();
}

/** Хроматический ряд подписей клавиатуры по текущему ладу; без шкалы — диезный ряд по умолчанию в layout. */
function keyboardChromaticNamesByPc() {
  if (!currentScale) return null;
  return chromaticNamesByAccidentalSystem(accidentalSystemFromScale(currentScale));
}

function rebuildKeyboards() {
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 5;
  }
  const linearWrap = document.querySelector('#lads2-keys-linear .ntg-keys-wrap');
  const pianoRoot = document.querySelector('#lads2-keys-piano .cts-piano-keyboard');
  const bayanWrap = document.getElementById('lads2-bayan-wrap');
  const bayan4Wrap = document.getElementById('lads2-bayan4-wrap');
  const chromaticRow = keyboardChromaticNamesByPc();
  const chromaticOpts = chromaticRow ? { noteNamesChromatic: chromaticRow } : {};
  if (linearWrap) {
    buildLinearKeys(linearWrap, {
      octaveMin,
      octaveMax,
      keyButtonClass: 'ntg-key cts-play-key',
      ...chromaticOpts,
    });
  }
  if (pianoRoot) {
    buildPianoKeys(pianoRoot, { octaveMin, octaveMax, ...chromaticOpts });
  }
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  const bayanNameOpts = chromaticRow ? { chromaticNamesByPc: chromaticRow } : {};
  if (bayanWrap) {
    renderBayanKeyboard(bayanWrap, {
      midiMin,
      midiMax,
      cellWidth: 32,
      buttonRadius: 18,
      rowGap: 6,
      staggerFraction: 1 / 3,
      brickHalfSteps: 1,
      rowCount: B_SYSTEM_ROW_COUNT,
      interactive: true,
      compact: false,
      ...bayanNameOpts,
    });
  }
  if (bayan4Wrap) {
    renderBayanKeyboard(bayan4Wrap, {
      midiMin,
      midiMax,
      cellWidth: 32,
      buttonRadius: 16,
      rowGap: 5,
      staggerFraction: 1 / 4,
      brickHalfSteps: 1,
      rowCount: BAYAN_CHROMATIC_4_ROW_COUNT,
      interactive: true,
      compact: false,
      ...bayanNameOpts,
    });
  }
}

function getKeyboardStage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('lads2-keyboard-stage'));
}

function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('lads2-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('lads2-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('lads2-bayan-wrap');
  if (keyboardLayout === 'bayiano4') return document.getElementById('lads2-bayan4-wrap');
  return null;
}

function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano' && mode !== 'bayiano4') return;
  keyboardLayout = mode;
  const linear = document.getElementById('lads2-keys-linear');
  const piano = document.getElementById('lads2-keys-piano');
  const bay = document.getElementById('lads2-keys-bayiano');
  const bay4 = document.getElementById('lads2-keys-bayiano4');
  const group = document.getElementById('lads2-kbd-mode-group');
  if (linear) linear.hidden = mode !== 'linear';
  if (piano) piano.hidden = mode !== 'piano';
  if (bay) bay.hidden = mode !== 'bayiano';
  if (bay4) bay4.hidden = mode !== 'bayiano4';
  if (group) {
    for (const btn of group.querySelectorAll('[data-lads2-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.dataset.lads2KbdMode === mode ? 'true' : 'false');
    }
  }
  kbdController?.syncExecutionHighlight();
  applyScaleHighlight();
  applyCurrentNoteHighlight(currentSeqKey);
}

function rebuildAllKeyboards() {
  rebuildKeyboards();
  kbdController?.bindKeys();
  kbdController?.syncExecutionHighlight();
  applyScaleHighlight();
  applyCurrentNoteHighlight(currentSeqKey);
}

function bindKeyboard() {
  if (!engine) return;
  kbdController = createKeyboardSynthController({
    getPointerRoot: getKeyboardStage,
    getClearRoot: getKeyboardStage,
    getHighlightRoot: getActiveKeyHighlightScope,
    keySelector: '.cts-play-key',
    engine,
    buildPlayPayload: (name, octave) => buildPlayPayload(PREFIX, name, octave),
    onChange: () => {
      refreshStatus();
      applyCurrentNoteHighlight(currentSeqKey);
    },
  });
  kbdController.bindKeys();

  kbdController.bindComputerKeyboard({
    getLayout: () => keyboardLayout,
    getPianoCodeMap: () => {
      const npc = keyboardChromaticNamesByPc();
      const extra = npc ? { namesByPc: npc } : {};
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return createPianoCodeMap(octaveMin, octaveMax, extra);
      } catch {
        return createPianoCodeMap(3, 5, extra);
      }
    },
    getBayanCodeMap: () => {
      const layout = keyboardLayout;
      if (layout !== 'bayiano' && layout !== 'bayiano4') return new Map();
      const rowCount = layout === 'bayiano4' ? BAYAN_CHROMATIC_4_ROW_COUNT : B_SYSTEM_ROW_COUNT;
      const npc = keyboardChromaticNamesByPc();
      const extra = npc ? { namesByPc: npc } : {};
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        const midiMin = midiNoteFromPcOctave(0, octaveMin);
        const midiMax = midiNoteFromPcOctave(11, octaveMax);
        return createBayanCodeMap(midiMin, midiMax, { rowCount, ...extra });
      } catch {
        return createBayanCodeMap(midiNoteFromPcOctave(0, 3), midiNoteFromPcOctave(11, 5), {
          rowCount,
          ...extra,
        });
      }
    },
    getLinearComputerCodes: () => {
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return linearComputerCodesForOctaveRange(octaveMin, octaveMax);
      } catch {
        return linearComputerCodesForOctaveRange(3, 5);
      }
    },
  });

  const stage = getKeyboardStage();
  if (stage && !stage.dataset.lads2TonicWired) {
    stage.dataset.lads2TonicWired = '1';
    stage.addEventListener('click', (e) => {
      const btn = e.target.closest('.cts-play-key');
      if (!(btn instanceof HTMLElement)) return;
      const name = btn.getAttribute('data-note');
      if (!name) return;
      handleTonicFromKeyboard(name);
    });
  }
}

function handleTonicFromKeyboard(noteName) {
  try {
    parseNoteName(noteName);
  } catch {
    return;
  }
  currentTonicName = String(noteName).trim();
  rebuildScale();
}

function setDirectionButtons(dir) {
  const map = {
    up: 'lads2-arp-dir-up',
    down: 'lads2-arp-dir-down',
    zigzag: 'lads2-arp-dir-zigzag',
  };
  const activeId = map[dir] ?? map.up;
  for (const id of Object.values(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.setAttribute('aria-pressed', id === activeId ? 'true' : 'false');
  }
}

function setSequenceButtons(mode) {
  const map = {
    linear: 'lads2-arp-seq-linear',
    seq3: 'lads2-arp-seq-3',
    seq4: 'lads2-arp-seq-4',
    seq5: 'lads2-arp-seq-5',
  };
  const activeId = map[mode] ?? map.linear;
  for (const id of Object.values(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.setAttribute('aria-pressed', id === activeId ? 'true' : 'false');
  }
}

function setStepButtons(stepLen) {
  const map = {
    '1/4': 'lads2-step-quarter',
    '1/8': 'lads2-step-eighth',
    '1/16': 'lads2-step-sixteenth',
    '1/32': 'lads2-step-thirtysecond',
  };
  for (const [len, id] of Object.entries(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.setAttribute('aria-pressed', len === stepLen ? 'true' : 'false');
  }
}

function clearScaleHighlight() {
  const scopes = [
    document.getElementById('lads2-keys-linear'),
    document.getElementById('lads2-keys-piano'),
    document.getElementById('lads2-bayan-wrap'),
    document.getElementById('lads2-bayan4-wrap'),
  ];
  for (const root of scopes) {
    if (!root) continue;
    clearTheoryHighlight(root, { className: 'lads-scale-degree' });
    clearTheoryMuted(root);
  }
}

function applyScaleHighlight() {
  if (!currentScale) return;
  const pcs = new Set(currentScale.degrees.map((d) => d.pc));
  clearScaleHighlight();
  const scope = getActiveKeyHighlightScope();
  if (!scope) return;
  setTheoryPcsHighlight(scope, pcs, {
    keySelector: '.cts-play-key',
    className: 'lads-scale-degree',
  });
  if (greyKeyboardMode) {
    setTheoryMutedOutsidePcs(scope, pcs, { keySelector: '.cts-play-key' });
  }
}

function clearCurrentNoteHighlight() {
  const scope = getKeyboardStage();
  if (!scope) return;
  for (const el of scope.querySelectorAll('.lads-current-note')) {
    el.classList.remove('lads-current-note');
  }
}

function applyCurrentNoteHighlight(key) {
  clearCurrentNoteHighlight();
  if (!key) return;
  const pipe = key.indexOf('|');
  if (pipe < 0) return;
  const name = key.slice(0, pipe);
  const octave = Number(key.slice(pipe + 1));
  if (!name || !Number.isFinite(octave)) return;
  const scope = getActiveKeyHighlightScope();
  if (!scope) return;
  const btn = findPlayKeyElementByPitch(scope, name, octave, '.cts-play-key');
  if (btn) btn.classList.add('lads-current-note');
}

function rebuildScale() {
  const pattern = currentPatternId;
  const tonic = currentTonicName;
  try {
    currentScale = buildScale(pattern, tonic);
  } catch (e) {
    console.error(e);
    currentScale = null;
  }
  updateTriadTables();
  buildSeqNotesFromScale();
  clearCurrentNoteHighlight();
  rebuildArpSequence();
  rebuildKeyboards();
  kbdController?.bindKeys();
  applyScaleHighlight();
  applyCurrentNoteHighlight(currentSeqKey);
}

function wireKeyboardLayoutSwitcher() {
  const kbdGroup = document.getElementById('lads2-kbd-mode-group');
  if (kbdGroup && !kbdGroup.dataset.lads2KbdWired) {
    kbdGroup.dataset.lads2KbdWired = '1';
    kbdGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lads2-kbd-mode]');
      if (!b) return;
      const mode = /** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */ (b.dataset.lads2KbdMode);
      setKeyboardLayout(mode);
    });
  }

  const greyBtn = document.getElementById('lads2-kbd-grey-toggle');
  if (greyBtn && !greyBtn.dataset.lads2GreyWired) {
    greyBtn.dataset.lads2GreyWired = '1';
    greyBtn.addEventListener('click', () => {
      greyKeyboardMode = !greyKeyboardMode;
      greyBtn.setAttribute('aria-pressed', greyKeyboardMode ? 'true' : 'false');
      applyScaleHighlight();
    });
  }
}

function buildSeqNotesFromScale() {
  baseSeqNotes = [];
  if (!currentScale) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 5;
  }
  const inst = currentScale;
  /** Линейный ряд ступеней в полосе клавиатуры C…B по octaveMin…octaveMax (см. buildScaleDegreeRowsByMidiOrder). */
  baseSeqNotes = buildScaleDegreeRowsByMidiOrder(inst, octaveMin, octaveMax);
}

/**
 * Построение последовательности нот арпеджио с учётом типа секвенции и направления.
 * @param {'linear' | 'seq3' | 'seq4' | 'seq5'} sequenceMode
 * @param {'up' | 'down' | 'zigzag'} directionMode
 * @returns {Array<{ name: string, pc: number, octave: number, key: string }>}
 */
function buildArpNoteSequenceFromMode(sequenceMode, directionMode) {
  if (!currentScale || !baseSeqNotes.length) return [];
  const total = baseSeqNotes.length;

  if (sequenceMode === 'linear') {
    /** @type {Array<{ name: string, pc: number, octave: number, key: string }>} */
    const linear = [];
    if (directionMode === 'down') {
      for (let i = total - 1; i >= 0; i--) {
        linear.push(baseSeqNotes[i]);
      }
    } else {
      // Для up и zigzag линейная последовательность одинакова;
      // zigzag реализуется на уровне режима секвенсора (up-down).
      linear.push(...baseSeqNotes);
    }
    return linear;
  }

  /** @type {number} */
  let windowLen = 3;
  if (sequenceMode === 'seq4') windowLen = 4;
  else if (sequenceMode === 'seq5') windowLen = 5;

  if (total < windowLen) {
    return [];
  }

  /** Восходящие окна скользящим окном по всему диапазону. */
  function buildUp() {
    /** @type {Array<{ name: string, pc: number, octave: number, key: string }>} */
    const seq = [];
    for (let start = 0; start <= total - windowLen; start++) {
      for (let j = 0; j < windowLen; j++) {
        seq.push(baseSeqNotes[start + j]);
      }
    }
    return seq;
  }

  /** Нисходящие окна скользящим окном по всему диапазону. */
  function buildDown() {
    /** @type {Array<{ name: string, pc: number, octave: number, key: string }>} */
    const seq = [];
    for (let start = total - 1; start >= windowLen - 1; start--) {
      for (let j = 0; j < windowLen; j++) {
        seq.push(baseSeqNotes[start - j]);
      }
    }
    return seq;
  }

  if (directionMode === 'up') {
    return buildUp();
  }
  if (directionMode === 'down') {
    return buildDown();
  }

  // zigzag для seq3/4/5: проход вверх окнами, затем вниз окнами
  // без двойного звучания крайней ноты на развороте.
  const upSeq = buildUp();
  const downSeq = buildDown();
  while (
    downSeq.length &&
    upSeq.length &&
    downSeq[0].key === upSeq[upSeq.length - 1].key
  ) {
    downSeq.shift();
  }
  return upSeq.concat(downSeq);
}

function rebuildArpSequence() {
  currentSeqNotes = buildArpNoteSequenceFromMode(arpSequenceMode, arpDirection);
  if (sequencer) {
    sequencer.setNotes(currentSeqNotes);
  }
}

/**
 * Шаг код гаммы в подписи «т» (тон) / «п» (полутон); данные из semitoneSteps паттерна.
 * @param {number} st
 */
function semitoneStepToTpLabel(st) {
  if (st === 2) return 'т';
  if (st === 1) return 'п';
  return String(st);
}

/**
 * Ячейка ступени в первой таблице: натуральная буква — с пометкой △, иначе имя ноты из гаммы.
 * @param {{ letter: string, alteration: number, name: string }} deg
 */
function formatDegreeCellDisplay(deg) {
  if (deg.alteration === 0) return `${deg.letter}△`;
  return deg.name;
}

/**
 * Альтерация буквы ступени: «·» — натуральная буква; иначе цепочка # или b.
 * @param {{ alteration: number }} deg
 */
function formatAccAlterationCell(deg) {
  const a = deg.alteration;
  if (a === 0) return '·';
  if (a > 0) return '#'.repeat(a);
  return 'b'.repeat(-a);
}

/**
 * Буквенное обозначение лада от выбранной тоники (первая таблица, заголовок строки).
 * @param {string} tonicName
 * @param {number} rowIndex 0…6 по LAD_PATTERN_ORDER
 */
function letterLadRowLabel(tonicName, rowIndex) {
  const suf = LAD_LETTER_SYMBOL_SUFFIX[rowIndex];
  return suf ? `${tonicName}${suf}` : tonicName;
}

/** @param {number | undefined} st */
function stepCellHighlightClass(st) {
  if (st === 2) return 'lads2-cell-step-ton';
  if (st === 1) return 'lads2-cell-step-semi';
  if (st === undefined) return '';
  return 'lads2-cell-step-other';
}

/** @param {{ alteration: number } | null | undefined} deg */
function accCellHighlightClass(deg) {
  if (!deg) return '';
  if (deg.alteration > 0) return 'lads2-cell-acc-sharp';
  if (deg.alteration < 0) return 'lads2-cell-acc-flat';
  return 'lads2-cell-acc-natural';
}

/** @param {{ alteration: number } | null | undefined} deg */
function degreeCellHighlightClass(deg) {
  if (!deg) return '';
  if (deg.alteration > 0) return 'lads2-cell-deg-sharp';
  if (deg.alteration < 0) return 'lads2-cell-deg-flat';
  return 'lads2-cell-deg-natural';
}

function updateSelectedLadTitle() {
  const el = document.getElementById('lads2-selected-lad-title');
  if (!el) return;
  const allPatterns = getScalePatterns();
  const pat = allPatterns.find((p) => p.id === currentPatternId);
  if (pat) {
    el.textContent = `${pat.nameRu} — тоника ${currentTonicName}`;
  } else {
    el.textContent = '';
  }
}

function updateTriadTables() {
  const degHead = $('lads2-scale-deg-head');
  const degBody = $('lads2-scale-deg-body');
  const stepsHead = $('lads2-scale-steps-head');
  const stepsBody = $('lads2-scale-steps-body');
  const accHead = $('lads2-scale-acc-head');
  const accBody = $('lads2-scale-acc-body');

  degHead.replaceChildren();
  degBody.replaceChildren();
  stepsHead.replaceChildren();
  stepsBody.replaceChildren();
  accHead.replaceChildren();
  accBody.replaceChildren();

  const allPatterns = getScalePatterns();
  const byId = new Map(allPatterns.map((p) => [p.id, p]));
  /** @type {typeof allPatterns} */
  const ordered = [];
  for (const id of LAD_PATTERN_ORDER) {
    const p = byId.get(id);
    if (p) ordered.push(p);
  }

  /** @type {Map<string, ReturnType<typeof buildScale> | null>} */
  const instById = new Map();
  for (const pat of ordered) {
    try {
      instById.set(pat.id, buildScale(pat.id, currentTonicName));
    } catch {
      instById.set(pat.id, null);
    }
  }

  const trDegHead = document.createElement('tr');
  const thDegCorner = document.createElement('th');
  thDegCorner.textContent = '';
  trDegHead.appendChild(thDegCorner);
  for (let c = 1; c <= 7; c++) {
    const th = document.createElement('th');
    th.textContent = String(c);
    trDegHead.appendChild(th);
  }
  degHead.appendChild(trDegHead);

  ordered.forEach((pat, mi) => {
    const inst = instById.get(pat.id) ?? null;
    const tr = document.createElement('tr');
    tr.dataset.patternId = pat.id;
    tr.tabIndex = -1;
    if (pat.id === currentPatternId) {
      tr.classList.add('lads-scale-selected-row');
    }
    const thRow = document.createElement('th');
    thRow.scope = 'row';
    thRow.className = 'lads-scale-note';
    thRow.textContent = letterLadRowLabel(currentTonicName, mi);
    tr.appendChild(thRow);
    for (let i = 0; i < 7; i++) {
      const td = document.createElement('td');
      const deg = inst?.degrees[i];
      const hi = degreeCellHighlightClass(deg);
      td.className = hi ? `lads-scale-note ${hi}` : 'lads-scale-note';
      td.textContent = deg ? formatDegreeCellDisplay(deg) : '';
      tr.appendChild(td);
    }
    degBody.appendChild(tr);
  });

  function buildNumericDegreeHeaderRow() {
    const tr = document.createElement('tr');
    const corner = document.createElement('th');
    corner.textContent = '';
    tr.appendChild(corner);
    for (let c = 1; c <= 7; c++) {
      const th = document.createElement('th');
      th.textContent = String(c);
      tr.appendChild(th);
    }
    return tr;
  }

  stepsHead.appendChild(buildNumericDegreeHeaderRow());
  accHead.appendChild(buildNumericDegreeHeaderRow());

  ordered.forEach((pat, mi) => {
    const inst = instById.get(pat.id) ?? null;

    const trS = document.createElement('tr');
    trS.dataset.patternId = pat.id;
    if (pat.id === currentPatternId) trS.classList.add('lads-scale-selected-row');
    const thMode = document.createElement('th');
    thMode.scope = 'row';
    thMode.textContent = ROMAN_MODE_LABELS[mi];
    trS.appendChild(thMode);
    for (let c = 0; c < 7; c++) {
      const td = document.createElement('td');
      const st = pat.semitoneSteps[c];
      const hi = stepCellHighlightClass(st);
      td.className = hi ? `lads-scale-note ${hi}` : 'lads-scale-note';
      td.textContent = st !== undefined ? semitoneStepToTpLabel(st) : '';
      trS.appendChild(td);
    }
    stepsBody.appendChild(trS);

    const trA = document.createElement('tr');
    trA.dataset.patternId = pat.id;
    if (pat.id === currentPatternId) trA.classList.add('lads-scale-selected-row');
    const thModeA = document.createElement('th');
    thModeA.scope = 'row';
    thModeA.textContent = ROMAN_MODE_LABELS[mi];
    trA.appendChild(thModeA);
    for (let c = 0; c < 7; c++) {
      const td = document.createElement('td');
      const deg = inst?.degrees[c];
      const hi = accCellHighlightClass(deg);
      td.className = hi ? `lads-scale-note ${hi}` : 'lads-scale-note';
      td.textContent = deg ? formatAccAlterationCell(deg) : '';
      trA.appendChild(td);
    }
    accBody.appendChild(trA);
  });

  updateSelectedLadTitle();
}

function initScaleTableClicks() {
  const region = document.getElementById('lads2-tables-region');
  if (!region || region.dataset.lads2TablesWired) return;
  region.dataset.lads2TablesWired = '1';
  region.addEventListener('click', (e) => {
    const hit = /** @type {HTMLElement | null} */ (e.target.closest('tr[data-pattern-id]'));
    if (!hit) return;
    const id = hit.dataset.patternId;
    if (!id || id === currentPatternId) return;
    currentPatternId = id;
    rebuildScale();
  });
}

function initScaleKeyboardNavigation() {
  const tbody = document.getElementById('lads2-scale-deg-body');
  if (!tbody || tbody.dataset.lads2KbdWired) return;
  tbody.dataset.lads2KbdWired = '1';

  function moveSelection(delta) {
    const order = LAD_PATTERN_ORDER;
    let idx = order.indexOf(currentPatternId);
    if (idx === -1) idx = 0;
    let nextIdx = idx + delta;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= order.length) nextIdx = order.length - 1;
    const nextId = order[nextIdx];
    if (!nextId || nextId === currentPatternId) return;
    currentPatternId = nextId;
    rebuildScale();
    const nextRow = tbody.querySelector(`tr[data-pattern-id="${CSS.escape(nextId)}"]`);
    if (nextRow instanceof HTMLElement) {
      nextRow.focus();
    }
  }

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const t = e.target;
      if (
        t instanceof Element &&
        t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
      ) {
        return;
      }
      if (e.key === 'ArrowUp') {
        moveSelection(-1);
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        moveSelection(1);
        e.preventDefault();
      }
    },
    true,
  );
}

function buildSequencer() {
  sequencer = createSequencer({
    notes: currentSeqNotes,
    mode: 'off',
    bpm: Number($('lads2-bpm').value) || 80,
    stepNoteLength: '1/4',
    onStep(index, note, ctx) {
      if (!note || !engine) return;
      // Гасим предыдущие голоса арпеджио, чтобы ноты не накапливались в аккорд.
      stopSequencerVoices();
      // Настраиваем плавное затухание в зависимости от длительности шага.
      const stepMs = stepDurationMs(ctx.bpm, ctx.stepNoteLength);
      engine.setReleaseSmoothSec(Math.min(0.4, stepMs / 2000));
      const { name, octave } = note;
      engine.startPolyVoice({
        ...buildPlayPayload(PREFIX, name, octave),
        mapKey: `lads2:${name}|${octave}`,
      });
      currentSeqKey = `${name}|${octave}`;
      applyCurrentNoteHighlight(currentSeqKey);
      setStatus(
        `Арпеджио: ступень ${index + 1} (${name}${octave}), шаг ${ctx.stepNoteLength}, ` +
          `${ctx.bpm.toFixed(0)} BPM (${stepDurationMs(ctx.bpm, ctx.stepNoteLength).toFixed(0)} мс)`,
      );
    },
  });
}

function stopSequencerVoices() {
  if (!engine) return;
  for (const key of [...engine.polyVoices.keys()]) {
    if (key.startsWith('lads2:')) {
      engine.stopPolyVoiceSmooth(key);
    }
  }
}

function initSynth() {
  engine = new ToneGen();
  const harmWrap = document.createElement('div');
  harmWrap.hidden = true;
  harmWrap.id = `${PREFIX}harmonics`;
  document.body.appendChild(harmWrap);
  for (let n = HARMONIC_START; n <= HARMONIC_END; n++) {
    const lab = document.createElement('label');
    lab.innerHTML = `<input type="checkbox" data-partial="${n}" ${
      n <= 6 ? 'checked' : ''
    } /> n=${String(n)}`;
    harmWrap.appendChild(lab);
  }

  $('lads2-ntg-volume').addEventListener('input', () => {
    $('lads2-ntg-vol-val').textContent = String(
      /** @type {HTMLInputElement} */ ($('lads2-ntg-volume')).value,
    );
    applyVolumeFromUi();
  });
  $('lads2-ntg-detune').addEventListener('input', () => {
    $('lads2-ntg-detune-val').textContent = String(
      /** @type {HTMLInputElement} */ ($('lads2-ntg-detune')).value,
    );
    updateIfPlaying();
  });
  $('lads2-ntg-waveform').addEventListener('change', () => updateIfPlaying());
  $('lads2-ntg-a4').addEventListener('input', () => updateIfPlaying());

  $('lads2-ntg-octave-min').addEventListener('input', () => {
    rebuildScale();
    updateIfPlaying();
  });
  $('lads2-ntg-octave-max').addEventListener('input', () => {
    rebuildScale();
    updateIfPlaying();
  });

  $('lads2-ntg-stop').addEventListener('click', () => {
    if (engine) {
      engine.stopMonoSmooth();
      engine.stopAllPolySmooth();
      engine.setLatchedKeyForMono(null);
    }
    // Полная остановка: арпеджио в режим "Выкл" и очистка подсветки.
    const offBtn = document.getElementById('lads2-arp-off');
    if (offBtn) offBtn.setAttribute('aria-pressed', 'true');
    if (sequencer) {
      sequencer.setMode('off');
      stopSequencerVoices();
    }
    clearCurrentNoteHighlight();
    setStatus('Тишина');
  });

  rebuildAllKeyboards();
  bindKeyboard();
  applyVolumeFromUi();
  updateIfPlaying();
}

function initArpControls() {
  $('lads2-bpm').addEventListener('input', () => {
    const val = Number(/** @type {HTMLInputElement} */ ($('lads2-bpm')).value) || 80;
    if (bpmSegControl) {
      bpmSegControl.setValue(val);
    }
    if (sequencer) {
      sequencer.setBpm(val);
    }
  });

  const bpmSegMount = document.getElementById('lads2-bpm-seg');
  if (bpmSegMount) {
    bpmSegControl = createSegmentValueControl({
      mount: bpmSegMount,
      min: 20,
      max: 400,
      value: Number(/** @type {HTMLInputElement} */ ($('lads2-bpm')).value) || 80,
      step: 1,
      pixelsPerFullRange: 880,
      label: '',
      width: 3,
      padField: true,
    });
    bpmSegControl.onChange((v) => {
      const val = Math.round(v);
      const input = /** @type {HTMLInputElement} */ ($('lads2-bpm'));
      input.value = String(val);
      if (sequencer) {
        sequencer.setBpm(val);
      }
    });
  }

  $('lads2-arp-off').addEventListener('click', () => {
    const offBtn = document.getElementById('lads2-arp-off');
    if (offBtn) offBtn.setAttribute('aria-pressed', 'true');
    if (sequencer) sequencer.setMode('off');
    stopSequencerVoices();
    clearCurrentNoteHighlight();
    refreshStatus();
  });

  function applyArpModeFromState() {
    if (!sequencer) return;
    const isLinear = arpSequenceMode === 'linear';
    // Для линейной секвенции режим zigzag реализуется на уровне секвенсора (up-down).
    // Для seq3/4/5 zigzag реализован в самой последовательности (up-loop).
    const useZigzagMode = isLinear && arpDirection === 'zigzag';
    const mode = useZigzagMode ? 'up-down' : 'up-loop';
    sequencer.setMode(mode);
    if (mode !== 'off' && currentSeqNotes.length) {
      sequencer.start();
    }
  }

  function updateArpSequenceAndMode() {
    rebuildArpSequence();
    applyArpModeFromState();
    const offBtn = document.getElementById('lads2-arp-off');
    if (offBtn) offBtn.setAttribute('aria-pressed', 'false');
  }

  // Направление
  document.getElementById('lads2-arp-dir-up')?.addEventListener('click', () => {
    arpDirection = 'up';
    setDirectionButtons(arpDirection);
    updateArpSequenceAndMode();
  });
  document.getElementById('lads2-arp-dir-down')?.addEventListener('click', () => {
    arpDirection = 'down';
    setDirectionButtons(arpDirection);
    updateArpSequenceAndMode();
  });
  document.getElementById('lads2-arp-dir-zigzag')?.addEventListener('click', () => {
    arpDirection = 'zigzag';
    setDirectionButtons(arpDirection);
    updateArpSequenceAndMode();
  });

  // Тип секвенции
  document.getElementById('lads2-arp-seq-linear')?.addEventListener('click', () => {
    arpSequenceMode = 'linear';
    setSequenceButtons(arpSequenceMode);
    updateArpSequenceAndMode();
  });
  document.getElementById('lads2-arp-seq-3')?.addEventListener('click', () => {
    arpSequenceMode = 'seq3';
    setSequenceButtons(arpSequenceMode);
    updateArpSequenceAndMode();
  });
  document.getElementById('lads2-arp-seq-4')?.addEventListener('click', () => {
    arpSequenceMode = 'seq4';
    setSequenceButtons(arpSequenceMode);
    updateArpSequenceAndMode();
  });
  document.getElementById('lads2-arp-seq-5')?.addEventListener('click', () => {
    arpSequenceMode = 'seq5';
    setSequenceButtons(arpSequenceMode);
    updateArpSequenceAndMode();
  });

  $('lads2-step-quarter').addEventListener('click', () => {
    setStepButtons('1/4');
    if (sequencer) sequencer.setStepNoteLength('1/4');
  });
  $('lads2-step-eighth').addEventListener('click', () => {
    setStepButtons('1/8');
    if (sequencer) sequencer.setStepNoteLength('1/8');
  });
  $('lads2-step-sixteenth').addEventListener('click', () => {
    setStepButtons('1/16');
    if (sequencer) sequencer.setStepNoteLength('1/16');
  });
  $('lads2-step-thirtysecond').addEventListener('click', () => {
    setStepButtons('1/32');
    if (sequencer) sequencer.setStepNoteLength('1/32');
  });
}

function boot() {
  mountCtsToneRail();
  initSynth();
  initScaleTableClicks();
  initScaleKeyboardNavigation();
  wireKeyboardLayoutSwitcher();
  buildSequencer();
  rebuildScale();
  initArpControls();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

