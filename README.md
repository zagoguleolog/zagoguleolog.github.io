# zagoguleolog.github.io

Сайт музыкальной теории. Публичная версия: **https://zagoguleolog.github.io/**

## GitHub Pages

В настройках репозитория: **Source → Deploy from a branch**, ветка **main**, папка **`/ (root)`** (корень репо — каталог `music/` при отдельном репозитории только для сайта). Ожидаемый URL: `https://<user>.github.io/<repo>/`. Точка входа для пользователя: **`index.html`** (краткая витрина основных интерактивных страниц); полная карта сайта — **`web/stranichki.html`**. Навигация (`site-nav.mjs`) строит ссылки относительно каталога `music/`, чтобы меню работало с префиксом репозитория на Pages; ссылка «Главная» ведёт на **`index.html`**.

## Структура

```text
project_template/
├── README.md
├── CONTRIBUTING.md
├── app/
├── scripts/
├── tests/
├── docs/
│   ├── AI_RULES.md
│   ├── overview.md
│   ├── architecture.md
│   ├── domain.md
│   ├── dev-pipeline.md
│   ├── dev-cheatsheet.md
│   ├── testing.md
│   ├── errors.md
│   └── system/
│       ├── pipeline.md
│       ├── development-regulation.md
│       ├── quality-standard.md
│       ├── quality-gates.md
│       ├── commenting-standard.md
│       ├── versioning.md
│       └── review-checklist.md
└── .cursor/
    └── rules/
```

## Визуализация теории

- **Кварто-квинтовый круг (SVG):** откройте в браузере [`app/circle-of-fifths.html`](app/circle-of-fifths.html) — два редактируемых списка нот; число **спиц** (пар подписей) — по меньшей длине списков, кликабельных **секторов** в разметке вдвое больше (**два** на спицу: внешнее и внутреннее кольцо). См. раздел в [`docs/overview.md`](docs/overview.md).
- **Круг + тональность:** [`app/circle-scales.html`](app/circle-scales.html) — подсветка диатоники по кластеру **IV–I–V** (три спицы, шесть аккордов; опционально седьмая триада) через [`lib/music-theory.js`](lib/music-theory.js); выбор тоники и лада (мажор / нат. минор), режим клика; боковая панель синтеза ([`app/tone-gen-engine.mjs`](app/tone-gen-engine.mjs)), озвучивание выделенных секторов и **клавиатура нот под кругом** (linear / piano / bayiano — B-system как на [`app/bayan-keyboard.html`](app/bayan-keyboard.html); те же октавы и режимы, что в панели); внутреннее кольцо по умолчанию — относительные миноры. Круг при `file://` поднимает [`app/circle-scales-core.js`](app/circle-scales-core.js); для подсветки и синтеза при блокировке модулей — `npm run serve`.
- **Схема клавиш фортепиано:** [`piano-keyboard.html`](piano-keyboard.html) — две октавы через [`app/keyboard-layouts.mjs`](app/keyboard-layouts.mjs); нужен `npm run serve`. Подробнее в [`docs/music-theory.md`](docs/music-theory.md).
- **Баян B-system:** [`app/bayan-keyboard.html`](app/bayan-keyboard.html) — три ряда в горизонтальной ориентации, параметры диапазона MIDI и вёрстки; [`docs/bayan-b-system.md`](docs/bayan-b-system.md), [`lib/bayan-b-system.js`](lib/bayan-b-system.js).
- **UI синтеза (synth-kit):** [`app/synth-kit-demo.html`](app/synth-kit-demo.html) — демо блоков (крутилка, фейдер, семисегментный индикатор, тоггл, пара кнопок, матрица); [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html) — все фрагменты спрайта `knobs.png` отдельно; опционально текстуры из [`app/synth-kit/knobs-atlas.css`](app/synth-kit/knobs-atlas.css); модули в [`app/synth-kit/`](app/synth-kit/); [`docs/synth-ui.md`](docs/synth-ui.md).

### Локальный сервер (прямые ссылки)

В каталоге `music` выполните `npm run serve` (порт по умолчанию **4173**, см. `PORT` в `scripts/static-server.js`). В браузере:

| Страница | URL |
|----------|-----|
| Круг + тональность | **http://127.0.0.1:4173/app/circle-scales.html** |
| Клавиатура фортепиано (схема) | **http://127.0.0.1:4173/piano-keyboard.html** |
| Баян B-system | **http://127.0.0.1:4173/app/bayan-keyboard.html** |
| Таблицы из теории | **http://127.0.0.1:4173/theory-tables.html** |
| Демо synth-kit | **http://127.0.0.1:4173/app/synth-kit-demo.html** |
| Галерея атласа knobs.png | **http://127.0.0.1:4173/app/knobs-atlas-showcase.html** |
| Корень (`index.html`, витрина; полная карта — `web/stranichki.html`) | **http://127.0.0.1:4173/** |

Проверка отдачи `lib/music-theory.js` с `application/javascript`: в отдельном терминале при уже запущенном сервере — `npm run verify:http`.

## Как использовать

1. Скопируйте `project_template` в новый репозиторий.
2. Адаптируйте `docs/overview.md`, `docs/architecture.md`, `docs/domain.md` под предметную область.
3. Оставьте `docs/system/*` как Source of Truth для процессов и качества.
4. Настройте правила AI в `.cursor/rules/*` под стек команды.
