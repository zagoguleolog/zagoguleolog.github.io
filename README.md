# zagoguleolog.github.io

Сайт музыкальной теории. Публичная версия: **https://zagoguleolog.github.io/**

## GitHub Pages

В настройках репозитория: **Source → Deploy from a branch**, ветка **main**, папка **`/ (root)`** (корень репо — каталог `music/` при отдельном репозитории только для сайта). Ожидаемый URL: `https://<user>.github.io/<repo>/`. Точка входа для пользователя: **`index.html`** (краткая витрина основных интерактивных страниц); полная карта сайта — **`web/stranichki.html`**. Навигация (`site-nav.mjs`) строит ссылки относительно каталога `music/`, чтобы меню работало с префиксом репозитория на Pages; ссылка «Главная» ведёт на **`index.html`**, выпадающее меню — основные интерактивные страницы с витрины (в т.ч. `app/lads2.html`). Интерактивные страницы открываются в браузере по HTTPS — отдельно ничего устанавливать не нужно.

## Структура

```text
music/                    ← корень GitHub Pages
├── README.md
├── app/                  ← интерактивные страницы
├── lib/                  ← music-theory.js, bayan-b-system.js
├── docs/                 ← domain, architecture, AI_RULES.md
├── scripts/
└── tests/ (verify-theory.js)
```

Vault: submodule `repositories/music/`; задачи — `Проекты/Музыка/`.

## Визуализация теории

- **Кварто-квинтовый круг (SVG):** откройте в браузере [`app/circle-of-fifths.html`](app/circle-of-fifths.html) — два редактируемых списка нот; число **спиц** (пар подписей) — по меньшей длине списков, кликабельных **секторов** в разметке вдвое больше (**два** на спицу: внешнее и внутреннее кольцо). См. раздел в [`docs/overview.md`](docs/overview.md).
- **Круг + тональность:** [`app/circle-scales.html`](app/circle-scales.html) — **https://zagoguleolog.github.io/app/circle-scales.html** — подсветка диатоники по кластеру **IV–I–V** (три спицы, шесть аккордов; опционально седьмая триада) через [`lib/music-theory.js`](lib/music-theory.js); выбор тоники и лада (мажор / нат. минор), режим клика; на **зелёных** секторах — **римские ступени** (**I**, **ii**, **IV** …) и **функции** (**тоника**, **субдоминанта**, **доминанта** …); боковая панель синтеза ([`app/tone-gen-engine.mjs`](app/tone-gen-engine.mjs)), озвучивание выделенных секторов и **клавиатура нот под кругом** (linear / piano / bayiano — B-system как на [`app/bayan-keyboard.html`](app/bayan-keyboard.html); те же октавы и режимы, что в панели); внутреннее кольцо по умолчанию — относительные миноры. Круг при `file://` поднимает [`app/circle-scales-core.js`](app/circle-scales-core.js); подсветка и синтез с модулями — на опубликованном сайте по HTTPS.
- **Схема клавиш фортепиано:** [`piano-keyboard.html`](piano-keyboard.html) — две октавы через [`app/keyboard-layouts.mjs`](app/keyboard-layouts.mjs); ES-модули — на HTTPS. Подробнее в [`docs/music-theory.md`](docs/music-theory.md).
- **Баян B-system:** [`app/bayan-keyboard.html`](app/bayan-keyboard.html) — три ряда в горизонтальной ориентации, параметры диапазона MIDI и вёрстки; [`docs/bayan-b-system.md`](docs/bayan-b-system.md), [`lib/bayan-b-system.js`](lib/bayan-b-system.js).
- **UI синтеза (synth-kit):** [`app/synth-kit-demo.html`](app/synth-kit-demo.html) — демо блоков (крутилка, фейдер, семисегментный индикатор, тоггл, пара кнопок, матрица); [`app/knobs-atlas-showcase.html`](app/knobs-atlas-showcase.html) — все фрагменты спрайта `knobs.png` отдельно; опционально текстуры из [`app/synth-kit/knobs-atlas.css`](app/synth-kit/knobs-atlas.css); модули в [`app/synth-kit/`](app/synth-kit/); [`docs/synth-ui.md`](docs/synth-ui.md).

### Прямые ссылки (опубликованный сайт)

Публичный адрес: **https://zagoguleolog.github.io/** (ветка и корень репозитория — см. настройки GitHub Pages).

| Страница | URL |
|----------|-----|
| Круг + тональность (ступени I…VII на зелёных секторах) | **https://zagoguleolog.github.io/app/circle-scales.html** |
| Клавиатура фортепиано (схема) | **https://zagoguleolog.github.io/piano-keyboard.html** |
| Баян B-system | **https://zagoguleolog.github.io/app/bayan-keyboard.html** |
| Таблицы из теории | **https://zagoguleolog.github.io/theory-tables.html** |
| Демо synth-kit | **https://zagoguleolog.github.io/app/synth-kit-demo.html** |
| Галерея атласа knobs.png | **https://zagoguleolog.github.io/app/knobs-atlas-showcase.html** |
| Корень (`index.html`, витрина; полная карта — `web/stranichki.html`) | **https://zagoguleolog.github.io/** |

Локальная проверка отдачи `lib/music-theory.js` с `application/javascript`: при запущенном static-server из каталога `music` (скрипт `serve` в `package.json`, порт по умолчанию см. `PORT` в `scripts/static-server.js`) — `node scripts/verify-http.mjs`.

## Агент: локальная сеть (LAN)

Последовательный список задач для агента, чтобы страницы `music` были доступны с других устройств в той же сети:

1. Открыть терминал в каталоге `music` и проверить, что Node.js установлен (`node -v`).
2. Запустить сервер командой `npm run serve`.
3. Убедиться, что сервер слушает нужный порт (`4173` по умолчанию): `netstat -ano | findstr :4173`.
4. Проверить локальный ответ с этого же ПК: открыть `http://127.0.0.1:4173/`.
5. Узнать LAN-адрес ПК (`ipconfig`) и зафиксировать IPv4 (например, `192.168.1.25`).
6. Проверить доступ по LAN с этого же ПК: открыть `http://<IPv4>:4173/`.
7. Если другой девайс не открывает страницу, добавить правило в Windows Firewall на входящий TCP-порт `4173`.
8. Проверить доступ с телефона/ноутбука в той же Wi-Fi сети по адресу `http://<IPv4>:4173/`.
9. Запустить HTTP-проверку проекта: `node scripts/verify-http.mjs`.
10. Если всё работает, зафиксировать результат в `ai_log.md` (DONE) и `log.md` (дата, время, что проверено).

## vAIbe-OS vault

Кодовый репозиторий в хранилище: **`repositories/music/`** (submodule → этот remote).

- Задачи vault-проекта «Музыка»: `Проекты/Музыка/Задачи/` (личный, локально).
- Правила агента при работе из vault: корневой `AGENTS.md`, `docs/workflow.md`.
- Process layer: vault `docs/system/*`; здесь — [docs/system/README.md](docs/system/README.md) (stub).
- Логи кода: **`ai_log.md`** / **`log.md`** в этом репо; vault-лог — в корне хранилища.

## Как использовать (standalone)

1. `npm run verify` — проверка теории.
2. `npm run serve` — локальный сервер (порт 4173).
3. Домен: `docs/domain.md`, `docs/music-theory.md`; агент: [docs/AI_RULES.md](docs/AI_RULES.md).
