/**
 * Общее чтение полей формы генератора тона (префикс id: ntg- или cts-ntg-).
 */
import {
  clamp,
  DEFAULT_A4_HZ,
  HARMONIC_END,
  RELEASE_SEC_MAX,
  RELEASE_SEC_MIN,
} from './tone-gen-engine.mjs';

export function parseA4Hz(raw) {
  const v = Number(raw);
  if (!Number.isFinite(v) || v <= 0) return null;
  return clamp(v, 1, 2000);
}

/**
 * @param {HTMLElement} harmWrapEl контейнер с .ntg-harm-toggle
 * @returns {Record<number, boolean>}
 */
export function readHarmEnabled(harmWrapEl) {
  /** @type {Record<number, boolean>} */
  const m = {};
  for (let n = 1; n <= HARMONIC_END; n++) m[n] = false;
  for (const el of harmWrapEl.querySelectorAll('.ntg-harm-toggle input[type="checkbox"]')) {
    const n = Number(/** @type {HTMLInputElement} */ (el).dataset.partial);
    if (n >= 1 && n <= HARMONIC_END) {
      m[n] = /** @type {HTMLInputElement} */ (el).checked;
    }
  }
  return m;
}

/**
 * @param {string} prefix например ntg- или cts-ntg-
 */
export function readOctaveRange(prefix) {
  const $ = (suffix) => {
    const id = `${prefix}${suffix}`;
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id}`);
    return el;
  };
  const minRaw = Number(/** @type {HTMLInputElement} */ ($('octave-min')).value);
  const maxRaw = Number(/** @type {HTMLInputElement} */ ($('octave-max')).value);
  let min = Number.isFinite(minRaw) ? Math.round(minRaw) : 3;
  let max = Number.isFinite(maxRaw) ? Math.round(maxRaw) : 6;
  if (min > max) {
    const t = min;
    min = max;
    max = t;
  }
  return { octaveMin: clamp(min, 0, 8), octaveMax: clamp(max, 0, 8) };
}

/**
 * @param {string} prefix
 * @param {number} [defaultA4Hz] если не передан — берётся текущий DEFAULT_A4_HZ из движка (после initToneGenTheory)
 */
export function readToneGenParams(prefix, defaultA4Hz = DEFAULT_A4_HZ) {
  const $ = (suffix) => {
    const id = `${prefix}${suffix}`;
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing #${id}`);
    return el;
  };
  const harmId = `${prefix}harmonics`;
  const harmWrap = document.getElementById(harmId);
  if (!harmWrap) throw new Error(`Missing #${harmId}`);

  const a4Raw = parseA4Hz(/** @type {HTMLInputElement} */ ($('a4')).value);
  const a4Hz = a4Raw ?? defaultA4Hz;
  const { octaveMin, octaveMax } = readOctaveRange(prefix);
  const vol = clamp(Number(/** @type {HTMLInputElement} */ ($('volume')).value) / 100, 0, 1);
  const wf = /** @type {HTMLSelectElement} */ ($('waveform')).value;
  const detune = clamp(Number(/** @type {HTMLInputElement} */ ($('detune')).value), -50, 50);
  const harmMix01 = clamp(Number(/** @type {HTMLInputElement} */ ($('harm-mix')).value) / 100, 0, 1);
  const harmRolloff = clamp(Number(/** @type {HTMLInputElement} */ ($('harm-rolloff')).value), 0.3, 2.5);
  const harmEnabled = readHarmEnabled(harmWrap);
  const releaseMsRaw = Number(/** @type {HTMLInputElement} */ ($('release-ms')).value);
  const releaseSec = clamp(
    Number.isFinite(releaseMsRaw) ? releaseMsRaw / 1000 : 0.055,
    RELEASE_SEC_MIN,
    RELEASE_SEC_MAX,
  );
  return {
    a4Hz,
    octaveMin,
    octaveMax,
    volume: vol,
    waveform: /** @type {'sine'|'triangle'|'square'|'sawtooth'} */ (wf),
    detuneCents: detune,
    harmMix01,
    harmRolloff,
    harmEnabled,
    releaseSec,
  };
}

/**
 * @param {string} prefix
 */
export function buildBaseParams(prefix) {
  const p = readToneGenParams(prefix);
  return {
    a4Hz: p.a4Hz,
    waveform: p.waveform,
    detuneCents: p.detuneCents,
    harmMix01: p.harmMix01,
    harmRolloff: p.harmRolloff,
    harmEnabled: p.harmEnabled,
    releaseSec: p.releaseSec,
  };
}

/**
 * @param {string} prefix
 * @param {string} name
 * @param {number} octave
 */
export function buildPlayPayload(prefix, name, octave) {
  const p = readToneGenParams(prefix);
  return {
    name,
    octave,
    a4Hz: p.a4Hz,
    waveform: p.waveform,
    detuneCents: p.detuneCents,
    harmMix01: p.harmMix01,
    harmRolloff: p.harmRolloff,
    harmEnabled: p.harmEnabled,
    releaseSec: p.releaseSec,
  };
}
