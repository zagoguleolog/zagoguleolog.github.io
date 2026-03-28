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

Доменная теория — [`lib/music-theory.js`](../lib/music-theory.js). Интерактивные страницы с клавиатурой и синтезом разделяют: движок Web Audio [`app/tone-gen-engine.mjs`](../app/tone-gen-engine.mjs) (JSDoc-контракт `ToneSynthEngine`), общие поля формы [`app/tone-gen-ui-shared.mjs`](../app/tone-gen-ui-shared.mjs), геометрию клавиатур [`app/keyboard-layouts.mjs`](../app/keyboard-layouts.mjs), контроллер указателя и классов воспроизведения [`app/keyboard-synth-controller.mjs`](../app/keyboard-synth-controller.mjs), подсказку по ладу на клавишах [`app/keyboard-theory-highlight.mjs`](../app/keyboard-theory-highlight.mjs). Переиспользуемые блоки UI синтеза (крутилка, фейдер, индикатор, матрица и т.д.) — каталог [`app/synth-kit/`](../app/synth-kit/), см. [synth-ui.md](synth-ui.md).
