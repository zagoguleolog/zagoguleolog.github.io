/**
 * Клавиатура ↔ движок звука: pointer, классы ntg-key-active / ntg-key-down.
 * Зависит от контракта ToneSynthEngine, не от класса ToneGen.
 */
import { linearBayianoIndexFromCode, linearIndexFromCode } from './computer-keyboard-music.mjs';
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
 * @typedef {object} ComputerKeyboardBindOptions
 * @property {() => 'linear' | 'piano' | 'bayiano' | 'bayiano4'} getLayout вид клавиатуры под кругом
 * @property {() => Map<string, { name: string, octave: number }>} getPianoCodeMap карта `event.code` для режима piano (кламп по MIDI)
 * @property {() => Map<string, { name: string, octave: number }>} [getBayanCodeMap] карта для режимов bayiano / bayiano4 (`createBayanCodeMap`, в т.ч. `options.rowCount`); без колбэка — запасной путь `SEQUENTIAL_ROW_CODES` + порядок DOM
 * @property {() => readonly string[]} [getLinearComputerCodes] порядок `event.code` для режима linear (длина = число кнопок линейной сетки); без колбэка ввод с ПК в linear не обрабатывается
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

  function effectiveKeyboardMode() {
    return engine.keyboardMode != null ? engine.keyboardMode : engine.mode;
  }

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

    if (effectiveKeyboardMode() === 'latchPoly') {
      engine.startOrTogglePoly(buildPlayPayload(name, octave));
      notify();
      return;
    }

    if (effectiveKeyboardMode() === 'latch') {
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
    if (effectiveKeyboardMode() !== 'hold') return;
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
    if (effectiveKeyboardMode() !== 'hold') return;
    engine.stopMonoSmooth();
    engine.setLatchedKeyForMono(null);
    notify();
  }

  /** @param {PointerEvent} ev */
  function onPointerLeave(ev) {
    const btn = /** @type {HTMLButtonElement} */ (ev.currentTarget);
    if (effectiveKeyboardMode() !== 'hold' || !btn.classList.contains('ntg-key-down')) return;
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

  /**
   * Глобальные keydown/keyup: та же семантика, что у pointer (`hold` / `latch` / `latchPoly`).
   * Не вызывать, если фокус в полях ввода — обрабатывается внутри.
   * @param {ComputerKeyboardBindOptions} ck
   * @returns {{ unbind: () => void }}
   */
  function bindComputerKeyboard(ck) {
    const { getLayout, getPianoCodeMap, getBayanCodeMap, getLinearComputerCodes } = ck;
    /** @type {Set<string>} */
    const pressedHold = new Set();

    /** @param {KeyboardEvent} ev */
    function resolveNote(ev) {
      const code = ev.code;
      const layout = getLayout();
      if (layout === 'piano') {
        const hit = getPianoCodeMap().get(code);
        return hit ? { name: hit.name, octave: hit.octave } : null;
      }
      if (layout === 'linear') {
        if (!getLinearComputerCodes) return null;
        const codes = getLinearComputerCodes();
        const idx = linearIndexFromCode(code, codes);
        if (idx < 0) return null;
        const root = getHighlightRoot();
        if (!root) return null;
        const buttons = root.querySelectorAll(keySelector);
        if (idx >= buttons.length) return null;
        const btn = buttons[idx];
        const name = btn.dataset.note;
        const octave = Number(btn.dataset.octave);
        if (!name || !Number.isFinite(octave)) return null;
        return { name, octave };
      }
      if ((layout === 'bayiano' || layout === 'bayiano4') && getBayanCodeMap) {
        const hit = getBayanCodeMap().get(code);
        return hit ? { name: hit.name, octave: hit.octave } : null;
      }
      const idx = linearBayianoIndexFromCode(code);
      if (idx < 0) return null;
      const root = getHighlightRoot();
      if (!root) return null;
      const buttons = root.querySelectorAll(keySelector);
      if (idx >= buttons.length) return null;
      const btn = buttons[idx];
      const name = btn.dataset.note;
      const octave = Number(btn.dataset.octave);
      if (!name || !Number.isFinite(octave)) return null;
      return { name, octave };
    }

    function findBtn(name, octave) {
      const root = getHighlightRoot();
      if (!root) return null;
      return root.querySelector(
        `${keySelector}[data-note="${CSS.escape(name)}"][data-octave="${String(octave)}"]`,
      );
    }

    /** @param {KeyboardEvent} ev */
    function onKeyDown(ev) {
      if (ev.repeat) return;
      if (ev.ctrlKey || ev.metaKey) return;
      const t = ev.target;
      if (
        t instanceof Element &&
        t.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
      ) {
        return;
      }

      const resolved = resolveNote(ev);
      if (!resolved) return;

      const { name, octave } = resolved;
      const code = ev.code;

      void engine.ensureCtx();

      const mode = effectiveKeyboardMode();

      if (mode === 'latchPoly') {
        engine.startOrTogglePoly(buildPlayPayload(name, octave));
        notify();
        ev.preventDefault();
        return;
      }

      if (mode === 'latch') {
        const key = voiceKey(name, octave);
        if (engine.latchedKey === key && engine.monoVoice) {
          engine.stopMonoSmooth();
          engine.setLatchedKeyForMono(null);
        } else {
          engine.setLatchedKeyForMono(key);
          engine.startMono(buildPlayPayload(name, octave));
        }
        notify();
        ev.preventDefault();
        return;
      }

      const btn = findBtn(name, octave);
      if (btn) btn.classList.add('ntg-key-down');
      engine.setLatchedKeyForMono(voiceKey(name, octave));
      engine.startMono(buildPlayPayload(name, octave));
      pressedHold.add(code);
      notify();
      ev.preventDefault();
    }

    /** @param {KeyboardEvent} ev */
    function onKeyUp(ev) {
      if (effectiveKeyboardMode() !== 'hold') return;
      const code = ev.code;
      if (!pressedHold.has(code)) return;

      const resolved = resolveNote(ev);
      pressedHold.delete(code);
      if (!resolved) return;

      const { name, octave } = resolved;
      const vk = voiceKey(name, octave);
      if (engine.latchedKey !== vk) return;

      const btn = findBtn(name, octave);
      if (btn) btn.classList.remove('ntg-key-down');
      engine.stopMonoSmooth();
      engine.setLatchedKeyForMono(null);
      notify();
      ev.preventDefault();
    }

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    return {
      unbind() {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        pressedHold.clear();
      },
    };
  }

  return {
    bindKeys,
    syncExecutionHighlight,
    notify,
    bindComputerKeyboard,
  };
}
