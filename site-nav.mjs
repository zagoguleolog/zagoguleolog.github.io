/**
 * Навигация по HTML-страницам каталога music: «Главная» → `index.html`; выпадающее меню — те же
 * основные интерактивные страницы, что в блоке «Страницы» на `index.html`. Базовый путь из
 * `import.meta.url`, чтобы ссылки работали и при локальном HTTP-сервере разработки и на
 * GitHub Pages (префикс `/<repo>/`). Полный перечень HTML — `web/stranichki.html`.
 */
const SITE_ROOT = new URL('./', import.meta.url);

function siteHref(relativePath) {
  return new URL(relativePath, SITE_ROOT).href;
}

const SITE_NAV_ENTRIES = [
  { path: 'app/circle-scales.html', label: 'Квартово-квинтовый круг и тональность' },
  { path: 'app/lads.html', label: 'Лады и арпеджио по ступеням' },
  { path: 'app/lads2.html', label: 'Лады: три таблицы и арпеджио' },
  { path: 'app/intervals-demo.html', label: 'Интервалы и клавиатура' },
  { path: 'app/seventh-chords.html', label: 'Септаккорды и клавиатура' },
  { path: 'app/seventh-chords-mobile.html', label: 'Септаккорды fullscreen' },
];

export const SITE_NAV_LINKS = SITE_NAV_ENTRIES.map(({ path, label }) => ({
  href: siteHref(path),
  label,
}));

export function mountSiteNav() {
  const wrap = document.createElement('div');
  wrap.className = 'site-nav';
  wrap.setAttribute('data-site-nav', '');

  const bar = document.createElement('div');
  bar.className = 'site-nav__bar';

  const home = document.createElement('a');
  home.className = 'site-nav__home';
  home.href = siteHref('index.html');
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
