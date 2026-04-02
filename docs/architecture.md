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

Общая навигация по HTML-страницам: [`site-nav.css`](../site-nav.css) и [`site-nav.mjs`](../site-nav.mjs) — целевые `href` собираются через `new URL(..., import.meta.url)` от корня каталога `music/`, чтобы меню работало и при корне сервера (`npm run serve`), и на GitHub Pages с префиксом `/<repo>/`. На страницах с постоянно тёмным фоном (линия synth) на корне документа задаётся атрибут `data-site-nav-theme="dark"` на элементе `<html>` — в `site-nav.css` под него включены переопределения цветов панели и кнопок без дублирования логики в JS.

Доменная теория — [`lib/music-theory.js`](../lib/music-theory.js). Интерактивные страницы с клавиатурой и синтезом разделяют: движок Web Audio [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs) (JSDoc-контракт `ToneSynthEngine`), общие поля формы [`app/tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs), геометрию клавиатур [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs), контроллер указателя и классов воспроизведения [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs), подсказку по ладу на клавишах [`app/keyboard-theory-highlight.mjs`](../app/keyboard-theory-highlight.mjs). Переиспользуемые блоки UI синтеза (крутилка, фейдер, индикатор, матрица и т.д.) — каталог [`app/synth-kit/`](../app/synth-kit/), см. [synth-ui.md](synth-ui.md). Связка слоёв data / engine / UI / клавиатуры — [synth-structure.md](synth-structure.md).
