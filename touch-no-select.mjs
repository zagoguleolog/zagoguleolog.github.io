/**
 * JS-страховка: на части мобильных браузеров CSS user-select не блокирует
 * long-press → контекстное меню / поиск по выделенному тексту кнопки (например «C#4»).
 */

const NO_SELECT_SELECTOR = [
  'button',
  '[role="button"]',
  '.ntg-key',
  '.cts-pkey',
  '.cts-play-key',
  '.cts-byan-key',
  '.cts-chip',
  '.cts-toggle',
  '.cts-kbd-btn',
  '.ntg-seg-btn',
  '.sc7m-chord-btn',
  '.sc7m-kbd-btn',
  '.synth-pair__btn',
  '.synth-toggle',
  '.synth-matrix__cell',
  '.cof-sector',
  '.ntg-oct-label',
  '.cts-piano-oct-label',
  '.site-nav__home',
  '.site-nav__toggle',
  '.cts-keyboard-stage',
  '.ntg-keys-wrap',
  '.cts-piano-keyboard',
  '.cts-bayan-wrap',
  '.cts-bayan4-wrap',
].join(',');

/** @param {EventTarget | null} target */
function matchesNoSelect(target) {
  return target instanceof Element && target.closest(NO_SELECT_SELECTOR) != null;
}

let installed = false;

/** Идempotent: один раз на документ. */
export function installTouchNoSelect() {
  if (installed) return;
  installed = true;

  document.addEventListener(
    'selectstart',
    (ev) => {
      if (matchesNoSelect(ev.target)) ev.preventDefault();
    },
    { capture: true },
  );

  document.addEventListener(
    'contextmenu',
    (ev) => {
      if (matchesNoSelect(ev.target)) ev.preventDefault();
    },
    { capture: true },
  );
}
