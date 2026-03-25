/**
 * Без ES-модулей: круг и строки по умолчанию (работает при file://).
 * Подсветка тоники в circle-scales.mjs подменяет window.__ctsRedraw.
 */
(function () {
  'use strict';

  function drawBasic() {
    var svg = document.getElementById('cts-circle');
    var D = window.CircleOfFifthsDrawer;
    var m = document.getElementById('cts-major-line');
    var n = document.getElementById('cts-minor-line');
    if (!svg || !D || typeof D.draw !== 'function' || !m || !n) return;
    if (!m.value.trim()) m.value = D.DEFAULT_MAJOR_LINE;
    if (!n.value.trim()) n.value = D.DEFAULT_MINOR_LINE;
    D.draw(svg, [m.value, n.value], {});
  }

  function onReady() {
    window.__ctsRedraw = drawBasic;
    drawBasic();
    var b = document.getElementById('cts-redraw');
    if (b) {
      b.addEventListener('click', function () {
        if (typeof window.__ctsRedraw === 'function') window.__ctsRedraw();
      });
    }
    window.setTimeout(function () {
      if (window.__ctsTheoryLoaded) return;
      var w = document.getElementById('cts-theory-warning');
      if (w) w.hidden = false;
    }, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
