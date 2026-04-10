/**
 * Страница септаккордов: таблица типов (getSeventhChordCatalog) и клавиатура
 * (linear / piano / bayiano / bayiano4), построение аккорда 1–3–5–7 от сыгранной ноты.
 */
import {
  CANONICAL_TONIC_BY_PC,
  getSeventhChordCatalog,
  midiNoteFromPcOctave,
  parseNoteName,
  DEFAULT_A4_HZ,
  frequencyFromNoteNameOctave,
} from '../lib/music-theory.js';
import {
  clamp,
  initToneGenTheory,
  parseVoiceKey,
  ToneGen,
  voiceKey,
} from './tone-gen-engine.mjs';
import { buildBaseParams, buildPlayPayload, readOctaveRange, readToneGenParams } from './tone-gen-ui-shared.mjs';
import { mountCtsToneRail } from './cts-tone-rail.mjs';
import { mountTemplateSynthKit } from './template-synth.mjs';
import { buildLinearKeys, buildPianoKeys } from './keyboard-layouts.mjs';
import {
  createBayanCodeMap,
  createPianoCodeMap,
  linearComputerCodesForOctaveRange,
} from './computer-keyboard-music.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { renderBayanKeyboard } from './bayan-keyboard.mjs';

initToneGenTheory({
  frequencyFromNoteNameOctave,
  DEFAULT_A4_HZ,
});

const PREFIX = 'sc7-ntg-';

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

/** Ключи базовых голосов (клавиатура), без добавочных нот аккорда. @type {Set<string>} */
let prevBaseKeys = new Set();
/** База → множество ключей голосов верхних нот аккорда. @type {Map<string, Set<string>>} */
const chordVoicesByBase = new Map();

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function getKeyboardStage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('sc7-keyboard-stage'));
}

function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('sc7-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('sc7-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('sc7-bayan-wrap');
  if (keyboardLayout === 'bayiano4') return document.getElementById('sc7-bayan4-wrap');
  return null;
}

function noteNameOctaveFromMidi(midi) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: CANONICAL_TONIC_BY_PC[pc], octave };
}

function clearChordHighlights() {
  const root = getActiveKeyHighlightScope();
  if (!root) return;
  for (const el of root.querySelectorAll('.sc7-chord-target')) {
    el.classList.remove('sc7-chord-target');
  }
}

function applyChordHighlights(baseKeys) {
  const root = getActiveKeyHighlightScope();
  if (!root) return;
  const chord = chordCatalog.find((c) => c.id === selectedChordId);
  if (!chord) return;

  const offsets = chord.semitonesFromRoot;
  if (!offsets || !offsets.length) return;

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
    for (const semi of offsets) {
      const target = noteNameOctaveFromMidi(baseMidi + semi);
      const btn = root.querySelector(
        `.cts-play-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"],` +
          `.ntg-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"]`,
      );
      if (btn) btn.classList.add('sc7-chord-target');
    }
  }
}

function syncChordVoices() {
  if (!toneEngine) return;
  const chord = chordCatalog.find((c) => c.id === selectedChordId);
  const offsets = chord?.semitonesFromRoot ?? [];

  const allKeys = [...toneEngine.polyVoices.keys()];
  const baseKeys = new Set(allKeys.filter((k) => !k.startsWith('sc7:')));

  // Остановить аккордовые голоса для баз, которых больше нет.
  for (const [base, set] of chordVoicesByBase.entries()) {
    if (!baseKeys.has(base)) {
      for (const v of set) {
        toneEngine.stopPolyVoiceSmooth(v);
      }
      chordVoicesByBase.delete(base);
    }
  }

  if (!offsets.length) {
    prevBaseKeys = baseKeys;
    clearChordHighlights();
    return;
  }

  // Новые базовые голоса → добавить верхние ноты аккорда.
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
      const mapKey = `sc7:${voiceKey(target.name, target.octave)}|${chord.id}|${base}|${idx}`;
      const payload = {
        ...buildPlayPayload(PREFIX, target.name, target.octave),
        mapKey,
      };
      toneEngine.startPolyVoice(payload);
      set.add(mapKey);
    });

    if (set.size) {
      chordVoicesByBase.set(base, set);
    }
  }

  prevBaseKeys = baseKeys;
  clearChordHighlights();
  applyChordHighlights(baseKeys);
}

function syncKeyboardModeUi(m) {
  const monoPoly = document.getElementById('sc7-kbd-polyphony-mono');
  const polyPoly = document.getElementById('sc7-kbd-polyphony-poly');
  const monoArt = document.getElementById('sc7-kbd-articulation-mono');
  const polyArt = document.getElementById('sc7-kbd-articulation-poly');
  const h = document.getElementById('sc7-kbd-mode-hold');
  const l = document.getElementById('sc7-kbd-mode-latch');
  const hp = document.getElementById('sc7-kbd-mode-hold-poly');
  const lp = document.getElementById('sc7-kbd-mode-latch-poly');
  const isMono = m === 'hold' || m === 'latch';
  if (monoPoly) monoPoly.setAttribute('aria-pressed', isMono ? 'true' : 'false');
  if (polyPoly) polyPoly.setAttribute('aria-pressed', !isMono ? 'true' : 'false');
  if (monoArt) monoArt.hidden = !isMono;
  if (polyArt) polyArt.hidden = isMono;
  if (h) h.setAttribute('aria-pressed', m === 'hold' ? 'true' : 'false');
  if (l) l.setAttribute('aria-pressed', m === 'latch' ? 'true' : 'false');
  if (hp) hp.setAttribute('aria-pressed', m === 'holdPoly' ? 'true' : 'false');
  if (lp) lp.setAttribute('aria-pressed', m === 'latchPoly' ? 'true' : 'false');
}

function setKeyboardMode(m) {
  if (!toneEngine) return;
  toneEngine.keyboardMode = m;
  syncKeyboardModeUi(m);
  clearChordHighlights();
  syncChordVoices();
}

function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano' && mode !== 'bayiano4') return;
  keyboardLayout = mode;
  const linear = document.getElementById('sc7-keys-linear');
  const piano = document.getElementById('sc7-keys-piano');
  const bay = document.getElementById('sc7-keys-bayiano');
  const bay4 = document.getElementById('sc7-keys-bayiano4');
  const group = document.getElementById('sc7-kbd-mode-group');
  if (linear) linear.hidden = mode !== 'linear';
  if (piano) piano.hidden = mode !== 'piano';
  if (bay) bay.hidden = mode !== 'bayiano';
  if (bay4) bay4.hidden = mode !== 'bayiano4';
  if (group) {
    for (const btn of group.querySelectorAll('[data-sc7-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.dataset.sc7KbdMode === mode ? 'true' : 'false');
    }
  }
  clearChordHighlights();
  kbdController?.syncExecutionHighlight();
}

function rebuildLinearKeys() {
  const keysWrap = document.querySelector('#sc7-keys-linear .ntg-keys-wrap');
  if (!keysWrap) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  buildLinearKeys(/** @type {HTMLElement} */ (keysWrap), {
    octaveMin,
    octaveMax,
    keyButtonClass: 'ntg-key cts-play-key',
  });
}

function rebuildPianoKeyboardLayout() {
  const kb = document.querySelector('#sc7-keys-piano .cts-piano-keyboard');
  if (!kb) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  buildPianoKeys(/** @type {HTMLElement} */ (kb), { octaveMin, octaveMax });
}

function rebuildBayanKeyboardLayout() {
  const wrap = document.getElementById('sc7-bayan-wrap');
  if (!wrap) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  try {
    renderBayanKeyboard(wrap, {
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
  } catch (e) {
    console.error(e);
    wrap.replaceChildren();
    const p = document.createElement('p');
    p.className = 'cts-kbd-placeholder';
    p.textContent = 'Не удалось построить раскладку баяна.';
    wrap.appendChild(p);
  }
}

function rebuildBayan4KeyboardLayout() {
  const wrap = document.getElementById('sc7-bayan4-wrap');
  if (!wrap) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  const midiMin = midiNoteFromPcOctave(0, octaveMin);
  const midiMax = midiNoteFromPcOctave(11, octaveMax);
  try {
    renderBayanKeyboard(wrap, {
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
  } catch (e) {
    console.error(e);
    wrap.replaceChildren();
    const p = document.createElement('p');
    p.className = 'cts-kbd-placeholder';
    p.textContent = 'Не удалось построить четырёхрядную раскладку.';
    wrap.appendChild(p);
  }
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

function wireSynth() {
  const harmWrap = document.getElementById(`${PREFIX}harmonics`);
  if (!harmWrap || harmWrap.dataset.sc7HarmWired) return;
  harmWrap.dataset.sc7HarmWired = '1';

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  function updateIfPlaying() {
    if (!toneEngine) return;
    toneEngine.updateAllPlaying(buildBaseParams(PREFIX));
    syncChordVoices();
  }

  function applyVolumeFromUi() {
    if (!toneEngine) return;
    const p = readToneGenParams(PREFIX);
    toneEngine.setOutputLinear(p.volume);
  }

  mountTemplateSynthKit(PREFIX, {
    applyVolumeFromUi,
    updateIfPlaying,
    formatReleaseLabel,
  });

  toneEngine = new ToneGen();
  toneEngine.mode = 'latchPoly';
  toneEngine.keyboardMode = 'holdPoly';

  kbdController = createKeyboardSynthController({
    getPointerRoot: getKeyboardStage,
    getClearRoot: getKeyboardStage,
    getHighlightRoot: getActiveKeyHighlightScope,
    keySelector: '.cts-play-key',
    engine: toneEngine,
    buildPlayPayload: (name, octave) => buildPlayPayload(PREFIX, name, octave),
    includeVoiceInHighlight: (key) => !key.startsWith('sc7:'),
    onChange: () => {
      syncChordVoices();
    },
  });

  kbdController.bindComputerKeyboard({
    getLayout: () => keyboardLayout,
    getPianoCodeMap: () => {
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return createPianoCodeMap(octaveMin, octaveMax);
      } catch {
        return createPianoCodeMap(3, 6);
      }
    },
    getLinearComputerCodes: () => {
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return linearComputerCodesForOctaveRange(octaveMin, octaveMax);
      } catch {
        return linearComputerCodesForOctaveRange(3, 6);
      }
    },
    getBayanCodeMap: () => {
      const rc = keyboardLayout === 'bayiano4' ? 4 : 3;
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        const midiMin = midiNoteFromPcOctave(0, octaveMin);
        const midiMax = midiNoteFromPcOctave(11, octaveMax);
        return createBayanCodeMap(midiMin, midiMax, { rowCount: rc });
      } catch {
        return createBayanCodeMap(
          midiNoteFromPcOctave(0, 3),
          midiNoteFromPcOctave(11, 6),
          { rowCount: rc },
        );
      }
    },
  });

  const stopBtn = document.getElementById('sc7-ntg-stop');
  if (stopBtn && !stopBtn.dataset.sc7StopWired) {
    stopBtn.dataset.sc7StopWired = '1';
    stopBtn.addEventListener('click', () => {
      if (!toneEngine) return;
      toneEngine.stopMonoSmooth();
      toneEngine.stopAllPolySmooth();
      toneEngine.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      chordVoicesByBase.clear();
      clearChordHighlights();
    });
  }

  const octMinEl = document.getElementById('sc7-ntg-octave-min');
  const octMaxEl = document.getElementById('sc7-ntg-octave-max');
  if (octMinEl && !octMinEl.dataset.sc7OctWired) {
    octMinEl.dataset.sc7OctWired = '1';
    octMinEl.addEventListener('input', () => {
      toneEngine?.stopMonoImmediate();
      toneEngine?.stopAllPolyImmediate();
      toneEngine?.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      chordVoicesByBase.clear();
      rebuildAllKeyboards();
    });
  }
  if (octMaxEl && !octMaxEl.dataset.sc7OctWired) {
    octMaxEl.dataset.sc7OctWired = '1';
    octMaxEl.addEventListener('input', () => {
      toneEngine?.stopMonoImmediate();
      toneEngine?.stopAllPolyImmediate();
      toneEngine?.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      chordVoicesByBase.clear();
      rebuildAllKeyboards();
    });
  }

  const wf = document.getElementById('sc7-ntg-waveform');
  const a4 = document.getElementById('sc7-ntg-a4');
  if (wf && !wf.dataset.sc7Wired) {
    wf.dataset.sc7Wired = '1';
    wf.addEventListener('change', () => {
      toneEngine?.updateAllPlaying(buildBaseParams(PREFIX));
      syncChordVoices();
    });
  }
  if (a4 && !a4.dataset.sc7Wired) {
    a4.dataset.sc7Wired = '1';
    a4.addEventListener('input', () => {
      toneEngine?.updateAllPlaying(buildBaseParams(PREFIX));
      syncChordVoices();
    });
  }

  rebuildAllKeyboards();
  setKeyboardLayout('linear');
  syncKeyboardModeUi('holdPoly');
}

function wireKeyboardModeControls() {
  const kbdPolyMono = document.getElementById('sc7-kbd-polyphony-mono');
  const kbdPolyPoly = document.getElementById('sc7-kbd-polyphony-poly');
  if (kbdPolyMono && !kbdPolyMono.dataset.sc7Wired) {
    kbdPolyMono.dataset.sc7Wired = '1';
    kbdPolyMono.addEventListener('click', () => setKeyboardMode('hold'));
  }
  if (kbdPolyPoly && !kbdPolyPoly.dataset.sc7Wired) {
    kbdPolyPoly.dataset.sc7Wired = '1';
    kbdPolyPoly.addEventListener('click', () => setKeyboardMode('holdPoly'));
  }

  const kbdHold = document.getElementById('sc7-kbd-mode-hold');
  const kbdLatch = document.getElementById('sc7-kbd-mode-latch');
  const kbdHoldPoly = document.getElementById('sc7-kbd-mode-hold-poly');
  const kbdLatchPoly = document.getElementById('sc7-kbd-mode-latch-poly');
  if (kbdHold && !kbdHold.dataset.sc7Wired) {
    kbdHold.dataset.sc7Wired = '1';
    kbdHold.addEventListener('click', () => setKeyboardMode('hold'));
  }
  if (kbdLatch && !kbdLatch.dataset.sc7Wired) {
    kbdLatch.dataset.sc7Wired = '1';
    kbdLatch.addEventListener('click', () => setKeyboardMode('latch'));
  }
  if (kbdHoldPoly && !kbdHoldPoly.dataset.sc7Wired) {
    kbdHoldPoly.dataset.sc7Wired = '1';
    kbdHoldPoly.addEventListener('click', () => setKeyboardMode('holdPoly'));
  }
  if (kbdLatchPoly && !kbdLatchPoly.dataset.sc7Wired) {
    kbdLatchPoly.dataset.sc7Wired = '1';
    kbdLatchPoly.addEventListener('click', () => setKeyboardMode('latchPoly'));
  }
}

function wireKeyboardLayoutSwitcher() {
  const kbdGroup = document.getElementById('sc7-kbd-mode-group');
  if (kbdGroup && !kbdGroup.dataset.sc7Wired) {
    kbdGroup.dataset.sc7Wired = '1';
    kbdGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sc7-kbd-mode]');
      if (!b) return;
      const mode = /** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */ (b.dataset.sc7KbdMode);
      setKeyboardLayout(mode);
    });
  }
}

function renderChordsTable() {
  const body = document.getElementById('sc7-chords-body');
  if (!body) return;
  body.replaceChildren();
  chordCatalog = getSeventhChordCatalog();

  const qualityLabel = (q) => {
    if (q === 'M') return 'б3';
    if (q === 'm') return 'м3';
    return '';
  };
  const seventhLabel = (q) => {
    if (q === 'M') return 'б7';
    if (q === 'm') return 'м7';
    return '(ум.7 / особ.)';
  };

  for (const ch of chordCatalog) {
    const tr = document.createElement('tr');
    tr.dataset.chordId = ch.id;
    tr.tabIndex = 0;

    const intervalsRuShort = ch.intervals.map((iv) => iv.ruShort).join(', ');
    const semitones = ch.semitonesFromRoot.join(', ');

    const cols = [
      ch.ruShort,
      ch.id,
      intervalsRuShort,
      semitones,
      qualityLabel(ch.thirdQuality),
      seventhLabel(ch.seventhQuality),
      ch.nameRu,
    ];

    for (const value of cols) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    }

    body.appendChild(tr);
  }

  const setActive = (tr) => {
    for (const row of body.querySelectorAll('tr')) {
      row.classList.toggle('sc7-chord-selected', row === tr);
      row.setAttribute('aria-selected', row === tr ? 'true' : 'false');
    }
    const cid = tr.dataset.chordId || null;
    selectedChordId = cid;
    syncChordVoices();
  };

  body.addEventListener('click', (e) => {
    const tr = e.target.closest('tr');
    if (!tr || !body.contains(tr)) return;
    setActive(tr);
  });

  body.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tr = e.target.closest('tr');
    if (!tr || !body.contains(tr)) return;
    e.preventDefault();
    setActive(tr);
  });

  const first = body.querySelector('tr') || null;
  if (first) setActive(first);

  function moveSelection(delta) {
    /** @type {HTMLTableRowElement | null} */
    let current = body.querySelector('tr.sc7-chord-selected');
    if (!current) {
      current = body.querySelector('tr');
      if (!current) return;
    }
    const rows = [...body.querySelectorAll('tr')];
    const idx = rows.indexOf(current);
    if (idx === -1) return;
    let nextIdx = clamp(idx + delta, 0, rows.length - 1);
    const next = rows[nextIdx];
    if (next && next !== current) {
      setActive(next);
      next.focus();
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

function boot() {
  mountCtsToneRail();
  renderChordsTable();
  wireSynth();
  wireKeyboardModeControls();
  wireKeyboardLayoutSwitcher();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

