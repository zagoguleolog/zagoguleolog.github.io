/**
 * Слой B: подсказка по теории (лад / pitch class) без смешения с подсветкой воспроизведения.
 */
import { parseNoteName } from '../lib/music-theory.js';

export const THEORY_HINT_CLASS = 'ntg-key-hint';
export const THEORY_MUTED_CLASS = 'ntg-key-muted';

/**
 * Подсветить клавиши, чей pitch class входит в множество (ступени гаммы в тональности).
 * @param {Element} root
 * @param {ReadonlySet<number> | Iterable<number>} pcs pitch class 0…11
 * @param {{ keySelector?: string, className?: string }} [opts]
 */
export function setTheoryPcsHighlight(root, pcs, opts = {}) {
  const keySelector = opts.keySelector ?? '[data-note][data-octave]';
  const className = opts.className ?? THEORY_HINT_CLASS;
  const set = pcs instanceof Set ? pcs : new Set(pcs);
  // #region agent log
  fetch('http://127.0.0.1:7938/ingest/6bbad3b8-402f-432a-a975-1620a81e6667', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Debug-Session-Id': 'bb4261',
    },
    body: JSON.stringify({
      sessionId: 'bb4261',
      runId: 'pre-fix',
      hypothesisId: 'H1',
      location: 'app/keyboard-theory-highlight.mjs:setTheoryPcsHighlight',
      message: 'setTheoryPcsHighlight invoked',
      data: { keySelector, className, pcsCount: set.size },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  for (const el of root.querySelectorAll(keySelector)) {
    const name = el.getAttribute('data-note');
    if (!name) continue;
    let pc;
    try {
      pc = parseNoteName(name).pc;
    } catch {
      continue;
    }
    el.classList.toggle(className, set.has(pc));
  }
}

/**
 * Снять класс подсказки со всех потомков root.
 * @param {Element} root
 * @param {{ className?: string }} [opts]
 */
export function clearTheoryHighlight(root, opts = {}) {
  const className = opts.className ?? THEORY_HINT_CLASS;
  for (const el of root.querySelectorAll(`.${className}`)) {
    if (root.contains(el)) el.classList.remove(className);
  }
}

/**
 * Слой «засеривания»: клавиши вне множества pitch class получают muted‑класс.
 * Используется в теоретическом режиме (гамма/лад/тональность), чтобы визуально
 * отделить «чужие» ноты от ступеней лада.
 *
 * @param {Element} root
 * @param {ReadonlySet<number> | Iterable<number>} pcs pitch class 0…11
 * @param {{ keySelector?: string, mutedClassName?: string }} [opts
 */
export function setTheoryMutedOutsidePcs(root, pcs, opts = {}) {
  const keySelector = opts.keySelector ?? '[data-note][data-octave]';
  const mutedClassName = opts.mutedClassName ?? THEORY_MUTED_CLASS;
  const set = pcs instanceof Set ? pcs : new Set(pcs);
  for (const el of root.querySelectorAll(keySelector)) {
    const name = el.getAttribute('data-note');
    if (!name) continue;
    let pc;
    try {
      pc = parseNoteName(name).pc;
    } catch {
      continue;
    }
    // Серый класс — только для тех, кто не входит в множество PCS.
    el.classList.toggle(mutedClassName, !set.has(pc));
  }
}

/**
 * Очистить класс muted для всех потомков root.
 * @param {Element} root
 * @param {{ mutedClassName?: string }} [opts]
 */
export function clearTheoryMuted(root, opts = {}) {
  const mutedClassName = opts.mutedClassName ?? THEORY_MUTED_CLASS;
  for (const el of root.querySelectorAll(`.${mutedClassName}`)) {
    if (root.contains(el)) el.classList.remove(mutedClassName);
  }
}
