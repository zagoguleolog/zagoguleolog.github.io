# Overview

## Назначение

Опишите назначение продукта, целевых пользователей и бизнес-цели.

## Интерактивный кварто-квинтовый круг

Страница [`app/circle-of-fifths.html`](../app/circle-of-fifths.html) строит SVG-кольцо из двух списков подписей (внешнее и внутреннее кольцо), задаваемых строками с нотами через пробел или запятую. **Локально:** в адресную строку браузера вставьте **абсолютный путь** к этому файлу **без** префикса `file:` (см. [AI_RULES.md](AI_RULES.md), раздел «Ссылки на результаты»). Число **спиц** (пар подписей внешнее/внутреннее) равно **меньшей** длине списков; в DOM на каждую спицу приходятся **две** кликабельные группы с классом `cof-sector` (по одному кольцу), с общим `data-index` — итого **2×n** секторов. Обход по часовой стрелке от **верха** (как на классической схеме). Подписи — доменный контент (в т.ч. **энгармоника** через `A / B`); термины **pitch class (PC)** и энгармоника зафиксированы в [domain.md](domain.md), соглашения по именам — в [music-theory.md](music-theory.md).

Программный API: глобальный объект `CircleOfFifthsDrawer` в [`app/circle-of-fifths.js`](../app/circle-of-fifths.js) — метод `draw(svgElement, [внешняяСтрока, внутренняяСтрока], options?)`; у секторов в DOM есть `data-labelRaw`; `options.afterDraw`, `options.onSectorActivate`, `options.onSectorSelectionChange`, `options.getSectorSelectionMode` (возврат `'toggle'` или `'exclusive'` при каждом клике/активации) — см. JSDoc в скрипте.

Модуль [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs) — общий движок синтеза для [`app/note-tone-gen.html`](../app/note-tone-gen.html), страницы [`app/template-synth.html`](../app/template-synth.html) (тот же API, UI на synth-kit) и озвучивания триад на [`app/circle-scales.html`](../app/circle-scales.html) (UI synth-kit через [`app/template-synth.mjs`](../app/template-synth.mjs), префикс id `cts-ntg-`); чтение полей формы — [`app/tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs). Слои и префиксы id — [synth-structure.md](synth-structure.md). Разметка клавиатур **linear** / **piano** и связка кнопок с движком — [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs), [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs); физическая клавиатура ПК — [`app/computer-keyboard-music.mjs`](../app/computer-keyboard-music.mjs) (`event.code`, три вида раскладки: **linear** — `linearComputerCodesForOctaveRange` (каждая октава UI = целый ряд `1234567890-=` / `qwertyuiop[]` / `asdfghjkl;'`+`Backslash` / `zxcvbnm,./`+`Backquote`+`Space`); **bayiano** — три ряда ПК ↔ три ряда (баян), `createBayanCodeMap` (см. [synth-structure.md](synth-structure.md)); **piano** — карта `createPianoCodeMap`); подсказка по **pitch class** ступеней гаммы на видимой клавиатуре под кругом — [`app/keyboard-theory-highlight.mjs`](../app/keyboard-theory-highlight.mjs) (класс `ntg-key-hint`, не смешивается с подсветкой воспроизведения).

Интеграция с [`lib/music-theory.js`](../lib/music-theory.js): страница [`app/circle-scales.html`](../app/circle-scales.html) — выбор тоники и лада (мажор / натуральный минор), подсветка диатоники по кластеру **IV–I–V** опорного мажора (**три спицы**, по умолчанию **шесть** аккордов на обоих кольцах; опционально — седьмая триада вне кластера), внутреннее кольцо по умолчанию — относительные миноры, режим клика «только выделение сектора» или «тональность по подписи сектора» (внешний сектор → мажор, внутренний → натуральный минор), боковая панель synth-kit (камертон, октавы, тембр) и **озвучивание выделенных секторов** мажорной/минорной триадой; **под кругом** — клавиатура нот по октавам: переключатель вида **linear** (сетка по полутонам, как на [`app/note-tone-gen.html`](../app/note-tone-gen.html)), **piano** (белые/чёрные клавиши по образцу [`piano-keyboard.html`](../piano-keyboard.html)) и **bayiano** (горизонтальная раскладка B-system, [`app/bayan-keyboard.html`](../app/bayan-keyboard.html), [`docs/bayan-b-system.md`](bayan-b-system.md)); режимы **удержание / фиксация / полифония** для **круга** — блок «Круг» слева под SVG, для **клавиатуры** — над клавиатурой вместе с «Стоп» (`ToneGen.mode` и `ToneGen.keyboardMode`); диапазон октав и камертон — в боковой панели, общий движок. У **относительных** мажора и натурального минора геометрия кластера на круге совпадает. См. [`docs/music-theory.md`](music-theory.md). Без загрузки ES-модуля (часто при `file://`) круг всё равно рисует [`app/circle-scales-core.js`](../app/circle-scales-core.js); подсветка и синтез — только после успешного импорта теории или через `npm run serve`.

## Раскладка клавиш фортепиано

Страница [`piano-keyboard.html`](../piano-keyboard.html) — схема белых и чёрных клавиш на две октавы (подписи в **научной нотации**), разметка строится из общего модуля [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs); термины **pitch class (PC)** и энгармоника — в [domain.md](domain.md), кратко в [music-theory.md](music-theory.md) (подраздел «Раскладка клавиш фортепиано»). Нужен **`npm run serve`** в каталоге `music` (ES-модули и импорт `lib/music-theory.js`).

## Клавиатура баяна (B-system)

Страница [`app/bayan-keyboard.html`](../app/bayan-keyboard.html) — схема трёх рядов **B-system** в **горизонтальной** ориентации (ряды как линии слева направо): координаты из [`lib/bayan-b-system.js`](../lib/bayan-b-system.js), описание — [`docs/bayan-b-system.md`](bayan-b-system.md). Регулируются диапазон **номера ноты MIDI**, шаг колонки, радиус кнопок, доля диагонального смещения и кирпичный сдвиг рядов. Нужен `npm run serve` в каталоге `music`. **Локально:** абсолютный путь к HTML без префикса `file:` — см. [AI_RULES.md](AI_RULES.md).

## Блоки UI синтеза (synth-kit)

Общий набор «аппаратных» контролов (крутилка, вертикальный фейдер, семисегментный индикатор, тоггл, две кнопки в ячейке, матрица чекбоксов) — каталог [`app/synth-kit/`](../app/synth-kit/), стили [`app/synth-kit/synth-kit.css`](../app/synth-kit/synth-kit.css); при необходимости спрайт-атлас `knobs.png` и [`app/synth-kit/knobs-atlas.css`](../app/synth-kit/knobs-atlas.css) — в [synth-ui.md](synth-ui.md). Описание контракта, переменных масштаба и URL демо после `npm run serve` — там же. Демо: [`app/synth-kit-demo.html`](../app/synth-kit-demo.html) (`http://127.0.0.1:4173/app/synth-kit-demo.html`). Галерея фрагментов `knobs.png`: [`app/knobs-atlas-showcase.html`](../app/knobs-atlas-showcase.html). Полная замена ползунков на существующих экранах синтеза не входит в первую итерацию kit.

## Генератор тона по нотам

Страница [`app/template-synth.html`](../app/template-synth.html) — тот же сценарий и API (`tpl-`), визуальный слой на **synth-kit** (крутилка, фейдер, матрица частичных тонов); см. [synth-structure.md](synth-structure.md).

Страница [`app/note-tone-gen.html`](../app/note-tone-gen.html) — воспроизведение частот в **равномерной темпации** через Web Audio API; значения Гц из `frequencyFromNoteNameOctave` в [`lib/music-theory.js`](../lib/music-theory.js); движок — [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs). Регулировка **громкости**, опорная частота **A4**, **диапазон октав** (научная нотация, **C4** — средняя до): несколько рядов кнопок **по октавам**, форма колебания (**синусоида**, **треугольник**, **квадрат**, **пила**) для каждого включённого частичного тона, **детун** в центах, пошаговое включение **основного тона (n=1)** и **обертонов** (синусоиды \(2f\ldots 16f\), при необходимости без n=1) с параметрами **смеси** (доля обертон относительно основного тона при нормировке громкости) и спада \(1/n^x\), **плавное угасание** при отпускании ноты (**20 мс…5 с**). Режимы: **удержание** (звук пока нажата кнопка ноты), **фиксация** (повторный клик по той же ноте и октаве выключает), **фиксация полифония** (новые ноты **не** останавливают уже звучащие; повторный клик по кнопке глушит только этот голос). Нужен `npm run serve` (ES-модули с диска часто не загружаются).

## Основные компоненты

- Frontend (UI, клиентские сценарии)
- Backend (API, бизнес-логика)
- Data layer (БД, кэш, хранилища)
- Интеграции (внешние сервисы)

## Нефункциональные требования

- Надёжность
- Безопасность
- Производительность
- Масштабируемость
