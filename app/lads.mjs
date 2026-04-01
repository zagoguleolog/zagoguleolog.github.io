import {
  CANONICAL_TONIC_BY_PC,
  buildScale,
  DEFAULT_A4_HZ,
  frequencyFromNoteNameOctave,
  getScalePatterns,
  midiNoteFromPcOctave,
  parseNoteName,
} from '../lib/music-theory.js';
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
  setTheoryMutedOutsidePcs,
  setTheoryPcsHighlight,
} from './keyboard-theory-highlight.mjs';
import { createSegmentValueControl } from './synth-kit/segment-value-control.mjs';
import { createPianoCodeMap, linearComputerCodesForOctaveRange } from './computer-keyboard-music.mjs';

initToneGenTheory({
  frequencyFromNoteNameOctave,
  DEFAULT_A4_HZ,
});

const PREFIX = 'lads-ntg-';

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
/** Массив шагов для секвенсора: { name, pc, octave }. */
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
let greyKeyboardMode = false;

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function readSynthParams() {
  return readToneGenParams(PREFIX);
}

function setStatus(text) {
  $('lads-ntg-status').textContent = text;
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

function rebuildKeyboards() {
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 5;
  }
  const linearWrap = document.querySelector('#lads-keys-linear .ntg-keys-wrap');
  const pianoRoot = document.querySelector('#lads-keys-piano .cts-piano-keyboard');
  const bayanWrap = document.getElementById('lads-bayan-wrap');
  const bayan4Wrap = document.getElementById('lads-bayan4-wrap');
  if (linearWrap) {
    buildLinearKeys(linearWrap, {
      octaveMin,
      octaveMax,
      keyButtonClass: 'ntg-key cts-play-key',
    });
  }
  if (pianoRoot) {
    buildPianoKeys(pianoRoot, { octaveMin, octaveMax });
  }
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  if (bayanWrap) {
    renderBayanKeyboard(bayanWrap, {
      midiMin,
      midiMax,
      cellWidth: 32,
      buttonRadius: 18,
      rowGap: 6,
      staggerFraction: 1 / 3,
      brickHalfSteps: 1,
      rowCount: 3,
      interactive: true,
      compact: false,
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
      rowCount: 4,
      interactive: true,
      compact: false,
    });
  }
}

function getKeyboardStage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('lads-keyboard-stage'));
}

function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('lads-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('lads-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('lads-bayan-wrap');
  if (keyboardLayout === 'bayiano4') return document.getElementById('lads-bayan4-wrap');
  return null;
}

function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano' && mode !== 'bayiano4') return;
  keyboardLayout = mode;
  const linear = document.getElementById('lads-keys-linear');
  const piano = document.getElementById('lads-keys-piano');
  const bay = document.getElementById('lads-keys-bayiano');
  const bay4 = document.getElementById('lads-keys-bayiano4');
  const group = document.getElementById('lads-kbd-mode-group');
  if (linear) linear.hidden = mode !== 'linear';
  if (piano) piano.hidden = mode !== 'piano';
  if (bay) bay.hidden = mode !== 'bayiano';
  if (bay4) bay4.hidden = mode !== 'bayiano4';
  if (group) {
    for (const btn of group.querySelectorAll('[data-lads-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.dataset.ladsKbdMode === mode ? 'true' : 'false');
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
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return createPianoCodeMap(octaveMin, octaveMax);
      } catch {
        return createPianoCodeMap(3, 5);
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
  if (stage && !stage.dataset.ladsTonicWired) {
    stage.dataset.ladsTonicWired = '1';
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
  let pc;
  try {
    ({ pc } = parseNoteName(noteName));
  } catch {
    return;
  }
  currentTonicName = CANONICAL_TONIC_BY_PC[pc];
  rebuildScale();
}

function setModeButtons(activeId) {
  const ids = ['lads-arp-off', 'lads-arp-up-loop', 'lads-arp-up-down'];
  for (const id of ids) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.setAttribute('aria-pressed', id === activeId ? 'true' : 'false');
  }
}

function setStepButtons(stepLen) {
  const map = {
    '1/4': 'lads-step-quarter',
    '1/8': 'lads-step-eighth',
    '1/16': 'lads-step-sixteenth',
    '1/32': 'lads-step-thirtysecond',
  };
  for (const [len, id] of Object.entries(map)) {
    const btn = document.getElementById(id);
    if (!btn) continue;
    btn.setAttribute('aria-pressed', len === stepLen ? 'true' : 'false');
  }
}

function clearScaleHighlight() {
  const scopes = [
    document.getElementById('lads-keys-linear'),
    document.getElementById('lads-keys-piano'),
    document.getElementById('lads-bayan-wrap'),
    document.getElementById('lads-bayan4-wrap'),
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
  const [name, octaveStr] = key.split('|');
  const octave = Number(octaveStr);
  if (!name || !Number.isFinite(octave)) return;
  const scope = getActiveKeyHighlightScope();
  if (!scope) return;
  const sel = `.cts-play-key[data-note="${CSS.escape(name)}"][data-octave="${String(octave)}"]`;
  const btn = scope.querySelector(sel);
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
  updateScaleTable();
  buildSeqNotesFromScale();
  clearCurrentNoteHighlight();
  applyScaleHighlight();
  if (sequencer) {
    sequencer.setNotes(currentSeqNotes);
  }
}

function wireKeyboardLayoutSwitcher() {
  const kbdGroup = document.getElementById('lads-kbd-mode-group');
  if (kbdGroup && !kbdGroup.dataset.ladsWired) {
    kbdGroup.dataset.ladsWired = '1';
    kbdGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-lads-kbd-mode]');
      if (!b) return;
      const mode = /** @type {'linear' | 'piano'} */ (b.dataset.ladsKbdMode);
      setKeyboardLayout(mode);
    });
  }

  const greyBtn = document.getElementById('lads-kbd-grey-toggle');
  if (greyBtn && !greyBtn.dataset.ladsGreyWired) {
    greyBtn.dataset.ladsGreyWired = '1';
    greyBtn.addEventListener('click', () => {
      greyKeyboardMode = !greyKeyboardMode;
      greyBtn.setAttribute('aria-pressed', greyKeyboardMode ? 'true' : 'false');
      applyScaleHighlight();
    });
  }
}

function buildSeqNotesFromScale() {
  currentSeqNotes = [];
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
  const basePc = inst.tonicPc;
  /** Берём одну октаву по ступеням во всех октавах диапазона. */
  for (let octave = octaveMin; octave <= octaveMax; octave++) {
    for (const deg of inst.degrees) {
      const pc = deg.pc;
      const name = deg.name;
      currentSeqNotes.push({ pc, name, octave, key: `${name}|${octave}` });
    }
  }
}

function updateScaleTable() {
  const tbody = $('lads-scale-body');
  tbody.replaceChildren();
  const allPatterns = getScalePatterns();
  const byId = new Map(allPatterns.map((p) => [p.id, p]));
  const rows = [];
  for (const id of LAD_PATTERN_ORDER) {
    const pat = byId.get(id);
    if (!pat) continue;
    let inst = null;
    try {
      inst = buildScale(pat.id, currentTonicName);
    } catch {
      inst = null;
    }
    const tr = document.createElement('tr');
    tr.dataset.patternId = pat.id;
    if (pat.id === currentPatternId) {
      tr.classList.add('lads-scale-selected-row');
    }
    const tdName = document.createElement('td');
    tdName.textContent = pat.nameRu;
    const tdGamma = document.createElement('td');
    tdGamma.className = 'lads-scale-note';
    tdGamma.textContent = inst ? inst.degrees.map((d) => d.name).join(', ') : '';
    const tdPattern = document.createElement('td');
    tdPattern.textContent =
      pat.tt != null && pat.tt.length
        ? pat.tt.split('').join(' ')
        : pat.semitoneSteps.join(', ');
    tr.appendChild(tdName);
    tr.appendChild(tdGamma);
    tr.appendChild(tdPattern);
    rows.push(tr);
  }
  for (const tr of rows) {
    tbody.appendChild(tr);
  }
}

function initScaleTableClicks() {
  const tbody = document.getElementById('lads-scale-body');
  if (!tbody || tbody.dataset.ladsWired) return;
  tbody.dataset.ladsWired = '1';
  tbody.addEventListener('click', (e) => {
    const tr = /** @type {HTMLElement | null} */ (e.target.closest('tr'));
    if (!tr || !tr.dataset.patternId) return;
    const id = tr.dataset.patternId;
    if (!id || id === currentPatternId) return;
    currentPatternId = id;
    rebuildScale();
  });
}

function buildSequencer() {
  sequencer = createSequencer({
    notes: currentSeqNotes,
    mode: 'off',
    bpm: Number($('lads-bpm').value) || 80,
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
        mapKey: `lads:${name}|${octave}`,
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
    if (key.startsWith('lads:')) {
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

  $('lads-ntg-volume').addEventListener('input', () => {
    $('lads-ntg-vol-val').textContent = String(
      /** @type {HTMLInputElement} */ ($('lads-ntg-volume')).value,
    );
    applyVolumeFromUi();
  });
  $('lads-ntg-detune').addEventListener('input', () => {
    $('lads-ntg-detune-val').textContent = String(
      /** @type {HTMLInputElement} */ ($('lads-ntg-detune')).value,
    );
    updateIfPlaying();
  });
  $('lads-ntg-waveform').addEventListener('change', () => updateIfPlaying());
  $('lads-ntg-a4').addEventListener('input', () => updateIfPlaying());

  $('lads-ntg-octave-min').addEventListener('input', () => {
    rebuildKeyboards();
    rebuildScale();
    updateIfPlaying();
  });
  $('lads-ntg-octave-max').addEventListener('input', () => {
    rebuildKeyboards();
    rebuildScale();
    updateIfPlaying();
  });

  $('lads-ntg-stop').addEventListener('click', () => {
    if (engine) {
      engine.stopMonoSmooth();
      engine.stopAllPolySmooth();
      engine.setLatchedKeyForMono(null);
    }
    // Полная остановка: арпеджио в режим "Выкл" и очистка подсветки.
    setModeButtons('lads-arp-off');
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
  $('lads-bpm').addEventListener('input', () => {
    const val = Number(/** @type {HTMLInputElement} */ ($('lads-bpm')).value) || 80;
    if (bpmSegControl) {
      bpmSegControl.setValue(val);
    }
    if (sequencer) {
      sequencer.setBpm(val);
    }
  });

  const bpmSegMount = document.getElementById('lads-bpm-seg');
  if (bpmSegMount) {
    bpmSegControl = createSegmentValueControl({
      mount: bpmSegMount,
      min: 20,
      max: 400,
      value: Number(/** @type {HTMLInputElement} */ ($('lads-bpm')).value) || 80,
      step: 1,
      pixelsPerFullRange: 880,
      label: '',
      width: 3,
      padField: true,
    });
    bpmSegControl.onChange((v) => {
      const val = Math.round(v);
      const input = /** @type {HTMLInputElement} */ ($('lads-bpm'));
      input.value = String(val);
      if (sequencer) {
        sequencer.setBpm(val);
      }
    });
  }

  $('lads-arp-off').addEventListener('click', () => {
    setModeButtons('lads-arp-off');
    if (sequencer) sequencer.setMode('off');
    stopSequencerVoices();
    clearCurrentNoteHighlight();
    refreshStatus();
  });
  $('lads-arp-up-loop').addEventListener('click', () => {
    setModeButtons('lads-arp-up-loop');
    if (!sequencer) return;
    sequencer.setMode('up-loop');
    sequencer.start();
  });
  $('lads-arp-up-down').addEventListener('click', () => {
    setModeButtons('lads-arp-up-down');
    if (!sequencer) return;
    sequencer.setMode('up-down');
    sequencer.start();
  });

  $('lads-step-quarter').addEventListener('click', () => {
    setStepButtons('1/4');
    if (sequencer) sequencer.setStepNoteLength('1/4');
  });
  $('lads-step-eighth').addEventListener('click', () => {
    setStepButtons('1/8');
    if (sequencer) sequencer.setStepNoteLength('1/8');
  });
  $('lads-step-sixteenth').addEventListener('click', () => {
    setStepButtons('1/16');
    if (sequencer) sequencer.setStepNoteLength('1/16');
  });
  $('lads-step-thirtysecond').addEventListener('click', () => {
    setStepButtons('1/32');
    if (sequencer) sequencer.setStepNoteLength('1/32');
  });
}

function boot() {
  initSynth();
  initScaleTableClicks();
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

