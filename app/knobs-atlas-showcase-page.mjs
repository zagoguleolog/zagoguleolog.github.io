/**
 * Галерея knobs.png: общая сетка границ 5×5 линий (xs[0..4], ys[0..4]) в пикселях исходника.
 * Каждый фрагмент — ячейка (col, row) с опциональным colSpan×rowSpan; соседние 1×1 делят одну линию реза.
 * Мини-карта: без Ctrl — левый верхний узел (xs[col], ys[row]); с Ctrl/⌘ — правый нижний (xs[col+colSpan], ys[row+rowSpan]).
 * Четыре индикатора координат (семисегмент, жесты как у крутилки) — те же четыре узла. После любого изменения — normalizeGrid и renderAll.
 */

import { createSegmentValueControl } from './synth-kit/segment-value-control.mjs';

const SRC = 1024;
const GRID_KEY = 'knobs-atlas-showcase-grid-v1';
const LEGACY_CROPS_KEY = 'knobs-atlas-showcase-crops-v2';
const KNOB_PX_RANGE = 12000;
const MIN_CELL = 2;

/** @typedef {{ x0: number, y0: number, x1: number, y1: number }} CropRect */

/** @typedef {{ key: string, title: string, idClass: string, col: number, row: number, colSpan?: number, rowSpan?: number }} SliceDef */

/** @type {SliceDef[]} */
const SLICES = [
  { key: 'knob', title: 'Ручка', idClass: 'synth-atlas-tile--knob', col: 0, row: 0 },
  { key: 'fader_v', title: 'Вертикальный фейдер', idClass: 'synth-atlas-tile--fader_v', col: 1, row: 0 },
  { key: 'btn_red', title: 'Красная кнопка', idClass: 'synth-atlas-tile--btn_red', col: 2, row: 0 },
  { key: 'power_toggle', title: 'ON / OFF и тумблер', idClass: 'synth-atlas-tile--power_toggle', col: 3, row: 0 },
  { key: 'btn_grid_4', title: 'Четыре кнопки 2×2', idClass: 'synth-atlas-tile--btn_grid_4', col: 0, row: 1 },
  { key: 'frame_display', title: 'Рамка-дисплей', idClass: 'synth-atlas-tile--frame_display', col: 1, row: 1 },
  { key: 'wave_icons', title: 'Иконки волн', idClass: 'synth-atlas-tile--wave_icons', col: 2, row: 1 },
  { key: 'checkbox', title: 'Чекбокс', idClass: 'synth-atlas-tile--checkbox', col: 3, row: 1 },
  { key: 'frame_wide', title: 'Широкая рамка', idClass: 'synth-atlas-tile--frame_wide', col: 0, row: 2 },
  { key: 'arrows_ud', title: 'Стрелки вверх / вниз', idClass: 'synth-atlas-tile--arrows_ud', col: 1, row: 2 },
  { key: 'jack', title: 'Разъём', idClass: 'synth-atlas-tile--jack', col: 2, row: 2 },
  { key: 'slider_mini', title: 'Мини-слайдер', idClass: 'synth-atlas-tile--slider_mini', col: 3, row: 2 },
  { key: 'tile_blank_a', title: 'Плитка (пустая A)', idClass: 'synth-atlas-tile--tile_blank_a', col: 0, row: 3 },
  { key: 'tile_blank_b', title: 'Плитка (пустая B)', idClass: 'synth-atlas-tile--tile_blank_b', col: 1, row: 3 },
  {
    key: 'brand_interface',
    title: 'Подпись INTERFACE',
    idClass: 'synth-atlas-tile--brand_interface',
    col: 2,
    row: 3,
    colSpan: 2,
    rowSpan: 1,
  },
];

/** Быстрый доступ к описанию фрагмента по ключу (паттерн тестовой сетки и др.). */
const SLICE_BY_KEY = new Map(SLICES.map((s) => [s.key, s]));

/** Дефолтная сетка (узлы из экспорта галереи; `slices` выводятся через `rectForSlice`). */
const DEFAULT_XS = [32, 278, 515, 753, 997];
const DEFAULT_YS = [27, 257, 482, 703, 980];

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * Жадное выравнивание одной оси: строго возрастающие узлы, шаг ≥ MIN_CELL, в пределах [0, SRC].
 * Индексы фиксированы (без сортировки).
 * @param {number[]} arr длина 5, изменяется на месте
 */
function normalizeAxis(arr) {
  const n = arr.length;
  for (let pass = 0; pass < n + 2; pass++) {
    for (let i = 0; i < n; i++) {
      arr[i] = clamp(Math.round(arr[i]), 0, SRC);
    }
    for (let i = 0; i < n - 1; i++) {
      if (arr[i + 1] < arr[i] + MIN_CELL) {
        arr[i + 1] = arr[i] + MIN_CELL;
      }
    }
    if (arr[n - 1] > SRC) {
      arr[n - 1] = SRC;
    }
    for (let i = n - 2; i >= 0; i--) {
      if (arr[i] > arr[i + 1] - MIN_CELL) {
        arr[i] = arr[i + 1] - MIN_CELL;
      }
    }
    if (arr[0] < 0) {
      arr[0] = 0;
    }
  }
}

/**
 * @param {number[]} xs
 * @param {number[]} ys
 */
function normalizeGrid(xs, ys) {
  normalizeAxis(xs);
  normalizeAxis(ys);
}

/** @param {SliceDef} def */
function spanCol(def) {
  return def.colSpan ?? 1;
}

/** @param {SliceDef} def */
function spanRow(def) {
  return def.rowSpan ?? 1;
}

/**
 * @param {SliceDef} def
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {CropRect}
 */
function rectForSlice(def, xs, ys) {
  const cs = spanCol(def);
  const rs = spanRow(def);
  const x0 = xs[def.col];
  const y0 = ys[def.row];
  const x1 = xs[def.col + cs];
  const y1 = ys[def.row + rs];
  return { x0, y0, x1, y1 };
}

/** @param {HTMLElement} mapEl */
function eventToSource(ev, mapEl) {
  const box = mapEl.getBoundingClientRect();
  const sx = ((ev.clientX - box.left) / box.width) * SRC;
  const sy = ((ev.clientY - box.top) / box.height) * SRC;
  return { sx: clamp(sx, 0, SRC), sy: clamp(sy, 0, SRC) };
}

/** @param {Record<string, CropRect>} state */
function inferGridFromLegacyCrops(state) {
  /** @type {number[]} */
  const xs = [0, 0, 0, 0, 0];
  /** @type {number[]} */
  const ys = [0, 0, 0, 0, 0];
  for (let k = 0; k < 5; k++) {
    const xv = [];
    const yv = [];
    for (const def of SLICES) {
      const r = state[def.key];
      if (!r || typeof r.x0 !== 'number') continue;
      const cs = spanCol(def);
      const rs = spanRow(def);
      if (def.col === k) xv.push(r.x0);
      if (def.col + cs === k) xv.push(r.x1);
      if (def.row === k) yv.push(r.y0);
      if (def.row + rs === k) yv.push(r.y1);
    }
    if (xv.length === 0 || yv.length === 0) return null;
    xs[k] = Math.round(xv.reduce((a, b) => a + b, 0) / xv.length);
    ys[k] = Math.round(yv.reduce((a, b) => a + b, 0) / yv.length);
  }
  return { xs, ys };
}

function loadLegacyCropsV2() {
  /** @type {Record<string, CropRect>} */
  const out = {};
  try {
    const raw = localStorage.getItem(LEGACY_CROPS_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return null;
    for (const s of SLICES) {
      const c = o[s.key];
      if (c && typeof c.x0 === 'number') {
        out[s.key] = {
          x0: Math.round(c.x0),
          y0: Math.round(c.y0),
          x1: Math.round(c.x1),
          y1: Math.round(c.y1),
        };
      }
    }
  } catch (_) {
    return null;
  }
  for (const s of SLICES) {
    if (!out[s.key]) return null;
  }
  return out;
}

function loadGrid() {
  try {
    const raw = localStorage.getItem(GRID_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (
        o &&
        Array.isArray(o.xs) &&
        o.xs.length === 5 &&
        Array.isArray(o.ys) &&
        o.ys.length === 5
      ) {
        const xs = o.xs.map((v) => Number(v));
        const ys = o.ys.map((v) => Number(v));
        if (xs.every((v) => Number.isFinite(v)) && ys.every((v) => Number.isFinite(v))) {
          normalizeGrid(xs, ys);
          return { xs, ys };
        }
      }
    }
  } catch (_) {}

  const legacy = loadLegacyCropsV2();
  if (legacy) {
    const inferred = inferGridFromLegacyCrops(legacy);
    if (inferred) {
      normalizeGrid(inferred.xs, inferred.ys);
      return inferred;
    }
  }

  const xs = [...DEFAULT_XS];
  const ys = [...DEFAULT_YS];
  normalizeGrid(xs, ys);
  return { xs, ys };
}

/** @param {{ xs: number[], ys: number[] }} grid */
function saveGrid(grid) {
  try {
    localStorage.setItem(GRID_KEY, JSON.stringify({ xs: grid.xs, ys: grid.ys }));
  } catch (_) {}
}

/**
 * @param {HTMLElement | null} el
 * @param {{ xs: number[], ys: number[] }} grid
 */
function refreshCropsExportLine(el, grid) {
  if (!el) return;
  /** @type {Record<string, CropRect>} */
  const slices = {};
  for (const s of SLICES) {
    slices[s.key] = { ...rectForSlice(s, grid.xs, grid.ys) };
  }
  el.textContent = JSON.stringify({ xs: [...grid.xs], ys: [...grid.ys], slices });
}

/**
 * @param {HTMLElement} el
 * @param {CropRect} rect
 */
function applyResultBackground(el, rect) {
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  if (w < 2 || h < 2) return;
  const dispW = el.offsetWidth;
  const dispH = el.offsetHeight;
  if (dispW < 4 || dispH < 4) return;
  const bgW = (SRC * dispW) / w;
  const bgH = (SRC * dispH) / h;
  const px = Math.round((rect.x0 / SRC) * bgW);
  const py = Math.round((rect.y0 / SRC) * bgH);
  el.style.backgroundImage = 'url(../knobs.png)';
  el.style.backgroundRepeat = 'no-repeat';
  el.style.backgroundSize = `${Math.round(bgW)}px ${Math.round(bgH)}px`;
  el.style.backgroundPosition = `-${px}px -${py}px`;
}

/**
 * @param {HTMLElement} rectEl
 * @param {CropRect} rect
 */
function applyMapOverlay(rectEl, rect) {
  const w = rect.x1 - rect.x0;
  const h = rect.y1 - rect.y0;
  rectEl.style.left = `${(rect.x0 / SRC) * 100}%`;
  rectEl.style.top = `${(rect.y0 / SRC) * 100}%`;
  rectEl.style.width = `${(w / SRC) * 100}%`;
  rectEl.style.height = `${(h / SRC) * 100}%`;
}

function init() {
  const gridEl = document.getElementById('kas-grid');
  if (!gridEl) return;

  const exportLineEl = document.getElementById('kas-crops-export-line');
  const copyBtn = document.getElementById('kas-crops-copy');

  let grid = loadGrid();

  /** @type {boolean} */
  let suppressKnob = false;

  /** @type {{ def: SliceDef, resultEl: HTMLElement, mapEl: HTMLElement, rectEl: HTMLElement, kx0: { setValue(n: number): void, getValue(): number, onChange(cb: (v: number) => void): void }, ky0: { setValue(n: number): void, getValue(): number, onChange(cb: (v: number) => void): void }, kx1: { setValue(n: number): void, getValue(): number, onChange(cb: (v: number) => void): void }, ky1: { setValue(n: number): void, getValue(): number, onChange(cb: (v: number) => void): void } }[]} */
  const cards = [];

  /** @type {string[] | null} */
  let patternKeys = null;
  /** @type {HTMLElement[]} */
  let patternCellEls = [];

  function renderPatternCells() {
    if (!patternKeys || patternCellEls.length === 0) return;
    for (let i = 0; i < patternKeys.length; i++) {
      const def = SLICE_BY_KEY.get(patternKeys[i]);
      const el = patternCellEls[i];
      if (!def || !el) continue;
      const rect = rectForSlice(def, grid.xs, grid.ys);
      applyResultBackground(el, rect);
    }
  }

  function renderAll() {
    normalizeGrid(grid.xs, grid.ys);
    for (const c of cards) {
      const rect = rectForSlice(c.def, grid.xs, grid.ys);
      const w = rect.x1 - rect.x0;
      const h = rect.y1 - rect.y0;
      if (w > 0 && h > 0) {
        c.resultEl.style.aspectRatio = `${w} / ${h}`;
      }
      applyResultBackground(c.resultEl, rect);
      applyMapOverlay(c.rectEl, rect);
    }
    suppressKnob = true;
    for (const c of cards) {
      const cs = spanCol(c.def);
      const rs = spanRow(c.def);
      c.kx0.setValue(grid.xs[c.def.col]);
      c.ky0.setValue(grid.ys[c.def.row]);
      c.kx1.setValue(grid.xs[c.def.col + cs]);
      c.ky1.setValue(grid.ys[c.def.row + rs]);
    }
    suppressKnob = false;
    saveGrid(grid);
    refreshCropsExportLine(exportLineEl, grid);
    renderPatternCells();
  }

  if (copyBtn && exportLineEl) {
    copyBtn.addEventListener('click', async () => {
      const text = exportLineEl.textContent ?? '';
      try {
        await navigator.clipboard.writeText(text);
        const prev = copyBtn.textContent;
        copyBtn.textContent = 'Скопировано';
        setTimeout(() => {
          copyBtn.textContent = prev;
        }, 1500);
      } catch (_) {
        copyBtn.textContent = 'Не удалось — выделите строку вручную';
        setTimeout(() => {
          copyBtn.textContent = 'Копировать в буфер';
        }, 2500);
      }
    });
  }

  for (const def of SLICES) {
    const fig = document.createElement('figure');
    fig.className = 'kas-card' + (def.key === 'brand_interface' ? ' kas-card--wide' : '');
    fig.dataset.sliceKey = def.key;

    fig.innerHTML = `
      <div class="kas-result-wrap">
        <div class="kas-result" aria-label="Подрезка"></div>
      </div>
      <div class="kas-map" tabindex="0" role="application" aria-label="Координаты на исходнике 1024×1024">
        <div class="kas-map__rect" aria-hidden="true"></div>
      </div>
      <p class="kas-map-hint">Общая сетка: без Ctrl — левый верхний узел ячейки; Ctrl или ⌘ — правый нижний.</p>
      <div class="kas-knobs-grid"></div>
      <figcaption class="kas-title"></figcaption>
      <p class="kas-id"></p>
    `;

    fig.querySelector('.kas-title').textContent = def.title;
    fig.querySelector('.kas-id').textContent = def.idClass;

    const resultEl = /** @type {HTMLElement} */ (fig.querySelector('.kas-result'));
    const mapEl = /** @type {HTMLElement} */ (fig.querySelector('.kas-map'));
    const rectEl = /** @type {HTMLElement} */ (fig.querySelector('.kas-map__rect'));
    const knobsMount = /** @type {HTMLElement} */ (fig.querySelector('.kas-knobs-grid'));

    const cs = spanCol(def);
    const rs = spanRow(def);

    let dragMode = /** @type {'tl' | 'br' | null} */ (null);

    const kx0 = createSegmentValueControl({
      mount: knobsMount,
      label: 'Лево (x₀)',
      min: 0,
      max: SRC - MIN_CELL,
      value: grid.xs[def.col],
      step: 1,
      pixelsPerFullRange: KNOB_PX_RANGE,
      width: 4,
      padField: true,
    });
    const ky0 = createSegmentValueControl({
      mount: knobsMount,
      label: 'Верх (y₀)',
      min: 0,
      max: SRC - MIN_CELL,
      value: grid.ys[def.row],
      step: 1,
      pixelsPerFullRange: KNOB_PX_RANGE,
      width: 4,
      padField: true,
    });
    const kx1 = createSegmentValueControl({
      mount: knobsMount,
      label: 'Право (x₁)',
      min: MIN_CELL,
      max: SRC,
      value: grid.xs[def.col + cs],
      step: 1,
      pixelsPerFullRange: KNOB_PX_RANGE,
      width: 4,
      padField: true,
    });
    const ky1 = createSegmentValueControl({
      mount: knobsMount,
      label: 'Низ (y₁)',
      min: MIN_CELL,
      max: SRC,
      value: grid.ys[def.row + rs],
      step: 1,
      pixelsPerFullRange: KNOB_PX_RANGE,
      width: 4,
      padField: true,
    });

    function applyKnobsToState() {
      if (suppressKnob) return;
      grid.xs[def.col] = kx0.getValue();
      grid.ys[def.row] = ky0.getValue();
      grid.xs[def.col + cs] = kx1.getValue();
      grid.ys[def.row + rs] = ky1.getValue();
      renderAll();
    }

    kx0.onChange(applyKnobsToState);
    ky0.onChange(applyKnobsToState);
    kx1.onChange(applyKnobsToState);
    ky1.onChange(applyKnobsToState);

    function onPointerDown(ev) {
      ev.preventDefault();
      dragMode = ev.ctrlKey || ev.metaKey ? 'br' : 'tl';
      mapEl.setPointerCapture(ev.pointerId);
      applyPointer(ev);
    }

    function onPointerMove(ev) {
      if (!dragMode) return;
      ev.preventDefault();
      applyPointer(ev);
    }

    function onPointerUp(ev) {
      if (dragMode) {
        try {
          mapEl.releasePointerCapture(ev.pointerId);
        } catch (_) {}
      }
      dragMode = null;
    }

    function applyPointer(ev) {
      const { sx, sy } = eventToSource(ev, mapEl);
      if (dragMode === 'tl') {
        grid.xs[def.col] = sx;
        grid.ys[def.row] = sy;
      } else if (dragMode === 'br') {
        grid.xs[def.col + cs] = sx;
        grid.ys[def.row + rs] = sy;
      }
      renderAll();
    }

    mapEl.addEventListener('pointerdown', onPointerDown);
    mapEl.addEventListener('pointermove', onPointerMove);
    mapEl.addEventListener('pointerup', onPointerUp);
    mapEl.addEventListener('pointercancel', onPointerUp);
    mapEl.addEventListener('contextmenu', (e) => e.preventDefault());

    const ro = new ResizeObserver(() => renderAll());
    ro.observe(resultEl);

    cards.push({ def, resultEl, mapEl, rectEl, kx0, ky0, kx1, ky1 });
    gridEl.appendChild(fig);
  }

  renderAll();

  const patternMount = document.getElementById('kas-pattern-mount');
  if (patternMount) {
    fetch(new URL('knobs-atlas-showcase-grid-pattern.json', import.meta.url))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        const w = Number(data.w);
        const h = Number(data.h);
        const c = data.c;
        if (!Array.isArray(c) || w * h !== c.length) return;
        for (let i = 0; i < c.length; i++) {
          if (!SLICE_BY_KEY.has(String(c[i]))) return;
        }
        patternKeys = c.map((k) => String(k));
        patternMount.innerHTML = '';
        patternMount.style.gridTemplateColumns = `repeat(${w}, minmax(0, 1fr))`;
        patternCellEls = [];
        for (let i = 0; i < patternKeys.length; i++) {
          const cell = document.createElement('div');
          cell.className = 'kas-pattern__cell';
          cell.dataset.sliceKey = patternKeys[i];
          cell.setAttribute('aria-hidden', 'true');
          patternMount.appendChild(cell);
          patternCellEls.push(cell);
        }
        const ro = new ResizeObserver(() => renderPatternCells());
        ro.observe(patternMount);
        renderPatternCells();
      })
      .catch(() => {});
  }
}

init();
