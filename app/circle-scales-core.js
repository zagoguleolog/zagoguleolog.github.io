/**
 * Без ES-модулей: круг и строки по умолчанию (работает при file://).
 * Подсветка тональности в circle-scales.mjs подменяет window.__ctsRedraw.
 */
(function () {
  'use strict';

  function drawBasic() {
    var svg = document.getElementById('cts-circle');
    var D = window.CircleOfFifthsDrawer;
    if (!svg || !D || typeof D.draw !== 'function') return;
    D.draw(svg, [D.DEFAULT_MAJOR_LINE, D.DEFAULT_MINOR_LINE], {});
  }

  function onReady() {
    window.__ctsRedraw = drawBasic;
    drawBasic();
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
