# Аудит бэкенда TOPIK II Master Pro

**Дата аудита:** 2026-11-22
**Commit (HEAD):** `cc7f8333272c715de22d1a883b924bb576f2cbd0` — «P0+P1 fixes: RLS, outbox sync, session pause/resume, XSS fixes, PWA offline, Edge Functions verify_jwt, ocr-image, update-feedback-status» (2026-11-20 17:41:47 +0500), ветка `main`.
**Аудируемый срез:** рабочее дерево. Бэкенд в рабочем дереве **идентичен HEAD** с точностью до CRLF: `git diff --stat` по `supabase/**` содержит только удаление `supabase/functions/find-confusing-words/deno.json`, удаление пустого `supabase/functions/regenerate-image/settings.json` (0 байт) и удаление дубля ключа `"zod"` в `supabase/functions/generate-word-data/deno.json` (было два одинаковых ключа — исправление в рабочем дереве, `git diff` ниже). Все 12 `index.ts` и `_shared/*` по содержимому = HEAD (разница размеров — CRLF/EOL из `.gitattributes`).
**Окружение:** Windows, PowerShell 5.1; `deno` в системе отсутствует; Supabase CLI не запускался; доступ к живой БД/дашборду/секретам отсутствует. Эталонные прогоны Lead: `audit/logs/build.txt` (падение `tsc`), `audit/logs/tsc.txt`, `audit/logs/test-escalated.txt` (vitest 29/29 pass), `audit/logs/lint.txt` (2 prettier error во фронте). Deno-прогонов в `audit/logs` нет.

## Полный список прочитанных файлов

Бэкенд (полностью прочитаны):
`supabase/migrations/0001_initial_rls.sql`; `supabase/config.toml`; `deno.json` (корень); `deno.lock` (корень, частично — структура/workspace); `supabase/functions/deno.json`; `supabase/functions/deno.lock` (структура/pinned-версии); `supabase/functions/constants.ts`; `supabase/functions/_shared/{clients,auth,validation,utils,constants,tts,audio,types}.ts`; `supabase/functions/{background-worker,check-essay,delete-user,generate-media-for-word,generate-word-data,get-feedback-reports,ocr-image,process-word-request,regenerate-image,retry-word-request,submit-feedback,update-feedback-status}/index.ts` и их `deno.json`; `supabase/functions/{check-essay,ocr-image,regenerate-image}.test.ts`; `supabase/.branches/_current_branch`; `supabase/.temp/*` (только имена/форматы, значения не выводились).

Контракт с фронтом / инфраструктура (читались для сверки схемы):
`src/core/db.ts` (полностью), `src/core/sync.ts` (полностью), `src/core/constants.ts`, `src/core/auth.ts` (фрагменты 700–789), `src/core/auth_service.ts` (1–110), `src/types/index.ts`, `src/ui/ui_leaderboard.ts` (110–209), `src/ui/ui_collections.ts` (95–164), `src/ui/ui_trash.ts` (80–199), `src/ui/ui_custom_words.ts` (230–349, 750–829, 900–1059), `src/ui/ui_feedback.ts` (1–130, 240–349), `src/ui/ui_reading.ts` (20–99), `src/ui/ui_writing.ts` (140–219, 810–885), `src/ui/ui_card.ts` (465–584), `src/ui/ui_bulk.ts` (170–299), `src/ui/ui_admin.ts` (30–179), `src/ui/ui_quotes.ts`, `src/ui/ui_retry.ts` (90–149), `.env.example`, `.env` (только имена и формат значений), `.gitignore`, `.gitattributes`, `.github/workflows/deploy.yml`, `README.md` (95–254), `GEMINI.md`, `package.json`, `audit/logs/*`.
Дополнительно для доказательной базы платформы: официальные документы Supabase (verify_jwt/секреты/лимиты Edge Functions), исходники `rany2/edge-tts` (`drm.py`, `constants.py`) — ссылки в разделах.

---

## Вердикт

Бэкенд функционально богат и местами аккуратно защищён (JWT-проверка через `auth.getUser`, владение строками, SSRF-allowlist, SECURITY DEFINER `is_admin()` с `search_path`), но **как воспроизводимая система он не существует**: единственная миграция содержит только RLS-политики, ни одной таблицы/колонки/индекса/констрейнта/триггера/бакета в репозитории нет, поэтому схема БД, от которой зависит весь код, живёт вне версионирования. Из-за этого почти все критичные дефекты схемы (лидерборд, публичные списки, `updated_at`-синк, upsert-констрейнты, `cleanup_user_progress`, `articles`) не могут быть ни подтверждены, ни исправлены миграцией, а Word-пайплайн (process → generate-word-data → generate-media → regenerate-image) держится на внутренних вызовах Edge Functions, которые ломаются о `verify_jwt` + отсутствие user-JWT. Самая тяжёлая цепочка — фоновые и административные сценарии: `background-worker` недостижим cron'ом (CRON_SECRET ≠ JWT, `verify_jwt = true`), его внутренний вызов `regenerate-image` гарантированно получает 401, триггера создания `profiles` нет, поэтому `is_admin()` никогда не true и админ-функции/Storage-политики мертвы. Плюс IDOR в `regenerate-image`: любой авторизованный пользователь может перезаписать/удалить изображение любой записи `vocabulary` по её `id`. Секреты в git не утекают, и базовые проверки входа сделаны лучше среднего, но текущее состояние — «красиво написанный API к отсутствующей, непроверяемой БД».

---

## Сводная таблица находок

Всего 48 находок: **P0 — 6, P1 — 16, P2 — 21, P3 — 5.**

| ID | Sev | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| BE-01 | P0 | Схема/миграции | `supabase/migrations/0001_initial_rls.sql:1-7` | Единственная миграция — только RLS: нет ни одного `CREATE TABLE`, индекса, констрейнта, триггера, бакета; `seed.sql` отсутствует | Схема БД не версионируется и не воспроизводима; `supabase db push` на новом окружении упадёт/создаст RLS без таблиц; CI/локальный стек не поднимаются | Добавить `0002_schema.sql` (полный дамп `supabase db pull --remote`), `seed.sql` и buckets в `config.toml` |
| BE-02 | P0 | Edge Functions/деплой | `supabase/config.toml:51-54` + `background-worker/index.ts:20-24` | `verify_jwt = true` у `background-worker`, но cron аутентифицируется `Authorization: Bearer <CRON_SECRET>` — gateway отвергает запрос до кода | Cron/фоновый воркер не работает (401 от платформы) — медиа не догоняются | `[functions.background-worker] verify_jwt = false` + оставить CRON_SECRET (или передавать валидный JWT/API-key) |
| BE-03 | P0 | Edge Functions | `background-worker/index.ts:93-116` + `regenerate-image/index.ts:217-220` | Воркер вызывает `regenerate-image` без user-JWT; admin-клиент подставит service/secret-key, а обработчик требует `getAuthenticatedUser` | Авто-генерация картинок не работает никогда; воркер бесполезен даже при снятии BE-02 | Вынести серверную часть картинок в сервисную функцию с `verify_jwt=false` + CRON_SECRET/подписанный внутренний вызов |
| BE-04 | P0 | IDOR/Storage | `regenerate-image/index.ts:158-209, 285-339` | `processAndStoreImage(wordId)` делает `.update(...).eq("id", wordId)` без проверки владельца; принимает любой `id` в `auto`/`finalize` | Любой пользователь может подменить картинку любой (в т.ч. системной) записи `vocabulary` и удалить её старый файл из Storage | Проверять `.eq("created_by", user.id)`/владение до `upload/remove/update`; для системных слов — отдельный admin/service путь |
| BE-05 | P0 | RLS/админ | `0001_initial_rls.sql:13-29, 159-177`; триггеров нет ни в одном SQL | `is_admin()` читает `profiles.role`, но триггера создания `profiles` для новых `auth.users` в репозитории нет; миграция лишь комментирует его существование | `profiles` пуст → `is_admin()` всегда `false`; админ-функции 403, `*_admin_all`-политики и Storage-admin мертвы | Добавить `handle_new_user()` + триггер `AFTER INSERT ON auth.users` в миграцию; либо не полагаться на `profiles`, а на `app_metadata.role` |
| BE-06 | P0 | CI/деплой | `.github/workflows/deploy.yml:43-50, 75-87, 89-93`; `audit/logs/build.txt` | `deploy-functions` требует зелёный `test`, а `test` падает на `npm run check` (`src/app.ts(149,1) TS6133`); вдобавок `deno fmt --check` по неотформатированным TS (152 строки > 80) почти наверняка красный | Ни миграции, ни функции не деплоятся автоматически: изменения бэкенда не доходят до продакшена | Починить `tsc`/`prettier`, прогнать `deno fmt supabase/functions`, добавить `supabase db push` в пайплайн |
| BE-07 | P1 | RLS/схема | `0001_initial_rls.sql` (нет `articles`); `src/ui/ui_reading.ts:38-45` | Таблица `articles` используется фронтом, но в миграции её нет вообще: ни таблицы, ни RLS, ни политик | Если RLS на `articles` включён — чтение статей падает; если выключен — anon/authenticated могут писать/удалять статьи | Миграция: `articles` + RLS + `SELECT TO anon,authenticated USING (true)`, запись — admin/service |
| BE-08 | P1 | RLS/лидерборд | `0001_initial_rls.sql:141-146`; `src/ui/ui_leaderboard.ts:131-141` | Политика `user_global_stats_own_all` пускает только свои строки, а лидерборд выбирает top-50 всех пользователей | Лидерборд показывает максимум одну строку (свою); рейтинг и ранги не работают | Добавить `FOR SELECT TO authenticated USING (true)` на публичные колонки или отдельное view `leaderboard` |
| BE-09 | P1 | RLS/списки | `0001_initial_rls.sql:106-111`; `src/ui/ui_collections.ts:26-28` | `user_lists` политика `user_id = auth.uid()`, но UI читает `.or(user_id.eq.<uid>,is_public.eq.true)` | Публичные списки (`is_public=true`) не видны никому — фича мертва | В SELECT-политику добавить `OR is_public = true`; запись/удаление оставить владельцу |
| BE-10 | P1 | БД/синк | `0001_initial_rls.sql` (нет триггеров/дефолтов); `src/core/db.ts:345-355`; `src/ui/ui_trash.ts:143-146` | Нет триггера `updated_at`; soft-delete (`deleted_at`) и правки не двигают `updated_at`, а инкрементальный синк фильтрует `gt("updated_at", lastSync)` | Удалённые/изменённые слова навсегда остаются в кэше клиентов; корзина/правки не синхронизируются | `set_updated_at()` BEFORE UPDATE + триггер на `vocabulary`; при soft-delete тоже; `updated_at DEFAULT now()` |
| BE-11 | P1 | БД/upsert | `src/core/sync.ts:132-134, 165-167`; `src/ui/ui_bulk.ts:348`; миграция без констрейнтов | Upsert'ы требуют `ON CONFLICT`: `user_global_stats(user_id)`, `user_progress(user_id,word_id)`, `list_items(list_id,word_id)`; в репозитории этих констрейнтов нет | При отсутствии уникальных ключей синк падает целиком («no unique or exclusion constraint»), прогресс/списки не сохраняются | Добавить UNIQUE-констрейнты и покрыть их миграцией + тестом |
| BE-12 | P1 | RPC | `src/core/db.ts:428` (`client.rpc("cleanup_user_progress")`) | RPC-функция вызывается на каждом логине, но не определена ни в одном SQL-файле репозитория | Ошибка на каждом входе (лог-шум), orphan-строки `user_progress` не чистятся | Определить `cleanup_user_progress()` (SECURITY DEFINER, search_path) или убрать вызов и чистить FK-каскадом |
| BE-13 | P1 | Rate limit/стоимость | `process-word-request/index.ts:118-127`; `generate-word-data`, `check-essay`, `ocr-image`, `regenerate-image` — без лимитов | Лимит `count > 15` (off-by-one) обходится удалением своих `word_requests`; на дорогие AI/TTS/поисковые функции лимитов нет | Любой аккаунт может накликать Gemini/TTS/Pixabay/Pexels/Unsplash на деньги; DoS-вектор | Централизованный лимитер (таблица `rate_limits`/Upstash) на user_id+функцию; считать успешные вызовы, а не только строки заявок |
| BE-14 | P1 | Гонки/дубликаты | `process-word-request/index.ts:163-179, 221-230` | Проверка дубликатов и вставка не атомарны; нет UNIQUE `(word_kr, translation)`; повторный вызов на тот же `record.id` не проверяет статус | Параллельные вызовы/ретраи создают дубли слов; дубликаты копятся в словаре | `UNIQUE (word_kr, translation)` + `INSERT ... ON CONFLICT DO NOTHING`; CAS-блокировка статуса `pending→processing` |
| BE-15 | P1 | Целостность | `process-word-request/index.ts:256-271, 277-285` | Batch-upsert'ы в `user_progress`/`list_items` только логируют ошибку; заявка всё равно помечается `processed`; транзакции нет | Частичное сохранение: слова есть, прогресс/списки потеряны; клиент видит «успех» | Обернуть всю операцию в SQL-функцию/транзакцию; при ошибке — статус `error` и компенсация |
| BE-16 | P1 | Ретраи | `retry-word-request/index.ts:44-107`; `background-worker/index.ts:32-36` | `failed_step` читается ретраем, но нигде не пишется (process пишет `status`/`my_notes`); ветка `else` ставит `pending`, а `pending`-заявки никто не обрабатывает | Кнопка «Повторить» для `ai_processing`/`db_insert` — no-op; заявка навсегда `pending` | Писать `failed_step` в обработчике ошибок; сделать обработчик очереди `pending` (worker/RPC) и вызывать его ретраем |
| BE-17 | P1 | delete-user | `delete-user/index.ts:21-37`; `src/core/auth.ts:729-751` | Функция удаляет только `auth.users`; Storage (`feedback_attachments`, аудио/картинки кастомных слов) не чистится; `feedback_reports`, `user_favorite_quotes`, `profiles` — на неизвестных каскадах; клиент удаляет таблицы до вызова функции | Неполное удаление/частичное состояние, «удалённые» файлы остаются публично доступны; GDPR-риск | Серверное удаление по порядку: Storage-файлы → таблицы → `auth.admin.deleteUser`; каскады в миграции + тест |
| BE-18 | P1 | Storage/инфраструктура | `0001_initial_rls.sql:213-296`; `supabase/config.toml` (нет `[storage.buckets.*]`) | Политики на `storage.objects` есть, а создания бакетов (`audio-files`, `image-files`, `feedback_attachments`) нет ни в миграции, ни в config/seed | На новом окружении загрузка/аудио/аватары ломаются; «работает» только там, где бакеты созданы руками | Описать бакеты в `config.toml` (`[storage.buckets.*]`) + `supabase seed buckets` |
| BE-19 | P1 | TTS | `_shared/tts.ts:20-50`; `_shared/constants.ts:103-111` | Неофициальный Edge TTS через голый `new WebSocket(url)` без `Sec-MS-GEC`, `Origin`, `User-Agent`; текущий edge-tts генерирует `Sec-MS-GEC` для **всех** запросов к сервису | Высокий риск 403/пустого аудио, т.е. все аудио-генерации мертвы; требует live-проверки | Отказаться от Edge TTS (официальный Google/Azure TTS) или реализовать `Sec-MS-GEC` + заголовки через WS-клиент с заголовками |
| BE-20 | P1 | Секреты/env | `_shared/clients.ts:38-55` | Код читает старые имена (`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/singular `SUPABASE_SECRET_KEY`), но платформа теперь инжектит JSON-словари `SUPABASE_PUBLISHABLE_KEYS`/`SUPABASE_SECRET_KEYS`; проект использует новые ключи (`sb_publishable_`/`sb_secret_` в `.env`, значения не выводились) | Если legacy-ключи в проекте отключены — `getSupabaseAdmin()` бросает «Missing server secret», падают все admin-операции и функции | Читать `JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS"))["default"]` с fallback на legacy, добавить проверку на старте функции |
| BE-21 | P1 | Кэш/стоимость | `regenerate-image/index.ts:236-250, 271-281` | Чтение кэша фильтрует `gt("expires_at", now)`, а запись `insert({cache_key, response_data})` **без** `expires_at` и без `upsert` | Кэш поиска картинок никогда не срабатывает: каждый поиск = 3 внешних API + дубли строк в `ai_cache` | Писать `expires_at` (+30 дней) и `upsert({onConflict:"cache_key"})`, как в `generate-word-data` |
| BE-22 | P1 | Realtime | миграция без `ALTER PUBLICATION`; `src/ui/ui_custom_words.ts:989-1048` | UI подписан на `postgres_changes` (`word_requests`, `vocabulary`), но таблицы не добавлены в публикацию `supabase_realtime` ни в миграции, ни в конфиге | Realtime-трекинг статусов не приходит; UI деградирует на polling с задержкой 5 с | Добавить `ALTER PUBLICATION supabase_realtime ADD TABLE ...` (или `supabase_realtime` в репозиторий как SQL) |
| BE-23 | P2 | Надёжность | `process-word-request/index.ts:235-242` | `functions.invoke("generate-media-for-word")` без `await`/`EdgeRuntime.waitUntil` — фоновое обещание может быть убито после ответа | Медиа генерируется не всегда; причина «немых» слов не диагностируется | `await` с таймаутом или `EdgeRuntime.waitUntil(promise)`; хранить статус шага в БД |
| BE-24 | P2 | Надёжность | `generate-media-for-word/index.ts:45-48, 101-110` | Проверка владения допускает `word.user_id === user.id`, а апдейт — только `.eq("created_by", user.id)`; при 0 строк функция всё равно возвращает `success` | Тихий «успех» без сохранения медиа; расхождение двух колонок владельца (`created_by`/`user_id`) | Единая колонка владельца (или `.or(created_by.eq.,user_id.eq.)`); проверять `count`/`select()` после update |
| BE-25 | P2 | Feedback | `submit-feedback/index.ts:38-67, 105-135`; `src/ui/ui_feedback.ts:120-130, 278-292` | Клиент разрешает 3 файла по 50 МБ, сервер — 3 файла по 2 МБ (base64 в JSON ≈ 8.4 МБ на запрос); ошибка загрузки файла молча `continue` | Пользователь видит «отправлено» без вложения; крупные скриншоты отваливаются 413/по лимиту платформы | Выровнять лимиты в UI/сервере (напр. 2 МБ), отправлять `multipart/form-data`/direct upload, пробрасывать ошибки загрузки |
| BE-26 | P2 | Feedback/Storage | `get-feedback-reports/index.ts:39-72`; `_shared/constants.ts:26-30` | Вложения лежат в приватном бакете, но API не выдаёт signed URL, а админ-UI их не рендерит | Администратор физически не может посмотреть вложение — фича бессмысленна | Добавить `createSignedUrl` в `get-feedback-reports` (или отдельный endpoint) + UI-просмотр |
| BE-27 | P2 | Дубли/константы | `supabase/functions/constants.ts:4-9` vs `_shared/constants.ts:87-94`; `README.md:228` | Два конкурирующих набора констант: корневой файл (мёртвый) содержит модели `models/gemini-1.5-flash-latest`/`-pro-latest`, `_shared` — `gemini-2.5-flash`/`gemini-2.5-pro`; расходятся `LIMITS` (50/100/5 МБ vs 20/60/3 МБ) | Случайный импорт «старого» файла = 404 модели и другие лимиты; README утверждает, что константы унифицированы | Удалить `supabase/functions/constants.ts`, оставить один `_shared/constants.ts`, тест на единственность |
| BE-28 | P2 | Дубли/архитектура | `check-essay/index.ts:29-41` vs `generate-word-data/index.ts:111-122` vs `ocr-image/index.ts:29-44`; `get-feedback-reports:9-22` vs `update-feedback-status:24-32` | Три разных JSON-парсера ответа Gemini, два дубля `requireAdmin`, 3 стиля preflight (`jsonResponse`, `new Response("ok")`, `corsPreflightResponse`), копипаста CORS | Расхождение поведения/ошибок, риск разной строгости валидации; правки в 10 местах | Ввести `_shared/http.ts` (withAuth/withAdmin/parseModelJson/cors) и единый wrapper `serveHandler(fn)` |
| BE-29 | P2 | Логирование | `process-word-request/index.ts:141`; `_shared/audio.ts:37,71-74`; `check-essay/index.ts:142`; `_shared/tts.ts:93-94` | `console.log` с эмодзи, полный AI-ответ (`📦 AI RESPONSE:`), пользовательские слова/тексты, `user.id`; нет JSON-структуры/уровней/корреляции; README:229 утверждает «структурированное логирование» | PII-риск (тексты и id в логах), шум, невозможность фильтрации; дубль-строки в tts | JSON-логгер (`level`, `fn`, `request_id`, `user_hash`), не логировать тела ответов AI; удалить дубль |
| BE-30 | P2 | Хранилище/приватность | `0001_initial_rls.sql:220-296`; `_shared/audio.ts:52-66`; `regenerate-image/index.ts:189-199` | Бакеты `audio-files`/`image-files` публичны на чтение (нужно для `getPublicUrl`), но в них лежат медиа слов `is_public=false` и аватары; путь предсказуем (`female/<id>.mp3`, `images/<id>_<ts>.jpg`) | Приватные слова пользователя доступны по URL/перебору; `storage.from(...).list()` перечисляет чужие файлы | Хранить приватные медиа в приватном бакете + signed URL, либо отдельный bucket/полиси по владельцу |
| BE-31 | P2 | Env/локальная разработка | `.env:1-9`; отсутствует `supabase/functions/.env`; `.env.example:20-47` | Корневой `.env` содержит два `SUPABASE_SERVICE_KEY` (второй — publishable-ключ, last-wins), нет `SUPABASE_URL`/`PEXELS_API_KEY`/`UNSPLASH_ACCESS_KEY`/`CRON_SECRET`; локальные Edge Functions читают **только** `supabase/functions/.env` | Локальный запуск функций без Gemini/Pixabay/cron-секрета; несогласованные ключи | Создать `supabase/functions/.env` (gitignored) и `.env.example` рядом, убрать дубль; не задавать `SUPABASE_*` как custom secrets (резерв префикса) |
| BE-32 | P2 | Зависимости/lock | `deno.json` (корень) + `supabase/functions/deno.json` + два `deno.lock`; `supabase/functions/deno.lock:4-6` | Два lock-файла (корневой тянет `package.json`-workspace фронта, functions — npm-дерево Edge); плавающие `@supabase/supabase-js@2`/`zod@3`; CI без `--frozen`; локальный `node_modules/.deno` содержит `@google/generative-ai@0.23.0` при lock `0.22.0`; `ocr-image/deno.json` без `shared/` (спасают relative-импорты) | Разные версии в CI/локально/проде; воспроизводимость сборки функций не гарантирована | Один `deno.lock` на каталог функций, точные версии, `deno check --frozen` в CI; выровнять per-function конфиги |
| BE-33 | P2 | Миграции | `supabase/migrations/0001_initial_rls.sql:1-7, 39, 87-96…` | Имя `0001_` вместо `<timestamp>_name.sql`; нет `BEGIN/COMMIT`; `ALTER TABLE`/`CREATE POLICY` для несуществующих таблиц (`user_vocabulary`, `articles`) без `IF EXISTS`; нет индексов; нет `GRANT` табличных привилегий | Миграция либо не распознаётся CLI (`supabase db push`), либо падает на первой отсутствующей таблице; после неё нет индексов под запросы | Пересоздать как `YYYYMMDDHHMMSS_schema.sql` + `…_rls.sql`, с `IF EXISTS`, транзакцией, индексами и `GRANT` |
| BE-34 | P2 | Тесты EF | `check-essay.test.ts:8-19`, `ocr-image.test.ts:6-17`, `regenerate-image.test.ts:6-21` | Все «тесты Edge Functions» — проверка констант (`assert(GEMINI_MODELS.FLASH === ...)`), ни одного вызова обработчиков; README:160,214 обещает тесты `supabase/functions/*/test.ts`, которых нет | Нулевое покрытие бизнес-логики; регрессии RLS/валидации не ловятся; ложное чувство защищённости | Реальные тесты на `Request`→`Response` с моками Supabase/Gemini через `fetch`; покрыть `auth`, validation, error mapping |
| BE-35 | P2 | RLS/целостность | `0001_initial_rls.sql:141-146, 39-64` | Политика `FOR ALL` разрешает клиенту писать в `user_global_stats` любые `xp/level/coins/weekly_xp`, а в `vocabulary` ставить `is_public=true` | Читерство лидерборда (PATCH своего xp), неограниченная «публикация» контента без модерации | Column-level privileges/отдельный RPC для геймификации; `is_public` — только через модерацию/service |
| BE-36 | P2 | Валидация/БД | `generate-word-data/index.ts:20-33, 153-169, 236-240`; `process-word-request/index.ts:197-231` | Zod-схема не ограничивает длины строк; ответ AI (`translation`, `example_*`, `grammar_info`…) вставляется в `vocabulary` как есть | Строки на килобайты → раздувание БД/логи; переполнение текстовых колонок и 500 вместо 4xx | `z.string().max(...)`, нормализация, ограничение числа meanings, отбрасывание лишних полей |
| BE-37 | P2 | Валидация | `process-word-request/index.ts:203-211` | `topic`/`category`/`level` берутся из клиентского `record` без проверки типа/длины и вставляются в `vocabulary` | Мусор/огромные значения в словаре; порча фильтров словаря | Валидировать через `requireString(...)`/`requireOneOf` с лимитами |
| BE-38 | P2 | Утечка ошибок | `process-word-request/index.ts:298-303`; `retry-word-request/index.ts:118-121` | В `my_notes` пишется `error.message` (внутренние ошибки БД/Gemini), а клиент читает `my_notes` по RLS и показывает как текст ошибки | Утечка внутренних сообщений/структуры БД в клиент | Писать в `my_notes` код ошибки, детали — только в серверный лог |
| BE-39 | P2 | Лимиты платформы | `regenerate-image/index.ts:59-90, 165-192`; `submit-feedback` | Декодирование/компрессия изображения до 3 МБ в ImageScript (WASM) при CPU-лимите Edge Functions 2 с; JSON-тела с base64 до ~8 МБ под лимитами платформы | Риск `WORKER_LIMIT`/504 и 413 на больших изображениях/вложениях; пользователь видит невнятную ошибку | Уменьшить лимиты, вынести ресайз на клиент/Image Transformation, `Content-Length`-guard до чтения тела |
| BE-40 | P2 | Надёжность/функции | `generate-word-data/index.ts:50-55, 127-151`; `retry-word-request/index.ts:76-79` | Роутер моделей содержит `models/gemini-3.1-flash-lite`, `models/gemini-3-flash`, `models/gemini-flash-latest` — часть имён не подтверждается; при 404 модель блокируется на 30 с, но каждый запрос тратит 1–2 неудачных вызова; в retry-аудио путь `male/<id>.mp3`, а в generate-media — `male/<id>_M.mp3` | Латентность/лишние вызовы, рассинхрон файлов аудио | Проверять список моделей на старте/в CI, кэшировать доступность; унифицировать пути |
| BE-41 | P2 | Доступ к медиа | `_shared/audio.ts:52-66`; `background-worker/index.ts:49-90` | Аудио-пути `female/<id>.mp3` не содержат uid, а Storage-политика владельца требует `<uid>/...`; запись идёт под service role | Ок: service role обходит RLS, но клиентские сценарии перезаписи/удаления этих файлов никогда не сработают; аудио-пути глобально предсказуемы | Префикс `<uid>/` или отдельная сервисная папка + документировать; для системных — только сервер |
| BE-42 | P2 | Модели/качество | `check-essay/index.ts:122-130`; `_shared/constants.ts:87-94` | Для проверки эссе используется `GEMINI_MODELS.FLASH` (быстрая модель), а `PRO`/`PRO_1_5` объявлены, но не используются; `PRO_1_5: "gemini-3.1-pro-preview"` — непроверенное имя | Качество проверки эссе ниже ожидаемого; мёртвые константы вводят в заблуждение | Осознанно выбрать `gemini-2.5-pro` для эссе (или задокументировать выбор), удалить мёртвые модели |
| BE-43 | P2 | Кэш/данные | `generate-word-data/index.ts:189-234`; `regenerate-image/index.ts:271-281` | Общий `ai_cache` без очистки по TTL; `insert` без `upsert`; при дублях `.maybeSingle()` начинает ошибаться, и кэш навсегда становится «мисс»; нет привязки к модели/версии промпта | Раздувание таблицы, нестабильный кэш, лишние расходы; устаревшие данные после смены промпта | Cron-очистка `expires_at < now()`, `UNIQUE(cache_key)`, `upsert`, версия промпта в ключе |
| BE-44 | P3 | CORS | `_shared/constants.ts:1-6` | `Access-Control-Allow-Origin: *` на всех функциях | С токеном в заголовке не критично (токен не уходит автоматически), но любой origin может дергать API от имени вставившего токен; нет allowlist | Ограничить origin'ами приложения, явно описать политику в README |
| BE-45 | P3 | HTTP-контракт | `process-word-request`, `generate-word-data`, `check-essay`, `submit-feedback`, `retry-word-request`, `regenerate-image`, `generate-media-for-word` — нет проверки `req.method`/`Content-Type` | GET/PUT на POST-эндпоинты доходят до обработки тела; `readJsonObject` не проверяет `Content-Type` | Непоследовательный контракт, лишние 500 вместо 405/415 | Общий wrapper с method/Content-Type guard |
| BE-46 | P3 | Мёртвый код | `_shared/constants.ts:84` (`GENERATE_QUOTE_AUDIO`), `:17` (`USER_VOCABULARY`); `_shared/clients.ts:111-123`; `_shared/constants.ts:57-66`; корневой `supabase/functions/constants.ts` | Мёртвые константы/таблица/функция `debugEnvPresence`, статусы `AUDIO/DONE/AUDIO_RETRY`, целиком мёртвый корневой constants.ts; `user_vocabulary` в RLS не используется нигде | Мусор в репо, ложные ожидания, риск случайного использования | Удалить мёртвый код, `deno lint` с `no-unused-vars` не ловит экспорты — проверить вручную |
| BE-47 | P3 | Git/гигиена | `.gitignore:1-3`; `git ls-files` | `supabase/.temp/*` закоммичены (project-ref, pooler host, версии CLI/GoTrue/Postgres) — секретов нет (pooler-URL без пароля), но это машинный кэш CLI | Загрязнение истории, конфликты при смене проекта | Добавить `supabase/.temp/` в `.gitignore` и `git rm -r --cached` |
| BE-48 | P3 | Документация | `README.md:124-128, 160, 214, 221-229, 238, 246`; `GEMINI.md:51,55` | README утверждает: RLS на всех таблицах (нет `articles`), структурированное логирование (console.log), единые константы Gemini (их две), схема сверена с БД (SQL схемы нет), тесты `*/test.ts` (их нет), «включить deno fmt в CI» (уже включён); `GEMINI.md` называет `delete-user` админской функцией (она self-delete) | Вводит в заблуждение аудиторов/разработчиков, скрывает реальные дефекты | Привести документацию к фактическому состоянию; чек-лист проверять в CI |

---

## Подробные разборы

### P0

#### BE-01. Схемы БД в репозитории нет — единственная миграция описывает только RLS

`supabase/migrations/0001_initial_rls.sql:1-7`:
```sql
-- 0001_initial_rls.sql
-- Включение RLS и базовые политики для таблиц и storage-бакетов TOPIK APP.
-- Файл только создаёт политики; он НЕ применяется автоматически к БД.
-- Предполагается стандартная схема Supabase: auth.users, public.profiles,
-- у пользовательских таблиц есть колонка user_id (у vocabulary — created_by/user_id).
```
Проверено: в миграции **ноль** `CREATE TABLE`/`CREATE INDEX`/`CREATE TRIGGER`/`INSERT INTO storage.buckets`; других SQL-файлов в репозитории нет (`Get-ChildItem -Recurse -Filter *.sql` → только этот файл), `supabase/seed.sql` отсутствует; `git log --all --name-status -- supabase/migrations` показывает единственный коммит `cc7f833`, где файл добавлен (`A`). При этом код ожидает ~30 колонок `vocabulary` только в `src/core/db.ts:330-331`:
```ts
    const VOCAB_COLUMNS =
      "id, word_kr, translation, level, type, topic, topic_ru, topic_kr, category, category_ru, category_kr, example_kr, example_ru, audio_url, audio_male, example_audio, image, image_source, synonyms, antonyms, word_hanja, my_notes, grammar_info, collocations, is_public, created_by, user_id, deleted_at, updated_at";
```
а Edge Functions пишут ещё `word_requests.{target_list_id,my_notes,failed_step}`, `user_progress.{sm2_*,learned_date}`, `user_global_stats.{weekly_xp,league,streak_freeze,sessions,settings,full_name,avatar_url}` и т.д. Итог: схема, типы, NOT NULL, FK/ON DELETE CASCADE, дефолты и уникальные ключи не ревьюируются и не поставляются. Это источник BE-11, BE-12, BE-21, BE-33 и большинства P1 ниже. Фикс: `supabase db pull --remote` → `0002_schema.sql`, затем переписать RLS поверх него; в CI добавить `supabase db diff --check`/`db push` на staging.

#### BE-02. `background-worker` недостижим: gateway с `verify_jwt` отвергает CRON_SECRET

`supabase/config.toml:51-54`:
```toml
# --- Внутренние/серверные функции ---
[functions.background-worker]
verify_jwt = true
enabled = true
```
`supabase/functions/background-worker/index.ts:20-24`:
```ts
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return createErrorResponse("Unauthorized", 401);
  }
```
По документации Supabase «Authorization headers» (обновлено 2026): при `verify_jwt` платформа проверяет `Authorization` **до выполнения кода**; принимаются user-JWT, а также publishable/secret API-keys, но произвольная строка `CRON_SECRET` — нет: «If the header is missing, malformed, or signed with a different key, the platform returns a 401 error, and your code never executes». Cron/внешний планировщик с `Authorization: Bearer <CRON_SECRET>` получает 401 от gateway; ветка проверки секрета внутри функции недостижима. В репозитории вообще нет описания планировщика (нет `pg_cron`/`pg_net`/`schedule` в workflow), так что фоновые задачи не запускаются ни по какому пути. Фикс: `[functions.background-worker] verify_jwt = false` (и оставить CRON_SECRET), либо передавать валидный project API-key в `apikey`-заголовке и проверять его внутри, либо перенести воркер в `pg_cron`+`pg_net`.

#### BE-03. Воркер вызывает `regenerate-image` без пользовательского JWT → гарантированный 401 в обработчике

`background-worker/index.ts:93-103`:
```ts
          if (!word.image) {
            promises.push(
              supabaseAdmin.functions
                .invoke<ImageResult>(FUNCTION_NAMES.REGENERATE_IMAGE, {
                  body: { mode: "auto", id: word.id, word: word.word_kr, ... },
                })
```
Заголовки не переданы. `getSupabaseAdmin()` создаёт клиент на service/secret-ключе; supabase-js в `fetchWithAuth` ставит `Authorization: Bearer <getAccessToken() ?? supabaseKey>` — т.е. в запрос уйдёт service/secret-ключ. Платформенная проверка `verify_jwt` такой ключ пропускает (docs: «verify_jwt accepts publishable and secret keys on either header»), но обработчик `regenerate-image/index.ts:217-220` требует именно пользователя:
```ts
  try {
    // [SECURITY] Проверяем аутентификацию пользователя по JWT.
    const { user } = await getAuthenticatedUser(req);
```
`getAuthenticatedUser` (`_shared/auth.ts:32-40`) вызывает `supabase.auth.getUser(token)`; для service/secret-ключа GoTrue пользователя не вернёт → `HttpError("Unauthorized", 401)`. Сравните: `generate-media-for-word/index.ts:72-80` передаёт `headers: bearerHeaders(token)` — там внутренний вызов корректный. Фикс: сервисный endpoint изображений с `verify_jwt=false`+CRON_SECRET, либо вызов от имени пользователя (но у cron нет пользователя — значит нужен service-режим).

#### BE-04. IDOR в `regenerate-image`: любой пользователь может подменить/удалить изображение любой записи `vocabulary`

`regenerate-image/index.ts:158-192` (хелпер без проверки владельца):
```ts
async function processAndStoreImage(wordId: string, imageUrl: string, source: string) {
  const supabaseAdmin = getSupabaseAdmin();
  ...
  const { data: wordData } = await supabaseAdmin
    .from(DB_TABLES.VOCABULARY).select("image").eq("id", wordId).single();
  if (wordData?.image) {
    ...
        await supabaseAdmin.storage.from(DB_BUCKETS.IMAGES).remove([oldPath]);
```
`regenerate-image/index.ts:202-207`:
```ts
  const { error: dbError } = await supabaseAdmin
    .from(DB_TABLES.VOCABULARY)
    .update({ image: publicUrl, image_source: source })
    .eq("id", wordId);
```
Точки входа `auto`/`finalize` (строки 288-339) проверяют только `typeof body.id` и `requireString(body.word)`, владение не проверяется. Аутентификация (`getAuthenticatedUser`) подтверждает лишь «кто-то вошёл». Итог: прямой вызов
`POST /functions/v1/regenerate-image {"mode":"finalize","id":"<id чужого/системного слова>","selectedUrl":"https://images.pexels.com/...","source":"Pexels"}`
перезаписывает картинку чужого слова **и** (через `remove`) удаляет прежний файл из `image-files`; режим `auto` позволяет навязать произвольную картинку по `word`, записав её любому `id`. Кнопка UI (`src/ui/ui_card.ts:546-559`) передаёт `item.id`, т.е. атака достижима и через интерфейс при подмене id. Фикс: перед `processAndStoreImage` загрузить слово и проверить `created_by/user_id === user.id` (системные — запретить клиентам); обновление делать с `.eq("created_by", user.id)` и проверкой количества строк.

#### BE-05. Нет триггера создания `profiles` → `is_admin()` всегда false

`0001_initial_rls.sql:13-29`:
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
...
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
```
`0001_initial_rls.sql:159-177` — политики на `profiles`, и комментарий:
```sql
-- profiles: пользователь видит только себя; роль может менять только admin.
-- Пользовательские обновления профиля идут через auth.updateUser + триггер.
```
Триггера нет: в репозитории нет ни одного `CREATE TRIGGER`/`handle_new_user`; фронт в `profiles` не пишет (grep `profiles` по `src/` — только `DB_TABLES` в Edge-функциях/константах). Значит после регистрации строка `profiles` не создаётся, `role` = NULL → `is_admin()` всегда `false`. Следствия: `get-feedback-reports`/`update-feedback-status` (`get-feedback-reports/index.ts:11-19`, `update-feedback-status/index.ts:30-32`) всегда 403; все `*_admin_all`-политики и `storage_admin_all` не работают; админ-панель мертва. Фикс: миграция с `handle_new_user()` + `AFTER INSERT ON auth.users` (или `app_metadata.role` + `auth.jwt()->>'role'`), бэкфилл существующих пользователей, тест.

#### BE-06. Деплой функций заблокирован красным CI (кросс-скоуп)

`.github/workflows/deploy.yml:41-50`:
```yaml
      - name: Check TypeScript types
        run: npm run check
      - name: Lint frontend
        run: npm run lint
      - name: Build Frontend
        run: npm run build
```
`.github/workflows/deploy.yml:89-93`:
```yaml
  deploy-functions:
    name: Deploy Edge Functions
    runs-on: ubuntu-latest
    needs: test
```
`audit/logs/build.txt`:
```
> topik-ii-master-pro@1.0.0 build
> tsc && vite build

src/app.ts(149,1): error TS6133: 'setSyncState' is declared but its value is never read.
```
Первый же шаг `test` (в `deploy.yml` order: `npm run check`) падает → `deploy-functions` не запускается никогда. Дополнительный блокер — `deno fmt --check supabase/functions` (`deploy.yml:75-76`): вручную отформатированный TS содержит 152 строки > 80 символов (top: `_shared/tts.ts:42` 283 симв., `process-word-request/index.ts:99` 112 симв.), а `deno fmt` с `lineWidth: 80` (`supabase/functions/deno.json:18-22`) обязан переформатировать импорты/условия → шаг будет красным (Deno не установлен, проверить не смог — см. «Ограничения»). То же противоречие в README:238 («Включить `deno fmt --check` в CI» — пункт не выполнен, хотя он уже в CI). Фикс: починить `tsc`/prettier, прогнать `deno fmt` и зафиксировать, добавить `supabase db push` (сейчас миграции не деплоятся вообще).

### P1

#### BE-07. `articles` вне RLS/миграции
`src/ui/ui_reading.ts:38-45` читает таблицу напрямую:
```ts
    const { data, error } = await client
      .from(DB_TABLES.ARTICLES)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error loading articles:", error);
```
В миграции слова `articles` нет вовсе. Если RLS на таблице включён (а Supabase включает его по умолчанию для новых таблиц) — политик нет → чтение падает для всех, раздел Reading не работает. Если RLS выключен — `anon`-клиент при наличии привилегий может писать/удалять обучающий контент. Нужна миграция `articles` + `SELECT TO anon, authenticated USING (true)`; запись — только admin/service.

#### BE-08. RLS ломает лидерборд
`0001_initial_rls.sql:141-146`:
```sql
ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_global_stats_own_all ON public.user_global_stats;
CREATE POLICY user_global_stats_own_all ON public.user_global_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```
`src/ui/ui_leaderboard.ts:131-141`:
```ts
      let query = client
        .from(DB_TABLES.USER_GLOBAL_STATS)
        .select("user_id, xp, weekly_xp, level, full_name, avatar_url, league");
      ...
        query = query.order("level", { ascending: false }).order("xp", { ascending: false });
      query = query.limit(50);
```
Пользователь видит только свою строку → «Топ-50» = он сам. Ранги (строки 174-191) считают `count` по чужим строкам, которых RLS не отдаёт → ранги нулевые. Фикс: отдельная `public.leaderboard` view с `security_invoker=false` (или политика `FOR SELECT USING (true)` на view), исключив чувствительные колонки; `weekly_xp/level/xp` публичны по смыслу.

#### BE-09. RLS ломает публичные списки
`0001_initial_rls.sql:106-111` — только `user_id = auth.uid()`. `src/ui/ui_collections.ts:26-28`:
```ts
    const { data } = await client
      .from(DB_TABLES.USER_LISTS)
      .or(`user_id.eq.${userId},is_public.eq.true`)
```
Строки других пользователей отфильтрует RLS → публичные списки не видны; чекбокс «Публичный» (`ui_collections.ts:118-123`, `is_public: publicCheck.checked`) ни на что не влияет. Фикс: `OR is_public = true` в SELECT-политику `user_lists` (и `list_items` — читать элементы публичных списков).

#### BE-10. Нет `updated_at`-триггера: инкрементальный синк не видит изменений и удалений
`src/core/db.ts:345-355`:
```ts
        if (isCacheValid && lastSync && hasLocalData) {
          query = query.gt("updated_at", lastSync);
        } else {
          query = query.is("deleted_at", null);
        }
        const { data, error } = await query
          .order("updated_at", { ascending: true })
```
Миграция не создаёт ни триггера, ни дефолтов для `updated_at`/`created_at`. Soft-delete в `src/ui/ui_trash.ts:143-146` меняет только `deleted_at`:
```ts
    const { error } = await client
      .from(DB_TABLES.VOCABULARY)
      .update({ deleted_at: null })
      .eq("id", realId);
```
(аналогично `ui_bulk.ts:184-188`, `ui_edit_word.ts:247`). Если в БД нет триггера (в репозитории его нет), `updated_at` не двигается → инкрементальный клиент не получает ни правку, ни удаление, и слова «воскресают» из кэша. Фикс: `updated_at timestamptz default now()` + `BEFORE UPDATE` триггер, включая ветку soft-delete; в инкрементальном select явно забирать и `deleted_at`.

#### BE-11. Upsert'ы без версионируемых UNIQUE-констрейнтов
`src/core/sync.ts:132-134, 165-167`:
```ts
    const { error: globalError } = await client
      .from(DB_TABLES.USER_GLOBAL_STATS)
      .upsert(globalUpdates, { onConflict: "user_id" });
...
          const { error: progressError } = await client
            .from(DB_TABLES.USER_PROGRESS)
            .upsert(chunk, { onConflict: "user_id,word_id" });
```
`src/ui/ui_bulk.ts:348`: `.upsert(rows, { onConflict: "list_id,word_id" })`. Констрейнтов нет в репозитории (BE-01) — при их отсутствии PostgREST вернёт `42P10`/`no unique or exclusion constraint`, и **весь** синк прогресса/списков падает (сейчас неизвестно, есть ли они в живой БД; README:223 утверждает «сверено», но сверить нечем). Фикс: явные констрейнты в миграции + интеграционный тест на upsert:
```sql
ALTER TABLE public.user_global_stats ADD CONSTRAINT user_global_stats_user_id_key UNIQUE (user_id);
ALTER TABLE public.user_progress   ADD CONSTRAINT user_progress_user_word_key UNIQUE (user_id, word_id);
ALTER TABLE public.list_items      ADD CONSTRAINT list_items_list_word_key UNIQUE (list_id, word_id);
ALTER TABLE public.ai_cache        ADD CONSTRAINT ai_cache_cache_key_key UNIQUE (cache_key);
```

#### BE-12. RPC `cleanup_user_progress` не определена
`src/core/db.ts:428-433`:
```ts
    const { error: rpcError } = await client.rpc("cleanup_user_progress");
    if (rpcError) {
      // Ignore AbortError for cleanup, it's not critical
      if (rpcError.message && !rpcError.message.includes("AbortError"))
        console.warn("Server cleanup skipped:", rpcError.message);
```
RPC вызывается на каждом логине, определения нет ни в одном SQL-файле проекта (единственная миграция — RLS). Следствие: постоянные ошибки (лог-шум), заявленная серверная очистка progress не работает; orphan-строки `user_progress` для удалённых слов живут вечно. Фикс: `CREATE FUNCTION public.cleanup_user_progress() ... SECURITY DEFINER SET search_path=public` + `GRANT EXECUTE TO authenticated`, либо удалить вызов и закрыть задачу FK-каскадом.

#### BE-13. Лимитов на дорогие AI/API-вызовы фактически нет
`process-word-request/index.ts:118-127`:
```ts
    // [SECURITY] Rate Limiting (15 req/min per authenticated user)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from(DB_TABLES.WORD_REQUESTS)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);
    if (count !== null && count > 15) {
```
Проблемы: (1) считаются созданные строки, а не вызовы, и пользователь сам может их удалять (RLS `word_requests_own_all` включает DELETE) → лимит обходится; (2) `count > 15` — off-by-one; (3) у `generate-word-data` (Gemini до 20 слов за вызов, 4 модели), `check-essay` (Gemini Vision/текст), `ocr-image` (Gemini Vision), `regenerate-image` (3 внешних API + кэш сломан — BE-21) лимитов **нет вообще**; `generate-media-for-word` можно дёргать повторно на своё слово, каждый раз вызывая TTS и `regenerate-image`. Любой зарегистрированный пользователь накликает Gemini/TTS/stock-API на счёт владельца. Фикс: таблица `rate_limits(user_id, fn, window_start, count)` + RPC атомарного инкремента, лимиты на все AI-функции, квоты на сутки.

#### BE-14. `process-word-request`: гонки и дубликаты
`process-word-request/index.ts:163-179` — проверка дубликатов «прочитать → потом вставить»:
```ts
    const duplicateCheckPromises = wordItems.map((item) =>
      supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .select("id, word_kr, translation")
        .eq("word_kr", item.word_kr)
        .eq("translation", item.translation)
        .maybeSingle(),
    );
```
и вставка в 221-230. Между проверкой и вставкой нет блокировки; повторный вызов функции на тот же `record.id` не проверяет текущий статус заявки. Два параллельных вызова (UI вызывает `process-word-request` в цикле `for` без ожидания — `ui_custom_words.ts:279-283`) → дубли `vocabulary`; уникального ключа `(word_kr, translation)` нет. Фикс: `UNIQUE (word_kr, translation)` + `INSERT ... ON CONFLICT DO NOTHING RETURNING`, CAS `UPDATE word_requests SET status='ai' WHERE id=$1 AND status IN ('pending','error')` с проверкой rowcount, отказ при `status='processed'`.

#### BE-15. Частичная запись без транзакции
`process-word-request/index.ts:256-271`: ошибки batch-upsert'ов только логируются:
```ts
    if (progressToUpsert.length > 0) {
      const { error } = await supabaseAdmin.from(DB_TABLES.USER_PROGRESS).upsert(progressToUpsert);
      if (error) {
        console.error(
          "Batch upsert to user_progress failed in process-word-request:",
          error.message,
        );
      }
    }
```
После этого заявка помечается `processed` (277-285), хотя прогресс/списки могли не сохраниться. Если упадёт посередине цикла вставок — уже вставленные слова остаются, заявка `error`, повтор создаст дубликаты (BE-14). Фикс: одна plpgsql-функция `process_word_request(...)` в транзакции (вставка слов + прогресс + списки + статус), либо компенсирующий откат и `failed_step`.

#### BE-16. `retry-word-request` не работает для большинства сбоев
`retry-word-request/index.ts:44-47`:
```ts
    console.log(`♻️ Retrying request for "${request.word_kr}", failed at: ${request.failed_step}`);

    // 2. Выбираем стратегию повтора
    if (request.failed_step === PROCESSING_STEPS.AUDIO_GENERATION) {
```
`failed_step` нигде не записывается: grep по `supabase/functions` даёт только чтение (`retry...:44,47,94,104`); `process-word-request` при ошибке пишет `status`/`my_notes` (294-308). Поэтому всегда выполняется `else` (99-107):
```ts
      await supabaseAdmin
        .from(DB_TABLES.WORD_REQUESTS)
        .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: null, failed_step: null })
```
— заявка становится `pending`, но `pending`-заявки никто не обрабатывает: `background-worker` выбирает `vocabulary`, а не `word_requests` (`background-worker/index.ts:32-36`), других обработчиков очереди нет. Кнопка «Повторить» (`ui_custom_words.ts:776-782`, `ui_failed_requests.ts:105,157`) для `ai_processing`/`db_insert` — no-op. Фикс: писать `failed_step` при ошибке и вызывать обработчик очереди (или сразу `fetch`/invoke process-word-request с тем же record).

#### BE-17. `delete-user` не удаляет всё
`delete-user/index.ts:21-37`:
```ts
    const { user } = await getAuthenticatedUser(req);
    const adminSupabaseClient = getSupabaseAdmin();
    console.log(`Attempting to delete user with ID: ${user.id}`);
    const { error: deleteError } = await adminSupabaseClient.auth.admin.deleteUser(user.id);
```
Удаляется только `auth.users`. Storage-файлы не трогаются вообще (вложения feedback, аудио/картинки кастомных слов); `feedback_reports`, `user_favorite_quotes`, `profiles` не удаляются явно и зависят от FK-каскадов, которых нет в репозитории. Клиент перед вызовом сам удаляет часть таблиц (`src/core/auth.ts:729-751`), но не `feedback_reports`/`user_favorite_quotes`, и порядок «сначала данные, потом auth» означает: при ошибке Edge-функции данные уже стёрты, аккаунт жив (частичное удаление); при успехе — файлы в публичных бакетах остаются доступными. Фикс: серверная функция удаления в порядке Storage→таблицы→auth (или каскады в миграции), тест на полноту; удаление аватара и вложений — по списку из БД. Мелочь рядом (P3, отдельной находки не заводил): ошибки `AuthError` не маппятся в `HttpError` (`delete-user:28-31`) → наружу 500 «Internal server error» вместо 4xx.

#### BE-18. Бакеты Storage не создаются
`0001_initial_rls.sql:213-216`:
```sql
-- 5. SUPABASE STORAGE (storage.objects)
-- Публичные бакеты audio-files / image-files читаются всеми, запись — только
-- в свою папку; вложения feedback_attachments приватны для владельца и admin.
```
Политики есть, но `INSERT INTO storage.buckets` нет; `supabase/config.toml` содержит только `project_id` и `[functions.*]` — секции `[storage.buckets.*]` отсутствуют, `supabase/seed.sql` нет. Значит `audio-files`, `image-files`, `feedback_attachments` существуют только в живой БД, созданные руками; на новом проекте/после `supabase db reset` медиа и вложения падают. Фикс: описать бакеты в `config.toml` (public/file_size_limit/allowed_mime_types) + `supabase seed buckets`.

#### BE-19. Edge TTS без `Sec-MS-GEC`: аудио-генерация под угрозой полного отказа
`_shared/tts.ts:20-27`:
```ts
export function generateSpeech(text: string, voice: "female" | "male"): Promise<ArrayBuffer> {
  const voiceName = voice === "male" ? TTS_VOICES.MALE : TTS_VOICES.FEMALE;
  const audioFormat = "audio-24khz-48kbitrate-mono-mp3";
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const ws = new WebSocket(API_URLS.EDGE_TTS);
```
`_shared/constants.ts:103-107`:
```ts
export const API_URLS = {
  // Google TTS больше не используется, заменен на Edge TTS
  EDGE_TTS:
    "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4",
```
С 2024 Microsoft требует для этого неофициального endpoint токен `Sec-MS-GEC` (и набор заголовков `Origin`/`User-Agent`): в актуальном `edge-tts` модуль DRM прямо пишет «Currently the only DRM operation is generating the Sec-MS-GEC token value used in all API requests to Microsoft Edge's online text-to-speech service» ([drm.py](https://github.com/rany2/edge-tts/blob/master/src/edge_tts/drm.py), [constants.py](https://github.com/rany2/edge-tts/blob/master/src/edge_tts/constants.py) — `TRUSTED_CLIENT_TOKEN = 6A5AA1D4EAFF4E9FB37E23D68491D6F4`, `WSS_HEADERS` с `Sec-MS-GEC`). Кроме того, нативный `new WebSocket(url)` в Deno не позволяет задать HTTP-заголовки рукопожатия — значит текущая реализация не может пройти DRM-проверку. Ожидаемый симптом: 403/закрытие сокета → `createAudioFile` бросает «TTS WebSocket connection failed»/«closed unexpectedly» → аудио не генерируется никогда (в живом сервисе требует подтверждения — см. «Ограничения»). Фикс: перейти на официальный TTS (Google/Azure), либо реализовать `Sec-MS-GEC` и заголовки через WS-клиент с поддержкой заголовков (`npm:ws`) и кэшировать токены. Мелочи рядом (P3, отдельной находки не заводил): дубль `console.error` в `tts.ts:93-94`, захардкоженный 15-секундный таймаут без ретраев, лог полного текста в `audio.ts:37`, машинная опечатка в комментарии `audio.ts:7`.

#### BE-20. Новые API-ключи Supabase и старые имена env
`_shared/clients.ts:38-55`:
```ts
const SUPABASE_URL = getEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
const SUPABASE_PUBLISHABLE_KEY = getEnv("SUPABASE_PUBLISHABLE_KEY", [
  "VITE_SUPABASE_KEY",
  "SUPABASE_ANON_KEY",
  "ANON_KEY",
]);
const SUPABASE_SECRET_KEY = getEnv("SUPABASE_SECRET_KEY", [
  "SUPABASE_SERVICE_KEY",
  "SB_SECRET_KEY",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]);
```
Документация Supabase (обновление 2026) перечисляет среди дефолтных секретов Edge Functions **`SUPABASE_PUBLISHABLE_KEYS` и `SUPABASE_SECRET_KEYS` — JSON-словари**, и отдельно legacy `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`. Проект уже использует новые ключи (в `.env` значения форматов `sb_publishable_...` и `sb_secret_...`; значения не выводились). Код нигде не читает plural-JSON-словари. Если в проекте legacy-ключи отключены, `getSupabaseAdmin()` бросает «Missing server secret in environment…» (`clients.ts:86-90`) → падают `delete-user`, `process-word-request`, `generate-word-data` (cache), `regenerate-image`, `get-feedback-reports`, `update-feedback-status`, `background-worker`; `getSupabaseClientForUser()` аналогично ломает все пользовательские функции. Даже при включённых legacy-ключах это хрупкая зависимость. Фикс:
```ts
const secret = Deno.env.get("SUPABASE_SECRET_KEY") ??
  JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
```
плюс ранняя проверка и понятная 503-ошибка на старте функции.

#### BE-21. Кэш поиска картинок никогда не срабатывает
`regenerate-image/index.ts:236-250` читает с `expires_at`, а запись (271-281) — без него:
```ts
          await supabaseAdmin
            .from(DB_TABLES.AI_CACHE)
            .insert({ cache_key: cacheKey, response_data: images });
```
`expires_at` в новой строке = NULL/дефолт → условие `.gt("expires_at", now)` никогда не истинно → всегда cache miss, каждый поиск изображения = 3 внешних API (Pixabay/Pexels/Unsplash), плюс дубли строк в `ai_cache` (insert без upsert/уникального ключа). Фикс: писать `expires_at` (например +30 дней) и `upsert(..., { onConflict: "cache_key" })`.

#### BE-22. Realtime-публикация не описана
`src/ui/ui_custom_words.ts:989-1005` и 1007-1048 подписываются на `postgres_changes` по `vocabulary` и `word_requests`; в миграции нет `ALTER PUBLICATION supabase_realtime ADD TABLE ...`, в `config.toml` — тоже. Без этого каналы не получают изменений (UI-трекинг работает через polling с задержкой 5 с, `ui_custom_words.ts:966-968`), а ошибки каналов показывают тосты. Фикс: SQL-миграция с добавлением таблиц в публикацию.

### P2 (кратко)

- **BE-23** `process-word-request/index.ts:235-242`: `.invoke(...).catch(...)` без `await`/`EdgeRuntime.waitUntil` — после ответа isolate может быть уничтожен, медиа-задача теряется.
- **BE-24** `generate-media-for-word/index.ts:45-48,101-110`: ownership допускает `user_id`, апдейт — только `.eq("created_by", user.id)` → 0 строк и `success:true`; медиа не сохраняется.
- **BE-25** `submit-feedback/index.ts:38-67,105-135` + `ui_feedback.ts:120-130`: клиентские лимиты 3×50 МБ vs серверные 3×2 МБ; base64 ≈ 8.4 МБ JSON; ошибки загрузки `continue` (отчёт без вложения, пользователь не знает); MIME-allowlist шире клиентского.
- **BE-26** `get-feedback-reports/index.ts:39-72`: вложения не отдаются по signed URL и не рендерятся в `ui_admin.ts` — админ не может их открыть.
- **BE-27** Два `constants.ts`: корневой `supabase/functions/constants.ts:4-9` с retired-моделями `models/gemini-1.5-*-latest` и `LIMITS` 50/100/5 МБ vs `_shared/constants.ts:42-54` 20/60/3 МБ; README:228 называет это «унифицировано».
- **BE-28** Дублирование логики: три JSON-парсера ответа Gemini (`check-essay:29-41`, `generate-word-data:111-122`, `ocr-image:29-44`), два `requireAdmin` (`get-feedback-reports:9-22`, `update-feedback-status:24-32`), три стиля preflight-ответа; нет единого wrapper. Попутно парсинг хрупкий: `parseModelJson` берёт от первого `{` до последнего `}` (`check-essay:30-39`) — сломается на тексте с `}`; `maxOutputTokens: 2048` может обрезать `improved_version` → 502; имя модели уходит клиенту в ответе (`generate-word-data:236-240`).
- **BE-29** Логирование: `console.log("📦 AI RESPONSE:", aiResponse)` (`process-word-request:141`), тексты слов/эссе и `user.id` в логах (`audio.ts:37,71-74`, `check-essay:142`), эмодзи вместо структурированного JSON; README:229 утверждает обратное.
- **BE-30** Публичные бакеты для приватных данных: `audio-files`/`image-files` читаются всеми (`0001:220-240`), а пути предсказуемы (`background-worker:51,65,79` — `female/<id>.mp3`; `regenerate-image:189` — `images/<id>_<ts>.jpg`); аватары листаются `storage.list` (в т.ч. чужие).
- **BE-31** Env/локально: корневой `.env` имеет **два** `SUPABASE_SERVICE_KEY` (второй по формату — publishable, last-wins), нет `SUPABASE_URL`/`PEXELS_API_KEY`/`UNSPLASH_ACCESS_KEY`/`CRON_SECRET`; файла `supabase/functions/.env` нет, а локальные функции читают секреты **только** оттуда (документация Supabase) → локально Gemini/TTS/stock-API и cron-секрет недоступны; `.env.example` предлагает задавать `SUPABASE_*` как custom secrets, хотя префикс `SUPABASE_` зарезервирован платформой.
- **BE-32** Зависимости/lock: два `deno.lock` (корневой с package.json-фронтом + functions), плавающие `@supabase/supabase-js@2`/`zod@3`, CI без `--frozen`; локальный кэш `.deno` содержит `@google/generative-ai@0.23.0` при lock `0.22.0`; `ocr-image/deno.json` не содержит `shared/` и `@supabase/*` (работает только на relative-импортах и fallback-пути в `_shared/auth.ts:3`).
- **BE-33** Качество миграции: имя `0001_initial_rls.sql` не соответствует `<timestamp>_name.sql` (риск для `supabase db push`), нет `BEGIN/COMMIT`, `ALTER TABLE` без `IF EXISTS` для таблиц, которых может не быть (`user_vocabulary` используется только в этом файле; `articles` вообще нет), ни одного индекса под реальные запросы (`vocabulary.updated_at/deleted_at`, `word_requests.user_id/created_at`, `ai_cache.cache_key/expires_at`, `feedback_reports.created_at`), нет `GRANT`-ов (полагается на дефолтные привилегии дашборда).
- **BE-34** Тесты Edge Functions фиктивные: `check-essay.test.ts:8-19`, `ocr-image.test.ts:6-17`, `regenerate-image.test.ts:6-21` проверяют только константы; README:160/214 ссылается на несуществующие `supabase/functions/*/test.ts`; обработчики, валидация и авторизация не тестируются. Мелочь: `deno task test` использует `deno test *.test.ts` после `cd` (`deno.json:8`) — на Windows `cmd`/task-shell не раскрывает glob, а `deno test` может не раскрыть его сам (на Linux CI работает).
- **BE-35** RLS-целостность: `user_global_stats` `FOR ALL` позволяет клиенту писать произвольные `xp/level/coins` (`0001:141-146`) — читерство лидерборда; `vocabulary` позволяет ставить `is_public=true` (`0001:55-59`) — публикация контента без модерации.
- **BE-36** Валидация AI-ответа без лимитов длины (`generate-word-data:20-33,153-169`): строки вставляются в `vocabulary` как есть (BE-37 тоже про клиентские поля).
- **BE-37** Клиентские `topic/category/level` вставляются в `vocabulary` без проверки типа/длины (`process-word-request:203-211`).
- **BE-38** `my_notes` = текст внутренней ошибки (`process-word-request:298-303`, `retry-word-request:118-121`), а клиент читает его по RLS (`ui_custom_words.ts:946`) → утечка деталей БД/Gemini.
- **BE-39** Лимиты платформы: ImageScript decode/resize изображения до 3 МБ при CPU-лимите Edge Functions 2 с; JSON-body до ~8.4 МБ в `submit-feedback` — риск `WORKER_LIMIT`/413/504 (документация Supabase: CPU 2 s, body-лимиты платформы).
- **BE-40** `generate-word-data/index.ts:50-55, 127-151` — роутер моделей содержит `models/gemini-3.1-flash-lite`, `models/gemini-3-flash`, `models/gemini-flash-latest`: часть имён не подтверждается; на 404 модель блокируется на 30 с, но каждый запрос тратит 1–2 неудачных вызова. Плюс в `retry-word-request:76-79` путь `male/<id>.mp3`, а в `generate-media-for-word:62-63` — `male/<id>_M.mp3`: дубли/рассинхрон файлов аудио.
- **BE-41** `_shared/audio.ts:52-66`; `background-worker/index.ts:49-90` — аудио-пути `female/<id>.mp3`/`male/<id>.mp3` не содержат uid, а Storage-политика владельца требует `<uid>/...`; сервисная запись работает только потому, что service role обходит RLS, клиентские сценарии перезаписи/удаления этих файлов не сработают.
- **BE-42** `check-essay/index.ts:122-130`; `_shared/constants.ts:87-94` — для проверки эссе используется `GEMINI_MODELS.FLASH` (быстрая модель), а `PRO`/`PRO_1_5` объявлены, но не используются; `PRO_1_5: "gemini-3.1-pro-preview"` — непроверенное имя.
- **BE-43** `generate-word-data/index.ts:189-234`; `regenerate-image/index.ts:271-281` — общий `ai_cache` без TTL-очистки: в `generate-word-data` `insert` без `upsert` (дубли ломают `.maybeSingle()` чтение), в `regenerate-image` insert вообще без `expires_at` (см. BE-21); нет версии модели/промпта в ключе → устаревшие данные после смены промпта.

### P3 (кратко)

- **BE-44** `Access-Control-Allow-Origin: *` на всех функциях (`_shared/constants.ts:1-6`) — сузить до origin'ов приложения.
- **BE-45** Нет проверки `req.method`/`Content-Type` в 7 из 12 функций (см. сводку (б)) — неверный метод обрабатывается как POST/JSON, клиенту прилетает 500 вместо 405 (общий wrapper решит).
- **BE-46** Мёртвый код: корневой `constants.ts` целиком, `FUNCTION_NAMES.GENERATE_QUOTE_AUDIO` (`_shared/constants.ts:84`), `USER_VOCABULARY` (`:17`), `debugEnvPresence` (`clients.ts:111-123`), статусы `AUDIO/DONE/AUDIO_RETRY`.
- **BE-47** `supabase/.temp/*` закоммичены (project-ref, pooler-хост без пароля, версии CLI/GoTrue/Postgres) — добавить в `.gitignore`.
- **BE-48** README/GEMINI.md расходятся с реальностью (схема сверена, RLS на всех таблицах, structured logging, единые константы, тесты по функциям, «deno fmt не в CI») — обновить.

### Приложение к P2/P3: цитаты (доказательная база)

**BE-23 — `process-word-request/index.ts:235-242`**
```ts
        supabaseAdmin.functions
          .invoke(FUNCTION_NAMES.GENERATE_MEDIA, {
            body: { word_id: insertedWord.id },
            headers: bearerHeaders(token),
          })
          .catch((err: unknown) =>
            console.error(`- Media generation for word ${wordId} failed to invoke:`, err),
          );
```

**BE-24 — `generate-media-for-word/index.ts:101-107`**
```ts
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from(DB_TABLES.VOCABULARY)
        .update(updates)
        .eq("id", wordData.id)
        .eq("created_by", user.id);
      if (updateError) throw updateError;
```

**BE-25 — `submit-feedback/index.ts:125-128`**
```ts
      if (uploadError) {
        console.error("Attachment upload failed:", uploadError.message);
        continue;
      }
```

**BE-26 — `get-feedback-reports/index.ts:39-43`**
```ts
    const { data: reports, error } = await adminClient
      .from(DB_TABLES.FEEDBACK_REPORTS)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
```

**BE-27 — `supabase/functions/constants.ts:4-9`**
```ts
export const GEMINI_MODELS = {
  /** Быстрая и недорогая модель для простых задач (генерация слов, медиа). */
  FLASH: "models/gemini-1.5-flash-latest",
  /** Мощная модель для сложных задач (проверка эссе, генерация контента). */
  PRO: "models/gemini-1.5-pro-latest",
} as const;
```

**BE-28 — `get-feedback-reports/index.ts:11-20`**
```ts
  const { data: profile, error } = await adminClient
    .from(DB_TABLES.PROFILES)
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role !== "admin") {
    throw new HttpError("Forbidden: admin role required", 403);
  }
```

**BE-29 — `process-word-request/index.ts:136-142`**
```ts
    const { data: aiResponse, error: aiError } = await supabaseAdmin.functions.invoke(
      FUNCTION_NAMES.GENERATE_WORD_DATA,
      { body: { word: inputWord }, headers: bearerHeaders(token) },
    );

    console.log("📦 AI RESPONSE:", aiResponse);
```

**BE-30 — `0001_initial_rls.sql:221-224`**
```sql
DROP POLICY IF EXISTS storage_audio_public_read ON storage.objects;
CREATE POLICY storage_audio_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'audio-files');
```

**BE-31 — `.env.example:32-36` + факт: `supabase/functions/.env` отсутствует**
```env
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_SERVICE_KEY=
SB_SECRET_KEY=
SERVICE_ROLE_KEY=
```

**BE-32 — `supabase/functions/deno.json:2-9`**
```json
  "imports": {
    "std/": "https://deno.land/std@0.224.0/",
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2",
    "@google/generative-ai": "npm:@google/generative-ai@0.22.0",
    "zod": "npm:zod@3",
    "imagescript": "https://deno.land/x/imagescript@1.2.15/mod.ts",
    "shared/": "./_shared/"
```

**BE-33 — `0001_initial_rls.sql:39-44` (нет `CREATE TABLE`/`IF EXISTS`/`BEGIN`)**
```sql
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vocabulary_select ON public.vocabulary;
CREATE POLICY vocabulary_select ON public.vocabulary
  FOR SELECT TO anon, authenticated
  USING (
```

**BE-34 — `check-essay.test.ts:8-12`**
```ts
Deno.test("check-essay: GEMINI_MODELS.FLASH доступен", async () => {
  const constantsModule = await import("./_shared/constants.ts");
  assertEquals(constantsModule.GEMINI_MODELS.FLASH, "gemini-2.5-flash");
  assertEquals(constantsModule.GEMINI_MODELS.PRO, "gemini-2.5-pro");
});
```

**BE-35 — `0001_initial_rls.sql:141-146`**
```sql
ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_global_stats_own_all ON public.user_global_stats;
CREATE POLICY user_global_stats_own_all ON public.user_global_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**BE-36 — `generate-word-data/index.ts:20-27`**
```ts
const WordSchema = z.object({
  word_kr: z.string(),
  translation: z.string(),
  example_kr: z.string().optional(),
  example_ru: z.string().optional(),
  topik_level: z.string().optional(),
  synonyms: z.string().optional(),
```

**BE-37 — `process-word-request/index.ts:203-207`**
```ts
        const insertData = {
          ...item,
          topic: record.topic || item.topic,
          category: record.category || item.category,
          level: record.level || item.level,
```

**BE-38 — `process-word-request/index.ts:296-302`**
```ts
        await getSupabaseAdmin()
          .from(DB_TABLES.WORD_REQUESTS)
          .update({
            status: WORD_REQUEST_STATUS.ERROR,
            my_notes: error instanceof Error ? error.message.slice(0, 200) : "Processing failed",
          })
```

**BE-39 — `regenerate-image/index.ts:165-167`**
```ts
  const image = await Image.decode(imageBuffer);
  image.resize(image.width > 1024 ? 1024 : Image.RESIZE_AUTO, Image.RESIZE_AUTO);
  const compressedData = await image.encode(0.8); // 80% JPEG quality
```

**BE-40 — `generate-word-data/index.ts:50-55`**
```ts
const BASE_MODELS: ReadonlyArray<{ name: string; score: number }> = [
  { name: "models/gemini-3.1-flash-lite", score: 100 },
  { name: "models/gemini-3-flash", score: 90 },
  { name: "models/gemini-2.5-flash", score: 80 },
  { name: "models/gemini-flash-latest", score: 70 },
];
```

**BE-41 — `background-worker/index.ts:49-54`**
```ts
          if (!word.audio_url && word.word_kr) {
            promises.push(
              createAudioFile(supabaseAdmin, word.word_kr, "female", `female/${word.id}.mp3`)
                .then((url) => {
                  updates.audio_url = url;
                })
```

**BE-42 — `check-essay/index.ts:123-130`**
```ts
    const model = getGeminiClient().getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });
```

**BE-43 — `generate-word-data/index.ts:226-230`**
```ts
        await supabase.from(DB_TABLES.AI_CACHE).insert({
          cache_key: cacheKey,
          response_data: dataToCache,
          expires_at: expiresAt.toISOString(),
        });
```

**BE-44 — `_shared/constants.ts:1-6`**
```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // DELETE нужен delete-user, GET — admin-функции, POST — остальные вызовы.
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
```

**BE-45 — `process-word-request/index.ts:44-49` (и аналогичные функции: нет проверки метода)**
```ts
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let requestId: string | number | null = null;
```

**BE-46 — `_shared/constants.ts:76-85`**
```ts
export const FUNCTION_NAMES = {
  GENERATE_WORD_DATA: "generate-word-data",
  REGENERATE_IMAGE: "regenerate-image",
  PROCESS_WORD_REQUEST: "process-word-request",
  CHECK_ESSAY: "check-essay",
  // Новые функции
  GENERATE_MEDIA: "generate-media-for-word",
  RETRY_WORD_REQUEST: "retry-word-request",
  GENERATE_QUOTE_AUDIO: "generate-quote-audio",
};
```

**BE-47 — `.gitignore:1-5` (файла `supabase/.temp/` в списке нет; отслеживается `git ls-files`)**
```gitignore
node_modules
dist
.env
.DS_Store
Thumbs.db
```

**BE-48 — `README.md:124-128`**
```md
Мigration включает:
- RLS на всех таблицах (`vocabulary`, `user_progress`, `user_global_stats`, `feedback_reports` и др.)
- Политики доступа: публичное чтение справочников, пользовательские строки только владельцу
- Админ-доступ через `public.is_admin()` (SECURITY DEFINER)
- Политики Storage для бакетов `audio-files`, `image-files`, `feedback_attachments`
```

---

## Сводка (а): схема БД vs код

| Объект | В миграции 0001 | Используется в коде | Что ожидает код (главное) | Вердикт |
|---|---|---|---|---|
| `vocabulary` | только RLS (39-64) | фронт (db.ts, ui_*, quiz), EF (background-worker, generate-media, process, regenerate, retry) | ~30 колонок (db.ts:330-331), `deleted_at`, `updated_at`, `is_public`, `created_by`/`user_id`, `image_source`; уникальность `(word_kr,translation)`? | ⚠️ drift: нет DDL/индексов/дефолтов/уникальности; рассинхрон двух колонок владельца |
| `profiles` | RLS + `is_admin()` (13-29,161-177) | EF admin-функции, `is_admin()`, Storage-политики | `id, role`; строка должна создаваться триггером | ❌ строка не создаётся (нет триггера) → админ-функции мертвы |
| `quotes` | RLS (70-81) | `db.ts:654,688-701`; `Quote` type | `id, quote_kr, quote_ru, literal_translation, explanation, audio_url` | ⚠️ DDL нет, RLS есть |
| `user_progress` | RLS (99-104) | `db.ts:588`, `sync.ts:166`, `ui_trash`, `ui_data` | `user_id, word_id, is_learned/is_mistake/is_favorite, attempts, correct, last_review, sm2_*, learned_date, updated_at`; UNIQUE(user_id,word_id) | ⚠️ DDL/уникальности нет → upsert рискует |
| `user_global_stats` | RLS own-only (141-146) | `db.ts:435`, `sync.ts:132`, leaderboard, `auth_service:84` | `user_id, xp, level, weekly_xp, league, sprint_record, survival_record, coins, streak_freeze, achievements, sessions, settings, updated_at, avatar_url, full_name`; UNIQUE(user_id) | ❌ RLS конфликтует с лидербордом; уникальность не версионирована |
| `word_requests` | RLS (87-97) | `ui_custom_words`, `ui_retry`, `ui_failed_requests`, process/retry/worker | `id, user_id, word_kr, status, target_list_id, topic, category, level, my_notes, failed_step, created_at` | ⚠️ `failed_step` читается, но не пишется; реального обработчика `pending` нет |
| `user_lists` | RLS own-only (106-111) | `ui_collections`, `ui_bulk`, `auth.ts` | `id, user_id, title, icon, is_public, created_at` | ❌ RLS конфликтует с публичными списками |
| `list_items` | RLS через parent (114-132) | `ui_collections`, `ui_bulk`, process | `list_id, word_id`; UNIQUE(list_id,word_id) | ⚠️ уникальность не версионирована; FK/CASCADE неизвестны |
| `user_vocabulary` | RLS (134-139) | **нигде** (только константа `_shared/constants.ts:17`) | — | ❌ таблица, вероятно, не существует → `ALTER TABLE` в миграции может упасть |
| `user_favorite_quotes` | RLS (148-153) | только SELECT `db.ts:641-644`; записи нет | `user_id, quote_id` | ⚠️ таблица есть в RLS, но фронт в неё не пишет (избранное только в localStorage) |
| `feedback_reports` | RLS (180-196) | EF submit/get/update; `ui_admin` | `id, user_id, type, title, description, priority, status, attachments(jsonb), created_at`; default `status` | ⚠️ DDL/дефолтов нет |
| `ai_cache` | RLS admin-only (204-210) | generate-word-data, regenerate-image | `cache_key, response_data, expires_at`; UNIQUE(cache_key) | ⚠️ уникальности/структуры нет; TTL-очистки нет |
| `articles` | **отсутствует** | `ui_reading.ts:38-45` | `id, title, content, translation, level, topic, image_url, audio_url, created_at, source` | ❌ нет ни таблицы, ни RLS, ни политик |
| Storage `audio-files`, `image-files`, `feedback_attachments` | только политики (218-296) | audio/image/feedback EF, аватары | Создание бакетов, лимиты, MIME | ❌ бакеты не создаются из репозитория |
| Функция `cleanup_user_progress` | нет | `db.ts:428` | — | ❌ RPC отсутствует |
| Триггеры `updated_at`, `handle_new_user`, публикация Realtime | нет | косвенно db.ts/sync.ts/ui_custom_words | — | ❌ отсутствуют в репозитории |

## Сводка (б): 12 Edge Functions

| Функция | verify_jwt | Аутентификация/авторизация | Валидация входа | Rate limit | Обработка ошибок | Ключевые проблемы |
|---|---|---|---|---|---|---|
| `background-worker` | true ❌ (нужен false) | CRON_SECRET Bearer; gateway режет | нет тела | нет | try/catch + 401 | BE-02/03; изображения не генерятся; `pending`-заявки не обрабатывает |
| `check-essay` | true | user JWT | taskType enum, answer≤8000, question≤2000, image MIME/3 МБ | нет | HttpError/500-скрытие | prompt injection в `question/answer` (влияет на свою оценку), FLASH вместо PRO, нет лимитов |
| `delete-user` | true | user JWT (self) | метод DELETE/POST | нет | echo errors | BE-17 |
| `generate-media-for-word` | true | user JWT + владелец слова | word_id, ограничение длины | нет | allSettled | BE-24; повторные вызовы = TTS-затраты |
| `generate-word-data` | true | user JWT | zod word list (20×60, charset) | нет | HttpError/500, fallback-промпт | BE-36/40/43; модель-роутер с непроверенными именами; кэш без upsert |
| `get-feedback-reports` | true | user JWT + `profiles.role==='admin'` (мертво) | GET only | нет | HttpError | BE-05/26 |
| `ocr-image` | true | user JWT | image MIME/base64/3 МБ | нет | HttpError | нет лимитов; fallback возвращает сырой текст |
| `process-word-request` | true | user JWT + владелец `word_requests` + владелец списка | word_kr/charset/id; topic/category/level — без проверки | 15 строк/мин (обходим) | try/catch + статус error | BE-13/14/15/37/38 |
| `regenerate-image` | true | user JWT, но **без проверки владельца слова** | mode/word/id/selectedUrl (SSRF allowlist), MIME/size | нет | HttpError | **BE-04 IDOR**, BE-21 |
| `retry-word-request` | true | user JWT + владелец заявки | request_id | нет | try/catch | BE-16 (no-op), BE-40 |
| `submit-feedback` | true | user JWT | type/priority enum, title≤200, desc≤4000, attachments MIME/2 МБ×3 | 3 отчёта/мин | HttpError | BE-25/26 |
| `update-feedback-status` | true | user JWT + `profiles.role==='admin'` (мертво) | POST only, status enum | нет | HttpError | BE-05; нет аудита изменений |

## Сводка (в): env-переменные (только имена/формат, значения не выводились)

| Переменная | Читается кодом | В `.env.example` | В локальном `.env` | Комментарий |
|---|---|---|---|---|
| `SUPABASE_URL` | да (primary, `clients.ts:38`) | да | **нет** | на hosted инжектится платформой; локально функции её получают от CLI |
| `VITE_SUPABASE_URL` | да (alias) | да | да | fallback для функций — странно, но работает |
| `SUPABASE_PUBLISHABLE_KEY` | да (primary) | да | нет | новое платформенное имя — `SUPABASE_PUBLISHABLE_KEYS` (plural JSON) — **не читается** (BE-20) |
| `SUPABASE_ANON_KEY` | да (alias) | да | нет | legacy |
| `VITE_SUPABASE_KEY` | да (alias) | да | да (`sb_publishable_...`) | |
| `SUPABASE_SECRET_KEY` | да (primary) | да | да (`sb_secret_...`) | `SUPABASE_SECRET_KEYS` (plural JSON) не читается |
| `SUPABASE_SERVICE_KEY` | да (alias) | да | **дважды**: secret и publishable (last-wins) | конфликт в локальном `.env` |
| `SB_SECRET_KEY`, `SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | да (aliases) | да | нет | legacy-имена |
| `GEMINI_API_KEY` | да (`clients.ts:103`, `generate-word-data:15`) | да | да (Google-формат) | в `supabase/functions/.env` отсутствует → локальные функции без ключа |
| `PIXABAY_API_KEY` | да (`regenerate-image:255,300`) | да | да | |
| `PEXELS_API_KEY` | да (`:256,304`) | да | нет | локально источник изображений не работает |
| `UNSPLASH_ACCESS_KEY` | да (`:257,309`) | да | нет | локально источник изображений не работает |
| `CRON_SECRET` | да (`background-worker:21`) | да | нет | плюс блокируется gateway (BE-02) |
| `SUPABASE_DB_URL`, `SUPABASE_JWKS`, `SB_REGION`, `SB_EXECUTION_ID` | нет | нет | нет | корреляция логов/прямой доступ к БД не используются |

---

## Хорошо сделано

- **Проверка JWT настоящая**: `_shared/auth.ts:32-40` вызывает `supabase.auth.getUser(token)` (запрос в GoTrue), а не просто декодирует JWT; `user.id` берётся только из токена — во всех 12 функциях прослеживается это правило, тело запроса не является источником identity.
- **Проверки владения есть в большинстве опасных мест**: `process-word-request` читает `word_requests.user_id` из БД (87-95) и проверяет `target_list_id` (99-116); `generate-media-for-word` грузит слово из БД и требует владельца (35-48); `retry-word-request` фильтрует `.eq("user_id", user.id)`; `delete-user` не принимает id из тела.
- **SSRF-защита в `regenerate-image`**: только `https:`, запрет userinfo, allowlist хостов `cdn.pixabay.com/images.pexels.com/images.unsplash.com/...` (`_shared/constants.ts:32-39`), проверка `Content-Length`/`Content-Type`/фактического размера после скачивания (59-90); результаты поисковых API тоже прогоняются через `isAllowedSearchResult` (145-152).
- **Валидация изображений до Gemini**: base64-regex, allowlist MIME, лимит base64 и вычисленный размер — `_shared/validation.ts:62-108`; лимиты по словам/длине в `validateWords`.
- **`is_admin()` сделана правильно**: `SECURITY DEFINER` + `SET search_path = public` + `REVOKE ALL FROM PUBLIC`/`GRANT EXECUTE TO authenticated` (`0001:13-29`) — классическая защита от подмены search_path и рекурсии RLS.
- **Единая модель ошибок**: `HttpError` + `createErrorResponse` скрывает детали 5xx от клиента, отдаёт CORS и `{error,success,timestamp}`; `withTimeout` не даёт зависнуть AI-вызову.
- **Секреты не в git**: `.env` отсутствует в индексе, `.gitignore` его исключает; service-ключ используется только в Edge Functions, в клиентский бандл попадают только `VITE_*`; ключ Gemini SDK передаётся заголовком `x-goog-api-key` (не в URL), т.е. не утекает в тексты ошибок-URL.
- **Storage-политики с проверкой папки**: запись в `<uid>/...`, аватары `avatars/<uid>...`, вложения feedback — `<uid>/...` (`submit-feedback:110`), имя файла не берётся из клиента (uuid + разрешённое расширение), path traversal отбит (`submit-feedback:52-54`).
- **SSML-экранирование** (`tts.ts:4-11`) — защита от инъекции в SSML; `escapeHtml` в UI (вне скоупа).
- **Zod-валидация AI-ответа** в `generate-word-data` (`WordSchema`, `safeParse`) и жёсткая валидация результата эссе (`validateEssayResult`, `check-essay:44-82`) — контракт клиента/сервера не разъезжается по форме.
- **Есть попытки rate limit'а** (пусть и слабые) и проверка метода/OPTIONS в части функций; `verify_jwt=true` по умолчанию для всех функций — правильная база для пользовательских endpoint'ов.

## Ограничения аудита

1. **Deno отсутствует** (`deno` не установлен): не запускались `deno task check`, `deno task test`, `deno fmt --check`, `deno lint`, `deno check`. Все утверждения о CI/типах/форматировании — статические и помечены как риск (BE-06, BE-32, BE-41). `deno.lock` проверялся только текстовым анализом.
2. **Нет доступа к живой БД/дашборду Supabase**: нельзя подтвердить фактическую схему (колонки, типы, NOT NULL, FK/ON DELETE CASCADE, триггеры, индексы, UNIQUE), применение миграции, содержимое `profiles`, настройки Realtime-публикации, наличие бакетов и значений secrets. Все «есть/нет» в схеме — вывод из репозитория; README:221 утверждает, что миграция применена, но SQL-дампа схемы в проекте нет.
3. **Живые внешние API не проверялись**: Gemini (наличие/имена моделей, 404), Edge TTS (DRM/Sec-MS-GEC, 403), Pixabay/Pexels/Unsplash (ключи/квоты), Supabase Storage. TTS-риск BE-19 подтверждается только исходниками edge-tts и отсутствием заголовков в коде.
4. **Supabase CLI/деплой не запускались**: поведение `supabase functions deploy` с `config.toml`, распознавание имени миграции `0001_initial_rls.sql` и применение RLS к реальной БД не проверены эмпирически.
5. **Работа с секретами**: значения `.env` не выводились и не копировались; в отчёте только имена и формат (`sb_publishable_*`/`sb_secret_*`/`AIza*`) как диагностический признак.
6. **Сравнение с HEAD**: `audit/head-check` — выгрузка HEAD; расхождения `index.ts` по размеру в рабочем дереве — CRLF (`.gitattributes`), а не правки; бэкенд-логика идентична HEAD, кроме удаления неиспользуемого `find-confusing-words/deno.json` (папки без `index.ts` не было и в HEAD — удаление корректно, ссылок в коде/конфиге нет) и пустого `settings.json`.
7. **Не проверялись** фронтовые тесты/бандл глубже, чем нужно для контракта схемы; чужие отчёты (`audit/reports/frontend.md`, `learning-logic.md`) не читались во избежание дублирования.

## Кросс-скоуп

- **BE-06 (CI)**: падение `tsc` — фронтовый дефект (`src/app.ts:149`, неиспользуемый `setSyncState`), но именно он блокирует деплой Edge Functions (job `deploy-functions` зависит от `test`). Плюс `npm run lint` падает на prettier в новых `src/core/network.ts:177` и `src/core/xp.ts:26`.
- **BE-08/BE-09/BE-10/BE-11**: RLS и отсутствие триггеров ломают конкретные фронтовые фичи (лидерборд, публичные списки, инкрементальный синк, upsert прогресса) — чинить нужно совместно: политики/миграция + код.
- **BE-04 IDOR** достижим из UI (`src/ui/ui_card.ts:479-486, 546-559`): подмена `item.id` в вызове `regenerate-image` даёт запись в чужое слово; security-аудитору стоит учесть при оценке клиентской валидации.
- **BE-17 delete-user** — бизнес-логика удаления размазана между `src/core/auth.ts:704-789` и Edge Function; полумеры на клиенте (удаление таблиц до вызова) должны быть заменены серверной операцией.
- **BE-25** лимиты вложений: клиент (`ui_feedback.ts:120-130`) разрешает 50 МБ/файл, сервер — 2 МБ; UX-ошибка возникает на стороне фронта.
- **`src/core/db.ts:400-414`**: клиент намеренно глотает `42501` (RLS permission denied) и продолжает работать на кэше — это маскирует сломанные RLS/схему (любая ошибка прав выглядит как «офлайн-режим»); при аудите данных стоит учесть.

## Методика проверки (что и как смотрелось)

1. `git log/status/diff`, `git ls-files`, хеши и размеры файлов — фиксация среза и отличий от HEAD.
2. Полное чтение всех 12 `index.ts`, 8 общих модулей, конфигов, тестов; каждой цитате в отчёте соответствует прочитанная строка (номера проверены `read`).
3. Обратный поиск по коду фронта (`Select-String`/`grep`: `.from(`, `.rpc(`, `.insert(`, `.upsert(`, `storage.`, `functions.invoke`, колонки `updated_at/deleted_at/is_public/...`) для восстановления фактического контракта схемы.
4. Проверка поведения supabase-js (`fetchWithAuth`, `FunctionsClient.invoke`) по установленному `node_modules/@supabase/*` (фронт 2.99.2) — для доказательства BE-03 и корректности `method: "GET"` в `ui_admin`.
5. Сверка с официальной документацией Supabase: `guides/functions/auth-headers` (поведение `verify_jwt`), `guides/functions/secrets` (дефолтные env и `SUPABASE_*`-резерв), `guides/functions/limits` (CPU 2 s), `guides/local-development/database-migrations` (формат миграций/бакеты) — ссылки в тексте.
6. Сверка TTS с исходниками `edge-tts` (`drm.py`, `constants.py`) — доказательство необходимости `Sec-MS-GEC`.
7. Эталонные прогоны Lead (`audit/logs/*`) учтены; собственные `npm/npx/deno` не запускались.

---

### Приложение. Дифф бэкенда рабочего дерева vs HEAD (git diff, без секретов)

```text
supabase/functions/find-confusing-words/deno.json  | 7 -   (удалён; index.ts в HEAD отсутствовал)
supabase/functions/generate-word-data/deno.json    | 1 -   (удалён дубль ключа "zod": было "zod": "npm:zod@3" и "zod": "npm:zod@3.23.8")
supabase/functions/regenerate-image/settings.json  | 0     (удалён пустой файл)
```
