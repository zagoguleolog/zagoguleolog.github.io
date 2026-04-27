/**
 * Мобильная fullscreen-страница септаккордов: один экран, компактный звук,
 * вертикальные кнопки типов и клавиатура без UI «Голоса» / «Артикуляция».
 */
import {
  CHROMATIC_NAMES_SHARP_BY_PC,
  DEFAULT_A4_HZ,
  frequencyFromNoteNameOctave,
  getSeventhChordCatalog,
  midiNoteFromPcOctave,
  parseNoteName,
} from '../lib/music-theory.js';
import {
  clamp,
  HARMONIC_END,
  initToneGenTheory,
  parseVoiceKey,
  ToneGen,
  voiceKey,
} from './tone-gen-engine.mjs';
import { buildBaseParams, buildPlayPayload, readOctaveRange, readToneGenParams } from './tone-gen-ui-shared.mjs';
import { buildLinearKeys, buildPianoKeys } from './keyboard-layouts.mjs';
import {
  createBayanCodeMap,
  createPianoCodeMap,
  linearComputerCodesForOctaveRange,
} from './computer-keyboard-music.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { renderBayanKeyboard } from './bayan-keyboard.mjs';
import { createFader } from './synth-kit/fader.mjs';
import { createKnob } from './synth-kit/knob.mjs';
import { createSegmentDisplay } from './synth-kit/segment-display.mjs';

initToneGenTheory({
  frequencyFromNoteNameOctave,
  DEFAULT_A4_HZ,
});

const PREFIX = 'sc7m-ntg-';

/** @type {ToneGen | null} */
let toneEngine = null;
/** @type {ReturnType<typeof createKeyboardSynthController> | null} */
let kbdController = null;

/** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */
let keyboardLayout = 'linear';

/** @type {ReturnType<typeof getSeventhChordCatalog>} */
let chordCatalog = [];
/** @type {string | null} */
let selectedChordId = null;

/** Ключи базовых голосов клавиатуры, без добавочных нот септаккорда. @type {Set<string>} */
let prevBaseKeys = new Set();
/** База -> множество ключей верхних голосов септаккорда. @type {Map<string, Set<string>>} */
const chordVoicesByBase = new Map();

function field(suffix) {
  const id = `${PREFIX}${suffix}`;
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function getKeyboardStage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('sc7m-keyboard-stage'));
}

function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('sc7m-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('sc7m-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('sc7m-bayan-wrap');
  if (keyboardLayout === 'bayiano4') return document.getElementById('sc7m-bayan4-wrap');
  return null;
}

function noteNameOctaveFromMidi(midi) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: CHROMATIC_NAMES_SHARP_BY_PC[pc], octave };
}

function clearChordHighlights() {
  const root = getActiveKeyHighlightScope();
  if (!root) return;
  for (const el of root.querySelectorAll('.sc7m-chord-target')) {
    el.classList.remove('sc7m-chord-target');
  }
}

function applyChordHighlights(baseKeys) {
  const root = getActiveKeyHighlightScope();
  if (!root) return;
  const chord = chordCatalog.find((c) => c.id === selectedChordId);
  if (!chord) return;

  for (const key of baseKeys) {
    let name;
    let octave;
    try {
      ({ name, octave } = parseVoiceKey(key));
    } catch {
      continue;
    }

    let pc;
    try {
      pc = parseNoteName(name).pc;
    } catch {
      continue;
    }

    const baseMidi = midiNoteFromPcOctave(pc, octave);
    for (const semi of chord.semitonesFromRoot) {
      const target = noteNameOctaveFromMidi(baseMidi + semi);
      const btn = root.querySelector(
        `.cts-play-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"],` +
          `.ntg-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"]`,
      );
      if (btn) btn.classList.add('sc7m-chord-target');
    }
  }
}

function syncChordVoices() {
  if (!toneEngine) return;
  const chord = chordCatalog.find((c) => c.id === selectedChordId);
  const offsets = chord?.semitonesFromRoot ?? [];

  const allKeys = [...toneEngine.polyVoices.keys()];
  const baseKeys = new Set(allKeys.filter((k) => !k.startsWith('sc7m:')));

  for (const [base, set] of chordVoicesByBase.entries()) {
    if (!baseKeys.has(base)) {
      for (const v of set) toneEngine.stopPolyVoiceSmooth(v);
      chordVoicesByBase.delete(base);
    }
  }

  if (!offsets.length) {
    prevBaseKeys = baseKeys;
    clearChordHighlights();
    return;
  }

  for (const base of baseKeys) {
    if (prevBaseKeys.has(base)) continue;

    let name;
    let octave;
    try {
      ({ name, octave } = parseVoiceKey(base));
    } catch {
      continue;
    }

    let pc;
    try {
      pc = parseNoteName(name).pc;
    } catch {
      continue;
    }

    const baseMidi = midiNoteFromPcOctave(pc, octave);
    const set = new Set();

    offsets.forEach((semi, idx) => {
      const target = noteNameOctaveFromMidi(baseMidi + semi);
      const mapKey = `sc7m:${chord.id}|${base}|${idx}|${voiceKey(target.name, target.octave)}`;
      toneEngine.startPolyVoice({
        ...buildPlayPayload(PREFIX, target.name, target.octave),
        mapKey,
      });
      set.add(mapKey);
    });

    if (set.size) chordVoicesByBase.set(base, set);
  }

  prevBaseKeys = baseKeys;
  clearChordHighlights();
  applyChordHighlights(baseKeys);
}

function stopAllSound(immediate = false) {
  if (!toneEngine) return;
  if (immediate) {
    toneEngine.stopMonoImmediate();
    toneEngine.stopAllPolyImmediate();
  } else {
    toneEngine.stopMonoSmooth();
    toneEngine.stopAllPolySmooth();
  }
  toneEngine.setLatchedKeyForMono(null);
  prevBaseKeys.clear();
  chordVoicesByBase.clear();
  clearChordHighlights();
  kbdController?.syncExecutionHighlight();
}

function formatReleaseLabel(ms) {
  const m = Number(ms);
  if (!Number.isFinite(m)) return '-';
  if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
  return `${Math.round(m)} мс`;
}

function mountMobileSoundControls() {
  const volIn = /** @type {HTMLInputElement} */ (field('volume'));
  const detIn = /** @type {HTMLInputElement} */ (field('detune'));
  const mixIn = /** @type {HTMLInputElement} */ (field('harm-mix'));
  const rollIn = /** @type {HTMLInputElement} */ (field('harm-rolloff'));
  const relIn = /** @type {HTMLInputElement} */ (field('release-ms'));
  const releaseLabel = /** @type {HTMLElement} */ (field('release-ms-val'));

  const segVol = createSegmentDisplay({
    mount: field('seg-volume'),
    value: Number(volIn.value),
    decimals: 0,
    width: 3,
    id: `${PREFIX}seg-display-volume`,
  });
  const segDet = createSegmentDisplay({
    mount: field('seg-detune'),
    value: Number(detIn.value),
    decimals: 0,
    width: 3,
    id: `${PREFIX}seg-display-detune`,
  });
  const segMix = createSegmentDisplay({
    mount: field('seg-harm-mix'),
    value: Number(mixIn.value),
    decimals: 0,
    width: 3,
    id: `${PREFIX}seg-display-harm-mix`,
  });
  function updateIfPlaying() {
    if (!toneEngine) return;
    toneEngine.updateAllPlaying(buildBaseParams(PREFIX));
    syncChordVoices();
    kbdController?.syncExecutionHighlight();
  }

  function applyVolumeFromUi() {
    if (!toneEngine) return;
    toneEngine.setOutputLinear(readToneGenParams(PREFIX).volume);
  }

  createKnob({
    mount: field('mount-volume'),
    min: 0,
    max: 100,
    value: Number(volIn.value),
    step: 1,
    label: 'Громкость',
    pixelsPerFullRange: 160,
    id: `${PREFIX}knob-volume`,
  }).onChange((v) => {
    volIn.value = String(Math.round(v));
    segVol.setValue(v);
    applyVolumeFromUi();
  });

  createFader({
    mount: field('mount-release'),
    min: 20,
    max: 1000,
    value: Number(relIn.value),
    step: 10,
    pixelsPerFullRange: 120,
    label: 'Угасание',
    id: `${PREFIX}fader-release`,
  }).onChange((v) => {
    const ms = Math.round(v);
    relIn.value = String(ms);
    releaseLabel.textContent = formatReleaseLabel(ms);
    updateIfPlaying();
  });

  createKnob({
    mount: field('mount-harm-mix'),
    min: 0,
    max: 100,
    value: Number(mixIn.value),
    step: 1,
    label: 'Смесь обертонов',
    pixelsPerFullRange: 160,
    id: `${PREFIX}knob-harm-mix`,
  }).onChange((v) => {
    mixIn.value = String(Math.round(v));
    segMix.setValue(v);
    updateIfPlaying();
  });

  createKnob({
    mount: field('mount-detune'),
    min: -50,
    max: 50,
    value: Number(detIn.value),
    step: 1,
    label: 'Детюн',
    pixelsPerFullRange: 180,
    id: `${PREFIX}knob-detune`,
  }).onChange((v) => {
    detIn.value = String(Math.round(v));
    segDet.setValue(v);
    updateIfPlaying();
  });

  const harmWrap = field('harmonics');
  harmWrap.replaceChildren();
  for (let n = 1; n <= HARMONIC_END; n += 1) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.partial = String(n);
    input.checked = n <= 6;
    input.tabIndex = -1;
    harmWrap.appendChild(input);
  }

  releaseLabel.textContent = formatReleaseLabel(Number(relIn.value));
}

function setSelectedChord(chordId) {
  selectedChordId = chordId;
  const group = document.getElementById('sc7m-chord-buttons');
  if (group) {
    for (const btn of group.querySelectorAll('[data-sc7m-chord-id]')) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sc7m-chord-id') === chordId ? 'true' : 'false');
    }
  }
  syncChordVoices();
}

function renderChordButtons() {
  const group = document.getElementById('sc7m-chord-buttons');
  if (!group) return;
  group.replaceChildren();
  chordCatalog = getSeventhChordCatalog();

  for (const chord of chordCatalog) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sc7m-chord-btn';
    btn.dataset.sc7mChordId = chord.id;
    btn.setAttribute('aria-pressed', 'false');
    btn.title = `${chord.nameRu}: ${chord.intervals.map((iv) => iv.ruShort).join(', ')}`;
    btn.innerHTML = `<span>${chord.ruShort}</span><small>${chord.id}</small>`;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      setSelectedChord(chord.id);
    });
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      setSelectedChord(chord.id);
    });
    btn.addEventListener('click', () => setSelectedChord(chord.id));
    group.appendChild(btn);
  }

  const first = chordCatalog[0];
  if (first) setSelectedChord(first.id);
}

function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano' && mode !== 'bayiano4') return;
  keyboardLayout = mode;
  const ids = {
    linear: 'sc7m-keys-linear',
    piano: 'sc7m-keys-piano',
    bayiano: 'sc7m-keys-bayiano',
    bayiano4: 'sc7m-keys-bayiano4',
  };
  for (const [key, id] of Object.entries(ids)) {
    const el = document.getElementById(id);
    if (el) el.hidden = key !== mode;
  }
  const group = document.getElementById('sc7m-kbd-mode-group');
  if (group) {
    for (const btn of group.querySelectorAll('[data-sc7m-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-sc7m-kbd-mode') === mode ? 'true' : 'false');
    }
  }
  clearChordHighlights();
  kbdController?.syncExecutionHighlight();
}

function readMobileOctaves() {
  try {
    return readOctaveRange(PREFIX);
  } catch {
    return { octaveMin: 3, octaveMax: 5 };
  }
}

function rebuildLinearKeys() {
  const keysWrap = document.querySelector('#sc7m-keys-linear .ntg-keys-wrap');
  if (!keysWrap) return;
  const { octaveMin, octaveMax } = readMobileOctaves();
  buildLinearKeys(/** @type {HTMLElement} */ (keysWrap), {
    octaveMin,
    octaveMax,
    keyButtonClass: 'ntg-key cts-play-key',
  });
}

function rebuildPianoKeyboardLayout() {
  const kb = document.querySelector('#sc7m-keys-piano .cts-piano-keyboard');
  if (!kb) return;
  const { octaveMin, octaveMax } = readMobileOctaves();
  buildPianoKeys(/** @type {HTMLElement} */ (kb), { octaveMin, octaveMax });
}

function rebuildBayanKeyboardLayout() {
  const wrap = document.getElementById('sc7m-bayan-wrap');
  if (!wrap) return;
  const { octaveMin, octaveMax } = readMobileOctaves();
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  renderBayanKeyboard(wrap, {
    midiMin,
    midiMax,
    cellWidth: 28,
    buttonRadius: 15,
    rowGap: 5,
    staggerFraction: 1 / 3,
    brickHalfSteps: 1,
    rowCount: 3,
    interactive: true,
    compact: true,
  });
}

function rebuildBayan4KeyboardLayout() {
  const wrap = document.getElementById('sc7m-bayan4-wrap');
  if (!wrap) return;
  const { octaveMin, octaveMax } = readMobileOctaves();
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  renderBayanKeyboard(wrap, {
    midiMin,
    midiMax,
    cellWidth: 28,
    buttonRadius: 14,
    rowGap: 4,
    staggerFraction: 1 / 4,
    brickHalfSteps: 1,
    rowCount: 4,
    interactive: true,
    compact: true,
  });
}

function rebuildAllKeyboards() {
  rebuildLinearKeys();
  rebuildPianoKeyboardLayout();
  rebuildBayanKeyboardLayout();
  rebuildBayan4KeyboardLayout();
  kbdController?.bindKeys();
  kbdController?.syncExecutionHighlight();
  clearChordHighlights();
  syncChordVoices();
}

function wireKeyboardLayoutSwitcher() {
  const group = document.getElementById('sc7m-kbd-mode-group');
  if (!group) return;
  group.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const btn = target.closest('[data-sc7m-kbd-mode]');
    if (!(btn instanceof HTMLElement)) return;
    setKeyboardLayout(/** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */ (btn.dataset.sc7mKbdMode));
  });
}

async function enterFullscreen() {
  const note = document.getElementById('sc7m-orientation-note');
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    if (note) note.hidden = false;
  }

  const orientation = screen.orientation;
  if (orientation && 'lock' in orientation) {
    try {
      await orientation.lock('landscape');
    } catch {
      if (note) note.hidden = false;
    }
  } else if (note) {
    note.hidden = false;
  }

  toneEngine?.ensureCtx();
  document.getElementById('sc7m-start-overlay')?.setAttribute('hidden', '');
}

function wireFullscreenControls() {
  const start = document.getElementById('sc7m-start-button');
  const skip = document.getElementById('sc7m-start-skip');
  const toggle = document.getElementById('sc7m-fullscreen-toggle');

  start?.addEventListener('click', () => {
    void enterFullscreen();
  });
  skip?.addEventListener('click', () => {
    toneEngine?.ensureCtx();
    document.getElementById('sc7m-start-overlay')?.setAttribute('hidden', '');
  });
  toggle?.addEventListener('click', () => {
    void enterFullscreen();
  });
}

function wireStopButton() {
  document.getElementById('sc7m-ntg-stop')?.addEventListener('click', () => stopAllSound(false));
}

function wireHiddenParamChanges() {
  const update = () => {
    toneEngine?.updateAllPlaying(buildBaseParams(PREFIX));
    syncChordVoices();
  };
  field('waveform').addEventListener('change', update);
  field('a4').addEventListener('input', update);
  field('octave-min').addEventListener('input', () => {
    stopAllSound(true);
    rebuildAllKeyboards();
  });
  field('octave-max').addEventListener('input', () => {
    stopAllSound(true);
    rebuildAllKeyboards();
  });
}

function wireKeyboardShortcuts() {
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

      if (!chordCatalog.length) return;
      const rows = chordCatalog;
      const currentIndex = rows.findIndex((c) => c.id === selectedChordId);
      const nextIndex = clamp(currentIndex + (e.key === 'ArrowUp' ? -1 : 1), 0, rows.length - 1);
      const next = rows[nextIndex];
      if (next) {
        setSelectedChord(next.id);
        e.preventDefault();
      }
    },
    true,
  );
}

function boot() {
  renderChordButtons();
  mountMobileSoundControls();

  toneEngine = new ToneGen();
  toneEngine.mode = 'latchPoly';
  toneEngine.keyboardMode = 'holdPoly';
  toneEngine.setReleaseSmoothSec(readToneGenParams(PREFIX).releaseSec);
  toneEngine.setOutputLinear(readToneGenParams(PREFIX).volume);

  kbdController = createKeyboardSynthController({
    getPointerRoot: getKeyboardStage,
    getClearRoot: getKeyboardStage,
    getHighlightRoot: getActiveKeyHighlightScope,
    keySelector: '.cts-play-key',
    engine: toneEngine,
    buildPlayPayload: (name, octave) => buildPlayPayload(PREFIX, name, octave),
    includeVoiceInHighlight: (key) => !key.startsWith('sc7m:'),
    onChange: () => {
      syncChordVoices();
    },
  });

  kbdController.bindComputerKeyboard({
    getLayout: () => keyboardLayout,
    getPianoCodeMap: () => {
      const { octaveMin, octaveMax } = readMobileOctaves();
      return createPianoCodeMap(octaveMin, octaveMax, { namesByPc: CHROMATIC_NAMES_SHARP_BY_PC });
    },
    getLinearComputerCodes: () => {
      const { octaveMin, octaveMax } = readMobileOctaves();
      return linearComputerCodesForOctaveRange(octaveMin, octaveMax);
    },
    getBayanCodeMap: () => {
      const { octaveMin, octaveMax } = readMobileOctaves();
      const rowCount = keyboardLayout === 'bayiano4' ? 4 : 3;
      return createBayanCodeMap(midiNoteFromPcOctave(0, octaveMin), midiNoteFromPcOctave(11, octaveMax), {
        rowCount,
        namesByPc: CHROMATIC_NAMES_SHARP_BY_PC,
      });
    },
  });

  wireKeyboardLayoutSwitcher();
  wireFullscreenControls();
  wireStopButton();
  wireHiddenParamChanges();
  wireKeyboardShortcuts();
  rebuildAllKeyboards();
  setKeyboardLayout('linear');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
