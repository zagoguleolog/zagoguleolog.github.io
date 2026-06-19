# AI Rules

Входная точка для AI-агента в репозитории **music** (`zagoguleolog.github.io`).

## Работа из vAIbe-OS vault (предпочтительно)

Если workspace — **корень хранилища** (vault, рядом с `AGENTS.md` и `.ai/`):

1. **Правила агента и процесс** — vault: `AGENTS.md`, `.ai/router.md`, `docs/workflow.md`, `docs/system/*`.
2. **Задачи** — `Проекты/Музыка/Задачи/*/task.md` + `промт.md`; выполнение через `/task-execute`.
3. **Код этого репо** — `repositories/music/` (этот каталог).
4. **Домен и архитектура** — здесь: `docs/overview.md`, `docs/domain.md`, `docs/architecture.md`, `docs/music-theory.md`.
5. **Логи:** vault `ai_log.md` — операции vault; **`repositories/music/ai_log.md`** — код, verify, Pages (не дублировать каждый коммит в оба).

## Работа при открытии только репозитория music

1. Прочитать `docs/overview.md`, `docs/domain.md`, `docs/architecture.md`.
2. Процесс — `docs/system/README.md` (stub; полный канон в vault при наличии).
3. Ошибки проекта — `docs/errors.md`.
4. После изменений — самопроверка (`npm run verify`) и синхронизация документации.

## Ссылки на результаты

Если упоминается **готовый артефакт** (страница в `app/`, отчёт, URL Pages), **всегда давай прямую ссылку**:

- **Локальный файл** — абсолютный путь без `file:` (Windows: `C:/Users/…/repositories/music/app/…html`).
- **Веб** — полный `https://zagoguleolog.github.io/...` без сокращений.

## Source of Truth (этот репозиторий)

| Тема | Файл |
|------|------|
| Домен, термины | `docs/domain.md`, `docs/music-theory.md` |
| Архитектура, UI синта | `docs/architecture.md`, `docs/synth-structure.md` |
| Ошибки (ERR-xxx) | `docs/errors.md` |
| Теория в коде | `lib/music-theory.js` |
| Verify | `npm run verify`, `npm run verify:http` |

Process layer при работе из vault — **не** `docs/system/*` здесь, а vault `docs/system/*`.

## Архитектура и логика

- Не хардкодить бизнес-логику; Source of Truth — `lib/`, `docs/music-theory.md`.
- Не дублировать данные; ссылаться на канонические модули и документы.
