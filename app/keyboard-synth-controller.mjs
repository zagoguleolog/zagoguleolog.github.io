/**
 * Клавиатура ↔ движок звука: pointer, классы ntg-key-active / ntg-key-down.
 * Зависит от контракта ToneSynthEngine, не от класса ToneGen.
 */
import { parseVoiceKey, voiceKey } from './tone-gen-engine.mjs';

/**
 * @typedef {import('./tone-gen-engine.mjs').ToneSynthEngine} ToneSynthEngine
 */

/**
 * @typedef {object} KeyboardSynthControllerOptions
 * @property {() => HTMLElement | null} getPointerRoot узел с кнопками для слушателей
 * @property {() => HTMLElement | null} getClearRoot снятие ntg-key-active (часто весь stage)
 * @property {() => HTMLElement | null} getHighlightRoot подсветка активных нот (может совпадать с clear или быть только видимой панелью)
 * @property {string} keySelector например `.ntg-key` или `.cts-play-key`
 * @property {ToneSynthEngine} engine
 * @property {(name: string, octave: number) => object} buildPlayPayload
 * @property {(voiceKey: string) => boolean} [includeVoiceInHighlight] какие голоса полифонии подсвечивают клавишу (по умолчанию все)
 * @property {() => void} [onChange] после смены состояния воспроизведения (статус, синхрон подсветки)
 */

/**
 * @param {KeyboardSynthControllerOptions} opts
 */
export function createKeyboardSynthController(opts) {
  const {
    getPointerRoot,
    getClearRoot,
    getHighlightRoot,
    keySelector,
    engine,
    buildPlayPayload,
    includeVoiceInHighlight = () => true,
    onChange,
  } = opts;

  function syncExecutionHighlight() {
    const clearRoot = getClearRoot();
    const applyRoot = getHighlightRoot();
    if (!clearRoot || !applyRoot) return;
    for (const b of clearRoot.querySelectorAll(keySelector)) {
      b.classList.remove('ntg-key-active');
    }
    for (const key of engine.polyVoices.keys()) {
      if (!includeVoiceInHighlight(key)) continue;
      try {
        const { name, octave } = parseVoiceKey(key);
        const btn = applyRoot.querySelector(
          `${keySelector}[data-note="${CSS.escape(name)}"][data-octave="${String(octave)}"]`,
        );
        if (btn) btn.classList.add('ntg-key-active');
      } catch {
        /* */
      }
    }
    if (engine.monoVoice && engine.latchedKey) {
      try {
        const { name, octave } = parseVoiceKey(engine.latchedKey);
        const btn = applyRoot.querySelector(
          `${keySelector}[data-note="${CSS.escape(name)}"][data-octave="${String(octave)}"]`,
        );
        if (btn) btn.classList.add('ntg-key-active');
      } catch {
        /* */
      }
    }
  }

  function notify() {
    syncExecutionHighlight();
    onChange?.();
  }

  /** @param {PointerEvent} ev */
  function onPointerDown(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    const name = btn.dataset.note;
    const octave = Number(btn.dataset.octave);
    if (!name || !Number.isFinite(octave)) return;

    void engine.ensureCtx();

    if (engine.mode === 'latchPoly') {
      engine.startOrTogglePoly(buildPlayPayload(name, octave));
      notify();
      return;
    }

    if (engine.mode === 'latch') {
      const key = voiceKey(name, octave);
      if (engine.latchedKey === key && engine.monoVoice) {
        engine.stopMonoSmooth();
        engine.setLatchedKeyForMono(null);
        notify();
      } else {
        engine.setLatchedKeyForMono(key);
        engine.startMono(buildPlayPayload(name, octave));
        notify();
      }
      return;
    }

    btn.classList.add('ntg-key-down');
    btn.setPointerCapture(ev.pointerId);
    engine.setLatchedKeyForMono(voiceKey(name, octave));
    engine.startMono(buildPlayPayload(name, octave));
    notify();
  }

  /** @param {PointerEvent} ev */
  function onPointerUp(ev) {
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
    notify();
  }

  /** @param {PointerEvent} ev */
  function onPointerCancel(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    btn.classList.remove('ntg-key-down');
    if (engine.mode !== 'hold') return;
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    notify();
  }

  /** @param {PointerEvent} ev */
  function onPointerLeave(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    if (engine.mode !== 'hold' || !btn.classList.contains('ntg-key-down')) return;
    btn.classList.remove('ntg-key-down');
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    notify();
  }

  function bindKeys() {
    const root = getPointerRoot();
    if (!root) return;
    for (const btn of root.querySelectorAll(keySelector)) {
      btn.addEventListener('pointerdown', onPointerDown);
      btn.addEventListener('pointerup', onPointerUp);
      btn.addEventListener('pointercancel', onPointerCancel);
      btn.addEventListener('pointerleave', onPointerLeave);
    }
  }

  return {
    bindKeys,
    syncExecutionHighlight,
    notify,
  };
}
