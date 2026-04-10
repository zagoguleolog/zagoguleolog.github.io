/**
 * Рендер SVG поля баяна (B-system или четырёхрядная хроматическая сетка); данные из lib/bayan-b-system.js.
 */
import { buildBayanButtonModels, B_SYSTEM_ROW_COUNT } from '../lib/bayan-b-system.js';
import { CHROMATIC_NAMES_SHARP_BY_PC } from '../lib/music-theory.js';

const ROW_LABELS_3 = ['3-й ряд', '2-й ряд', '1-й ряд'];
const ROW_LABELS_4 = ['4-й ряд', '3-й ряд', '2-й ряд', '1-й ряд'];

/**
 * @param {SVGCircleElement} circle
 * @param {SVGTextElement} textEl
 * @param {{ whiteKeyStyle: boolean }} btn
 */
function styleButton(circle, textEl, btn) {
  if (btn.whiteKeyStyle) {
    circle.setAttribute('fill', '#ffffff');
    circle.setAttribute('stroke', '#000000');
    circle.setAttribute('stroke-width', '2');
    textEl.setAttribute('fill', '#000000');
  } else {
    circle.setAttribute('fill', '#000000');
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '2');
    textEl.setAttribute('fill', '#ffffff');
  }
}

/**
 * @param {HTMLElement} container
 * @param {{ midiMin: number, midiMax: number, cellWidth: number, buttonRadius: number, rowGap: number, staggerFraction: number, brickHalfSteps: number, rowCount?: number, interactive?: boolean, compact?: boolean, chromaticNamesByPc?: readonly string[] }} opts
 */
export function renderBayanKeyboard(container, opts) {
  const {
    midiMin,
    midiMax,
    cellWidth,
    buttonRadius,
    rowGap,
    staggerFraction,
    brickHalfSteps,
    rowCount = B_SYSTEM_ROW_COUNT,
    interactive = false,
    compact = false,
    chromaticNamesByPc,
  } = opts;
  const interactiveNamesByPc = chromaticNamesByPc ?? CHROMATIC_NAMES_SHARP_BY_PC;

  const labelColW = compact ? 50 : 72;
  const pad = compact ? 8 : 14;

  const buttons = buildBayanButtonModels({
    midiMin,
    midiMax,
    staggerFraction,
    rowCount,
  });

  const rowPitch = 2 * buttonRadius + rowGap;
  const brickDx = brickHalfSteps * buttonRadius;

  function brickShiftRow(rowTopDown) {
    return (rowCount - 1 - rowTopDown) * brickDx;
  }

  let maxCx = 0;
  let minCx = Infinity;
  for (const b of buttons) {
    const cx = labelColW + pad + brickShiftRow(b.rowTopDown) + b.xUnits0 * cellWidth + buttonRadius;
    minCx = Math.min(minCx, cx - buttonRadius);
    maxCx = Math.max(maxCx, cx + buttonRadius);
  }

  if (!buttons.length) {
    minCx = 0;
    maxCx = labelColW + pad * 2;
  }

  const width = Math.max(maxCx + pad, labelColW + 200);
  const height = rowCount * rowPitch + pad * 2;

  const rowLabels = rowCount === 4 ? ROW_LABELS_4 : ROW_LABELS_3;
  const ariaKeyboard =
    rowCount === 4 ? 'Четырёхрядная хроматическая сетка (баян)' : 'Клавиатура баяна B-system';

  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(Math.min(width, compact ? 960 : 1400)));
  svg.setAttribute('aria-label', ariaKeyboard);
  if (interactive) {
    svg.classList.add('cts-bayan-svg');
  }

  const frame = document.createElementNS(svgNS, 'rect');
  frame.setAttribute('x', '2');
  frame.setAttribute('y', '2');
  frame.setAttribute('width', String(width - 4));
  frame.setAttribute('height', String(height - 4));
  frame.setAttribute('rx', '12');
  frame.setAttribute('fill', '#ffffff');
  frame.setAttribute('stroke', '#c4bcb2');
  frame.setAttribute('stroke-width', '1');
  frame.classList.add('cts-bayan-frame');
  svg.appendChild(frame);

  const rowLabelFs = compact ? '10' : '13';
  for (let r = 0; r < rowCount; r++) {
    const ty = pad + r * rowPitch + rowPitch / 2;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', String(4));
    t.setAttribute('y', String(ty + 4));
    t.setAttribute('font-size', rowLabelFs);
    t.setAttribute('fill', '#333');
    t.classList.add('cts-bayan-row-label');
    t.textContent = rowLabels[r];
    svg.appendChild(t);
  }

  for (const b of buttons) {
    const cx = labelColW + pad + brickShiftRow(b.rowTopDown) + b.xUnits0 * cellWidth + buttonRadius;
    const cy = pad + b.rowTopDown * rowPitch + rowPitch / 2;

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(buttonRadius));
    circle.setAttribute('data-midi', String(b.midi));

    const textEl = document.createElementNS(svgNS, 'text');
    textEl.setAttribute('x', String(cx));
    textEl.setAttribute('y', String(cy + 5));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute(
      'font-size',
      String(Math.max(compact ? 8 : 11, Math.floor(buttonRadius * (compact ? 0.38 : 0.42)))),
    );
    textEl.setAttribute('font-weight', '600');
    textEl.textContent = b.label;

    styleButton(circle, textEl, b);

    if (interactive) {
      const name = interactiveNamesByPc[b.pc];
      const octave = b.octave;
      circle.setAttribute('data-note', name);
      circle.setAttribute('data-octave', String(octave));
      circle.classList.add('cts-play-key', 'cts-byan-key', 'ntg-key');
      circle.setAttribute('role', 'button');
      textEl.textContent = `${name}${octave}`;
      textEl.setAttribute('pointer-events', 'none');
      circle.style.cursor = 'pointer';
    }

    svg.appendChild(circle);
    svg.appendChild(textEl);
  }

  container.replaceChildren(svg);
}
