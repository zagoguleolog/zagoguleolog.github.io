/**
 * Слой B: подсказка по теории (лад / pitch class) без смешения с подсветкой воспроизведения.
 */
import { parseNoteName } from '../lib/music-theory.js';

export const THEORY_HINT_CLASS = 'ntg-key-hint';
export const THEORY_MUTED_CLASS = 'ntg-key-muted';

/**
 * Кнопка клавиатуры с тем же классом высоты и научной октавой, что в секвенции или голосе движка
 * (поиск по классу высоты: подпись на кнопке может быть в диезной или бемольной системе знаков).
 *
 * @param {Element} root
 * @param {string} noteName имя ноты, например из `spellScaleFromPattern`
 * @param {number} octave научная октава
 * @param {string} [keySelector='.cts-play-key']
 * @returns {Element | null}
 */
export function findPlayKeyElementByPitch(root, noteName, octave, keySelector = '.cts-play-key') {
  if (!noteName || !Number.isFinite(octave)) return null;
  let targetPc;
  try {
    targetPc = parseNoteName(noteName).pc;
  } catch {
    return null;
  }
  const oc = String(octave);
  for (const el of root.querySelectorAll(keySelector)) {
    if (!(el instanceof Element)) continue;
    const dn = el.getAttribute('data-note');
    const doct = el.getAttribute('data-octave');
    if (dn == null || doct !== oc) continue;
    try {
      if (parseNoteName(dn).pc === targetPc) return el;
    } catch {
      continue;
    }
  }
  return null;
}

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
