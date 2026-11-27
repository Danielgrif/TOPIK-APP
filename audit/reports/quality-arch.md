# ГИПЕР-КРИТИЧНЫЙ АУДИТ: качество кода, архитектура, инженерия процессов

**Проект:** TOPIK II Master Pro (`Danielgrif/TOPIK-APP`)
**Дата аудита:** 2026-11-22
**Commit:** `cc7f833` — «P0+P1 fixes: RLS, outbox sync, session pause/resume, XSS fixes, PWA offline, Edge Functions verify_jwt, ocr-image, update-feedback-status» (main)
**Рабочее дерево:** грязное — 9 modified (`package-lock.json`, `src/app.ts`, `src/core/db.ts`, `pwa.ts`, `stats.ts`, `stats.test.ts`, `sync.ts`, `ui_leaderboard.ts`, `ui_share.ts`, `generate-word-data/deno.json`), 2 untracked (`src/core/network.ts`, `src/core/xp.ts`), 6 deleted-but-not-committed; ветка `gh-pages` отстаёт от main на 18 коммитов и последний раз обновлялась 2026-02-27.

**Эталонные прогоны (logs от Lead):** `audit/logs/tsc.txt` — 1 ошибка; `audit/logs/lint.txt` — 4 проблемы (2 error, 2 warning); `audit/logs/build.txt` — build падает на `tsc`; `audit/logs/test.txt` — vitest не стартовал в песочнице (`spawn EPERM`, ограничение окружения, не проект).

---

## 0. Что прочитано (полный список)

**Конфиги и процессы (полностью):** `package.json`, `package-lock.json` (структурный разбор через node + diff), `tsconfig.json`, `vite.config.ts`, `eslint.config.ts`, `.prettierrc`, `deno.json`, `supabase/functions/deno.json`, `supabase/functions/generate-word-data/deno.json`, `supabase/config.toml`, `.gitignore`, `.gitattributes`, `.env.example` (значения не печатались), `.vscode/settings.json`, `.github/workflows/deploy.yml`, `public/_redirects`, `index.html`, `README.md`, `GEMINI.md`, `audit/logs/{tsc,lint,test,build}.txt`, `supabase/migrations/0001_initial_rls.sql` (первые 70 строк + грепом все политики/таблицы, всего 301 строка).

**Исходники (полностью):** `src/app.ts` (1647), `src/core/network.ts`, `src/core/xp.ts`, `src/core/sync.ts`, `src/core/db.ts` (913), `src/core/stats.ts` (1476), `src/core/supabaseClient.ts`, `src/core/window_bindings.ts`, `src/core/pwa.ts`, `src/core/session.ts`, `src/core/constants.ts`, `src/core/env.ts`, `src/core/stats.test.ts`, `src/core/db.test.ts`, `src/core/session.test.ts`, `src/core/scheduler.test.ts`, `src/test-setup.ts`, `src/sw.ts`, `src/types/index.ts`, `src/types/global.d.ts`, `src/types.d.ts`, `src/ui/BaseComponent.ts`, `src/ui/component_loader.ts`, `src/ui/ui.ts` (избранно, 1–263), `src/ui/ui_hanja.ts`, `src/ui/ui_grammar.ts`, `supabase/functions/check-essay.test.ts`, `supabase/functions/ocr-image.test.ts`, `supabase/functions/regenerate-image.test.ts`, `supabase/functions/_shared/constants.ts` (1–60 + грепы), `supabase/functions/_shared/utils.ts` (20–89).

**Исходники (частично / точечные чтения фрагментов):** `src/core/state.ts` (1–45 + грепы), `src/core/renderer.ts` (1–25, 22–40 + грепы), `src/core/auth.ts` (грепы + строки 46–50), `src/ui/ui_card.ts` (1–20, 403, 628–632), `src/ui/quiz.ts` (1–40 + список функций), `src/ui/quiz_strategies.ts` (1–60), `src/ui/ui_writing.ts` (грепы), прочие `src/ui/*`, `src/core/*` — метрики через Select-String/grep.

**Артефакты сборки (read-only):** `dist/*` (листинг, размеры, даты), `dist/sw.js` (манифест precache), `dist/index.html` (ссылки на ассеты), `dist/assets/*` (размеры).

**Git (только read-only):** `git status`, `git log`, `git ls-files`, `git ls-tree`, `git show`, `git rev-list`, `git cat-file`, `git count-objects`, `git check-ignore`, `git diff --stat`.

---

## 1. Вердикт (зрелость проекта)

Проект производит впечатление **поздней стадии любительской/соло-разработки с сильным «AI-сгенерированным» слоем документации**: README и GEMINI.md декларируют дисциплину (слои, BaseComponent, отсутствие циклов, «P0/P1 закрыты»), которую код системно нарушает — 13 импортов `core → ui`, 11 циклических зависимостей, 151 обращение к `document` в `core/`, 20 реальных UI-модулей без `BaseComponent`. **Сборка и линт сломаны прямо сейчас** (TS6133 в `app.ts:149` и prettier-ошибки в двух новых файлах), что делает CI красным и **полностью блокирует деплой Edge Functions** из-за `needs: test`; фронтенд при этом не деплоится вообще, а опубликованная `gh-pages` — это снапшот исходников от февраля 2026 с `<script src="/src/app.ts">`, т.е. заведомо нерабочий сайт. Инженерные процессы на нуле: нет pre-commit, нет независимого typecheck-конфига, нет порогов покрытия, нет SHA-пиннинга actions, нет `prettier --check`/`npm audit`, а половина тестов — фикция (6 тестов `session.test.ts` не проверяют ничего, т.к. ассерты внутри не ждущегося `import().then()`; 6 Deno-тестов проверяют только константы). При этом **отдельные сильные элементы есть**: 301-строчная RLS-миграция с `SECURITY DEFINER is_admin()` и storage-политиками, качественный `_shared/utils.ts` (5xx не утекают клиенту), durable outbox в `sync.ts`, валидный precache-манифест на 23 записи и реальные тесты SM-2. Итоговая оценка: **2/10 по процессам и архитектуре, 5/10 по отдельным модулям; проект не готов ни к релизу, ни к передаче другому разработчику.**

---

## 2. Сводная таблица находок (46)

Severity: **P0** — сборка/CI/деплой сломаны; **P1** — серьёзные архитектурные/процессные проблемы; **P2** — качество; **P3** — нитрик.

| ID | Severity | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| QA-01 | P0 | Сборка | `src/app.ts:149` | Неиспользуемый `import { setSyncState }` после рефакторинга в `core/network.ts`; `noUnusedLocals` → TS6133 | `npm run check`/`build` падают; CI красный; артефакт не собирается | Удалить строку 149 и «осиротевшие» комментарии 142–148 (импорт уже есть в `network.ts:4`) |
| QA-02 | P0 | Линт | `src/core/network.ts:177`, `src/core/xp.ts:26` | Prettier: отсутствует финальный `\n` в новых файлах (2 error); + 2 warning при `--max-warnings 0` | `npm run lint` падает → CI красный | `prettier --write` на файлах; убрать `console.log` (`network.ts:104`); устранить unused import |
| QA-03 | P0 | CI | `.github/workflows/deploy.yml:43-53,89-93` | Джоба `test` запускает `check`→`lint`→`build`; деплой функций `needs: test` | Пока QA-01/02 не исправлены, деплой Edge Functions не выполнится никогда | Починить проверки; разделить lint/typecheck/unit jobs для быстрой локализации |
| QA-04 | P0 | Деплой | `.github/workflows/deploy.yml:12-13`; ветка `gh-pages` | Фронтенд не деплоится: джобы публикации нет, `permissions: contents: read`, `deploy`-скрипт только локальный (`package.json:10`); `gh-pages` — снапшот исходников от 2026-02-27 | Прод-PWA не обновлялся 9 месяцев; опубликованный сайт грузит `/src/app.ts` (браузер не исполняет TS) → нерабочий | Добавить `pages` job (`upload-pages-artifact`+`deploy-pages`), `permissions: pages:write,id-token:write`, деплой `dist` |
| QA-05 | P0 | Хостинг | `vite.config.ts:86`; `public/_redirects:1` | `base: "/"` + project-page URL `https://danielgrif.github.io/TOPIK-APP/` → `/assets/*` даст 404; `_redirects` — Netlify-механизм, на GitHub Pages мёртв; нет `404.html` | Даже ручной деплой `dist` даст сломанные ассеты/роутинг | `base: "/TOPIK-APP/"` (или custom domain) + единая модель хостинга; удалить `_redirects` или перейти на Netlify |
| QA-06 | P1 | Архитектура | `src/core/auth.ts:6-8`, `renderer.ts:14-15`, `stats.ts:3`, `pwa.ts:8`, `window_bindings.ts:4,42,45`; `network.ts:86` | Слой `core` статически импортирует `ui` (13 импортов в 5 файлах) + динамический `import("../ui/ui_retry.ts")`. Нарушение GEMINI.md:101 и :136 | Ядро нельзя тестировать без DOM; циклы; «UI→Core→State→Notify→UI» не выполняется | Вынести UI-реакции в подписчиков `notify()`, инверсия зависимостей: core публикует события, ui подписывается |
| QA-07 | P1 | Архитектура | `src/ui/ui_card.ts:6` ↔ `src/core/renderer.ts:5-15`; ещё 10 циклов | Реальный цикл `core/renderer ↔ ui/ui_card`, задокументированный как «Цикл безопасен»; всего 11 циклов (73 узла/41 ребро) | Порядок инициализации/TDZ, дублирование модулей в бандле, блокировка tree-shaking | Разорвать: перенести карточные хелперы в `core/renderer`, callbacks через события; ввести `dependency-cruiser --validate` в CI |
| QA-08 | P1 | Архитектура | `src/ui/quiz.ts:1-40` (и др.) | 22 из 36 файлов `src/ui/` не наследуют `BaseComponent`: `quiz.ts` (1603), `ui_card.ts`, `ui_custom_words.ts`, `ui_bulk.ts`, `ui_edit_word.ts`, `ui_modal.ts`… Нарушение GEMINI.md:44 | Ручные `addEventListener`/`subscribe` без `destroy()` → утечки; инициализация вне `BaseComponent.initAll()` | Обернуть экраны/модалки в классы-наследники `BaseComponent`; запретить `document.addEventListener` вне базового класса (ESLint-правило) |
| QA-09 | P1 | Архитектура | `src/core/stats.ts:632-1475`, `auth.ts` (DOM) | `core` — не «без DOM»: 151 `document.*`, 41 `window.*`, 54 `showToast()`, 33 `innerHTML` в `core/`. `stats.ts` строит модалку званий в HTML-строке (1389–1475). Нарушение GEMINI.md:122 | Ядро не покрывается node-тестами; логика и разметка сцеплены | Разделить `stats-logic.ts` (чистые функции) и `stats-view.ts` (рендер); запретить `document` в `core` ESLint `no-restricted-globals` |
| QA-10 | P1 | Монолит | `src/app.ts:399-811` | 1647 строк: глобальный клик-роутер на **89 case** (399–811), inline-навигация 1321–1352, HTML welcome-экрана 1024–1092, realtime 1106–1244, init 1246–1588 | Любая правка UI идёт через один файл; конфликты, страх рефакторинга | Разбить на `routing/actions.ts`, `welcome.ts`, `realtime.ts`, `bootstrap.ts`; таблица `action → handler` вместо switch |
| QA-11 | P1 | Монолит | `src/core/stats.ts` (1476) | Смешаны XP/лиги/ачивки/кэш + 7 Chart.js-рендеров + модалка ролей; 60+ экспортов; мёртвый код 290–297 | Невозможно менять геймификацию без регрессий; тестируется только часть | Разрезать: `xp.ts` (уже есть), `leagues.ts`, `achievements.ts`, `stats-charts.ts`, `stats-view.ts` |
| QA-12 | P1 | Монолит | `src/ui/quiz.ts` (1603), `quiz_strategies.ts` (1109) | Один модуль — 30 функций, 21 module-level `let` (19–40), весь quiz-flow, daily, powerups, summary; стратегии в отдельном god-файле | Утечки состояния между режимами; невозможность unit-тестов | Класс `QuizSession` + стратегии как объекты; вынести powerups/streak/summary |
| QA-13 | P1 | Дублирование | `renderer.ts:22-26` vs `ui_card.ts:628-632`; `app.ts:277` vs `network.ts:121`; `db.ts:711` vs `network.ts:29`; `ui.ts:237` vs `network.ts:160`; `sync.ts:9` vs `ui_sync.ts:7` | 8 функций с одинаковыми именами в ≥2 файлах; `getAccuracy` — байт-в-байт копия; `updatePingIndicator` дублируется с **разными CSS-классами** (`good/medium/bad` vs `good/warning/error`) | Правка в одном месте не доезжает до другого; скрытые визуальные баги; рост бандла | Оставить по одной реализации в `core`/`utils`, удалить дубли; CI-детектор копипасты (jscpd) |
| QA-14 | P1 | Дублирование | `src/core/db.ts:744-911` | 15 почти идентичных `saveXxx()` (try/catch/console.error) + `saveAllState()` (896–911); `saveVocabCache` (876–889) пишет словарь и в IDB, и в localStorage | 170 строк копипасты; двойная запись → риск `QuotaExceededError` | Один generic `persist(key, value)`; localStorage-фолбэк только при IDB-ошибке |
| QA-15 | P1 | Рефакторинг | `src/app.ts:142-149,1099-1104` | Импорты в середине файла (149, 1099, 1104), осиротевшие JSDoc-комментарии 142–148, две реализации `measurePing` (app.ts:277 и network.ts:121), локально используется только первая | Хаос в зависимостях, мёртвый экспорт `measurePing`, шум для ревью | Собрать все импорты в шапку; удалить нетронутые дубли; включить `import/first` |
| QA-16 | P1 | Тесты | `src/core/session.test.ts:28-90`; `db.test.ts:62-77` | 6 из 6 тестов `session.test.ts` — ассерты внутри `void import(...).then(...)` без `await` → тест завершается раньше ассертов (всегда «зелёный»); `db.test.ts` проверяет `Set.add/has`, а не модуль `db` | Ложное чувство покрытия сессий и БД; регрессии пройдут незамеченными | Переписать на `async it` + `await import`, тестировать `startSession/pause/resume/endSession` и `recordAttempt` |
| QA-17 | P1 | Тесты | `supabase/functions/check-essay.test.ts:8-19` (и 2 аналога) | 3 файла/6 тестов Deno проверяют **только константы** `_shared/constants.ts`; сами функции не импортируются. README:226 заявляет «unit-тесты для check-essay, regenerate-image» | CI-«Deno tests» ничего не проверяют про Edge Functions | Тестировать handler с моком `supabase-js`/Gemini (dependency injection), либо честно удалить и не заявлять |
| QA-18 | P1 | Документация | `README.md:220-240,43,226,229,78`; `GEMINI.md:57-92` | README утверждает «P0/P1 закрыты», хотя сборка/линт падают; «SM-2/FSRS» (FSRS в коде 0 упоминаний); «структурированное логирование» (в функциях — строки `console.*`); «Node v18+» при `vite@7 engines ^20.19\|>=22.12`; GEMINI.md имеет сломанный code fence (57–92: заголовк `## Key Features` внутри блока) | Вводят в заблуждение владельца/заказчика; регресс-план не работает | Синхронизировать docs с фактами; добавить CI-проверку docs/линков; вынести статус в CHANGELOG |
| QA-19 | P1 | CI-качество | `deploy.yml:25,28,56,63,68,98` | Actions не запинены по SHA (`@v4`/`@v1`); нет `prettier --check` (CSS/HTML/MD не форматируются), нет `npm audit`, нет secret-scan, `supabase/setup-cli@v1 version: latest` (100); `cancel-in-progress: true` может убить деплой (15–17); `.env` через `printf` (40–41) не экранирует `\n`/`%` в секретах | Supply-chain риск; дрейф формата; непредсказуемый деплой; битый `.env` | `uses: …@<sha>`; добавить `npm audit --audit-level=high`, `prettier --check .`; фиксировать CLI; `environment: production` + `concurrency` без cancel |
| QA-20 | P1 | Git-гигиена | `.gitignore:1-5`; `.git` | В HEAD трекаются `supabase/.temp/*` (9 файлов), `__pycache__/content_worker.cpython-313.pyc`; 6 удалённых в worktree файлов не закоммичены; `.gitignore` не содержит `coverage/`, `supabase/.temp`, `__pycache__`, `*.log`; в истории 92.9 МБ blob’ов, `.git` = 29.72 MiB loose | Утечка machine-specific состояния, раздувание репо; «грязный» main | `git rm --cached -r supabase/.temp __pycache__`; расширить `.gitignore`; `git gc`/чистка истории (BFG) |
| QA-21 | P1 | Зависимости | `package.json:38-49` | `node-fetch@2` + `@types/node-fetch` не используются нигде (0 импортов в `src`/`supabase/functions`); `imagescript@1.3.1`/`@google/generative-ai@0.24.1` клиентом не импортируются, а Edge Functions используют другие версии (`deno.land/x/imagescript@1.2.15`, `npm:@google/generative-ai@0.22.0`) → drift; 7 пакетов `workbox-*` дублируют зависимости `vite-plugin-pwa` | Лишний install/аудит-склад; рассинхрон версий сервер/пакет; deprecated `node-fetch@2` | Удалить мёртвые deps; перенести `@supabase/supabase-js` в `dependencies`; зафиксировать единые версии (или npm `overrides`) |
| QA-22 | P1 | tsconfig | `tsconfig.json:8,20-25` | `include: ["src"]` → `vite.config.ts`/`eslint.config.ts` не типизируются; нет `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`; `types` глобально для всего проекта | Ошибки конфигов и индекс-доступа невидимы; слабая строгость | `include: ["src","*.config.ts"]`, `tsconfig.node.json` + project references, включить строгие флаги |
| QA-23 | P2 | Типовая безопасность | `src/app.ts:194,1404-1458`; `auth.ts:47-50` | 26 `as unknown as` (7 в `app.ts`, 4 в `auth.ts`), 12 `@ts-expect-error` (один и тот же хак `client.supabaseUrl/supabaseKey` повторён 3× — `app.ts:286,288`, `db.ts:714,716`, `network.ts:31,33`), 2 `as any` (`auth.ts:47,50`), 0 `@ts-ignore` | Касты маскируют несовместимость `User`/`Session`; «хак» размножен | Ввести тип-адаптер `mapSupabaseUser`; обернуть health-check в один модуль без private-полей |
| QA-24 | P2 | Типы | `src/types.d.ts:1-91` vs `src/types/global.d.ts:1-80` | Два конкурирующих объявления `Window` (~26 общих членов) с расходящимися сигнатурами: `installApp?: () => void` vs `() => Promise<void>`; `speak(text: string)` vs `text: string \| null`; `checkPronunciation` 4 vs 6 параметров; `restoreWord(id:number)` vs `string\|number` | Скрытые контракты с inline-хендлерами HTML; правка одного файла ломает другой (частично маскируется assignability) | Один `src/types/window.d.ts`, остальные удалить; покрыть `window`-API typed-реестром |
| QA-25 | P2 | Мёртвый код | `src/ui/index.ts` (0 байт); `src/core/env.ts`; `src/core/ui_sync.ts`; `src/core/backup.ts:45`; `storage_idb.ts` (removeIdbItem); `ui_shop.ts:264`; `ui_trash.ts:132`; `ui_retry.ts:7`; `ui_settings.ts:1111` | 0-байтовый barrel; `env.ts` и `ui_sync.ts` не импортируются нигде; 9 экспортов с 1 ссылкой (только определение): `restoreLocalBackup`, `removeIdbItem`, `openTrashModal`, `addFailedRequest`, `updateShopUI`, `resetOnboarding`, `updateSprintTimer`, `uploadAndSaveImage`, `UserWordProgress` | Мёртвый код вводит в заблуждение и тянет поддержку | Удалить; в CI — `ts-prune`/`knip` |
| QA-26 | P2 | Логи | `src/app.ts:1`; `src/ui/ui_settings.ts:1`; `src/core/network.ts:104`; всего 176 `console.*` | `console.log` в проде (app 12, supabaseClient 2, network 1, ui_settings 1); два файла глушат правило `/* eslint-disable no-console */` целиком; нет `import.meta.env.DEV`-гейтинга | Шум в консоли, утечка внутренних деталей, лишний вес | Единый `logger` c уровнями/DEV-флагом; запретить `console` в `src` кроме logger |
| QA-27 | P2 | UX-консистентность | `src/core/auth.ts:505,532,612,621,625,632,646,652,661,663,772`; `src/core/session.ts:144` | 11 нативных `alert()` + `prompt()` при наличии собственных `openConfirm`/`showToast`; правило `no-alert` не включено | Блокирующие диалоги ломают PWA/мобайл, не стилизуются, не локализуемы | Заменить на `showToast`/`openConfirm`; включить `no-alert: error` |
| QA-28 | P2 | Логика/мёртвый код | `src/core/stats.ts:290-297` | После `if (totalAttempts === 0) return 0;` идут `return Math.round(...)` (291) и **недостижимые** 292–297, где заполняется `cachedAccuracy` → кэш точности никогда не заполняется, `invalidateStatsCache()` бесполезен | Мёртвый код и неработающая «оптимизация»; `no-unreachable` должен был упасть в линте | Удалить 292–297; кэш вводить только с реальными замерами |
| QA-29 | P2 | CSS/HTML | `src/css/components.css` (2744 стр./60.8 КБ), `layout.css` (1153/24.7 КБ), `style.css:1-12`, `index.html:31-391` | 15 CSS-файлов/6501 строка/143 КБ, подключаются 12 `@import` (render-blocking цепочка); в `index.html` 9187 символов inline-стилей, 9 классов дублируются с `src/css/*` | Дубли и лишний CSS-вес (107.5 КБ в проде) | Слить в 3-4 файла (base/components/pages), убрать inline-дубли; `@import` заменить на сборку одним входом |
| QA-30 | P2 | Бандл/сборка | `dist/assets/index-BmGu2LOk.js` (430 641 Б), `vendor-supabase` 173 381 Б, `vendor-charts` 107 062 Б, `index-Cc2fZ-KO.css` 107 578 Б; `dist/*` от 2026-11-20, исходники изменены 2026-11-22 | 25 HTML-шаблонов (84.5 КБ) инлайнятся в main-чанк через `?raw`; chart.js/confetti грузятся статически; `dist` устарел на 2 дня и не пересобирается из-за QA-01 | Медленный first paint, устаревший прод-артефакт | HTML — lazy-import по модалке; chart.js — только в stats-view + `import()`; пересобрать dist после фикса |
| QA-31 | P2 | Vite | `vite.config.ts:99-103`; `src/core/stats.ts:8`; `src/app.ts:136` | `manualChunks` выделяет `chart.js`/`canvas-confetti`, но они импортированы статически (`import { Chart } from "chart.js"`), поэтому вендор-чанки грузятся на первом экране; ленивость мнимая | 107 КБ chart.js в initial load без пользы | Динамический `import("chart.js")` внутри `renderDetailedStats`; тогда manualChunks имеет смысл |
| QA-32 | P2 | PWA | `vite.config.ts:17-84`; `src/sw.ts:33-126` | Двойная конфигурация кэширования: `runtimeCaching` в vite-конфиге и `registerRoute` в `sw.ts` (html2canvas/Supabase REST/quotes/collections); `devOptions.enabled: true` (SW активен в dev); в precache 23 записи, но `offline.html` входит дважды (уникальных 22) | Расхождения «что кэшируется», трудный дебаг; дубль в precache | Оставить один источник (sw.ts), devOptions выключить; убрать дубль из `includeAssets` |
| QA-33 | P2 | Тесты | `vite.config.ts:107-118`; `src/test-setup.ts:28-55` | `environment: "node"` + самописные моки `document`/`localStorage`; `coverage.all: true` без `thresholds` | Тесты не видят реального DOM; падение покрытия не блокирует PR; комментарий-мусор `// минимум,必要` (28) | `environment: "jsdom"`; `coverage.thresholds` (например lines 40); вычистить test-setup |
| QA-34 | P2 | Скрипты | `package.json:5-14` | Нет `typecheck`, `test:run`, `format:check`; `test: "vitest"` (watch) — в CI случайно используется `npx vitest run`; `deploy` через `npx` (сеть) и без предварительного `check` | Локальный запуск не совпадает с CI; агенты/контрибьюторы спотыкаются | `typecheck: tsc --noEmit`, `test:run: vitest run`, `format:check: prettier --check .`; `deploy: npm run check && npm run lint && npm run build && …` |
| QA-35 | P2 | Форматирование | `.prettierrc:19`; `.gitattributes:2` | `endOfLine: "auto"` + `.gitattributes * text=auto eol=lf` — конфликт политик; нет `.editorconfig`; формат проверяется только для TS через eslint-плагин | «Шумные» диффы, CRLF/LF-пляски, неформатированные CSS/HTML/MD | `endOfLine: "lf"`, добавить `.editorconfig`, `prettier --check` в CI для всех расширений |
| QA-36 | P2 | ESLint | `eslint.config.ts:7,17-31` | `no-console: warn` + `--max-warnings 0` — взаимоисключающая политика (доказано `lint.txt`); type-aware правила отключены (комментарий 26–28); `prettierRecommended` включает `eslint-config-prettier`, который тут же подключён отдельной зависимостью; ignores не покрывают `coverage/` | Линт валится на мелочах, но пропускает floating promises и т.п. | `no-console: error` (или разрешить через logger), добавить type-aware набор, убрать дубль-зависимость |
| QA-37 | P2 | Деплой-скрипт | `package.json:10`; ветка `gh-pages` (121 файл, 80 из `src/`, 0 из `dist/`) | `gh-pages -d dist` задуман для публикации сборки, но ветка содержит исходники; она является предком main и отстаёт на 18 коммитов | Пуш `dist` перезапишет «историческую» ветку; никто не знает, что реально опубликовано | Пересоздать gh-pages из `dist` (или перейти на Pages Actions), добавить инструкцию в README |
| QA-38 | P2 | Git-история | `.git` | 1589 blob’ов = 92 872 530 Б; 13 blob’ов >1 МБ, в т.ч. `@esbuild/win32-x64/esbuild.exe` 9.9 МБ, `typescript.js` 9.1 МБ, `_tsc.js` 6.2 МБ, `log.txt` 5.0 + 2.0 МБ; `.git` = 29.72 MiB, `packs: 0` (не было gc) | Раздувание репо, долгий clone; бинарники node_modules в истории | `git filter-repo`/BFG для node_modules+log.txt; `git gc --aggressive`; `.gitignore` уже не спасёт историю |
| QA-39 | P2 | Ассеты | `public/audio/*.mp3` (3 файла: 3 329 715 / 3 305 892 / 3 103 599 Б) | 9.74 МБ аудио в git и в `dist/audio`; SW кэширует mp3 `CacheFirst` (200 записей) | Тяжёлый репо/деплой; аудио лучше в Supabase Storage/CDN | Перенести в Storage/LFS, в репо — только manifest |
| QA-40 | P2 | dist-артефакт | `dist/_redirects` (19 Б), `dist/audio/*` (9.74 МБ), `dist/offline.html` | В `dist` лежат одновременно Netlify-`_redirects` и PWA-`offline.html`; аудио копируется в деплой | Смешение моделей хостинга, лишний вес деплоя | Определиться с хостингом; `_redirects` убрать/переделать; аудио — внешним URL |
| QA-41 | P2 | Документация | `README.md:37,49,57,82,90,112,130`; `GEMINI.md:1-148` | Двойная нумерация разделов (1–3 в «Архитектуре» и снова 1–5 в «Установке»); смешение языков (`kritisch` — README:220, «Мigration» с кириллической «М» — README:124); GEMINI.md структурно сломан (code fence 57–92, заголовки внутри блока) | Docs нельзя читать как спецификацию; ИИ-ассистент получит противоречивый контекст | Переписать GEMINI.md как валидный markdown, вычитать README, добавить TOC |
| QA-42 | P2 | Проектные файлы | корень репо | Нет `LICENSE`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODEOWNERS`, `.nvmrc`/`engines`, dependabot/renovate; `package.json` без `engines` при жёстких требованиях Vite 7/Vitest 4 | Юридическая неопределённость (README:254 «Proprietary/Private» без файла), невозможность воспроизвести окружение | Добавить LICENSE/CHANGELOG/CONTRIBUTING, `engines.node >=20.19`, `.nvmrc`, dependabot |
| QA-43 | P3 | PWA-манифест | `dist/manifest.webmanifest:1`; `vite.config.ts:38-45` | Иконка только SVG `"purpose": "any maskable"`, нет 192/512 PNG; «maskable» для SVG поддержан не везде | Возможные проблемы установки PWA на старых Android | Добавить PNG 192/512, разделить `any`/`maskable` |
| QA-44 | P3 | Vite dev | `vite.config.ts:87-94` | `host: "localhost"` — приложение нельзя открыть с телефона в LAN (PWA/офлайн-тесты) | Неудобная ручная проверка PWA | `host: true` в dev |
| QA-45 | P3 | Deno-конфиги | `deno.json:2-5`; `supabase/functions/deno.json:1-13`; `generate-word-data/deno.json:1-10` | Три `deno.json`; root-импорты (`std/`, `@supabase/supabase-js`) на корне не используются; import map продублирован 3 раза; `find-confusing-words/deno.json` остался в HEAD без самой функции | Дрейф версий, непонятно, какой конфиг главный | Один import map в `supabase/functions/deno.json`; удалить nested config и осиротевший файл |
| QA-46 | P3 | Мелочи | `index.html:12`; `src/core/pwa.ts:74-81`; `src/core/network.ts:60-66`; `src/utils/utils.ts:52` | Иконка apple-touch с внешнего CDN (flaticon); пустая подписка `controllerchange` (pwa.ts:74-81); `network.ts` создаёт `#offline-indicator`, дублируя элемент из `index.html:446`; `ICONS_MAP` почти не используется (3 ссылки) | Внешняя зависимость в иконке; мёртвые ветки | Локальная иконка; удалить пустые обработчики |

---

## 3. Подробные разборы

### QA-01 (P0). Сборка падает: TS6133 в `app.ts:149`

`audit/logs/build.txt`:
```
> tsc && vite build
src/app.ts(149,1): error TS6133: 'setSyncState' is declared but its value is never read.
```
`src/app.ts:142-149`:
```ts
/**
 * Updates the visual sync state in the UI.
 * @param status The current synchronization status.
 */
/**
 * Обновляет визуальное состояние подключения к БД.
 */
import { setSyncState } from "./core/sync.ts";
```
**Механизм.** Сетевые хелперы (`updateDbStatus`, `setupNetworkListeners`) вынесены в новый `src/core/network.ts`, который сам импортирует `setSyncState` (`network.ts:4`). В `app.ts` остался неиспользуемый импорт + осиротевшие комментарии; `tsconfig.json:21` включает `"noUnusedLocals": true`, поэтому `tsc` падает. Это ровно тот класс ошибок, который не ловит глаз при ревью, но ловит CI.
**Влияние.** `npm run check` и `npm run build` красные; CI (`deploy.yml:44`) останавливает пайплайн; Edge Functions не деплоятся (`needs: test`); свежий `dist` собрать нельзя (лежащему в репо артефакту 2 дня, исходники правились сегодня).
**Фикс.** Удалить строку 149 и комментарии 142–148. Плюс — добавить pre-commit `npm run check` (husky/lint-staged), чтобы такое не доходило до CI.

### QA-02 (P0). Линт падает: prettier + `--max-warnings 0`

`audit/logs/lint.txt`:
```
src/core/network.ts
  104:11  warning  Unexpected console statement...  no-console
  177:2   error    Insert `⏎`                          prettier/prettier
src/core/xp.ts
  26:2    error    Insert `⏎`                          prettier/prettier
✖ 4 problems (2 errors, 2 warnings)
```
**Механизм.** Два новых файла (`network.ts`, `xp.ts` — untracked, появились в этом же рабочем изменении) сохранены без финального перевода строки. Плюс `no-console`-warning в `network.ts:104` и unused-import warning из QA-01. Скрипт `lint` (`package.json:11`) — `eslint . --report-unused-disable-directives --max-warnings 0`: **любой warning валит линт**, хотя конфиг объявляет эти правила как `warn` (`eslint.config.ts:17-28`). Это институциональное противоречие, а не просто «забыли newline».
**Влияние.** CI-джоба `Lint frontend` (`deploy.yml:47`) падает; локальные разработчики получают красный линт на любом `console.warn`.
**Фикс.** `npx prettier --write src/core/network.ts src/core/xp.ts`; удалить `console.log` (заменить на `console.info`/logger); либо `no-console: "error"` + allow-list, либо убрать `--max-warnings 0` и добавить отдельный «0 errors» gate.

### QA-03 (P0). CI: красная проверка блокирует деплой функций

`.github/workflows/deploy.yml:43-53`:
```yaml
      - name: Check TypeScript types
        run: npm run check
      - name: Lint frontend
        run: npm run lint
      - name: Build Frontend
        run: npm run build
```
`:89-93`:
```yaml
  deploy-functions:
    ...
    needs: test
```
**Механизм.** Первая же падающая проверка (`npm run check`) роняет джобу `test`; `deploy-functions` имеет `needs: test` и `if: push && main`. Итог: пока QA-01/02 не исправлены, **ни одна** Edge Function не доедет до прода ни при каком пуше.
**Влияние.** Коммит `cc7f833` («P0+P1 fixes») сам себя заблокировал: изменения RLS/функций не задеплоены.
**Фикс.** Починить проверки; разнести на отдельные job’ы (`typecheck`, `lint`, `unit`, `build`) с `fail-fast`, а деплой делать только от зелёного `test`; временно — `continue-on-error` не использовать (это маскирует проблему).

### QA-04 (P0). Фронтенд не деплоится вообще; опубликован нерабочий сайт

`.github/workflows/deploy.yml:12-13`:
```yaml
permissions:
  contents: read
```
Публикации фронта в workflow **нет** — только `deploy-functions`. Единственный механизм — локальный `package.json:10`:
```json
"deploy": "npm run build && npx gh-pages -d dist",
```
Но ветка `gh-pages` (read-only `git ls-tree`) содержит 121 файл: 80 из `src/`, 0 из `dist/`, 0 из `node_modules`; `gh-pages:index.html`:
```html
<script type="module" src="/src/app.ts"></script>
```
**Механизм.** В феврале 2026 в `gh-pages` был положен снапшот **исходников** (не сборки), с тех пор ветка — предок main и отстаёт на 18 коммитов (main — 2026-11-20, gh-pages — 2026-02-27). Браузер на GitHub Pages получает `index.html`, который просит `/src/app.ts` — TS-модуль, не исполняемый браузером без сборки.
**Влияние.** Пользователи 9 месяцев видят нерабочее приложение/ошибку в консоли; PWA-обновления не доставляются; `npm run deploy` из README не описан вовсе.
**Фикс.** Перейти на официальный Pages-деплой из Actions (`actions/upload-pages-artifact` + `actions/deploy-pages`), публиковать `dist`, `permissions: pages: write, id-token: write`; ветку `gh-pages` пересоздать из сборки, старую — удалить; добавить раздел Deployment в README.

### QA-05 (P0). Три несовместимые модели хостинга

`vite.config.ts:86`:
```ts
base: "/",
```
Репозиторий: `https://github.com/Danielgrif/TOPIK-APP` → project page URL = `https://danielgrif.github.io/TOPIK-APP/`. `dist/index.html` ссылается на `/assets/index-BmGu2LOk.js` (абсолютный корень) → на project page это `https://danielgrif.github.io/assets/...` = 404. При этом `public/_redirects` содержит `/* /index.html 200` (Netlify SPA-fallback), а `404.html` в `public/` нет; PWA-манифест тоже `start_url: "/"` (`vite.config.ts:31`). Три модели — Netlify, GitHub Pages project page, локальный `vite preview` — несовместимы между собой.
**Влияние.** Даже после починки сборки и настройки Pages приложение сломается на ассетах; SW/манифест будут считать scope корнем домена.
**Фикс.** Выбрать одну модель: если GitHub Pages project page — `base: "/TOPIK-APP/"` (и `start_url`, `scope` относительно base), route-prefix для SW; если Netlify — `base: "/"` и netlify.toml вместо `_redirects`; лучше — custom domain + `base: "/"`.

### QA-06 (P1). Слой `core` зависит от `ui`

GEMINI.md:101: «**Правило:** Никогда не вызывай методы `ui_*.ts` напрямую из `core/`. Используй `notify()`.» Реальность:
```
src/core/auth.ts:6:      import { saveAndRender } from "../ui/ui.ts";
src/core/auth.ts:7:      import { openModal, closeModal, openConfirm } from "../ui/ui_modal.ts";
src/core/auth.ts:8:      import { applyTheme, updateVoiceUI, updateSettingsUI } from "../ui/ui_settings.ts";
src/core/renderer.ts:14: } from "../ui/ui_card.ts";
src/core/stats.ts:3:     import { showLevelUpAnimation, showAchievementUnlocked } from "../ui/ui_animations.ts";
src/core/pwa.ts:8:       } from "../ui/ui_interactions.ts";
src/core/window_bindings.ts:4,11,17,28,42,45: ... ui_modal/ui/ui_filters/ui_settings/quiz/ui_card
src/core/network.ts:86:  import("../ui/ui_retry.ts").then((m) => m.syncOfflineRequests());
```
Итого 13 статических импортов в 5 файлах + 1 динамический. `src/core/window_bindings.ts` вообще целиком посвящён UI (Object.assign(window, …) на 60+ функций) — по слою это `ui/window.ts`.
**Влияние.** Невозможно использовать `core` в Deno/Node/тестах без DOM; каждый UI-рефакторинг ломает core; циклы (QA-07) — прямое следствие.
**Фикс.** `core` публикует `notify("level_up", …)`, `notify("modal_open", …)`; UI подписывается. `stats.ts` должен возвращать данные, а не рисовать (см. QA-09). `window_bindings.ts` перенести в `src/ui/`.

### QA-07 (P1). Циклические зависимости (11 шт.)

Ранжированный обход графа импортов (73 узла, 41 ребро, разрешение `.ts`/`index.ts`) нашёл 11 циклов, в т.ч.:
- `src/ui/ui_card.ts → src/core/renderer.ts → src/ui/ui_card.ts` — **прямой core↔ui цикл**, и он задокументирован в коде как норма:
```ts
// src/core/renderer.ts:5-7
// ui_card и ui_modal уже попали в основной чанк через статические импорты,
// поэтому импортируем их напрямую. Цикл безопасен: все обращения к этим
// функциям происходят из обработчиков событий, а не на верхнем уровне.
```
- `ui_bulk.ts → ui_card.ts → core/renderer.ts → ui_bulk.ts`;
- `ui_modal.ts → quiz.ts → quiz_strategies.ts → ui.ts → ui_listening/ui_reading/ui_writing → ui_modal.ts` (3 варианта);
- `ui_modal ↔ quiz`, `ui_settings ↔ ui_shop`.
**Механизм.** Комментарий «цикл безопасен» — это устное соглашение; оно не проверяется и не защищает от TDZ, если кто-то добавит top-level вызов. ESM-циклы с классами (`Component extends BaseComponent`) особенно опасны.
**Влияние.** Порядок инициализации зависит от точки входа; tree-shaking ломается (модуль попадает в чанк из-за обратного ребра); рефакторинг «страшный».
**Фикс.** CI-шаг `npx dependency-cruiser --validate .dependency-cruiser.js src` с запретом `core → ui` и циклов; разорвать цикл `renderer↔ui_card` (перенести `getAccuracy/setupLongPress` в `core`, обработчики — через callbacks).

### QA-08 (P1). `BaseComponent` покрывает меньшинство UI-файлов

GEMINI.md:44: «Все новые UI-контроллеры (модальные окна, экраны) ДОЛЖНЫ наследоваться от `BaseComponent`.»
Факт (метод: grep `extends BaseComponent` по 36 файлам `src/ui/*.ts`): **14** содержат подкласс, **22** — нет (из этих 22 один — сам `BaseComponent.ts`, один — пустой `index.ts`, остальные **20** — реальные модули/экраны), включая крупнейшие экраны:
- `quiz.ts` (1603 строки, 30 функций, 21 module-level `let` на строках 19–40) — вообще не класс;
- `ui_card.ts` (830), `ui_custom_words.ts` (1138), `ui_bulk.ts` (419), `ui_edit_word.ts`, `ui_modal.ts`, `ui_onboarding.ts`, `ui_review.ts`, `ui_share.ts`, `ui_data.ts`, `ui_retry.ts`, `ui_interactions.ts`, `keyboard.ts`, `ui_animations.ts`, `ui.ts`, `ui_grammar.ts`, `ui_hanja.ts`.
**Влияние.** Автоматический `destroy()`/дедупликация подписок работает только у 14 файлов; `quiz.ts` подписывается на события и ставит таймеры вручную — утечки при повторных входах в квиз.
**Фикс.** Обернуть экраны в классы; добавить ESLint `no-restricted-syntax` на `document.addEventListener` вне `src/ui/BaseComponent.ts`.

### QA-09 (P1). `core` рисует DOM и показывает тосты

GEMINI.md:122: «`src/core/` — Чистая бизнес-логика, API, State. **Без DOM манипуляций**.»
Метрика по `src/core/*.ts` (Select-String, подсчёт вхождений): **151** `document.*`, **41** `window.*`, **54** `showToast(`, **33** `innerHTML`. Топ: `auth.ts` (57 `document.`), `renderer.ts` (47 + 20 `innerHTML`), `stats.ts` (32 + 10 `innerHTML`).
Пример из `src/core/stats.ts:1389-1475` — `openRolesModal()` собирает модальное окно HTML-строкой и вставляет в `document.body`:
```ts
modal = document.createElement("div");
modal.id = "roles-modal";
modal.className = "modal";
...
modal.innerHTML = `
  <div class="modal-content" style="max-width: 400px;">...`;
```
**Влияние.** Тесты вынуждены мокать `document` (`test-setup.ts`), логика не переиспользуется, «чистое ядро» — фикция.
**Фикс.** Разделить `*-logic.ts` и `*-view.ts`; `showToast` заменить на событие `notify("toast", ...)`, реакцию — в UI.

### QA-10 (P1). `app.ts` — God Object (1647 строк)

Ключевые зоны: глобальный клик-роутер `setupGlobalListeners` — **89 `case`** на строках 399–811; inline-навигация HTML-строкой 1321–1352; `showWelcomeScreen` 981–1094 (сборка HTML + конфе́тти); `setupRealtimeUpdates` 1106–1244; `init()` 1246–1588 (порядок старта из 60+ вызовов); `measurePing` 277–308 (дубль).
**Влияние.** Любая новая фича добавляет `case` и импорт в середине файла (см. QA-15); конфликтные мерджи; невозможно точечное тестирование.
**Фикс.** `actions/registry.ts` (Map action→handler, регистрация по модулям), `bootstrap/` для init-последовательности, `welcome/` и `realtime/` — отдельные модули.

### QA-11 (P1). `stats.ts` — второй God Object (1476 строк, 60+ экспортов)

Содержит: XP/уровни (`addXP` 86–148), лиги (`checkWeeklyReset` 27–58), достижения (299–531), кэш топик-мастери (`546–586`), 7 Chart.js-графиков (763–1372), таблицу ролей и модалку (1373–1476). GEMINI.md и README обещают «чистую бизнес-логику».
**Влияние.** Кэш-инвалидация и чарты живут в одном модуле → тянется chart.js в initial load (QA-31); тестируется только XP/лиги.
**Фикс.** Разрезать по доменам; `xp.ts` уже выделен — продолжить (`leagues.ts`, `achievements_data.ts`, `stats_charts.ts`, `stats_view.ts`).

### QA-12 (P1). `quiz.ts`/`quiz_strategies.ts` — монолиты квиза

`src/ui/quiz.ts` — 1603 строки, 30 функций (`startQuizMode` 502, `nextQuizQuestion` 786, `recordQuizAnswer` 942, `endQuiz` 1104, `showQuizSummaryModal` 1481…), 21 `let` на верхнем уровне (19–40: `quizWords`, `quizInterval`, `survivalLives`, `freezeTimeout`…). `quiz_strategies.ts` — 1109 строк и **50 `innerHTML`** (максимум по проекту).
**Влияние.** Состояние квиза — глобальные переменные модуля: два квиза/перезапуск = гонки; тестов на квиз нет вовсе.
**Фикс.** `class QuizSession` (состояние + переходы), стратегии — объекты с одним интерфейсом (уже есть `interface Strategy` в `quiz_strategies.ts:53`), рендер — в `ui_quiz_question.ts`.

### QA-13 (P1). Дублирование функций (копипаста)

| Функция | Место 1 | Место 2 | Комментарий |
|---|---|---|---|
| `getAccuracy` | `core/renderer.ts:22-26` | `ui/ui_card.ts:628-632` | тела байт-в-байт идентичны |
| `setupLongPress` | `core/renderer.ts:28` | `ui/ui_card.ts:403` | две реализации, одна экспортируемая |
| `measurePing` | `app.ts:277` | `core/network.ts:121` | `network`-версия не используется (мёртвый экспорт) |
| `isDatabaseActive` | `core/db.ts:711` | `core/network.ts:29` | одинаковые тела, оба «живые» (разные импортёры) |
| `updatePingIndicator` | `ui/ui.ts:237` | `core/network.ts:160` | **разные CSS-классы**: `good/medium/bad` против `good/warning/error` |
| `setSyncState` | `core/sync.ts:9` | `core/ui_sync.ts:7` (мёртвый файл) | при этом `app.ts:149` импортирует третий раз |
| `updateTimerDisplay` | `core/session.ts:10` | `ui/ui_writing.ts` | логика таймера размазана |
| `getAccuracy/setupLongPress` | `core/renderer.ts` | `ui/ui_card.ts` | см. выше |

**Влияние.** Исправление бага в одной копии не доезжает до другой (`updatePingIndicator`: `network`-версия выставляет несуществующие классы `.warning/.error`, которых нет в `injectDynamicStyles` `app.ts:310-355`).
**Фикс.** Удалить дубли, оставить `core/network.ts` как единственное место сетевых хелперов; `app.ts:277` и `app.ts:310` перенести туда же; добавить `jscpd` с порогом 3%.

### QA-14 (P1). `db.ts`: 15 однотипных save-функций

`src/core/db.ts:744-911` — 15 функций вида:
```ts
export function saveSessions(): void {
  try {
    localStorage.setItem(LS_KEYS.SESSIONS, JSON.stringify(state.sessions));
  } catch (e) {
    console.error("Save sessions error:", e);
  }
}
```
и `saveAllState()` (896–911), вызывающий все 15 по очереди. Плюс `saveVocabCache` (876–889) пишет **и в IndexedDB, и в localStorage**, хотя комментарий рядом признаёт `QuotaExceededError`.
**Влияние.** 170 строк шума; при добавлении нового домена легко забыть сохранить/загрузить; двойная запись словаря (риск квоты и рассинхрона).
**Фикс.** `function persist<K extends keyof LS_KEYS>(key, value)` + таблица `{key, selector}`; словарь — только IDB (localStorage-фолбэк при ошибке IDB).

### QA-15 (P1). Незавершённый рефакторинг `app.ts`

`app.ts:142-149` — осиротевшие комментарии + импорт в середине файла; `app.ts:1099` и `app.ts:1104` — ещё два импорта после ~1100 строк кода:
```ts
import { updateDbStatus } from "./core/network.ts";
...
import { setupNetworkListeners } from "./core/network.ts";
```
При этом в файле осталась **вторая копия** `measurePing` (277–308) и целый блок `updateDbStatus`-логики. ESLint `import/first` не включён, поэтому это «легально».
**Влияние.** Импорт-граф нечитаем; новые дубли появляются незаметно; типичный симптом «рефакторинг на середине».
**Фикс.** Все импорты в шапку, мёртвые копии удалить, включить `import/first` (и `import/no-cycle`).

### QA-16 (P1). Тесты: `session.test.ts` и `db.test.ts` — фикция

`src/core/session.test.ts:28-35` (и все остальные 5 тестов по той же схеме):
```ts
it("startSession sets sessionActive=true and resets counters", () => {
  void import("./session.ts").then((mod) => {
    mod.startSession();
    expect(state.sessionActive).toBe(true);
    ...
  });
});
```
Тест **синхронный**: `it` завершается до разрешения промиса; ассерты выполняются (если выполняются) уже после завершения теста. Vitest считает такой тест успешным. То же в `db.test.ts:68-76` — тест называется «db module — dirty word tracking», но проверяет `Set.add/has` и вообще не импортирует функции `db.ts`.
**Влияние.** Заявленное покрытие сессий и БД — ноль; регрессии в pause/resume/outbox не отловятся. Именно эти модули менялись в `cc7f833` («session pause/resume»).
**Фикс.** `async it` + `await import`; `await expect(...).resolves`; тестировать `startSession/pause/resume/endSession/toggleSessionTimer` и `recordAttempt` (мок `supabaseClient` уже есть).

### QA-17 (P1). Deno-тесты проверяют константы, а не функции

Все 3 файла — по 2 теста, каждый загружает только `_shared/constants.ts`:
```ts
Deno.test("check-essay: GEMINI_MODELS.FLASH доступен", async () => {
  const constantsModule = await import("./_shared/constants.ts");
  assertEquals(constantsModule.GEMINI_MODELS.FLASH, "gemini-2.5-flash");
```
(`check-essay.test.ts:8-12`; `ocr-image.test.ts:6-10`; `regenerate-image.test.ts:6-12`). Ни один тест не импортирует `check-essay/index.ts`, `ocr-image/index.ts`, `regenerate-image/index.ts` — т.е. обработчики не исполняются. README:226 при этом закрывает P1-пункт «Добавить unit-тесты для Edge Functions (check-essay, regenerate-image)».
**Влияние.** CI-«Deno tests» (`deploy.yml:81-87`) даёт зелёный свет при полном отсутствии проверки функций; баги в промптах/parse/валидации не ловятся.
**Фикс.** Реальный smoke-test handler’ов с DI (`getGeminiClient` уже инжектируется через `_shared/clients.ts`) или честно снять пункт из README.

### QA-18 (P1). Документация vs реальность

| Заявлено | Где | Реальность | Вердикт |
|---|---|---|---|
| «P0/P1 закрыты» (`[x]` RLS, тесты ядра, unit-тесты функций, структурное логирование, строгий ESLint) | README.md:220-240 | сборка и линт падают; тесты ядра частично фиктивны; Deno-тесты не про функции; логи — `console.*`-строки; ESLint без type-aware правил | **ЛОЖЬ** |
| «SM-2/FSRS» | README.md:43 | только SM-2 (`scheduler.ts`), `FSRS` в `src/` — 0 вхождений | **ЧАСТИЧНО** |
| «23 записи в precache» | README.md:182 | ровно 23 записи в `dist/sw.js` | **ИСТИНА** (но `offline.html` дважды) |
| «Все Edge Functions требуют валидный JWT» | README.md:246 | `supabase/config.toml` — 12/12 `verify_jwt = true` | **ИСТИНА** |
| «CORS с явными методами (GET, POST, DELETE, OPTIONS)» | README.md:248 | `_shared/constants.ts:5` — ровно эти методы | **ИСТИНА** |
| «Внутренние ошибки не попадают в ответ» | README.md:250 | `_shared/utils.ts:46-52` — 5xx → `"Internal server error"` | **ИСТИНА** |
| «Структурированное логирование в Edge Functions» | README.md:229 | лог-хелпера нет, 40+ строковых `console.*` (`JSON.stringify({level,event,msg})` — 0 совпадений) | **ЛОЖЬ** |
| «Node.js (v18+)» | README.md:78 | `vite@7 engines: ^20.19.0 \|\| >=22.12.0` (`node_modules/vite/package.json`) | **ЛОЖЬ** |
| «unit-тесты Edge Functions (check-essay, regenerate-image)» | README.md:226 | 6 тестов на константы, функции не вызываются | **ЛОЖЬ** |
| «RLS применена к реальной БД» | README.md:221 | миграция есть (301 строка, 11 таблиц + storage), но файл сам говорит «НЕ применяется автоматически» (строка 4), в CI `supabase db push` отсутствует; подтвердить применение без доступа к БД нельзя | **НЕПРОВЕРЯЕМО локально** |
| «Миграция включает RLS на всех таблицах» | README.md:125 | в миграции RLS есть для 11 таблиц (`vocabulary`, `quotes`, `word_requests`, `user_progress`, `user_lists`, `list_items`, `user_vocabulary`, `user_global_stats`, `user_favorite_quotes`, `profiles`, `feedback_reports`) + `ai_cache` + `storage.objects`, но **нет `public.articles`**, хотя таблица используется (`DB_TABLES.ARTICLES`, `ui_reading.ts`); при этом заявление «на всех таблицах» неточно | **ЧАСТИЧНО** |
| «`deno test supabase/functions/*/test.ts`» | README.md:160 | тесты лежат в `supabase/functions/*.test.ts` (3 файла на верхнем уровне); путь в README нерабочий | **ЛОЖЬ** |
| «Инструкции по развёртыванию (P1 закрыт)» | README.md:227 | есть только `supabase functions deploy`; инструкции по деплою фронтенда/Pages нет | **ЛОЖЬ** |
| «License: Proprietary / Private» | README.md:254 | файла LICENSE нет | **НЕПОЛНО** |
| `.vscode/settings.json` — Deno только для `supabase/functions` | GEMINI.md:141-144 | совпадает (`deno.enablePaths: ["supabase/functions"]`) | **ИСТИНА** |
| «Правило: core без DOM» / «не вызывай ui из core» / «нет циклов» | GEMINI.md:101,122,136 | QA-06, QA-07, QA-09 | **ЛОЖЬ** |

### QA-19 (P1). Пробелы CI-качества

`.github/workflows/deploy.yml`:
- `uses: actions/checkout@v4` (25), `actions/setup-node@v4` (28), `actions/upload-artifact@v4` (56), `denoland/setup-deno@v1` (63), `actions/cache@v4` (68), `supabase/setup-cli@v1` (98) — теги, не SHA; для `setup-cli` ещё и `version: latest` (100).
- Нет `prettier --check` (стиль CSS/HTML/MD не проверяется; eslint покрывает только TS).
- Нет `npm audit` / `npm audit --omit=dev --audit-level=high`, нет secret-scanning.
- `concurrency: group: ${{ github.workflow }}-${{ github.ref }}; cancel-in-progress: true` (15–17) — при быстром пуше отменит уже идущий деплой функций, оставив частично задеплоенный набор.
- `.env` через `printf` (40–41) — секрет с `\n`/`%` сломает файл (лучше `>> $GITHUB_ENV` или `env:` + `vite` без файла).
- Deno-кэш `key: …-deno-${{ hashFiles('**/deno.lock') }}` (71) — оба `deno.lock` (корень и `supabase/functions/`) учтены, это ок; но `$HOME/.deno` не включает `DENO_DIR` кэш npm-пакетов (`nodeModulesDir: auto` пишет в `supabase/functions/node_modules`) — кэш частичный.

### QA-20 (P1). Git-гигиена

Проверки (read-only):
- `git ls-files supabase/.temp` → 9 файлов (`cli-latest`, `linked-project.json`, `project-ref`, …) в индексе;
- `git ls-files | grep __pycache__` → `__pycache__/content_worker.cpython-313.pyc` трекается;
- `git status` → 6 файлов ` D` (удалены в worktree, но в HEAD): `index.ts`, `requirements.txt`, `settings.json`, `supabase/functions/find-confusing-words/deno.json`, `supabase/functions/regenerate-image/settings.json`, `.pyc`;
- `.gitignore` (5 строк) не содержит `coverage/`, `supabase/.temp/`, `__pycache__/`, `*.log`, `audit/`; `git check-ignore coverage` → не игнорируется;
- `git count-objects -v` → `count: 2098`, `size: 30435` KiB (~29.7 MiB), `in-pack: 0`, `packs: 0`;
- `git cat-file --batch-all-objects` → 1589 blob’ов, суммарно **92 872 530 байт** (были коммиты с `node_modules`: `@esbuild/win32-x64/esbuild.exe` 9.9 МБ, `typescript.js` 9.1 МБ, `_tsc.js` 6.2 МБ; и `log.txt` 5.0/2.0 МБ в gh-pages);
- `gh-pages` — предок main (`git merge-base --is-ancestor gh-pages main` → 0), main впереди на 18 коммитов.
**Влияние.** Клон-вес, machine-specific файлы в репо, «грязный» main, невозможность нормального blast-history.
**Фикс.** `git rm --cached -r supabase/.temp __pycache__`; расширить `.gitignore`; закоммитить удаления; `git filter-repo --path node_modules --path log.txt --invert-paths`; `git gc --aggressive`.

### QA-21 (P1). Зависимости: мёртвый груз и дрейф версий

- `node-fetch@^2.7.0` (`package.json:43`) — **0 импортов** в `src` и `supabase/functions` (проверено grep); `@types/node-fetch` (`:20`) — тоже 0. `node-fetch@2` deprecated (v3 — ESM).
- `imagescript@^1.3.1` (`:42`) — клиент не импортирует; Edge Functions используют `deno.land/x/imagescript@1.2.15` (`supabase/functions/deno.json:7`).
- `@google/generative-ai@^0.24.1` (`:39`) — клиент не импортирует; Edge Functions — `npm:@google/generative-ai@0.22.0`.
- `@supabase/supabase-js` — в `devDependencies` (`:17`), хотя это **runtime**-зависимость клиента (лишь терпимо из-за бандлера).
- `workbox-core/precaching/window` в devDeps и `workbox-background-sync/…` в deps — при этом `vite-plugin-pwa` уже тянет workbox сам; `sw.ts` импортирует версии из своих зависимостей.
- `vite-plugin-pwa` запинен точно (`1.2.0`, `:32`) при остальных `^` — непоследовательная стратегия.
- Нет `engines` (`package.json`), хотя Vite 7 требует Node `^20.19.0 || >=22.12.0`, а Vitest 4 — `^20.0.0 || ^22.0.0 || >=24.0.0`.
- Все версии в lock-файле синхронизированы с `package.json` (проверка node-скриптом: 0 missing, 0 mismatch, 608 пакетов) — это **плюс**; uncommitted-диф `package-lock.json` — всего `1 insertion, 34 deletions` (prune трёх optional `@types/babel__*` + флаг `peer`), не ломает `npm ci`.

### QA-22 (P1). `tsconfig.json` — дыры строгости и охвата

```json
"types": ["vite/client", "vitest"],
...
"include": ["src"]
```
`vite.config.ts`, `eslint.config.ts`, `deno.json`-задачи и `supabase/functions` вне typecheck (функции — отдельно Deno, это норма; корневые конфиги — нет). Отсутствуют `noUncheckedIndexedAccess` (для массива `state.dataStore[i]` это критично — в `stats.ts:284` `history[i]` и `:886` `data[i]` типизируются как non-undefined), `exactOptionalPropertyTypes`, `noImplicitOverride`, `noPropertyAccessFromIndexSignature`. `types` задан глобально — любые новые `@types` не попадут автоматически.
**Фикс.** `tsconfig.app.json` (include src) + `tsconfig.node.json` (include configs) + references; включить `noUncheckedIndexedAccess` поэтапно.

### QA-23 (P2). Типовая безопасность: количественно

Метод: grep по 73 `.ts`-файлам `src` (без `node_modules`), подсчёт вхождений:
- `as unknown as` — **26** (`app.ts` 7, `auth.ts` 4, `window_bindings.ts` 3, …). Пример: `app.ts:194` `user = data.user as unknown as User;`
- `@ts-expect-error` — **12**, из них 6 — дубли одного и того же обхода protected-полей: `app.ts:286,288`, `db.ts:714,716`, `network.ts:31,33` («supabaseUrl is protected but we need it»);
- `as any` — **2** (`auth.ts:47,50`, каждый с `eslint-disable-next-line @typescript-eslint/no-explicit-any`);
- `@ts-ignore` — 0 (хорошо), `debugger`/`eval` — 0 (хорошо);
- `alert()` — 11 (см. QA-27), `prompt()` — 1;
- `console.*` — 176; `innerHTML` — 240; `setTimeout(` — 109 (магические задержки 500/1000/1500/3000 мс);
- `TODO/FIXME/HACK` — 2 (`quiz_modes_config.ts:94`, `ui_edit_word.ts:63`);
- non-null `!.` — 10.
**Оценка.** Для 22k строк TS это «средне-плохо»: касты сконцентрированы в auth-слое (`Session.user → User`), где как раз важна корректность; `@ts-expect-error`-хак размножен вместо одного адаптера.

### QA-24 (P2). Два конкурирующих `Window`

`src/types.d.ts` (91 строка, `/// <reference types="vite/client" />`) и `src/types/global.d.ts` (80 строк) оба делают `declare global { interface Window { … } }` с ~26 общими членами и расходящимися сигнатурами:
| Член | `types.d.ts` | `types/global.d.ts` |
|---|---|---|
| `installApp` | `() => void` | `() => Promise<void>` |
| `speak` | `(text: string \| null, url?)` | `(text: string, url?)` |
| `checkPronunciation` | 4 параметра | 6 параметров (`onInterim`, `onVolume`) |
| `restoreWord` | `(id: number)` | `(id: string \| number)` |
| `permanentlyDeleteWord` | `(id: number, btn)` | `(id: string \| number, btn)` |
При этом текущий `tsc` **не** падает на дублях (в `tsc.txt` только TS6133) — т.е. глобальные типы де-факто не верифицируются, а контракт `window`-функций держится на честном слове.
**Фикс.** Один `src/types/window.d.ts`, сгенерировать типизированный реестр `WindowApi` из `window_bindings.ts` (или наоборот — выводить `window_bindings.ts` из интерфейса).

### QA-25 (P2). Мёртвый код и осиротевшие файлы

- `src/ui/index.ts` — **0 байт**, никем не импортируется (проверено grep) — заготовка barrel-файла.
- `src/core/env.ts` (8 строк) — дублирует чтение env из `supabaseClient.ts:10-17`, **0 импортов**.
- `src/core/ui_sync.ts` (1459 байт) — своя `setSyncState`, **0 импортов** (осталась после выноса sync-логики).
- 9 экспортов с единственной ссылкой (определение): `core/backup.ts:45 restoreLocalBackup`, `core/storage_idb.ts removeIdbItem`, `ui/ui_trash.ts:132 openTrashModal`, `ui/ui_retry.ts:7 addFailedRequest`, `ui/ui_shop.ts:264 updateShopUI`, `ui/ui_settings.ts:1111 resetOnboarding`, `ui/quiz.ts updateSprintTimer`, `ui/ui_card.ts uploadAndSaveImage`, `types/index.ts:101 UserWordProgress`.
- В HEAD остался `supabase/functions/find-confusing-words/deno.json` без самой функции (`git ls-tree HEAD` — только этот файл).
**Влияние.** Код вводит в заблуждение (кажется, что фича есть), тянет поддержку и линт-время.
**Фикс.** Удалить; добавить `knip` в CI (`knip --include files,exports,dependencies`).

### QA-26 (P2). `console.*` в production-клиенте

176 вхождений; топ: `db.ts` 32, `app.ts` 29, `supabaseClient.ts` 12, `auth.ts` 10, `state.ts` 9. Два файла глушат правило целиком (`app.ts:1`, `ui_settings.ts:1` — `/* eslint-disable no-console */`), в `supabaseClient.ts:171` — построчный disable. `network.ts:104` — единственный незаглушённый `console.log`, он и попал в `lint.txt`.
**Влияние.** Шум в DevTools, утечка внутренних путей/URL, отсутствие уровней логирования; при этом «структурированное логирование» заявлено в README.
**Фикс.** `src/utils/logger.ts` с `if (import.meta.env.DEV)`; правило `no-console: error` для `src/**` кроме logger.

### QA-27 (P2). Нативные `alert()`/`prompt()` вместо своих модалок

`src/core/auth.ts:505`:
```ts
alert(`Ссылка для входа отправлена на ${email}.\nПроверьте почту.`);
```
ещё 10 вызовов (532, 612, 621, 625, 632, 646, 652, 661, 663, 772) — обработка входа, Google-ошибки, пароли, удаление аккаунта. `src/core/session.ts:144` — `prompt("Введите время сессии (в минутах):")`.
**Влияние.** Блокирующие диалоги ломают UX PWA (особенно standalone), не стилизуются, не тестируются, не локализуются; нарушает паттерн `openConfirm` из README/GEMINI.
**Фикс.** Заменить на `showToast`/`openConfirm`; включить `no-alert: error` в eslint.

### QA-28 (P2). Недостижимый код в `calculateOverallAccuracy`

`src/core/stats.ts:277-298`:
```ts
export function calculateOverallAccuracy() {
  if (cachedAccuracy !== null) return cachedAccuracy;
  ...
  if (totalAttempts === 0) return 0;
  return Math.round((totalCorrect / totalAttempts) * 100);   // ← 291
  if (totalAttempts === 0) {                                  // ← недостижимо
    cachedAccuracy = 0;
    return 0;
  }
  cachedAccuracy = Math.round((totalCorrect / totalAttempts) * 100);
  return cachedAccuracy;
}
```
**Влияние.** `cachedAccuracy` не заполняется никогда → «оптимизация» не работает; `invalidateStatsCache` (`:543`) бесполезен; `eslint:recommended` правило `no-unreachable` должно ловить это как error (дыра в линте — см. QA-36).
**Фикс.** Удалить 292–297; если нужен кэш — сначала посчитать, потом кэшировать.

### QA-29 (P2). CSS: 143 КБ и 12 `@import`

`src/css/style.css:1-12`:
```css
@import url("./base.css");
@import url("./layout.css");
...
@import url("./listening.css");
```
15 файлов / 6501 строка / 143 399 байт; `components.css` — 2744 строки/60.8 КБ (41%); `layout.css` — 1153. В проде всё слипается в один `index-Cc2fZ-KO.css` **107.5 КБ** без критического разделения. `index.html:31-391` содержит 9187 символов inline-CSS, где 9 классов повторяют модульные (`modal`, `active`, `card`, `selected`, `show`, `visible`, `list-item`, `focus-mode`, `list-item-wrapper`); `index.html:200-390` — целый блок onboarding/bulk-выбора, который логично жить в CSS-файлах.
**Влияние.** Дубли правил → конфликты каскада; 107 КБ CSS render-blocking; правка стилей в двух местах.
**Фикс.** Слить CSS в 3 файла, inline оставить только «critical above-the-fold» (<4 КБ), остальное — сборкой; прогнать PurgeCSS.

### QA-30 (P2). Бандл и устаревший `dist`

`dist` (сборка 2026-11-20 18:27, исходники правились 2026-11-22 11:55):
| Артефакт | Размер |
|---|---|
| `assets/index-BmGu2LOk.js` | 430 641 Б |
| `assets/vendor-supabase-GG-Sp6Hl.js` | 173 381 Б |
| `assets/index-Cc2fZ-KO.css` | 107 578 Б |
| `assets/vendor-charts-IK6Vv9H5.js` | 107 062 Б |
| `assets/vendor-confetti-oQXWb4Lk.js` | 10 670 Б |
| `audio/*.mp3` (3 файла) | 9 739 206 Б |
**Механизм.** 25 HTML-шаблонов (84 559 Б) импортируются через `?raw` в `component_loader.ts:1-25` → все строки попадают в main-чанк (отсюда 430 КБ). `chart.js` и `confetti` импортированы статически (`stats.ts:7-8`, `app.ts:136`) → vendor-чанки грузятся на первом экране.
**Влияние.** Медленный старт на мобильных; `dist` устарел (пересобрать нельзя из-за QA-01) — деплой невоспроизводим.
**Фикс.** HTML — `import()` по требованию модалки (или fetch из `public/templates/`), chart.js — динамически, пересобрать dist после фикса.

### QA-31 (P2). `manualChunks` vs статические импорты

`vite.config.ts:99-103`:
```ts
manualChunks: {
  "vendor-supabase": ["@supabase/supabase-js"],
  "vendor-charts": ["chart.js"],
  "vendor-confetti": ["canvas-confetti"],
},
```
но `src/core/stats.ts:7-8`:
```ts
import confetti from "canvas-confetti";
import { Chart, TooltipItem, ScriptableContext } from "chart.js";
```
`stats.ts` статически импортируется `app.ts:125` → `vendor-charts` попадает в критический путь. Вдобавок `renderDetailedStats` (`stats.ts:640-661`) содержит **мёртвую** ветку динамической загрузки chart.js с CDN (`typeof Chart === "undefined"`) — она не может сработать, т.к. `Chart` уже импортирован (и CDN-скрипт `chartjs-cdn` — второй механизм загрузки).
**Влияние.** 107 КБ chart.js в первом экране; две конкурирующие стратегии загрузки; CSP/офлайн-риск от CDN-варианта.
**Фикс.** `const { Chart } = await import("chart.js")` внутри `renderDetailedStats`, удалить CDN-ветку.

### QA-32 (P2). Двойной конфиг PWA-кэша и дубль в precache

`vite.config.ts:51-83` описывает `workbox.runtimeCaching` для `html2canvas.hertzen.com` и Supabase REST; `src/sw.ts:33-126` регистрирует **свои** маршруты для тех же хостов/путей (плюс `quotes`, `user_lists`, `list_items`, аудио, шрифты). `devOptions.enabled: true` (`vite.config.ts:47-50`) держит SW включённым в dev.
В `dist/sw.js` precache = 23 записи, среди них `offline.html` **дважды** (revision `03fe021b…`), т.к. файл и в `includeAssets` (`vite.config.ts:24`), и в манифесте `__WB_MANIFEST`.
**Влияние.** Неочевидно, какой слой кэширования реально активен; в dev-режиме SW может отдавать устаревшие ассеты; дубль записи — мелочь, но признак непонимания конфига.
**Фикс.** Один источник (`sw.ts`, `injectManifest` уже включён), из vite-конфига убрать `workbox.runtimeCaching`; `devOptions.enabled: false`; убрать `offline.html` из `includeAssets`.

### QA-33 (P2). Тестовое окружение — «node с ручными моками DOM»

`vite.config.ts:107-118`: `environment: "node"`, `coverage.all: true`, но **нет `thresholds`**. `src/test-setup.ts:28-49` создаёт фейковый `document`:
```ts
// document мок (минимум,必要 для stats.ts и session.ts)
Object.defineProperty(window, "document", {
  writable: true,
  value: { getElementById: vi.fn(() => null), ... } as unknown as Document,
});
```
(комментарий с китайскими иероглифами «必要» — маркер копипасты из AI-генерации).
**Влияние.** DOM-логика (а её в core много — QA-09) тестами не покрывается принципиально; покрытие может падать незаметно.
**Фикс.** `environment: "jsdom"` (+ `happy-dom` для скорости), `coverage.thresholds: { lines: 30, functions: 30 }` с постепенным повышением; моки — только для внешних API.

### QA-34 (P2). Скрипты `package.json`

```json
"dev": "vite",
"build": "tsc && vite build",
"preview": "vite preview",
"check": "tsc --noEmit",
"deploy": "npm run build && npx gh-pages -d dist",
"lint": "eslint . --report-unused-disable-directives --max-warnings 0",
"format": "prettier --write .",
"test": "vitest"
```
Нет `typecheck` (есть `check`), нет `test:run` (CI вынужден звать `npx vitest run --coverage` напрямую), нет `format:check` (только разрушающий `format`), `deploy` не прогоняет `check/lint` перед сборкой (хотя `build` содержит `tsc`) и требует сеть через `npx`; `test` в watch-режиме опасен для скриптов/агентов.
**Фикс.** `"typecheck": "tsc --noEmit"`, `"test:run": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"format:check": "prettier --check ."`, `"deploy": "npm run typecheck && npm run lint && npm run build && gh-pages -d dist"` (gh-pages уже в devDeps — `npx` не нужен).

### QA-35 (P2). `endOfLine: "auto"` против `eol=lf`

`.prettierrc:19`: `"endOfLine": "auto"`; `.gitattributes:2`: `* text=auto eol=lf`; `.editorconfig` отсутствует; pre-commit отсутствует. Следствие видно в `lint.txt`: два новых файла без финального `\n` (prettier ловит), но политика переносов не зафиксирована.
**Влияние.** На Windows-машинах prettier может хотеть CRLF, git — LF; «шумные» диффы и красный линт после клонирования.
**Фикс.** `endOfLine: "lf"`, `.editorconfig` (`end_of_line = lf`), husky + lint-staged (`prettier --write` на staged).

### QA-36 (P2). ESLint-конфиг: противоречия и пробелы

`eslint.config.ts`:
```ts
{ ignores: ["dist", "supabase/functions/**"] },
...
"@typescript-eslint/no-unused-vars": ["warn", {...}],
"@typescript-eslint/no-explicit-any": "error",
// type-info rules (strict-boolean-expressions, prefer-nullish-coalescing,
// prefer-optional-chain, no-floating-promises, return-await) require
// parserServices and are intentionally omitted to keep linting simple.
"no-console": ["warn", { allow: ["warn", "error", "info"] }],
...
prettierRecommended,
```
1) `warn` + `--max-warnings 0` = «warning-как-error» — противоречивая политика (доказана `lint.txt`).
2) Type-aware правила отключены осознанно — отсюда 26 `as unknown as` и потенциальные floating promises.
3) `prettierRecommended` (eslint-plugin-prettier/recommended) уже включает `eslint-config-prettier`; отдельная зависимость `eslint-config-prettier` (`package.json:23`) — мёртвая.
4) `ignores` не покрывает `coverage/` (появится после `vitest --coverage` → eslint будет пытаться линтить HTML-отчёт).
5) Нет `no-alert`, `import/no-cycle`, `import/first`, `no-restricted-globals`.
**Фикс.** Разделить «style» и «correctness» настройки; `no-console: "error"` + logger; добавить плагины `import`, `eslint-plugin-jsdoc` при желании; `ignores: ["dist","coverage","supabase/functions/**"]`.

### QA-37 (P2). `gh-pages`-деплой противоречит содержимому ветки

`package.json:10` публикует `dist` в ветку `gh-pages`; фактически в ветке 121 файл (80 из `src`, 0 из `dist`, 0 из `node_modules`), включая `index.html` со ссылкой `/src/app.ts`, `log.txt`, `run_worker.bat`, `settings.json`, `requirements.txt`, `__pycache__`, `ts-check.yml`. Ветка — предок main, отстаёт на 18 коммитов.
**Влияние.** Первый же `npm run deploy` перезапишет «историю» неожиданным содержимым; текущее состояние опубликовано неизвестно откуда; нет владельца процесса.
**Фикс.** Пересоздать ветку из чистой сборки; перейти на GitHub Actions Pages (без долгоживущей ветки); в README описать процесс.

### QA-38 (P2). Раздутая git-история

`git cat-file --batch-all-objects`: 1589 blob’ов, 92.87 МБ; 13 blob’ов >1 МБ, среди них:
- `node_modules/@esbuild/win32-x64/esbuild.exe` — 9 913 856 Б;
- `node_modules/typescript/lib/typescript.js` — 9 112 572 Б;
- `node_modules/typescript/lib/_tsc.js` — 6 213 092 Б;
- `log.txt` — 4 998 209 и 3 006 671 Б (в ветке gh-pages);
- `@rollup/*.node`, `vite/chunks/*.js`, `lib.dom.d.ts` — 1.8–2.5 МБ.
`git count-objects -vH`: 2098 loose-объектов, 29.72 MiB, `packs: 0`, `garbage: 0`.
**Влияние.** Долгий clone/fetch; репозиторий на порядок больше кода; риск лимитов GitHub.
**Фикс.** `git filter-repo` (удалить `node_modules/**`, `log.txt`, старые `dist`), затем `git gc --aggressive --prune=now`; включить size-check в CI (например, `git-sizer`).

### QA-39 (P2). Аудио в репозитории

`git ls-tree -r -l HEAD` — три крупнейших blob’а:
```
3329715 public/audio/Future Bass Pop (Instrumental).mp3
3305892 public/audio/K-Drama Study (Instrumental).mp3
3103599 public/audio/Seoul Lounge (Instrumental).mp3
```
Итого 9.74 МБ; Vite копирует их в `dist/audio` (деплой-артефакт тоже +9.7 МБ), SW кэширует `CacheFirst` до 200 mp3.
**Фикс.** Перенести в Supabase Storage/CDN (уже есть bucket `audio-files`), в репозитории оставить JSON-манифест.

### QA-40 (P2). `dist` — смесь артефактов

`dist/_redirects` (19 байт, Netlify) от 2026-03-10, `dist/audio/*` — от 2026-02-27, `dist/offline.html` — 2026-11-19, ассеты — 2026-11-20. В одном каталоге: PWA precache-манифест, Netlify-файл, статическое аудио. `.gitignore` содержит `dist`, поэтому артефакт не в git — но и не воспроизводим (QA-01).
**Фикс.** Чистая пересборка, `_redirects` — только если выбран Netlify; аудио — с CDN.

### QA-41 (P2). Документация: структура и языки

- README: двойная нумерация (`### 1. Core` :37, `### 2. UI` :49, `### 3. Backend Functions` :57 — затем снова `### 1. Клонирование` :82, `### 2. Настройка окружения` :90, `### 3. Применение миграции` :112, `### 4. Запуск` :130, `### 5. Сборка` :136);
- README:220 — «**P0 (kritisch** — до релиза)»: немецкое слово в русском документе;
- README:124 — «**М**igration включает:»: кириллическая «М» в латинском слове (поиск/копипаста сломаются);
- GEMINI.md:57-92 — code fence открыт на :57 (` ```typescript `), внутри — `import`, затем **заголовок** `## Key Features`, затем `class MyFeatureComponent extends BaseComponent {`, и только на :92 блок закрывается; смысловые разделы перемешаны (архитектура, features, guidelines в одном блоке).
**Влияние.** Документ нельзя использовать как источник правды; ИИ-агенты (для которых он и написан) получат искажённый контекст; поиск по «Migration» не находит строку.
**Фикс.** Переписать GEMINI.md валидным markdown (правила → таблица, пример кода отдельно), вычитать README, добавить TOC и раздел «Deployment».

### QA-42 (P2). Отсутствие базовых проектных файлов

`git ls-files '*.md'` → только `GEMINI.md` и `README.md`. Нет `LICENSE` (при строке README:254 «License: Proprietary / Private»), `CONTRIBUTING.md`, `CHANGELOG.md`, `CODEOWNERS`, `.nvmrc`, `engines` в `package.json`, dependabot/renovate, `.editorconfig`.
**Влияние.** Юридическая неопределённость для «проприетарного» проекта; невозможно воспроизвести Node-версию; нет процесса обновления зависимостей и changelog — «P0/P1 закрыты» недоказуемы.
**Фикс.** LICENSE, CHANGELOG (keep-a-changelog), CONTRIBUTING, `.nvmrc`+`engines`, dependabot.

### QA-43 (P3). PWA-иконки только SVG

`vite.config.ts:38-45`:
```ts
icons: [
  {
    src: "/app-logo.svg",
    sizes: "any",
    type: "image/svg+xml",
    purpose: "any maskable",
  },
],
```
**Механизм.** Один SVG-файл помечен сразу `any maskable`; в манифесте нет PNG 192×192/512×512.
**Влияние.** На части Android/Chrome установка PWA и маска иконки могут отображаться некорректно; `maskable` для SVG поддержан не везде.
**Фикс.** Добавить PNG 192/512 отдельными записями `purpose: "any"` и `purpose: "maskable"`.

### QA-44 (P3). Dev-сервер недоступен из LAN

`vite.config.ts:87-94`:
```ts
server: {
  host: "localhost",
  port: 5173,
  hmr: { protocol: "ws", host: "localhost" },
},
```
**Механизм.** Привязка к `localhost` не даёт открыть приложение с телефона/другого устройства в той же сети.
**Влияние.** PWA/офлайн/мобильный UX нельзя проверить вручную без туннеля.
**Фикс.** `host: true` (или `0.0.0.0`) в dev-режиме; hmr host оставить auto.

### QA-45 (P3). Три `deno.json` и осиротевший конфиг

- `deno.json:2-5` — корневой import map (`std/`, `@supabase/supabase-js`), на корне не используемый;
- `supabase/functions/deno.json:1-13` — рабочий import map (`shared/`, `zod`, `imagescript`, `nodeModulesDir: auto`);
- `supabase/functions/generate-word-data/deno.json:1-10` — копия import map без `lint`/`fmt`/`nodeModulesDir`.
**Механизм.** Один и тот же import map продублирован трижды; правка одной копии не доезжает до других.
**Влияние.** Дрейф версий Deno/npm-импортов; непонятно, какой конфиг «главный».
**Фикс.** Один import map в `supabase/functions/deno.json`, вложенный конфиг удалить; `find-confusing-words/deno.json` (остался в HEAD без кода функции) — удалить.

### QA-46 (P3). Мелкие дефекты

- `index.html:12` — `apple-touch-icon` с `https://cdn-icons-png.flaticon.com/...`: внешняя зависимость и вопрос лицензии для «proprietary»-проекта; нужна локальная иконка.
- `src/core/pwa.ts:74-81` — обработчик `controllerchange` содержит только флаг `refreshing` и комментарий, ничего не делает:
```ts
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (refreshing) return;
  refreshing = true;
  // Автоматическая перезагрузка при смене контроллера SW отключена,
```
- `src/core/network.ts:60-66` — при отсутствии `#offline-indicator` создаёт его заново, хотя элемент уже есть в `index.html:446` (двойная ответственность).
- `src/utils/utils.ts:52` — `ICONS_MAP` используется лишь в 2 местах (3 ссылки с определением), почти мёртвый экспорт.

---

## 4. Таблица (а). Заявления документации vs реальность

См. подробную таблицу в QA-18 (15 строк: README/GEMINI → факт → вердикт). Сводка: **6 ложных**, **4 частично**, **4 истинных**, **2 непроверяемых локально**. Главная проблема: README:220-240 объявляет закрытыми P0/P1-пункты, которые в текущем дереве не выполнены (сборка/линт красные, Edge-тесты фиктивны, логирование не структурировано).

---

## 5. Таблица (б). Метрики кода: топ-15 файлов

Метод: `(Get-Content | Measure-Object -Line)`, PowerShell 5.1; размеры в байтах; замечания — из разборов.

| # | Файл | Строк | Байт | Замечание |
|---|---|---|---|---|
| 1 | `src/app.ts` | 1647 | 63 306 | God Object; 89-case роутер (399–811); импорты в середине (149/1099/1104); дубль `measurePing` |
| 2 | `src/ui/quiz.ts` | 1603 | 54 383 | монолит без `BaseComponent`; 30 функций, 21 module-level `let` |
| 3 | `src/core/stats.ts` | 1476 | 53 035 | логика+DOM+7 чартов+модалка; недостижимый код 290–297; импорт `ui` |
| 4 | `src/ui/ui_custom_words.ts` | 1138 | 44 317 | монолит; 19 `innerHTML`; 10 `setTimeout` |
| 5 | `src/ui/ui_settings.ts` | 1116 | 38 425 | монолит; файл целиком `eslint-disable no-console` |
| 6 | `src/ui/quiz_strategies.ts` | 1109 | 45 602 | 50 `innerHTML` (максимум); циклический с `quiz.ts` |
| 7 | `src/core/db.ts` | 913 | 34 525 | 15 копипаст-функций сохранения (744–911); дубль `isDatabaseActive` |
| 8 | `src/core/auth.ts` | 908 | 33 832 | 11 `alert()`; 4 `as unknown as`; 57 `document.` в core |
| 9 | `src/ui/ui_writing.ts` | 886 | 32 295 | 32 КБ; дублирует `updateTimerDisplay` из session |
| 10 | `src/ui/ui_card.ts` | 830 | 28 902 | дублирует `getAccuracy`/`setupLongPress` из `core/renderer` |
| 11 | `src/ui/ui_onboarding.ts` | 800 | 27 103 | экран без `BaseComponent` |
| 12 | `src/ui/ui_collections.ts` | 789 | 30 872 | дубль `setCollectionFilter` |
| 13 | `src/utils/utils.ts` | 744 | 22 537 | «сборная солянка» (TTS/DOM/форматтеры); 13 `setTimeout` |
| 14 | `src/ui/ui_filters.ts` | 627 | 22 934 | нет `BaseComponent`-контроллера для панели фильтров |
| 15 | `src/core/renderer.ts` | 608 | 21 872 | импортирует `ui`, участвует в цикле, комментарий «Цикл безопасен» |
| — | `src/css/components.css` | 2744 | 60 795 | 41% всего CSS; 9 дублей с inline `index.html` |
| — | `src/css/layout.css` | 1153 | 24 711 | 6 пересечений селекторов с components.css |
| — | `src/html/auth.html` | 680 | 26 383 | инлайнится в main-чанк через `?raw` |

**Итого по `src`:** 73 `.ts` = 22 169 строк; все исходники (`ts+html+css`) — 113 файлов / 31 017 строк; `git ls-files` — 191 файл.

---

## 6. Таблица (в). Зависимости

| Пакет | Раздел | Версия | Нужен? | Риск/замечание |
|---|---|---|---|---|
| `node-fetch` | dependencies | ^2.7.0 | **НЕТ** (0 импортов в `src`/`supabase/functions`) | Deprecated (v3 ESM); лишний install; кандидат на удаление |
| `@types/node-fetch` | devDependencies | ^2.6.13 | **НЕТ** | Осиротел вместе с `node-fetch` |
| `imagescript` | dependencies | ^1.3.1 | **НЕТ** для клиента | Edge Functions используют `deno.land/x/imagescript@1.2.15` — drift версий |
| `@google/generative-ai` | dependencies | ^0.24.1 | **НЕТ** для клиента | Edge Functions — `npm:@google/generative-ai@0.22.0`; drift |
| `@supabase/supabase-js` | **devDependencies** | ^2.99.2 | ДА, runtime | Семантически должен быть в `dependencies` |
| `chart.js` | dependencies | ^4.5.1 | ДА | 107 КБ в initial load из-за статического импорта (QA-31) |
| `canvas-confetti` | dependencies | ^1.9.4 | ДА | 10.7 КБ чанк; импортируется 8 файлами |
| `workbox-background-sync/cacheable-response/expiration/routing/strategies` | dependencies | ^7.4.0 | Дублируют транзитивные deps `vite-plugin-pwa` | Версии могут разъехаться с встроенными; в `dist/sw.js` — workbox 7.3.0, а в манифесте `^7.4.0` |
| `workbox-core/precaching/window` | devDependencies | ^7.0.0 | То же | Ещё одна версия workbox |
| `vite-plugin-pwa` | devDependencies | **1.2.0** (exact) | ДА | Остальные `^`; точный пин без причины |
| `gh-pages` | devDependencies | ^6.3.0 | ДА (для ручного деплоя) | Процесс не автоматизирован (QA-04/37) |
| `jiti` | devDependencies | ^2.6.1 | ДА | Нужен для `eslint.config.ts` (TS-конфиг) |
| `vitest`, `@vitest/coverage-v8` | devDependencies | ^4.1.0 | ДА | Порогов покрытия нет (QA-33) |
| `typescript`, `eslint`, `prettier`, `typescript-eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `globals`, `vite` | devDependencies | актуальные | ДА | `eslint-config-prettier` дублируется внутри `prettierRecommended` (QA-36) |

`package-lock.json`: `lockfileVersion: 3`, 608 пакетов, **синхронизирован** с `package.json` (root `""` specs совпадают и в HEAD, и в worktree; 0 missing/mismatch). Uncommitted-диф — `1 insertion, 34 deletions`: удалены optional `@types/babel__generator/template/traverse`, добавлен флаг `peer: true` у `@vitest/coverage-v8`-зависимости — косметика, `npm ci` не сломает.

---

## 7. Таблица (г). Тесты

| Файл | Тестов | Что проверяет | Вердикт |
|---|---|---|---|
| `src/core/scheduler.test.ts` | 12 | SM-2: интервалы, EF-границы, fuzz, soft-lapse, приоритет очереди | **Ценно** (единственный настоящий модульный тест) |
| `src/core/stats.test.ts` | 9 | `getXPForNextLevel`, `getTotalXP`, защита от зацикливания `addXP`, `checkWeeklyReset`, состав `LEAGUES` | **Частично ценно** (написано аккуратно, моки корректны; нет проверки `getRole`/ачивок) |
| `src/core/session.test.ts` | 6 | заявлены pause/resume/end/ensure; фактически ассерты в не ждущихся `import().then()` | **Фикция** (проверяет ничего) |
| `src/core/db.test.ts` | 2 | `state.dirtyWordIds` — это `Set`, и `add/has` работают | **Фикция** (модуль `db.ts` не импортируется) |
| `src/test-setup.ts` | — | самодельные моки `window/document/localStorage/matchMedia` | Инфраструктура; комментарий-мусор «必要» (:28) |
| **Итого vitest** | **29** | | реальны ~21 (72%), фиктивны 8 (28%) |
| `supabase/functions/check-essay.test.ts` | 2 | константы `GEMINI_MODELS`, `LIMITS` | **Фикция** (не вызывает функцию) |
| `supabase/functions/ocr-image.test.ts` | 2 | константы, `corsHeaders["Access-Control-Allow-Methods"]` | **Фикция** |
| `supabase/functions/regenerate-image.test.ts` | 2 | константы + CORS-заголовки | **Фикция** |
| **Итого Deno** | **6** | | реально проверяют 0 Edge-функций |

Примечание: в описании задачи фигурировали «4 Deno-теста»; фактически (glob/`git ls-files`) — **3 файла**, 6 тестов, все на верхнем уровне `supabase/functions/`. В CI они запускаются `deno task test` (`deno.json:8`), форматирование/линт — `deno fmt/lint supabase/functions` (`deploy.yml:75-79`). Локально Deno недоступен → `deno fmt --check`/`deno lint` не проверены (см. «Ограничения»).

Ключевые непокрытые модули: `auth.ts` (908 строк!), `sync.ts`, `quiz.ts`/`quiz_strategies.ts`, `network.ts`, `ui_settings.ts`, `supabaseClient.ts` (retry-логика), `pwa.ts`, `renderer.ts`.

---

## 8. Таблица (д). CI-шаги (`.github/workflows/deploy.yml`)

| Шаг | Строки | Работает? | Замечание |
|---|---|---|---|
| Checkout / Setup Node 20 | 24-31 | ✅ | Node «20» удовлетворяет Vite 7 (^20.19), но не зафиксирован минор; `cache: npm` |
| `npm ci` | 33-34 | ✅ (lock синхронизирован) | Uncommitted-диф lock не влияет на CI (используется HEAD) |
| Create `.env` через `printf` | 36-41 | ⚠️ | Не экранирует `\n`/`%` в секретах; лучше `env:`/`>> $GITHUB_ENV` |
| `npm run check` (tsc) | 43-44 | ❌ | TS6133 `app.ts:149` (QA-01) |
| `npm run lint` | 46-47 | ❌ | 2 error + 2 warning при `max-warnings 0` (QA-02) |
| `npm run build` | 49-50 | ❌ (после check) | сломан тем же TS6133 |
| `npx vitest run --coverage` | 52-53 | ⚠️ | Не проверено (в песочнице Lead — `spawn EPERM`); пороги coverage отсутствуют |
| Upload coverage artifact | 55-60 | ✅ | retention 5 дней; артефакт нигде не анализируется |
| Setup Deno `v2.9.6` | 62-65 | ✅ | Релиз существует (github.com/denoland/deno/releases/tag/v2.9.6) |
| Cache Deno `~/.deno` | 67-73 | ⚠️ | Ключ по обоим `deno.lock` (корень + `supabase/functions`) — ок; но npm-кэш Deno (`nodeModulesDir: auto`) не входит |
| `deno fmt --check supabase/functions` | 75-76 | ❓ | Не проверено (Deno нет локально); конфиг fmt `lineWidth: 80` |
| `deno lint supabase/functions` | 78-79 | ❓ | `node_modules` Deno исключает сам; `lint.tags: recommended` |
| `deno task test` | 81-87 | ⚠️ | Запускает только 3 верхнеуровневых `*.test.ts` (6 тестов на константы, QA-17); секреты пробрасываются |
| **Deploy Edge Functions** | 89-105 | ⛔ | `needs: test` → никогда не выполнится при красных проверках; `supabase/cli@latest` не запинен; `--project-ref` из секрета |
| **Deploy frontend** | — | ❌ | **Отсутствует** (QA-04) |

Workflow-уровень: `permissions: contents: read` (12-13), `concurrency: cancel-in-progress: true` (15-17), ветки `main` push/PR + `workflow_dispatch` (3-10). SHA-пиннинга actions нет (QA-19).

---

## 9. «Хорошо сделано»

1. **RLS-миграция** `supabase/migrations/0001_initial_rls.sql` (301 строка): `is_admin()` SECURITY DEFINER + `SET search_path`, RLS на 11 таблицах, политики для `storage.objects` (public read / owner write / admin all), комментарии. Уровень выше среднего для соло-проекта.
2. **`_shared/utils.ts`**: `createErrorResponse` не отдаёт 5xx-детали клиенту (`:46-52`), единый CORS-preflight (`:79-81`), `withTimeout` — правильная идея.
3. **CORS**: явный список методов `GET, POST, DELETE, OPTIONS` (`_shared/constants.ts:1-6`), allow-list хостов картинок для SSRF-защиты (`:33-39`), лимиты входных данных (`:42-54`).
4. **Durable outbox** в `sync.ts`: `readOutbox/writeOutbox/clearOutbox`, флаг `state.isSyncing` выставляется до `await` (комментарий `:63-65`), батчи по 100 для `user_progress` — грамотно.
5. **SM-2-тесты** (`scheduler.test.ts`, 12 тестов): реальные расчёты интервалов, EF, fuzz, soft-lapse — этот файл можно показывать как пример.
6. **PWA precache**: `dist/sw.js` содержит валидный манифест ровно из 23 записей (offline.html, app shell, все чанки, worker), `createHandlerBoundToURL("/offline.html")` корректен.
7. **`.env.example`**: 40+ строк с объяснением, какие переменные публичные (`VITE_*`), какие серверные, алиасы секретов — очень хорошая гигиена.
8. **Константы**: `LS_KEYS`/`DB_TABLES`/`SW_MESSAGES` в `src/core/constants.ts` — вместо магических строк.
9. **`package-lock` в синхроне** с `package.json`; версии зависимостей современные (Vite 7.3.1, TS 5.9.3, Vitest 4.1).
10. **`BaseComponent`** сам по себе реализован аккуратно: реестр инстансов, отложенная инициализация, `listen`/`addEvent` с автоотпиской, совместимость с DOM-событием `"state-changed"` — жаль, что применён лишь к 14/36 файлам.

---

## 10. Ограничения аудита

1. **Deno не установлен** в аудиторском окружении (`Get-Command deno` → нет) → `deno check`, `deno fmt --check`, `deno lint`, `deno test` **не прогонялись**; выводы о Deno-тестах — статические (чтение файлов, размеры, отсутствие импортов функций).
2. **Vitest не запускался**: в окружении Lead `npx vitest run` упал на `spawn EPERM` (`audit/logs/test.txt`) — это ограничение песочницы, а не проекта. Реальное pass/fail тестов не подтверждено; фиктивность `session.test.ts` установлена чтением кода (ассерты вне `await`).
3. **`npm audit`/`npm outdated` не выполнялись** (сетевые/установочные операции запрещены правилами). Риски зависимостей оценены статически (unused, deprecated, drift), без CVE-скоринга.
4. **«RLS применена к реальной БД»** проверить невозможно без доступа к проекту Supabase; проверено только наличие и качество файла миграции. Клейм README помечен «непроверяемо локально».
5. **`supabase/.temp/*`** не открывались по содержимому (там может быть project-ref); проверен только факт трекинга.
6. **`.env`** в рабочей папке существует, но не читался (правило «не печатать секреты»); проверено лишь, что он в `.gitignore` и не трекается.
7. **`dist`** анализировался как артефакт (размеры/манифест/ссылки), пересобрать его нельзя без исправления QA-01; размеры могут слегка отличаться от актуальной сборки.
8. **Проверка версии Deno** выполнена веб-поиском: релиз `v2.9.6` существует ([github.com/denoland/deno/releases/tag/v2.9.6](https://github.com/denoland/deno/releases/tag/v2.9.6)) — замечание о несуществующей версии снято.
9. **Размеры/строки** считались PowerShell 5.1 (`Measure-Object -Line`); расхождение ±1 строка из-за финальных переводов строк. Заявленные в задаче числа (app.ts 1514, quiz.ts 1411, db.ts 809) **устарели** — файлы изменены сегодня; в отчёте фактические цифры.
10. **Глубокий разбор бандла** (430 КБ `index.js`) не делался: метрики взяты по размерам чанков и конфигурации, без анализа состава.
11. **`package-lock`** разбирался node-скриптом (PowerShell 5.1 `ConvertFrom-Json` падает на этом lock-файле — особенность PS, не файла).

---

## 11. Кросс-скоуп

| Тема | Кому передать | Что уже видно из моего скоупа |
|---|---|---|
| Auth/XSS/RLS/секреты, `alert()`-в-`auth.ts`, `innerHTML`-риски, Supabase-политики | **security-auditor** | 240 `innerHTML` в `src` (quiz_strategies — 50); `window_bindings` публикует 60+ функций глобально; 11 `alert()` в auth; RLS-миграция выглядит качественно |
| `db.ts`/`state.ts`/IDB/sync/outbox/PWA/SW | **data-auditor** | Двойная запись словаря (IDB+localStorage, `db.ts:876-889`); SW-роуты в двух местах (QA-32); `vocabulary`-кэш `StaleWhileRevalidate` |
| SM-2/XP/уровни/квизы/speech/audio | **logic-auditor** | `addXP` guard=1000 (stats.ts:108-118); мёртвый unreachable-код (QA-28); 21 module-level переменная в quiz (QA-12) |
| Edge Functions/схема БД/миграции/CORS/verify_jwt | **backend-auditor** | 12/12 `verify_jwt = true`; миграция не покрывает `articles` и `feedback_attachments`; 3 фиктивных теста (QA-17); дублирование import map (QA-45) |
| UI/HTML/CSS/a11y/производительность | **frontend-auditor** | 25 HTML-шаблонов 84.5 КБ в main-чанке; 143 КБ CSS + 9.2 КБ inline; `BaseComponent` 14/36 (QA-08); `index.html` с inline-`oninput`-подобными обработчиками (`onerror`, `onload`) |
| Эталонные прогоны, финальный синтез | **lead** | `audit/logs/*` использованы как первичные доказательства QA-01/02/03; расхождение: tsc-лог только 1 ошибка, но lint добавляет 2 error + 2 warning |
| Общая дельта «заявлено → реально» | **lead** | Таблица (а)/QA-18: 6 ложных, 4 частичных, 4 истинных, 2 непроверяемых утверждения |

---

*Отчёт подготовлен: quality-auditor, 2026-11-22. Только чтение и read-only git; исходники и конфиги не изменялись. Единственный записанный файл — этот отчёт.*
