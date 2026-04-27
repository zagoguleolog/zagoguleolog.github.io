# Architecture

## Слои системы

1. Presentation layer
2. Application layer
3. Domain layer
4. Infrastructure layer

## Принципы

- Явные контракты между слоями.
- Минимизация связности и дублирования.
- Изоляция внешних интеграций через адаптеры.
- Возможность модульного тестирования доменной логики.

## Поток данных

Опишите путь данных: входной запрос -> валидация -> бизнес-обработка -> сохранение -> ответ.

## Клиентские модули (каталог `music`)

Общая навигация по HTML-страницам: [`site-nav.css`](../site-nav.css) и [`site-nav.mjs`](../site-nav.mjs) — целевые `href` собираются через `new URL(..., import.meta.url)` от корня каталога `music/`, чтобы меню работало и при корне локального сервера разработки, и на GitHub Pages с префиксом `/<repo>/`. Выпадающий список повторяет основные ссылки с корневого `index.html` (в т.ч. `app/lads2.html`); «Главная» ведёт на `index.html`. На страницах с постоянно тёмным фоном (линия synth) на корне документа задаётся атрибут `data-site-nav-theme="dark"` на элементе `<html>` — в `site-nav.css` под него включены переопределения цветов панели и кнопок без дублирования логики в JS.

Доменная теория — [`lib/music-theory.js`](../lib/music-theory.js). Интерактивные страницы с клавиатурой и синтезом разделяют: движок Web Audio [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs) (JSDoc-контракт `ToneSynthEngine`), общие поля формы [`app/tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs), геометрию клавиатур [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs), контроллер указателя и классов воспроизведения [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs), подсказку по ладу на клавишах [`app/keyboard-theory-highlight.mjs`](../app/keyboard-theory-highlight.mjs). Переиспользуемые блоки UI синтеза (крутилка, фейдер, индикатор, матрица и т.д.) — каталог [`app/synth-kit/`](../app/synth-kit/), см. [synth-ui.md](synth-ui.md). Связка слоёв data / engine / UI / клавиатуры — [synth-structure.md](synth-structure.md).

У страниц с макетом `.cts-layout` + `.cts-tone-rail` + `.cts-main-column` ([`app/circle-scales.html`](../app/circle-scales.html), [`app/intervals-demo.html`](../app/intervals-demo.html), [`app/seventh-chords.html`](../app/seventh-chords.html), [`app/lads.html`](../app/lads.html), [`app/lads2.html`](../app/lads2.html)) стили лежат в [`app/circle-scales.css`](../app/circle-scales.css): при узком viewport основная колонка идёт визуально первой (`flex` + `order` у `.cts-main-column`), узкая колонка с панелью синтеза — ниже; `position: sticky` у рельса отключается на этом брейкпоинте. Модуль [`app/cts-tone-rail.mjs`](../app/cts-tone-rail.mjs) при загрузке оборачивает содержимое `aside.cts-tone-rail` в `.cts-tone-rail__body`, добавляет шапку с кнопкой «Спрятать» / «Показать» (класс `is-collapsed` на aside скрывает тело панели); общее состояние свёрнутости хранится в `localStorage` под ключом `music.cts-tone-rail.collapsed`.

[`app/seventh-chords-mobile.html`](../app/seventh-chords-mobile.html) — отдельная fullscreen-копия страницы септаккордов для горизонтального мобильного экрана без прокрутки. Она переиспользует `ToneGen`, `tone-gen-ui-shared.mjs`, `keyboard-layouts.mjs`, `keyboard-synth-controller.mjs`, `computer-keyboard-music.mjs`, `bayan-keyboard.mjs` и `getSeventhChordCatalog()`, но вместо `.cts-tone-rail` использует собственную сетку [`app/seventh-chords-mobile.css`](../app/seventh-chords-mobile.css): верхняя строка звука, левый столбец шести типов септаккордов, центральная клавиатура и нижняя строка выбора вида клавиатуры. UI «Голоса» и «Артикуляция» на мобильной копии не выводится; в коде зафиксирован дефолт `keyboardMode = 'holdPoly'`.
