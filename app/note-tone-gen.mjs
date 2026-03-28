/**
 * Генератор тона: Web Audio + частоты из lib/music-theory.js (равномерная темпация).
 */
import {
  HARMONIC_END,
  HARMONIC_START,
  initToneGenTheory,
  parseVoiceKey,
  ToneGen,
  voiceKey,
} from './tone-gen-engine.mjs';
import { buildLinearKeys } from './keyboard-layouts.mjs';
import { createKeyboardSynthController } from './keyboard-synth-controller.mjs';
import { buildBaseParams, buildPlayPayload, readOctaveRange, readToneGenParams } from './tone-gen-ui-shared.mjs';

const PREFIX = 'ntg-';

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
};

async function main() {
  const warn = $('ntg-module-warning');
  try {
    const m = await import('../lib/music-theory.js');
    initToneGenTheory(m);
  } catch (e) {
    warn.hidden = false;
    warn.textContent =
      'Не удалось загрузить lib/music-theory.js (нужен HTTP-сервер с корректным MIME для ES-модулей). Запустите из каталога music: npm run serve и откройте /app/note-tone-gen.html.';
    console.error(e);
    return;
  }

  const engine = new ToneGen();
  const status = $('ntg-status');
  const harmWrap = $('ntg-harmonics');
  const keysWrap = $('ntg-keys-wrap');

  for (let n = HARMONIC_START; n <= HARMONIC_END; n++) {
    const lab = document.createElement('label');
    lab.className = 'ntg-harm-toggle';
    lab.innerHTML = `<input type="checkbox" data-partial="${n}" /> n=${n}`;
    if (n <= 6) lab.querySelector('input').checked = true;
    harmWrap.appendChild(lab);
  }

  function readParams() {
    return readToneGenParams(PREFIX);
  }

  function setStatus(text) {
    status.textContent = text;
  }

  function fmtPlaying(name, octave, hz) {
    return `${name}${octave} — ${hz.toFixed(2)} Гц`;
  }

  function refreshStatus() {
    const p = readParams();
    if (engine.mode === 'latchPoly') {
      const n = engine.polyVoiceCount();
      if (n === 0) {
        setStatus('Тишина');
        return;
      }
      const bits = [];
      for (const key of [...engine.polyVoices.keys()].sort()) {
        const { name, octave } = parseVoiceKey(key);
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

  $('ntg-volume').addEventListener('input', () => {
    $('ntg-vol-val').textContent = String(/** @type {HTMLInputElement} */ ($('ntg-volume')).value);
    applyVolumeFromUi();
  });
  $('ntg-detune').addEventListener('input', () => {
    $('ntg-detune-val').textContent = String(/** @type {HTMLInputElement} */ ($('ntg-detune')).value);
    updateIfPlaying();
  });
  $('ntg-harm-mix').addEventListener('input', () => {
    $('ntg-harm-mix-val').textContent = String(/** @type {HTMLInputElement} */ ($('ntg-harm-mix')).value);
    updateIfPlaying();
  });
  $('ntg-harm-rolloff').addEventListener('input', () => {
    $('ntg-harm-rolloff-val').textContent = String(
      /** @type {HTMLInputElement} */ ($('ntg-harm-rolloff')).value,
    );
    updateIfPlaying();
  });
  $('ntg-release-ms').addEventListener('input', () => {
    const ms = Number(/** @type {HTMLInputElement} */ ($('ntg-release-ms')).value);
    $('ntg-release-ms-val').textContent = formatReleaseLabel(ms);
    updateIfPlaying();
  });
  $('ntg-waveform').addEventListener('change', () => updateIfPlaying());
  $('ntg-a4').addEventListener('input', () => updateIfPlaying());
  $('ntg-octave-min').addEventListener('input', () => {
    engine.stopMonoImmediate();
    engine.stopAllPolyImmediate();
    engine.setLatchedKeyForMono(null);
    rebuildKeyRows();
    setStatus('Тишина');
  });
  $('ntg-octave-max').addEventListener('input', () => {
    engine.stopMonoImmediate();
    engine.stopAllPolyImmediate();
    engine.setLatchedKeyForMono(null);
    rebuildKeyRows();
    setStatus('Тишина');
  });
  harmWrap.addEventListener('change', () => updateIfPlaying());

  const btnHold = $('ntg-mode-hold');
  const btnLatch = $('ntg-mode-latch');
  const btnLatchPoly = $('ntg-mode-latch-poly');

  function setMode(m) {
    engine.mode = m;
    btnHold.setAttribute('aria-pressed', m === 'hold' ? 'true' : 'false');
    btnLatch.setAttribute('aria-pressed', m === 'latch' ? 'true' : 'false');
    btnLatchPoly.setAttribute('aria-pressed', m === 'latchPoly' ? 'true' : 'false');
    engine.latchedKey = null;
    engine.stopMonoSmooth();
    engine.stopAllPolySmooth();
    kbd.syncExecutionHighlight();
    setStatus('Тишина');
  }

  btnHold.addEventListener('click', () => setMode('hold'));
  btnLatch.addEventListener('click', () => setMode('latch'));
  btnLatchPoly.addEventListener('click', () => setMode('latchPoly'));

  $('ntg-stop').addEventListener('click', () => {
    engine.stopMonoSmooth();
    engine.stopAllPolySmooth();
    engine.latchedKey = null;
    kbd.syncExecutionHighlight();
    setStatus('Тишина');
  });

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  rebuildKeyRows();
  applyVolumeFromUi();
  updateIfPlaying();
}

void main();
