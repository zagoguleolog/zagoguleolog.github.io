/**
 * Слой B: подсказка по теории (лад / pitch class) без смешения с подсветкой воспроизведения.
 */
import { parseNoteName } from '../lib/music-theory.js';

export const THEORY_HINT_CLASS = 'ntg-key-hint';

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
