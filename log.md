# Журнал

## 2026-03-29

- Файл `knobs.png` в корне `music/`; страница [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html) — сетка карточек с каждым фрагментом спрайта (`synth-atlas-tile--…`). Обновлены `docs/synth-ui.md`, `docs/overview.md`, `README.md`, `web/stranichki.html`. Проверка: `npm run verify`.

- Фейдер synth-kit: исправлено горизонтальное смещение ручки (двойное центрирование CSS + JS); удалена отладочная отправка логов из `app/synth-kit/fader.mjs`.

- Атлас UI `knobs.png` (1024×1024, сетка 4×4): стили `app/synth-kit/knobs-atlas.css`, крутилка с `useKnobsAtlas` в `knob.mjs`, второй экземпляр в `app/synth-kit-demo.html`; документация `docs/synth-ui.md`, ссылки в `overview.md`, `README.md`, `.cursor/rules/documentation-map.mdc`. Проверка: `node --check app/synth-kit/knob.mjs`, `npm run verify`.

- Synth UI kit по плану: каталог `app/synth-kit/` — крутилка (`knob.mjs`), вертикальный фейдер (`fader.mjs`), семисегментный индикатор (`segment-display.mjs`, шрифт DSEG в `synth-kit.css`), тоггл, две кнопки в ячейке (`pair-buttons.mjs`), матрица чекбоксов (`checkbox-matrix.mjs`); демо `app/synth-kit-demo.html`; документация `docs/synth-ui.md`, термины в `docs/domain.md`, разделы в `docs/overview.md` и `docs/architecture.md`, `README.md`, `.cursor/rules/documentation-map.mdc`. Проверка: `node --check` на модулях kit, `npm run verify`.

## 2026-03-28

- Сверка документации с изменениями клавиатур: уточнены `docs/overview.md`, `docs/music-theory.md`, `docs/architecture.md`, `.cursor/rules/documentation-map.mdc`.

- Единый слой клавиатур и синта: модули `app/keyboard-layouts.mjs` (linear + piano), `keyboard-synth-controller.mjs` (pointer и классы воспроизведения), `keyboard-theory-highlight.mjs` (слой B, `ntg-key-hint`); контракт `ToneSynthEngine` в `tone-gen-engine.mjs`; рефакторинг `note-tone-gen.mjs` и `circle-scales.mjs`; на circle-scales подсветка pitch class ступеней гаммы выбранной тональности на видимой клавиатуре; `piano-keyboard.html` переведена на `buildPianoKeys` и `app/piano-keyboard-static.mjs`, стили `app/keyboard-piano.css`; обновлены `docs/overview.md`, `README.md`, `docs/music-theory.md`; `circle-scales.css` — стили подсказки. Проверка: `node --check` на затронутых `.mjs`, `npm run verify`.

## 2026-03-22

- Теория: разделы в `music-theory.md` — относительные/параллельные тональности (relative / parallel keys), диатонические триады, тройка IV–I–V на кварто-квинтовом круге; термины в `domain.md`. Функция `diatonicTriadRootPcsInKey` в `lib/music-theory.js`; проверка в `verify-theory.js`.

- circle-scales: подсветка по корням диатонических триад; выбор лада (мажор / нат. минор); клик по внешнему сектору → мажор, по внутреннему → нат. минор; обновлены `overview.md`, `README.md`, `circle-scales.html`.

- circle-scales: убран выбор паттерна гаммы; подсветка только спица выбранной тоники (корни на внешнем кольце); внутреннее кольцо по умолчанию — минорные трезвучия (`Am` … `Dm`); клик по «Am» задаёт тонику A; обновлены `overview.md`, `README.md`; `DEFAULT_MINOR_LINE` в `circle-of-fifths.js`.

## 2026-03-25

- circle-scales: баянная клавиатура (bayiano) **в 2 раза крупнее**: параметры рендера 32/18/6, без `compact`; правки `circle-scales.mjs`, `circle-scales.css`.

- circle-scales: режим **bayiano** — раскладка баяна B-system под кругом (`lib/bayan-b-system.js`, `app/bayan-keyboard.mjs`: `interactive`, `compact`, подписи в канонической энгармонике); общий `ToneGen` и подсветка с круга. `circle-scales.html`, `circle-scales.mjs`, `circle-scales.css`; `docs/overview.md`, `README.md`. `node --check`, `npm run verify`.

- circle-scales: переключатель вида клавиатуры **linear** / **piano** / **bayiano** (заглушка «Скоро»); раскладка piano компактнее `piano-keyboard.html`; общие `cts-play-key`, звук и подсветка с круга. `app/circle-scales.html`, `circle-scales.mjs`, `circle-scales.css`; `docs/overview.md`, `README.md`. `node --check app/circle-scales.mjs`, `npm run verify`.

- Репозиторий Git в каталоге `music/`: `git init`, `.gitignore` (node_modules, .env, секреты), первый коммит `7a36197` — «Начальный коммит: music (теория, круг, синтез, схема клавиш фортепиано)».

- Баян **B-system**: документ `docs/bayan-b-system.md` (горизонтальное описание рядов, шаг **м3** вдоль ряда, хроматика по диагонали, формулы `r`, `k`, `x_unit` от **номера ноты MIDI**); модуль `lib/bayan-b-system.js`; страница `app/bayan-keyboard.html` (+ CSS/модули) с настраиваемым диапазоном MIDI и параметрами вёрстки. Обновлены `music-theory.md`, `domain.md`, `overview.md`, `README.md`, `.cursor/rules/documentation-map.mdc`, `scripts/static-server.js`, `scripts/verify-theory.js`. В каталог `music` добавлен эталон `Расположение_нот_на_баяне.jpg`. Проверка: `npm run verify`.

- Страница `piano-keyboard.html`: верстка схемы клавиш фортепиано (две октавы C4–B5), подсказки PC и энгармоника; документация: `docs/music-theory.md` (подраздел «Раскладка клавиш фортепиано»), `docs/overview.md`, `README.md`.

- circle-scales: клавиатура под кругом без подписи и абзаца над клавишами; плотнее к SVG (`circle-scales.html`, `circle-scales.css`).

- circle-scales: под кругом секция **клавиатура нот** (`#cts-keys-wrap`, классы рядов как на note-tone-gen); общий `ToneGen` и поля `cts-ntg-*`; при смене «Октава с/по» глушатся только голоса клавиатуры (не триады круга с ключом `cts:`). Правки: `app/circle-scales.html`, `circle-scales.mjs`, `circle-scales.css`; `docs/overview.md`, `README.md`. Проверка: `node --check app/circle-scales.mjs`, `npm run verify`.

- Убрано временное отладочное инструментирование: POST на локальный ingest в `app/tone-gen-engine.mjs` (createVoice, stopVoiceSmooth), `dbgLog` в `app/circle-scales.mjs`; удалена неиспользуемая переменная `audioPolicy` в `syncChordAudioAndList`. Проверка: `node --check` на изменённых `.mjs`, `npm run verify`.

- Подсветка тональности на `circle-scales`: по умолчанию **три спицы** IV–I–V опорного мажора (шесть секторов); галочка «седьмая триада вне IV–I–V» — vii°/ii° на остальной окружности. Новые функции в `lib/music-theory.js` (`relativeMajorTonicNameFromNaturalMinorTonic`, `majorIvRootPcSet`, `referenceMajorTonicForIvIvCluster`, `isSectorTonalityHighlightOn`); переписан `applyTonalityHighlight` в `app/circle-scales.mjs`; UI `circle-scales.html`, стиль чекбокса в `circle-scales.css`; `docs/music-theory.md`, `docs/overview.md`, `README.md`; тесты в `scripts/verify-theory.js`. `npm run verify`.

- Синтез: **форма колебания** задаёт тип осциллятора для всех включённых частичных тонов (раньше n≥2 были только sine; на circle-scales не создавался n=1 — форма не работала). **Угасание**: `linearRampToValueAtTime` на master gain вместо экспоненты; при инициализации `updateIfPlaying()` синхронизирует `releaseSmoothSec` с ползунком. Инструментирование `fetch` в `tone-gen-engine.mjs` (createVoice, stopVoiceSmooth). Правки HTML-подписей, `overview.md`.

- Генератор тона и панель круга: ползунок **угасания** при отпускании (20 мс…5 с), `stopVoiceSmooth` и плавные стопы используют `ToneGen.releaseSmoothSec`; поле `release-ms` в `tone-gen-ui-shared.mjs`; HTML `note-tone-gen` / `circle-scales`. Смесь обертонов: коэффициент `HARM_SERIES_WEIGHT` в `tone-gen-engine.mjs` для более заметного эффекта слайдера; подсказка на странице, `docs/overview.md`, `music-theory.md`. Проверка: `node --check`.

- Круг (документация и подсказки): число **спиц** n = min длин списков; в SVG **2×n** кликабельных `.cof-sector` (два кольца на спицу, общий `data-index`); подсветка диатоники по индексу спицы — оба кольца. Правки: `docs/overview.md`, `README.md`, `app/circle-of-fifths.html`, шапка `app/circle-of-fifths.js`, первая подсказка `app/circle-scales.html`, `docs/music-theory.md` (нат. мажор: 3 мажорные + 3 минорные + vii°; подписи и спица), `docs/domain.md`, JSDoc в `app/circle-scales.mjs`. Проверка: `npm run verify`.

- Круг + синтез: `app/tone-gen-engine.mjs` (Web Audio, полифония с `mapKey`, `initToneGenTheory` без статического импорта теории в цепочке `note-tone-gen`); `app/tone-gen-ui-shared.mjs`; рефакторинг `note-tone-gen.mjs`; `circle-of-fifths.js` — `onSectorSelectionChange`; `circle-scales.html|css|mjs` — узкая панель управления, октава корня триады, список нот под кругом, озвучивание мажорной/минорной триады выделенных секторов; обновлены `docs/music-theory.md`, `docs/overview.md`, `README.md`. Проверка: `node --check` на изменённых `.mjs`.

- circle-scales: тёмная тема всей страницы в стиле боковой панели синтеза (`app/circle-scales.css`: палитра на `.cts-wide-page`, оформление body/основного столбца/круга при наличии `.cof-page.cts-wide-page`).

- circle-scales: тексты и aria про тональность и диатонику; подсказка про относительные тональности (одинаковая зелёная подсветка) и про форматы подписей (C, Am; не dim/7); раздел в `docs/music-theory.md`; `overview.md`, `README.md`.

- Русские краткие обозначения интервалов (м2, б2, ч4, ч5, у5 …) в `docs/music-theory.md` и `docs/domain.md`; сид `INTERVAL_CATALOG_SEED` с полем `ruShort`, `getIntervalCatalog()` и колонка «рус. кратко» в `renderTheoryTables`; триады: б3+м3 / м3+б3 и ч5; пентатоники с параллельной русской строкой.

- Ссылки на локальный результат: приоритет абсолютный путь без `file:` (вставка в браузер); правка `AI_RULES.md`, `documentation-map.mdc`, `overview.md`.

- Правило «прямая ссылка на результат»: `docs/AI_RULES.md`, `documentation-map.mdc`, уточнение в `overview.md`.

- Добавлены `app/circle-of-fifths.html|css|js`: интерактивное кольцо; API `CircleOfFifthsDrawer.draw(svg, [внешняя строка, внутренняя строка])`; спиц столько, сколько пар после разбора (min длин), в DOM — 2×n секторов. Обновлены `docs/overview.md`, `README.md`.

- Паттерны гамм: `naturalMinor` (TtTTtTT), `majorPentatonic` (2,2,3,2,3); `SCALE_PATTERN_SEEDS`, `docs/music-theory.md`, `scripts/verify-theory.js`.

- Круг + теория: `app/circle-scales.html`, `circle-scales.css`, `circle-scales.mjs`; расширение `circle-of-fifths.js` (`data-labelRaw`, `draw` third arg). `docs/overview.md`.

- `circle-scales-core.js`: круг при file://; статические кнопки паттерна/тоники в `circle-scales.html`; предупреждение если модуль теории не загрузился.

- `npm run verify:http` — проверка отдачи `lib/music-theory.js` и страниц при работающем `npm run serve`; таблица прямых URL в `README.md`.

- Частоты и равномерная темпация: раздел в `docs/music-theory.md`; термины в `docs/domain.md`; `DEFAULT_A4_HZ`, `A4_MIDI_NOTE`, `midiNoteFromPcOctave`, `frequencyFromMidi`, `frequencyFromNoteNameOctave` в `lib/music-theory.js`; проверки в `scripts/verify-theory.js`.

- Генератор тона: `app/note-tone-gen.html`, `note-tone-gen.css`, `note-tone-gen.mjs` (Web Audio, обертоны 2–16, A4/октава); `docs/overview.md`, `docs/music-theory.md`, строка URL в `scripts/static-server.js`.

- note-tone-gen: диапазон октав (min/max), ряды кнопок; режим «фиксация полифония» (независимые голоса, повторный клик глушит одну ноту); `docs/overview.md`.

- note-tone-gen: галочка n=1 (основной тон); выключение — только обертоны; `docs/overview.md`.

- note-tone-gen: по умолчанию октавы 3–6 (на одну октаву больше рядов кнопок).

## 2026-03-26

- 23:46:06 — Страницы: добавлена карта `web/stranichki.html` со всеми ссылками на HTML-страницы и основные MD-доки; проверка: `npm run verify:http` OK.
