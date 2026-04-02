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
| [`segment-value-control.mjs`](../app/synth-kit/segment-value-control.mjs) | **Индикатор-значение с жестами крутилки**: отображение в стиле `.synth-seg`, вертикальное перетаскивание и колесо мыши, `pixelsPerFullRange`, `step`; API как у `createKnob` (`getValue` / `setValue` / `onChange` / `setPixelsPerFullRange` / `destroy`). |
| [`toggle.mjs`](../app/synth-kit/toggle.mjs) | **Тоггл**: одна ячейка, `aria-pressed`. |
| [`pair-buttons.mjs`](../app/synth-kit/pair-buttons.mjs) | **Две кнопки** в одной квадратной ячейке (`onLeft` / `onRight`). |
| [`checkbox-matrix.mjs`](../app/synth-kit/checkbox-matrix.mjs) | **Матрица** чекбоксов `rows`×`cols`; `getState` / `setState` — булева матрица или плоский row-major массив. |

## Контракт

Фабрики вида `create*(options)` возвращают объект с полями:

- `element` — корневой узел (или единственный узел у тоггла);
- где уместно: `getValue`, `setValue`, `onChange(cb)`, `destroy()`;
- крутилка, фейдер и индикатор-значение (`segment-value-control`): **`setPixelsPerFullRange(px)`** — смена чувствительности без пересоздания узла.

## Масштаб и сетка

На корне (класс **`synth-kit-root`**) заданы:

- **`--synth-u`** — базовая «ячейка» (например `3rem`);
- **`--synth-scale`** — множитель для блока панели (по умолчанию `1`);
- **`--synth-cell`** выводится как `var(--synth-u) * var(--synth-scale)` внутри `.synth-block`.

Матрица: опционально **`--matrix-cell`** для размера одной клетки.

## Атлас `knobs.png`

Файл **`knobs.png`** в корне каталога `music/` (1024×1024, сетка 4×4 по 256×256). Стили и координаты фрагментов — в [`app/synth-kit/knobs-atlas.css`](../app/synth-kit/knobs-atlas.css). Галерея подрезки: [`app/knobs-atlas-showcase.html`](../app/knobs-atlas-showcase.html) (например `https://zagoguleolog.github.io/app/knobs-atlas-showcase.html`) — **общая сетка границ**: массивы **`xs[0..4]`** и **`ys[0..4]`** (строго возрастающие координаты в пикселях исходника; без сохранённого состояния подставляются **`DEFAULT_XS` / `DEFAULT_YS`** в [`knobs-atlas-showcase-page.mjs`](../app/knobs-atlas-showcase-page.mjs) — узлы из актуального экспорта подрезки атласа). Каждый фрагмент привязан к ячейке `(col, row)` с опциональным **`colSpan`×`rowSpan`** (у `brand_interface` — две колонки в нижнем ряду); прямоугольник подрезки выводится как `x₀=xs[col]`, `y₀=ys[row]`, `x₁=xs[col+colSpan]`, `y₁=ys[row+rowSpan]`, так что соседние 1×1-ячейки делят одну линию реза без зазоров. Мини-карта: без Ctrl — перенос **левого верхнего** узла ячейки (`xs[col]`, `ys[row]`); с Ctrl или ⌘ — **правого нижнего** (`xs[col+colSpan]`, `ys[row+rowSpan]`). Четыре **индикатора координат** из [`segment-value-control.mjs`](../app/synth-kit/segment-value-control.mjs) (семисегмент, жесты как у крутилки) правят те же четыре узла. Состояние сетки — в `localStorage` (ключ **`knobs-atlas-showcase-grid-v1`**; при первом открытии после старого формата выполняется попытка восстановить узлы из ключа `knobs-atlas-showcase-crops-v2`). Внизу страницы — **одна строка JSON** `{"xs":[…],"ys":[…],"slices":{…}}` (`slices` — вычисленные `{x0,y0,x1,y1}` по ключам в фиксированном порядке), обновляется при правках; кнопка «Копировать в буфер». Ниже — **тестовая сетка 8×8** по данным [`app/knobs-atlas-showcase-grid-pattern.json`](../app/knobs-atlas-showcase-grid-pattern.json) (`w`, `h`, массив ключей `c` в row-major): 64 ячейки с теми же кропами из текущей сетки. Для продакшена по-прежнему можно опираться на фиксированную сетку в [`knobs-atlas.css`](../app/synth-kit/knobs-atlas.css) или перенести координаты из экспорта вручную.

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

Публичный URL (GitHub Pages): **https://zagoguleolog.github.io/app/synth-kit-demo.html**

На странице — сетка виджетов, ползунки для `--synth-scale` и для `pixelsPerFullRange` у крутилки и фейдера.

## Темплейт-синт

Страница [`app/template-synth.html`](../app/template-synth.html) (например `https://zagoguleolog.github.io/app/template-synth.html`) — полноценный генератор тона на том же движке и [`tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs), с префиксом id **`tpl-`**. Крутилки, фейдер и **матрица** частичных тонов n=1…16 из synth-kit синхронизированы со скрытыми полями формы, которые читает `readToneGenParams`.

На [`app/circle-scales.html`](../app/circle-scales.html) тот же synth-kit с префиксом **`cts-ntg-`**: блок тембра — **`.cts-synth-kit-row`**, сетка **3×2** (порядок в разметке: громкость | обертоны; детун | спад; смесь | угасание), **`align-items: start`** и **`justify-items: start`**, чтобы строки совпадали по вертикали и край совпадал с остальными полями панели. Подпись матрицы в UI: «Обертоны».

**Намеренные исключения** из «чистого» kit: компактный `<select>` формы колебания; числовые поля опорной **A4** и диапазона октав. Режимы клавиатуры (hold / latch / latchPoly) на этой странице не выводятся — см. [synth-structure.md](synth-structure.md).

Термины **блок**, **ячейка**, **крутилка**, **фейдер**, **матрица** — в [domain.md](domain.md).
