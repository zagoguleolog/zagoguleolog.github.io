/**
 * Генератор тона: Web Audio + частоты из lib/music-theory.js (равномерная темпация).
 */
import {
  HARMONIC_END,
  HARMONIC_START,
  initToneGenTheory,
  NOTE_NAMES,
  parseVoiceKey,
  ToneGen,
  voiceKey,
} from './tone-gen-engine.mjs';
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

  function clearKeyActive() {
    for (const b of keysWrap.querySelectorAll('.ntg-key')) b.classList.remove('ntg-key-active');
  }

  function syncPolyKeyHighlight() {
    clearKeyActive();
    if (engine.mode !== 'latchPoly') return;
    for (const key of engine.polyVoices.keys()) {
      const { name, octave } = parseVoiceKey(key);
      const b = keysWrap.querySelector(
        `.ntg-key[data-note="${CSS.escape(name)}"][data-octave="${octave}"]`,
      );
      if (b) b.classList.add('ntg-key-active');
    }
  }

  function setMonoKeyActive(name, octave) {
    clearKeyActive();
    const b = keysWrap.querySelector(
      `.ntg-key[data-note="${CSS.escape(name)}"][data-octave="${String(octave)}"]`,
    );
    if (b) b.classList.add('ntg-key-active');
  }

  function startMono(name, octave) {
    engine.startMono(buildPlayPayload(PREFIX, name, octave));
    engine.setLatchedKeyForMono(voiceKey(name, octave));
    const p = readParams();
    const hz = engine.getFreq(name, octave, p.a4Hz);
    setStatus(fmtPlaying(name, octave, hz));
    setMonoKeyActive(name, octave);
  }

  function formatReleaseLabel(ms) {
    const m = Number(ms);
    if (!Number.isFinite(m)) return '—';
    if (m >= 1000) return `${(m / 1000).toFixed(m % 1000 === 0 ? 0 : 1)} с`;
    return `${Math.round(m)} мс`;
  }

  function updateIfPlaying() {
    engine.updateAllPlaying(buildBaseParams(PREFIX));
    refreshStatus();
    syncPolyKeyHighlight();
  }

  function rebuildKeyRows() {
    keysWrap.replaceChildren();
    const { octaveMin, octaveMax } = readOctaveRange(PREFIX);
    for (let o = octaveMin; o <= octaveMax; o++) {
      const row = document.createElement('div');
      row.className = 'ntg-key-row';
      const lab = document.createElement('div');
      lab.className = 'ntg-oct-label';
      lab.textContent = String(o);
      const grid = document.createElement('div');
      grid.className = 'ntg-keys';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', `Октава ${o}`);
      for (const name of NOTE_NAMES) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ntg-key';
        btn.textContent = `${name}${o}`;
        btn.dataset.note = name;
        btn.dataset.octave = String(o);
        grid.appendChild(btn);
      }
      row.appendChild(lab);
      row.appendChild(grid);
      keysWrap.appendChild(row);
    }
    bindKeyHandlers();
    syncPolyKeyHighlight();
  }

  function bindKeyHandlers() {
    for (const btn of keysWrap.querySelectorAll('.ntg-key')) {
      btn.addEventListener('pointerdown', onKeyPointerDown);
      btn.addEventListener('pointerup', onKeyPointerUp);
      btn.addEventListener('pointercancel', onKeyPointerCancel);
      btn.addEventListener('pointerleave', onKeyPointerLeave);
    }
  }

  function onKeyPointerDown(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    const name = btn.dataset.note;
    const octave = Number(btn.dataset.octave);
    if (!name || !Number.isFinite(octave)) return;

    void engine.ensureCtx();

    if (engine.mode === 'latchPoly') {
      engine.startOrTogglePoly(buildPlayPayload(PREFIX, name, octave));
      refreshStatus();
      syncPolyKeyHighlight();
      return;
    }

    if (engine.mode === 'latch') {
      const key = voiceKey(name, octave);
      if (engine.latchedKey === key && engine.monoVoice) {
        engine.stopMonoSmooth();
        engine.setLatchedKeyForMono(null);
        clearKeyActive();
        setStatus('Тишина');
      } else {
        engine.setLatchedKeyForMono(key);
        startMono(name, octave);
      }
      return;
    }

    btn.classList.add('ntg-key-down');
    btn.setPointerCapture(ev.pointerId);
    engine.setLatchedKeyForMono(voiceKey(name, octave));
    startMono(name, octave);
  }

  function onKeyPointerUp(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    btn.classList.remove('ntg-key-down');
    if (engine.mode !== 'hold') return;
    try {
      btn.releasePointerCapture(ev.pointerId);
    } catch {
      /* */
    }
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    clearKeyActive();
    setStatus('Тишина');
  }

  function onKeyPointerCancel(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    btn.classList.remove('ntg-key-down');
    if (engine.mode !== 'hold') return;
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    clearKeyActive();
    setStatus('Тишина');
  }

  function onKeyPointerLeave(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    if (engine.mode !== 'hold' || !btn.classList.contains('ntg-key-down')) return;
    btn.classList.remove('ntg-key-down');
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    clearKeyActive();
    setStatus('Тишина');
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
    clearKeyActive();
    setStatus('Тишина');
  }

  btnHold.addEventListener('click', () => setMode('hold'));
  btnLatch.addEventListener('click', () => setMode('latch'));
  btnLatchPoly.addEventListener('click', () => setMode('latchPoly'));

  $('ntg-stop').addEventListener('click', () => {
    engine.stopMonoSmooth();
    engine.stopAllPolySmooth();
    engine.latchedKey = null;
    clearKeyActive();
    setStatus('Тишина');
  });

  rebuildKeyRows();
  applyVolumeFromUi();
  updateIfPlaying();
}

void main();
