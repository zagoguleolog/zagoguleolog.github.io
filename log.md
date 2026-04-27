# Журнал

## 2026-04-27

- 2026-04-27 20:46 — Исправлена мобильная страница [`app/seventh-chords-mobile.html`](app/seventh-chords-mobile.html): в портретном положении телефона рабочая область теперь остаётся в горизонтальной компоновке через поворот `.sc7m-page`, без пересчёта в вертикальный viewport; кнопки типов септаккордов обрабатывают `pointerdown` / `touchstart` с `click` как fallback. Корневые причины записаны как ERR-009 и ERR-010. Проверка: `node --check app/seventh-chords-mobile.mjs`, `npm run verify`.

- 2026-04-27 20:28 — Добавлена мобильная fullscreen-копия страницы септаккордов: [`app/seventh-chords-mobile.html`](app/seventh-chords-mobile.html), [`app/seventh-chords-mobile.mjs`](app/seventh-chords-mobile.mjs), [`app/seventh-chords-mobile.css`](app/seventh-chords-mobile.css). Макет — один горизонтальный экран без прокрутки: верхняя строка звука (громкость, угасание 30 мс, смесь обертонов, детюн), левый столбец шести типов септаккордов, центральная клавиатура, нижний выбор linear/piano/bayiano/bayiano4; «Голоса» и «Артикуляция» скрыты, дефолт `holdPoly`. Исправлены ключи добавочных голосов септаккордов в desktop/mobile (ERR-008), обновлены навигация, карта сайта, `docs/architecture.md`, `docs/synth-ui.md`, `docs/synth-structure.md`, `scripts/verify-http.mjs`. Проверка: `node --check app/seventh-chords-mobile.mjs`, `node --check app/seventh-chords.mjs`, `npm run verify`, `npm run verify:http`.

## 2026-04-16

- 2026-04-16 08:29 — В [`app/circle-scales.html`](app/circle-scales.html), [`app/circle-scales.mjs`](app/circle-scales.mjs), [`app/circle-scales.css`](app/circle-scales.css), [`app/circle-of-fifths.js`](app/circle-of-fifths.js), [`app/circle-of-fifths.css`](app/circle-of-fifths.css) подписи аккордов на круге сделаны невыделяемыми для mobile long-press; добавлена фиксированная красная кнопка `STOP` поверх страницы, которая останавливает круг и клавиатуры и возвращает клавиатуры в режим удержания; поле `Октава звучания круга` теперь по умолчанию равно `3`. Документация: [`docs/overview.md`](docs/overview.md), [`docs/music-theory.md`](docs/music-theory.md), [`docs/synth-structure.md`](docs/synth-structure.md). Проверка: `npm run verify`.

- 2026-04-16 08:14 — В [`app/circle-scales.html`](app/circle-scales.html) переписаны заголовок, верхняя и нижняя подсказки и подписи режима клика по кругу более понятным языком для пользователя: выбор тональности, озвучивание аккорда, объяснение клавиатур и кнопки `grey`, настроек генератора звука. Проверка: `npm run verify`.

- 2026-04-16 07:07 — Страница [`for_dany.html`](for_dany.html) оформлена в стиле Undertale: тёмная тема страницы и навигации (`data-site-nav-theme="dark"`), пиксельный шрифт `Press Start 2P`, локальные SVG-ассеты `assets/for_dany/undertale-logo.svg`, `assets/for_dany/undertale-red-soul.svg`, `assets/for_dany/undertale-flowey.svg`, пиксельные рамки и акцентные кнопки для `tg://proxy`-ссылок. Проверка: ручная сверка HTML, `rg` подтвердил подключение шрифта, тёмной темы и локальных undertale-ассетов.

- 2026-04-16 07:07 — Добавлена страница [`for_dany.html`](for_dany.html) с текстом-инструкцией и пятью `tg://proxy`-ссылками в заданном порядке; в карту сайта [`web/stranichki.html`](web/stranichki.html) добавлена ссылка на новую страницу. Проверка: ручная сверка HTML, `rg` — 5 ссылок `.proxy-link`, запись `for_dany.html` в карте сайта найдена.

## 2026-04-11

- 2026-04-11 — Git: коммит `50c8983` («Клавиатуры: одна система знаков, дефолт диез; круг — по тональности»), push `main` → `origin/main`.

- 2026-04-11 — Единая **система знаков** на клавиатурах приложения: без смешения диезов и бемолей в одном хроматическом ряду; по гамме/тональности или диезный дефолт; кварто-квинтовый круг — исключение (подписи секторов). Код: `keyboard-layouts.mjs`, `computer-keyboard-music.mjs`, `bayan-keyboard.mjs`, `tone-gen-engine.mjs` (`NOTE_NAMES`), `circle-scales.mjs` / `circle-scales.html`, `intervals-demo.mjs`, `seventh-chords.mjs`, комментарии `lads`/`lads2`, `keyboard-theory-highlight.mjs`. Документация: `docs/domain.md`, `docs/music-theory.md`, `docs/synth-structure.md`; пример в `sequencer-demo.html`. Проверка: `npm run verify`, `node --check` на затронутых модулях.

- 2026-04-11 — Git: коммит `df1df64` («Гамма/лад по полосе C…B клавиатуры, zigzag, lads2 и документация»), push ветки `main` в `origin/main`.

- 2026-04-11 — [`buildScaleDegreeRowsByMidiOrder`](lib/music-theory.js): базовый ряд арпеджио по полосе **C…B** выбранных октав (как клавиатура), без старта «с тоники внизу»; [`docs/music-theory.md`](docs/music-theory.md), ERR-007 в [`docs/errors.md`](docs/errors.md), [`scripts/verify-theory.js`](scripts/verify-theory.js), обновлён [`output/zigzag-sequences.jsonl`](output/zigzag-sequences.jsonl). Проверка: `npm run verify`, `npm run zigzag:gen`.

- 2026-04-11 — Удалены отладочные `fetch` к ingest и блоки `agent log` в [`app/keyboard-theory-highlight.mjs`](app/keyboard-theory-highlight.mjs), [`app/lads.mjs`](app/lads.mjs), [`app/lads2.mjs`](app/lads2.mjs), [`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs), [`app/circle-scales.mjs`](app/circle-scales.mjs), [`app/circle-scales.html`](app/circle-scales.html). Проверка: `npm run verify`.

- 2026-04-11 — Клавиатуры **`lads`** / **`lads2`**: хроматические подписи в однородной **системе знаков** (диезная или бемольная) по ступеням текущего лада — см. термин в [`docs/domain.md`](docs/domain.md), функции в [`lib/music-theory.js`](lib/music-theory.js), правка [`docs/music-theory.md`](docs/music-theory.md). Реализация: [`app/keyboard-layouts.mjs`](app/keyboard-layouts.mjs), [`app/bayan-keyboard.mjs`](app/bayan-keyboard.mjs), [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs), [`app/lads.mjs`](app/lads.mjs), [`app/lads2.mjs`](app/lads2.mjs). Проверка: `node scripts/verify-theory.js`, `node --check` на изменённых модулях.

- 2026-04-11 — Подсветка **текущей ноты** при арпеджио: совпадение клавиши по классу высоты и октаве (**`findPlayKeyElementByPitch`** в [`app/keyboard-theory-highlight.mjs`](app/keyboard-theory-highlight.mjs)), подключено в [`app/lads.mjs`](app/lads.mjs), [`app/lads2.mjs`](app/lads2.mjs), [`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs); см. ERR-006 в [`docs/errors.md`](docs/errors.md).

- 2026-04-11 — Секвенции арпеджио (зигзаг по 3/4/5): скрипты [`scripts/generate-zigzag-sequences.mjs`](scripts/generate-zigzag-sequences.mjs) и [`scripts/analyze-zigzag-sequences.mjs`](scripts/analyze-zigzag-sequences.mjs), вывод [`output/zigzag-sequences.jsonl`](output/zigzag-sequences.jsonl) и [`output/zigzag-analysis-report.md`](output/zigzag-analysis-report.md). Базовый ряд ступеней для `lads`/`lads2` строится через **`buildScaleDegreeRowsByMidiOrder`** ([`lib/music-theory.js`](lib/music-theory.js)) — устранены ложные скачки MIDI из-за энгармоники (см. ERR-004 в [`docs/errors.md`](docs/errors.md)). Документация: [`docs/music-theory.md`](docs/music-theory.md). Проверка: `npm run verify`, `npm run zigzag:gen`, `npm run zigzag:analyze`.

- 2026-04-11 — [`app/lads2.html`](app/lads2.html): выделение выбранного лада — контрастная рамка вокруг строки (cyan, вертикальные края 3px), лёгкий inset и более заметный фон при hover.

- 2026-04-11 — [`app/lads2.html`](app/lads2.html) / [`app/lads2.mjs`](app/lads2.mjs): цветовая подсветка ячеек для анализа паттернов — во 2-й таблице **т** и **п** (бирюза / янтарь), в 3-й и 1-й — диезы, бемоли и натуральные ступени (розовый / синий / зелёный оттенок); краткая легенда над таблицами. Проверка: `node --check app/lads2.mjs`.

- 2026-04-11 — [`app/lads2.html`](app/lads2.html) / [`app/lads2.mjs`](app/lads2.mjs): таблицы по уточнённому ТЗ — первая: строки с буквенными символами ладов от тоники (суффиксы Δ, m7+6, m7−2, Δ+4, 7−7, m7, m7ø −2−5), столбцы ступеней **1–7**; вторая и третья: строки **I–VII** (лад от ионийского к локрийскому), столбцы **1–7**; выбор лада — клик по строке; обновлены подсказки и [`docs/music-theory.md`](docs/music-theory.md). Проверка: `node --check app/lads2.mjs`.

- 2026-04-11 — Колонка синтеза (`.cts-tone-rail`): модуль [`app/cts-tone-rail.mjs`](app/cts-tone-rail.mjs) — обёртка тела панели и переключатель видимости блоков (UI синта), общее состояние в `localStorage` (`music.cts-tone-rail.collapsed`); в [`app/circle-scales.css`](app/circle-scales.css) на узком экране макет `.cts-layout` — колонка с основным контентом визуально первая; подключено в пяти страничных модулях; обновлён [`docs/architecture.md`](docs/architecture.md). Проверка: `npm run verify`, `node --check app/cts-tone-rail.mjs`.

- 2026-04-11 — Добавлены [`app/lads2.html`](app/lads2.html) и [`app/lads2.mjs`](app/lads2.mjs): вторая версия страницы ладов с тремя таблицами (ступени I–VII с пометкой △ для натуральной буквы, шаги «т/п» по ступеням и ладам, альтерации «·/#/b»), общий выбор лада и арпеджио как на `lads.html`; пункт меню в [`site-nav.mjs`](site-nav.mjs), ссылки на [`index.html`](index.html) и [`web/stranichki.html`](web/stranichki.html), правки в [`docs/music-theory.md`](docs/music-theory.md), [`docs/overview.md`](docs/overview.md), [`README.md`](README.md). Проверка: `npm run verify`, `node --check app/lads2.mjs`, запрос `GET /app/lads2.html` к локальному static-server.

## 2026-03-31

- 2026-03-31 — [`app/circle-scales.html`](app/circle-scales.html): подключены стили [`app/keyboard-piano.css`](app/keyboard-piano.css) и [`app/bayan-keyboard.css`](app/bayan-keyboard.css) как на странице интервалов, чтобы пиано-клавиатура и баян под кругом выглядели одинаково; при этом слой подсказки лада (`ntg-key-hint`) и подсветка воспроизведения клавиш остались без изменений. Проверка: `npm run verify`.

## 2026-04-01

- 2026-04-01 — Теория септаккордов: в [`docs/music-theory.md`](docs/music-theory.md) добавлен раздел «Септаккорды» (определение как трёх последовательных терций, шесть базовых типов с интервальными формулами, качеством 3 и 7 ступеней и краткой связью с диатоникой); в [`lib/music-theory.js`](lib/music-theory.js) добавлены сиды `SEVENTH_CHORD_SEED` и функция `getSeventhChordCatalog()`, а также таблица «Типы септаккордов» в `renderTheoryTables`, строящаяся из тех же сидов. Проверка: `npm run verify`.

- 2026-04-01 — Страница [`app/seventh-chords.html`](app/seventh-chords.html): таблица типов септаккордов из `getSeventhChordCatalog()` (шесть строк в том же порядке и с теми же полями, что в разделе «Септаккорды» `docs/music-theory.md`) и клавиатура с режимами **linear / piano / bayiano / bayiano4** на общем движке `ToneGen` (`app/seventh-chords.mjs`); при выборе строки и нажатии ноты строится соответствующий септаккорд 1–3–5–7 (верхние три ноты как отдельные голоса с префиксом `sc7:` в `mapKey`), все четыре ноты подсвечиваются на активной клавиатуре и затухают по настройкам синта; смена типа не переоценивает уже зажатые ноты. Страница добавлена в карту сайта [`web/stranichki.html`](web/stranichki.html). Проверка: `npm run verify`.

- 2026-04-01 — Клавиатура пиано: `app/keyboard-piano.css` закреплён как основной файл со схемой пиано-клавиш (геометрия, базовый светлый стиль); из `app/circle-scales.css` убран дублирующий блок этих же стилей (`.cts-piano-keyboard`, белые/чёрные клавиши, подписи октав, `cts-scroll-x`), чтобы страница `circle-scales.html` опиралась на тот же источник истины, а в `circle-scales.css` остались только переопределения под тёмную тему. Функциональное поведение клавиш и подсветки не менялось.

## 2026-04-02

- 2026-04-02 — Кварто-квинтовый круг и grey по умолчанию: в [`lib/music-theory.js`](lib/music-theory.js) добавлены константы строк колец `CIRCLE_OF_FIFTHS_OUTER_LINE` и `CIRCLE_OF_FIFTHS_INNER_LINE`; страницы [`app/circle-of-fifths.html`](app/circle-of-fifths.html) и [`app/circle-scales.html`](app/circle-scales.html) без ручного ввода колец; [`app/circle-scales.mjs`](app/circle-scales.mjs) и [`app/circle-scales-core.js`](app/circle-scales-core.js) подставляют эти строки; по умолчанию режим озвучивания круга — **удержание**, в режиме **фиксация** повторный клик по выбранному сектору глушит триаду ([`app/circle-of-fifths.js`](app/circle-of-fifths.js)); кнопка **grey** включена по умолчанию на `circle-scales` и [`app/lads.html`](app/lads.html). Обновлены [`docs/overview.md`](docs/overview.md), [`docs/domain.md`](docs/domain.md), [`docs/music-theory.md`](docs/music-theory.md). Проверка: `npm run verify`, `node --check` для не-модульных скриптов круга.

- 2026-04-02 — [`site-nav.mjs`](site-nav.mjs): выпадающее меню содержит только четыре интерактивные страницы с корневого [`index.html`](index.html) (те же подписи, что в блоке «Страницы» на витрине); ссылка «Главная» по-прежнему ведёт на `index.html`. Обновлены [`docs/overview.md`](docs/overview.md), [`README.md`](README.md), [`docs/architecture.md`](docs/architecture.md). Проверка: `npm run verify`.

- 2026-04-02 — Документация и подсказки в HTML: вместо обязательного `npm run serve` для посетителей — формулировки про GitHub Pages и HTTPS; прямые ссылки в [`README.md`](README.md) на `https://zagoguleolog.github.io/…`; обновлены [`docs/overview.md`](docs/overview.md), [`docs/music-theory.md`](docs/music-theory.md), [`docs/synth-ui.md`](docs/synth-ui.md), [`docs/architecture.md`](docs/architecture.md); тексты ошибок импорта модулей в клиентских `.mjs`. Проверка: `npm run verify`. Коммит `69c77e8`, `git push origin main`.

- 2026-04-02 22:20 — Коммит `ab4f711` («Главная: витрина из 4 комби-страниц…»): `git push origin main` в [zagoguleolog.github.io](https://github.com/zagoguleolog/zagoguleolog.github.io).

- 2026-04-02 — Корневой [`index.html`](index.html): витрина из четырёх основных интерактивных страниц (синт + клавиатура + теория), без редиректа; вторичная ссылка на полную карту [`web/stranichki.html`](web/stranichki.html). В [`site-nav.mjs`](site-nav.mjs) ссылка «Главная» ведёт на `index.html`. Обновлены [`docs/overview.md`](docs/overview.md), [`README.md`](README.md), [`docs/music-theory.md`](docs/music-theory.md), подсказка на [`web/stranichki.html`](web/stranichki.html), строка приветствия в [`scripts/static-server.js`](scripts/static-server.js). Проверка: `npm run verify`.

- 2026-04-02 — GitHub Pages: в корне `music/` добавлен `index.html` (переход на `web/stranichki.html`); [`site-nav.mjs`](site-nav.mjs) строит ссылки через `new URL` от `import.meta.url` (префикс репозитория на Pages); в меню добавлен `app/seventh-chords.html` в том же порядке, что на карте сайта. Локальный [`scripts/static-server.js`](scripts/static-server.js) на `GET /` отдаёт `index.html`. Расширен [`.gitignore`](.gitignore) (`.cursor/`, логи и т.д.). Обновлены [`README.md`](README.md), [`docs/overview.md`](docs/overview.md), [`docs/architecture.md`](docs/architecture.md), подсказка на [`web/stranichki.html`](web/stranichki.html). Проверка: `npm run verify`, `npm run verify:http` (сервер запущен).

- 2026-04-02 — GitHub: для каталога `music` добавлен `origin` [zagoguleolog.github.io](https://github.com/zagoguleolog/zagoguleolog.github.io), слияние с `origin/main`, объединённый `README.md`, ветка переименована в `main`, выполнен `git push -u origin main`. Незакоммиченные изменения в `app/lads.mjs` сохранены в рабочей копии.

- 2026-04-02 — Лады и арпеджио: на странице [`app/lads.html`](app/lads.html) переработан блок управления арпеджио — вместо одного переключателя режима добавлены отдельные сегменты «Направление» (Up/Down/Zigzag) и «Тип секвенции» (Линейно/по 3/по 4/по 5) с отдельной кнопкой «Выкл»; в [`app/lads.mjs`](app/lads.mjs) реализована сборка базового линейного ряда ступеней лада по выбранному диапазону октав и генерация секвенций `linear`/`seq3`/`seq4`/`seq5` как скользящих окон по всему диапазону (режимы up/down/zigzag, без двойного звучания крайних нот при развороте), при этом `createSequencer` в `lib/arp-sequencer.mjs` продолжает работать как таймер по линейному массиву нот. Раздел про секвенции арпеджио добавлен в [`docs/music-theory.md`](docs/music-theory.md) и согласован с поведением UI. Проверка: ручная прогонка `lads.html` (разные лады, диапазоны, типы секвенции и направления).

## 2026-03-29

- 2026-03-29 — Режим **`holdPoly`**: полифония с удержанием на экранной клавиатуре и ПК ([`app/tone-gen-engine.mjs`](app/tone-gen-engine.mjs), [`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs)); панель круга — **Голоса** (моно/поли) и **Артикуляция** ([`app/circle-scales.html`](app/circle-scales.html), [`app/circle-scales.mjs`](app/circle-scales.mjs)); дефолт — полифония + удержание. Документация: [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md), [`docs/domain.md`](docs/domain.md). Проверка: `node --check`, `npm run verify`.

- 2026-03-29 — Режим **удержание** (`hold`): согласование `ntg-key-down` с моно-голосом — снятие класса со всех клавиш перед новым нажатием, остановка по отпусканию только если нота совпадает с `latchedKey` ([`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs)); документация [`docs/synth-structure.md`](docs/synth-structure.md), реестр [`docs/errors.md`](docs/errors.md) ERR-002. Проверка: `node --check`, `npm run verify`.

- **bayiano4** ПК: четыре ряда `Digit4`…`Equal`, `KeyE`…`Backslash`, `KeyS`…`Quote`, `KeyZ`…`Slash` (`BAYAN_CHROMATIC_4_PC_ROWS_FROM_TOP` в [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs)); стартовые ноты при **octave-min** = 3 — **Eb3 / D3 / C#3 / C3** (4-й…1-й ряд баян); [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md), [`docs/bayan-b-system.md`](docs/bayan-b-system.md). Проверка: `node --check`, `npm run verify`, smoke `createBayanCodeMap` 4 ряда.

- 2026-03-29 — **bayiano** / **bayiano4**: `createBayanCodeMap` — привязка рядов ПК с **левого края** по возрастанию `chromaticColumnFromMidi` (при **octave-min** = 3: **C3 / C#3 / D3** на `KeyA` / `KeyW` / `Digit3`); при нехватке клавиш усечение **справа** по колонке. [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs), [`docs/synth-structure.md`](docs/synth-structure.md). Проверка: `node --check`, `npm run verify`, smoke `createBayanCodeMap(48,95)` → C3/C#3/D3.

- 2026-03-29 15:35 — **bayiano** ПК: стартовые ряды **A / W / Digit3** (`BAYAN_PC_ROW_1`…`BAYAN_PC_ROW_3`, JSDoc `createBayanCodeMap`); [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md). Проверка: `node --check`, `npm run verify`.

- Четырёхрядная хроматическая сетка (баян): параметр `rowCount` и `BAYAN_CHROMATIC_4_ROW_COUNT` в [`lib/bayan-b-system.js`](lib/bayan-b-system.js); [`app/bayan-keyboard.html`](app/bayan-keyboard.html) — переключатель 3/4 ряда; [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs) — `createBayanCodeMap(..., { rowCount: 4 })` и `BAYAN_CHROMATIC_4_PC_ROWS_FROM_TOP` (актуальные ряды ПК — см. свежую запись журнала); [`app/circle-scales.html`](app/circle-scales.html) — вид **bayiano4**; документация [`docs/bayan-b-system.md`](docs/bayan-b-system.md), [`docs/domain.md`](docs/domain.md), [`docs/overview.md`](docs/overview.md), [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/music-theory.md`](docs/music-theory.md). Проверка: `npm run verify`.

- **bayiano** + ПК: `createBayanCodeMap` в [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs) — три ряда клавиш (`asdf…` / `qwer…` / цифры) ↔ ряды (баян) 1-й…3-й по [`lib/bayan-b-system.js`](lib/bayan-b-system.js); первая клавиша ряда ПК к минимальной колонке в диапазоне, избыток кнопок — справа без ПК; `bindComputerKeyboard.getBayanCodeMap` в [`app/circle-scales.mjs`](app/circle-scales.mjs). Документация: [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md). Проверка: `node --check`, `npm run verify`.

- **Linear** + ПК: каждая октава в диапазоне — **один ряд** клавиш (`1234567890-=`, `qwertyuiop[]`, третий ряд + `Backslash`, четвёртый + `Backquote` и `Space`); первая клавиша ряда = до (C) октавы на экране. [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs), [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md). Проверка: `node --check`, `npm run verify`, 48 уникальных кодов для октав 3–6.

- Линейная клавиатура: верстка снова **одна сетка на октаву** (`buildLinearKeys`); привязка ПК по-прежнему `linearComputerCodesForOctaveRange` (начала рядов `Digit1` / `KeyQ` / `KeyA` / `KeyZ`). Удалены стили `.ntg-linear-oct` / `.ntg-linear-row`. Документация: `docs/synth-structure.md`, `docs/overview.md`. Проверка: `node --check`, `npm run verify`.

- Линейная клавиатура: четыре визуальных ряда по три полутона на октаву (`keyboard-layouts.mjs`); привязка ПК — `linearComputerCodesForOctaveRange` / `linearIndexFromCode` (`computer-keyboard-music.mjs`), ввод в **linear** через `getLinearComputerCodes` в `keyboard-synth-controller.mjs` + `circle-scales.mjs`; четвёртая октава при диапазоне 3–6 — остаток из `SEQUENTIAL_ROW_CODES` + `Space`. Стили: `circle-scales.css`, `note-tone-gen.css`, `template-synth.css`. Документация: `docs/synth-structure.md`, `docs/overview.md`. Проверка: `node --check`, `npm run verify`, счётчик 48 уникальных `event.code` для 3–6.

- [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs): режим **piano** — раскладка по четырём рядам (цифры и ASDF — чёрные с «немыми» между ми–фа и си–до; Q и Z — непрерывные натуральные ноты от C в опорной октаве); [`docs/synth-structure.md`](docs/synth-structure.md). Проверка: `node --check`, `npm run verify`, отсутствие дубликатов MIDI в карте для тестовых диапазонов октав.

- [`app/computer-keyboard-music.mjs`](app/computer-keyboard-music.mjs), [`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs), [`app/circle-scales.mjs`](app/circle-scales.mjs): игра с физической клавиатуры под кругом — `event.code` (US QWERTY), режимы **linear** / **piano** / **bayiano** и те же **удержание / фиксация / полифония**, что у мыши; [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md). Проверка: `node --check`, `npm run verify`.

- [`app/circle-scales.html`](app/circle-scales.html), [`app/circle-scales.css`](app/circle-scales.css): блок тембра — **сетка 3×2** `.cts-synth-kit-row` (шесть слотов `.cts-synth-kit-slot` в порядке: громкость | обертоны; детун | спад; смесь | угасание), `align-items` / `justify-items: start` для совпадения строк по горизонтали и выравнивания с полями панели. [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `npm run verify`.

- [`app/circle-scales.html`](app/circle-scales.html), [`app/circle-scales.css`](app/circle-scales.css): блок тембра — **две равные по flex колонки** `.cts-synth-kit-col`: слева три крутилки (громкость, детун, смесь обертонов); справа матрица обертонов, под ней спад \(1/n^x\) и фейдер угасания; для правой подсетки снят `grid-row: span 2` у фейдера. [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `npm run verify`.

- [`app/circle-scales.html`](app/circle-scales.html), [`app/circle-scales.css`](app/circle-scales.css): блок «Громкость, тембр и обертоны» — общий ряд `.cts-synth-kit-row`: сетка крутилок и фейдер угасания слева, матрица n=1…16 справа (при узкой колонке перенос); подсказка и `aria-label` матрицы — «Обертоны». [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `npm run verify`; визуально — страница `http://127.0.0.1:4173/app/circle-scales.html`.

- [`app/synth-kit/synth-kit.css`](app/synth-kit/synth-kit.css): индикаторы `synth-seg--value-control` без `min-height: var(--synth-cell)`, уменьшены вертикальные поля — высота по цифрам.

- [`app/synth-kit/segment-value-control.mjs`](app/synth-kit/segment-value-control.mjs): индикатор в стиле семисегмента с тем же управлением мышью/колесом, что у крутилки; галерея [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs) переведена на него; стили в [`app/synth-kit/synth-kit.css`](app/synth-kit/synth-kit.css); [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `node --check`, `npm run verify`.

- Галерея атласа: тестовая сетка 8×8 внизу [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html), паттерн — [`app/knobs-atlas-showcase-grid-pattern.json`](app/knobs-atlas-showcase-grid-pattern.json), рендер в [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs); [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `node --check`, `npm run verify`.

- [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs): `DEFAULT_XS` — правый край сетки 997 px (обновление экспорта). Проверка: `node --check`, `npm run verify`.

- [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs): зашитые по умолчанию `DEFAULT_XS` / `DEFAULT_YS` из экспорта подрезки атласа; [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `node --check`, `npm run verify`.

- Галерея атласа: общая сетка границ `xs`/`ys` в [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs) (`knobs-atlas-showcase-grid-v1`, опционально восстановление из `knobs-atlas-showcase-crops-v2`); ячейки `col`/`row`/`colSpan`/`rowSpan`, экспорт JSON `{ xs, ys, slices }`; обновлены [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html), [`docs/synth-ui.md`](docs/synth-ui.md). Проверка: `node --check app/knobs-atlas-showcase-page.mjs`, `npm run verify`.

- Галерея атласа: внизу [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html) — динамическая одна строка JSON со всеми кропами (порядок ключей как в коде), кнопка «Копировать в буфер»; [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs), `docs/synth-ui.md`. Проверка: `node --check`, `npm run verify`.

- Тёмная навигация: в [`site-nav.css`](site-nav.css) — переопределения под `html[data-site-nav-theme="dark"]` (фон/границы как у synth `#1a222c` / `#2d3a47`, ссылки `#7dd3fc` / hover `#5eead4`, активная кнопка меню светлее). Атрибут на `<html>`: [`app/note-tone-gen.html`](app/note-tone-gen.html), [`app/template-synth.html`](app/template-synth.html), [`app/synth-kit-demo.html`](app/synth-kit-demo.html), [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html), [`app/circle-scales.html`](app/circle-scales.html). Документация — [`docs/architecture.md`](docs/architecture.md). Проверка: `npm run verify`.

- [`app/circle-scales.html`](app/circle-scales.html): отдельные три режима для **круга** (блок «Круг» слева под SVG) и для **клавиатуры** (над клавиатурой); **Стоп** на одной строке с режимами клавиатуры. В [`app/tone-gen-engine.mjs`](app/tone-gen-engine.mjs) — поле `keyboardMode`; [`app/keyboard-synth-controller.mjs`](app/keyboard-synth-controller.mjs) использует `keyboardMode ?? mode`. Обновлены [`app/circle-scales.mjs`](app/circle-scales.mjs), [`app/circle-scales.css`](app/circle-scales.css), [`docs/synth-structure.md`](docs/synth-structure.md), [`docs/overview.md`](docs/overview.md). Проверка: `npm run verify`.

- Страница [`app/circle-scales.html`](app/circle-scales.html): панель синтеза переведена на UI synth-kit (`mountTemplateSynthKit` из [`app/template-synth.mjs`](app/template-synth.mjs), стили [`app/template-synth.css`](app/template-synth.css)); переключатели **удержание / фиксация / полифония** и кнопка **Стоп** перенесены над клавиатурой; убраны текстовый блок аккордов под кругом и строка статуса с нотами и частотами. Обновлены [`app/circle-scales.mjs`](app/circle-scales.mjs), [`app/circle-scales.css`](app/circle-scales.css), [`docs/overview.md`](docs/overview.md). Проверка: `npm run verify`.

- Навигация по сайту: общие `site-nav.css` и `site-nav.mjs` (кнопка «Меню», ссылка «Главная», список как на карте сайта; целевые URL от каталога `music/` для GitHub Pages). Подключено на HTML-страницах каталога. Главная — `web/stranichki.html`; корень `npm run serve` отдаёт `index.html` (редирект на карту). `scripts/verify-http.mjs` проверяет `GET /`. README и `docs/music-theory.md` согласованы. Проверка: `npm run verify`, `npm run verify:http` (сервер запущен).

- `template-synth`: убран UI режимов клавиатуры (hold/latch/latchPoly); на странице зафиксирован режим **hold** по умолчанию `ToneGen`; ссылка на `note-tone-gen.html` в подсказке. Обновлены `docs/synth-structure.md`, `docs/synth-ui.md`. Проверка: `node --check app/template-synth.mjs`, `npm run verify`.

- Галерея [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html): на каждый фрагмент — прямоугольник подрезки в координатах исходника; мини-карта (без Ctrl — левый верхний угол, Ctrl/⌘ — правый нижний) и четыре крутилки [`createKnob`](app/synth-kit/knob.mjs); [`app/knobs-atlas-showcase-page.mjs`](app/knobs-atlas-showcase-page.mjs); `localStorage` `knobs-atlas-showcase-crops-v2`; `docs/synth-ui.md`. Проверка: `node --check app/knobs-atlas-showcase-page.mjs`, `npm run verify`.

- Темплейт-синт (`app/template-synth.html`, `template-synth.mjs`, `template-synth.css`): тот же `ToneGen` и префикс `tpl-`, UI из synth-kit; `readHarmEnabled` — чекбоксы с `data-partial` в контейнере `harmonics` (матрица 4×4). Документация `docs/synth-structure.md`, правки `overview.md`, `architecture.md`, `synth-ui.md`, `.cursor/rules/documentation-map.mdc`, `web/stranichki.html`, `scripts/static-server.js`. Проверка: `node --check app/template-synth.mjs`, `npm run verify`.

- Самопроверка галереи атласа: задан `--knobs-cell` на странице (равен `--synth-cell`); убран неиспользуемый `root` в скрипте; `npm run verify`, HTTP 200 для `app/knobs-atlas-showcase.html` и `knobs.png`.

- Галерея [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html): отступы от краёв **всего** `knobs.png`, затем деление внутренней области на 4×4 и показ фрагментов через `background-size` / `background-position` в JS; сохранение в `localStorage`; обновление `docs/synth-ui.md`.

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

## 2026-03-31

- 2026-03-31 — Добавлена страница `app/intervals-demo.html`: таблица интервалов 0–12 полутонов (данные из `INTERVAL_CATALOG_SEED` / `getIntervalCatalog()` в `lib/music-theory.js`) и клавиатура с режимами **linear / piano / bayiano / bayiano4** и вводом с ПК, переиспользующая `ToneGen`, `keyboard-layouts.mjs`, `keyboard-synth-controller.mjs`, `computer-keyboard-music.mjs`; базовая нота и вторая нота выбранного интервала подсвечиваются разными классами, звучат как отдельные голоса `ToneGen` (второй голос с префиксом `ivd:` в `mapKey`) и затухают одновременно при отпускании базовой; смена интервала влияет только на новые нажатия. Обновлены `web/stranichki.html`, `site-nav.mjs`, раздел про генераторы тона в `docs/overview.md`. Проверка: `npm run verify`.
