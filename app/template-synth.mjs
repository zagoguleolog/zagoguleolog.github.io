/**
 * Генератор тона: тот же движок и readToneGenParams, что note-tone-gen; UI — synth-kit.
 */
import {
  HARMONIC_END,
  initToneGenTheory,
  parseVoiceKey,
  ToneGen,
} from './tone-gen-engine.mjs';
import { buildLinearKeys } from './keyboard-layouts.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { buildBaseParams, buildPlayPayload, readOctaveRange, readToneGenParams } from './tone-gen-ui-shared.mjs';
import { createCheckboxMatrix } from './synth-kit/checkbox-matrix.mjs';
import { createFader } from './synth-kit/fader.mjs';
import { createKnob } from './synth-kit/knob.mjs';
import { createSegmentDisplay } from './synth-kit/segment-display.mjs';

const PREFIX = 'tpl-';

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

/**
 * @param {string} prefix например tpl-
 * @param {object} handlers
 * @param {() => void} handlers.applyVolumeFromUi
 * @param {() => void} handlers.updateIfPlaying
 * @param {(ms: number) => string} handlers.formatReleaseLabel
 */
export function mountTemplateSynthKit(prefix, handlers) {
  const { applyVolumeFromUi, updateIfPlaying, formatReleaseLabel } = handlers;

  const field = (suffix) => {
    const id = `${prefix}${suffix}`;
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id}`);
    return el;
  };

  const volIn = /** @type {HTMLInputElement} */ (field('volume'));
  const detIn = /** @type {HTMLInputElement} */ (field('detune'));
  const mixIn = /** @type {HTMLInputElement} */ (field('harm-mix'));
  const rollIn = /** @type {HTMLInputElement} */ (field('harm-rolloff'));
  const relIn = /** @type {HTMLInputElement} */ (field('release-ms'));
  const releaseLabelEl = /** @type {HTMLElement} */ (field('release-ms-val'));
  const harmWrap = /** @type {HTMLElement} */ (field('harmonics'));

  const segVol = createSegmentDisplay({
    mount: field('seg-volume'),
    value: Number(volIn.value),
    decimals: 0,
    width: 3,
    id: `${prefix}seg-display-volume`,
  });
  const segDet = createSegmentDisplay({
    mount: field('seg-detune'),
    value: Number(detIn.value),
    decimals: 0,
    width: 3,
    id: `${prefix}seg-display-detune`,
  });
  const segMix = createSegmentDisplay({
    mount: field('seg-harm-mix'),
    value: Number(mixIn.value),
    decimals: 0,
    width: 3,
    id: `${prefix}seg-display-harm-mix`,
  });
  const segRoll = createSegmentDisplay({
    mount: field('seg-harm-rolloff'),
    value: Number(rollIn.value),
    decimals: 2,
    width: 4,
    id: `${prefix}seg-display-harm-rolloff`,
  });

  const knobVol = createKnob({
    mount: field('mount-volume'),
    min: 0,
    max: 100,
    value: Number(volIn.value),
    step: 1,
    label: 'Громкость',
    pixelsPerFullRange: 180,
    id: `${prefix}knob-volume`,
  });
  knobVol.onChange((v) => {
    volIn.value = String(Math.round(v));
    segVol.setValue(v);
    applyVolumeFromUi();
  });

  const knobDet = createKnob({
    mount: field('mount-detune'),
    min: -50,
    max: 50,
    value: Number(detIn.value),
    step: 1,
    label: 'Детун (центы)',
    pixelsPerFullRange: 200,
    id: `${prefix}knob-detune`,
  });
  knobDet.onChange((v) => {
    detIn.value = String(Math.round(v));
    segDet.setValue(v);
    updateIfPlaying();
  });

  const knobMix = createKnob({
    mount: field('mount-harm-mix'),
    min: 0,
    max: 100,
    value: Number(mixIn.value),
    step: 1,
    label: 'Смесь обертонов',
    pixelsPerFullRange: 180,
    id: `${prefix}knob-harm-mix`,
  });
  knobMix.onChange((v) => {
    mixIn.value = String(Math.round(v));
    segMix.setValue(v);
    updateIfPlaying();
  });

  const knobRoll = createKnob({
    mount: field('mount-harm-rolloff'),
    min: 0.3,
    max: 2.5,
    value: Number(rollIn.value),
    step: 0.05,
    label: 'Спад 1/n^x',
    pixelsPerFullRange: 200,
    id: `${prefix}knob-harm-rolloff`,
  });
  knobRoll.onChange((v) => {
    rollIn.value = String(Math.round(v * 100) / 100);
    segRoll.setValue(v);
    updateIfPlaying();
  });

  const faderRel = createFader({
    mount: field('mount-release'),
    min: 20,
    max: 5000,
    value: Number(relIn.value),
    step: 10,
    pixelsPerFullRange: 140,
    label: 'Угасание (мс)',
    id: `${prefix}fader-release`,
  });
  faderRel.onChange((v) => {
    const ms = Math.round(v);
    relIn.value = String(ms);
    releaseLabelEl.textContent = formatReleaseLabel(ms);
    updateIfPlaying();
  });

  const initialHarm = Array.from({ length: HARMONIC_END }, (_, i) => i < 6);
  createCheckboxMatrix({
    mount: harmWrap,
    rows: 4,
    cols: 4,
    initial: initialHarm,
  });

  let partialIdx = 0;
  for (const input of harmWrap.querySelectorAll('.synth-matrix input[type="checkbox"]')) {
    partialIdx += 1;
    /** @type {HTMLInputElement} */ (input).dataset.partial = String(partialIdx);
  }

  harmWrap.addEventListener('change', () => updateIfPlaying());
}

async function main() {
  const warn = $('tpl-module-warning');
  try {
    const m = await import('../lib/music-theory.js');
    initToneGenTheory(m);
  } catch (e) {
    warn.hidden = false;
    warn.textContent =
      'Не удалось загрузить lib/music-theory.js (нужен HTTP-сервер с корректным MIME для ES-модулей). Запустите из каталога music: npm run serve и откройте /app/template-synth.html.';
    console.error(e);
    return;
  }

  const engine = new ToneGen();
  const status = $('tpl-status');
  const keysWrap = $('tpl-keys-wrap');

  function readParams() {
    return readToneGenParams(PREFIX);
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function fmtPlaying(name, octave, hz) {
    return `${name}${octave} — ${hz.toFixed(2)} Гц`;
  }

  /** Статус для режима hold (переключение latch/latchPoly — на note-tone-gen). */
  function refreshStatus() {
    const p = readParams();
    if (!engine.monoVoice || !engine.latchedKey) {
      setStatus('Тишина');
      return;
    }
    const { name, octave } = parseVoiceKey(engine.latchedKey);
    const hz = engine.getFreq(name, octave, p.a4Hz);
    setStatus(fmtPlaying(name, octave, hz));
  }

  function applyVolumeFromUi() {
    const p = readParams();
    engine.setOutputLinear(p.volume);
  }

  const kbd = createKeyboardSynthController({
    getPointerRoot: () => keysWrap,
    getClearRoot: () => keysWrap,
    getHighlightRoot: () => keysWrap,
    keySelector: '.ntg-key',
    engine,
    buildPlayPayload: (name, octave) => buildPlayPayload(PREFIX, name, octave),
    onChange: refreshStatus,
  });

  function updateIfPlaying() {
    engine.updateAllPlaying(buildBaseParams(PREFIX));
    refreshStatus();
    kbd.syncExecutionHighlight();
  }

  function rebuildKeyRows() {
    const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
    buildLinearKeys(keysWrap, {
      octaveMin,
      octaveMax,
      keyButtonClass: 'ntg-key',
    });
    kbd.bindKeys();
    kbd.syncExecutionHighlight();
  }

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  mountTemplateSynthKit(PREFIX, {
    applyVolumeFromUi,
    updateIfPlaying,
    formatReleaseLabel,
  });

  $('tpl-waveform').addEventListener('change', () => updateIfPlaying());
  $('tpl-a4').addEventListener('input', () => updateIfPlaying());
  $('tpl-octave-min').addEventListener('input', () => {
    engine.stopMonoImmediate();
    engine.stopAllPolyImmediate();
    engine.setLatchedKeyForMono(null);
    rebuildKeyRows();
    setStatus('Тишина');
  });
  $('tpl-octave-max').addEventListener('input', () => {
    engine.stopMonoImmediate();
    engine.stopAllPolyImmediate();
    engine.setLatchedKeyForMono(null);
    rebuildKeyRows();
    setStatus('Тишина');
  });

  $('tpl-stop').addEventListener('click', () => {
    engine.stopMonoSmooth();
    engine.stopAllPolySmooth();
    engine.latchedKey = null;
    kbd.syncExecutionHighlight();
    setStatus('Тишина');
  });

  rebuildKeyRows();
  applyVolumeFromUi();
  updateIfPlaying();
}

void main();
