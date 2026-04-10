/**
 * Страница интервалов: таблица 0–12 полутонов и клавиатура (linear / piano / bayiano / bayiano4).
 * Переиспользует ToneGen, synth-kit, keyboard-layouts и keyboard-synth-controller с circle-scales.
 */
import {
  CHROMATIC_NAMES_SHARP_BY_PC,
  DEFAULT_A4_HZ,
  frequencyFromNoteNameOctave,
  getIntervalCatalog,
  midiNoteFromPcOctave,
  parseNoteName,
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

const PREFIX = 'ivd-ntg-';

/** @type {ToneGen | null} */
let toneEngine = null;
/** @type {ReturnType<typeof createKeyboardSynthController> | null} */
let kbdController = null;

/** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */
let keyboardLayout = 'linear';

/** Текущий интервал в полутонах (0…12). */
let selectedSemitones = 0;

/** Ключи базовых голосов (клавиатура), без добавочных интервалов. @type {Set<string>} */
let prevBaseKeys = new Set();
/** База → множество ключей голосов второй ноты интервала. @type {Map<string, Set<string>>} */
const intervalVoicesByBase = new Map();

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

function getKeyboardStage() {
  return /** @type {HTMLElement | null} */ (document.getElementById('ivd-keyboard-stage'));
}

function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('ivd-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('ivd-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('ivd-bayan-wrap');
  if (keyboardLayout === 'bayiano4') return document.getElementById('ivd-bayan4-wrap');
  return null;
}

function noteNameOctaveFromMidi(midi) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: CHROMATIC_NAMES_SHARP_BY_PC[pc], octave };
}

function clearIntervalHighlights() {
  const root = getActiveKeyHighlightScope();
  if (!root) return;
  for (const el of root.querySelectorAll('.ivd-interval-target')) {
    el.classList.remove('ivd-interval-target');
  }
}

function applyIntervalHighlights(baseKeys) {
  const root = getActiveKeyHighlightScope();
  if (!root || !toneEngine) return;
  if (!Number.isFinite(selectedSemitones)) return;
  const semis = clamp(Number(selectedSemitones) || 0, 0, 12);
  if (semis === 0) return;

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
    const target = noteNameOctaveFromMidi(baseMidi + semis);
    const btn = root.querySelector(
      `.cts-play-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"],` +
        `.ntg-key[data-note="${CSS.escape(target.name)}"][data-octave="${String(target.octave)}"]`,
    );
    if (btn) btn.classList.add('ivd-interval-target');
  }
}

function syncIntervalVoices() {
  if (!toneEngine) return;
  const allKeys = [...toneEngine.polyVoices.keys()];
  const baseKeys = new Set(allKeys.filter((k) => !k.startsWith('ivd:')));

  // Остановить интервал-голоса для баз, которых больше нет.
  for (const [base, ivSet] of intervalVoicesByBase.entries()) {
    if (!baseKeys.has(base)) {
      for (const ivKey of ivSet) {
        toneEngine.stopPolyVoiceSmooth(ivKey);
      }
      intervalVoicesByBase.delete(base);
    }
  }

  const semis = clamp(Number(selectedSemitones) || 0, 0, 12);

  // Новые базовые голоса → добавить вторые ноты.
  for (const base of baseKeys) {
    if (prevBaseKeys.has(base)) continue;
    if (semis === 0) continue;

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
    const target = noteNameOctaveFromMidi(baseMidi + semis);
    const ivKey = `ivd:${voiceKey(target.name, target.octave)}|${base}`;

    const payload = {
      ...buildPlayPayload(PREFIX, target.name, target.octave),
      mapKey: ivKey,
    };
    toneEngine.startPolyVoice(payload);

    let set = intervalVoicesByBase.get(base);
    if (!set) {
      set = new Set();
      intervalVoicesByBase.set(base, set);
    }
    set.add(ivKey);
  }

  prevBaseKeys = baseKeys;
  clearIntervalHighlights();
  applyIntervalHighlights(baseKeys);
}

function syncKeyboardModeUi(m) {
  const monoPoly = document.getElementById('ivd-kbd-polyphony-mono');
  const polyPoly = document.getElementById('ivd-kbd-polyphony-poly');
  const monoArt = document.getElementById('ivd-kbd-articulation-mono');
  const polyArt = document.getElementById('ivd-kbd-articulation-poly');
  const h = document.getElementById('ivd-kbd-mode-hold');
  const l = document.getElementById('ivd-kbd-mode-latch');
  const hp = document.getElementById('ivd-kbd-mode-hold-poly');
  const lp = document.getElementById('ivd-kbd-mode-latch-poly');
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
  clearIntervalHighlights();
  syncIntervalVoices();
}

function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano' && mode !== 'bayiano4') return;
  keyboardLayout = mode;
  const linear = document.getElementById('ivd-keys-linear');
  const piano = document.getElementById('ivd-keys-piano');
  const bay = document.getElementById('ivd-keys-bayiano');
  const bay4 = document.getElementById('ivd-keys-bayiano4');
  const group = document.getElementById('ivd-kbd-mode-group');
  if (linear) linear.hidden = mode !== 'linear';
  if (piano) piano.hidden = mode !== 'piano';
  if (bay) bay.hidden = mode !== 'bayiano';
  if (bay4) bay4.hidden = mode !== 'bayiano4';
  if (group) {
    for (const btn of group.querySelectorAll('[data-ivd-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.dataset.ivdKbdMode === mode ? 'true' : 'false');
    }
  }
  clearIntervalHighlights();
  kbdController?.syncExecutionHighlight();
}

function rebuildLinearKeys() {
  const keysWrap = document.querySelector('#ivd-keys-linear .ntg-keys-wrap');
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
  const kb = document.querySelector('#ivd-keys-piano .cts-piano-keyboard');
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
  const wrap = document.getElementById('ivd-bayan-wrap');
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
  const wrap = document.getElementById('ivd-bayan4-wrap');
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
  clearIntervalHighlights();
  syncIntervalVoices();
}

function wireSynth() {
  const harmWrap = document.getElementById(`${PREFIX}harmonics`);
  if (!harmWrap || harmWrap.dataset.ivdHarmWired) return;
  harmWrap.dataset.ivdHarmWired = '1';

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  function updateIfPlaying() {
    if (!toneEngine) return;
    toneEngine.updateAllPlaying(buildBaseParams(PREFIX));
    syncIntervalVoices();
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
    includeVoiceInHighlight: (key) => !key.startsWith('ivd:'),
    onChange: () => {
      syncIntervalVoices();
    },
  });

  kbdController.bindComputerKeyboard({
    getLayout: () => keyboardLayout,
    getPianoCodeMap: () => {
      const extra = { namesByPc: CHROMATIC_NAMES_SHARP_BY_PC };
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        return createPianoCodeMap(octaveMin, octaveMax, extra);
      } catch {
        return createPianoCodeMap(3, 6, extra);
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
      const extra = { rowCount: rc, namesByPc: CHROMATIC_NAMES_SHARP_BY_PC };
      try {
        const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
        const midiMin = midiNoteFromPcOctave(0, octaveMin);
        const midiMax = midiNoteFromPcOctave(11, octaveMax);
        return createBayanCodeMap(midiMin, midiMax, extra);
      } catch {
        return createBayanCodeMap(
          midiNoteFromPcOctave(0, 3),
          midiNoteFromPcOctave(11, 6),
          extra,
        );
      }
    },
  });

  const stopBtn = document.getElementById('ivd-ntg-stop');
  if (stopBtn && !stopBtn.dataset.ivdStopWired) {
    stopBtn.dataset.ivdStopWired = '1';
    stopBtn.addEventListener('click', () => {
      if (!toneEngine) return;
      toneEngine.stopMonoSmooth();
      toneEngine.stopAllPolySmooth();
      toneEngine.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      intervalVoicesByBase.clear();
      clearIntervalHighlights();
    });
  }

  const octMinEl = document.getElementById('ivd-ntg-octave-min');
  const octMaxEl = document.getElementById('ivd-ntg-octave-max');
  if (octMinEl && !octMinEl.dataset.ivdOctWired) {
    octMinEl.dataset.ivdOctWired = '1';
    octMinEl.addEventListener('input', () => {
      toneEngine?.stopMonoImmediate();
      toneEngine?.stopAllPolyImmediate();
      toneEngine?.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      intervalVoicesByBase.clear();
      rebuildAllKeyboards();
    });
  }
  if (octMaxEl && !octMaxEl.dataset.ivdOctWired) {
    octMaxEl.dataset.ivdOctWired = '1';
    octMaxEl.addEventListener('input', () => {
      toneEngine?.stopMonoImmediate();
      toneEngine?.stopAllPolyImmediate();
      toneEngine?.setLatchedKeyForMono(null);
      prevBaseKeys.clear();
      intervalVoicesByBase.clear();
      rebuildAllKeyboards();
    });
  }

  const wf = document.getElementById('ivd-ntg-waveform');
  const a4 = document.getElementById('ivd-ntg-a4');
  if (wf && !wf.dataset.ivdWired) {
    wf.dataset.ivdWired = '1';
    wf.addEventListener('change', () => {
      toneEngine?.updateAllPlaying(buildBaseParams(PREFIX));
      syncIntervalVoices();
    });
  }
  if (a4 && !a4.dataset.ivdWired) {
    a4.dataset.ivdWired = '1';
    a4.addEventListener('input', () => {
      toneEngine?.updateAllPlaying(buildBaseParams(PREFIX));
      syncIntervalVoices();
    });
  }

  rebuildAllKeyboards();
  setKeyboardLayout('linear');
  syncKeyboardModeUi('holdPoly');
}

function wireKeyboardModeControls() {
  const kbdPolyMono = document.getElementById('ivd-kbd-polyphony-mono');
  const kbdPolyPoly = document.getElementById('ivd-kbd-polyphony-poly');
  if (kbdPolyMono && !kbdPolyMono.dataset.ivdWired) {
    kbdPolyMono.dataset.ivdWired = '1';
    kbdPolyMono.addEventListener('click', () => setKeyboardMode('hold'));
  }
  if (kbdPolyPoly && !kbdPolyPoly.dataset.ivdWired) {
    kbdPolyPoly.dataset.ivdWired = '1';
    kbdPolyPoly.addEventListener('click', () => setKeyboardMode('holdPoly'));
  }

  const kbdHold = document.getElementById('ivd-kbd-mode-hold');
  const kbdLatch = document.getElementById('ivd-kbd-mode-latch');
  const kbdHoldPoly = document.getElementById('ivd-kbd-mode-hold-poly');
  const kbdLatchPoly = document.getElementById('ivd-kbd-mode-latch-poly');
  if (kbdHold && !kbdHold.dataset.ivdWired) {
    kbdHold.dataset.ivdWired = '1';
    kbdHold.addEventListener('click', () => setKeyboardMode('hold'));
  }
  if (kbdLatch && !kbdLatch.dataset.ivdWired) {
    kbdLatch.dataset.ivdWired = '1';
    kbdLatch.addEventListener('click', () => setKeyboardMode('latch'));
  }
  if (kbdHoldPoly && !kbdHoldPoly.dataset.ivdWired) {
    kbdHoldPoly.dataset.ivdWired = '1';
    kbdHoldPoly.addEventListener('click', () => setKeyboardMode('holdPoly'));
  }
  if (kbdLatchPoly && !kbdLatchPoly.dataset.ivdWired) {
    kbdLatchPoly.dataset.ivdWired = '1';
    kbdLatchPoly.addEventListener('click', () => setKeyboardMode('latchPoly'));
  }
}

function wireKeyboardLayoutSwitcher() {
  const kbdGroup = document.getElementById('ivd-kbd-mode-group');
  if (kbdGroup && !kbdGroup.dataset.ivdWired) {
    kbdGroup.dataset.ivdWired = '1';
    kbdGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-ivd-kbd-mode]');
      if (!b) return;
      const mode = /** @type {'linear' | 'piano' | 'bayiano' | 'bayiano4'} */ (b.dataset.ivdKbdMode);
      setKeyboardLayout(mode);
    });
  }
}

function renderIntervalsTable() {
  const body = document.getElementById('ivd-intervals-body');
  if (!body) return;
  body.replaceChildren();
  const catalog = getIntervalCatalog();

  for (const row of catalog) {
    const tr = document.createElement('tr');
    tr.dataset.semitones = String(row.semitones);
    tr.dataset.intervalId = row.id;
    tr.tabIndex = 0;

    const tdSemi = document.createElement('td');
    tdSemi.textContent = String(row.semitones);

    const tdId = document.createElement('td');
    tdId.textContent = row.id;

    const tdShort = document.createElement('td');
    tdShort.textContent = row.ruShort;

    const tdName = document.createElement('td');
    tdName.textContent = row.nameRu;

    tr.appendChild(tdSemi);
    tr.appendChild(tdId);
    tr.appendChild(tdShort);
    tr.appendChild(tdName);

    body.appendChild(tr);
  }

  const setActive = (tr) => {
    for (const row of body.querySelectorAll('tr')) {
      row.classList.toggle('ivd-interval-selected', row === tr);
      row.setAttribute('aria-selected', row === tr ? 'true' : 'false');
    }
    const semi = Number(tr.dataset.semitones);
    selectedSemitones = clamp(Number.isFinite(semi) ? semi : 0, 0, 12);
    syncIntervalVoices();
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

  const first = body.querySelector('tr[data-semitones="0"]') || body.querySelector('tr');
  if (first) setActive(first);

  function moveSelection(delta) {
    /** @type {HTMLTableRowElement | null} */
    let current = body.querySelector('tr.ivd-interval-selected');
    if (!current) {
      current = body.querySelector('tr');
      if (!current) return;
    }
    const rows = [...body.querySelectorAll('tr')];
    const idx = rows.indexOf(current);
    if (idx === -1) return;
    let nextIdx = idx + delta;
    if (nextIdx < 0) nextIdx = 0;
    if (nextIdx >= rows.length) nextIdx = rows.length - 1;
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
  renderIntervalsTable();
  wireSynth();
  wireKeyboardModeControls();
  wireKeyboardLayoutSwitcher();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

