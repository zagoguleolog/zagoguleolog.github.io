/**
 * Навигация по HTML-страницам каталога music — тот же набор, что в разделе «HTML-страницы» на
 * `web/stranichki.html`. Пути от корня сервера (`npm run serve`).
 */
export const SITE_NAV_LINKS = [
  { href: '/web/stranichki.html', label: 'web/stranichki.html (главная)' },
  { href: '/web/index.html', label: 'web/index.html (таблицы из теории)' },
  { href: '/theory-tables.html', label: 'theory-tables.html (корень music)' },
  { href: '/piano-keyboard.html', label: 'piano-keyboard.html (клавиатура)' },
  { href: '/app/bayan-keyboard.html', label: 'app/bayan-keyboard.html (B-system)' },
  { href: '/app/note-tone-gen.html', label: 'app/note-tone-gen.html (генератор тона)' },
  { href: '/app/sequencer-demo.html', label: 'app/sequencer-demo.html (мини-сквенсор / арпеджио)' },
  { href: '/app/lads.html', label: 'app/lads.html (лады + арпеджио по ступеням)' },
  { href: '/app/template-synth.html', label: 'app/template-synth.html (темплейт-синт, synth-kit)' },
  { href: '/app/circle-of-fifths.html', label: 'app/circle-of-fifths.html (круг)' },
  { href: '/app/circle-scales.html', label: 'app/circle-scales.html (круг + тональность)' },
  { href: '/app/intervals-demo.html', label: 'app/intervals-demo.html (интервалы + клавиатура)' },
  { href: '/app/synth-kit-demo.html', label: 'app/synth-kit-demo.html (демо UI-синта)' },
  { href: '/app/knobs-atlas-showcase.html', label: 'app/knobs-atlas-showcase.html (галерея фрагментов knobs.png)' },
];

export function mountSiteNav() {
  const wrap = document.createElement('div');
  wrap.className = 'site-nav';
  wrap.setAttribute('data-site-nav', '');

  const bar = document.createElement('div');
  bar.className = 'site-nav__bar';

  const home = document.createElement('a');
  home.className = 'site-nav__home';
  home.href = '/web/stranichki.html';
  home.textContent = 'Главная';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'site-nav__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'site-nav-panel');
  toggle.textContent = 'Меню';

  const panel = document.createElement('ul');
  panel.className = 'site-nav__panel';
  panel.id = 'site-nav-panel';

  for (const item of SITE_NAV_LINKS) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = item.href;
    a.textContent = item.label;
    li.appendChild(a);
    panel.appendChild(li);
  }

  function setOpen(open) {
    wrap.classList.toggle('site-nav--open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  setOpen(false);

  toggle.addEventListener('click', () => {
    setOpen(!wrap.classList.contains('site-nav--open'));
  });

  document.addEventListener(
    'click',
    (ev) => {
      if (!wrap.classList.contains('site-nav--open')) return;
      const t = ev.target;
      if (t instanceof Node && wrap.contains(t)) return;
      setOpen(false);
    },
    true,
  );

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && wrap.classList.contains('site-nav--open')) {
      setOpen(false);
    }
  });

  bar.appendChild(home);
  bar.appendChild(toggle);
  wrap.appendChild(bar);
  wrap.appendChild(panel);
  wrap.setAttribute('role', 'navigation');
  wrap.setAttribute('aria-label', 'По сайту');

  document.body.appendChild(wrap);
}
