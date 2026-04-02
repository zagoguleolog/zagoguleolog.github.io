#065 | 2026-04-02 — DONE | Корневой `index.html`: статичная витрина (четыре комби-страницы: `circle-scales`, `lads`, `intervals-demo`, `seventh-chords`), ссылка на полную карту `web/stranichki.html`; `site-nav` + `mountSiteNav`; «Главная» → `index.html`; пункт меню `web/stranichki.html` — подпись «полная карта сайта». Документация: `docs/overview.md`, `README.md`, `docs/music-theory.md`, подсказка `web/stranichki.html`; сообщение в `static-server.js`. Проверка: `npm run verify`, `npm run verify:http` OK

#064 | 2026-04-02 — DONE | GitHub Pages: корневой `index.html` (редирект на `web/stranichki.html`); `site-nav.mjs` — `new URL(..., import.meta.url)` для всех пунктов меню и «Главная»; порядок ссылок и `app/seventh-chords.html` как на `web/stranichki.html`; `static-server.js` — `GET /` → `index.html`; `.gitignore` — `.cursor/`, `*.log`, проч.; README, `docs/overview.md`, `docs/architecture.md`, подсказка `web/stranichki.html`, правка старой записи в `log.md`. Проверка: `npm run verify`, `npm run verify:http` OK

#063 | 2026-04-02 — DONE | Подключён удалённый репозиторий GitHub: `git remote add origin` → `https://github.com/zagoguleolog/zagoguleolog.github.io.git`, `merge origin/main --allow-unrelated-histories`, разрешён конфликт `README.md` (заголовок сайта + ссылка на Pages, сохранено описание проекта), ветка `main`, `git push -u origin main` OK. Локально незакоммичены правки в `app/lads.mjs` (как до операции)

#062 | 2026-04-01 — DONE | Страница `app/seventh-chords.html`: таблица типов септаккордов из `getSeventhChordCatalog()` (шесть строк, поля как в разделе «Септаккорды» `docs/music-theory.md`) и клавиатура (режимы linear / piano / bayiano / bayiano4) на общем движке `ToneGen` (`seventh-chords.mjs`); при выборе строки и нажатии ноты строится соответствующий септаккорд 1–3–5–7 (верхние три ноты как отдельные голоса с префиксом `sc7:` в `mapKey`), все четыре ноты подсвечиваются на активной клавиатуре и затухают по общим настройкам синта; смена типа не переоценивает уже зажатые ноты. Страница добавлена в `web/stranichki.html`. Проверка: `npm run verify` OK

#061 | 2026-04-01 — DONE | Теория септаккордов: раздел «Септаккорды» в `docs/music-theory.md` (шесть базовых типов, интервальные формулы, качества 3 и 7 ступеней, связь с диатоникой); сиды `SEVENTH_CHORD_SEED` и каталог `getSeventhChordCatalog()` в `lib/music-theory.js` без дублирования чисел полутонов (используются интервалы из `INTERVAL_CATALOG_SEED`); таблица «Типы септаккордов» в `renderTheoryTables`. Проверка: `npm run verify` OK

#060 | 2026-03-31 — DONE | `circle-scales.html`: подключены `keyboard-piano.css` и `bayan-keyboard.css` как на `intervals-demo.html` — единый визуальный стиль пиано-клавиатуры и баяна + сохранён слой подсказки лада (`ntg-key-hint`) и подсветка воспроизведения; `npm run verify` OK

#059 | 2026-03-29 — DONE | **hold**: визуал `ntg-key-down` — `stripAllKeyDown` при новом нажатии (ПК/мышь), `keyup`/pointer up|leave|cancel останавливают моно только при совпадении ноты с `latchedKey`; `docs/synth-structure.md`, `docs/errors.md` ERR-002; `node --check`, `npm run verify` OK

#059 | 2026-03-29 — DONE | **`holdPoly`**: полифония с удержанием (ПК + pointer) — `startPolyVoice` / `stopPolyVoiceSmooth`; UI круга — голоса (моно/поли) + артикуляция (`hold`/`latch` vs `holdPoly`/`latchPoly`); дефолт клавиатуры **полифония + удержание**; `docs/synth-structure.md`, `overview.md`, `domain.md`; `node --check`, `npm run verify` OK

#058 | 2026-03-29 — DONE | **bayiano4**: `BAYAN_CHROMATIC_4_PC_ROWS_FROM_TOP` — стартовые клавиши **Digit4 / KeyE / KeyS / KeyZ** (4-й…1-й ряд баян), при octave-min 3 — **Eb3 / D3 / C#3 / C3**; `docs/synth-structure.md`, `overview.md`, `bayan-b-system.md`, JSDoc; `node --check`, `npm run verify`, smoke KeyZ/KeyS/KeyE/Digit4 OK

#057 | 2026-03-29 — DONE | **bayiano** / **bayiano4**: `createBayanCodeMap` — префикс по колонке (не суффикс): первая клавиша ряда ПК → минимальная колонка в диапазоне (**C3/C#3/D3** при octave-min 3); избыток кнопок — справа без ПК; `docs/synth-structure.md`, JSDoc; `node --check`, `npm run verify`, smoke OK

#056 | 2026-03-29 — DONE | **bayiano** ПК: ряды **A / W / 3** — `BAYAN_PC_ROW_1` (`KeyA`…`Quote`), `BAYAN_PC_ROW_2` (`KeyW`…`Backslash`), `BAYAN_PC_ROW_3` (`Digit3`…`Equal`); JSDoc `createBayanCodeMap`; `docs/synth-structure.md`, `overview.md`, `log.md`; `node --check`, `npm run verify` OK

#055 | 2026-03-29 — DONE | Баян **4 ряда** (четырёхрядная хроматическая сетка): `rowCount` в `lib/bayan-b-system.js`, `renderBayanKeyboard` / `bayan-keyboard.html`, `createBayanCodeMap(..., { rowCount })` + `ROW0`…`ROW3`; **bayiano4** на `circle-scales`; документация `bayan-b-system.md`, `domain.md`, `overview.md`, `synth-structure.md`, `music-theory.md`; `npm run verify` OK

#054 | 2026-03-29 — DONE | **bayiano** ПК: стартовые ряды **S / E / 4** — `BAYAN_PC_ROW_1`…`BAYAN_PC_ROW_3` в `createBayanCodeMap` (`[BAYAN_PC_ROW_3, BAYAN_PC_ROW_2, BAYAN_PC_ROW_1]` по `rowTopDown`); JSDoc; `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify`, smoke KeyS/KeyE/Digit4 OK

#053 | 2026-03-29 — DONE | **bayiano** + ПК: `createBayanCodeMap` — ряды `ROW2`/`ROW1`/`ROW0` ↔ ряды (баян) 1-й…3-й, порядок по `rowIndexTopDownFromMidi` / `chromaticColumnFromMidi`, усечение слева при избытке кнопок; `getBayanCodeMap` в `keyboard-synth-controller.mjs`, `circle-scales.mjs`; `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify`, smoke `createBayanCodeMap` OK

#052 | 2026-03-29 — DONE | **Linear** ПК: октава UI = целый физический ряд (`1234567890-=`, `qwertyuiop[]`, `asdfghjkl;'`+`Backslash`, `zxcvbnm,./`+`Backquote`+`Space`); `linearComputerCodesForOctaveRange`; `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify` OK

#051 | 2026-03-29 — DONE | Линейная клавиатура: **верстка** снова одна сетка `.ntg-keys` на октаву; привязка ПК без изменений (`linearComputerCodesForOctaveRange`, ряды с `Digit1` / `KeyQ` / `KeyA` / `KeyZ`); убраны `.ntg-linear-oct` / `.ntg-linear-row`; `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify` OK

#050 | 2026-03-29 — DONE | Линейная клавиатура **4×3** на октаву (ряды как `Digit1` / `KeyQ` / `KeyA` / `KeyZ`): `buildLinearKeys`, `linearComputerCodesForOctaveRange` + `linearIndexFromCode`, `bindComputerKeyboard.getLinearComputerCodes` (`circle-scales.mjs`); **bayiano** — прежний `SEQUENTIAL_ROW_CODES`; стили `.ntg-linear-oct` / `.ntg-linear-row`; `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify` OK

#049 | 2026-03-29 — DONE | Режим **piano** на ПК: `createPianoCodeMap` — четыре ряда (цифры / Q…\\ / ASDF…' / Z…/), белые подряд от C в `octave-min`, чёрные с дырами EF/BC; кламп MIDI; `docs/synth-structure.md`; `node --check`, `npm run verify`, проверка уникальности MIDI в карте OK

#048 | 2026-03-29 — DONE | `circle-scales`: ввод с ПК — `computer-keyboard-music.mjs` (`SEQUENTIAL_ROW_CODES`, `createPianoCodeMap`), `keyboard-synth-controller` `bindComputerKeyboard` (hold/latch/latchPoly, `ntg-key-down`, игнор repeat и полей ввода); `docs/synth-structure.md`, `overview.md`; `node --check`, `npm run verify` OK

#047 | 2026-03-29 — DONE | `circle-scales`: тембр — CSS Grid 3×2 вместо двух flex-колонок (пары строк выровнены по верху, `justify-items: start`); лог H3 row-pair top deltas; `docs/synth-ui.md`; `npm run verify` OK

#046 | 2026-03-29 — DONE | `circle-scales`: две колонки `.cts-synth-kit-col` — слева 3 крутилки, справа обертоны + спад + фейдер; CSS overrides для `tpl-kit-cell--fader`; лог H2 (ingest d27c8d); `docs/synth-ui.md`; `npm run verify` OK

#045 | 2026-03-29 — DONE | `circle-scales`: панель тембра — ряд `.cts-synth-kit-row` (крутилки+фейдер слева, матрица справа), подписи «Обертоны»; `docs/synth-ui.md`; отладочный лог геометрии (ingest d27c8d) до подтверждения и снятия; `npm run verify` OK

#044 | 2026-03-29 — DONE | `.synth-seg--value-control`: убрана высота ячейки крутилки, плотные вертикальные отступы и `line-height: 1` — блок координат по высоте цифр

#043 | 2026-03-29 — DONE | synth-kit `segment-value-control.mjs` + CSS: семисегмент и жесты как у крутилки; галерея атласа на `createSegmentValueControl`; `docs/synth-ui.md`, `documentation-map.mdc`, HTML; `node --check`, `npm run verify` OK

#042 | 2026-03-29 — DONE | `knobs-atlas-showcase`: тестовая сетка 8×8 внизу страницы по `knobs-atlas-showcase-grid-pattern.json` (64 ключа, все фрагменты атласа, структура 2×2-квадранты); `docs/synth-ui.md`; `node --check`, `npm run verify` OK

#041 | 2026-03-29 — DONE | `knobs-atlas-showcase`: `DEFAULT_XS[4]` 997 (было 1003); `node --check`, `npm run verify` OK

#040 | 2026-03-29 — DONE | `knobs-atlas-showcase`: дефолтная сетка `DEFAULT_XS`/`DEFAULT_YS` захардкожена из экспорта (xs/ys для подрезки атласа); `docs/synth-ui.md`; `node --check`, `npm run verify` OK

#039 | 2026-03-29 — DONE | Галерея `knobs-atlas-showcase`: общая сетка `xs`/`ys` (5×5 линий), `col`/`row`/`colSpan`/`rowSpan` в SLICES, `brand_interface` 2×1 ячейка, `normalizeGrid`, `renderAll`, ключ `knobs-atlas-showcase-grid-v1`, миграция из `crops-v2`, экспорт `{ xs, ys, slices }`; `docs/synth-ui.md`, подсказки в HTML; `node --check`, `npm run verify` OK

#038 | 2026-03-29 — DONE | Тёмная тема `site-nav`: `html[data-site-nav-theme="dark"]` в `site-nav.css`; атрибут на `note-tone-gen`, `template-synth`, `synth-kit-demo`, `knobs-atlas-showcase`, `circle-scales`; абзац в `docs/architecture.md`; `npm run verify` OK

#037 | 2026-03-29 — DONE | `circle-scales`: два набора режимов — круг под SVG, клавиатура + Стоп в одной строке; `ToneGen.keyboardMode`, `keyboard-synth-controller` (`effectiveKeyboardMode`); `synth-structure.md`, `overview.md`, подсказка в HTML; `npm run verify` OK

#036 | 2026-03-29 — DONE | `circle-scales.html`: synth-kit (`mountTemplateSynthKit`, `template-synth.css`), режимы удержания/фиксации/полифонии + Стоп над клавиатурой; убраны список триад под кругом и текстовый статус с частотами; `circle-scales.css`, `circle-scales.mjs`; `docs/overview.md`; `npm run verify` OK

#035 | 2026-03-29 — DONE | Навигация: `site-nav.css|mjs`, все 11 HTML, главная `web/stranichki.html` + пункт в списке; `/` → stranichki в `static-server.js`; `verify-http` для `/`; README + `music-theory.md`; `npm run verify`, `npm run verify:http` OK

#034 | 2026-03-29 — DONE | `template-synth`: убран блок режимов клавиатуры; фиксирован hold; правки `synth-structure.md`, `synth-ui.md`; `node --check`, `npm run verify` OK

#033 | 2026-03-29 — DONE | Темплейт-синт: `app/template-synth.html|css|mjs`, `readHarmEnabled` + `[data-partial]`, `docs/synth-structure.md`, overview/architecture/synth-ui/documentation-map/stranichki/static-server; `node --check`, `npm run verify` OK

#034 | 2026-03-29 — DONE | `knobs-atlas-showcase`: блок экспорта — одна строка JSON координат + копирование; `docs/synth-ui.md`

#033 | 2026-03-29 — DONE | Галерея атласа: на блок — кроп (x0,y0,x1,y1), мини-карта + 4× createKnob; `knobs-atlas-showcase-page.mjs`; `docs/synth-ui.md`

#032 | 2026-03-29 — DONE | Самопроверка `knobs-atlas-showcase`: в корне задано `--knobs-cell: var(--synth-cell)` (после снятия knobs-atlas.css иначе замер 0); HTTP 200 страница и `knobs.png`; `npm run verify` OK

#031 | 2026-03-29 — DONE | Галерея `knobs-atlas-showcase`: обрезка краёв всего `knobs.png`, затем сетка 4×4 в JS; `docs/synth-ui.md`

#030 | 2026-03-29 — DONE | `knobs-atlas-showcase.html`: шапка — 4 поля отступов обрезки рамки ячейки (px), localStorage; `docs/synth-ui.md`

#029 | 2026-03-29 — DONE | Фейдер: центр ручки — убраны инлайн `left`/`transform` в `fader.mjs` (оставлено центрирование из `synth-kit.css`); снята отладочная инструментация ingest

#029 | 2026-03-29 — DONE | `knobs.png` в корне music; страница `app/knobs-atlas-showcase.html` (галерея фрагментов атласа); `docs/synth-ui.md`, `overview.md`, `README.md`; `npm run verify` OK

#028 | 2026-03-29 — DONE | Атлас knobs.png: `app/synth-kit/knobs-atlas.css`, опция `useKnobsAtlas` в `knob.mjs`, демо в `synth-kit-demo.html`; `docs/synth-ui.md`, `overview.md`, `README.md`, `documentation-map.mdc`; `node --check`, `npm run verify` OK

#027 | 2026-03-29 — DONE | Synth UI kit: `app/synth-kit/` (knob, fader, segment-display, toggle, pair-buttons, checkbox-matrix, `synth-kit.css`), `app/synth-kit-demo.html`; `docs/synth-ui.md`, `domain.md`, `overview.md`, `architecture.md`, `README.md`, `documentation-map.mdc`; шрифт DSEG с jsDelivr; `node --check`, `npm run verify` OK

#026 | 2026-03-28 — DONE | Документация: сверка с рефакторингом клавиатур — дополнены `docs/overview.md`, `docs/music-theory.md`, `docs/architecture.md`, `.cursor/rules/documentation-map.mdc` (модули keyboard-* и `ntg-key-hint`)

#025 | 2026-03-28 — DONE | Единый слой клавиатур: `app/keyboard-layouts.mjs`, `keyboard-synth-controller.mjs`, `keyboard-theory-highlight.mjs`; JSDoc `ToneSynthEngine` в `tone-gen-engine.mjs`; рефакторинг `note-tone-gen.mjs`, `circle-scales.mjs`; подсветка лада (слой B) на клавиатуре круга; `piano-keyboard.html` + `piano-keyboard-static.mjs` + `keyboard-piano.css`; docs overview/README/music-theory; `node --check`, `npm run verify` OK

#024 | 2026-03-26 — DONE | Страницы: добавлена карта `web/stranichki.html` со всеми ссылками на HTML-страницы и основные MD-доки; `npm run verify:http` OK

#022 | 2026-03-25 — DONE | Баян B-system: `docs/bayan-b-system.md` (теория + формулы), `lib/bayan-b-system.js`, `app/bayan-keyboard.html|css|mjs|page.mjs`; `music-theory.md`, `domain.md`, `overview.md`, `README.md`, `documentation-map.mdc`, `static-server.js`, `verify-theory.js`; эталон `Расположение_нот_на_баяне.jpg`; `npm run verify` OK

#022 | 2026-03-25 — DONE | Git в `music/`: init, `.gitignore`, коммит `7a36197` (начальный снимок проекта)

#021 | 2026-03-25 — DONE | `piano-keyboard.html`: схема белых/чёрных клавиш (октавы 4–5); `music-theory.md` (раскладка клавиш), `overview.md`, `README.md`; `npm run verify` OK

#023 | 2026-03-25 — DONE | circle-scales: баян под кругом — удвоены `cellWidth`/`buttonRadius`/`rowGap` (32/18/6), `compact: false`; CSS min-height/min-width и обводка активной клавиши

#022 | 2026-03-25 — DONE | circle-scales: режим **bayiano** — интерактивный SVG B-system (`renderBayanKeyboard` + `interactive`/`compact` в `bayan-keyboard.mjs`, `CANONICAL_TONIC_BY_PC`, `#cts-bayan-wrap`); те же `cts-play-key`, подсветка и синтез; стили `circle-scales.css`; overview, README; `npm run verify` OK

#021 | 2026-03-25 — DONE | circle-scales: переключатель вида клавиатуры linear / piano / bayiano (заготовка); пиано-раскладка компактнее piano-keyboard.html; общие `cts-play-key`, подсветка и звук как у линейной; `circle-scales.html|css|mjs`; overview, README; `npm run verify` OK

#020 | 2026-03-25 — DONE | circle-scales: убраны заголовок и текст над клавиатурой; уменьшены отступы панели от круга (`circle-scales.html`, `circle-scales.css`)

#019 | 2026-03-25 — DONE | circle-scales: клавиатура нот под кругом (`#cts-keys-wrap`, те же режимы/октавы что боковая панель); `circle-scales.mjs` (NOTE_NAMES, mono/poly как note-tone-gen, ключи круга `cts:` не трогаем при смене диапазона октав); стили `circle-scales.css`; `circle-scales.html`; `overview.md`, `README.md`; `npm run verify` OK

#018 | 2026-03-25 — DONE | Удалено отладочное инструментирование: `fetch`/ingest в `tone-gen-engine.mjs` (createVoice, stopVoiceSmooth), `dbgLog` и вызовы в `circle-scales.mjs`; убрана переменная `audioPolicy` (осталась только для логов); `npm run verify` OK

#017 | 2026-03-25 — DONE | Подсветка тональности: кластер IV–I–V (3 спицы / 6 аккордов); опция «седьмая триада»; `music-theory.js` (relativeMajor, `majorIvRootPcSet`, `isSectorTonalityHighlightOn`); `circle-scales.mjs|html|css`; docs overview, music-theory, README; `verify-theory.js`

#016 | 2026-03-25 — DONE | circle-scales: тёмная тема всей страницы как у боковой панели синта (`circle-scales.css`: токены на `.cts-wide-page`, `body:has(> .cof-page.cts-wide-page)` для фона и основного столбца/SVG); `npm run verify` OK

#015 | 2026-03-25 — DONE | Круг: согласование доков и UI — спицы (n пар) vs 2n секторов в DOM; overview, README, `circle-of-fifths.html|js`, `circle-scales.html`, `music-theory.md` (3 маж.+3 мин.+vii°, геометрия спицы), `domain.md` (термин спица), JSDoc у `applyTonalityHighlight` в `circle-scales.mjs`; `npm run verify` OK

#016 | 2026-03-25 — DONE | Синтез: форма колебания на всех частичных тонах; на круге чекбокс n=1; угасание — linearRamp + sync release при init; логи createVoice/stopVoiceSmooth (debug)

#015 | 2026-03-25 — DONE | Генератор/круг: ползунок угасания 20 мс…5 с (`release-ms`, `ToneGen.releaseSmoothSec`); усиление слышимости «смеси обертонов» (`HARM_SERIES_WEIGHT`); подсказки и `overview`/`music-theory`

#014 | 2026-03-25 — DONE | Круг + синтез: `tone-gen-engine.mjs`, `tone-gen-ui-shared.mjs`, `note-tone-gen` на движке; `circle-of-fifths` `onSectorSelectionChange`; `circle-scales` боковая панель, триады выбранных секторов; `music-theory.md`, `overview.md`

#013 | 2026-03-25 — DONE | circle-scales UI/доки: формулировки «тональность», относительные тональности и совпадение подсветки; ограничения подписей в подсказке + music-theory.md; overview + README

#012 | 2026-03-25 — DONE | Интервалы: рус. кратко (м2, б2, ч4, ч5, …) + `ruShort` в INTERVAL_CATALOG_SEED; docs/domain + таблица в renderTheoryTables

#011 | 2026-03-25 — DONE | Теория: триады (мажор M3+m3, минор m3+M3) в music-theory.md + domain

#012 | 2026-03-22 — DONE | Теория: относительные/параллельные тональности, IV–I–V на круге; diatonicTriadRootPcsInKey; circle-scales подсветка диатоники + лад

#011 | 2026-03-22 — DONE | circle-scales: тоника без гамм; внутр. кольцо минорные аккорды; подсветка спицы по внешнему кольцу

#010 | 2026-03-25 — DONE | note-tone-gen: дефолт диапазона октав +1 (max 6)

#009 | 2026-03-25 — DONE | note-tone-gen: чекбокс n=1 (выкл. основной тон, только обертоны)

#008 | 2026-03-25 — DONE | note-tone-gen: диапазон октав + режим полифонической фиксации

#007 | 2026-03-25 — DONE | Веб: note-tone-gen — тон по нотам, громкость, волна, обертоны, hold/latch, overview

#006 | 2026-03-25 — DONE | Теория: частоты (A4 440/432, смена опоры), MIDI, ET в lib + docs + domain + verify

#006 | 2026-03-25 — DONE | verify:http + README: прямые http://127.0.0.1:4173/… ссылки

#005 | 2026-03-25 — DONE | circle-scales: гамма на круге, режимы клика, draw options

#004 | 2026-03-25 — DONE | Гаммы: naturalMinor, majorPentatonic в lib + docs + verify

#003 | 2026-03-25 — DONE | Локальные ссылки: путь без file:, не file:///

#002 | 2026-03-25 — DONE | AI_RULES: всегда прямая ссылка на артефакт; карта docs + overview

#001 | 2026-03-25 — DONE | Круг: draw(svg, [2 строки]), число секторов от min длин списков

#060 | 2026-03-31 — DONE | Страница `app/intervals-demo.html`: таблица интервалов 0–12 полутонов из `getIntervalCatalog()` (`INTERVAL_CATALOG_SEED`), клавиатура с режимами **linear / piano / bayiano / bayiano4** и вводом с ПК как на `circle-scales` (`ToneGen`, `keyboard-layouts.mjs`, `keyboard-synth-controller.mjs`, `computer-keyboard-music.mjs`); при выборе интервала и нажатии ноты базовая нота подсвечивается стандартным цветом, вторая нота интервала строится по полутоновому сдвигу (каноническое имя + октава по MIDI) и подсвечивается отдельным классом, обе ноты звучат совместно как отдельные голоса `ToneGen` (префикс `ivd:` в `mapKey`) и затухают одновременно при отпускании базовой ноты; смена интервала не переоценивает уже зажатые ноты. Обновлены `web/stranichki.html`, `site-nav.mjs`, раздел про генераторы тона в `docs/overview.md`. Проверка: `npm run verify` OK.
#063 | 2026-04-01 — DONE | Клавиатура пиано: `app/keyboard-piano.css` зафиксирован как единый источник истины для геометрии и светлой темы пиано-клавиатуры; из `app/circle-scales.css` удалён дублирующий блок базовых стилей пиано (`cts-scroll-x`, `.cts-piano-keyboard`, белые/чёрные клавиши, подписи октав), оставлены только переопределения под тёмную тему (`body:has(> .cof-page.cts-wide-page)`). Логика подсветки (`ntg-key-active` и `ntg-key-hint`) и работа всех страниц с пиано-клавиатурой не изменились.

#064 | 2026-04-02 — DONE | Лады и арпеджио: в `docs/music-theory.md` добавлен раздел про секвенции арпеджио по ступеням лада (линейно, по 3/4/5, направления up/down/zigzag, шаблоны индексов и связь с диатоническими ладами); на странице `app/lads.html` блок управления арпеджио переработан в отдельные сегменты «Направление» (Up/Down/Zigzag) и «Тип секвенции» (Линейно/по 3/по 4/по 5) с кнопкой «Выкл»; в `app/lads.mjs` реализована сборка базового линейного ряда ступеней по октавам и генерация секвенций seq3/seq4/seq5 (скользящее окно по всему диапазону, режимы up/down/zigzag без двойного звучания крайних нот), при этом `createSequencer` по-прежнему обходит линейный массив нот и используется как таймер. Проверка: ручная прогонка `lads.html` (разные лады, диапазоны октав, режимы линейно/по 3/4/5 и направления up/down/zigzag, соответствие звучания теоретическим шаблонам).
