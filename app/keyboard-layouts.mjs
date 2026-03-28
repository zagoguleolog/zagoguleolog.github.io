/**
 * Единая геометрия клавиатур: линейный ряд по NOTE_NAMES и пиано (белые/чёрные).
 * Имена нот — канонические (как CANONICAL_TONIC_BY_PC в lib/music-theory.js).
 */
import { CANONICAL_TONIC_BY_PC } from '../lib/music-theory.js';
import { NOTE_NAMES } from './tone-gen-engine.mjs';

/** Натуральные ступени в порядке белых клавиш (pitch class). */
export const PIANO_WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

/** Чёрные клавиши: позиция data-n и pitch class. */
export const PIANO_BLACK_KEYS = [
  { n: 1, pc: 1 },
  { n: 2, pc: 3 },
  { n: 4, pc: 6 },
  { n: 5, pc: 8 },
  { n: 6, pc: 10 },
];

/**
 * Линейные кнопки по октавам: chromatic ряд, data-note / data-octave.
 * @param {HTMLElement} container
 * @param {{ octaveMin: number, octaveMax: number, keyButtonClass: string }} opts
 */
export function buildLinearKeys(container, opts) {
  const { octaveMin, octaveMax, keyButtonClass } = opts;
  container.replaceChildren();
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
      btn.className = keyButtonClass;
      btn.textContent = `${name}${o}`;
      btn.dataset.note = name;
      btn.dataset.octave = String(o);
      grid.appendChild(btn);
    }
    row.appendChild(lab);
    row.appendChild(grid);
    container.appendChild(row);
  }
}

/**
 * Одна октава пиано: белые + чёрные, канонические имена.
 * @param {number} octave
 */
export function buildPianoOctaveElement(octave) {
  const wrap = document.createElement('div');
  wrap.className = 'cts-octave';
  wrap.dataset.octave = String(octave);

  const whiteRow = document.createElement('div');
  whiteRow.className = 'cts-white-keys';

  const blackRow = document.createElement('div');
  blackRow.className = 'cts-black-keys';
  blackRow.setAttribute('aria-hidden', 'true');

  for (const pc of PIANO_WHITE_PCS) {
    const name = CANONICAL_TONIC_BY_PC[pc];
    const keyBtn = document.createElement('button');
    keyBtn.type = 'button';
    keyBtn.className = 'cts-pkey cts-pkey--white ntg-key cts-play-key';
    keyBtn.dataset.note = name;
    keyBtn.dataset.octave = String(octave);
    keyBtn.textContent = name;
    keyBtn.title = `${name}${octave}`;
    whiteRow.appendChild(keyBtn);
  }

  for (const { n, pc } of PIANO_BLACK_KEYS) {
    const name = CANONICAL_TONIC_BY_PC[pc];
    const keyBtn = document.createElement('button');
    keyBtn.type = 'button';
    keyBtn.className = 'cts-pkey cts-pkey--black ntg-key cts-play-key';
    keyBtn.dataset.n = String(n);
    keyBtn.dataset.note = name;
    keyBtn.dataset.octave = String(octave);
    keyBtn.textContent = name;
    keyBtn.title = `${name}${octave}`;
    blackRow.appendChild(keyBtn);
  }

  const lab = document.createElement('span');
  lab.className = 'cts-piano-oct-label';
  lab.textContent = String(octave);

  wrap.appendChild(whiteRow);
  wrap.appendChild(blackRow);
  wrap.appendChild(lab);
  return wrap;
}

/**
 * Пиано: несколько октав подряд внутри контейнера (.cts-piano-keyboard).
 * @param {HTMLElement} container
 * @param {{ octaveMin: number, octaveMax: number }} opts
 */
export function buildPianoKeys(container, opts) {
  const { octaveMin, octaveMax } = opts;
  container.replaceChildren();
  for (let o = octaveMin; o <= octaveMax; o++) {
    container.appendChild(buildPianoOctaveElement(o));
  }
}
