/**
 * Кварто-квинтовый круг: подписи — аккорды на кольцах; подсветка диатоники тональности из lib/music-theory.js.
 * Выбранные секторы озвучиваются как мажорная или минорная триада (движок tone-gen-engine.mjs).
 */
import {
  CANONICAL_TONIC_BY_PC,
  DEFAULT_A4_HZ,
  diatonicTriadRootPcsInKey,
  frequencyFromNoteNameOctave,
  isSectorTonalityHighlightOn,
  majorIvRootPcSet,
  midiNoteFromPcOctave,
  parseNoteName,
  referenceMajorTonicForIvIvCluster,
} from '../lib/music-theory.js';
import {
  clamp,
  HARMONIC_END,
  HARMONIC_START,
  initToneGenTheory,
  parseVoiceKey,
  ToneGen,
} from './tone-gen-engine.mjs';
import { buildBaseParams, buildPlayPayload, readOctaveRange, readToneGenParams } from './tone-gen-ui-shared.mjs';
import { renderBayanKeyboard } from './bayan-keyboard.mjs';
import { buildLinearKeys, buildPianoKeys } from './keyboard-layouts.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { clearTheoryHighlight, setTheoryPcsHighlight } from './keyboard-theory-highlight.mjs';

initToneGenTheory({
  frequencyFromNoteNameOctave,
  DEFAULT_A4_HZ,
});

const CTS_PREFIX = 'cts-ntg-';

/** @type {'linear' | 'piano' | 'bayiano'} */
let keyboardLayout = 'linear';

/** @type {ToneGen | null} */
let toneEngine = null;
/** @type {ReturnType<typeof createKeyboardSynthController> | null} */
let kbdController = null;
/** @type {Set<string>} */
let prevChordVoiceKeys = new Set();
/** После «Стоп» триады круга не возобновляются, пока пользователь не изменит выбор секторов. */
let chordAudioEnabled = true;
/** Последний сектор, по которому сработал тоггл выделения (для режима «фиксация» на круге). */
let lastLatchSectorId = null;
/** @type {Map<number, Set<string>>} pointerId → голоса удержания на круге */
const holdPointerVoices = new Map();

const state = {
  tonicName: 'C',
  /** 'major' | 'naturalMinor' */
  keyMode: 'major',
  /** 'tonic' | 'toggle' */
  clickMode: 'toggle',
  /** vii° / ii° на спице вне IV–I–V (одно кольцо); по умолчанию только 6 аккордов на 3 спицах */
  showSeventhChord: false,
};

/**
 * Первый токен подписи (до «/»); для «Am» корень после снятия суффикса m у минорного трезвучия.
 * @param {string} raw
 * @returns {number | null} pitch class 0…11
 */
function chordRootPcFromLabel(raw) {
  if (raw == null || raw === '') return null;
  const parts = String(raw)
    .split(/\s*\/\s*/u)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of parts) {
    try {
      return parseNoteName(p).pc;
    } catch {
      try {
        return parseNoteName(p.replace(/m$/i, '').trim()).pc;
      } catch {
        /* continue */
      }
    }
  }
  return null;
}

/**
 * Каноническое имя тоники по подписи сектора (буква ноты корня).
 * @param {string} raw
 * @returns {string | null}
 */
function firstTonicNameFromLabelRaw(raw) {
  const pc = chordRootPcFromLabel(raw);
  if (pc == null) return null;
  return CANONICAL_TONIC_BY_PC[pc];
}

function tonicToCanonical(name) {
  try {
    const pc = parseNoteName(name).pc;
    return CANONICAL_TONIC_BY_PC[pc];
  } catch {
    return name;
  }
}

/**
 * @param {string} raw
 * @param {string} kind 'major' | 'minor' из разметки сектора
 * @returns {{ tonicName: string, keyMode: 'major' | 'naturalMinor' } | null}
 */
function keyFromSectorLabel(raw, kind) {
  const tonicName = firstTonicNameFromLabelRaw(raw);
  if (!tonicName) return null;
  const keyMode = kind === 'major' ? 'major' : 'naturalMinor';
  return { tonicName, keyMode };
}

/**
 * Имена ступеней мажорной или минорной триады в канонической энгармонике (как CANONICAL_TONIC_BY_PC).
 * @param {number} rootPc
 * @param {'major' | 'minor'} sectorKind
 */
function triadCanonicalNames(rootPc, sectorKind) {
  const thirdPc = sectorKind === 'major' ? (rootPc + 4) % 12 : (rootPc + 3) % 12;
  const fifthPc = (rootPc + 7) % 12;
  return [
    CANONICAL_TONIC_BY_PC[rootPc],
    CANONICAL_TONIC_BY_PC[thirdPc],
    CANONICAL_TONIC_BY_PC[fifthPc],
  ];
}

/**
 * Закрытая позиция: MIDI корня в заданной октаве, терция и квинта вверх.
 * @param {number} rootPc
 * @param {'major' | 'minor'} sectorKind
 * @param {number} rootOctave
 */
function triadMidiNotes(rootPc, sectorKind, rootOctave) {
  const r = midiNoteFromPcOctave(rootPc, rootOctave);
  const third = sectorKind === 'major' ? 4 : 3;
  return [r, r + third, r + 7];
}

/**
 * @param {number} midi
 * @returns {{ name: string, octave: number }}
 */
function noteNameOctaveFromMidi(midi) {
  const m = Math.round(midi);
  const pc = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return { name: CANONICAL_TONIC_BY_PC[pc], octave };
}

function chordVoiceMapKey(sectorId, name, octave) {
  return `cts:${sectorId}|${name}|${octave}`;
}

/**
 * Ключи полифонии для триады сектора (как в syncChordAudioAndList).
 * @param {SVGGElement} g
 * @returns {Set<string> | null}
 */
function triadVoiceKeysForSectorG(g) {
  const raw = g.dataset.labelRaw ?? '';
  const sectorKind = g.dataset.kind === 'major' ? 'major' : 'minor';
  const sectorId = `${g.dataset.kind}-${g.dataset.index}`;
  const rootPc = chordRootPcFromLabel(raw);
  if (rootPc == null) return null;
  const rootOctave = getChordRootOctaveClamped();
  const midis = triadMidiNotes(rootPc, sectorKind, rootOctave);
  const keys = new Set();
  for (const midi of midis) {
    const { name, octave } = noteNameOctaveFromMidi(midi);
    keys.add(chordVoiceMapKey(sectorId, name, octave));
  }
  return keys;
}

/**
 * Подсветка диатоники: три спицы IV–I–V по внешним корням опорного мажора (см. docs/music-theory.md);
 * на каждой — оба кольца с диатоническим корнем (6 аккордов). Опционально — седьмая триада вне тройки.
 * @param {SVGElement} svg
 */
function applyTonalityHighlight(svg) {
  let diatonicPcs;
  let ivIvPcs;
  try {
    diatonicPcs = diatonicTriadRootPcsInKey(state.tonicName, state.keyMode);
    const refMajor = referenceMajorTonicForIvIvCluster(state.tonicName, state.keyMode);
    ivIvPcs = majorIvRootPcSet(refMajor);
  } catch {
    for (const g of svg.querySelectorAll('.cof-sector')) {
      g.classList.remove('is-in-scale');
    }
    return;
  }

  /** @type {Set<string>} */
  const t3Indices = new Set();
  for (const g of svg.querySelectorAll('.cof-sector')) {
    if (g.dataset.kind !== 'major') continue;
    const idx = g.dataset.index;
    const raw = g.dataset.labelRaw;
    if (idx == null || raw == null) continue;
    const rootPc = chordRootPcFromLabel(raw);
    if (rootPc != null && ivIvPcs.has(rootPc)) t3Indices.add(idx);
  }

  /** @type {Set<number>} */
  const coveredPcs = new Set();
  for (const g of svg.querySelectorAll('.cof-sector')) {
    const idx = g.dataset.index;
    const raw = g.dataset.labelRaw;
    if (idx == null || raw == null || !t3Indices.has(idx)) continue;
    const rootPc = chordRootPcFromLabel(raw);
    if (rootPc != null && diatonicPcs.has(rootPc)) coveredPcs.add(rootPc);
  }

  for (const g of svg.querySelectorAll('.cof-sector')) {
    const idx = g.dataset.index ?? '';
    const raw = g.dataset.labelRaw;
    const rootPc = raw == null ? null : chordRootPcFromLabel(raw);
    const on = isSectorTonalityHighlightOn({
      diatonicPcs,
      t3Indices,
      coveredPcs,
      showSeventhChord: state.showSeventhChord,
      sectorIndex: idx,
      rootPc,
    });
    g.classList.toggle('is-in-scale', on);
  }
  syncKeyboardTheoryHighlight();
}

function setExclusivePressed(container, activeEl) {
  for (const el of container.querySelectorAll('[aria-pressed]')) {
    el.setAttribute('aria-pressed', el === activeEl ? 'true' : 'false');
  }
}

function syncTonicUI() {
  const wrap = document.getElementById('cts-tonic-group');
  if (!wrap) return;
  const canonical = tonicToCanonical(state.tonicName);
  const btn = wrap.querySelector(`[data-tonic="${canonical}"]`);
  if (btn) setExclusivePressed(wrap, btn);
}

function syncKeyModeUI() {
  const wrap = document.getElementById('cts-key-mode-group');
  if (!wrap) return;
  const btn = wrap.querySelector(`[data-key-mode="${state.keyMode}"]`);
  if (btn) setExclusivePressed(wrap, btn);
}

function syncClickModeUI() {
  const wrap = document.getElementById('cts-click-mode');
  if (!wrap) return;
  const active = wrap.querySelector(`[data-click-mode="${state.clickMode}"]`);
  if (active) setExclusivePressed(wrap, active);
}

function getChordRootOctaveClamped() {
  const input = document.getElementById('cts-chord-root-octave');
  let o = Number(input?.value);
  if (!Number.isFinite(o)) o = 4;
  o = Math.round(o);
  try {
    const { octaveMin, octaveMax } = readOctaveRange(CTS_PREFIX);
    return clamp(o, octaveMin, octaveMax);
  } catch {
    return clamp(o, 0, 8);
  }
}

function getKeyboardStage() {
  return document.getElementById('cts-keyboard-stage');
}

/** Корневой узел активной раскладки для подсветки (linear / piano / bayiano). */
function getActiveKeyHighlightScope() {
  if (keyboardLayout === 'linear') return document.getElementById('cts-keys-linear');
  if (keyboardLayout === 'piano') return document.getElementById('cts-keys-piano');
  if (keyboardLayout === 'bayiano') return document.getElementById('cts-bayan-wrap');
  return null;
}

/** Слой B: pitch class ступеней гаммы выбранной тональности на видимой клавиатуре. */
function syncKeyboardTheoryHighlight() {
  for (const id of ['cts-keys-linear', 'cts-keys-piano', 'cts-bayan-wrap']) {
    const el = document.getElementById(id);
    if (el) clearTheoryHighlight(el);
  }
  const scope = getActiveKeyHighlightScope();
  if (!scope) return;
  try {
    const pcs = diatonicTriadRootPcsInKey(state.tonicName, state.keyMode);
    setTheoryPcsHighlight(scope, pcs);
  } catch {
    /* */
  }
}

/**
 * @param {'linear' | 'piano' | 'bayiano'} mode
 */
function setKeyboardLayout(mode) {
  if (mode !== 'linear' && mode !== 'piano' && mode !== 'bayiano') return;
  keyboardLayout = mode;
  const linear = document.getElementById('cts-keys-linear');
  const piano = document.getElementById('cts-keys-piano');
  const bay = document.getElementById('cts-keys-bayiano');
  const group = document.getElementById('cts-kbd-mode-group');
  if (linear) linear.hidden = mode !== 'linear';
  if (piano) piano.hidden = mode !== 'piano';
  if (bay) bay.hidden = mode !== 'bayiano';
  if (group) {
    for (const btn of group.querySelectorAll('[data-cts-kbd-mode]')) {
      btn.setAttribute('aria-pressed', btn.dataset.ctsKbdMode === mode ? 'true' : 'false');
    }
  }
  clearPianoPointerVisual();
  kbdController?.syncExecutionHighlight();
  syncKeyboardTheoryHighlight();
}

/** Голоса клавиатуры: не с префиксом `cts:` (триады круга). */
function clearPianoPointerVisual() {
  const stage = getKeyboardStage();
  if (!stage) return;
  for (const b of stage.querySelectorAll('.cts-play-key.ntg-key-down')) {
    b.classList.remove('ntg-key-down');
  }
}

function stopNonCirclePolyAndMonoForPianoResync() {
  if (!toneEngine) return;
  toneEngine.stopMonoImmediate();
  for (const k of [...toneEngine.polyVoices.keys()]) {
    if (!k.startsWith('cts:')) toneEngine.stopPolyVoiceSmooth(k);
  }
}

function rebuildLinearKeyRows() {
  const keysWrap = document.querySelector('#cts-keys-linear .ntg-keys-wrap');
  if (!keysWrap) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(CTS_PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  buildLinearKeys(keysWrap, {
    octaveMin,
    octaveMax,
    keyButtonClass: 'ntg-key cts-play-key',
  });
}

function rebuildPianoKeyboardLayout() {
  const kb = document.querySelector('#cts-keys-piano .cts-piano-keyboard');
  if (!kb) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(CTS_PREFIX));
  } catch {
    octaveMin = 3;
    octaveMax = 6;
  }
  buildPianoKeys(kb, { octaveMin, octaveMax });
}

function rebuildBayanKeyboardLayout() {
  const wrap = document.getElementById('cts-bayan-wrap');
  if (!wrap) return;
  let octaveMin;
  let octaveMax;
  try {
    ({ octaveMin, octaveMax } = readOctaveRange(CTS_PREFIX));
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

function rebuildAllKeyboards() {
  rebuildLinearKeyRows();
  rebuildPianoKeyboardLayout();
  rebuildBayanKeyboardLayout();
  kbdController?.bindKeys();
  kbdController?.syncExecutionHighlight();
  syncKeyboardTheoryHighlight();
}

/**
 * Список нот под кругом и синхрон звука триад с выделением секторов.
 * @param {SVGSVGElement} svg
 */
function syncChordAudioAndList(svg) {
  const listEl = document.getElementById('cts-chord-notes');
  const rootOctave = getChordRootOctaveClamped();

  const selected = svg.querySelectorAll('.cof-sector.is-selected');
  /** @type {Set<string>} полифония по всем выделенным секторам (база для latchPoly) */
  const selectionKeysAll = new Set();
  /** @type {string[]} */
  const lineHtml = [];

  for (const g of selected) {
    const raw = g.dataset.labelRaw ?? '';
    const sectorKind = g.dataset.kind === 'major' ? 'major' : 'minor';
    const sectorId = `${g.dataset.kind}-${g.dataset.index}`;
    const rootPc = chordRootPcFromLabel(raw);

    if (rootPc == null) {
      lineHtml.push(
        `<p class="cts-chord-line cts-chord-line--warn"><span class="cts-chord-label">?</span> — не удалось извлечь корень из подписи</p>`,
      );
      continue;
    }

    const names = triadCanonicalNames(rootPc, sectorKind);
    const midis = triadMidiNotes(rootPc, sectorKind, rootOctave);
    const rootLabel = names[0];
    lineHtml.push(
      `<p class="cts-chord-line"><strong class="cts-chord-root">${rootLabel}</strong> — ${names.join(' ')}</p>`,
    );

    for (let i = 0; i < 3; i++) {
      const { name, octave } = noteNameOctaveFromMidi(midis[i]);
      selectionKeysAll.add(chordVoiceMapKey(sectorId, name, octave));
    }
  }

  if (listEl) {
    if (lineHtml.length === 0) {
      listEl.innerHTML = '';
      listEl.hidden = true;
    } else {
      listEl.hidden = false;
      listEl.innerHTML = lineHtml.join('');
    }
  }

  if (!toneEngine) return;

  /** @type {Set<string>} */
  let nextKeys;
  if (toneEngine.mode === 'hold') {
    nextKeys = new Set();
  } else if (toneEngine.mode === 'latch') {
    nextKeys = new Set();
    if (lastLatchSectorId != null) {
      for (const g of selected) {
        if (`${g.dataset.kind}-${g.dataset.index}` === lastLatchSectorId) {
          const k = triadVoiceKeysForSectorG(g);
          if (k) nextKeys = new Set(k);
          break;
        }
      }
    }
  } else {
    nextKeys = selectionKeysAll;
  }

  if (chordAudioEnabled) {
    for (const key of prevChordVoiceKeys) {
      if (!nextKeys.has(key)) toneEngine.stopPolyVoiceSmooth(key);
    }
    for (const key of nextKeys) {
      if (!prevChordVoiceKeys.has(key)) {
        const { name, octave } = parseVoiceKey(key);
        toneEngine.startPolyVoice({
          ...buildPlayPayload(CTS_PREFIX, name, octave),
          mapKey: key,
        });
      }
    }
    prevChordVoiceKeys = new Set(nextKeys);
  } else {
    for (const key of prevChordVoiceKeys) {
      toneEngine.stopPolyVoiceSmooth(key);
    }
    prevChordVoiceKeys.clear();
  }
  refreshToneRailStatus();
}

function updateToneRailStatusText() {
  const status = document.getElementById('cts-ntg-status');
  if (!status || !toneEngine) return;
  try {
    const p = readToneGenParams(CTS_PREFIX);
    const n = toneEngine.polyVoiceCount();
    if (n > 0) {
      const bits = [];
      for (const key of [...toneEngine.polyVoices.keys()].sort()) {
        const { name, octave } = parseVoiceKey(key);
        const hz = toneEngine.getFreq(name, octave, p.a4Hz);
        bits.push(`${name}${octave} (${hz.toFixed(1)} Гц)`);
      }
      status.textContent = `Играют (${n}): ${bits.join('; ')}`;
    } else if (toneEngine.monoVoice && toneEngine.latchedKey) {
      const { name, octave } = parseVoiceKey(toneEngine.latchedKey);
      const hz = toneEngine.getFreq(name, octave, p.a4Hz);
      status.textContent = `${name}${octave} — ${hz.toFixed(2)} Гц`;
    } else {
      status.textContent = 'Тишина';
    }
  } catch {
    status.textContent = '—';
  }
}

function refreshToneRailStatus() {
  const status = document.getElementById('cts-ntg-status');
  if (!status || !toneEngine) {
    kbdController?.syncExecutionHighlight();
    return;
  }
  updateToneRailStatusText();
  kbdController?.syncExecutionHighlight();
}

function wireToneRail() {
  const harmWrap = document.getElementById(`${CTS_PREFIX}harmonics`);
  if (!harmWrap || harmWrap.dataset.ctsHarmWired) return;
  harmWrap.dataset.ctsHarmWired = '1';

  for (let n = 1; n <= HARMONIC_END; n++) {
    const lab = document.createElement('label');
    lab.className = 'ntg-harm-toggle';
    if (n === 1) {
      lab.innerHTML =
        '<input type="checkbox" data-partial="1" checked /> n=1 (основной тон, форма колебания)';
    } else {
      lab.innerHTML = `<input type="checkbox" data-partial="${n}" /> n=${n}`;
      if (n <= 6) lab.querySelector('input').checked = true;
    }
    harmWrap.appendChild(lab);
  }

  toneEngine = new ToneGen();
  toneEngine.mode = 'latchPoly';

  kbdController = createKeyboardSynthController({
    getPointerRoot: getKeyboardStage,
    getClearRoot: getKeyboardStage,
    getHighlightRoot: getActiveKeyHighlightScope,
    keySelector: '.cts-play-key',
    engine: toneEngine,
    buildPlayPayload: (name, octave) => buildPlayPayload(CTS_PREFIX, name, octave),
    onChange: updateToneRailStatusText,
  });

  const $ = (suffix) => {
    const id = `${CTS_PREFIX}${suffix}`;
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id}`);
    return el;
  };

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  function updateIfPlaying() {
    if (!toneEngine) return;
    toneEngine.updateAllPlaying(buildBaseParams(CTS_PREFIX));
    refreshToneRailStatus();
  }

  function applyVolumeFromUi() {
    if (!toneEngine) return;
    const p = readToneGenParams(CTS_PREFIX);
    toneEngine.setOutputLinear(p.volume);
  }

  function stopAllSound() {
    if (!toneEngine) return;
    clearPianoPointerVisual();
    toneEngine.stopMonoSmooth();
    toneEngine.stopAllPolySmooth();
    toneEngine.setLatchedKeyForMono(null);
    prevChordVoiceKeys.clear();
    holdPointerVoices.clear();
    chordAudioEnabled = false;
    refreshToneRailStatus();
  }

  $('volume').addEventListener('input', () => {
    document.getElementById(`${CTS_PREFIX}vol-val`).textContent = String(
      /** @type {HTMLInputElement} */ ($('volume')).value,
    );
    applyVolumeFromUi();
  });
  $('detune').addEventListener('input', () => {
    document.getElementById(`${CTS_PREFIX}detune-val`).textContent = String(
      /** @type {HTMLInputElement} */ ($('detune')).value,
    );
    updateIfPlaying();
  });
  $('harm-mix').addEventListener('input', () => {
    document.getElementById(`${CTS_PREFIX}harm-mix-val`).textContent = String(
      /** @type {HTMLInputElement} */ ($('harm-mix')).value,
    );
    updateIfPlaying();
  });
  $('harm-rolloff').addEventListener('input', () => {
    document.getElementById(`${CTS_PREFIX}harm-rolloff-val`).textContent = String(
      /** @type {HTMLInputElement} */ ($('harm-rolloff')).value,
    );
    updateIfPlaying();
  });
  $('release-ms').addEventListener('input', () => {
    const ms = Number(/** @type {HTMLInputElement} */ ($('release-ms')).value);
    document.getElementById(`${CTS_PREFIX}release-ms-val`).textContent = formatReleaseLabel(ms);
    updateIfPlaying();
  });
  $('waveform').addEventListener('change', () => updateIfPlaying());
  $('a4').addEventListener('input', () => updateIfPlaying());

  function clampChordRootOctaveInput() {
    const input = document.getElementById('cts-chord-root-octave');
    if (!input) return;
    const v = getChordRootOctaveClamped();
    /** @type {HTMLInputElement} */ (input).value = String(v);
  }

  $('octave-min').addEventListener('input', () => {
    clampChordRootOctaveInput();
    stopNonCirclePolyAndMonoForPianoResync();
    rebuildAllKeyboards();
    const svg = document.getElementById('cts-circle');
    if (svg) syncChordAudioAndList(svg);
    updateIfPlaying();
  });
  $('octave-max').addEventListener('input', () => {
    clampChordRootOctaveInput();
    stopNonCirclePolyAndMonoForPianoResync();
    rebuildAllKeyboards();
    const svg = document.getElementById('cts-circle');
    if (svg) syncChordAudioAndList(svg);
    updateIfPlaying();
  });

  const rootOctEl = document.getElementById('cts-chord-root-octave');
  if (rootOctEl) {
    rootOctEl.addEventListener('input', () => {
      const svg = document.getElementById('cts-circle');
      if (svg) syncChordAudioAndList(svg);
    });
  }

  harmWrap.addEventListener('change', () => updateIfPlaying());

  const btnHold = $('mode-hold');
  const btnLatch = $('mode-latch');
  const btnLatchPoly = $('mode-latch-poly');

  function setMode(m) {
    if (!toneEngine) return;
    clearPianoPointerVisual();
    toneEngine.mode = m;
    btnHold.setAttribute('aria-pressed', m === 'hold' ? 'true' : 'false');
    btnLatch.setAttribute('aria-pressed', m === 'latch' ? 'true' : 'false');
    btnLatchPoly.setAttribute('aria-pressed', m === 'latchPoly' ? 'true' : 'false');
    toneEngine.setLatchedKeyForMono(null);
    toneEngine.stopMonoSmooth();
    toneEngine.stopAllPolySmooth();
    prevChordVoiceKeys.clear();
    holdPointerVoices.clear();
    chordAudioEnabled = true;
    const svg = document.getElementById('cts-circle');
    if (svg) syncChordAudioAndList(svg);
    refreshToneRailStatus();
  }

  btnHold.addEventListener('click', () => setMode('hold'));
  btnLatch.addEventListener('click', () => setMode('latch'));
  btnLatchPoly.addEventListener('click', () => setMode('latchPoly'));

  $('stop').addEventListener('click', () => stopAllSound());

  const kbdGroup = document.getElementById('cts-kbd-mode-group');
  if (kbdGroup && !kbdGroup.dataset.ctsWired) {
    kbdGroup.dataset.ctsWired = '1';
    kbdGroup.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cts-kbd-mode]');
      if (!b) return;
      const mode = /** @type {'linear' | 'piano' | 'bayiano'} */ (b.dataset.ctsKbdMode);
      setKeyboardLayout(mode);
    });
  }

  clampChordRootOctaveInput();
  applyVolumeFromUi();
  rebuildAllKeyboards();
  setKeyboardLayout('linear');
  updateIfPlaying();
  wireCircleHoldPointers();
  refreshToneRailStatus();
}

function releaseHoldPointer(pointerId) {
  const keys = holdPointerVoices.get(pointerId);
  if (!keys || !toneEngine) {
    holdPointerVoices.delete(pointerId);
    return;
  }
  holdPointerVoices.delete(pointerId);
  for (const key of keys) {
    toneEngine.stopPolyVoiceSmooth(key);
  }
  refreshToneRailStatus();
}

/** Удержание на круге: pointerdown/up по секторам (клавиши круга). */
function wireCircleHoldPointers() {
  const svg = document.getElementById('cts-circle');
  if (!svg || svg.dataset.ctsHoldWired === '1') return;
  svg.dataset.ctsHoldWired = '1';

  svg.addEventListener('pointerdown', (e) => {
    if (!toneEngine || toneEngine.mode !== 'hold') return;
    if (!chordAudioEnabled) {
      return;
    }
    const g = e.target.closest?.('.cof-sector');
    if (!g || !svg.contains(g)) return;
    const keys = triadVoiceKeysForSectorG(g);
    if (!keys || keys.size === 0) return;
    try {
      g.setPointerCapture(e.pointerId);
    } catch {
      /* */
    }
    holdPointerVoices.set(e.pointerId, keys);
    for (const key of keys) {
      const { name, octave } = parseVoiceKey(key);
      toneEngine.startPolyVoice({
        ...buildPlayPayload(CTS_PREFIX, name, octave),
        mapKey: key,
      });
    }
    refreshToneRailStatus();
  });

  const onPointerEnd = (e) => {
    if (!holdPointerVoices.has(e.pointerId)) return;
    releaseHoldPointer(e.pointerId);
  };
  svg.addEventListener('pointerup', onPointerEnd, true);
  svg.addEventListener('pointercancel', onPointerEnd, true);
  svg.addEventListener('lostpointercapture', (e) => {
    if (holdPointerVoices.has(e.pointerId)) releaseHoldPointer(e.pointerId);
  });
}

function redraw() {
  const svg = document.getElementById('cts-circle');
  const majorEl = document.getElementById('cts-major-line');
  const minorEl = document.getElementById('cts-minor-line');
  const drawer = window.CircleOfFifthsDrawer;
  if (!svg || !majorEl || !minorEl || !drawer || typeof drawer.draw !== 'function') return;

  drawer.draw(svg, [majorEl.value, minorEl.value], {
    onSectorActivate(g, e) {
      if (state.clickMode !== 'tonic') return true;
      if (e.type !== 'click') return true;
      const kind = g.dataset.kind;
      const parsed = keyFromSectorLabel(g.dataset.labelRaw, kind);
      if (parsed) {
        state.tonicName = parsed.tonicName;
        state.keyMode = parsed.keyMode;
        syncTonicUI();
        syncKeyModeUI();
        applyTonalityHighlight(svg);
      }
      return false;
    },
    getSectorSelectionMode() {
      return toneEngine && toneEngine.mode === 'latch' ? 'exclusive' : 'toggle';
    },
    onSectorSelectionChange(svgEl, g) {
      chordAudioEnabled = true;
      lastLatchSectorId = `${g.dataset.kind}-${g.dataset.index}`;
      syncChordAudioAndList(svgEl);
    },
    afterDraw(svgEl) {
      applyTonalityHighlight(svgEl);
      syncChordAudioAndList(svgEl);
    },
  });
}

function initTheoryPanel() {
  const tonicWrap = document.getElementById('cts-tonic-group');
  if (tonicWrap && !tonicWrap.dataset.ctsWired) {
    tonicWrap.dataset.ctsWired = '1';
    tonicWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tonic]');
      if (!b) return;
      state.tonicName = b.dataset.tonic;
      setExclusivePressed(tonicWrap, b);
      applyTonalityHighlight(document.getElementById('cts-circle'));
    });
  }

  const keyModeWrap = document.getElementById('cts-key-mode-group');
  if (keyModeWrap && !keyModeWrap.dataset.ctsWired) {
    keyModeWrap.dataset.ctsWired = '1';
    keyModeWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-key-mode]');
      if (!b) return;
      state.keyMode = b.dataset.keyMode;
      setExclusivePressed(keyModeWrap, b);
      applyTonalityHighlight(document.getElementById('cts-circle'));
    });
  }

  const modeWrap = document.getElementById('cts-click-mode');
  if (modeWrap && !modeWrap.dataset.ctsWired) {
    modeWrap.dataset.ctsWired = '1';
    modeWrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-click-mode]');
      if (!b) return;
      state.clickMode = b.dataset.clickMode;
      setExclusivePressed(modeWrap, b);
    });
  }

  const seventhEl = document.getElementById('cts-highlight-seventh');
  if (seventhEl && !seventhEl.dataset.ctsWired) {
    seventhEl.dataset.ctsWired = '1';
    seventhEl.checked = state.showSeventhChord;
    seventhEl.addEventListener('change', () => {
      state.showSeventhChord = seventhEl.checked;
      applyTonalityHighlight(document.getElementById('cts-circle'));
    });
  }

  syncTonicUI();
  syncKeyModeUI();
  syncClickModeUI();
}

function boot() {
  const majorEl = document.getElementById('cts-major-line');
  const minorEl = document.getElementById('cts-minor-line');
  const drawer = window.CircleOfFifthsDrawer;
  if (!majorEl || !minorEl || !drawer) return;

  if (!majorEl.value.trim()) majorEl.value = drawer.DEFAULT_MAJOR_LINE;
  if (!minorEl.value.trim()) minorEl.value = drawer.DEFAULT_MINOR_LINE;

  initTheoryPanel();
  try {
    wireToneRail();
  } catch (e) {
    console.error(e);
  }

  window.__ctsRedraw = redraw;
  redraw();

  window.__ctsTheoryLoaded = true;
  const warn = document.getElementById('cts-theory-warning');
  if (warn) warn.hidden = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
