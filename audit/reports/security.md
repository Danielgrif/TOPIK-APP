# Аудит безопасности — TOPIK II Master Pro

**Роль:** AppSec-аудитор (teammate `security-auditor`), режим «гипер-критичный аудит».
**Дата:** 2026-11-22.
**Репозиторий:** ветка `main`, commit `cc7f8333272c715de22d1a883b924bb576f2cbd0`.
**Состояние дерева:** рабочее дерево «грязное» — аудировалось как есть:
- изменены: `package-lock.json`, `src/app.ts`, `src/core/db.ts`, `src/core/pwa.ts`, `src/core/stats.test.ts`, `src/core/stats.ts`, `src/core/sync.ts`, `src/ui/ui_leaderboard.ts`, `src/ui/ui_share.ts`, `supabase/functions/generate-word-data/deno.json`;
- удалены: `__pycache__/content_worker.cpython-313.pyc`, `index.ts`, `requirements.txt`, `settings.json`, `supabase/functions/find-confusing-words/deno.json`, `supabase/functions/regenerate-image/settings.json`;
- не отслеживаются: `audit/`, `src/core/network.ts`, `src/core/xp.ts`.

**Метод:** статический анализ чтением кода (read/grep), сверка клиента с миграцией RLS и Edge Functions. Сборка/тесты/lint не запускались (эталонные прогоны — за Lead; использованы `audit/logs/tsc.txt`, `audit/logs/lint.txt`). Динамические проверки против живого Supabase/Deno не выполнялись.

**Охват:** `src/core/auth.ts`, `auth_service.ts`, `supabaseClient.ts`, `network.ts`, `sync.ts`, `window_bindings.ts`; `supabase/migrations/0001_initial_rls.sql` (полнота RLS, SECURITY DEFINER, Storage-политики, админ-проверки); все 12 Edge Functions в `supabase/functions/**` + `_shared/*` (JWT, авторизация, CORS, валидация, service-role, rate limiting, утечки ошибок, IDOR, SQLi через фильтры/RPC, SSRF, prompt injection); `supabase/config.toml`; `.env`/`.env.example`; `index.html` (inline JS/CSS → CSP); `.github/workflows/deploy.yml`; XSS-синки (`innerHTML`/`insertAdjacentHTML`/`outerHTML`/`document.write`/`eval`/`new Function`) по всему `src/`; Supabase-сессия в localStorage; `public/_redirects`; PWA/Service Worker; утечки PII в логи.

### Прочитанные файлы (полный список)

**Корень:** `README.md`, `GEMINI.md`, `package.json`, `package-lock.json` (diff --stat), `vite.config.ts`, `index.html`, `deno.json`, `.env` (только имена/длины переменных, значения не выводились и не цитируются), `.env.example`, `.gitignore`, `.gitattributes`, `audit/logs/tsc.txt`, `audit/logs/lint.txt`.

**src/core:** `auth.ts` (полностью, 907 стр.), `auth_service.ts`, `supabaseClient.ts`, `network.ts`, `sync.ts`, `window_bindings.ts`, `constants.ts`, `env.ts`, `db.ts` (выборочно: строки 380–499, 734–912 + diff), `renderer.ts` (частично: 250–607), `stats.ts` (фрагменты), `speech.ts` (1–170), `backup.ts`, `storage_idb.ts` (1–40), `xp.ts`.

**src:** `sw.ts`, `app.ts` (выборочно: 990–1120, 1490–1550, grep по всему файлу), `utils/utils.ts` (1–40 + grep).

**src/ui:** `ui_admin.ts`, `ui_feedback.ts`, `ui_leaderboard.ts`, `ui_modal.ts`, `ui_reading.ts`, `ui_data.ts`, `ui_quotes.ts` (1–60), `component_loader.ts`, `ui_custom_words.ts` (фрагменты 630–729 + grep), `ui_collections.ts` (фрагменты 380–430, 740–790 + grep), `ui_card.ts` (фрагменты 595–635), `ui_failed_requests.ts` (100–145), `ui_trash.ts` (80–125), `ui_mistakes.ts` (130–175), `ui_review.ts` (60–176), `ui_writing.ts` (grep + 250–300, 520–600), `ui_share.ts` (1–60), `ui_settings.ts` (300–345 + grep), `quiz.ts` (860–990 + grep), `quiz_strategies.ts` (150–330 + grep), `ui_retry.ts` (grep).

**supabase:** `config.toml`, `migrations/0001_initial_rls.sql` (полностью), `functions/deno.json`, `functions/constants.ts`, `functions/check-essay.test.ts`, `functions/ocr-image.test.ts`, `functions/regenerate-image.test.ts`, все 12 `functions/*/index.ts` (`background-worker`, `check-essay`, `delete-user`, `generate-media-for-word`, `generate-word-data`, `get-feedback-reports`, `ocr-image`, `process-word-request`, `regenerate-image`, `retry-word-request`, `submit-feedback`, `update-feedback-status`), `functions/_shared/{audio,auth,clients,constants,tts,types,utils,validation}.ts`.

**public / CI:** `public/_redirects`, `public/offline.html`, `.github/workflows/deploy.yml`, `.vscode/settings.json`. Также просмотрены `git status`, `git diff` (весь рабочий diff src), содержимое `supabase/.temp/*` и `supabase/.branches/_current_branch` (без вывода значений секретов).

---

## Вердикт

Архитектурно заложены неплохие основы: все функции, кроме `background-worker`, проверяют JWT и берут `user.id` только из токена; в `process-word-request`, `retry-word-request`, `generate-media-for-word` есть корректная проверка владельца объекта; `escapeHtml()` реализован без ошибок и применён в большинстве мест рендера; SSRF в `regenerate-image` ограничен allowlist'ом https-хостов; `createErrorResponse()` не отдаёт клиенту детали 5xx. Однако в текущем виде проект **не готов к продакшену**: в RLS-миграции есть **P0-повышение привилегий до admin** (политика `profiles_insert_self` разрешает вставить себе `role='admin'`), в `regenerate-image` — **IDOR на запись** (любой вошедший пользователь меняет картинку любой словарной статьи), а политики `vocabulary` позволяют любому пользователю **публиковать произвольный контент в общий словарь** — вместе с неэкранированным `word.level` в `ui_mistakes.ts` это образует цепочку stored XSS. Платный AI/OCR/поиск картинок **не имеют серверного rate limiting** (единственный лимит обходится удалением своих строк), `background-worker` при `verify_jwt = true` **физически не может быть вызван по cron** с `CRON_SECRET`, а живые секреты (service-role, Gemini, Pixabay) лежат в `.env` внутри OneDrive-синхронизируемой папки. При этом CSP и security-заголовков **нет вообще**, а сессия Supabase хранится в `localStorage` — любая XSS-находка немедленно конвертируется в захват аккаунта и (после P0) в admin-доступ. Дополнительно CI сейчас красный (tsc/lint), т.е. деплой заблокирован — это единственная «хорошая» новость в текущем состоянии.

---

## Сводная таблица находок

| ID | Severity | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| SEC-01 | **P0** | RLS / Privesc | `supabase/migrations/0001_initial_rls.sql:174-177` (+13-29) | `profiles_insert_self` разрешает вставить себе `role='admin'`; триггера создания профиля в репо нет | Повышение до admin → чтение всех отчётов/email, все Storage-бакеты, запись `quotes`/`ai_cache` | `WITH CHECK (id = auth.uid() AND role = 'user')` + триггер/CHECK на role, INSERT отзывать |
| SEC-02 | P1 | IDOR / Edge | `supabase/functions/regenerate-image/index.ts:288-321, 202-205` | `mode=auto/finalize`: обновление `vocabulary` по `body.id` без проверки владельца (service role) | Любой пользователь подменяет картинку любого слова всем пользователям (дефейс) | Селект `created_by`/`user_id` по `id`, проверка `= user.id`, либо запрет `auto` от клиента |
| SEC-03 | P1 | RLS / контент | `supabase/migrations/0001_initial_rls.sql:50-59` | INSERT/UPDATE `vocabulary` проверяют только владельца, не `is_public`; любой может публиковать слова в общий словарь | Немодерируемый контент/мусор для всех, рост таблицы, payload-доставка (см. SEC-04) | Разрешить `is_public=true` только через Edge Function/admin; `WITH CHECK (... AND is_public = false)` |
| SEC-04 | P1 | Stored XSS | `src/ui/ui_mistakes.ts:155` (+SEC-03) | `${w.level}` вставляется в `innerHTML` без экранирования | XSS у других пользователей → кража session из localStorage → ATO | `escapeHtml(w.level)`, аудит всех `.level`-синков |
| SEC-05 | P1 | Rate limiting | `process-word-request/index.ts:118-127`; `generate-word-data/index.ts:175-187`; `check-essay:89`; `ocr-image:55`; `regenerate-image:217-232` | У AI/OCR/поиска нет серверных лимитов; единственный лимит считает строки таблицы, которую пользователь может удалять | Исчерпание квот Gemini/Pixabay/Unsplash, финансовый DoS | Лимиты в БД по (user, окно) с записью в append-only таблицу; лимиты на gateway; кэш-ключи с TTL |
| SEC-06 | P1 | Конфиг/аутентификация | `supabase/config.toml:52-54`; `background-worker/index.ts:19-24` | `verify_jwt=true` несовместим с `Authorization: Bearer ${CRON_SECRET}` (не JWT); `CRON_SECRET` нет в `.env` | Cron-воркер всегда 401 → не работает фоновый пайплайн медиа; конфиг противоречив | `verify_jwt=false` только для `background-worker` + сравнение секрета constant-time; либо подписанный JWT/`x-cron-secret` |
| SEC-07 | P1 | Секреты | `.env:1-7` (значения не выводятся); `.gitignore:1-5` | Живые `SUPABASE_SECRET_KEY`(service-role), `GEMINI_API_KEY`, `PIXABAY_API_KEY` в `.env` внутри OneDrive-папки; дубль `SUPABASE_SERVICE_KEY` (секрет в стр.3, publishable в стр.6) | Компрометация OneDrive/аккаунта = обход RLS по всей БД + расход AI; последнее значение дубля затирает секрет | Убрать из синхронизируемой папки, ротировать ключи, хранить в менеджере секретов; удалить дубль |
| SEC-08 | P1 | RLS-полнота | `src/ui/ui_reading.ts:38-41`; миграция не содержит `articles` | Клиент читает `articles` (`select("*")`), но политики/ENABLE RLS для таблицы в репо нет | Если RLS не включена отдельно — anon-чтение/запись контента, отравление данных | Добавить миграцию: `ENABLE RLS` + `SELECT USING(true)` + admin-write |
| SEC-09 | P1 | CSP/headers | `index.html:31-391`, `394-427`; `src/core/supabaseClient.ts:152-162` | Нет CSP/`X-Frame-Options`/HSTS/`X-Content-Type-Options`; inline `<script>` и ~360 строк inline `<style>`; сессия в localStorage | Любая XSS = ATO; кликджекинг; нет защиты от инъекций | Вынести скрипт/стили, ввести CSP (`script-src 'self'`; без `unsafe-inline`), `frame-ancestors 'none'`, настроить заголовки на хостинге |
| SEC-10 | P1 | Supply chain | `src/ui/ui_feedback.ts:165-176`; `index.html:14-28` | Runtime-подключение `https://html2canvas.hertzen.com/...min.js` без SRI; CSS Pretendard с jsDelivr без SRI | Компрометация домена/зеркала = произвольный JS в origin с сессией → ATO; CSS-инъекция | Self-host ассеты или `integrity`+`crossorigin`; запретить сторонние скрипты в CSP |
| SEC-11 | P2 | Целостность игры | `src/core/sync.ts:113-136`; миграция `141-146` | Клиент сам пишет `xp/level/coins/league/full_name` в `user_global_stats` (RLS разрешает любые значения) | Читерство в лидерборде, подмена имени/аватара в таблице лидеров | Считать прогресс на сервере (RPC/Edge Function) с валидацией, запретить прямой UPSERT клиенту |
| SEC-12 | P2 | Приватность/PII | `src/core/auth.ts:743-757`; `delete-user/index.ts:21-34` | «Удаление аккаунта» чистит клиентские таблицы, но не `feedback_reports`, `profiles`, `user_favorite_quotes`, `user_vocabulary`, вложения в Storage | Остаточные PII после «полного» удаления; нарушение обещаний и GDPR/152-ФЗ | Полное удаление на сервере (каскад FK + Storage + auth), идемпотентно, с логом |
| SEC-13 | P2 | Re-auth | `src/core/auth.ts:782-798`; `src/ui/ui_data.ts:105-133`; `delete-user/index.ts:21-34` | Пароль запрашивается только на клиенте; `delete-user`/сброс прогресса не требуют повторной аутентификации на сервере | Украденный JWT/XSS удаляет аккаунт/прогресс без пароля, необратимо | Для destructive-операций: серверная проверка свежего пароля/`nonce`; Edge Function должна требовать re-auth токен |
| SEC-14 | P2 | Service Worker/PII | `src/sw.ts:102-126, 128-139`; `src/core/auth.ts:683-700` | SW кэширует ответы REST (`/user_lists`, `/list_items`) по URL; BackgroundSync хранит запросы с `Authorization` в IndexedDB; кэши не чистятся при logout | Cross-user утечка данных на общем устройстве, реплей старых токенов | Purge `caches`/`workbox-background-sync` при logout; не кэшировать персонализированные запросы; `Vary`/cache-key по user |
| SEC-15 | P2 | Logout/сессии | `src/core/auth.ts:683-700`; `src/core/db.ts:875-882` | Logout не чистит SW-кэши и IndexedDB; явно удаляются устаревшие ключи (`sb-supabase-auth-token`), а реальный ключ — `sb-<ref>-auth-token`; VOCAB кэш намеренно сохраняется | На общем устройстве следующий пользователь видит приватные слова предыдущего; сессия может «воскреснуть» | Очищать `localStorage` по префиксу `sb-`, `caches`, IndexedDB; либо `persistSession:false` + session в памяти |
| SEC-16 | P2 | Утечка токена в лог | `src/core/supabaseClient.ts:57-58, 136-140` | `console.warn(..., init)` печатает `init` с заголовком `Authorization: Bearer <access_token>` при таймауте/ретрае | Токен сессии в консоли (screen sharing, сбор логов, сторонние SDK) | Не логировать headers/`init`; заменять токен на `***` |
| SEC-17 | P2 | Storage/upload | `src/core/auth_service.ts:26-36`; миграция `255-271` | Аватар: тип/расширение берётся из имени файла (`file.name.split(".").pop()`), без MIME/размера на сервере, загрузка в **публичный** бакет | Хостинг произвольных файлов (HTML/SVG/…) на домене Supabase, фишинг, abuse квоты | Валидировать MIME/размер на сервере, белый список расширений, private bucket + signed URL |
| SEC-18 | P2 | Внутренние вызовы | `background-worker/index.ts:95-103`; `_shared/clients.ts:92-98`; `_shared/auth.ts:32-40` | Воркер вызывает `regenerate-image` клиентом service-role → `functions.invoke` шлёт service-role JWT → `auth.getUser(token)` падает → 401 | Автогенерация картинок молча не работает (функциональная поломка конвейера) | Для внутренних вызовов отдельный сервисный контракт (`getAuthenticatedService` по секрету) или передавать проброшенный JWT |
| SEC-19 | P2 | RLS bootstrap | миграция `161-177`; `get-feedback-reports/index.ts:9-22` | Нет триггера/политики создания `profiles`; `is_admin()` опирается на `profiles.role`, который никто не создаёт (клиент таблицу не использует вовсе) | Либо admin-функции недоступны, либо admin-роли назначаются вручную вне репо → неуправляемо и связано с SEC-01 | Добавить триггер `auth.users → profiles` и документированную админ-провижининг-процедуру |
| SEC-20 | P2 | RLS drift | миграция `141-146`; `src/ui/ui_leaderboard.ts:131-141`; `src/app.ts:1500-1517`; миграция `106-111` | Лидерборд читает все строки `user_global_stats`, шаринг списков — `user_lists` другого пользователя; в миграции таких политик нет | Либо фичи не работают, либо в прод-БД есть неописанные permissive-политики (непроверяемый доступ к чужим данным) | Описать политики явно: read-only публичные представления/`security_invoker` views для лидерборда и шаринга |
| SEC-21 | P2 | Непроверяемый RPC | `src/core/db.ts:428-433` | Клиент вызывает `rpc("cleanup_user_progress")`, которой нет ни в одной миграции репо | Неаудируемая SECURITY DEFINER-функция в проде: потенциальное удаление/чтение чужих строк, обход RLS | Добавить определение функции в миграции, зафиксировать `search_path`, `auth.uid()`-фильтр, ревью прав |
| SEC-22 | P2 | Обход серверной валидации | миграция `182-196`; `submit-feedback/index.ts:78-103` | Клиент может писать в `feedback_reports`/`word_requests`/`vocabulary` напрямую через PostgREST, минуя Edge-валидацию, лимиты и размеры | Спам/флуд админ-панели, огромные payload'ы, обход rate limit, мусор в БД | Сузить RLS: разрешить только INSERT через Edge Function (сервисный путь), либо CHECK-констрейнты по длинам |
| SEC-23 | P2 | CI-секреты | `.github/workflows/deploy.yml:81-88` | `deno task test` получает `SUPABASE_SERVICE_ROLE_KEY` и `GEMINI_API_KEY`, хотя тесты — только проверки констант; `deno test` запускается с `--allow-env --allow-net` | Любой код в ветке PR из этого же репо может прочитать service-role ключ | Убрать секреты из тестового шага; выдавать их только шагу деплоя; `--deny-env`/env-scope |
| SEC-24 | P2 | CI supply chain | `.github/workflows/deploy.yml:24-31, 62-65, 97-105` | Actions на плавающих тегах (`@v4`, `@v1`), `supabase/setup-cli@v1` + `version: latest`, `denoland/setup-deno@v1`; lock-файлы не используются с `--frozen` | Компрометация тега/подмена CLI = выполнение кода в CI с секретами деплоя | Пиннить actions по SHA, CLI по версии, `deno install --frozen`/`--lock` |
| SEC-25 | P2 | Prompt injection | `check-essay/index.ts:107-111`; `generate-word-data/index.ts:82-99`; `ocr-image/index.ts:17-22` | Пользовательский текст/изображение вставляются в промпт Gemini без разделителей и без инструкции «игнорируй инструкции в данных» | Искажение результата/оценки, расход квоты, (в теории) отравление `ai_cache` под совпадающим ключом; XSS нет — вывод экранируется | Обернуть данные в маркеры/JSON, явная инструкция о недоверии, валидация контента перед кэшем, separate `system`-инструкции |
| SEC-26 | P2 | Глобальная поверхность | `src/core/window_bindings.ts:47-138` | ~40 функций, включая destructive (`clearData`, `handleDeleteAccount`, `importProgress`,`handleAuth`), навешены на `window` без namespace | Любой внедрённый inline-обработчик/скомпрометированный сторонний скрипт вызывает их напрямую; риск случайного перезаписывания (`window.speak` и т.п.) | Убрать из `window` (делегировать через `data-action`), либо один namespace `window.__topik` в DEV-only |
| SEC-27 | P2 | Fail-open | `src/core/supabaseClient.ts:177-262` | При отсутствии `VITE_SUPABASE_*` клиент подменяется мок-объектом, `getUser()` возвращает фейкового `mock-user-id`, записи — no-op | Прод-сборка без env тихо «работает», пользователи считают данные сохранёнными; ложная авторизация | В prod — `throw`/экран критической ошибки; мок только под `import.meta.env.DEV`/`MODE === 'test'` |
| SEC-28 | P2 | Stored XSS (admin) | `src/app.ts:1037-1051`; миграция `77-81` | `literal_translation` / `explanation` из `quotes` вставляются в `innerHTML` без экранирования; `quotes` пишет admin/service-role | После компрометации/повышения до admin (SEC-01) — XSS всем пользователям на welcome-экране | `textContent`/`escapeHtml` для обоих полей, как уже сделано для `quote_kr`/`quote_ru` |
| SEC-29 | P3 | Импорт данных | `src/ui/ui_data.ts:187-316` | Импорт бэкапа принимает произвольный JSON без схемы/лимитов: `stats.coins`, `league`, `learning` и т.д. попадают в state и затем в облако | DoS localStorage, читерство, «социальный» вектор с вредоносным бэкапом | Валидация схемы (zod/ручная), лимиты размера, подтверждение, не синкать импортированное как доверенное |
| SEC-30 | P3 | Избыточный доступ | `get-feedback-reports/index.ts:39-70` | Админ-функция читает `select("*")` из `feedback_reports`/`profiles` и отдаёт клиенту email | Избыточный объём PII в ответе/логах, нарушение минимизации | Явный `select(...)` нужных колонок, email — только при необходимости |
| SEC-31 | P3 | Гигиена репозитория | `.gitignore:1-5`; `supabase/.temp/*`, `supabase/.branches/*` (отслеживаются) | В git закоммичены CLI-артефакты: `project-ref`, `linked-project.json` (ref/name/org), `pooler-url` (host/region) | Раскрытие инфраструктурных идентификаторов, шум в ревью | Добавить `supabase/.temp/`, `supabase/.branches/` в `.gitignore`, `git rm --cached` |
| SEC-32 | P3 | Хостинг/headers | `public/_redirects:1`; `package.json:10` | `_redirects` — формат Netlify, а деплой-скрипт публикует на GitHub Pages (`gh-pages -d dist`); security-заголовки задать негде | SPA-роуты ломаются; невозможно включить HSTS/CSP на уровне хостинга | Определить хостинг; для GH Pages — `_headers` не поддерживается → перенос на Netlify/Cloudflare Pages/Vercel |
| SEC-33 | P3 | Внешняя зависимость | `_shared/constants.ts:103-111`; `_shared/tts.ts:25` | Захардкожен публичный TrustedClientToken неофициального Edge TTS + зависимость от непубличного сервиса Microsoft | Не секрет, но нарушение ToS/хрупкость: сервис может отключиться/заблокировать; текст пользователя уходит в Microsoft (TTS) | Документировать риск, рассмотреть официальный TTS (Google/Azure) с ключом в секретах |
| SEC-34 | P3 | Рост кэша | `generate-word-data/index.ts:191-231`; `regenerate-image/index.ts:236-281` | `ai_cache` пишется без TTL-очистки; `expires_at` фильтруется только на чтении; ключи генерируются из ввода пользователя | Неограниченный рост БД, «мусорный» кэш, стоимость | Cron-очистка истёкших, TTL по контенту, нормализация ключей/лимит длины |
| SEC-35 | P3 | Код/self-XSS | `src/ui/ui_feedback.ts:232-241` | Внутри template-literal вставлен JS-код как HTML-текст (обработчик `#feedback` мёртв); `${att.file.name}` вставляется в `innerHTML` без экранирования | Self-XSS через имя файла; заявленный deep-link `#feedback` не работает | Разделить HTML/JS, `escapeHtml(att.file.name)`, вынести автооткрытие в отдельный код |
| SEC-36 | P3 | Self-XSS | `src/ui/ui_card.ts:613-623` | `${list.icon}`/`${list.title}` в `innerHTML` без `escapeHtml` (в аналогичном `ui_collections.ts:766` — экранируется) | Self-XSS (свои списки); при будущем шаринге/чужом `user_id` станет stored XSS | Экранировать как в `ui_collections.ts` |
| SEC-37 | P3 | Аутентификация | `src/core/auth.ts:616-627`, `838-866` | Минимальная длина пароля — 6 символов, проверка только на клиенте; strength-метр информативный | Слабые пароли, брутфорс (если в Supabase не включены лимиты/капча) | Политика ≥12 символов и проверка на сервере (Supabase Auth settings), MFA для admin |
| SEC-38 | P3 | Приватность | `src/ui/ui_writing.ts:530, 566-572`; `check-essay/index.ts:142-150` | Сочинения и черновики хранятся в открытом localStorage и уходят в Gemini; уведомления/согласия и retention-политики нет | PII пользователя в localStorage на устройствах и у внешнего AI-провайдера | Предупреждение/согласие, TTL и очистка черновиков, политика конфиденциальности |
| SEC-39 | P3 | Дублирование конфигов | `supabase/functions/constants.ts:1-38` | Файл-дубликат констант (никем не импортируется): другие `LIMITS` (50 слов/100 симв.), модели `gemini-1.5-*` вместо `_shared/constants.ts` | Риск, что будущий код возьмёт «не те» лимиты/модели; расхождение валидации | Удалить файл, оставить единый `_shared/constants.ts` |
| SEC-40 | P3 | CORS | `_shared/constants.ts:1-6` | `Access-Control-Allow-Origin: *` на всех функциях, включая админские; нет allowlist origin | Bearer-токены не CSRF-уязвимы, но любой origin может дёргать функции с украденным токеном и читать ответ | Разрешить только origin приложения, `Vary: Origin`, а для админ-функций — строгий allowlist |

---

## Детальные находки

### SEC-01 — P0: повышение привилегий до `admin` через self-INSERT в `profiles`
**Файл:** `supabase/migrations/0001_initial_rls.sql:174-177` (и `13-29`, `168-196`).

```sql
174: DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
175: CREATE POLICY profiles_insert_self ON public.profiles
176:   FOR INSERT TO authenticated
177:   WITH CHECK (id = auth.uid());
```

`is_admin()` (строки 13-29) возвращает `role = 'admin'` из `public.profiles` для `auth.uid()`. Политика INSERT проверяет только `id`, но не значение `role`. В репозитории **нет триггера** `auth.users → profiles` (в миграции только функция `is_admin()`), а клиентский код `profiles` не читает и не пишет вовсе (grep по `src/` — 0 совпадений). Значит, если триггер не создан вручную в живом Supabase, строка профиля отсутствует и INSERT проходит.

**Сценарий атаки:**
1. Регистрация любого аккаунта (получаем JWT `authenticated`).
2. `POST /rest/v1/profiles` с телом `{"id":"<мой uid>","role":"admin"}` (apikey = публичный anon/publishable, Authorization = мой JWT).
3. `is_admin()` теперь `true`; вызов `get-feedback-reports` (Edge) отдаёт все отчёты + email/имена; `update-feedback-status` меняет статусы; Storage-политика `storage_admin_all` (миграция 292-296) даёт чтение/запись **всех** бакетов (включая `feedback_attachments` — скриншоты пользователей); `quotes_admin_all` — запись `quotes` (→ цепочка с SEC-28); `ai_cache` — чтение/запись общих кэшей.

**Влияние:** полная компрометация админ-контура и PII (email, вложения, история отчётов), запись контента для всех пользователей. Классический привилегированный доступ из непривилегированного аккаунта.

**Исправление:**
```sql
-- запрет выбрать себе привилегированную роль
DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() AND role = 'user');
-- дополнительно: триггер, запрещающий изменение role кем-либо кроме service_role,
-- и создание profiles через auth-trigger
```
Также убрать `public.is_admin()` из `STORAGE`-политик для бакетов, где админ не нужен, и добавить проверку `role = 'admin'` в отдельное поле `app_metadata` (серверное), а не в таблицу, которую пользователь может INSERT-ить.

**Оговорка:** если в живом Supabase есть триггер, создающий `profiles` при регистрации, INSERT будет конфликтовать по PK и атака не пройдёт; но UPDATE/column-права и отсутствие провижининга в репо (SEC-19) делают риск реальным. Это первое, что нужно проверить в Dashboard.

---

### SEC-02 — P1: IDOR на запись в `regenerate-image` (auto/finalize меняет любую словарную статью)
**Файл:** `supabase/functions/regenerate-image/index.ts:288-321`, `325-339`, `158-210` (запись по `id`).

```ts
288:     if (mode === "auto") {
289:       if (!body.id || !word) {
290:         throw new HttpError("Missing 'id' or 'word' for auto mode", 400);
291:       }
292:       if (typeof body.id !== "string" && typeof body.id !== "number") {
293:         throw new HttpError("Invalid 'id' for auto mode", 400);
294:       }
...
318:       const result = await processAndStoreImage(String(body.id), randomImage.url, randomImage.source);
```

Внутри `processAndStoreImage` (158-210) обновление идёт **админ-клиентом** (обходит RLS) и только по `id`, без проверки владельца:

```ts
202:   const { error: dbError } = await supabaseAdmin
203:     .from(DB_TABLES.VOCABULARY)
204:     .update({ image: publicUrl, image_source: source })
205:     .eq("id", wordId);
```

**Сценарий атаки:** любой зарегистрированный пользователь копирует `id` публичной словарной статьи (они массово приходят в клиент из `vocabulary_select ... USING (is_public IS TRUE)`, видны в DevTools) и вызывает `POST /functions/v1/regenerate-image` с `{"mode":"finalize","id":"<чужой id>","selectedUrl":"https://cdn.pixabay.com/...","source":"Pixabay"}` или напрямую `mode:"auto"`. Картинка чужого (в т.ч. админского) слова заменяется у **всех** пользователей.

**Влияние:** нарушение целостности общего контента (дефейс обучающего словаря неуместными изображениями), необратимые изменения в БД, хранение/квота Storage; при массовом переборе — порча словаря.

**Исправление:** перед `processAndStoreImage` читать строку и проверять `created_by === user.id || user_id === user.id` (как уже сделано в `generate-media-for-word:45-48`); для `auto`-режима добавить отдельный сервисный путь (cron/secret), недоступный клиенту.

---

### SEC-03 — P1: любой пользователь может публиковать произвольный контент в общий словарь
**Файл:** `supabase/migrations/0001_initial_rls.sql:50-59`.

```sql
50: DROP POLICY IF EXISTS vocabulary_insert_own ON public.vocabulary;
51: CREATE POLICY vocabulary_insert_own ON public.vocabulary
52:   FOR INSERT TO authenticated
53:   WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());
...
55: DROP POLICY IF EXISTS vocabulary_update_own ON public.vocabulary;
56: CREATE POLICY vocabulary_update_own ON public.vocabulary
57:   FOR UPDATE TO authenticated
58:   USING (created_by = auth.uid() OR user_id = auth.uid())
59:   WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());
```

Политики не ограничивают `is_public`. Пользователь может через чистый PostgREST:
- `INSERT` строку с `is_public: true`, `word_kr`/`translation`/`level`/`image`/`audio_url` любого содержания (валидация длины/символов есть только в Edge-функциях, а прямой REST-путь её обходит);
- `UPDATE` свою существующую строку и выставить `is_public = true`.

**Сценарий атаки:** регистрация → `POST /rest/v1/vocabulary` с `{"word_kr":"...","translation":"...","level":"<payload>","is_public":true,...}` → строка попадает в `vocabulary_select` для всех (anon+authenticated) → на клиентах появляется в словаре/кэше (полный sync `select("*")`), при этом никакой модерации нет.

**Влияние:** отравление общего словаря, оскорбительный/вводящий в заблуждение контент, раздувание таблицы (все клиенты тянут её целиком), доставка payload'ов в XSS-синки (SEC-04).

**Исправление:** запретить клиентам `is_public = true` (`WITH CHECK (... AND is_public = false)`), публикацию делать только admin/Edge-функцией с валидацией; добавить DB-CHECK на длины `word_kr`/`translation`.

---

### SEC-04 — P1: Stored XSS через неэкранированный `word.level` в «Ошибках»
**Файл:** `src/ui/ui_mistakes.ts:145-160` (строка 155).

```ts
149:         <div class="list-item mistake">
150:           <div class="list-col-main">
151:             <div class="list-word">${escapeHtml(w.word_kr)}</div>
152:             <div class="list-trans">${escapeHtml(w.translation)}</div>
153:           </div>
154:           <div class="list-col-meta">
155:             <span class="list-badge">${w.level || "★☆☆"}</span>
```

`word_kr` и `translation` экранируются, а `w.level` — нет.

**Сценарий атаки:** атакующий публикует public-слово (SEC-03) с `level = "<img src=x onerror=...>"`. Слово попадает в общий словарь; жертва, отметившая его как «Забыл» (обычный сценарий квиза/карточки, кнопка доступна всем), открывает модалку «Ошибки» → payload исполняется. Дополнительно, если у слова нет `level`, подставляется «★☆☆» — то есть поле произвольное.

**Влияние:** XSS в origin приложения у других пользователей → чтение `localStorage` (сессия Supabase, SEC-09) → полный захват аккаунта; в перспективе — access token админа.

**Исправление:** `escapeHtml(w.level || "★☆☆")`; ревизия всех мест, где поля `Word` вставляются в HTML без `escapeHtml` (сейчас найден 1 такой sink, см. также SEC-36); включить CSP (SEC-09) как второй барьер.

---

### SEC-05 — P1: отсутствие серверного rate limiting на платных AI-эндпоинтах, единственный лимит обходится
**Файлы:** `supabase/functions/process-word-request/index.ts:118-127`; `generate-word-data/index.ts:175-187`; `check-essay/index.ts:89-101`; `ocr-image/index.ts:55-65`; `regenerate-image/index.ts:217-232`.

```ts
118:     // [SECURITY] Rate Limiting (15 req/min per authenticated user)
119:     const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
120:     const { count } = await supabaseAdmin
121:       .from(DB_TABLES.WORD_REQUESTS)
122:       .select("id", { count: "exact", head: true })
123:       .eq("user_id", user.id)
124:       .gte("created_at", oneMinuteAgo);
125:     if (count !== null && count > 15) {
126:       throw new HttpError("Rate limit exceeded. Please wait.", 429);
127:     }
```

Проблемы: (1) `count` считается по таблице `word_requests`, а RLS-политика `word_requests_own_all` (`FOR ALL`) позволяет пользователю **удалять свои строки** → цикл «создать строку → вызвать process (Gemini) → удалить строку» не упирается в лимит; (2) у остальных четырёх функций (Gemini `check-essay`, `ocr-image`, `generate-word-data`; внешние Pixabay/Pexels/Unsplash в `regenerate-image`) **лимитов нет вообще** — только JWT; (3) `withTimeout` не отменяет внутренний запрос к Gemini.

**Сценарий атаки:** скрипт на 10 регистраций → параллельные вызовы `check-essay`/`ocr-image` с максимальными payload'ами (2000/8000 симв., 4 МБ base64) и уникальными запросами к `generate-word-data` (кэш не срабатывает) → сжигание квоты/денег на Gemini, Pixabay, Pexels, Unsplash, Edge-инвокаций. Параллельно `regenerate-image mode=search` делает до 3 внешних API-вызовов на запрос.

**Влияние:** финансовый DoS, деградация сервиса для реальных пользователей (429 от Gemini), злоупотребление платными ресурсами, блокировка API-ключей провайдерами.

**Исправление:** сквозной лимитер в БД (`rate_limits(user_id, bucket, window_start, count)` с атомарным UPDATE) для **каждой** дорогой функции; лимит по IP на gateway; кэш по нормализованному ключу; алерты на аномалии расхода; для `process-word-request` считать по append-only журналу вызовов, а не по удаляемой таблице.

---

### SEC-06 — P1: `verify_jwt = true` у `background-worker` несовместим с `CRON_SECRET`
**Файлы:** `supabase/config.toml:51-54`; `supabase/functions/background-worker/index.ts:19-24`; `.env.example:46-47`.

```toml
52: [functions.background-worker]
53: verify_jwt = true
54: enabled = true
```

```ts
19:   // 1. Защита функции: проверяем секретный ключ
20:   const authHeader = req.headers.get("Authorization");
21:   const cronSecret = Deno.env.get("CRON_SECRET");
22:   if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
23:     return createErrorResponse("Unauthorized", 401);
24:   }
```

Крон/внешний планировщик по документации должен присылать `Authorization: Bearer <CRON_SECRET>` (`.env.example:46-47`). Но `CRON_SECRET` — не JWT: Supabase-gateway при `verify_jwt = true` отклонит запрос **до** входа в функцию (401). Значит воркер недостижим: единственный рабочий вариант — `verify_jwt = false`, что противоречит `config.toml`. Дополнительно: `CRON_SECRET` отсутствует в локальном `.env` (там только 7 переменных, `CRON_SECRET` нет) → локально функция тем более всегда 401.

**Влияние:** фоновый конвейер медиа/ретраев фактически мёртв (аудит не может подтвердить, что он работает в проде — см. «Ограничения»); при «починке» через `verify_jwt=false` единственной защитой остаётся статичный Bearer-секрет, который к тому же может утечь вместе с `.env` (SEC-07).

**Исправление:** для `background-worker` — `verify_jwt = false` + `x-cron-secret`/HMAC-подпись тела + `crypto.subtle.timingSafeEqual`; для криптостойкости добавить ротацию и ограничение по IP/расписанию. Либо выдавать воркеру сервисный JWT с коротким сроком и проверять `role`/`aud`.

---

### SEC-07 — P1: живые секреты в `.env` внутри OneDrive-папки; дубликат `SUPABASE_SERVICE_KEY`
**Файл:** `.env` (строки 1-7; **значения не приводятся** — только имена, длины и характер).

```text
1: VITE_SUPABASE_URL=<masked>        # публичный URL проекта
2: VITE_SUPABASE_KEY=<masked>        # publishable-ключ (длина 46)
3: SUPABASE_SERVICE_KEY=<masked>     # СЕКРЕТ service-role (длина 41)
4: PIXABAY_API_KEY=<masked>          # живой ключ
5: GEMINI_API_KEY=<masked>           # живой ключ
6: SUPABASE_SERVICE_KEY=<masked>     # ДУБЛИКАТ ИМЕНИ: публичный ключ (длина 46, совпадает с VITE_SUPABASE_KEY)
7: SUPABASE_SECRET_KEY=<masked>      # СЕКРЕТ service-role (длина 41)
```

Установлено: `.env` не отслеживается git (`git ls-files` пусто) и указан в `.gitignore:3` — это хорошо. Но файл лежит в `C:\Users\demir\OneDrive\Рабочий стол\TOPIK APP` — в синхронизируемой OneDrive-папке, вместе с **двумя** живыми service-role секретами (8 строк, ключи Google/Pixabay). Отдельный дефект: в `.env` два раза объявлен `SUPABASE_SERVICE_KEY` — сначала секрет (стр. 3), потом publishable-ключ (стр. 6); при загрузке «последний выигрывает», т.е. `SUPABASE_SERVICE_KEY` = публичный ключ. Код (`_shared/clients.ts:38-55`) читает primary `SUPABASE_SECRET_KEY` (есть, стр. 7), поэтому локально не падает, но семантика «секретной» переменной испорчена — при рефакторинге/деплое легко получить RLS-ошибки или, хуже, положиться на публичный ключ как на админский.

**Влияние:** компрометация OneDrive-аккаунта или устройства = полный обход RLS (`sb_secret`-ключ), неограниченный расход Gemini/Pixabay; дубликат создаёт неопределённость конфигурации деплоя.

**Исправление:** ротировать оба секрета и Gemini/Pixabay после переноса; хранить в менеджере секретов (1Password/Bitwarden/GitHub Environments/Supabase Secrets), локально — только через `direnv`/`.env.local` вне синхронизации; удалить дубликат, оставить один канонический `SUPABASE_SECRET_KEY`; добавить pre-commit-сканер секретов (gitleaks).

---

### SEC-08 — P1: таблица `articles` используется клиентом, но не покрыта RLS-миграцией
**Файл:** `src/ui/ui_reading.ts:38-41`; `supabase/migrations/0001_initial_rls.sql` (таблицы `articles` нет).

```ts
38:     const { data, error } = await client
39:       .from(DB_TABLES.ARTICLES)
40:       .select("*")
41:       .order("created_at", { ascending: false });
```

`DB_TABLES.ARTICLES = "articles"` (`src/core/constants.ts:65`), таблица описана в GEMINI.md как «Reading materials». В миграции 0001 нет ни `ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY`, ни политик. Если в живом Supabase RLS не включена отдельной миграцией/вручную, таблица доступна anon **на чтение и запись** (PostgREST разрешает все операции при отсутствии RLS-политик и включённом RLS; при **выключенном** RLS — все операции без ограничений).

**Сценарий атаки:** `GET /rest/v1/articles?select=*` из браузера без авторизации; при отсутствии RLS — `POST/PATCH/DELETE` для отравления контента раздела «Чтение» всем пользователям.

**Влияние:** утечка/отравление контента, потенциальная запись произвольных данных в общую таблицу; непроверяемый (в репо) элемент схемы.

**Исправление:** добавить в миграции:
```sql
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_read ON public.articles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY articles_admin_write ON public.articles FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
```
и проверить фактическое состояние `articles` в живом Supabase (`select relrowsecurity from pg_class where relname='articles'`).

---

### SEC-09 — P1: отсутствие CSP/security-заголовков при сессии в localStorage и inline-кодом
**Файлы:** `index.html:31-391` (inline `<style>` ~360 строк), `index.html:394-427` (inline `<script>`), `src/core/supabaseClient.ts:152-162`; `public/offline.html:83`.

```html
31:     <style>
32:       /* Critical styles to hide overlays/modals by default */
...
394:     <script>
395:       window.onerror = function (msg, url, line, col, error) {
396:         console.error("Global Error (Inline):", msg, url, line, error);
397:       };
```

```ts
158:         auth: {
159:           autoRefreshToken: true,
160:           persistSession: true,
161:           detectSessionInUrl: true,
162:         },
```

Проверено grep'ом по всему репозиторию: `Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, `X-Content-Type-Options`, `_headers`, `netlify.toml`, `vercel.json` — **не найдено ни одного**. Supabase-js v2 с `persistSession: true` кладёт access+refresh токены в `localStorage` (ключ `sb-<ref>-auth-token`). Дополнительно `offline.html:83` использует inline `onclick`.

**Влияние:** при любой XSS (SEC-04, SEC-28, SEC-36, SEC-10) атакующий читает токены → ATO; отсутствие `frame-ancestors`/`X-Frame-Options` допускает кликджекинг (в т.ч. подделка confirm-диалогов); inline-код не даёт включить строгий CSP без рефакторинга.

**Исправление:** вынести всё из `index.html` в модули/файлы, затем ввести CSP как заголовок (или `<meta http-equiv>` для GH Pages): `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https://*.supabase.co data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'none'; object-src 'none'`; добавить `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`, HSTS. Рассмотреть хранение сессии в httpOnly-cookie через BFF, если хостинг позволяет.

---

### SEC-10 — P1: исполнение стороннего JS/CSS без SRI (runtime-инъекция скрипта)
**Файлы:** `src/ui/ui_feedback.ts:165-176`; `index.html:14-28`.

```ts
165:       await new Promise<void>((resolve, reject) => {
166:         const script = document.createElement("script");
167:         script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
168:         script.onload = () => resolve();
169:         script.onerror = () => reject(new Error("Failed to load html2canvas"));
170:         document.head.appendChild(script);
171:       }).catch((err) => {
```

```html
15:     <link
16:       rel="preload"
17:       href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css"
18:       as="style"
19:       onload="
20:         this.onload = null;
21:         this.rel = 'stylesheet';
22:       "
23:     />
```

Скрипт грузится с **личного/community-домена** `html2canvas.hertzen.com` (не CDN с SLA) в момент нажатия «Скриншот», без `integrity`. CSS шрифта — с jsDelivr, тоже без `integrity`; Service Worker кэширует jsdelivr `CacheFirst` на год (`src/sw.ts:33-47`), т.е. подмена надолго осядет в кэше. В сочетании с отсутствием CSP (SEC-09) любой контроль над этими хостами даёт исполнение кода в origin приложения.

**Влияние:** supply-chain RCE в браузере → кража сессии/данных, действия от имени пользователя (включая destructive `window.*`, SEC-26); CSS-инъекция — UI-подмена/утечка через `url()`/attribute-селекторы.

**Исправление:** self-host `html2canvas`/шрифт в `public/` (или npm-пакет и бандлить), обязательно `integrity`+`crossorigin` для сторонних, `Referrer-Policy`; в CSP запретить сторонние `script-src`; заменить `CacheFirst` на `StaleWhileRevalidate` для CDN.

---

### SEC-11 — P2: игровая статистика и лидерборд полностью доверяют клиенту
**Файлы:** `src/core/sync.ts:113-136`; миграция `141-146`.

```ts
132:     const { error: globalError } = await client
133:       .from(DB_TABLES.USER_GLOBAL_STATS)
134:       .upsert(globalUpdates, { onConflict: "user_id" });
```
`globalUpdates` (113-129) содержит `xp`, `level`, `weekly_xp`, `league`, `coins`, `achievements`, `settings`, `full_name`, `avatar_url` — всё считается на клиенте. RLS-политика `user_global_stats_own_all` разрешает UPSERT любых значений.

**Сценарий атаки:** через DevTools/PostgREST выставить `xp=1e9, level=999, league='Challenger', full_name='Admin'`; лидерборд (`src/ui/ui_leaderboard.ts:131-141`, сортировка по `weekly_xp`/`level`) покажет поддельные места и имена всем. `full_name`/`avatar_url` выводятся всем пользователям (экранируются, XSS нет, но спуфинг и внешний трекинг-пиксель возможны).

**Влияние:** подрыв доверия к рейтингу/геймификации, спуфинг личности в общем UI; при добавлении «призов» — прямая материальная выгода читеру.

**Исправление:** серверный расчёт XP/лиг (Edge Function/RPC с валидацией событий и подписью), запретить клиенту UPSERT привилегированных полей (`REVOKE UPDATE (xp,level,league,coins)` + отдельные `user_settings`/`public_profile` таблицы), ограничить `full_name` длиной/контентом.

---

### SEC-12 — P2: «удаление аккаунта» не удаляет PII (неполное удаление + нет аудита)
**Файлы:** `src/core/auth.ts:743-757`; `supabase/functions/delete-user/index.ts:21-34`; миграция `180-196`.

```ts
743:         // 4. Delete all other user-specific data in parallel
744:         await Promise.all([
745:           client.from(DB_TABLES.USER_PROGRESS).delete().eq("user_id", uid),
746:           client.from(DB_TABLES.USER_GLOBAL_STATS).delete().eq("user_id", uid),
747:           client.from(DB_TABLES.WORD_REQUESTS).delete().eq("user_id", uid),
748:           client.from(DB_TABLES.USER_LISTS).delete().eq("user_id", uid),
749:           // Delete words created by the user from the main vocabulary table
750:           client.from(DB_TABLES.VOCABULARY).delete().eq("created_by", uid),
751:         ]);
```

Не удаляются: `feedback_reports` (заголовки/описания/вложения — самый чувствительный PII, включая скриншоты), `profiles` (email, full_name), `user_favorite_quotes`, `user_vocabulary`, файлы в `feedback_attachments` (Storage), а `auth.users` удаляется отдельной функцией, которая может упасть (тогда пользователь остаётся, но без данных). Пользователю при этом показывается `alert("Аккаунт и все данные удалены.")` (auth.ts:772).

**Влияние:** нарушение обещания удаления и требований GDPR/152-ФЗ; остаточный PII в БД и Storage бессрочно; невозможен аудит факта удаления (нет лога/таблицы deletion-requests).

**Исправление:** перенести удаление в Edge-функцию: транзакционно/последовательно удалить FK-каскадом (`ON DELETE CASCADE` от `auth.users`), объекты Storage (`storage.from(...).remove(all user files)`), затем `auth.admin.deleteUser`; писать запись в `deletion_audit`; не обещать «всё удалено» при частичном сбое.

---

### SEC-13 — P2: destructive-операции не требуют серверной повторной аутентификации
**Файлы:** `src/core/auth.ts:782-798`; `src/ui/ui_data.ts:105-133`; `supabase/functions/delete-user/index.ts:21-34`.

```ts
779:     {
780:       confirmText: "Удалить навсегда",
781:       cancelText: "Отмена",
782:       showInput: isEmailAuth,
783:       inputPlaceholder: "Введите пароль для подтверждения",
784:       onValidate: isEmailAuth
785:         ? async (val) => {
...
790:             const { error } = await AuthService.signInWithPassword(session.user.email!, val);
791:             if (error) {
792:               showToast("❌ Неверный пароль");
793:               return false;
794:             }
```

Проверка пароля — только в браузере, а `delete-user` (и клиентский сброс прогресса) принимают просто Bearer-JWT. Для Google-провайдера (`isEmailAuth === false`) пароль не спрашивается вообще.

**Сценарий атаки:** любой скрипт, получивший access token (XSS по SEC-04/10/28), вызывает `POST /functions/v1/delete-user` и `DELETE/PATCH` своих таблиц — аккаунт и прогресс уничтожаются без знания пароля, необратимо.

**Влияние:** необратимая потеря данных пользователя (в т.ч. чужими руками через XSS), невозможность различить «сам удалил» и «атакующий удалил».

**Исправление:** серверная re-auth: Edge Function принимает свежий `password`/OTP и сама подтверждает через `auth.signInWithPassword` (или Supabase "reauthentication" nonce), только затем удаляет; TTL nonce ≤5 мин; для OAuth — повторный consent/ввод email.

---

### SEC-14 — P2: Service Worker кэширует персонализированные ответы Supabase и хранит Authorization в IndexedDB
**Файл:** `src/sw.ts:102-126`, `128-139`.

```ts
102: // Кэширование для списков слов (коллекций)
103: registerRoute(
104:   ({ url }) =>
105:     url.hostname.includes("supabase.co") &&
106:     (url.pathname.includes("/user_lists") || url.pathname.includes("/list_items")),
107:   new StaleWhileRevalidate({
108:     cacheName: "api-collections-cache",
109:     plugins: [
110:       new CacheableResponsePlugin({ statuses: [0, 200] }),
111:       new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7 }), // 1 неделя
```
```ts
129: const bgSyncPlugin = new BackgroundSyncPlugin("supabase-queue", {
130:   maxRetentionTime: 24 * 60, // 24 часов (в минутах)
131: });
132: 
133: // Перехватываем запросы на изменение данных в Supabase (POST, PUT, PATCH, DELETE)
134: registerRoute(
135:   ({ url, request }) => url.hostname.includes("supabase.co") && request.method !== "GET",
136:   new NetworkOnly({
137:     plugins: [bgSyncPlugin],
138:   }),
```

Workbox `StaleWhileRevalidate` матчит по URL без учёта заголовков: запрос `GET /rest/v1/list_items?select=*` (такой и есть в `ui_collections.ts:65`, без фильтра) кэшируется один раз и затем **отдаётся другому пользователю** того же браузера (смена аккаунта, общий ноутбук). `BackgroundSyncPlugin` хранит неуспешные POST/PATCH в IndexedDB вместе с `Authorization`-заголовком; после logout они могут быть реплеены со старым токеном. `auth.ts` при выходе чистит только `localStorage`/`sessionStorage` (строки 683-699) — кэши и IndexedDB остаются.

**Влияние:** cross-user утечка приватных списков/прогресса на общем устройстве; реплей операций от имени старого пользователя; остаточные токены в IndexedDB.

**Исправление:** не кэшировать персональные запросы (только `vocabulary`, `quotes`, публичные бакеты); при logout — `caches.keys() → delete`, очистка `workbox-background-sync`/`workbox-expiration` и IndexedDB; включить per-user ключ кэша; для мутаций — `NetworkOnly` без BackgroundSync (или очередь без headers, с повторной авторизацией).

---

### SEC-15 — P2: logout не гарантирует очистку сессии и не изолирует персистентные кэши между аккаунтами
**Файл:** `src/core/auth.ts:683-700`; `src/core/db.ts:875-882`.

```ts
683:       Object.values(LS_KEYS).forEach((key) => {
684:         if (key !== LS_KEYS.VOCAB_CACHE && key !== LS_KEYS.VOCAB_VERSION) {
685:           localStorage.removeItem(key);
686:         }
687:       });
688: 
689:       // Также удаляем ключи, которые могли быть не в LS_KEYS
690:       localStorage.removeItem("settings_updated_at");
691: 
692:       // Explicitly remove common Supabase auth tokens from local storage
693:       localStorage.removeItem("sb-supabase-auth-token");
694:       localStorage.removeItem("supabase.auth.token");
```

Реальный ключ supabase-js v2 — `sb-<project-ref>-auth-token`, а не `sb-supabase-auth-token`; если `AuthService.signOut()` упал по сети (обработчик именно этот случай и предусматривает — 676-679), токен остаётся. Дополнительно VOCAB-кэш намеренно **сохраняется** (`db.ts:875-882` пишет `state.dataStore` в IndexedDB/localStorage), а в `dataStore` попадают и приватные слова пользователя (`vocabulary_select` отдаёт `created_by = auth.uid()`), т.е. следующий пользователь на устройстве видит приватный словарь предыдущего.

**Влияние:** «тихий» повторный вход в чужой аккаунт на общем устройстве; утечка приватных слов/заметок между аккаунтами; неверная модель «вы вышли».

**Исправление:** удалять все ключи с префиксом `sb-` и `supabase.auth`, принудительно очищать `client.auth.signOut({scope:'local'})` + `caches`/IndexedDB; хранить словарь/кэш без пользовательских приватных строк либо с namespace по `user.id`; при старте — проверять владельца кэша.

---

### SEC-16 — P2: access token попадает в `console.warn` при таймауте/ретрае
**Файл:** `src/core/supabaseClient.ts:57-60`, `136-140`.

```ts
57:       id = setTimeout(() => {
58:         console.warn(`Supabase request timed out after ${timeout / 1000}s for`, url, init);
59:         controller.abort();
60:       }, timeout);
...
136:         console.warn(
137:           `[Retry ${i + 1}/${retries}] Request failed with "${(error as Error).message}". Retrying in ${delay}ms...`,
138:           error,
139:           init,
140:         );
```

`init` — это `RequestInit`, который supabase-js передаёт в кастомный `fetch`; в нём `headers: { apikey, Authorization: 'Bearer <access_token>' }`. Любой сетевой сбой/таймаут печатает токен в консоль браузера.

**Сценарий эксплуатации:** запись экрана/удалённая поддержка, любое расширение/скрипт, читающий консоль, сбор логов фронтенда (Sentry-подобные), или просто взгляд через плечо; токен живёт до истечения (обычно 1 ч) и даёт доступ к API пользователя.

**Влияние:** утечка bearer-токена = захват сессии без XSS.

**Исправление:** логировать только метод/URL/статус, но не `init`/headers; санитизировать `Authorization`/`apikey` перед `console.*`; в проде отключить verbose-ретраи.

---

### SEC-17 — P2: загрузка аватара без серверной валидации типа в публичный бакет
**Файл:** `src/core/auth_service.ts:26-36`; миграция `255-271`.

```ts
26:   async uploadAvatar(userId: string, file: File) {
27:     const fileExt = file.name.split(".").pop();
28:     const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;
29: 
30:     const { error: uploadError } = await client.storage
31:       .from(DB_BUCKETS.IMAGES)
32:       .upload(fileName, file, { upsert: true });
...
36:     const { data } = client.storage.from(DB_BUCKETS.IMAGES).getPublicUrl(fileName);
```

Ограничение на клиенте — только `file.size > 5MB` (`src/core/auth.ts:182-185`); нет проверки MIME/расширения, а `fileExt` берётся из имени файла (может быть `html`, `svg`, `js`). Бакет `image-files` по политике публично читаемый (`storage_images_public_read`), запись — в `avatars/<uid>%`. Supabase Storage по умолчанию отдаёт файл с `Content-Type` из загрузки, что позволяет хостить активный контент на домене проекта (фишинг/abuse; на отдельном origin — не крадёт сессию приложения, но репутационно и для обхода фильтров).

**Влияние:** неограниченная по типу файловая загрузка в публичный бакет, abuse-хостинг, возможность залить «аватар» огромного размера/разархивируемый SVG-вектор (если бакет позволит `image/svg+xml`), квота Storage.

**Исправление:** на сервере (Edge) проверять magic-bytes/MIME по allowlist (`image/jpeg|png|webp`), размер, перегенерировать имя (`crypto.randomUUID()`), хранить аватары в приватном бакете со signed URL; в bucket-настройках запретить лишние MIME.

---

### SEC-18 — P2: внутренний вызов `background-worker → regenerate-image` аутентифицируется service-role JWT и всегда падает
**Файлы:** `supabase/functions/background-worker/index.ts:95-103`; `_shared/clients.ts:92-98`; `_shared/auth.ts:32-40`.

```ts
 95:               supabaseAdmin.functions
 96:                 .invoke<ImageResult>(FUNCTION_NAMES.REGENERATE_IMAGE, {
 97:                   body: {
 98:                     mode: "auto",
 99:                     id: word.id,
100:                     word: word.word_kr,
101:                     translation: word.translation,
102:                   },
103:                 })
```

`supabaseAdmin` создан с secret-ключом и `auth: {persistSession:false,...}` (`_shared/clients.ts:92-98`); `functions.invoke` подставит `Authorization: Bearer <service_role_secret>`. В `regenerate-image` же:

```ts
 32:   const supabase = getSupabaseClientForUser(`Bearer ${token}`);
 33:   const {
 34:     data: { user },
 35:     error,
 36:   } = await supabase.auth.getUser(token);
 37: 
 38:   if (error || !user) {
 39:     throw new HttpError("Unauthorized", 401);
```

`auth.getUser()` на service-role ключе вернёт ошибку (это не пользовательский access token) → 401, ошибка ловится и логируется (`background-worker:112-114`), картинки не обновляются. Это одновременно функциональная поломка и индикатор того, что «внутренний вызов» не имеет отдельной модели авторизации.

**Влияние:** фоновый конвейер изображений не работает (данные остаются без `image` навсегда, слова снова и снова попадают в выборку `.or("image.is.null")` — лишняя нагрузка), а попытка «починить» подталкивает к выдаче service-role токенов наружу.

**Исправление:** ввести сервисный контракт для внутренних вызовов (`x-internal-secret`/HMAC, проверяемый shared-хелпером) и отдельный код-путь без `getUser`; либо вызывать общую реализацию функции напрямую (импорт `processAndStoreImage`), а не по HTTP.

---

### SEC-19 — P2: нет провижининга `profiles` — `is_admin()` не на что опираться
**Файлы:** миграция `161-177`; `supabase/functions/get-feedback-reports/index.ts:9-22`.

```sql
161: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
162: 
163: DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
164: CREATE POLICY profiles_select_own ON public.profiles
165:   FOR SELECT TO authenticated
166:   USING (id = auth.uid());
```

В миграции нет ни `CREATE TRIGGER ... ON auth.users`, ни политики/процедуры создания `profiles`; клиент таблицу не использует (grep — 0). Админ-функции полагаются на `profiles.role`:

```ts
 11:   const { data: profile, error } = await adminClient
 12:     .from(DB_TABLES.PROFILES)
 13:     .select("role")
 14:     .eq("id", userId)
 15:     .maybeSingle();
...
 18:   if (profile?.role !== "admin") {
 19:     throw new HttpError("Forbidden: admin role required", 403);
```

**Влияние:** либо админ-функции недоступны никому (нет строк), либо роли назначаются SQL-ом «руками» без процедуры и аудита (что и делает SEC-01 эксплуатируемым); невозможно воспроизвести окружение по репозиторию.

**Исправление:** добавить миграцию с триггером `handle_new_user()` (SECURITY DEFINER, `search_path=public`) и отдельную защищённую процедуру назначения admin (service-role/SQL под ревью), документировать в README; проверять `role` в Edge через `app_metadata` (серверное поле), а не только таблицу.

---

### SEC-20 — P2: RLS drift — лидерборд и шаринг списков требуют политик, которых нет в миграции
**Файлы:** `supabase/migrations/0001_initial_rls.sql:141-146`, `106-111`; `src/ui/ui_leaderboard.ts:131-141`; `src/app.ts:1500-1517`.

```sql
141: ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
142: DROP POLICY IF EXISTS user_global_stats_own_all ON public.user_global_stats;
143: CREATE POLICY user_global_stats_own_all ON public.user_global_stats
144:   FOR ALL TO authenticated
145:   USING (user_id = auth.uid())
146:   WITH CHECK (user_id = auth.uid());
```

```ts
131:       let query = client
132:         .from(DB_TABLES.USER_GLOBAL_STATS)
133:         .select("user_id, xp, weekly_xp, level, full_name, avatar_url, league");
```

Лидерборд читает **все** строки `user_global_stats` (нужен публичный SELECT), а шаринг списков (`src/app.ts:1508-1516`, `user_lists.select("*").eq("id", sharedListId)`) требует SELECT чужой строки `user_lists` + `list_items` — в миграции ни того, ни другого нет (политика `user_lists_own_all` — только `user_id = auth.uid()`).

**Влияние:** либо фичи не работают в проде (и это скрыто), либо в живом Supabase присутствуют неописанные permissive-политики (например, `USING (true)` на `user_lists`) — тогда репозиторий не описывает реальную модель доступа, а аудит RLS невозможен; в случае шаринга это раскрывает названия/состав чужих списков.

**Исправление:** явно описать обе фичи в миграциях: для лидерборда — публичное представление (`view`) с ограниченным набором колонок; для шаринга — флаг `is_shared` + политика SELECT только при `is_shared = true`, `list_items` через родителя с тем же флагом; отключить `user_id` и приватные поля в публичной выборке.

---

### SEC-21 — P2: клиент вызывает RPC `cleanup_user_progress`, которой нет в репозитории
**Файл:** `src/core/db.ts:428-433`.

```ts
428:     const { error: rpcError } = await client.rpc("cleanup_user_progress");
429:     if (rpcError) {
430:       // Ignore AbortError for cleanup, it's not critical
431:       if (rpcError.message && !rpcError.message.includes("AbortError"))
432:         console.warn("Server cleanup skipped:", rpcError.message);
433:     }
```

Функция не описана ни в одной миграции (в репо один `0001_initial_rls.sql`). Она выполняется от `authenticated` и, судя по имени, удаляет/чистит `user_progress`. Если она `SECURITY DEFINER` без `auth.uid()`-фильтра и `SET search_path` — это потенциальное удаление/чтение чужих строк и классическая цель для SQLi/ privilege escalation в теле функции.

**Влияние:** неаудируемая серверная логика с правами definer'а в проде; невозможно проверить, что она не затрагивает чужие данные; при ошибке в теле — риск порчи данных (потеря прогресса).

**Исправление:** добавить функцию в миграции с `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public` и жёстким фильтром `WHERE user_id = auth.uid()`; либо убрать клиентский вызов и чистить данные на сервере по расписанию. Проверить `pg_proc.prosrc` в живом Supabase.

---

### SEC-22 — P2: прямые записи через PostgREST обходят валидацию Edge-функций и лимиты
**Файлы:** миграция `182-196`, `87-92`, `50-53`; `submit-feedback/index.ts:78-103`.

```sql
187: DROP POLICY IF EXISTS feedback_reports_own_insert ON public.feedback_reports;
188: CREATE POLICY feedback_reports_own_insert ON public.feedback_reports
189:   FOR INSERT TO authenticated
190:   WITH CHECK (user_id = auth.uid());
```
```ts
 78:     const type = requireOneOf(body.type, FEEDBACK_TYPES, "type");
 79:     const title = requireString(body.title, "title", LIMITS.MAX_FEEDBACK_TITLE_LENGTH);
 80:     const description = requireString(
 81:       body.description,
 82:       "description",
 83:       LIMITS.MAX_FEEDBACK_DESCRIPTION_LENGTH,
 84:     );
```

Валидация длины/типа/priority и rate limit (92-103) реализованы **только** в Edge-функции; но RLS разрешает клиенту писать в `feedback_reports`, `word_requests`, `vocabulary` напрямую через `POST /rest/v1/...`. Обходятся: лимит длины title/description, allowlist MIME (attachments — колонка JSON), лимит 3 отчёта/мин, проверка base64.

**Влияние:** флуд админ-панели огромными HTML-строками (админ их рендерит экранированно, но читает), раздувание БД, спам заявками, обход всех серверных проверок; потенциально — DoS выборки `select("*").limit(100)` для админа.

**Исправление:** разрешить INSERT только через Edge-функции (RLS: `WITH CHECK (false)` для INSERT + писать сервисным клиентом), либо добавить DB-CHECK-констрейнты на длины (`char_length(title) <= 200`) и JSON-схему attachments; включить `pg_net`/триггеры валидации.

---

### SEC-23 — P2: CI передаёт service-role и Gemini ключи в шаг тестов
**Файл:** `.github/workflows/deploy.yml:81-88`.

```yaml
81:       - name: Run Deno tests for Edge Functions
82:         env:
83:           SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
84:           SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
85:           SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
86:           GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
87:         run: deno task test
```

`deno task test` = `deno check ... && deno test ... --allow-net --allow-env` (`deno.json:9`). Существующие тесты (`check-essay.test.ts`, `ocr-image.test.ts`, `regenerate-image.test.ts`) проверяют только константы и **не используют** ни один секрет. При этом job запускается и на `pull_request` в `main` (workflow `on: pull_request`), где для PR из ветвей этого же репозитория секреты доступны.

**Влияние:** любой коммит в PR-ветку (скомпрометированный разработчик, внедрённая зависимость, `deno.land`-импорт) может прочитать service-role и Gemini ключи и вынести их; это ещё один канал к SEC-07.

**Исправление:** убрать секреты из тестового шага (тесты не должны их требовать); секреты выдавать только job `deploy-functions` с `environment:`-protection; разделить workflow на `ci` (без секретов) и `deploy` (только push в main, `id-token`/OIDC вместо статичных ключей, если возможно).

---

### SEC-24 — P2: CI использует плавающие версии actions и `latest` для Supabase CLI
**Файл:** `.github/workflows/deploy.yml:24-31, 62-65, 97-105`.

```yaml
62:       - name: Setup Deno
63:         uses: denoland/setup-deno@v1
64:         with:
65:           deno-version: v2.9.6
...
 97:       - name: Setup Supabase CLI
 98:         uses: supabase/setup-cli@v1
 99:         with:
100:           version: latest
```

Actions `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`, `denoland/setup-deno@v1`, `supabase/setup-cli@v1` не запинены по SHA; Supabase CLI — `latest`; `deno.lock`/`package-lock.json` в CI используются, но `deno` не `--frozen`. Итог: невоспроизводимый деплой и доверие mutable-тегам с правами на `SUPABASE_ACCESS_TOKEN`.

**Влияние:** компрометация любого из actions/CLI (или подмена тега) = выполнение кода в CI с токеном доступа к Supabase и возможность внедрить бэкдор в функции; «работает локально — сломалось в CI» без изменения кода.

**Исправление:** пиннить все actions по полному commit SHA (Dependabot/`pin-github-action`), Supabase CLI — фиксированная версия, `deno install --frozen --lock=deno.lock`, регулярный пересчёт SHA.

---

### SEC-25 — P2: prompt injection в Gemini — пользовательский текст вставляется в промпт без разделителей
**Файлы:** `check-essay/index.ts:107-111`; `generate-word-data/index.ts:82-99`; `ocr-image/index.ts:17-22`.

```ts
107:     const promptParts: string[] = [
108:       "You are an official TOPIK II writing examiner.",
109:       `Task type: ${taskType}`,
110:       `Task prompt: ${question || "(see the image attached below)"}`,
111:       `Student answer: ${answer}`,
```

Пользовательский `question`/`answer` (до 2000/8000 симв.) и изображение вставляются в промпт без маркеров и без явной инструкции «данные — не инструкции». `generate-word-data:98` клеит `words.join(", ")`. `ocr-image` просит распознать текст на картинке — туда можно вставить «инструкции» прямо на изображении.

**Влияние:** модель может выдать искажённую оценку/фидбек (пользователь обманывает экзаменационную проверку), сгенерировать нежелательный/оскорбительный контент в `check-essay`-фидбеке (рендерится экранированно → XSS нет), «отравить» `ai_cache` для ключа, совпадающего с запросом (сложно, но возможно), сжечь квоту. Оценка влияния ограничена: вывод валидируется Zod/`validateEssayResult` и экранируется в UI; это осознанно не P1.

**Исправление:** обернуть данные в `<data>...</data>` с инструкцией игнорировать инструкции внутри; для OCR/essay — отдельные `systemInstruction`; валидировать/фильтровать контент перед кэшированием в `ai_cache`; ограничить размер ответа и логировать подозрительные вызовы.

---

### SEC-26 — P2: `window.*`-биндинги открывают destructive-функции глобально
**Файл:** `src/core/window_bindings.ts:47-138`.

```ts
 47: export function setupWindowBindings(searchWorker?: Worker | null): void {
 48:   Object.assign(window, {
 49:     openConfirm,
 50:     closeConfirm,
 51:     exportProgress: () => import("../ui/ui_data.ts").then((m) => m.exportProgress()),
 52:     saveAndRender,
 53:     importProgress: (event: Event) =>
 54:       import("../ui/ui_data.ts").then((m) => m.importProgress(event)),
 55:     clearData: () => import("../ui/ui_data.ts").then((m) => m.clearData()),
...
111:     deleteList: (id: string, btn?: HTMLElement) =>
112:       import("../ui/ui_collections.ts").then((m) => m.deleteList(id, btn)),
```

Всего ~40 функций, включая `clearData`, `handleDeleteAccount`, `importProgress`, `handleAuth`, `deleteList`, `openEditWordModal`. Это: (а) расширяет поверхность для любого DOM-XSS-гаджета (payload может вызвать `window.clearData()`, `window.handleDeleteAccount()`); (б) конфликтует с любым сторонним/встроенным скриптом (`window.speak`, `window.openConfirm` можно перезаписать — и тогда UI-кнопки, использующие inline `onclick="..."` из HTML-шаблонов, начнут вызывать чужой код); (в) затрудняет аудит: непонятно, кто вызывает функцию.

**Влияние:** усиление любого XSS/self-XSS (вплоть до уничтожения данных одной командой), хрупкость архитектуры, риск случайной/злонамеренной подмены API.

**Исправление:** убрать из `window` всё, кроме действительно необходимых inline-handler'ов; перевести HTML на `data-action`-делегирование (механизм уже есть в `app.ts:358+`); оставшееся — в один namespace `window.__topik` и только в `import.meta.env.DEV`.

---

### SEC-27 — P2: fail-open мок-клиент Supabase при отсутствии env
**Файл:** `src/core/supabaseClient.ts:177-262`.

```ts
152: export const client: SupabaseClient =
153:   SUPABASE_URL && SUPABASE_KEY
154:     ? createClient(SUPABASE_URL, SUPABASE_KEY, {
...
177:     : ({
178:         from: () => ({
179:           select: () => Promise.resolve({ data: [], error: null }),
180:           insert: () => Promise.resolve({ data: null, error: null }),
...
189:         auth: {
190:           getUser: () =>
191:             Promise.resolve({
192:               data: {
193:                 user: {
194:                   id: "mock-user-id",
```

При отсутствии `VITE_SUPABASE_URL/KEY` клиент молча становится фейковым: `getUser()` возвращает «пользователя» `mock-user-id`, все записи успешны (no-op), `getSession()` — `null`. В production это означает: приложение «работает», UI сообщает об успешном сохранении, но данные не сохраняются; при этом часть логики считает пользователя авторизованным.

**Влияние:** silent data loss для пользователей при ошибке деплоя (пустые secrets в CI/хостинге), обман пользователя, усложнение диагностики; в связке с `persistSession` — путаница с сессиями.

**Исправление:** мок-режим только при `import.meta.env.DEV || import.meta.env.MODE === 'test'`; в production бросать исключение и показывать критический экран ошибки; CI-шаг проверки, что env заданы перед сборкой.

---

### SEC-28 — P2: неэкранированные поля `quotes` в `innerHTML` (stored XSS при компрометации админа)
**Файл:** `src/app.ts:1037-1051`; миграция `77-81`.

```ts
1037:             let html = `<div class="welcome-quote-card">`;
1038:             html += `<button class="quote-fav-btn ${activeClass}" data-action="save-quote">${heart}</button>`;
1039:             html += `<div class="welcome-kr" id="welcome-quote-kr"></div>`;
1040:             html += `<div class="welcome-ru" id="welcome-quote-ru"></div>`;
1041: 
1042:             if (quote.literal_translation) {
1043:               html += `<div class="welcome-literal" style="opacity:0; animation:fadeIn 0.8s ease 1.5s forwards">(Дословно: ${quote.literal_translation})</div>`;
1044:             }
1045: 
1046:             if (quote.explanation) {
1047:               html += `<div class="welcome-explanation" style="opacity:0; animation:fadeIn 0.8s ease 2s forwards">💡 ${quote.explanation}</div>`;
1048:             }
```

`quote_kr`/`quote_ru` выводятся через `textContent` (безопасно), а `literal_translation`/`explanation` — конкатенацией в `innerHTML`. `quotes` пишется только admin/service-role (`quotes_admin_all`, миграция 77-81), поэтому напрямую из пользовательского аккаунта эксплуатировать нельзя — но в связке с SEC-01 (повышение до admin) это stored XSS **для всех пользователей** на welcome-экране (самый посещаемый экран запуска).

**Влияние:** XSS всем пользователям → кража сессий из localStorage → массовый ATO; это усилитель P0 SEC-01.

**Исправление:** `escapeHtml(quote.literal_translation)` / `escapeHtml(quote.explanation)` (или `textContent`-узлы), как уже сделано для остальных полей; не хранить HTML в контенте БД.

---

### SEC-29 — P3: импорт бэкапа без схемы/лимитов
**Файл:** `src/ui/ui_data.ts:187-316`.

```ts
233:       if (!data || typeof data !== "object") throw new Error("Invalid data format");
234: 
235:       if (data.stats) {
236:         state.userStats.xp = Number(data.stats.xp) || 0;
237:         state.userStats.level = Math.max(1, Number(data.stats.level) || 1);
238:         state.userStats.sprintRecord = data.stats.sprintRecord || 0;
239:         state.userStats.survivalRecord = data.stats.survivalRecord || 0;
240:         state.userStats.coins = data.stats.coins || 0;
```

Единственная валидация — «это объект»; далее без проверки типов/диапазонов присваиваются `coins`, `league`, `customWords`, `wordHistory` и т.д., затем `saveAndRender()` + синхронизация в облако. `customWords`/`wordHistory` могут быть сколь угодно большими.

**Влияние:** (а) читерство (импортировал `coins=1e9` → облако → лидерборд); (б) переполнение localStorage/срыв UI (DoS); (в) социальная инженерия «импортируй бэкап» → управление state; XSS нет (рендер экранирован).

**Исправление:** валидация схемы (zod), лимиты количества/длины, отказ от синка импортированного как доверенного, подтверждение с диффом, проверка `version` бэкапа.

---

### SEC-30 — P3: избыточная выборка PII в админ-функции
**Файл:** `supabase/functions/get-feedback-reports/index.ts:39-70`.

```ts
 39:     const { data: reports, error } = await adminClient
 40:       .from(DB_TABLES.FEEDBACK_REPORTS)
 41:       .select("*")
 42:       .order("created_at", { ascending: false })
 43:       .limit(100);
...
 54:       const { data: foundProfiles } = await adminClient
 55:         .from(DB_TABLES.PROFILES)
 56:         .select("*")
 57:         .in("id", userIds);
```

`select("*")` из двух таблиц + email каждого автора отчёта. Для админ-панели нужен ограниченный набор колонок; email — только по явному запросу. Чем меньше PII уходит в браузер и логи, тем меньше последствия компрометации админ-аккаунта (SEC-01).

**Влияние:** избыточное раскрытие PII, риск попадания email в расширения/логи/screen share.

**Исправление:** явные `select("id,title,description,type,priority,status,created_at,user_id,attachments")` и `select("id,full_name")`; email — отдельным защищённым endpoint'ом по одному пользователю.

---

### SEC-31 — P3: в git закоммичены артефакты Supabase CLI
**Файлы:** `.gitignore:1-5`; отслеживаются `supabase/.temp/cli-latest`, `supabase/.temp/gotrue-version`, `supabase/.temp/linked-project.json`, `supabase/.temp/pooler-url`, `supabase/.temp/postgres-version`, `supabase/.temp/project-ref`, `supabase/.temp/rest-version`, `supabase/.temp/storage-*`, `supabase/.branches/_current_branch`.

`.gitignore` содержит только `node_modules`, `dist`, `.env`, `.DS_Store`, `Thumbs.db`. `linked-project.json` хранит `ref`, `name`, `organization_id`, `organization_slug`; `pooler-url` — хост/регион пулера (пароля в файле нет, проверено). Секретов нет, но это инфраструктурные идентификаторы и шум.

**Влияние:** раскрытие project-ref/организации/региона (помогает атакующему в разведке), грязный diff, риск, что в `.temp` однажды окажется refresh-token CLI.

**Исправление:** добавить в `.gitignore`: `supabase/.temp/`, `supabase/.branches/`, `coverage/`, `*.log`; `git rm -r --cached supabase/.temp supabase/.branches`.

---

### SEC-32 — P3: `_redirects` от Netlify при деплое на GitHub Pages; security-заголовки задать негде
**Файлы:** `public/_redirects:1`; `package.json:10`.

```text
1: /* /index.html 200
```
```json
10:     "deploy": "npm run build && npx gh-pages -d dist",
```

`_redirects` — формат Netlify; `gh-pages` его игнорирует, поэтому SPA-маршруты (`/some/path`) на GitHub Pages дадут 404. Одновременно GitHub Pages не позволяет задавать HTTP-заголовки (CSP/HSTS), а `_headers` в `public/` отсутствует — то есть выбранный способ деплоя несовместим с SEC-09.

**Влияние:** поломка маршрутизации; невозможность внедрить security-заголовки на хостинге → CSP останется только `<meta>` (без `frame-ancestors`).

**Исправление:** определиться с хостингом; Netlify/Cloudflare Pages/Vercel — добавить `public/_headers` с CSP/HSTS и оставить `_redirects`; для GitHub Pages — перейти на meta-CSP + отказ от inline-кода и рассмотреть перенос.

---

### SEC-33 — P3: захардкоженный токен неофициального Edge TTS и зависимость от внешнего сервиса
**Файлы:** `supabase/functions/_shared/constants.ts:103-111`; `_shared/tts.ts:25`.

```ts
103: export const API_URLS = {
104:   // Google TTS больше не используется, заменен на Edge TTS
105:   EDGE_TTS:
106:     "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4",
```

Это не секрет (публичный клиентский токен Edge), но: неофициальный API Microsoft, может быть заблокирован/изменён в любой момент; синтезируемый текст (слова/примеры, для `retry-word-request` — теоретически произвольный `word_kr`) уходит в Microsoft.

**Влияние:** хрупкость пайплайна (все аудио сломаются при блокировке), вопросы ToS/приватности, отсутствие контроля над содержимым, отправляемым внешнему сервису.

**Исправление:** перейти на официальный TTS (Google/Azure) с ключом в Supabase Secrets, ограничить текст, добавить fallback и мониторинг ошибок TTS.

---

### SEC-34 — P3: `ai_cache` растёт без очистки, ключи из пользовательского ввода
**Файлы:** `generate-word-data/index.ts:191-231`; `regenerate-image/index.ts:236-281`.

```ts
191:     const cacheKey = `word-data:${words.map((w) => w.trim().toLowerCase()).join(",")}`;
...
226:         await supabase.from(DB_TABLES.AI_CACHE).insert({
227:           cache_key: cacheKey,
228:           response_data: dataToCache,
229:           expires_at: expiresAt.toISOString(),
230:         });
```

`expires_at` фильтруется только на чтении (`gt("expires_at", ...)`), фоновой очистки нет; уникальные ключи (разные наборы слов/запросы картинок) неограниченно создаются пользователями. `response_data` не ограничен по размеру (вывод Gemini/Zod).

**Влияние:** неограниченный рост БД, рост стоимости бэкапов, потенциальное «отравление» кэша (SEC-25), замедление выборок.

**Исправление:** cron-очистка `DELETE FROM ai_cache WHERE expires_at < now()`, TTL-политика (pg_cron), лимит размера `response_data`, нормализация/хеширование ключей с ограничением длины.

---

### SEC-35 — P3: сломанный template-literal в `ui_feedback.ts` + неэкранированное имя файла (self-XSS)
**Файл:** `src/ui/ui_feedback.ts:232-241`.

```ts
232:       item.innerHTML = `
233:         ${preview}
234: 
235: // Automatically open feedback modal if URL hash contains #feedback
236: if (window.location.hash === "#feedback") {
237:     uiFeedback.show();
238:     window.history.replaceState(null, "", window.location.pathname);
239: }
240:         <button class="remove-btn">✕</button>
241:       `;
```

JavaScript-код оказался **внутри** HTML-строки (литералом), а не в коде — обработчик `#feedback` не работает. Плюс `preview` (строки 225, 227-229) вставляет `${att.file.name}` и `${att.previewUrl}` в `innerHTML` без экранирования — имя локального файла с `"`/`<` даёт self-XSS (вредоносно только для самого пользователя, но это готовый вектор для будущих сценариев с чужими вложениями).

**Влияние:** неработающий deep-link (функциональный дефект), self-XSS, «мертвый» код сбивает аудит.

**Исправление:** вынести `if (location.hash === '#feedback')` в обычный код инициализации; `escapeHtml(att.file.name)`; для изображений использовать `createElement('img').src`.

---

### SEC-36 — P3: unescape `${list.title}`/`${list.icon}` в `ui_card.ts` (self-XSS)
**Файл:** `src/ui/ui_card.ts:613-623`.

```ts
613:   content.innerHTML = myLists
614:     .map((list, index) => {
615:       const hasWord = collectionsState.listItems[list.id]?.has(wordId);
616:       return `
617:         <div class="multiselect-item" data-action="toggle-word-in-list" data-list-id="${list.id}" data-word-id="${wordId}" style="animation: fadeInUpList 0.3s ease-out ${index * 0.05}s backwards">
618:             <input type="checkbox" ${hasWord ? "checked" : ""} style="pointer-events: none;">
619:             <span style="margin-left: 10px;">${list.icon || "📁"} ${list.title}</span>
```

Список — только свой (`filter(l => l.user_id === user.id)`), поэтому сейчас self-XSS. Но аналогичный код в `ui_collections.ts:766` уже экранирует `list.icon`/`list.title` — расхождение опасно: при добавлении «общих списков» (SEC-20) это станет полноценным stored XSS.

**Влияние:** self-XSS сейчас; потенциальный stored XSS при появлении шаринга.

**Исправление:** `escapeHtml(list.icon)`/`escapeHtml(list.title)`, как в `ui_collections.ts`.

---

### SEC-37 — P3: слабая парольная политика и отсутствие MFA
**Файл:** `src/core/auth.ts:616-627`, `838-866`.

```ts
616: export async function handleChangePassword() {
617:   const newPassInput = document.getElementById("new-password") as HTMLInputElement | null;
618:   if (!newPassInput) return;
619:   const newPass = newPassInput.value.trim();
620:   if (!newPass) {
621:     alert("Введите новый пароль");
622:     return;
623:   }
624:   if (newPass.length < 6) {
625:     alert("Пароль должен содержать минимум 6 символов");
626:     return;
627:   }
```

Минимум — 6 символов, проверка только клиентская; `getPasswordStrength` (838-866) — информативная. MFA для admin отсутствует; admin-функции защищены только ролью из БД (SEC-01/SEC-19).

**Влияние:** брутфорс/credential stuffing, слабые пароли у админов; при утечке пароля — прямой вход.

**Исправление:** Supabase Auth settings: min length ≥12, `HIBP`-проверка, CAPTCHA на signup/login, rate limit на sign-in, обязательный MFA (TOTP) для admin-ролей; серверная валидация пароля на смене.

---

### SEC-38 — P3: приватность: сочинения/черновики в открытом localStorage и уход в Gemini без согласия
**Файлы:** `src/ui/ui_writing.ts:530, 566-572`; `supabase/functions/check-essay/index.ts:142-150`.

```ts
530:   localStorage.setItem(LS_KEYS.WRITING_DRAFT, JSON.stringify(draft));
```
```ts
142:     console.log(`📝 Essay check for user ${user.id}: taskType=${taskType}`);
143:     const response = await withTimeout(
144:       model.generateContent({ contents: [{ role: "user", parts }] }),
```

Черновики и история сочинений (потенциально личные тексты) хранятся в localStorage без шифрования и без TTL; пользовательский текст отправляется в Google Gemini; в UI нет уведомления/согласия, нет политики retention. Логи Edge содержат `user.id` (не PII напрямую, но связка с email в `profiles`).

**Влияние:** соответствие GDPR/152-ФЗ под вопросом; данные остаются на устройстве после использования; третья сторона получает пользовательский контент.

**Исправление:** уведомление/согласие перед AI-проверкой, TTL и «очистить черновики» в настройках, шифрование/хранение в IndexedDB с сроком, документация в Privacy Policy; по возможности — не логировать `user.id` в проде.

---

### SEC-39 — P3: мёртвый файл-дубликат констант с расходящимися лимитами и моделями
**Файл:** `supabase/functions/constants.ts:1-38`.

```ts
 4: export const GEMINI_MODELS = {
 5:   /** Быстрая и недорогая модель для простых задач (генерация слов, медиа). */
 6:   FLASH: "models/gemini-1.5-flash-latest",
 7:   /** Мощная модель для сложных задач (проверка эссе, генерация контента). */
 8:   PRO: "models/gemini-1.5-pro-latest",
...
11: export const LIMITS = {
12:   MAX_WORDS_PER_REQUEST: 50,
13:   MAX_WORD_LENGTH: 100,
```

Ни одна функция не импортирует `constants.ts` (все используют `shared/constants.ts` / `../_shared/constants.ts`). При этом значения расходятся: `_shared/constants.ts:43-44` — `MAX_WORDS_PER_REQUEST: 20`, `MAX_WORD_LENGTH: 60`; модели — `gemini-2.5-*`. Файл — ловушка для будущих правок: легко «усилить лимиты» в неиспользуемом файле и получить ложное чувство защищённости.

**Влияние:** риск расхождения валидации/моделей, путаница при аудите.

**Исправление:** удалить `supabase/functions/constants.ts`, оставить единственный `_shared/constants.ts`; добавить в CI проверку `deno task check`, которая ловит дубликаты (уже покрывает по факту).

---

### SEC-40 — P3: CORS `*` на всех Edge-функциях, включая админские
**Файл:** `supabase/functions/_shared/constants.ts:1-6`.

```ts
1: export const corsHeaders = {
2:   "Access-Control-Allow-Origin": "*",
3:   "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
4:   // DELETE нужен delete-user, GET — admin-функции, POST — остальные вызовы.
5:   "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
6: };
```

Авторизация — Bearer-токен (не cookie), поэтому классический CSRF невозможен. Но: любой чужой origin может вызывать функции с украденным токеном и **читать** ответ (включая `get-feedback-reports` с email), а также использовать приложение как бесплатный прокси к Gemini. Это нарушает least privilege и мешает защите от token-theft-сценариев.

**Влияние:** расширение возможностей атакующего при компрометации токена; отсутствие origin-контроля.

**Исправление:** `Access-Control-Allow-Origin: https://app.example.com` (allowlist по Origin), `Vary: Origin`; для `get-feedback-reports`/`update-feedback-status` — минимум разрешённых origin; preflight обрабатывать от allowlist.

---

## Хорошо сделано (честно)

1. **JWT-проверка во всех пользовательских функциях.** `_shared/auth.ts:20-43` единообразно парсит `Authorization: Bearer`, вызывает `supabase.auth.getUser(token)` и передаёт `supabase`-клиент с JWT; `user.id` нигде не берётся из тела. `delete-user`, `get-feedback-reports`, `update-feedback-status`, `generate-word-data`, `check-essay`, `ocr-image`, `process-word-request`, `retry-word-request`, `submit-feedback`, `generate-media-for-word`, `regenerate-image` — все вызывают его.
2. **Проверки владения объектами** в `process-word-request:93-95` (заявка принадлежит JWT-пользователю), `:106-114` (список), `retry-word-request:34-42`, `generate-media-for-word:45-48` — сделано корректно, включая проверку доступа к `target_list_id`.
3. **`escapeHtml()` реализован правильно** (`src/utils/utils.ts:6-15`: `&`, `<`, `>`, `"`, `'`, бэктик) и применён в подавляющем большинстве динамических HTML-синков (`ui_admin`, `ui_leaderboard`, `renderer`, `quiz`, `ui_reading`, `ui_writing`, `ui_trash`, `ui_failed_requests`, `ui_quotes` и др.). Хелперы `generateDiffHtml`/`typeText`/`openConfirm` — безопасные.
4. **Нет опасных примитивов:** grep по `src/` не нашёл ни одного `eval(`, `new Function`, `document.write`, `srcdoc`, `javascript:`-ссылок в шаблонах.
5. **SSRF-защита в `regenerate-image`:** https-only, запрет userinfo, allowlist хостов (`cdn.pixabay.com`, `pexels`, `unsplash`), HEAD/GET с таймаутами, проверка `Content-Length`/`Content-Type`/реального размера (`regenerate-image:17-34, 59-90, 145-152`).
6. **Единая валидация ввода Edge-функций** (`_shared/validation.ts`): ограничения длины, base64-проверка с оценкой реального размера, allowlist MIME, запрет `..`/`/` в именах вложений (`submit-feedback:51-54`).
7. **Ошибки 5xx не утекают клиенту** (`_shared/utils.ts:46-52`), `HttpError` для 4xx — контролируемый.
8. **`is_admin()` — SECURITY DEFINER с `SET search_path = public`, REVOKE от PUBLIC и GRANT только `authenticated`** (`0001_initial_rls.sql:13-29`) — сама функция защищена от search_path-хайджека (проблема в политике `profiles`, не в функции).
9. **RLS включена почти на всех таблицах**, `list_items` корректно проверяется через родительский `user_lists`, `ai_cache` закрыт от клиентов, Storage-политики привязаны к папке `<uid>/`.
10. **Секреты не попадают в клиентский бандл:** в `src/` нет `process.env`/`Deno.env`, используются только `import.meta.env.VITE_*`; `vite.config.ts:7,12-15` через `loadEnv(..., "VITE_")` ограничивает набор; `git ls-files` не содержит `.env` — утечки серверных ключей в репозиторий/бандл **не обнаружено** (это отдельно проверено, несмотря на риск SEC-07).
11. **CI минимально привилегирован:** `permissions: contents: read`, отсутствие `pull_request_target`, секреты передаются через `secrets.*`, а не в открытом виде; загрузка coverage — `retention-days: 5`.
12. **HTTP-методы ограничены** (`delete-user` — DELETE/POST, `get-feedback-reports` — только GET, `update-feedback-status` — POST), `OPTIONS` обрабатывается отдельно и до чтения тела.

---

## Ограничения аудита

Без живого Supabase/Deno и без запуска сборки проверить нельзя (эти пункты должен закрыть Lead/динамическое тестирование):

1. **Фактические RLS-политики и триггеры в прод-БД.** Всё, что написано про SEC-01/SEC-08/SEC-19/SEC-20/SEC-21, выведено из единственной миграции в репо. Если в живом проекте политики/триггеры отличаются (например, есть триггер создания `profiles` или политика чтения `user_global_stats`), часть выводов изменится — это нужно проверить SQL-запросами к `pg_policies`, `pg_proc`, `pg_trigger`.
2. **Настройки Supabase Auth:** требуется ли подтверждение email, минимальная длина пароля, TTL access/refresh-токенов, rate limits GoTrue, разрешённые redirect-URL, включён ли MFA.
3. **Флаги бакетов Storage:** `public`/`private`, allowed MIME, максимальный размер (в миграции бакеты не создаются — только политики). От этого зависит реальный масштаб SEC-17.
4. **Фактические значения `verify_jwt` у задеплоенных функций** (Dashboard может отличаться от `config.toml`) и наличие cron-планировщика, который вызывает `background-worker`; наличие переменной `CRON_SECRET` в Supabase Secrets.
5. **Runtime-поведение Edge Functions:** `supabase-js` в Deno, `imagescript`, `@google/generative-ai`, WebSocket Edge TTS — не запускались; поведение `functions.invoke` с service-role ключом внутри функции (SEC-18) выведено по коду supabase-js и требует подтверждения логами.
6. **Сборка/бандл:** `dist/` по правилам не анализировался; отсутствие секретов в бандле проверено статически по коду (см. «Хорошо сделано» п.10), но не по фактическому артефакту.
7. **CI:** реальные настройки GitHub Environments/секретов, наличие branch protection, кто может пушить в `main`; логи прогонов `tsc`/`lint` присутствуют, но `build`/`vitest` артефакты не проверялись.
8. **Динамика:** не проводились попытки эксплуатации (XSS/IDOR/привилегий), брутфорс, тесты CORS; выводы — по коду, без PoC.
9. **Dependency-CVE:** `npm audit`/`deno audit` не запускались; lock-файлы не сверялись с базой уязвимостей (README сам отмечает это как P3).
10. **Значения секретов** из `.env` в отчёт не включались; проверялось только наличие/имена/длины (и дубликат имени).

---

## Кросс-скоуп (замечено вне зоны безопасности, одной строкой)

- **CI красный:** `audit/logs/tsc.txt:1` — `src/app.ts(149,1) TS6133: 'setSyncState' is declared but its value is never read`; `audit/logs/lint.txt` — 2 error (prettier в `src/core/network.ts:177`, `src/core/xp.ts:26`) и 2 warning → job `test` падает, job `deploy-functions` заблокирован.
- `package-lock.json` изменён в рабочем дереве (незакоммиченное изменение зависимостей) — нужен отдельный review диффа и `npm audit`.
- `src/core/pwa.ts` (diff): отключён авто-`location.reload()` на `controllerchange` — после релиза security-фиксов пользователи могут остаться на старом JS/SW; лучше принудительный reload после активации новой версии.
- В репозитории остался мёртвый дубликат `supabase/functions/constants.ts` (см. SEC-39) и неиспользуемый `debugEnvPresence()` (`_shared/clients.ts:111-123`).
- `index.html:12` — `apple-touch-icon` тянется с `cdn-icons-png.flaticon.com` (внешняя зависимость и трекинг-запрос при каждом открытии).
- Документация расходится с кодом: `GEMINI.md:55` называет `delete-user` «Admin function for complete account deletion», тогда как это self-service; `README.md:218-241` ставит `[x]` напротив «Применить RLS» и «Проверить соответствие схемы миграции реальной БД», хотя SEC-08/SEC-19/SEC-20/SEC-21 показывают обратное.
- Netlify-специфичный `public/_redirects` при деплое через `gh-pages` (см. SEC-32) — похоже, хостинг окончательно не выбран.
- В рабочем дереве остались артефакты миграции структуры (`__pycache__`, `requirements.txt`, `settings.json`, корневой `index.ts`) — удалены в WT, но стоит закоммитить очистку.

---

*Отчёт подготовлен только на основании чтения кода из указанных путей; все цитаты приведены с реальными номерами строк. Значения секретов не печатались.*
