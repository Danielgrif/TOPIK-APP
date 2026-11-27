# TOPIK II Master Pro — консолидированный технический аудит

**Дата:** 2026-11-22 (Asia/Tashkent, UTC+5)
**Объект:** `C:\Users\demir\OneDrive\Рабочий стол\TOPIK APP`
**HEAD:** `cc7f8333272c715de22d1a883b924bb576f2cbd0` (`main`, 2026-11-20)
**Состояние рабочего дерева:** «грязное» — 16 изменённых/удалённых файлов (`git diff --stat`: +205/−193), 2 новых неотслеживаемых модуля (`src/core/network.ts`, `src/core/xp.ts`), 6 файлов удалено, но не закоммичено.
**Ветка `gh-pages`:** `d0031bf` от 2026-02-27 (снапшот исходников, не сборка).
**Метод:** 6 независимых экспертных аудитов (статический анализ кода + эталонные прогоны инструментов Lead). Приложение в браузере не запускалось, живой Supabase/Deno недоступны (см. «Ограничения»).

---

## 0. Состав команды и артефакты

| Роль | Скоуп | Отчёт | Находки |
|---|---|---|---|
| **Lead** | координация, объективные прогоны, git/CI/деплой, консолидация, выборочная верификация | этот файл + `audit/logs/*` | +1 P1 (L-01), проверки |
| security-auditor | auth, Supabase client, RLS, Edge Functions, секреты, XSS, supply chain | `audit/reports/security.md` (1126 стр.) | 40 (P0×1, P1×9, P2×18, P3×12) |
| data-auditor | db/state/IDB/sync/outbox/backup/session/PWA/SW | `audit/reports/data-offline.md` (1256 стр.) | 35 (P0×3, P1×13, P2×14, P3×5) |
| logic-auditor | SM-2/SRS, XP/уровни/лиги, квизы, speech, hangul | `audit/reports/learning-logic.md` (1142 стр.) | 39 (P0×2, P1×9, P2×19, P3×9) |
| frontend-auditor | app.ts, ui/**, html/**, css/**, a11y, рендеринг | `audit/reports/frontend.md` (552 стр.) | 50 (P0×2, P1×14, P2×31, P3×3) |
| backend-auditor | Edge Functions (Deno), RLS-миграция, схема БД, Storage | `audit/reports/backend.md` (844 стр.) | 48 (P0×6, P1×16, P2×21, P3×5) |
| quality-auditor | архитектура, дубли/мёртвый код, типы, тулинг, тесты, CI, docs, зависимости, git | `audit/reports/quality-arch.md` (682 стр.) | 46 (P0×5, P1×17, P2×20, P3×4) |

**Всего: 259 находок** — 258 в шести доменных отчётах + 1 находка Lead (L-01): **P0 = 19, P1 = 79, P2 = 123, P3 = 38**. Часть находок соседних доменов пересекается по смыслу (аудиторы делали кросс-ссылки), поэтому уникальных проблем меньше — примерно 230.

Артефакты воспроизводимости: `audit/logs/{tsc,lint,test,build,coverage,vite-build,npm-audit,tsc-head,lint-head}.txt` (сырые выводы всех прогонов; `audit/logs/vite-build.txt` — свежая успешная сборка с размерами чанков). Временные каталоги (`audit/head-check`, `audit/build-out`, `audit/coverage`) после снятия доказательств удалены, чтобы не раздувать рабочую папку; исходники проекта и конфиги аудитом не изменялись.

---

## 1. Резюме

**Проект сильный по замыслу и breadth функционала, но не готов к продакшену ни по одному из четырёх измерений: сборка/деплой, безопасность, надёжность данных, достоверность обучения.**

Приложение — это 37 тыс. строк Vanilla-TS PWA с 20+ режимами тренировки, SRS, геймификацией, AI-эссе, TTS, офлайн-режимом и Supabase-бэкендом. Ядро UI выглядит живым и продуманным (вёрстка, темы, виртуальный скролл, 240 мест с `innerHTML` — но `escapeHtml` применяется дисциплинированно). Однако:

1. **Текущее рабочее дерево не собирается и не проходит линт** (TS6133 `app.ts:149`; 2 prettier-ошибки). `npm run check`, `npm run build`, `npm run lint` — красные. CI-пайплайн (`deploy-functions needs: test`) заблокирован. При этом коммит HEAD чистый: `tsc` = 0, `eslint` = 0, 29/29 тестов зелёные — то есть блокеры созданы незакоммиченным полузаконченным рефакторингом (`network.ts/xp.ts`, вынос save-функций).
2. **Фронтенд нигде не деплоится**: в CI нет job публикации, `permissions: contents: read`; ветка `gh-pages` — снапшот *исходников* от 2026-02-27 с `<script type="module" src="/src/app.ts">` (браузер не исполняет TS). То есть «опубликованный» сайт нерабочий и отстаёт на 9 месяцев. Плюс `base: "/"` несовместим с project-page URL `/TOPIK-APP/`, а `public/_redirects` — механизм Netlify, на GitHub Pages мёртвый.
3. **Бэкенд не воспроизводим и частично неработоспособен**: в единственной миграции нет ни одного `CREATE TABLE`/`INDEX`/`TRIGGER`/бакета/RPC — только RLS-политики поверх таблиц, которых в репозитории нет. Cron-воркер недостижим (`verify_jwt=true` vs `CRON_SECRET` в `Authorization`), внутренний вызов воркером `regenerate-image` всегда 401 (обработчик требует user-JWT), админ-функции мертвы без триггера `profiles`, а в RLS есть **эскалация до admin** (`profiles_insert_self` не ограничивает `role`).
4. **Есть эксплуатируемые уязвимости**: P0-эскалация до `role='admin'`; IDOR на подмену/удаление изображения любой словарной статьи (`regenerate-image`, mode=auto/finalize); публикация произвольного контента в общий словарь без модерации + stored XSS через `w.level`; отсутствие CSP и сессия в localStorage превращают любую XSS в захват аккаунта; отсутствие rate limiting на платные Gemini/OCR/stock-API.
5. **«Offline-first» и SRS заявлены, но не реализованы**: dirty-outbox теряет ID, добавленные во время синка; `localStorage.clear()` при любом `SyntaxError` с «JSON» в сообщении; при квоте сохранения молча падают; конфликты — полный LWW по клиентским часам (затирание XP/флагов/сессий); инкрементальный синк словаря мёртв из-за двух версий кэша (`10` vs `v1.1`) → full-sync на каждый старт. SRS: grade 4 недостижим из UI (только 5/3/0), «Забыл» у зрелого слова → +20 дней, правильные ответы квиза вообще не двигают SM-2.
6. **Геймификация накручиваема**: 4+ неограниченных источника XP/монет (двойной клик «Верно» в эссе, повторная проверка в конструкторе, цикл «Знаю→Сброс», `addXP` скрыто даёт монеты 1:1 + повторное начисление), двойной учёт сессий.
7. **UI-слой разъехался с HTML-разметкой**: панель фильтров не открывается (двойной toggle), Esc во время квиза обрывает тренировку (стек модалок не учитывается), корзина всегда пуста, оплаченные бонусы квиза неприменимы (нет `#quiz-powerups`), «Чтение», «Обратная связь», «Учебная цель» недоступны, bulk-режим падает с `TypeError`.
8. **Доступность системно ниже WCAG 2.1 AA**: `role="dialog"` у 9 из 34 модалок, `:focus-visible` нет ни у одной карточки, контраст в тёмной теме 1.92–2.72:1, 10+ кликабельных `div` без клавиатуры, нет `prefers-reduced-motion`, чекбоксы без доступных имён.
9. **Тесты создают иллюзию качества**: 29 «зелёных» тестов, но `session.test.ts` — 6 из 6 тестов без `await` (ассерты никогда не выполняются), `db.test.ts` проверяет `Set`, а не `db`; все 6 Deno-тестов проверяют только константы. Покрытие — **1.87%** стейтментов, `db.ts/sync.ts/auth.ts/ui/**` = 0%, порогов покрытия нет.
10. **Документация мифологизирует состояние**: README закрывает «P0/P1», заявляет SM-2/FSRS (FSRS в коде 0 упоминаний), «структурированное логирование», «unit-тесты Edge Functions», «durable outbox». Всё это не соответствует коду.

**Оценка готовности к продакшену: 3.5 / 10** (breadth 8/10, инженерная дисциплина 3/10, безопасность 3/10, надёжность данных 2/10, качество тестов 2/10, UX-полировка 6/10). Потенциал продукта высокий: предметная логика, контент и вёрстка уже есть; нужен «стабилизационный» квартал.

---

## 2. Ключевые цифры

| Метрика | Значение |
|---|---|
| Исходники | ~37 100 строк: `src/ui` 14 622 (36 файлов), `src/css` 7 100 (15), `src/core` 7 004 (28), `src/html` 2 412 (25), `src/utils` 1 039 (2), `src/types` 350 (3), `src/workers` 31 (1), корневые `app.ts`+`sw.ts` 1 852 (2), `supabase/functions` 2 730 (24), миграция 301 (1), `index.html` 481 |
| Крупнейшие файлы | `src/app.ts` 1 646; `src/ui/quiz.ts` 1 602; `src/core/stats.ts` 1 476; `src/css/components.css` ~2 958; `src/css/layout.css` ~1 261; `src/ui/quiz_strategies.ts` 1 109 |
| Тесты (frontend) | 4 файла / 29 тестов — зелёные; **coverage 1.87% stmts / 2.03% lines** |
| Покрытие ключевых модулей | scheduler 70.88%, state 51.05%, backup 34.61%, stats 10.51%, **db 0%, sync 0%, auth 0%, session 0%, pwa 0%, storage_idb 0%, весь `src/ui` 0%** |
| Тесты (Edge Functions) | 3 файла / 6 тестов — проверяют только константы |
| Бандл (свежая сборка) | `index.js` 431.91 kB (gzip 116.68); `vendor-supabase` 173.38 (45.90); `vendor-charts` 107.06 (37.99); CSS 107.58 (19.89); PWA precache 23 записи / 908.72 KiB; SW 33.02 kB |
| Стартовая нагрузка | ≈ 205 kB gzip JS + 19.9 kB gzip CSS + внешний шрифт с jsDelivr |
| Зависимости | 607 пакетов (17 prod / 591 dev / 52 optional / 14 peer); `npm audit`: **33 уязвимости — 15 high, 16 moderate, 2 low**, в т.ч. direct `vite` (high) |
| Git | `.git` 29.72 MiB loose (packs: 0), 1589 blob'ов = 92.87 MB, 13 blob'ов > 1 MB (esbuild.exe 9.9 MB, typescript.js 9.1 MB, `_tsc.js` 6.2 MB, log.txt 5.0+2.0 MB); в репо 9.74 MB mp3 |
| HEAD-проверки | tsc 0, eslint 0, vitest 29/29 — зелёные |
| Worktree-проверки | tsc 2 (TS6133), eslint 1 (2 errors / 2 warnings), `npm run build` 2 — **красные** |
| Трекается мусор | `supabase/.temp/*` (9 файлов: project-ref, pooler-url, linked-project.json…), `__pycache__/content_worker.cpython-313.pyc` (48 KB), корневые `index.ts` («This file was misplaced… You can delete this file»), `settings.json`, `requirements.txt` |
| gh-pages | 121 файл, 80 из `src/`, 0 из `dist/`; отстаёт от main на 9 месяцев; `<script src="/src/app.ts">` |

---

## 3. Объективная матрица проверок (выполнено Lead)

| # | Команда/действие | Результат | Вывод |
|---|---|---|---|
| 1 | `npx tsc --noEmit` (worktree) | **exit 2**: `src/app.ts(149,1): error TS6133: 'setSyncState' is declared but its value is never read` | Блокер сборки |
| 2 | `npx tsc -p` на эталонном снапшоте HEAD (`audit/head-check`) | **exit 0** | Регрессия внесена незакоммиченными правками |
| 3 | `npx eslint . --max-warnings 0` (worktree) | **exit 1**: 2 errors (`network.ts:177`, `xp.ts:26` — prettier «Insert ⏎»), 2 warnings (`app.ts:149` unused, `network.ts:104` no-console) | Блокер CI |
| 4 | `npx eslint audit/head-check/src --config …` | **exit 0** | HEAD линт-чистый |
| 5 | `npx vitest run` | **29/29 passed**, 4 files, 10.8 s | Тесты зелёные, но фиктивные (см. §6.6) |
| 6 | `npx vitest run --coverage` | **1.87% stmts / 2.05% branch / 1.15% funcs / 2.03% lines** | Покрытие отсутствует; порогов нет |
| 7 | `npx vite build --outDir audit/build-out` | **успех**, 17.29 s, 134 модуля, чанки см. §2 | Vite-сборка работоспособна; виноват только `tsc` |
| 8 | `npm run build` | **exit 2** — падает на `tsc` до Vite | Штатная сборка невозможна |
| 9 | `npm audit --json` | 33 уязвимости: 15 high / 16 moderate / 2 low; direct: `vite` (high), `vitest`, `@vitest/coverage-v8`, `vite-plugin-pwa`, `typescript-eslint` (moderate) | Требуется обновление/аудит в CI |
| 10 | `deno check/test/fmt/lint` | **не выполнялось** — Deno в системе отсутствует | Деновская часть CI не проверена локально |
| 11 | Живой Supabase (pg_policies, триггеры, RPC, бакеты) | **не выполнялось** — нет доступа | Ключевые RLS-риски требуют live-проверки |
| 12 | Браузерный рантайм / Lighthouse / a11y-скан | **не выполнялось** | A11y-выводы — статические (по коду/цветам) |
| 13 | ESBuild под песочницей | `spawn EPERM` при первом прогоне vitest/vite; выполнено однократно с расширенными правами | Не дефект проекта; отмечено для воспроизводимости |

Вывод по матрице: **HEAD-состояние «зелёное», рабочее дерево — «красное».** Любое исправление должно начинаться с коммита/отката незавершённого рефакторинга.

---

## 4. Состояние git, CI и деплоя

### 4.1 Рабочее дерево (главный операционный риск)
- Изменены: `src/app.ts` (−92 строки в старом блоке, вынос в `network.ts`), `src/core/db.ts` (+215, «разделение God Object saveState» на 15 `saveXxx`), `sync.ts`, `pwa.ts`, `stats.ts`, `stats.test.ts`, `ui_leaderboard.ts`, `ui_share.ts`, `package-lock.json`, `generate-word-data/deno.json`.
- Новые: `src/core/network.ts` (177), `src/core/xp.ts` (26).
- Удалены, но не закоммичены: `index.ts`, `settings.json`, `requirements.txt`, `__pycache__/*.pyc`, `find-confusing-words/deno.json`, `regenerate-image/settings.json`.
- Дефекты именно этого состояния:
  - **L-01 (P1, найдено Lead, не покрыто доменными отчётами):** новый `saveAllState()` (`src/core/db.ts:896-911`) **потерял сохранение `LS_KEYS.STREAK`** и `LS_KEYS.DB_VERSION`, которые были в прежнем `immediateSaveState()` (`git show HEAD:src/core/db.ts` → строки 79, 85). `state.streak` читается из localStorage (`state.ts:456`), но больше нигде не пишется; в облако уходит только `streakLastDate`, а не `count`. Итог: **счётчик серии обучения теряется при каждой перезагрузке**.
  - `network.ts` импортируется в середине `app.ts` (строки 149, 1099, 1104), остались осиротевшие JSDoc (142–148), две реализации `measurePing` (`app.ts:277`, `network.ts:121`).
  - `setSyncState` переехал в `sync.ts`, но сигнатура изменилась (`"synced"` → `"success"`), а в `app.ts` остался неиспользуемый импорт.
  - `saveVocabVersion` пишет `CURRENT_DB_VERSION` («10») вместо `VOCABULARY_CACHE_VERSION` («v1.1») — см. DAT-05.

### 4.2 CI/CD (`.github/workflows/deploy.yml`)
- `test`-job: `npm ci` → `.env` → `check` → `lint` → `build` → `vitest --coverage` → deno fmt/lint/test. **Сейчас падает на `check`** (QA-01), значит `deploy-functions` (`needs: test`) не выполнялся и не выполнится.
- `deploy-functions`: `supabase functions deploy --project-ref`; секреты `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_ID`. Миграции БД из CI не применяются вообще.
- **Фронтенд не деплоится**: нет `pages`-job, `permissions: contents: read`, `npm run deploy` (`gh-pages -d dist`) существует только локально.
- Actions не запинены по SHA (`@v4`, `@v1`), `supabase/setup-cli@v1 version: latest` — supply-chain риск (QA-19).
- `deno-version: v2.9.6`, `deno fmt --check` по 152+ строкам TS — почти наверняка красный (QA/BE-06).
- `.env` создаётся через `printf` без экранирования `%`/`\n` в секретах (QA-19).

### 4.3 Хостинг
- Три несовместимые модели одновременно: GitHub Pages (project page `/TOPIK-APP/`), Netlify (`public/_redirects`), локальный `gh-pages`-скрипт. `base: "/"` ломает ассеты на project page; `_redirects` на GH Pages мёртв; `404.html` нет.
- `dist/` в рабочем дереве от 2026-11-20 (сборка «позавчера»), исходники правились 2026-11-22; `dist/sw.js` содержит устаревшие стратегии.

---

## 5. Все P0 (19) — блокеры релиза

| ID | Домен | Файл:строка | Суть | Влияние |
|---|---|---|---|---|
| **SEC-01** | RLS/эскалация | `supabase/migrations/0001_initial_rls.sql:174-177` | `profiles_insert_self` разрешает INSERT со своим `id`, но не ограничивает `role`; триггера создания `profiles` в репо нет | Любой зарегистрированный пользователь вставляет себе `role='admin'` → все `*_admin_all`-политики, `get-feedback-reports` (PII+email всех отчётов), все Storage-бакеты, запись `quotes`/`ai_cache` → полный захват административных прав |
| **BE-01** | Схема/миграции | `0001_initial_rls.sql:1-7` | Единственная миграция — только RLS: ни `CREATE TABLE`, ни индексов, ни констрейнтов, ни триггеров, ни бакетов, ни `seed.sql` | Схема БД не версионируется; `supabase db push` на чистом окружении создаст политики без таблиц; половина P1 («есть ли колонка/UNIQUE/триггер») непроверяема без живой БД |
| **BE-02** | Cron/JWT | `supabase/config.toml:51-54` + `background-worker/index.ts:20-24` | `verify_jwt=true`, а cron шлёт `Authorization: Bearer <CRON_SECRET>` (не JWT) | Gateway отвечает 401 до кода функции; планировщика (pg_cron/pg_net/schedule) в проекте нет вовсе → фоновые задачи не работают никогда |
| **BE-03** | Внутренние вызовы | `background-worker/index.ts:93-116` + `regenerate-image/index.ts:217-220` | Воркер вызывает `regenerate-image` через admin-клиент (service key), а обработчик требует `getAuthenticatedUser(req)` | Гарантированный 401: авто-генерация картинок не работает даже после снятия BE-02 |
| **BE-04 / SEC-02** | IDOR/Storage | `regenerate-image/index.ts:158-209, 285-339` | `processAndStoreImage(wordId)` делает `.update(...).eq("id", wordId)` без проверки владельца; `id` принимается из тела в `auto`/`finalize` | Любой авторизованный пользователь подменяет/удаляет изображение ЛЮБОГО слова (дефейс общего словаря), файл прежней картинки удаляется из Storage |
| **BE-05** | RLS/админ | `0001_initial_rls.sql:13-29, 159-177` | `is_admin()` читает `profiles.role`, но триггера создания `profiles` нет; клиент таблицу не использует | `is_admin()` всегда false → `get-feedback-reports`, `update-feedback-status` вечно 403; все admin-политики и Storage-admin мертвы (пока не создан профиль вручную) |
| **BE-06 / QA-03** | CI | `deploy.yml:43-50, 89-93` + `audit/logs/build.txt` | `deploy-functions` требует зелёный `test`, а `test` падает на `npm run check` (TS6133) и почти наверняка на `deno fmt --check` | Релиз Edge Functions заблокирован навсегда, пока не исправлен блокер сборки |
| **DAT-01** | Outbox/гонка | `src/core/sync.ts:139-175` | Слепок `updates` собирается до await'ов, затем `state.dirtyWordIds.clear()` очищает и ID, появившиеся во время отправки | Прогресс, полученный во время синка, никогда не уходит в облако (тихая потеря облачной копии) |
| **DAT-02** | Recovery | `src/app.ts:1596-1610` | Любой `SyntaxError` с «JSON»/«token» в `init()` → `localStorage.clear()` + reload, без подтверждения и без бэкапа | Полное стирание прогресса, dirty-ids, outbox и `safety_backup_v1`; `restoreLocalBackup()` нигде не вызывается |
| **DAT-03** | Квота | `src/core/db.ts:71-86, 875-890, 896-912` | Каждый `saveXxx` глушит исключение локально → внешний `catch` в `immediateSaveState` мёртв; полный словарь (`JSON.stringify(dataStore)`) пишется в localStorage на каждый дебаунс (300 мс) | При исчерпании квоты сохранения тихо не работают; пользователь узнаёт о потере только после reload |
| **LL-01** | SRS | `scheduler.ts:61-68, 134-135` + `db.ts:169-175` | Провал («Забыл»): `interval > 10` → `round(interval×0.2)` и `nextReview = now + 20 дней` при interval=100; в квизовом пути тот же grade 0 ставит `nextReview = now` | Забытое зрелое слово не возвращается 3 недели; две подсистемы ставят принципиально разные даты |
| **LL-02** | SRS | `scheduler.ts:41-56, 70` + `ui_review.ts:123-125` | Grade 4 недостижим: в UI только 5/3/0; все успехи идут через «easy» ×1.3, ветка `round(I×EF)` — мёртвый код | Интервалы систематически завышены ~30% (10 дн → 25 вместо 19), заявленный SM-2 не реализован |
| **F-01** | UX/фильтры | `src/html/partials/toolbar.html:97-103` + `src/ui/ui_filters.ts:182-193` | На кнопке одновременно inline `onclick="window.toggleFilterPanel()"` и `data-action="toggle-filter-panel"`; глобальный делегированный обработчик (`app.ts:399-413`) вызывает toggle второй раз | Панель фильтров не открывается никогда → недоступны сортировка, темы/категории, коллекции (целый блок функций) |
| **F-02** | UX/модалки | `src/app.ts:907-918` + `src/ui/ui_modal.ts:46-50` | Esc и focus-trap берут `document.querySelector(".modal.active")` — первое окно в DOM, а не верхнее в стеке | При стеке (квиз + объяснение/итоги) Esc закрывает `quiz-modal` → `quitQuiz(true)`: тренировка обрывается, верхнее окно висит, Tab уходит в невидимый фон |
| **QA-01** | Сборка | `src/app.ts:149` | Неиспользуемый `import { setSyncState }`; `noUnusedLocals` → TS6133 | `npm run check`, `npm run build` красные; CI стоит |
| **QA-02** | Линт | `src/core/network.ts:177`, `src/core/xp.ts:26` | Нет финального `\n` (2 prettier error) + 2 warning при `--max-warnings 0` (`app.ts:149`, `network.ts:104`) | `npm run lint` красный → CI красный |
| **QA-04** | Деплой фронта | `.github/workflows/deploy.yml:12-13` + ветка `gh-pages` | Нет job публикации; `gh-pages` — снапшот исходников от 2026-02-27 (121 файл, 80 из `src/`, 0 из `dist/`) | Прод-PWA не обновлялся 9 месяцев; опубликованный сайт грузит `/src/app.ts` (браузер не исполняет TS) → нерабочий |
| **QA-05** | Хостинг | `vite.config.ts:86` + `public/_redirects:1` | `base: "/"` при project page `/TOPIK-APP/`; `_redirects` — Netlify; `404.html` нет | Даже ручной деплой `dist` даст 404 на `/assets/*`; три модели хостинга конфликтуют |

---

## 6. Системные темы (сквозные выводы)

### 6.1 «Полузаконченный рефакторинг» — корень операционного кризиса
HEAD зелёный, worktree красный. Незакоммиченный вынос `network.ts`/`xp.ts` и разбиение `saveState` на 15 функций внёс: TS6133, prettier-ошибки, импорты в середине файла, дубль `measurePing`, потерю сохранения streak (L-01), подмену версии кэша (DAT-05). Правило: **незавершённый рефакторинг не должен висеть в main**; нужен `pre-commit` с `npm run check && npm run lint && npm run test:run`.

### 6.2 Бэкенд не воспроизводим
В репозитории нет DDL, seed, констрейнтов, триггеров, бакетов, RPC (`cleanup_user_progress` вызывается из `db.ts:428`, но не определён). RLS-миграция — качественный документ, но применяется к несуществующей в репо схеме. Без `supabase db pull --remote` + `seed.sql` + `supabase/config.toml [storage.buckets.*]` проект нельзя развернуть с нуля; 12+ P1-находок («есть ли UNIQUE для upsert», «обновляется ли `updated_at`», «добавлены ли таблицы в realtime-публикацию») остаются непроверяемыми.

### 6.3 RLS не совпадает с фичами и дырявый
- Эскалация до admin (SEC-01) и отсутствие провижининга `profiles` (BE-05) — две стороны одной дыры.
- `articles` используется фронтом (`ui_reading.ts:38-45`), но в миграции нет ни таблицы, ни RLS (BE-07/SEC-08).
- Лидерборд читает `user_global_stats` всех пользователей, а политика `own_all` пускает только свои строки → лидерборд показывает максимум себя (BE-08).
- Публичные списки (`is_public=true`) не видны другим из-за политики `user_lists` (BE-09).
- Любой authenticated может публиковать в общий словарь (`is_public` не ограничен) (SEC-03).
- Нет триггера `updated_at` → инкрементальный синхронизатор (`gt("updated_at", lastSync)`) не видит правок и soft-delete (BE-10).

### 6.4 Серверные и фоновые сценарии нерабочие
Cron (BE-02), внутренний вызов воркера (BE-03), админ-функции (BE-05), realtime-подписки без публикации таблиц (BE-22), кэш поиска картинок никогда не попадает (`insert` без `expires_at` при чтении с `gt("expires_at")`, BE-21), `retry-word-request` — no-op (`failed_step` нигде не пишется, BE-16), `delete-user` не чистит Storage/таблицы (BE-17). При этом Edge Functions написаны дисциплинированно: JWT-проверка во всех 12, ownership-проверки, валидация длины строк, SSRF-allowlist, 5xx не утекают — каркас хороший, но интеграция не доведена.

### 6.5 «Offline-first» — только чтение, запись теряет данные
- Outbox псевдо-durable: переигрываются только `dirtyWordIds`, `globalUpdates` — мёртвый JSON (DAT-04).
- Гонка `clear()` (DAT-01), неатомарные чанки без dead-letter (DAT-16), LWW по клиентским часам для всей статистики (DAT-08), слияние флагов только в одну сторону (`true` добавляется, снятие не передаётся — DAT-07), потеря офлайн-XP при merge уровней (DAT-09), `user_progress` без пагинации — тихий cap 1000 строк (DAT-10).
- Отсутствие персиста сессии: закрытие вкладки убивает текущую сессию (DAT-18).
- Смена аккаунта на устройстве: на `SIGNED_OUT` состояние не очищается (DAT-11) → следующий пользователь наследует чужой прогресс и заливает его в своё облако.
- PWA: `workbox.runtimeCaching` в `vite.config.ts` игнорируется в `injectManifest` (в свежем `sw.js` 0 вхождений `supabase-api-cache`/`html2canvas`); SWR словаря с `maxEntries: 1` и пагинированными URL «самоед»; BackgroundSync на все non-GET (включая refresh токена и AI-вызовы) даёт дубли/старые JWT; `PROCESS_DOWNLOAD_QUEUE` в SW не обрабатывается (мёртвая фича с тостом «Докачиваем файлы…»); `offline.html` практически недостижим, медиа не precache'ится.
- При этом precache 23 записи / 908.72 KiB покрывает все рантайм-чанки (проверено свежей сборкой), `fetchVocabulary` с `AbortController` и офлайн-проверкой до запроса — сделано аккуратно. Это offline-терпимость, но не offline-надёжность.

### 6.6 SRS и геймификация недостоверны
- Grade 4 недостижим, все успехи ×1.3 (LL-02); провал = soft-lapse 20% + 20 дней (LL-01).
- Квиз не двигает SM-2: `recordAttempt` обновляет sm2 только при ошибке и только если sm2 уже есть; правильный ответ — нет; история без `sm2` попадает в очередь как due-сейчас (LL-03).
- «Изучено» = один правильный ответ; слово может быть одновременно learned и mistake (LL-27).
- Фарм XP/монет: эссе (двойной клик), конструктор (повторная проверка), «Знаю→Сброс», `addXP` скрыто даёт монеты 1:1 + дневной вызов/mystery box повторно (LL-04/05/07/10).
- Двойной учёт сессий (`endQuiz` + `endSession`) и accuracy = lifetime (LL-06).
- `getTotalXP` без cap: level=1e9 из облака вешает вкладку у всех (LL-11/DoS).
- Ошибки микрофона штрафуются как неверный ответ (LL-08), поток `getUserMedia` может остаться включённым (LL-09).
- Тесты не ловят ничего из этого (см. §6.7).

### 6.7 Тесты-фикция
`session.test.ts` — 6/6 тестов без `await` (ассерты в `void import().then()` никогда не выполняются); `db.test.ts` — проверка `state.dirtyWordIds` как `Set`; `scheduler.test.ts` зависит от `Math.random` без мока; `sync.test.ts` отсутствует; Deno-тесты — только константы. Покрытие 1.87%, порогов нет, `environment: "node"` + ручные моки DOM. Иллюзия «P0/P1 закрыты» из README построена на этих тестах.

### 6.8 Архитектура: заявлено ≠ реально
- `GEMINI.md` требует «core без DOM», «никаких core→ui», «все UI — `BaseComponent`». Реально: **13 статических импортов core→ui** в `auth.ts`, `renderer.ts`, `stats.ts`, `pwa.ts`, `window_bindings.ts` + динамический в `network.ts`; **11 циклов импортов** (73 узла/41 ребро), включая `ui_card ↔ core/renderer`, задокументированный в коде как «Цикл безопасен»; **22 из 36** файлов `src/ui` не наследуют `BaseComponent`; в `core` 151 `document.*`, 41 `window.*`, 54 `showToast`, 33 `innerHTML`.
- Монолиты: `app.ts` 1 646 (89-case клик-роутер), `quiz.ts` 1 602 (21 module-level `let`), `stats.ts` 1 476 (XP+лиги+ачивки+7 Chart.js-рендеров+HTML модалки), `components.css` ~2 958.
- Дублирование: 8 функций с одинаковыми именами в ≥2 файлах (`getAccuracy` — байт-в-байт), 15 почти идентичных `saveXxx`, две реализации `measurePing`, два конкурирующих объявления `Window` (`types.d.ts` vs `types/global.d.ts`) с расходящимися сигнатурами.
- Типовая безопасность: 26 `as unknown as`, 12 `@ts-expect-error` (один и тот же хак `client.supabaseUrl/supabaseKey` повторён 3×), 2 `as any`.
- Мёртвый код: `src/ui/index.ts` (0 байт), `env.ts`, `ui_sync.ts`, 9 экспортов с единственной ссылкой, 15 747-й… — см. QA-25.

### 6.9 UI/HTML drift → мёртвые фичи
Перезапись `nav.innerHTML` в `app.ts:1321` убивает 3 фичи из партиала (Отчёты, `#srs-badge`, «Сообщить о проблеме»); `openTrashModal()`, `openReadingModal()`, `openStudyGoal` не вызываются; `#quiz-powerups`/`#quiz-combo` отсутствуют в разметке; `window.handleBulkAddToList` не назначен; `.mistake-chip` не существует; второй `#quotes-modal`. Итог: минимум **10 функций недоступны пользователю**, а разметка и JS живут в двух несинхронизированных мирах (QA-29/30, F-03…F-16, F-27/28/30/31).

### 6.10 Доступность (WCAG 2.1 AA) — системно ниже нормы
`role="dialog"` 9/34, `aria-modal` 6/34, focus-trap и Esc работают с нижним окном стека, `:focus-visible` нет у карточек, контраст в тёмной теме 1.92–2.72:1 (WCAG 1.4.3 fail), 10+ кликабельных `div` без клавиатуры, чекбоксы без доступных имён, нет `prefers-reduced-motion` при 24 бесконечных анимациях, нет `<h1>`, корейский текст без `lang="ko"`, динамика без `aria-live`, тач-цели 22×22.

### 6.11 Производительность
Стартовая нагрузка ≈205 kB gzip JS + 19.9 kB CSS; Chart.js (107 kB / 38 gzip) в первом экране, хотя нужен только в статистике («ленивый CDN»-блок мёртв); полный ре-рендер словаря на каждый ответ квиза; `saveDraft()` (JSON+localStorage) на каждый символ эссе; `localStorage.setItem` полного словаря на каждый дебаунс; форсированные reflow в цикле чипов фильтров; `new Image()/new Audio()` на кадр скролла; «скрытые» модалки перерисовываются по событиям.

### 6.12 Supply chain / секреты
33 уязвимости (15 high) при 607 пакетах; `vite` direct high; Maven-like unpinned actions; внешний JS (`html2canvas.hertzen.com`) без SRI; CSS шрифта с jsDelivr без SRI; иконка apple-touch с flaticon; живые Gemini/Pixabay/Supabase-secret ключи в `.env` внутри OneDrive-синхронизируемой папки (в git не утекли, в бандл не попадают — проверено), дубль `SUPABASE_SERVICE_KEY` (секрет + publishable, last-wins); имена env в коде/`.env`/`.env.example` расходятся (BE-20, SEC-07).

### 6.13 Документация и git-гигиена
README/GEMINI.md заявляют несуществующее (FSRS, structured logging, unit-тесты функций, durable outbox, закрытые P0/P1, Node 18+ при Vite 7). В HEAD трекаются `supabase/.temp/*` (project-ref, pooler-url, linked-project.json), `__pycache__/*.pyc`, корневой `index.ts` с текстом «You can delete this file», `settings.json`, `requirements.txt`. В истории git — 92.9 MB blob'ов, включая `node_modules` (esbuild.exe 9.9 MB, typescript.js 9.1 MB) и `log.txt` 5 MB; `git gc` не выполнялся (packs: 0); 9.74 MB mp3 в репозитории.

---

## 7. Доменные вердикты

### 7.1 Безопасность — 40 находок (P0×1, P1×9)
Каркас неплохой: JWT во всех 12 функциях, `getAuthenticatedUser` берёт id только из токена, ownership-проверки есть, `escapeHtml` применяется широко, SSRF-allowlist, 5xx не утекают, секреты не в клиентском бандле, у CI минимальные permissions. Но RLS-миграция в текущем виде — дырявая: эскалация до admin (SEC-01), публикация в общий словарь (SEC-03), не покрыты `articles`/лидерборд/публичные списки, нет провижининга profiles. IDOR в `regenerate-image` (SEC-02) — дефейс словаря. Нет CSP/security-заголовков + сессия в localStorage превращают любую XSS (F-15/U-04/SEC-28-цепочки) в захват аккаунта. Rate limiting отсутствует на платных API. Секреты лежат в OneDrive-папке в открытом виде. **Приоритет фиксов: SEC-01 → SEC-02/03/04 → SEC-05/06 → CSP/секреты.**

### 7.2 Данные/офлайн — 35 находок (P0×3, P1×13)
Offline-first реализован лишь как кэш чтения. Три P0 — прямые потери данных: гонка `clear()` (DAT-01), `localStorage.clear()` по любому «JSON»-SyntaxError (DAT-02), недостижимая обработка квоты + полный словарь в localStorage (DAT-03). Конфликты — LWW по клиентским часам, «воскрешение» флагов, потеря офлайн-XP, отсутствие персиста сессии, наследование чужого прогресса при смене аккаунта. Инкрементальный синк мёртв из-за двух версий кэша. Schema drift делает половину синка непроверяемой. **Правильный вектор: op-log outbox с idempotency keys + серверные merge-RPC (`increment/greatest`) + отказ от хранения всего словаря в localStorage.**

### 7.3 Учебная логика — 39 находок (P0×2, P1×9)
Заявленный SM-2/FSRS не реализован: EF-формула верна, но grade 4 недостижим, провал = 20 дней, FSRS отсутствует. SRS и квиз — две несвязанные подсистемы; «Изучено» = 1 ответ. Геймификация накручиваема 4+ способами; монеты начисляются дважды; сессии задваиваются; `getTotalXP` даёт DoS через облачный level; ошибки микрофона штрафуются; `toKorean` портит пробелы/латиницу. Тесты этого не ловят. **Вектор: единый `recordAnswer(wordId, grade, source)` → SM-2; явные 4 оценки; вклад квиза в SRS; идемпотентные награды; серверная валидация лидерборда.**

### 7.4 Фронтенд — 50 находок (P0×2, P1×14)
Два P0 — панель фильтров и стек модалок/Esc — ломают ключевой UX. Минимум 8 фич недоступны из-за рассинхрона HTML↔JS. A11y системно не дотягивает до AA (роли, фокус, контраст, клавиатура, motion, labels, lang). Производительность: Chart.js в первом экране, полный ре-рендер словаря на ответ, запись localStorage на символ, 36 мёртвых CSS-классов, ~1100–1250 строк дублей/мёртвого кода (~35–45 КБ). При этом базовая гигиена XSS хорошая: `escapeHtml` применяется в подавляющем большинстве шаблонов, confirm собирается через `textContent`; оставшиеся риски точечные и data-dependent. **Вектор: стек модалок → убрать двойной toggle → восстановить мёртвые точки входа → токены контраста/фокусные стили → вынести Chart.js в lazy → один источник правды для разметки.**

### 7.5 Бэкенд — 48 находок (P0×6, P1×16)
Худшая воспроизводимость в аудите: схема только в живой БД; RLS-файл без DDL; бакеты/триггеры/RPC/публикация — нигде. Фоновые сценарии (cron, worker→function, admin, realtime, картинки) системно нерабочие. IDOR — P0. AI/TTS/stock-API без лимитов и кэш-логика картинок не срабатывает. `delete-user` неполный (приватность/GDPR). Edge TTS через неофициальный WebSocket без `Sec-MS-GEC` — риск отказа озвучки. Env-имена устарели относительно формата ключей `sb_secret_/sb_publishable_`. **Вектор: `supabase db pull` → миграция DDL + seed + buckets; `verify_jwt=false` + `CRON_SECRET` для воркера; явный service-путь для внутренних вызовов; owner-check в image-функциях; rate limit на платные API; триггеры `profiles`/`updated_at`/каскады.**

### 7.6 Качество/архитектура/тулинг — 46 находок (P0×5, P1×17)
Пайплайн нефункционален целиком: сборка/линт красные, деплой функций заблокирован, деплоя фронта нет, модель хостинга сломана. Архитектурная дисциплина существует только в GEMINI.md: слои нарушены (13 core→ui + 11 циклов), ядро рисует DOM, 22/36 UI-модулей вне `BaseComponent`, 4 монолита. Тесты-фикция, покрытие 1.87%, порогов нет. Три конкурирующих `deno.json`, два конкурирующих `Window`-объявления, мёртвые deps (`node-fetch@2`, `imagescript`, `@google/generative-ai` с drift версий, дубли `workbox-*`). Docs вводят в заблуждение. Git-история раздута `node_modules`/`log.txt`. **Вектор: (1) зелёный check/lint/build; (2) Pages-deploy `dist` + base; (3) разорвать core→ui и цикл renderer↔ui_card, `dependency-cruiser` в CI; (4) переписать тесты + thresholds 40%; (5) синхронизировать docs; (6) `git filter-repo` + `git gc`; (7) удалить мёртвые deps, закрыть audit.**

---

## 8. P1 (79) — сводный реестр

| ID | Домен | Ссылка | Суть |
|---|---|---|---|
| SEC-02 | IDOR | `regenerate-image/index.ts:288-321,202-205` | Подмена картинки чужого слова |
| SEC-03 | RLS | `0001_initial_rls.sql:50-59` | Публикация произвольных public-слов |
| SEC-04 | XSS | `ui_mistakes.ts:155` | `${w.level}` без escape (stored XSS-цепочка) |
| SEC-05 | Rate limit | `process-word-request:118-127` и др. | Нет лимитов на AI/OCR/stock; лимит обходится удалением строк |
| SEC-06 | Конфиг | `config.toml:52-54` | `verify_jwt` vs `CRON_SECRET`; `CRON_SECRET` нет в `.env` |
| SEC-07 | Секреты | `.env:1-7` | Живые service-role/Gemini/Pixabay в OneDrive; дубль ключа |
| SEC-08 | RLS | `ui_reading.ts:38-41` | `articles` без RLS в репо |
| SEC-09 | CSP | `index.html:31-391,394-427` | Нет CSP/заголовков, inline script/style, сессия в localStorage |
| SEC-10 | Supply chain | `ui_feedback.ts:165-176` | html2canvas/CDN без SRI |
| BE-07 | RLS/схема | `0001_initial_rls.sql` (нет `articles`) | Таблица чтения вне миграции |
| BE-08 | RLS | `…:141-146` + `ui_leaderboard.ts:131-141` | Лидерборд видит только себя |
| BE-09 | RLS | `…:106-111` + `ui_collections.ts:26-28` | Публичные списки невидимы |
| BE-10 | БД/синк | нет триггера `updated_at` | Правки/soft-delete не видны инкрементальному синку |
| BE-11 | БД/upsert | `sync.ts:132-134,165-167` | Нет UNIQUE-констрейнтов для `onConflict` |
| BE-12 | RPC | `db.ts:428` | `cleanup_user_progress` отсутствует в SQL |
| BE-13 | Стоимость | `process-word-request:118-127` | Обходимый лимит; платные функции без лимитов |
| BE-14 | Гонки | `process-word-request:163-179,221-230` | Неатомарная проверка дубликатов |
| BE-15 | Целостность | `process-word-request:256-271,277-285` | Partial-upsert логируется, заявка = processed |
| BE-16 | Ретраи | `retry-word-request:44-107` | `failed_step` не пишется; `pending` никто не обрабатывает |
| BE-17 | delete-user | `delete-user:21-37` + `auth.ts:729-751` | Storage/таблицы не чистятся |
| BE-18 | Storage | `…:213-296`, config | Политики есть, создания бакетов нет |
| BE-19 | TTS | `_shared/tts.ts:20-50` | Edge TTS без `Sec-MS-GEC` — риск отказа аудио |
| BE-20 | Env | `_shared/clients.ts:38-55` | Старые имена ключей vs новые `sb_secret_*` |
| BE-21 | Кэш | `regenerate-image:236-250,271-281` | Кэш картинок никогда не попадает |
| BE-22 | Realtime | нет `ALTER PUBLICATION` | Подписки UI не получают события |
| DAT-04 | Outbox | `sync.ts:56-73,173-189` | Псевдо-durable outbox |
| DAT-05 | Версии кэша | `db.ts:11,291-292,867-873` | `10` vs `v1.1` → full-sync каждый старт |
| DAT-06 | Merge | `db.ts:600-611` | Потеря серверных флагов |
| DAT-07 | Томбстоуны | `db.ts:609-611`; `sync.ts:143-158` | «Воскрешение» снятых флагов |
| DAT-08 | LWW | `sync.ts:113-134` | Затирание XP/coins/league/sessions |
| DAT-09 | Merge XP | `db.ts:442-449` | Офлайн-XP теряется при merge уровней |
| DAT-10 | Пагинация | `db.ts:587-598` | Silent cap 1000 строк `user_progress` |
| DAT-11 | Аккаунты | `app.ts:1399-1421`; `auth.ts:18-42` | При logout состояние не очищается |
| DAT-12 | Импорт | `ui_data.ts:236-251,296-304` | Импорт без валидации → данные не сохраняются |
| DAT-13 | Чистка ID | `db.ts:91-115,186-233` | Удаление прогресса для слов вне текущего словаря |
| DAT-14 | Schema drift | `sync.ts:113-136` | Колонки/констрейнты не версионируются |
| DAT-15 | IDB | `storage_idb.ts:10-61` | Соединения не закрываются; нет `onblocked` |
| DAT-16 | Баты | `sync.ts:161-171` | Нет dead-letter, чанк падает навсегда |
| **L-01** | Streak | `db.ts:896-911` | **`saveAllState()` не сохраняет `STREAK`/`DB_VERSION` → серия теряется при reload** |
| LL-03 | SRS↔Quiz | `db.ts:162-184` и др. | Правильные ответы не двигают SM-2 |
| LL-04 | Фарм | `quiz_strategies.ts:371-378` | Двойной клик «Верно» в эссе |
| LL-05 | Фарм | `quiz_strategies.ts:567-577,613-648` | Re-check в конструкторе |
| LL-06 | Сессии | `quiz.ts:1133-1143`; `session.ts:64-87` | Двойной учёт, accuracy = lifetime |
| LL-07 | Экономика | `stats.ts:96-100` и др. | Двойные монеты |
| LL-08 | Speech | `speech.ts:271-281` | Ошибка микрофона = неверный ответ |
| LL-09 | Приватность | `speech.ts:79-93,155-163,283-295` | Утечка микрофона/гонки |
| LL-10 | Фарм | `ui_card.ts:634-648,682-690` | «Знаю→Сброс» = неограниченные награды |
| LL-11 | DoS | `xp.ts:20-26`; `ui_leaderboard.ts:242-247` | `getTotalXP` без cap |
| F-03 | UI | `ui_feedback.ts:232-241` | JS-код вклеен в HTML-шаблон |
| F-04 | UI | `app.ts:1321-1352`; `bottom_nav.html:106` | Форма обратной связи недоступна |
| F-05 | UI | `ui_trash.ts:132-134` | Корзина пуста (openTrashModal не вызывается) |
| F-06 | UI | `quiz.ts:1207-1210`; `quiz.html:56-71` | Бонусы квиза неприменимы |
| F-07 | UI | `ui_bulk.ts:396` | `window.handleBulkAddToList` не существует |
| F-08 | UI | `quiz_strategies.ts:478-482` | Кнопка 🔊 теряет обработчик |
| F-09 | A11y | `quiz.css:455-476` и др. | Контраст тёмной темы 1.92–2.72:1 |
| F-10 | A11y | `renderer.ts:62-71` | Карточки без focus-стиля/роли |
| F-11 | A11y | 34 модалки | `role="dialog"` 9/34, `aria-modal` 6/34 |
| F-12 | A11y | `auth.html:271-283…` | Чекбоксы без доступных имён |
| F-13 | A11y | `auth.html:535-557…` | Кликабельные `div` без клавиатуры |
| F-14 | UI | `bottom_nav.html:84,106`; `app.ts:1321-1352` | Потеряны `#srs-badge` и «Отчёты» |
| F-15 | XSS | `app.ts:1037-1052` | Цитаты из БД без escape |
| F-16 | UI | `ui_reading.ts:160-162` | «Чтение» недоступно |
| QA-06 | Архитектура | `auth.ts:6-8` и др. | 13 импортов core→ui |
| QA-07 | Архитектура | `ui_card.ts:6` ↔ `renderer.ts:5-15` | 11 циклов импортов |
| QA-08 | Архитектура | `quiz.ts:1-40` и др. | 22/36 UI вне `BaseComponent` |
| QA-09 | Архитектура | `stats.ts:632-1475` | DOM в core (151 `document.*`) |
| QA-10 | Монолит | `app.ts:399-811` | 1 646 строк, 89-case роутер |
| QA-11 | Монолит | `stats.ts` 1 476 | Смешение логики/рендера/графиков |
| QA-12 | Монолит | `quiz.ts` 1 602 | 21 module-level `let`, god-файл |
| QA-13 | Дубли | 5 пар | 8 функций-дублей, `getAccuracy` байт-в-байт |
| QA-14 | Дубли | `db.ts:744-911` | 15 `saveXxx` копипастой |
| QA-15 | Рефакторинг | `app.ts:142-149,1099-1104` | Импорты в середине, 2× `measurePing` |
| QA-16 | Тесты | `session.test.ts:28-90`; `db.test.ts:62-77` | Фиктивные тесты |
| QA-17 | Тесты | `check-essay.test.ts:8-19` и др. | Deno-тесты только констант |
| QA-18 | Docs | `README.md:220-240` и др. | Заявления не соответствуют коду |
| QA-19 | CI | `deploy.yml:25…98` | Unpinned actions, нет audit/prettier-check |
| QA-20 | Git | `.gitignore:1-5`; `.git` | `.temp`/`__pycache__` в HEAD, 92.9 MB blob'ов |
| QA-21 | Deps | `package.json:38-49` | Мёртвые/дублирующиеся зависимости |
| QA-22 | tsconfig | `tsconfig.json:8,20-25` | Конфиги не типизируются, слабая строгость |

---

## 9. Документация vs реальность

| Заявление | Реальность | Вердикт |
|---|---|---|
| README:221 «P0 закрыто: RLS применена, схема сверена» | В репо только RLS-политики, без DDL; применить нечего | ✗ |
| README:222 «Покрыть ядро тестами (db, stats, session, sync)» | `db.ts` 0%, `sync.ts` 0%, `session.ts` 0%; тесты фиктивны | ✗ |
| README:226 «unit-тесты Edge Functions (check-essay, regenerate-image)» | Тесты проверяют только `_shared/constants.ts` | ✗ |
| README:230 «Структурированное логирование в Edge Functions» | Строковые `console.log/error` | ✗ |
| README:43 «SM-2/FSRS» | SM-2-вариант без grade 4; FSRS — 0 упоминаний в коде | ✗ |
| README:185 «durable outbox» | Outbox без replay, backoff, TTL; теряет ID при гонке | ✗ |
| README:182 «23 записи в precache» | Подтверждено свежей сборкой: 23 entries, 908.72 KiB | ✓ |
| README:248 «CORS с явными методами» | `corsHeaders` общий, методы/заголовки — надо проверять по `_shared/constants.ts` | ~ |
| README:246 «Все Edge Functions требуют валидный JWT (`verify_jwt=true`)» | В config — да; но у `background-worker` это ломает cron | ~ |
| README:250 «Секретные ключи не попадают в клиентский бандл» | Проверено статически: попадают только `VITE_*` через `import.meta.env`/`define` | ✓ |
| README:78 «Node.js v18+» | Vite 7 требует `^20.19 \|\| >=22.12`; локально Node 24.13 | ✗ |
| GEMINI.md:101/122/136 «core без DOM, без core→ui, все UI — BaseComponent» | 13 core→ui, 151 `document.*` в core, 22/36 UI вне BaseComponent | ✗ |
| GEMINI.md:57-92 (пример кода) | Code fence сломан, заголовки внутри блока | ✗ |
| «PWA offline-first» | Offline-чтение работает; запись/синхронизация теряют данные; медиа не кэшируется | ~ |

---

## 10. Дорожная карта

### Волна 0 — «разблокировать» (0.5–1 день)
1. Убрать `import { setSyncState }` и осиротевшие JSDoc из `app.ts:142-149`.
2. `prettier --write src/core/network.ts src/core/xp.ts`; убрать `console.log` из `network.ts:104` (или заменить на `console.info`).
3. Восстановить сохранение `STREAK`/`DB_VERSION` в `saveAllState()` (L-01) и сверить список ключей с HEAD-версией.
4. Решить судьбу незакоммиченных изменений: закоммитить завершённое или откатить; dist пересобрать.
5. Прогнать `npm run check && npm run lint && npx vitest run && npm run build`; зафиксировать как «golden».
**Критерий: 4 команды зелёные, HEAD + worktree синхронны.**

### Волна 1 — «безопасность и инфраструктура» (2–4 дня)
1. RLS `profiles`: запретить INSERT/UPDATE колонки `role` для не-админа (триггер или column-level grant + отдельная admin-only политика); добавить триггер создания `profiles` для `auth.users`; завести bootstrap первого админа.
2. IDOR `regenerate-image`: перед `update` проверять владельца/`is_public`-политику; `mode=auto/finalize` — только service-путь; не удалять чужой файл.
3. `vocabulary`: `WITH CHECK (is_public IS NOT TRUE …)` для пользовательских INSERT/UPDATE или модерация + очередь.
4. `background-worker`: `verify_jwt=false` + строгая проверка `CRON_SECRET`; добавить планировщик (pg_cron/pg_net) и передавать корректный JWT во внутренние вызовы; исправить `regenerate-image` для service-вызовов.
5. `supabase db pull --remote` → миграция DDL (таблицы/типы/FK/UNIQUE/индексы/триггеры `updated_at`/публикации realtime) + `seed.sql` + `[storage.buckets.*]` в config; `delete-user` каскады.
6. Rate limiting на `generate-word-data`/`check-essay`/`ocr-image`/`regenerate-image` (per-user таблица квот), исправить off-by-one и обход лимита.
7. Ротация живых ключей, вынести `.env` из OneDrive, вычистить дубликат, синхронизировать имена env (BE-20).
**Критерий: P0 безопасности закрыты, схема воспроизводима с нуля, cron работает.**

### Волна 2 — «данные и обучение» (1.5–2 недели)
1. Outbox: журнал операций `{op, payload, ts, idempotencyKey}` + replay на старте/online + backoff + dead-letter; удалять только реально отправленные ID (DAT-01).
2. `localStorage.clear()` → точечное удаление битого ключа + восстановление из `safety_backup_v1` (DAT-02); единая обёртка записи с обработкой квоты (DAT-03); словарь — только IDB (DAT-05/QA-14).
3. Серверные merge-RPC для `user_global_stats` (`greatest`/`increment`, `updated_at` — серверное время), полевой merge флагов, томбстоуны (DAT-06..09); пагинация `user_progress` (DAT-10); очистка состояния при logout и смене аккаунта (DAT-11).
4. SRS: единый `recordAnswer(wordId, grade, source)`; 4 оценки (Again/Hard/Good/Easy); провал = 1 день; вклад квиза/карточек/аудирования; очередь без «due-сейчас» для истории без sm2 (LL-01..03, LL-16, LL-24, LL-27).
5. Геймификация: идемпотентные награды (1 раз за слово/вопрос), отдельный `addCoins`, guard `answered`, cap `getTotalXP`/уровня, серверная валидация рекордов/лидерборда (LL-04..07, LL-10, LL-11).
6. Speech: технические ошибки ≠ неверный ответ; всегда `stream.getTracks().stop()` в `finally`; отмена при закрытии модалки (LL-08/09).
7. UI-регрессии: убрать двойной toggle фильтров (F-01), стек модалок для Esc/focus-trap (F-02), восстановить точки входа trash/reading/feedback/study/powerups/bulk (F-03..F-08, F-14..F-16).
**Критерий: нет сценариев с тихой потерей данных; SRS-интервалы соответствуют алгоритму; фарм экономики невозможен.**

### Волна 3 — «качество и процесс» (2–4 недели)
1. Деплой фронта: GitHub Pages Actions `upload-pages-artifact`/`deploy-pages`, `base: "/TOPIK-APP/"` (или custom domain/Netlify), `404.html`, убрать `_redirects`; публиковать только `dist`.
2. Тесты: переписать фиктивные (async/await, jsdom, мок `Math.random`), добавить тесты на sync/outbox/SRS/XP/квиз; `coverage.thresholds` (lines 40+, критичные модули 60+).
3. Архитектура: разорвать `core→ui` через `notify()`-подписчиков; цикл `renderer↔ui_card`; `BaseComponent` для экранов или явный lifecycle; разбить `app.ts`/`stats.ts`/`quiz.ts`; удалить дубли/мёртвый код; `dependency-cruiser` + `knip` в CI.
4. A11y: `role="dialog"/aria-modal/aria-labelledby` всем модалкам, `:focus-visible`, токены контраста, `prefers-reduced-motion`, labels, `lang="ko"`, `aria-live`, тач-цели 24–44 px.
5. Безопасность: CSP с nonce/hash (после выноса inline script/style), SRI/self-host для CDN-ассетов, security-заголовки, `no-alert`, убрать `window.*`-поверхность.
6. Процесс: pin actions по SHA, `npm audit --audit-level=high`, `prettier --check`, `deno fmt/lint` зелёные, husky+lint-staged, Dependabot, LICENSE/CHANGELOG/CONTRIBUTING/engines.
7. Git: `git rm --cached` `.temp`/`__pycache__`, расширить `.gitignore`, `git filter-repo` (node_modules/log.txt), `git gc --aggressive`; mp3 — в Storage/CDN.
**Критерий: релиз-процесс = push → зелёный CI → автодеплой фронта и функций; тесты имеют вес; архитектурные правила проверяются автоматически.**

---

## 11. Что обязательно проверить в живом окружении

Без этого аудит остаётся статическим, а часть выводов — гипотезами:
1. `pg_policies`, `pg_trigger`, `pg_proc`: реальные политики на `vocabulary`/`user_global_stats`/`user_lists`/`articles`/`storage.objects`, наличие `is_admin()` и триггеров `profiles`/`updated_at`, наличие `cleanup_user_progress`.
2. Существует ли таблица `articles`; пуста ли она; включён ли RLS.
3. Флаги публичности бакетов `audio-files`/`image-files`/`feedback_attachments`; размеры/лимиты.
4. Фактические `verify_jwt` у функций и способ вызова `background-worker`; есть ли cron-задание вне репозитория.
5. Формат ключей проекта (`sb_publishable_*`/`sb_secret_*`) и совместимость с кодом (`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`).
6. Настройки Auth: подтверждение e-mail, TTL сессии/refresh, MFA, лимиты; политика удаления данных.
7. Реальная схема `user_global_stats`/`user_progress` (типы, UNIQUE для upsert, `updated_at`-триггеры, каскады).
8. Realtime-публикация таблиц.
9. Gemini/Edge TTS живы ли (версии моделей, `Sec-MS-GEC`, лимиты) — риск отказа озвучки/эссе.
10. Браузерный smoke-тест 20 базовых сценариев (фильтры, квиз, стек модалок, корзина, чтение, бонусы, bulk, офлайн-перезагрузка, смена аккаунта) — 3–4 часа ручного прогона ловят большинство F-находок.

---

## 12. Ограничения аудита

- Аудит **статический**: приложение не запускалось в браузере (нет devtools/Lighthouse/perf-профилей), поэтому производительность и часть UX-выводов — по коду и сборке, а не по замерам.
- **Deno локально отсутствует** — `deno check/fmt/lint/test` не запускались; выводы о Deno-CI статические.
- **Нет доступа к живому Supabase/дашборду/секретам** — RLS-риски (особенно SEC-01, BE-05/07/08/10/11/22) требуют подтверждения introspection'ом.
- Внешние API (Gemini, Edge TTS, Pixabay/Pexels/Unsplash) не вызывались.
- Не выполнялся динамический security-тест (активные PoC) и не проверялись настройки хостинга/DNS.
- `npm audit` — срез на дату аудита; advisories меняются.
- Часть находок по формулировке «вероятно/теоретически» помечена в отчётах как таковая; жёстких ложных срабатываний не выявлено при выборочной верификации Lead (проверены: SEC-01, SEC-02, DAT-01/02/03, LL-01/02/03, F-01/02/05/06/07/15, BE-02/03/04, QA-01/02/04/05 — подтверждены).
- Песочница DSH блокирует дочерние процессы esbuild (`spawn EPERM`): эталонные vitest/vite-прогоны выполнены однократно с расширенными правами и записаны в `audit/logs/`.

---

## 13. Воспроизводимость

```powershell
# из корня проекта
npx tsc --noEmit                                   # → exit 2 (TS6133 app.ts:149)
npx eslint . --report-unused-disable-directives --max-warnings 0   # → exit 1
npx vitest run                                     # → 29/29 passed
npx vitest run --coverage --coverage.reportsDirectory=audit/coverage  # → 1.87%
npx vite build --outDir audit/build-out --emptyOutDir                 # → success
npm run build                                      # → exit 2 (падает на tsc)
npm audit --json                                   # → 33 vulnerabilities
# эталон HEAD: git archive --format=zip -o audit/head.zip HEAD; Expand-Archive → audit/head-check
npx tsc -p audit/head-check/tsconfig.json --noEmit # → exit 0
```

## 14. Последнее слово

Проект находится в точке «богатый прототип → продукт»: контент, режимы, вёрстка и каркас Edge Functions уже есть, но между заявленным и фактическим — пропасть в инфраструктуре и дисциплине. Хорошая новость: большинство P0 чинится за дни (импорт, prettier, RLS-политика, verify_jwt, одна ветка `getAuthenticatedUser`), а не за месяцы. Плохая: без волны 2 (данные + SRS) продукт будет «красиво терять прогресс» и «честно накручивать XP», что для учебного приложения — репутационный приговор. Рекомендуемый порядок — строго волны 0 → 1 → 2 → 3; каждая волна имеет измеримый критерий готовности.
