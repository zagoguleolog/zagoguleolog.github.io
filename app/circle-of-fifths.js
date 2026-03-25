/**
 * Интерактивное кольцо секторов по двум спискам подписей (внешнее / внутреннее).
 * Термины: pitch class (PC), энгармоника — см. docs/domain.md.
 *
 * Вход drawCircleOfFifths: [строка внешнего кольца, строка внутреннего кольца] —
 * ноты через пробел или запятую. Число спиц (пар подписей) n = min(длины списков);
 * лишние имена отбрасываются. На каждую спицу — две группы g с классом cof-sector
 * (внешнее и внутреннее кольцо), одна и та же data-index; в SVG 2n кликабельных секторов.
 */

(function () {
  'use strict';

  var CX = 500;
  var CY = 500;
  var R_HOLE = 120;
  var R_MID = 290;
  var R_OUTER = 400;

  var NS = 'http://www.w3.org/2000/svg';

  /**
   * Разбор строки в список подписей (пустые токены отбрасываются).
   * @param {string} line
   * @returns {string[]}
   */
  function parseNoteList(line) {
    if (!line || typeof line !== 'string') return [];
    return line
      .split(/[\s,;]+/u)
      .map(function (t) {
        return t.trim();
      })
      .filter(Boolean);
  }

  /**
   * Пара внешняя/внутренняя подпись по индексу сектора.
   * @param {string[]} outer
   * @param {string[]} inner
   * @returns {{ n: number, pairs: { outer: string, inner: string }[] }}
   */
  function zipRingLabels(outer, inner) {
    var n = Math.min(outer.length, inner.length);
    var pairs = [];
    for (var i = 0; i < n; i++) {
      pairs.push({ outer: outer[i], inner: inner[i] });
    }
    return { n: n, pairs: pairs };
  }

  /**
   * Дуговой сектор кольца: две дуги + два радиальных отрезка.
   * Углы в радианах, направление как в плане (C сверху: θ = -π/2 + …).
   */
  function annularSectorPath(cx, cy, rInner, rOuter, a0, a1) {
    var cos0 = Math.cos(a0);
    var sin0 = Math.sin(a0);
    var cos1 = Math.cos(a1);
    var sin1 = Math.sin(a1);
    var xo0 = cx + rOuter * cos0;
    var yo0 = cy + rOuter * sin0;
    var xo1 = cx + rOuter * cos1;
    var yo1 = cy + rOuter * sin1;
    var xi0 = cx + rInner * cos0;
    var yi0 = cy + rInner * sin0;
    var xi1 = cx + rInner * cos1;
    var yi1 = cy + rInner * sin1;
    var delta = a1 - a0;
    var large = Math.abs(delta) > Math.PI ? 1 : 0;
    var sweepOuter = delta > 0 ? 1 : 0;
    var sweepInner = delta > 0 ? 0 : 1;
    return (
      'M ' +
      xo0 +
      ' ' +
      yo0 +
      ' A ' +
      rOuter +
      ' ' +
      rOuter +
      ' 0 ' +
      large +
      ' ' +
      sweepOuter +
      ' ' +
      xo1 +
      ' ' +
      yo1 +
      ' L ' +
      xi1 +
      ' ' +
      yi1 +
      ' A ' +
      rInner +
      ' ' +
      rInner +
      ' 0 ' +
      large +
      ' ' +
      sweepInner +
      ' ' +
      xi0 +
      ' ' +
      yi0 +
      ' Z'
    );
  }

  /** Полный вращающийся ринг (один сектор на всю окружность). */
  function fullAnnulusPath(cx, cy, rInner, rOuter) {
    return (
      'M ' +
      (cx + rOuter) +
      ' ' +
      cy +
      ' A ' +
      rOuter +
      ' ' +
      rOuter +
      ' 0 1 1 ' +
      (cx - rOuter) +
      ' ' +
      cy +
      ' A ' +
      rOuter +
      ' ' +
      rOuter +
      ' 0 1 1 ' +
      (cx + rOuter) +
      ' ' +
      cy +
      ' M ' +
      (cx + rInner) +
      ' ' +
      cy +
      ' A ' +
      rInner +
      ' ' +
      rInner +
      ' 0 1 0 ' +
      (cx - rInner) +
      ' ' +
      cy +
      ' A ' +
      rInner +
      ' ' +
      rInner +
      ' 0 1 0 ' +
      (cx + rInner) +
      ' ' +
      cy +
      ' Z'
    );
  }

  function polar(cx, cy, r, theta) {
    return { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
  }

  /** Дробь «A / B» (энгармоника) или одна строка — в tspans. */
  function appendLabelLines(textEl, raw) {
    var parts = raw
      .split(/\s*\/\s*/u)
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    if (parts.length === 0) {
      textEl.textContent = '';
      return;
    }
    if (parts.length === 1) {
      textEl.textContent = parts[0];
      return;
    }
    for (var p = 0; p < parts.length; p++) {
      var ts = document.createElementNS(NS, 'tspan');
      ts.textContent = parts[p];
      if (p > 0) ts.setAttribute('x', textEl.getAttribute('x') || '0');
      ts.setAttribute('dy', p === 0 ? '0' : '1.15em');
      textEl.appendChild(ts);
    }
  }

  function makeSectorGroup(kind, index, pathD, labelRaw, mid, rText) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'cof-sector cof-sector--' + kind);
    g.setAttribute('role', 'button');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-pressed', 'false');
    g.setAttribute(
      'aria-label',
      (kind === 'major' ? 'Внешний сектор: ' : 'Внутренний сектор: ') + labelRaw
    );
    g.dataset.kind = kind;
    g.dataset.index = String(index);
    g.dataset.labelRaw = labelRaw;

    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', pathD);
    g.appendChild(path);

    var pos = polar(CX, CY, rText, mid);
    var text = document.createElementNS(NS, 'text');
    text.setAttribute('x', String(pos.x));
    text.setAttribute('y', String(pos.y));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    appendLabelLines(text, labelRaw);
    g.appendChild(text);

    return g;
  }

  function toggleSelected(g) {
    var on = !g.classList.contains('is-selected');
    g.classList.toggle('is-selected', on);
    g.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  /**
   * Одно выделенное «синее» — с остальных снимается is-selected (без тоггла по повторному клику).
   * @param {SVGSVGElement} svg
   * @param {SVGGElement} g
   */
  function selectExclusiveSector(svg, g) {
    var sectors = svg.querySelectorAll('.cof-sector');
    for (var i = 0; i < sectors.length; i++) {
      var el = sectors[i];
      el.classList.remove('is-selected');
      el.setAttribute('aria-pressed', 'false');
    }
    g.classList.add('is-selected');
    g.setAttribute('aria-pressed', 'true');
  }

  /**
   * @param {SVGGElement} g
   * @param {{
   *   onSectorActivate?: function(SVGGElement, Event): boolean|void,
   *   onSectorSelectionChange?: function(SVGSVGElement, SVGGElement): void,
   *   getSectorSelectionMode?: function(): 'toggle'|'exclusive'
   * }} [options]
   *   Если onSectorActivate вернёт false — выделение сектора (is-selected) не переключается.
   *   onSectorSelectionChange — после успешного переключения is-selected (передаётся svg и группа сектора).
   *   getSectorSelectionMode — при каждом акте: 'exclusive' = только один выбранный сектор (без снятия кликом по тому же).
   */
  function bindToggle(g, options) {
    options = options || {};
    function onActivate(e) {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      if (e.type === 'keydown') e.preventDefault();
      if (options.onSectorActivate) {
        var cont = options.onSectorActivate(g, e);
        if (cont === false) return;
      }
      var svg = g.ownerSVGElement;
      var mode =
        typeof options.getSectorSelectionMode === 'function'
          ? options.getSectorSelectionMode()
          : 'toggle';
      if (mode === 'exclusive' && svg) {
        selectExclusiveSector(svg, g);
      } else {
        toggleSelected(g);
      }
      if (options.onSectorSelectionChange) {
        if (svg) {
          try {
            options.onSectorSelectionChange(svg, g);
          } catch (err) {
            console.error(err);
          }
        }
      }
    }
    g.addEventListener('click', onActivate);
    g.addEventListener('keydown', onActivate);
  }

  /**
   * Рисует круг в SVG-элементе.
   * @param {SVGSVGElement} svg
   * @param {[string, string]} notePairLines — [внешнее кольцо, внутреннее кольцо]
   * @param {{
   *   afterDraw?: function(SVGSVGElement, { pairs: {outer:string,inner:string}[], n: number }): void,
   *   onSectorActivate?: function(SVGGElement, Event): boolean|void,
   *   onSectorSelectionChange?: function(SVGSVGElement, SVGGElement): void,
   *   getSectorSelectionMode?: function(): 'toggle'|'exclusive'
   * }} [options]
   */
  function drawCircleOfFifths(svg, notePairLines, options) {
    if (!svg || !notePairLines || notePairLines.length < 2) return;
    options = options || {};

    var outer = parseNoteList(notePairLines[0]);
    var inner = parseNoteList(notePairLines[1]);
    var zipped = zipRingLabels(outer, inner);
    var n = zipped.n;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var defs = document.createElementNS(NS, 'defs');
    svg.appendChild(defs);

    if (n === 0) {
      var emptyHint = document.createElementNS(NS, 'text');
      emptyHint.setAttribute('x', String(CX));
      emptyHint.setAttribute('y', String(CY));
      emptyHint.setAttribute('text-anchor', 'middle');
      emptyHint.setAttribute('class', 'cof-empty-msg');
      emptyHint.setAttribute('fill', '#666');
      emptyHint.setAttribute('font-size', '22');
      emptyHint.textContent =
        'Добавьте ноты в обе строки (через пробел или запятую).';
      svg.appendChild(emptyHint);
      if (options.afterDraw) {
        try {
          options.afterDraw(svg, { pairs: [], n: 0 });
        } catch (err) {
          console.error(err);
        }
      }
      return;
    }

    var half = Math.PI / n;

    for (var i = 0; i < n; i++) {
      var mid = -Math.PI / 2 + i * ((2 * Math.PI) / n);
      var a0 = mid - half;
      var a1 = mid + half;
      var pair = zipped.pairs[i];

      var gMajor;
      var gMinor;
      if (n === 1) {
        gMajor = makeSectorGroup(
          'major',
          i,
          fullAnnulusPath(CX, CY, R_MID, R_OUTER),
          pair.outer,
          mid,
          (R_MID + R_OUTER) / 2
        );
        gMinor = makeSectorGroup(
          'minor',
          i,
          fullAnnulusPath(CX, CY, R_HOLE, R_MID),
          pair.inner,
          mid,
          (R_HOLE + R_MID) / 2
        );
      } else {
        gMajor = makeSectorGroup(
          'major',
          i,
          annularSectorPath(CX, CY, R_MID, R_OUTER, a0, a1),
          pair.outer,
          mid,
          (R_MID + R_OUTER) / 2
        );
        gMinor = makeSectorGroup(
          'minor',
          i,
          annularSectorPath(CX, CY, R_HOLE, R_MID, a0, a1),
          pair.inner,
          mid,
          (R_HOLE + R_MID) / 2
        );
      }

      bindToggle(gMajor, options);
      bindToggle(gMinor, options);
      svg.appendChild(gMajor);
      svg.appendChild(gMinor);
    }

    if (options.afterDraw) {
      try {
        options.afterDraw(svg, { pairs: zipped.pairs, n: n });
      } catch (err) {
        console.error(err);
      }
    }

    var center = document.createElementNS(NS, 'circle');
    center.setAttribute('cx', String(CX));
    center.setAttribute('cy', String(CY));
    center.setAttribute('r', String(R_HOLE));
    center.setAttribute('class', 'cof-center-disk');
    svg.appendChild(center);
  }

  /** Демо: классический полный круг (12 секторов), порядок по квинтам от C. */
  var DEFAULT_MAJOR_LINE =
    'C G D A E B F# Db Ab Eb Bb F';
  var DEFAULT_MINOR_LINE =
    'Am Em Bm F#m C#m G#m D#m Bbm Fm Cm Gm Dm';

  window.CircleOfFifthsDrawer = {
    draw: drawCircleOfFifths,
    parseNoteList: parseNoteList,
    zipRingLabels: zipRingLabels,
    DEFAULT_MAJOR_LINE: DEFAULT_MAJOR_LINE,
    DEFAULT_MINOR_LINE: DEFAULT_MINOR_LINE,
  };

  function initPage() {
    var svg = document.getElementById('circle');
    var majorEl = document.getElementById('cof-major-line');
    var minorEl = document.getElementById('cof-minor-line');
    var btn = document.getElementById('cof-redraw');
    if (!svg || !majorEl || !minorEl) return;

    function redraw() {
      drawCircleOfFifths(svg, [majorEl.value, minorEl.value]);
    }

    majorEl.value = majorEl.value || DEFAULT_MAJOR_LINE;
    minorEl.value = minorEl.value || DEFAULT_MINOR_LINE;
    redraw();
    if (btn) btn.addEventListener('click', redraw);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})();
