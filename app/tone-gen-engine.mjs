/**
 * Движок Web Audio для генератора тона: полифония, обертоны.
 * Частоты задаются через initToneGenTheory() после загрузки lib/music-theory.js
 * (чтобы note-tone-gen.mjs мог показать предупреждение при file:// без статического импорта теории).
 */

/** @type {(name: string, octave: number, opts: { referenceHz?: number }) => number} */
let frequencyFromNoteNameOctave = () => {
  throw new Error('Вызовите initToneGenTheory() после загрузки lib/music-theory.js');
};

/** @param {{ frequencyFromNoteNameOctave: typeof frequencyFromNoteNameOctave, DEFAULT_A4_HZ: number }} m */
export function initToneGenTheory(m) {
  frequencyFromNoteNameOctave = m.frequencyFromNoteNameOctave;
  DEFAULT_A4_HZ = m.DEFAULT_A4_HZ;
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const HARMONIC_START = 2;
export const HARMONIC_END = 16;

/** Усиление вклада обертонов в общей нормализации (без этого слайдер «смесь» почти не слышен на фоне n=1). */
const HARM_SERIES_WEIGHT = 2.75;

export const RELEASE_SEC_MIN = 0.02;
export const RELEASE_SEC_MAX = 5;

export let DEFAULT_A4_HZ = 440;

export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

export function voiceKey(name, octave) {
  return `${name}|${octave}`;
}

/**
 * Ключ полифонии: либо `имя|октава`, либо с префиксом (`cts:…|имя|октава`).
 * @param {string} key
 * @returns {{ name: string, octave: number }}
 */
export function parseVoiceKey(key) {
  const parts = key.split('|');
  if (parts.length < 2) {
    throw new Error(`Invalid voice key: ${key}`);
  }
  const octave = Number(parts[parts.length - 1]);
  const name = parts[parts.length - 2];
  if (!name || !Number.isFinite(octave)) {
    throw new Error(`Invalid voice key: ${key}`);
  }
  return { name, octave };
}

/**
 * @param {number} harmMix01
 * @param {number} rolloff
 * @param {Record<number, boolean>} enabledByN
 * @returns {{ total: number, fund: number, harm: (n: number) => number }}
 */
function harmonicAmplitudes(harmMix01, rolloff, enabledByN) {
  let harmSum = 0;
  for (let n = HARMONIC_START; n <= HARMONIC_END; n++) {
    if (enabledByN[n]) harmSum += (harmMix01 * HARM_SERIES_WEIGHT) / n ** rolloff;
  }
  const fundWeight = enabledByN[1] ? 1 : 0;
  const total = fundWeight + harmSum;
  return {
    total,
    fund: total > 0 ? fundWeight / total : 0,
    harm: (n) =>
      enabledByN[n] && total > 0
        ? (harmMix01 * HARM_SERIES_WEIGHT) / n ** rolloff / total
        : 0,
  };
}

/**
 * @param {AudioContext} ctx
 * @param {GainNode} outGain
 * @param {object} p
 */
function createVoice(ctx, outGain, p) {
  const now = ctx.currentTime;
  const freq = frequencyFromNoteNameOctave(p.name, p.octave, { referenceHz: p.a4Hz });
  const attack = 0.035;
  const { total, fund, harm } = harmonicAmplitudes(p.harmMix01, p.harmRolloff, p.harmEnabled);

  if (total <= 0) return null;

  const master = ctx.createGain();
  master.connect(outGain);
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.9, now + attack);

  /** @type {Array<{ osc: OscillatorNode, gain: GainNode, partial: number }>} */
  const parts = [];

  const mkOsc = (partial, type) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * partial, now);
    if (partial === 1) osc.detune.setValueAtTime(p.detuneCents, now);
    const g = ctx.createGain();
    const amp = partial === 1 ? fund : harm(partial);
    g.gain.setValueAtTime(amp, now);
    osc.connect(g);
    g.connect(master);
    osc.start(now);
    parts.push({ osc, gain: g, partial });
  };

  if (p.harmEnabled[1]) mkOsc(1, p.waveform);
  for (let n = HARMONIC_START; n <= HARMONIC_END; n++) {
    if (p.harmEnabled[n]) mkOsc(n, p.waveform);
  }

  return { master, parts };
}

/**
 * @param {AudioContext} ctx
 * @param {{ master: GainNode, parts: Array<{ osc: OscillatorNode, gain: GainNode, partial: number }> }} voice
 * @param {object} p
 */
function updateVoice(ctx, voice, p) {
  const freq = frequencyFromNoteNameOctave(p.name, p.octave, { referenceHz: p.a4Hz });
  const now = ctx.currentTime;
  const { fund, harm } = harmonicAmplitudes(p.harmMix01, p.harmRolloff, p.harmEnabled);

  for (const part of voice.parts) {
    part.osc.frequency.setTargetAtTime(freq * part.partial, now, 0.015);
    part.osc.type = p.waveform;
    if (part.partial === 1) {
      part.osc.detune.setTargetAtTime(p.detuneCents, now, 0.02);
      part.gain.gain.setTargetAtTime(fund, now, 0.02);
    } else {
      const a = harm(part.partial);
      part.gain.gain.setTargetAtTime(a, now, 0.02);
    }
  }

  const existing = new Map(voice.parts.map((x) => [x.partial, x]));
  for (let n = 1; n <= HARMONIC_END; n++) {
    const has = existing.has(n);
    const want = p.harmEnabled[n];
    if (want && !has) {
      const osc = ctx.createOscillator();
      osc.type = p.waveform;
      if (n === 1) {
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(p.detuneCents, now);
      } else {
        osc.frequency.setValueAtTime(freq * n, now);
      }
      const g = ctx.createGain();
      const targetAmp = n === 1 ? fund : harm(n);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(targetAmp || 0.0001, now + 0.03);
      osc.connect(g);
      g.connect(voice.master);
      osc.start(now);
      voice.parts.push({ osc, gain: g, partial: n });
    }
    if (!want && has) {
      const part = existing.get(n);
      if (part) {
        part.gain.gain.setTargetAtTime(0.0001, now, 0.02);
        const stopT = now + 0.08;
        try {
          part.osc.stop(stopT);
        } catch {
          /* */
        }
        voice.parts = voice.parts.filter((x) => x !== part);
      }
    }
  }
}

/**
 * @param {ReturnType<typeof createVoice>} voice
 */
function stopVoiceImmediate(voice) {
  if (!voice) return;
  const now = voice.master.context.currentTime;
  for (const part of voice.parts) {
    try {
      part.osc.stop(now);
    } catch {
      /* */
    }
    try {
      part.gain.disconnect();
    } catch {
      /* */
    }
  }
  try {
    voice.master.disconnect();
  } catch {
    /* */
  }
}

/**
 * @param {AudioContext} ctx
 * @param {NonNullable<ReturnType<typeof createVoice>>} voice
 * @param {() => void} [onDone]
 * @param {number} [releaseSec] длительность сглаженного затухания (сек), 0.02…5
 */
function stopVoiceSmooth(ctx, voice, onDone, releaseSec = 0.055) {
  const now = ctx.currentTime;
  const rel = clamp(Number(releaseSec) || 0.055, RELEASE_SEC_MIN, RELEASE_SEC_MAX);
  const end = now + rel;
  const oscStopPad = Math.min(0.12, rel * 0.05 + 0.02);
  try {
    voice.master.gain.cancelScheduledValues(now);
    const gv = voice.master.gain.value;
    voice.master.gain.setValueAtTime(gv, now);
    // Линейный спад: длительность ползунка ≈ слышимое время снижения громкости (экспонента давала слишком быстрый «хвост»).
    voice.master.gain.linearRampToValueAtTime(0.0001, end);
  } catch {
    voice.master.gain.setValueAtTime(0.0001, end);
  }
  for (const part of voice.parts) {
    try {
      part.osc.stop(end + oscStopPad);
    } catch {
      /* */
    }
  }
  window.setTimeout(() => {
    try {
      voice.master.disconnect();
    } catch {
      /* */
    }
    onDone?.();
  }, (rel + 0.08) * 1000);
}

export class ToneGen {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.outGain = null;
    /** @type {ReturnType<typeof createVoice> | null} */
    this.monoVoice = null;
    /** @type {Map<string, NonNullable<ReturnType<typeof createVoice>>>} */
    this.polyVoices = new Map();
    /** @type {'hold' | 'latch' | 'latchPoly'} взаимодействие с кругом / полифония с префиксом `cts:` */
    this.mode = 'hold';
    /**
     * Если не `null`, `keyboard-synth-controller` использует это вместо `mode` для клавиш;
     * на остальных страницах оставить `null`.
     * `holdPoly` — полифония с удержанием (ПК и pointer): нажал — голос, отпустил — плавный стоп.
     * @type {'hold' | 'latch' | 'latchPoly' | 'holdPoly' | null}
     */
    this.keyboardMode = null;
    /** @type {string | null} моно-режим: последняя зафиксированная нота|октава */
    this.latchedKey = null;
    /** Длительность плавного отпускания голоса (сек), задаётся из UI */
    this.releaseSmoothSec = 0.055;
  }

  /** @param {number} sec */
  setReleaseSmoothSec(sec) {
    this.releaseSmoothSec = clamp(Number(sec) || 0.055, RELEASE_SEC_MIN, RELEASE_SEC_MAX);
  }

  ensureCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.outGain = this.ctx.createGain();
      this.outGain.connect(this.ctx.destination);
      this.applyOutputVolume();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /** @param {number} linear 0…1 */
  setOutputLinear(linear) {
    this._outputLinear = clamp(linear, 0, 1);
    this.applyOutputVolume();
  }

  applyOutputVolume() {
    if (!this.outGain) return;
    const v = this._outputLinear ?? 0.25;
    const now = this.ctx?.currentTime ?? 0;
    this.outGain.gain.setValueAtTime(v * 0.4, now);
  }

  getFreq(name, octave, a4Hz) {
    return frequencyFromNoteNameOctave(name, octave, { referenceHz: a4Hz });
  }

  /**
   * @param {object} p
   */
  startMono(p) {
    const ctx = this.ensureCtx();
    if (!this.outGain) return;
    if (this.monoVoice) {
      const prev = this.monoVoice;
      this.monoVoice = null;
      stopVoiceSmooth(ctx, prev, undefined, Math.min(this.releaseSmoothSec, 0.08));
    }
    const v = createVoice(ctx, this.outGain, p);
    if (!v) return;
    this.monoVoice = v;
  }

  stopMonoSmooth() {
    if (!this.monoVoice || !this.ctx) {
      this.monoVoice = null;
      return;
    }
    const v = this.monoVoice;
    this.monoVoice = null;
    stopVoiceSmooth(this.ctx, v, undefined, this.releaseSmoothSec);
  }

  stopMonoImmediate() {
    if (!this.monoVoice) return;
    const v = this.monoVoice;
    this.monoVoice = null;
    stopVoiceImmediate(v);
  }

  polyKey(p) {
    return p.mapKey ?? voiceKey(p.name, p.octave);
  }

  /**
   * @param {object} p поле mapKey — явный ключ полифонии (например голоса с круга)
   */
  startOrTogglePoly(p) {
    const ctx = this.ensureCtx();
    if (!this.outGain) return;
    const key = this.polyKey(p);
    if (this.polyVoices.has(key)) {
      const v = this.polyVoices.get(key);
      this.polyVoices.delete(key);
      if (v && this.ctx) stopVoiceSmooth(this.ctx, v, undefined, this.releaseSmoothSec);
      return;
    }
    const v = createVoice(ctx, this.outGain, p);
    if (!v) return;
    this.polyVoices.set(key, v);
  }

  /**
   * Запуск голоса полифонии; при уже существующем ключе — только updateVoice.
   * @param {object} p
   */
  startPolyVoice(p) {
    const ctx = this.ensureCtx();
    if (!this.outGain) return;
    const key = this.polyKey(p);
    const existing = this.polyVoices.get(key);
    if (existing) {
      updateVoice(ctx, existing, p);
      return;
    }
    const v = createVoice(ctx, this.outGain, p);
    if (v) this.polyVoices.set(key, v);
  }

  /**
   * @param {string} key
   */
  stopPolyVoiceSmooth(key) {
    const v = this.polyVoices.get(key);
    if (!v || !this.ctx) return;
    this.polyVoices.delete(key);
    stopVoiceSmooth(this.ctx, v, undefined, this.releaseSmoothSec);
  }

  /**
   * @param {string} key
   */
  stopPolyVoiceImmediate(key) {
    const v = this.polyVoices.get(key);
    if (!v) return;
    this.polyVoices.delete(key);
    stopVoiceImmediate(v);
  }

  stopAllPolySmooth() {
    const ctx = this.ctx;
    for (const [key, v] of [...this.polyVoices.entries()]) {
      this.polyVoices.delete(key);
      if (ctx) stopVoiceSmooth(ctx, v, undefined, this.releaseSmoothSec);
    }
  }

  stopAllPolyImmediate() {
    for (const [key, v] of [...this.polyVoices.entries()]) {
      this.polyVoices.delete(key);
      stopVoiceImmediate(v);
    }
  }

  /**
   * @param {object} baseParams a4Hz, waveform, detune, harm*, releaseSec — без name/octave
   */
  updateAllPlaying(baseParams) {
    const ctx = this.ctx;
    if (!ctx) return;

    if (baseParams?.releaseSec != null && Number.isFinite(baseParams.releaseSec)) {
      this.setReleaseSmoothSec(baseParams.releaseSec);
    }

    if (this.monoVoice) {
      const k = this.latchedKey;
      if (!k) return;
      const { name, octave } = parseVoiceKey(k);
      updateVoice(ctx, this.monoVoice, { ...baseParams, name, octave });
    }

    for (const [key, voice] of this.polyVoices.entries()) {
      const { name, octave } = parseVoiceKey(key);
      updateVoice(ctx, voice, { ...baseParams, name, octave });
    }
  }

  /** @param {string | null} key */
  setLatchedKeyForMono(key) {
    this.latchedKey = key;
  }

  polyVoiceCount() {
    return this.polyVoices.size;
  }
}

/**
 * Контракт движка звука для клавиатуры (полифония, моно, удержание / фиксация).
 * Реализация — класс ToneGen выше.
 *
 * @typedef {object} ToneSynthEngine
 * @property {() => AudioContext} ensureCtx
 * @property {'hold' | 'latch' | 'latchPoly'} mode
 * @property {'hold' | 'latch' | 'latchPoly' | 'holdPoly' | null} [keyboardMode]
 * @property {Map<string, unknown>} polyVoices
 * @property {unknown | null} monoVoice
 * @property {string | null} latchedKey
 * @property {(p: object) => void} startMono
 * @property {() => void} stopMonoSmooth
 * @property {(p: object) => void} startOrTogglePoly
 * @property {(p: object) => void} startPolyVoice
 * @property {(key: string) => void} stopPolyVoiceSmooth
 * @property {(key: string | null) => void} setLatchedKeyForMono
 */
