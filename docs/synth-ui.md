# UI синтеза (synth-kit)

## Назначение

Каталог [`app/synth-kit/`](../app/synth-kit/) — **единый источник истины** для лаконичного блочного UI синтеза: разметка и поведение каждого виджета живут в соответствующем `.mjs`, общие токены — в [`app/synth-kit/synth-kit.css`](../app/synth-kit/synth-kit.css). Страницы приложения монтируют контролы через фабрики, без копирования HTML-фрагментов.

Доменная теория музыки остаётся в [`lib/music-theory.js`](../lib/music-theory.js); kit — только презентационный слой.

## Виджеты

| Модуль | Назначение |
|--------|------------|
| [`knob.mjs`](../app/synth-kit/knob.mjs) | **Крутилка**: перетаскивание по вертикали, `pixelsPerFullRange` (пикселей на полный диапазон `min`…`max`), опционально `step`; колёсико мыши меняет значение по той же оси. |
| [`fader.mjs`](../app/synth-kit/fader.mjs) | **Фейдер** (вертикальная полоса): та же модель дельты по Y и `pixelsPerFullRange`. |
| [`segment-display.mjs`](../app/synth-kit/segment-display.mjs) | **Семисегментный индикатор**: шрифт DSEG подключается в CSS; форматирование числа — в модуле; для доступности — `aria-live` и скрытый текст. |
| [`toggle.mjs`](../app/synth-kit/toggle.mjs) | **Тоггл**: одна ячейка, `aria-pressed`. |
| [`pair-buttons.mjs`](../app/synth-kit/pair-buttons.mjs) | **Две кнопки** в одной квадратной ячейке (`onLeft` / `onRight`). |
| [`checkbox-matrix.mjs`](../app/synth-kit/checkbox-matrix.mjs) | **Матрица** чекбоксов `rows`×`cols`; `getState` / `setState` — булева матрица или плоский row-major массив. |

## Контракт

Фабрики вида `create*(options)` возвращают объект с полями:

- `element` — корневой узел (или единственный узел у тоггла);
- где уместно: `getValue`, `setValue`, `onChange(cb)`, `destroy()`;
- крутилка и фейдер: **`setPixelsPerFullRange(px)`** — смена чувствительности без пересоздания узла.

## Масштаб и сетка

На корне (класс **`synth-kit-root`**) заданы:

- **`--synth-u`** — базовая «ячейка» (например `3rem`);
- **`--synth-scale`** — множитель для блока панели (по умолчанию `1`);
- **`--synth-cell`** выводится как `var(--synth-u) * var(--synth-scale)` внутри `.synth-block`.

Матрица: опционально **`--matrix-cell`** для размера одной клетки.

## Атлас `knobs.png`

Файл **`knobs.png`** в корне каталога `music/` (1024×1024, сетка 4×4 по 256×256). Стили и координаты фрагментов — в [`app/synth-kit/knobs-atlas.css`](../app/synth-kit/knobs-atlas.css). Галерея нарезанных фрагментов: [`app/knobs-atlas-showcase.html`](../app/knobs-atlas-showcase.html) (`http://127.0.0.1:4173/app/knobs-atlas-showcase.html`).

- Подключите таблицу после `synth-kit.css`. Переменная **`--synth-knobs-atlas-url`** по умолчанию указывает на `../../knobs.png` (от `app/synth-kit/`).
- **Крутилка с текстурой ручки из атласа:** в `createKnob({ …, useKnobsAtlas: true })` задаётся класс `synth-knob--knobs-atlas`; вращается весь элемент кнопки (индикатор на спрайте), отдельная линия `.synth-knob__hand` скрыта.
- **Декоративные тайлы** (превью кусков атласа в одной ячейке): базовый класс **`synth-atlas-tile`**, модификаторы по имени фрагмента — `synth-atlas-tile--knob`, `synth-atlas-tile--fader_v`, … `synth-atlas-tile--brand_interface` (двухколоночная ширина).

| id (`synth-atlas-tile--…`) | Содержимое |
|----------------------------------|------------|
| knob | Ручка, индикатор сверху |
| fader_v | Вертикальный слайдер в пазу |
| btn_red | Красная круглая кнопка |
| power_toggle | ON/OFF и горизонтальный тумблер |
| btn_grid_4 | Четыре малых кнопки 2×2 |
| frame_display | Рамка «дисплей» |
| wave_icons | Шесть иконок волн |
| checkbox | Чекбокс с галочкой |
| frame_wide | Широкая горизонтальная рамка |
| arrows_ud | Две кнопки со стрелками вверх/вниз |
| jack | Аудиоразъём |
| slider_mini | Мини-слайдер со стрелками |
| tile_blank_a / tile_blank_b | Пустые текстурированные плитки |
| brand_interface | Блок «INTERFACE» на две колонки |

Если фактический размер файла не 1024×1024, масштабируйте координаты пропорционально или переопределите фон и `background-size` в своём слое стилей.

## Демо

После `npm run serve` в каталоге `music`:

**http://127.0.0.1:4173/app/synth-kit-demo.html**

На странице — сетка виджетов, ползунки для `--synth-scale` и для `pixelsPerFullRange` у крутилки и фейдера.

Термины **блок**, **ячейка**, **крутилка**, **фейдер**, **матрица** — в [domain.md](domain.md).
