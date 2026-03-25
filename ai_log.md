#022 | 2026-03-25 — DONE | Баян B-system: `docs/bayan-b-system.md` (теория + формулы), `lib/bayan-b-system.js`, `app/bayan-keyboard.html|css|mjs|page.mjs`; `music-theory.md`, `domain.md`, `overview.md`, `README.md`, `documentation-map.mdc`, `static-server.js`, `verify-theory.js`; эталон `Расположение_нот_на_баяне.jpg`; `npm run verify` OK

#021 | 2026-03-25 — DONE | `piano-keyboard.html`: схема белых/чёрных клавиш (октавы 4–5); `music-theory.md` (раскладка клавиш), `overview.md`, `README.md`; `npm run verify` OK

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
