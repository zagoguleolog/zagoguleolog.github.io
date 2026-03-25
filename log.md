# Журнал

## 2026-03-22

- Теория: разделы в `music-theory.md` — относительные/параллельные тональности (relative / parallel keys), диатонические триады, тройка IV–I–V на кварто-квинтовом круге; термины в `domain.md`. Функция `diatonicTriadRootPcsInKey` в `lib/music-theory.js`; проверка в `verify-theory.js`.

- circle-scales: подсветка по корням диатонических триад; выбор лада (мажор / нат. минор); клик по внешнему сектору → мажор, по внутреннему → нат. минор; обновлены `overview.md`, `README.md`, `circle-scales.html`.

- circle-scales: убран выбор паттерна гаммы; подсветка только спица выбранной тоники (корни на внешнем кольце); внутреннее кольцо по умолчанию — минорные трезвучия (`Am` … `Dm`); клик по «Am» задаёт тонику A; обновлены `overview.md`, `README.md`; `DEFAULT_MINOR_LINE` в `circle-of-fifths.js`.

## 2026-03-25

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
