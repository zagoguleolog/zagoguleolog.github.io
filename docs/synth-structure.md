# Структура синтезатора (генератор тона)

Документ описывает **слои** и связи модулей для страниц с `ToneGen` и общим чтением полей по **префиксу id** (`ntg-`, `cts-ntg-`, `tpl-`). Доменная теория (темпация, ноты, обертоны как акустический ряд) — в [music-theory.md](music-theory.md), здесь только архитектура кода.

## Слой данных

- [`lib/music-theory.js`](../lib/music-theory.js) — расчёт частот, в т.ч. `frequencyFromNoteNameOctave`; опорная частота **A4** задаётся в UI и передаётся в движок.
- Инициализация ссылок на теорию: `initToneGenTheory()` в [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs), вызывается из страниц после динамического `import('../lib/music-theory.js')` (чтобы при `file://` можно показать предупреждение).

## Слой движка

- Класс **`ToneGen`** в [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs): `AudioContext`, моно / полифония, режимы **`hold`** | **`latch`** | **`latchPoly`** в поле **`mode`**, плавное угасание `releaseSmoothSec`, громкость выхода, поля голоса, совместимые с `buildPlayPayload` (форма колебания, детун, смесь и спад обертонов, включённые частичные тоны n=1…16). Опционально **`keyboardMode`** (`null` по умолчанию): на [`app/circle-scales.html`](../app/circle-scales.html) задаётся отдельно от **`mode`** (круг против клавиатуры); [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs) для клавиш использует `keyboardMode ?? mode`.

## Слой привязки UI

[`app/tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs) — единый контракт по **суффиксам id** после префикса: `readToneGenParams(prefix)`, `buildPlayPayload(prefix, name, octave)`, `readOctaveRange(prefix)`, `buildBaseParams(prefix)`.

Таблица полей: `a4`, `octave-min` / `octave-max`, `volume`, `waveform`, `detune`, `harm-mix`, `harm-rolloff`, контейнер `harmonics` (чекбоксы частичных тонов), `release-ms`.

## Слой клавиатуры

- [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs) — `buildLinearKeys` и разметка кнопок.
- [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs) — указатель, подсветка воспроизведения, глобальные `keydown` / `keyup` для физической клавиатуры (`bindComputerKeyboard`).
- [`app/computer-keyboard-music.mjs`](../app/computer-keyboard-music.mjs) — раскладка по `event.code` (US QWERTY): для **linear** — на экране одна сетка на октаву (хроматика по `NOTE_NAMES` в [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs)); `linearComputerCodesForOctaveRange(octave-min, octave-max)` сопоставляет **каждую октаву в диапазоне одному физическому ряду** клавиатуры слева направо: 1-я октава — `1234567890-=`, 2-я — `qwertyuiop[]`, 3-я — `asdfghjkl;'` и `Backslash` (12-я клавиша ряда), 4-я — `zxcvbnm,./` плюс `Backquote` и `Space` до 12 нот; пятая и далее — по 12 неиспользованных кодов из `SEQUENTIAL_ROW_CODES`, затем запасной список. Первая клавиша каждого такого ряда — начало октавы на экране (первая кнопка ряда, до / C). i-й код → i-я кнопка в порядке DOM. Для **bayiano** — `createBayanCodeMap(midi-min, midi-max)` по границам **номера ноты MIDI** из полей октав: три ряда ПК снизу вверх начинаются с **`KeyS`** (1-й ряд баян, далее `KeyD`…`Quote`), **`KeyE`** (2-й, далее `KeyR`…`Backslash`), **`Digit4`** (3-й, далее `Digit5`…`Equal`) — без клавиш слева от этих стартов, как у усечённых слева полных рядов `asdf…` / `qwer…` / цифры; соответствие рядам (баян) **1-й → 2-й → 3-й** (см. [domain.md](domain.md)); внутри ряда — слева направо по колонке B-system; ряд `zxcv…` не задействован; если в ряду баяна кнопок больше, чем клавиш в ряду ПК, лишние **слева** остаются без клавиш (игра мышью). Для **bayiano4** на [`app/circle-scales.html`](../app/circle-scales.html) — `createBayanCodeMap(midi-min, midi-max, { rowCount: 4 })`: четыре полных ряда ПК сверху вниз — `Backquote`…`Equal`, `KeyQ`…`Backslash`, `KeyA`…`Quote`, `KeyZ`…`Slash` ↔ ряды (баян) **4-й…1-й**; порядок внутри ряда по `chromaticColumnFromMidi(m, 4)`; усечение слева как у **bayiano**. На странице круга карта передаётся в `bindComputerKeyboard` как `getBayanCodeMap` (содержимое зависит от вида **bayiano** / **bayiano4**). Без колбэка — запасной путь `SEQUENTIAL_ROW_CODES` и порядок DOM. Для **piano** — четыре физических ряда сверху вниз (цифры → Q…\\ → ASDF…' → Z…/): верхний и третий ряды — чёрные клавиши (классы высоты с диезом и «немые» позиции между ми–фа и си–до), второй и нижний — последовательные натуральные ноты от **C** в опорной **октаве** у `KeyQ` (`octave-min`); один код → одна высота; кламп по диапазону **номера ноты MIDI** из полей октав. Ввод не перехватывается при фокусе в `input`, `textarea`, `select`, `[contenteditable]`.

## Темплейт-синт (другой UI к тем же API)

Страница [`app/template-synth.html`](../app/template-synth.html) + [`app/template-synth.mjs`](../app/template-synth.mjs), префикс **`tpl-`**. Визуальный слой — блоки из [`app/synth-kit/`](../app/synth-kit/) (крутилка, фейдер, матрица чекбоксов); **источник истины для движка** — те же значения в скрытых/синхронизированных полях с id `tpl-*`, что ожидает `readToneGenParams`.

**Намеренные исключения** из «только kit»:

- **Форма колебания** — компактный `<select id="tpl-waveform">` (в kit нет отдельного виджета-списка).
- **Камертон и границы октав** — компактные `<input type="number">` в том же корне `synth-kit-root`.

Переключение **удержание** / **фиксация** / **фиксация полифония** на темплейт-синте не дублируется: это относится к клавиатуре и остаётся на [`app/note-tone-gen.html`](../app/note-tone-gen.html). Здесь движок работает в режиме **`hold`** (как значение по умолчанию в `ToneGen`).

Подробнее про kit — [synth-ui.md](synth-ui.md).

## Схема потока

```mermaid
flowchart TB
  theory["music-theory.js"]
  init["initToneGenTheory"]
  engine["ToneGen Web Audio"]
  ui["tone-gen-ui-shared\nпрефикс id"]
  kbd["keyboard-layouts +\nkeyboard-synth-controller"]
  theory --> init --> engine
  ui --> engine
  kbd --> engine
```
