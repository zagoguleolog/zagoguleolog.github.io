# Project Template

Универсальный шаблон структуры веб-проекта с базовыми правилами для AI-агента, разработки, ревью и документации.

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
- **Круг + тональность:** [`app/circle-scales.html`](app/circle-scales.html) — подсветка диатоники по кластеру **IV–I–V** (три спицы, шесть аккордов; опционально седьмая триада) через [`lib/music-theory.js`](lib/music-theory.js); выбор тоники и лада (мажор / нат. минор), режим клика; боковая панель синтеза ([`app/tone-gen-engine.mjs`](app/tone-gen-engine.mjs)), озвучивание выделенных секторов и **клавиатура нот под кругом** (те же октавы и режимы, что в панели); внутреннее кольцо по умолчанию — относительные миноры. Круг при `file://` поднимает [`app/circle-scales-core.js`](app/circle-scales-core.js); для подсветки и синтеза при блокировке модулей — `npm run serve`.
- **Схема клавиш фортепиано:** [`piano-keyboard.html`](piano-keyboard.html) — верстка белых/чёрных клавиш на две октавы (научная нотация); без JS. Подробнее в [`docs/music-theory.md`](docs/music-theory.md).
- **Баян B-system:** [`app/bayan-keyboard.html`](app/bayan-keyboard.html) — три ряда в горизонтальной ориентации, параметры диапазона MIDI и вёрстки; [`docs/bayan-b-system.md`](docs/bayan-b-system.md), [`lib/bayan-b-system.js`](lib/bayan-b-system.js).

### Локальный сервер (прямые ссылки)

В каталоге `music` выполните `npm run serve` (порт по умолчанию **4173**, см. `PORT` в `scripts/static-server.js`). В браузере:

| Страница | URL |
|----------|-----|
| Круг + тональность | **http://127.0.0.1:4173/app/circle-scales.html** |
| Клавиатура фортепиано (схема) | **http://127.0.0.1:4173/piano-keyboard.html** |
| Баян B-system | **http://127.0.0.1:4173/app/bayan-keyboard.html** |
| Таблицы из теории | **http://127.0.0.1:4173/theory-tables.html** |
| Корень (редирект на theory-tables) | **http://127.0.0.1:4173/** |

Проверка отдачи `lib/music-theory.js` с `application/javascript`: в отдельном терминале при уже запущенном сервере — `npm run verify:http`.

## Как использовать

1. Скопируйте `project_template` в новый репозиторий.
2. Адаптируйте `docs/overview.md`, `docs/architecture.md`, `docs/domain.md` под предметную область.
3. Оставьте `docs/system/*` как Source of Truth для процессов и качества.
4. Настройте правила AI в `.cursor/rules/*` под стек команды.
