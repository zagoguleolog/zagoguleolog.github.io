/**
 * Горизонтальный pager: swipe между .mobile-shell__panel, счётчик и точки.
 */

/**
 * @typedef {object} MobileShellOptions
 * @property {readonly string[]} [panelLabels] подписи для aria-label точек
 * @property {'always' | 'auto'} [mode] always — shell на любом viewport; auto — только узкий + touch
 * @property {boolean} [landscapeLock] псевдо-ландшафт в portrait
 */

const COARSE_QUERY = '(max-width: 52rem) and (pointer: coarse)';

/**
 * @param {HTMLElement} root элемент с классом .mobile-shell
 * @param {MobileShellOptions} [options]
 */
export function initMobileShell(root, options = {}) {
  const { panelLabels = [], mode = 'auto', landscapeLock = true } = options;

  const track = root.querySelector('.mobile-shell__track');
  const counter = root.querySelector('.mobile-shell__counter');
  const dotsRoot = root.querySelector('.mobile-shell__dots');
  const panels = [...root.querySelectorAll('.mobile-shell__panel')];

  if (!track || panels.length === 0) return;

  /** @type {MediaQueryList | null} */
  let coarseMq = null;
  if (mode === 'auto' && typeof window.matchMedia === 'function') {
    coarseMq = window.matchMedia(COARSE_QUERY);
  }

  /** @type {HTMLButtonElement[]} */
  const dots = [];

  function shellActive() {
    if (mode === 'always') return true;
    if (root.classList.contains('mobile-shell--force')) return true;
    return coarseMq?.matches ?? false;
  }

  function applyShellState() {
    const active = shellActive();
    root.classList.toggle('mobile-shell--active', active);
    if (landscapeLock) {
      root.classList.toggle('mobile-shell--landscape-lock', active);
      document.body.classList.toggle('mobile-shell-portrait-lock', active);
    }
    if (!active) {
      track.scrollLeft = 0;
    }
    updatePager();
  }

  if (dotsRoot) {
    dotsRoot.replaceChildren();
    panels.forEach((panel, index) => {
      const label = panelLabels[index] ?? panel.getAttribute('aria-label') ?? `Экран ${index + 1}`;
      panel.dataset.mobilePanelIndex = String(index + 1);
      panel.setAttribute('aria-roledescription', 'экран');

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'mobile-shell__dot';
      dot.setAttribute('aria-label', label);
      dot.addEventListener('click', () => scrollToIndex(index));
      dotsRoot.appendChild(dot);
      dots.push(dot);
    });
  }

  function scrollToIndex(index) {
    if (!shellActive()) return;
    const clamped = Math.max(0, Math.min(index, panels.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' });
  }

  function currentIndex() {
    if (track.clientWidth <= 0) return 0;
    return Math.max(0, Math.min(Math.round(track.scrollLeft / track.clientWidth), panels.length - 1));
  }

  function updatePager() {
    const index = currentIndex();
    const human = index + 1;
    if (counter) counter.textContent = `${human} / ${panels.length}`;
    for (let i = 0; i < dots.length; i += 1) {
      dots[i].setAttribute('aria-current', i === index ? 'true' : 'false');
    }
    panels.forEach((panel, i) => {
      panel.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
  }

  track.addEventListener(
    'scroll',
    () => {
      window.requestAnimationFrame(updatePager);
    },
    { passive: true },
  );

  window.addEventListener('resize', () => {
    applyShellState();
  });

  if (coarseMq) {
    const onMq = () => applyShellState();
    if (typeof coarseMq.addEventListener === 'function') {
      coarseMq.addEventListener('change', onMq);
    } else {
      coarseMq.addListener(onMq);
    }
  }

  applyShellState();
  updatePager();
}
