# План исправления проблем аудита TOPIK II Master Pro

**Дата:** 2026-11-22 · **Базовая точка:** HEAD `cc7f833` + dirty worktree · **Источник:** [audit/AUDIT_REPORT.md](AUDIT_REPORT.md) (259 находок: P0 19 / P1 79 / P2 123 / P3 38)

## Принципы

1. **Волны строго последовательны по гейтам**, внутри волны задачи параллельны (disjoint write scopes).
2. **Гейт волны** = `npx tsc --noEmit` = 0, `npx eslint . --max-warnings 0` = 0, `npx vitest run` зелёный, `npx vite build` успешен. Lead прогоняет гейт после слияния волны.
3. **Не менять/не печатать секреты** (.env), не делать git-коммитов, `filter-repo`, force-push без отдельного решения владельца.
4. **Без живой БД**: SQL-миграции пишутся идемпотентно и защищённо (`DO $$ … to_regclass/EXCEPTION`), но **применяются владельцем** через `supabase db push` после ревью; в changelog фиксируется «требует live-применения».
5. **Без Deno**: код Edge Functions проверяется статически; `deno check/fmt/test` — на стороне CI/владельца.
6. Каждая задача: изменения + changelog в `audit/fixes/<area>.md` + список остаточных рисков.
7. Крупные рефакторинги (разбиение `app.ts`/`stats.ts`/`quiz.ts`, полный разрыв `core→ui`) — **Волна 4**, только после появления реальных тестов (риск сломать продукт без E2E).

## Реестр задач

| ID | Волна | Владелец | Скоуп (файлы) | Что сделать | Критерий приёмки |
|---|---|---|---|---|---|
| W0-01 | 0 | Lead | `src/app.ts` | Удалить неиспользуемый `import { setSyncState }` (149) и осиротевшие JSDoc (142–148) | tsc=0 |
| W0-02 | 0 | Lead | `src/core/db.ts` | `saveAllState`: вернуть `saveStreak`, `saveDbVersion`; `saveVocabVersion` писать `VOCABULARY_CACHE_VERSION` | L-01/DAT-05 закрыты |
| W0-03 | 0 | Lead | `src/core/network.ts`, `src/core/xp.ts` | Prettier (финальный `\n`), убрать `console.log` (104) | eslint=0 |
| W0-04 | 0 | Lead | — | Гейт: tsc/eslint/vitest/vite build + changelog | Гейт зелёный |
| W1-01 | 1 | backend | `supabase/migrations/0002_*.sql` | RLS: эскалация `profiles.role` (SEC-01, BE-05), триггер `handle_new_user`; политика публикации `vocabulary` (SEC-03); `articles` RLS (BE-07/SEC-08); лидерборд RPC (BE-08); публичные списки (BE-09); `updated_at`-триггеры (BE-10); UNIQUE для upsert (BE-11); realtime publication (BE-22); бакеты (BE-18); `rate_limits` + `check_rate_limit` (SEC-05/BE-13); `cleanup_user_progress` (BE-12); `ai_cache.expires_at` default (BE-21) | Миграция идемпотентна, все объекты через `DO $$`/`IF NOT EXISTS` |
| W1-02 | 1 | backend | `supabase/functions/**`, `supabase/config.toml`, `deno.json` | IDOR `regenerate-image` + internal-secret для `auto` (BE-04/SEC-02); `verify_jwt=false` + код-проверка для `background-worker`, внутренний вызов воркера (BE-02/03); env-имена новых ключей (BE-20); Edge TTS `Sec-MS-GEC` (BE-19); `ai_cache` upsert+expires (BE-21); rate limit в дорогих функциях (BE-13); `failed_step`/partial-upsert (BE-14/15/16); `delete-user` полная очистка (BE-17); структурное логирование вместо «structured logging»-мифа | Статическая проверка импортов/типов вручную; changelog |
| W1-03 | 1 | tooling | `.github/workflows/deploy.yml`, `vite.config.ts`, `public/404.html`, `package.json` | Деплой фронта (Pages Actions), base-path стратегия (env-driven), 404.html, pin действий, `prettier --check`, `npm audit`, `.env`-экранирование, `deno fmt` только по functions | Workflow валиден YAML; `npm run check/lint/test:run/build` локально зелёные |
| W1-04 | 1 | Lead | `src/app.ts`, `src/ui/ui_modal.ts` | Стек модалок: Esc/focus-trap по верхнему окну, scroll-lock, `aria-hidden`/`inert`, возврат фокуса (F-02), убрать двойной history (F-42) | Ручной сценарий «квиз → объяснение → Esc» закрывает верхнее окно |
| W2-01 | 2 | data | `src/core/sync.ts`, `state.ts`, `storage_idb.ts`, `auth.ts`, `auth_service.ts`, `pwa.ts`, `network.ts`, `backup.ts`, `supabaseClient.ts` | Outbox как журнал операций + replay + backoff + dead-letter (DAT-01/04/16); убрать `localStorage.clear()` (DAT-02) в `app.ts` — по согласованию с Lead; единая обёртка квоты (DAT-03); серверный merge-RPC вместо LWW (DAT-06..09); пагинация прогресса (DAT-10); очистка состояния при logout/смене аккаунта (DAT-11); IDB lifecycle (DAT-15); сессия-персист (DAT-18); убрать логирование `init` с токенами в fetch-retry; BackgroundSync только для идемпотентных ops | tsc/eslint по своим файлам 0; changelog со сценариями |
| W2-02 | 2 | Lead | `src/core/db.ts` | `recordAttempt` → единый SRS (все ответы обновляют SM-2), grade-маппинг quiz (LL-03); `getQueue` без «due-сейчас» для незапланированных; `validateUserStats` не блокирует сохранение из-за отрицательного XP (LL-31) | unit-сценарии в changelog |
| W2-03 | 2 | logic | `src/core/scheduler.ts`, `stats.ts`, `xp.ts`, `session.ts`, `speech.ts`, `src/ui/quiz.ts`, `quiz_strategies.ts`, `quiz_modes_config.ts`, `ui_card.ts`, `ui_review.ts`, `ui_shop.ts`, `ui_leaderboard.ts`, `src/utils/hangul.ts` | SRS: 4 оценки, провал=1 день, cap EF/interval, fuzz-preview (LL-01/02/24/32/33); фарм: guard `answered`, идемпотентные награды, `addCoins` отдельно, cap `getTotalXP`/level (LL-04..07/10/11); двойные сессии (LL-06); speech: тех.ошибки ≠ неверный ответ, стоп треков (LL-08/09); `toKorean` пробелы/латиница, NFC (LL-12/13/34/35); leaderboard через RPC (BE-08); лимит магазина (LL-38); `Math.random`-моки для тестов | tsc/eslint 0; тесты scheduler/stats обновлены |
| W2-04 | 2 | frontend | `src/ui/ui_feedback.ts`, `ui_trash.ts`, `ui_bulk.ts`, `ui_reading.ts`, `ui_data.ts`, `ui_collections.ts`, `ui_interactions.ts`, `ui_settings.ts`, `ui_retry.ts`, `ui_custom_words.ts`, `ui_writing.ts`, `src/core/renderer.ts` | F-03 (JS в шаблоне), F-04 (feedback entry), F-05 (trash), F-07 (bulk), F-08 (audio button), F-16 (reading), F-27 (mistakes filter), F-28 (study goal), F-20/23/24 (Chart.js lazy, draft debounce, base64 history); валидация импорта (DAT-12); renderer: role/tabindex/фокус-семантика (F-10) | tsc/eslint 0; changelog |
| W3-01 | 3 | a11y | `src/html/**`, `src/css/**`, `index.html`, `public/offline.html` | `role="dialog"/aria-modal/aria-labelledby`, labels, `:focus-visible`, контраст тёмной темы, `prefers-reduced-motion`, `<h1>`, `lang="ko"`, `aria-live`, touch-targets 24–44px, дубль `#quotes-modal`, `.hidden`, убрать двойной onclick фильтра (F-01) | eslint=0; визуальная проверка по токенам |
| W3-02 | 3 | tooling | `package.json`, `tsconfig.json`, `eslint.config.ts`, `.prettierrc`, `src/test-setup.ts`, `src/**/*.test.ts`, `supabase/functions/*.test.ts`, `.gitignore`, `.env.example` | Реальные тесты (session/db/sync/scheduler/stats), jsdom, coverage thresholds, скрипты `typecheck/test:run/format:check`, tsconfig strictness + configs, eslint без противоречия warnings, удаление мёртвых deps, `engines`, `.nvmrc`; Deno-тесты — на handler-моки | `vitest run` зелёный; coverage ≥ порога; `prettier --check` зелёный |
| W3-03 | 3 | tooling+Lead | `README.md`, `GEMINI.md`, `.gitignore`, `CHANGELOG.md`, `CONTRIBUTING.md` | Синхронизировать документацию с фактами, добавить CHANGELOG/CONTRIBUTING, untrack `supabase/.temp`, `__pycache__` (git rm --cached; коммит — на владельце) | Документация не противоречит коду |
| W3-04 | 3 | Lead | `audit/fixes/*` | Сводный changelog волн, остаточные риски, инструкции live-применения | Полный отчёт о выполнении |
| W4 | 4 | Lead/team | архитектура | Разбиение `app.ts`/`stats.ts`/`quiz.ts`, разрыв `core→ui`, `dependency-cruiser`, CSP без inline, self-host ассетов | Только после реальных тестов; отдельный план |

## Ручные действия владельца (не автоматизируются)

1. **Ротация ключей**: `GEMINI_API_KEY`, `PIXABAY_API_KEY`, `SUPABASE_SECRET_KEY` (считать скомпрометированными: лежали в OneDrive-папке). Вынести `.env` из OneDrive; убрать дубликат `SUPABASE_SERVICE_KEY`.
2. **Применение миграций** к живому Supabase: ревью `0002_*.sql` → `supabase db push`; проверить `pg_policies`/триггеры.
3. **Деплой Edge Functions** после зелёного CI.
4. **Настройка GitHub Pages** (Source = GitHub Actions) или выбор Netlify; при custom domain — `CNAME`.
5. **Браузерный smoke-тест** 20 сценариев (список в AUDIT_REPORT §11).
6. **Git-история** (92.9 MB, node_modules): `git filter-repo` — только по отдельному решению (переписывание истории).

## Остаточные риски, принимаемые осознанно

- SQL-миграция не проверена на живой БД (нет доступа); написана идемпотентно и защищённо.
- Edge Functions не проверены `deno check` (нет Deno); покрыты статическим ревью.
- Полный CSP требует выноса всех inline-обработчиков — часть переносится в W3-01, остаток (auth.html inline `onclick`) — W4.
- Разбиение монолитов и полный разрыв `core→ui` — W4 после появления реальных тестов.

## Статусы

Обновляются по мере выполнения: `audit/fixes/WAVE-0.md`, `WAVE-1.md`, `WAVE-2.md`, `WAVE-3.md`.
