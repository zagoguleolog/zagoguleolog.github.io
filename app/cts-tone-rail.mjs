/**
 * Общая колонка `.cts-tone-rail`: шапка с переключателем видимости блоков (UI синта) и контейнер тела панели.
 * Состояние «свернуто» хранится в localStorage для всех страниц с этим макетом.
 */
const STORAGE_KEY = 'music.cts-tone-rail.collapsed';
const BODY_ID = 'cts-tone-rail-body';

/**
 * Один раз оборачивает содержимое aside в `.cts-tone-rail__body` и вставляет `.cts-tone-rail__chrome` с кнопкой «Спрятать» / «Показать».
 */
export function mountCtsToneRail() {
  const aside = document.querySelector('.cts-tone-rail');
  if (!aside || aside.dataset.ctsToneRailMounted === '1') return;

  const body = document.createElement('div');
  body.className = 'cts-tone-rail__body';
  body.id = BODY_ID;

  while (aside.firstChild) {
    body.appendChild(aside.firstChild);
  }

  const chrome = document.createElement('div');
  chrome.className = 'cts-tone-rail__chrome';

  const title = document.createElement('span');
  title.className = 'cts-tone-rail__title';
  title.textContent = 'Синтез';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cts-tone-rail__toggle';
  btn.setAttribute('aria-controls', BODY_ID);

  chrome.append(title, btn);
  aside.append(chrome, body);

  function readCollapsed() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  function writeCollapsed(collapsed) {
    try {
      if (collapsed) localStorage.setItem(STORAGE_KEY, '1');
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore quota / private mode */
    }
  }

  function setUi(collapsed) {
    aside.classList.toggle('is-collapsed', collapsed);
    btn.textContent = collapsed ? 'Показать' : 'Спрятать';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    writeCollapsed(collapsed);
  }

  setUi(readCollapsed());
  btn.addEventListener('click', () => {
    setUi(!aside.classList.contains('is-collapsed'));
  });

  aside.dataset.ctsToneRailMounted = '1';
}
