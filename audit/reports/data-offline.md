# Аудит данных и offline-first слоя — TOPIK II Master Pro

**Дата:** 2026-11-22 (Asia/Tashkent)
**Commit:** `cc7f8333272c715de22d1a883b924bb576f2cbd0` (short `cc7f833`); рабочее дерево грязное — в зоне аудита изменены/новые: `src/core/db.ts`, `src/core/sync.ts`, `src/core/pwa.ts`, `src/core/stats.ts`, `src/app.ts`, `src/ui/ui_leaderboard.ts`, `src/ui/ui_share.ts`; новые `src/core/network.ts`, `src/core/xp.ts`. Аудит — по рабочему дереву.
**Аудитор:** data-auditor (task-2)
**Метод:** статический анализ + сверка с эталонными артефактами Lead (`audit/logs/tsc.txt`, `audit/logs/build.txt`, `audit/logs/vite-build.txt`, `audit/logs/coverage.txt`, `audit/build-out/**`). Приложение в браузере не запускалось (см. «Ограничения аудита»). Собственных `npm run build` / `vitest` / `tsc` не выполнялось.

---

## 1. Охват и прочитанные файлы

Полностью прочитаны (с проверкой номеров строк):

- `src/core/db.ts` (912 стр.), `src/core/state.ts` (536), `src/core/sync.ts` (209), `src/core/storage_idb.ts` (77), `src/core/network.ts` (177), `src/core/backup.ts` (61), `src/core/session.ts` (156), `src/core/ui_sync.ts` (43), `src/core/pwa.ts` (121), `src/core/supabaseClient.ts` (263), `src/core/constants.ts` (92), `src/core/xp.ts` (26), `src/core/auth_service.ts` (105)
- `src/sw.ts` (206), `src/types/index.ts` (179), `src/workers/searchWorker.ts` (~35)
- `src/ui/ui_data.ts` (316), `src/ui/ui_retry.ts` (149), `src/ui/ui_quotes.ts` (55)
- `public/offline.html` (86), `public/_redirects` (1), `vite.config.ts` (121), `package.json`, `.env.example`, `.gitignore`, `.github/workflows/deploy.yml` (105), `supabase/migrations/0001_initial_rls.sql` (301)
- `dist/sw.js` (сборка 2026-11-20, разобран целиком), `audit/build-out/sw.js` (свежая сборка Lead 2026-11-22, разобрана целиком), `audit/build-out/index.html`, `audit/logs/build.txt`, `audit/logs/vite-build.txt`, `audit/logs/coverage.txt` (UTF-16), `audit/logs/tsc.txt` (1 строка), `audit/logs/test.txt`
- Тесты: `src/core/db.test.ts` (77), `src/core/session.test.ts` (91)

Выборочно (участки, относящиеся к данным/офлайну):

- `src/app.ts` — строки 350–420, 545–620, 1095–1245, 1246–1646 (инициализация, auth-события, realtime, beforeunload, обработчик ошибок init); остальное — grep по `scheduleSaveState`, `dirtyWordIds`, `sync`, `storage`, `BroadcastChannel`, `visibilitychange`
- `src/core/stats.ts` — 1–200, 270–575, grep по `calculateOverallAccuracy`/`checkAchievements`/`addXP`
- `src/core/auth.ts` — 1–120 (session-expired), 540–800 (логин/логаут/удаление аккаунта); `src/ui/ui_card.ts` — 600–713; `src/ui/ui_settings.ts` — 200–260, 1020–1130 + grep `updateSettingsTimestamp`; `src/ui/ui_trash.ts` — 1–140 + grep; `src/utils/utils.ts` — 1–120, 195–315 + grep
- `supabase/functions/process-word-request/index.ts` — grep по `is_public`/`created_by`/`insert`
- `README.md` (PWA-раздел 170–210 + grep), `GEMINI.md` (grep)
- `audit/reports/frontend.md`, `audit/reports/security.md`, `audit/reports/learning-logic.md` — выборочно, чтобы не дублировать находки других аудиторов (перекрёстные ссылки в разделах).

**Границы:** `node_modules`, `dist` (кроме разбора `dist/sw.js` как артефакта), `.git`, `supabase/functions/node_modules` не анализировались.

---

## 2. Вердикт

Слой данных реализует заявленный offline-first лишь частично и с несколькими точками **молчаливой потери данных**. Главная архитектурная проблема: «durable outbox» из `sync.ts` — это фактически `dirtyWordIds` + одноразовый слепок глобальной статистики, который никогда не переигрывается; при этом `state.dirtyWordIds.clear()` после синка стирает и те ID, что появились во время уже идущей синхронизации, — прогресс навсегда остаётся только на устройстве. Конфликты решены через полный upsert строк с LWW по клиентскому времени: удаление из «изучено/избранное» не распространяется между устройствами («воскрешение» флагов), а XP/монеты/лиги/сессии/ачивки затираются устаревшей вкладкой или устройством, у которого часы ушли вперёд. Флаг «инкрементального» словаря мёртв из-за рассинхрона двух версий кэша (`"10"` против `"v1.1"`), поэтому каждый холодный старт — это полная выгрузка словаря (с пагинацией до 200 000 строк), что прямо противоречит README. При этом реальный офлайн-оболочка собрана неплохо: precache 23 записи / 908.72 KiB покрывает все рантайм-чанки (подтверждено свежей сборкой Lead), `offline.html` и `fetchVocabulary` с `AbortController` + офлайн-проверкой до запроса — сделаны аккуратно.

Самые опасные сценарии: закрытие/перезагрузка вкладки убивает текущую сессию (она никогда не сохраняется), `localStorage.clear()` в `handleInitError` может стереть всё локальное состояние из-за любого `SyntaxError` с «JSON» в сообщении, а исчерпание квоты localStorage не замечается никем — обработчик `QuotaExceededError` в `immediateSaveState` недостижим, потому что каждый `save*` глушит исключение локально; при этом полный словарь сериализуется в localStorage на каждый дебаунс.

Конфигурация PWA содержит мёртвую секцию `workbox.runtimeCaching` (в `injectManifest` она игнорируется — в свежем `sw.js` нет ни `supabase-api-cache`, ни `html2canvas`), а стратегия `StaleWhileRevalidate` для словаря с `maxEntries: 1` и пагинированными URL фактически «выдавливает» сама себя. Заявленный «durable outbox» из README/GEMINI-документации не соответствует коду; тесты ядра данных при этом формально покрывают 0% `db.ts`, `sync.ts`, `storage_idb.ts` и `pwa.ts` (см. `audit/logs/coverage.txt`).

Итог: **3 P0, 13 P1, 14 P2, 5 P3 — 35 находок.** До их устранения приложение нельзя называть offline-first: оно offline-терпимое (кэш читается и показывается), но не offline-надёжное (запись и синхронизация теряют данные в типовых полевых сценариях).

---

## 3. Сводная таблица находок

Легенда: **P0** — потеря данных / неработоспособность офлайна; **P1** — серьёзный баг (тихая потеря части данных, неверная синхронизация, существенное искажение прогресса); **P2** — качество, производительность, надёжность; **P3** — нитрик/мёртвый код/документация.

| ID | Sev | Область | Файл:строка | Суть | Влияние | Исправление |
|---|---|---|---|---|---|---|
| DAT-01 | P0 | Outbox / гонка | `src/core/sync.ts:139-175` | `clear()` очищает `dirtyWordIds` целиком, включая ID, добавленные во время уже идущей отправки | Прогресс, полученный во время синка, никогда не уходит в облако (тихая потеря облачной копии) | Удалять только реально отправленные ID (`uploadedIds.forEach(delete)`) |
| DAT-02 | P0 | Recovery/init | `src/app.ts:1596-1610` | Любой `SyntaxError` с «JSON»/«token» в init → `localStorage.clear()` | Полное стирание прогресса, outbox, dirty-ids и `safety_backup_v1` без подтверждения | Точечное удаление битого ключа + бэкап + подтверждение |
| DAT-03 | P0 | Квота | `src/core/db.ts:71-86, 875-890, 896-912` | Каждый `save*` глушит `QuotaExceededError` локально → внешний catch мёртв; полный словарь пишется в localStorage на каждый дебаунс | При достижении квоты сохранения тихо не работают, пользователь не предупреждён → потеря новых данных после reload | Единая обёртка `setItem` с обработкой квоты; словарь хранить только в IDB |
| DAT-04 | P1 | Durable outbox | `src/core/sync.ts:56-73, 173-189` | Outbox хранит только `dirtyWordIds`, `globalUpdates` никогда не переигрываются; ретрай — лишь при следующем изменении состояния/online; нет backoff-таймера, TTL, лимита | XP/коины/сессии/ачивки, «потерянные» при ошибке синка, не восстанавливаются из outbox; при простое несинхронизированные данные висят бесконечно | Полноценные записи outbox (op/payload/ts/retry), replay на старте/online, backoff, dead-letter |
| DAT-05 | P1 | Словарь/версии | `src/core/db.ts:11, 291-292, 372, 867-873` | `saveVocabVersion` пишет в `vocabulary_version` число `10`, а `isCacheValid` сравнивает с `"v1.1"` → всегда `false` | Инкрементальный синк мёртв: каждый запуск — full-sync словаря (до 200 страниц); трафик/батарея/задержка старта | Одна константа версии; писать её в оба хранилища; `LAST_VOCAB_SYNC` использовать |
| DAT-06 | P1 | Merge прогресса | `src/core/db.ts:600-611` | При `localAttempts > remoteAttempts` пропускаются серверные флаги (learned/favorite/mistake), затем синк пишет локальные `false` поверх | Потеря флагов, выставленных на другом устройстве/в другой сессии | Полевой merge флагов (`OR`) + условный upsert по `updated_at` |
| DAT-07 | P1 | Удаления/томбстоуны | `src/core/db.ts:609-611`; `src/core/sync.ts:143-158` | Merge только добавляет `true`; снятие флага не передаётся; upsert перезаписывает строку целиком | «Воскрешение» снятых learned/favorite/mistake; устаревшее устройство понижает attempts на сервере | Томбстоуны/время изменения на флаг; серверный merge; RPC вместо full-row upsert |
| DAT-08 | P1 | Конфликты LWW | `src/core/sync.ts:113-134` | `user_global_stats` апсертится целиком, без сравнения `updated_at`; `updated_at` = клиентское время | Две вкладки/устройства: XP, coins, weeklyXp, league, sessions, achievements затираются устаревшим состоянием; часы решают победителя | Атомарные RPC (`increment`/`greatest`), серверное время, условный upsert |
| DAT-09 | P1 | Merge XP | `src/core/db.ts:442-449` | Если облачный уровень выше — `xp` берётся из облака, локальный остаток XP отбрасывается | Офлайн-опыт, набранный при другом уровне, безвозвратно теряется при входе | Мержить по суммарному XP (`getTotalXP`), пересчитывая уровень |
| DAT-10 | P1 | Загрузка прогресса | `src/core/db.ts:587-598` | `user_progress` выбирается `select("*")` без `range`/`order` → PostgREST отдаёт максимум 1000 строк (silent cap) | У пользователя с >1000 строк прогресса часть не восстанавливается после переустановки/очистки кэша | Пагинация по `word_id`, частичные колонки, чекпойнт |
| DAT-11 | P1 | Аккаунты/сессии | `src/app.ts:1399-1421`; `src/core/auth.ts:18-42` | На `SIGNED_OUT`/истечении токена состояние и локальные данные НЕ очищаются; только `updateAuthUI(null)` | Следующий аккаунт на устройстве наследует и загружает в облако прогресс предыдущего (приватность + порча данных) | Сброс state/caches на `SIGNED_OUT`; namespace storage по `user.id` |
| DAT-12 | P1 | Импорт | `src/ui/ui_data.ts:236-251, 296-304` | Импорт без валидации типов: нечисловые `xp/coins/...` → `validateUserStats` падает → `saveUserStats` молча не сохраняет | После импорта «плохого» JSON пользователь теряет всю статистику при reload; нет формата/версии | JSON-schema + принудительные числа, версия формата, отклонение невалидного |
| DAT-13 | P1 | Чистка ID | `src/core/db.ts:91-115, 186-233` | `cleanupInvalidStateIds` удаляет learned/mistakes/favorites/wordHistory для слов, отсутствующих в текущем `dataStore`, и сразу это сохраняет | Soft-deleted/скрытые RLS/урезанный словарь → локальный прогресс стирается; у гостя без облака — навсегда | Не удалять, а помечать осиротевшими; чистить только подтверждённые серверные tombstone |
| DAT-14 | P1 | Schema drift | `src/core/sync.ts:113-136`; `supabase/migrations/0001_initial_rls.sql:1-7` | В репозитории нет ни `CREATE TABLE`, ни `ALTER TABLE` (только RLS); код пишет колонки `weekly_xp/league/streak_freeze/settings/sessions/avatar_url/full_name` и upsert по `onConflict` (нужны UNIQUE-констрейнты) | Отсутствие любой колонки/констрейнта в реальной БД = 400/42P10 на upsert → синк не работает совсем | Закоммитить полную схему миграциями; проверка схемы в CI; introspection `pg_columns/pg_constraints` |
| DAT-15 | P1 | IndexedDB | `src/core/storage_idb.ts:10-61` | Соединения открываются на каждый вызов и никогда не закрываются; `resolve` на `req.onsuccess`, а не `tx.oncomplete`; нет `onblocked`/`onversionchange` | Утечка соединений (2 на каждый дебаунс), потеря записи кэша при закрытии вкладки; будущий bump `DB_VERSION` заблокируется открытыми табами | Singleton-промис БД, `tx.oncomplete`, `db.close()`, `onversionchange`, `onblocked` |
| DAT-16 | P1 | Баты прогресса | `src/core/sync.ts:161-171` | Один чанк из 100 строк апсертится одной транзакцией; при 4xx/bad row падает весь чанк и повторяется вечно (dead-letter отсутствует) | Одна «плохая» строка блокирует отправку всего прогресса навсегда; пользователь не знает причину | Разбор ошибки, карантин/chunk-retry поштучно, уведомление, валидация word_id |
| DAT-17 | P2 | Производительность | `src/core/db.ts:58-65, 232, 875-890`; `src/app.ts:1384` | На каждый дебаунс (после каждого ответа) — `JSON.stringify` всего словаря × 2 хранилища + sort/enrich + клон в search worker; на старте — синхронный `JSON.parse` кэша | Jank/фризы на 5–10k слов, батарея, риск квоты; рост стоимости каждого ответа | Отдельное (редкое) сохранение словаря; прогресс — отдельными ключами; IDB-only |
| DAT-18 | P2 | Сессии | `src/core/session.ts:64-87, 112-127`; `src/app.ts:1592-1594`; `src/core/db.ts:896-912` | Активная сессия живёт только в памяти и пишется в историю только в `endSession`; `beforeunload` сохраняет лишь state-ключи | Reload/закрытие/краш → сессия и её время/счётчики потеряны; также баг: после паузы idle-таймер не взводится до следующего события | Персист `{startedAt,paused,seconds,reviewed}` + restore на старте + pagehide |
| DAT-19 | P2 | Backup/restore | `src/core/backup.ts:3-61` | `restoreLocalBackup()` нигде не вызывается; бэкап один слот, перезаписывается, при >3MB тихо пропускается | «Safety backup» перед миграцией/сбросом бесполезен — восстановить нельзя | UI восстановления, несколько слотов, версионирование, не пропускать молча |
| DAT-20 | P2 | PWA update | `src/core/pwa.ts:51-59, 74-81`; `vite.config.ts:21` | `SKIP_WAITING` активирует новый SW, но страница не перезагружается; `cleanupOutdatedCaches` удаляет старые чанки; `registerType:"autoUpdate"` при ручной регистрации не работает | После деплоя «старый» таб теряет lazy-chunk'и (`ui_shop`, `ui_share`, `ui_data`, `ui_collections`…) → функции падают 404 | Перезагрузка на `controllerchange` (когда безопасно) либо отложенный waiting-воркер |
| DAT-21 | P2 | SW-кэш словаря | `src/sw.ts:84-100, 147-179` | `StaleWhileRevalidate` + `maxEntries: 1` для всех `/vocabulary`; пагинация даёт разные URL-ключи; периодик-синк кэш не обновляет (fetch из самого SW не перехватывается) | Кэш вытесняет сам себя; отдача «не той» страницы/устаревшего снимка (14 дней); «фоновая синхронизация словаря» — no-op; пользы для приложения нет | Один канонический ключ снимка или убрать маршрут; периодик должен использовать `caches.put`/стратегию |
| DAT-22 | P2 | Background Sync | `src/sw.ts:128-139` | `BackgroundSyncPlugin` навешан на ВСЕ non-GET Supabase-запросы (включая auth и вставки) | Реплей со старым JWT, дубли неидемпотентных запросов (insert), тихий сброс очереди через 24 ч, дублирование с outbox приложения | Ограничить явными идемпотентными эндпоинтами; upsert; уведомлять UI; чистить при logout |
| DAT-23 | P2 | Конфиг PWA | `vite.config.ts:51-83` | `workbox.runtimeCaching` в `injectManifest` игнорируется (в свежем `sw.js` 0 вхождений `supabase-api-cache`/`html2canvas`) | README врёт про SWR 24 ч для Supabase; generic API (articles, leaderboard, feedback, shop) офлайн не кэшируется | Перенести маршруты в `src/sw.ts` либо `generateSW`; обновить README |
| DAT-24 | P2 | Reset/resurrection | `src/ui/ui_data.ts:26-96, 105-134` | `resetAllProgress` игнорирует ошибки облачных delete (офлайн → всё «успешно»), а re-auth паролем триггерит `SIGNED_IN` → параллельный `loadFromSupabase` | «Сброс» офлайн на деле не сбрасывает облако → прогресс возвращается; гонка может вернуть данные сразу после сброса | Проверять ошибки/очередь, подавить auth-событие на время сброса, требовать online |
| DAT-25 | P2 | Индикатор синка | `src/core/sync.ts:9-20`; `src/core/ui_sync.ts:7-8` | Ищутся `#sync-status`/`#sync-btn`, которых нет ни в одном HTML/JS-шаблоне | Пользователь не видит статус синхронизации; мёртвый код (+ `TS6133` в `app.ts:149`) | Один компонент статуса в header или удалить мёртвый код |
| DAT-26 | P2 | Мёртвая фича | `src/core/network.ts:100-111`; `src/core/constants.ts:89` | `postMessage({type:"PROCESS_DOWNLOAD_QUEUE"})` + тост «докачиваем файлы», но в `sw.ts` обработчика нет (0 вхождений в сборке) | Пользователю обещают докачку, ничего не происходит; очередь не реализована | Реализовать обработчик в SW или убрать код/тост |
| DAT-27 | P2 | Настройки | `src/core/db.ts:501-512`; `src/core/sync.ts:91-111`; `src/ui/ui_settings.ts:228-231` | Весь блок settings + `settingsUpdatedAt` (клиентские `Date.now()`) по LWW; при загрузке сравнение `cloudTime >= localTime` | Устаревшее устройство, меняющее одну настройку, затирает весь блок; откат часов ломает синк настроек | Пер-полевые time-stamp'ы/серверный merge; серверное время |
| DAT-28 | P2 | Точность | `src/core/stats.ts:277-298`; `src/core/session.ts:80` | Кэш `cachedAccuracy` недостижим (код после `return`); `w.correct` может быть `undefined` → NaN; в сессию пишется общая точность, не сессионная | «NaN%» в UI при повреждённой истории; неверная accuracy в истории; лишние O(n)-проходы (дубль LL-29) | Исправить кэш, `Number(w.correct)||0`, считать accuracy сессии |
| DAT-29 | P2 | XP/валидация | `src/core/db.ts:42-47, 74-77, 744-754`; `src/core/stats.ts:96-100` | `addXP(-5)`/`addXP(-2)` делают `xp` отрицательным, а `validateUserStats` требует `>= 0` → `saveUserStats` молча не сохраняет | XP/coins/level/streakFreeze не персистятся, пока XP отрицателен; в облако при этом уходит отрицательный XP | Клампить XP в 0 (или разрешить отрицательный и валидировать в sync) |
| DAT-30 | P2 | Retry-обёртка | `src/core/supabaseClient.ts:20-150` | Слепые ретраи POST/PATCH/DELETE на таймаут/5xx (нет идемпотентных ключей); таймаут 10 с × 4 попытки на чанк | Дубли вставок (word_requests, vocabulary) при «потерянном» ответе; синк-чанк может идти ~52 с; зависший `isSyncing` | Ретраить только GET/idempotent; idempotency-key; не логировать `init` (дубль SEC-16) |
| DAT-31 | P3 | Версии/миграции | `src/core/state.ts:140, 280-437`; `src/core/db.ts:11`; `src/core/storage_idb.ts:7` | Три независимые версии (`CURRENT_DB_VERSION=10`, `"v1.1"`, IDB `1`); v10 `JSON.parse` без локального try; `DB_VERSION` пишется только в конце | Схема-изменения не инвалидируют IDB-кэш; битый `user_stats_v5` повторно запускает миграции и перезаписывает бэкап | Единый schema version; пошаговые миграции с записью прогресса |
| DAT-32 | P3 | Offline shell | `src/sw.ts:198-206`; `vite.config.ts:24`; `audit/logs/vite-build.txt` | `NavigationRoute(offline.html)` без `fallbackToNetwork` отдаёт offline-страницу на любую навигацию, кроме precache; `/` покрыт precache `index.html`, поэтому offline.html для старта не используется; offline.html в precache дважды (23 записи, 22 уникальных); 9.6 МБ mp3 не precache'ятся | Онлайн deep-link показывает «Вы офлайн»; реальной fallback-страницы при первом офлайн-старте нет; музыка недоступна офлайн до первого проигрывания | Навигация: network-first → precache `index.html`; offline.html только при ошибке; дедуп; медиа по требованию |
| DAT-33 | P3 | Формат импорта/экспорта | `src/ui/ui_data.ts:136-185, 253-269` | Нет `schemaVersion`; `customWords` присваиваются без нормализации (`_searchStr`, `_parsed*`), `wordHistory` — без валидации | Импортированные слова не находятся поиском; формат несовместим вперёд; экспорт не содержит dirty/outbox | Версия формата, нормализация через `finalizeDataStore`, валидация |
| DAT-34 | P3 | Мелочи | `src/core/db.ts:18-28, 684-708, 711-736`; `src/core/pwa.ts:32-34` | `validateSchema` проверяет только первую строку; `fetchRandomQuote` count+range без order; дубль `isDatabaseActive`; «готово к работе офлайн» до активации SW | Микро-баги качества/UX, дубли кода | Тривиальные правки |
| DAT-35 | P3 | Избранные цитаты | `src/core/db.ts:640-668`; `src/app.ts:566-599` | Локальные избранные цитаты никогда не выгружаются повторно; ошибки insert/delete игнорируются; пустой облачный список не чистит локаль | Офлайн-добавление не видно на другом устройстве; офлайн-удаление «воскресает» после входа | Dirty-флаг для цитат + очередь, проверка ошибок |

**Счётчики:** P0 — 3, P1 — 13, P2 — 14, P3 — 5 (всего 35).

---

## 4. Подробные разборы

### DAT-01 · P0 · Outbox: `clear()` стирает изменения, появившиеся во время синка

**Файл:** `src/core/sync.ts:139-175`

```ts
139:    if (state.dirtyWordIds.size > 0) {
140:      const updates = [];
141:      for (const id of state.dirtyWordIds) {
...
161:      if (updates.length > 0) {
162:        const BATCH_SIZE = 100;
163:        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
164:          const chunk = updates.slice(i, i + BATCH_SIZE);
165:          const { error: progressError } = await client
...
173:      state.dirtyWordIds.clear();
174:      localStorage.setItem(LS_KEYS.DIRTY_IDS, "[]");
```

**Механизм (пошагово):**
1. При старте синка `updates` собирается синхронно из `state.dirtyWordIds` — это «слепок» на момент начала.
2. Дальше идут `await` на сеть: глобальный upsert (`:132`) и чанки по 100 (`:163-171`). Пока идут `await`'ы, пользователь продолжает отвечать на карточки/квиз; `recordAttempt` (`db.ts:179`) и `ui_card` (`:644, 655, 676`) добавляют новые ID в `state.dirtyWordIds`.
3. По завершении успешного синка `state.dirtyWordIds.clear()` (`:173`) удаляет **все** ID, включая добавленные после сборки `updates`, — они никогда не были отправлены.
4. Следующего ретрая для них не будет: `dirty_ids_v1` записан как `"[]"`; пока пользователь не ответит ещё раз на те же слова в новой сессии, сервер о них не узнает. Локально progress остаётся (в `word_history_v5`), но в облаке — нет.

**Влияние:** тихая потеря облачной копии прогресса в любом сценарии «длинный синк + продолжение занятия» (медленная сеть/большой бэклог). При потере устройства/переустановке эти ответы потеряны навсегда; на другом устройстве «изучено/избранное» не появится. Усугубляется DAT-04 и DAT-17.

**Фикс:** собирать `const uploadedIds = [...state.dirtyWordIds]` до отправки и после успеха удалять только их:
`for (const id of uploadedIds) state.dirtyWordIds.delete(id);` + сохранять актуальный набор. Идеально — версионировать батч (`syncGeneration++`) и не трогать ID с более новой версией.

---

### DAT-02 · P0 · `handleInitError` стирает весь localStorage по `SyntaxError`

**Файл:** `src/app.ts:1596-1610`

```ts
1596: const handleInitError = (e: Error) => {
...
1604:   // Автоматическое восстановление при повреждении JSON в localStorage
1605:   if (e instanceof SyntaxError && (e.message.includes("JSON") || e.message.includes("token"))) {
1606:     console.warn("⚠️ Обнаружен поврежденный кэш. Очистка localStorage и перезагрузка...");
1607:     localStorage.clear();
1608:     setTimeout(() => location.reload(), 500);
1609:     return;
1610:   }
```

**Механизм:**
1. Любая `SyntaxError` из цепочки `init()` (парсинг `safety_backup`, `JSON.parse` в будущем коде, `JSON.parse` ответа, dynamic-import-ошибки нет — именно SyntaxError), чьё сообщение содержит «JSON» или «token», считается «повреждённым кэшем».
2. `localStorage.clear()` удаляет **все** ключи origin'а: `user_stats_v5`, `word_history_v5`, `sessions_v5`, `achievements_v5`, `dirty_ids_v1`, `sync_outbox_v1`, `safety_backup_v1`, `last_vocab_sync_v1`, `vocabulary_cache_v1`, настройки — без подтверждения, без экспорта.
3. `safety_backup_v1` (единственный бэкап, см. DAT-19) стирается тем же вызовом, а `restoreLocalBackup()` вообще не вызывается ниоткуда — восстановление невозможно. IndexedDB при этом не чистится, но основной прогресс лежит в localStorage.
4. Сообщение `"token"` встречается в массе мест (например, ошибки `supabase-js`, парсеры), так что ложные срабатывания реальны.

**Влияние:** полная и необратимая потеря локального прогресса (в т.ч. ещё не синхронизированного) из-за одной ошибки инициализации; после перезагрузки данные уже не вернуть. Это самый разрушительный путь в коде.

**Фикс:** восстановление должно быть точечным: определить битый ключ (по имени из сообщения/стека), удалить только его, предварительно скопировав в `safety_backup_v1` и показав пользователю диалог «повреждён X, восстановить/сбросить». `localStorage.clear()` в обработчике ошибок нужно запретить вовсе.

---

### DAT-03 · P0 · Квота localStorage: молчаливые отказы записи + мёртвый обработчик

**Файл:** `src/core/db.ts:71-86, 744-754, 875-890, 896-912`

```ts
71: export function immediateSaveState(): void {
72:   try {
74:     if (!validateUserStats(state.userStats)) { ... return; }
78:     saveAllState();
79:   } catch (e: unknown) {
82:     if (error?.name === "QuotaExceededError" || error?.name === "NS_ERROR_DOM_QUOTA_REACHED") {
83:       showToast("⚠️ Память переполнена! Данные могут не сохраниться.");
84:     }
85:   }
86: }
...
744: export function saveUserStats(): void {
745:   try {
...
750:     localStorage.setItem(LS_KEYS.USER_STATS, JSON.stringify(state.userStats));
751:   } catch (e) {
752:     console.error("Save userStats error:", e);
753:   }
754: }
...
881:      try {
882:        localStorage.setItem(LS_KEYS.VOCAB_CACHE, JSON.stringify(state.dataStore));
883:      } catch {
884:        // QuotaExceededError: IndexedDB уже содержит данные
885:      }
```

**Механизм:**
1. `saveAllState()` вызывает 15 `save*`-функций, и **каждая** глушит исключение локально (`console.error`, `console.warn`), поэтому внешний `try/catch` в `immediateSaveState` и его тост недостижимы: квота никогда не доходит до UI.
2. Последним в `saveAllState` идёт `saveVocabCache()` (`:911`), который каждый раз пишет **весь словарь** в localStorage (`:882`) и в IDB. При словаре 5–10k слов это мегабайты; запись падает по квоте (или занимает остаток квоты), но это скрыто.
3. Как только квота исчерпана (словарь + история слов + сессии), дальнейшие `setItem` для `word_history_v5`/`sessions_v5`/`user_stats_v5` начинают падать — без единого сообщения пользователю. После reload теряется всё, что не попало в запись.
4. `navigator.storage.estimate()`/`persist()` нигде не вызываются, деградации под квоту нет.

**Влияние:** при больших словарях (целевой сценарий «5–10k слов» из задания) квота 5 МБ достигается быстро; UI продолжает работать «как будто сохраняет», а данные теряются при перезагрузке/закрытии. Это прямая P0-потеря.

**Фикс:** (а) не хранить полный словарь в localStorage — только IDB (плюс маленькую мета-версию); (б) централизовать запись через `safeSetItem(key, value)` с обработкой `QuotaExceededError` и тостом; (в) перед сохранением словаря удалять его localStorage-копию; (г) опционально `navigator.storage.persist()`.

---

### DAT-04 · P1 · «Durable outbox» не durable: `globalUpdates` не переигрываются, ретраев нет

**Файл:** `src/core/sync.ts:56-73, 173-189`

```ts
56: export async function syncGlobalStats() {
57:   if (state.isSyncing) return;
58:   if (!navigator.onLine) { setSyncState("offline"); return; }
...
70:   const pending = readOutbox();
71:   if (pending) {
72:     for (const id of pending.dirtyWordIds) state.dirtyWordIds.add(id);
73:   }
...
185:    writeOutbox({
186:      globalUpdates: pendingGlobalUpdates ?? pending?.globalUpdates ?? {},
187:      dirtyWordIds: [...state.dirtyWordIds],
188:      timestamp: Date.now(),
189:    });
```

**Механизм:**
1. `SyncOutbox` содержит `globalUpdates`, но при чтении outbox (`:70-73`) поднимаются **только** `dirtyWordIds`; `globalUpdates` не применяются и не отправляются нигде (`pendingGlobalUpdates` кладётся в новую запись и снова игнорируется). Т.е. XP/coins/sessions, не отправленные из-за ошибки, живут в outbox как мёртвый JSON.
2. Триггеры синка: дебаунс после изменения состояния (`db.ts:58-65`) и событие `online` (`network.ts:84`). Таймера/бэкоффа/повторной попытки «через N минут» нет. Если сервер вернул 5xx и пользователь после этого ничего не меняет — изменения останутся неотправленными до следующего действия или перезапуска.
3. `timestamp` в outbox нигде не читается; TTL/лимита размера/ротации нет.
4. `dirty_ids_v1` — общий ключ: любой синк пишет `"[]"` (`:174`), затирая набор другой вкладки (см. мультитаб в DAT-08/раздел сценариев).
5. Ветка `catch` пишет outbox только при выброшенном исключении; если вкладку убили во время `await`, outbox не обновится (но `dirty_ids_v1` к этому моменту уже сохранён через `saveAllState` — прогресс не потерян локально).

**Влияние:** «Durable outbox» из README (`README.md:47,185`) не соответствует коду. Потеря облачной копии глобальной статистики при сбое без последующих изменений; бесконечное «зависание» несинхронизированного состояния в фоновых сценариях.

**Фикс:** реализовать настоящий журнал: массив записей `{op, payload, createdAt, attempts, nextRetryAt}`; replay на `init`/`online`/`visibilitychange`; экспоненциальный backoff; удалять запись только после подтверждения; для статистики хранить полный `payload` (или дельты XP), а не только dirty-ids.

---

### DAT-05 · P1 · Инкрементальный синк словаря мёртв: две несовместимые версии кэша

**Файл:** `src/core/db.ts:11, 291-292, 372, 867-873`

```ts
11: const VOCABULARY_CACHE_VERSION = "v1.1"; // Increment this when DB schema changes
...
291:    const cachedVersion = localStorage.getItem(LS_KEYS.VOCAB_VERSION);
292:    const isCacheValid = cachedVersion === VOCABULARY_CACHE_VERSION;
...
372:    if (isCacheValid && lastSync && hasLocalData) {
...
867: export function saveVocabVersion(): void {
869:     localStorage.setItem(LS_KEYS.VOCAB_VERSION, String(CURRENT_DB_VERSION)); // CURRENT_DB_VERSION = 10
```

**Механизм:**
1. При сохранении состояния `saveAllState()` вызывает `saveVocabVersion()` (`db.ts:910`), которая пишет в `vocabulary_version` строку `"10"` (`CURRENT_DB_VERSION` из `state.ts:140`).
2. `saveVocabCache()` (`:880`) пишет `"v1.1"` только в **IndexedDB**-копию версии.
3. `fetchVocabulary` сравнивает localStorage-значение с `"v1.1"` → `isCacheValid` всегда `false` (после первого же сохранения).
4. Следствие: ветка `if (isCacheValid && lastSync && hasLocalData)` никогда не выполняется, каждый запуск идёт full-sync (`:380-384`): `select` всех колонок пагинированными страницами до 200 000 строк, с сортировкой и заменой `dataStore`.
5. `LAST_VOCAB_SYNC` (`:387`) записывается, но не используется по назначению. Комментарий `// Increment this when DB schema changes` относится к `"v1.1"`, хотя схема версионируется десяткой — рассинхрон схем.

**Влияние:** «офлайн-first с фоновой синхронизацией» превращается в «полная загрузка словаря при каждом старте»: на мобильной сети с 5–10k слов это тысячи строк/несколько МБ на запуск, задержка инициализации и батарея; при плохой сети (не slow-2g, чтобы сработал `isConnectionSlow`) — заметные задержки. Дополнительно full-sync каждый раз запускает `finalizeDataStore` + `cleanupInvalidStateIds` (DAT-13) + тяжёлое сохранение (DAT-17).

**Фикс:** один источник версии (например, `CURRENT_DB_VERSION`), писать его и в localStorage, и в IDB; сравнивать оба; для `lastSync` использовать серверный `max(updated_at)`; добавить тест, что вторая загрузка идёт инкрементально.

---

### DAT-06 · P1 · Серверные флаги перетираются локальными при merge по attempts

**Файл:** `src/core/db.ts:600-611`

```ts
600:        // Если локально больше попыток (занятия были офлайн), облачная
601:        // запись устарела — оставляем локальную и отправляем её обратно.
602:        const localAttempts = state.wordHistory[id]?.attempts || 0;
603:        const remoteAttempts = Number(row.attempts) || 0;
604:        if (localAttempts > remoteAttempts) {
605:          state.dirtyWordIds.add(id);
606:          continue;
607:        }
...
609:        if (row.is_learned) state.learned.add(id);
610:        if (row.is_mistake) state.mistakes.add(id);
611:        if (row.is_favorite) state.favorites.add(id);
```

**Механизм:**
1. «Свежесть» записи определяется только по `attempts`; `is_learned/is_favorite/is_mistake` при `localAttempts > remoteAttempts` не применяются.
2. Затем синк отправляет полный ряд (`sync.ts:143-158`): `is_learned: state.learned.has(id)` и т.д. Если локально слово не помечено, а на сервере было `is_learned=true` (другое устройство/сессия), сервер получит `false` — флаг стёрт.
3. Аналогично стирается `learned_date`, если локальная история его не содержит.
4. Тот же дефект в обратную сторону: `attempts` сравниваются как числа без учёта того, что локальная запись может быть старее по времени, но «толще» (например, импорт).

**Влияние:** изученные слова/избранное теряются между устройствами; при регулярных занятиях в двух устройствах флаги «мигают». Пользователь видит, что прогресс «слетел».

**Фикс:** мержить поля по отдельности: `is_learned = local || remote`, `is_favorite = local || remote` (или по per-field timestamp), а `attempts/correct` — `max`; отправлять только изменившиеся поля либо использовать RPC с merge на сервере.

---

### DAT-07 · P1 · Нет удалений/томбстоунов: снятые флаги «воскресают»

**Файл:** `src/core/db.ts:609-611`; `src/core/sync.ts:143-158`

```ts
609:        if (row.is_learned) state.learned.add(id);
610:        if (row.is_mistake) state.mistakes.add(id);
611:        if (row.is_favorite) state.favorites.add(id);
```

```ts
143:        updates.push({
...
146:          is_learned: state.learned.has(id),
147:          is_mistake: state.mistakes.has(id),
148:          is_favorite: state.favorites.has(id),
```

**Механизм:**
1. При загрузке из облака флаги только добавляются в локальные `Set` (add-only merge) — серверный `false` не удаляет локальный `true`.
2. Локальные снятия флагов (`markMistake` удаляет из learned — `ui_card.ts:653`; `toggleFavorite` — `:662-663`) помечают слово dirty и синкаются как `false`.
3. Устройство/вкладка со старым состоянием при следующем синке отправит `true` (ведь в его `Set` слово всё ещё есть) → «воскрешение» поверх более новой записи. Сравнения `updated_at` при upsert нет вообще (`sync.ts:157` пишет клиентское `new Date()`).
4. Для `attempts` симметрично: устаревшее устройство может понизить серверные значения (нет `max` на сервере).

**Влияние:** отмена «изучено», удаление из избранного, «работа над ошибками» не распространяются надёжно; в паре с DAT-06 прогресс постоянно откатывается. Это классический LWW-без-версий дефект.

**Фикс:** хранить на сервере `learned_at/favorite_at/mistake_at` (или отдельные tombstones), при upsert использовать `GREATEST`/условное обновление; на клиенте мержить по времени, а не по булеву.

---

### DAT-08 · P1 · Глобальная статистика: полный upsert с LWW по клиентским часам

**Файл:** `src/core/sync.ts:113-134`

```ts
113:    const globalUpdates: Record<string, unknown> = {
114:      user_id: user.id,
115:      xp: state.userStats.xp,
116:      level: state.userStats.level,
117:      weekly_xp: state.userStats.weeklyXp,
118:      league: state.userStats.league,
119:      sprint_record: state.userStats.sprintRecord,
120:      survival_record: state.userStats.survivalRecord,
121:      coins: state.userStats.coins,
122:      streak_freeze: state.userStats.streakFreeze,
123:      achievements: state.achievements,
124:      sessions: state.sessions,
125:      settings: settings,
126:      updated_at: new Date().toISOString(),
...
132:    const { error: globalError } = await client
133:      .from(DB_TABLES.USER_GLOBAL_STATS)
134:      .upsert(globalUpdates, { onConflict: "user_id" });
```

**Механизм:**
1. Каждый синк отправляет **полный снимок** строки: XP, монеты, weekly XP, лигу, массивы `achievements`/`sessions`, settings. Условий/сравнения `updated_at` нет — Postgres просто перезаписывает.
2. Две вкладки: вкладка A набрала 100 XP, вкладка B (со старым состоянием) делает любое действие → её снимок с 80 XP затирает 100. Аналогично устаревшее устройство после отпуска.
3. `updated_at` — клиентское время: устройство с ушедшими вперёд часами «выигрывает» всегда, с отстающими — никогда; после отката часов побеждает любой другой снимок.
4. `sessions`/`achievements` — аддитивные массивы: снимок с меньшим числом элементов удаляет записи, которых в нём нет (потеря истории сессий/ачивок до следующего `loadFromSupabase`, который умеет union-merge — `db.ts:494-584`).
5. `loadFromSupabase` частично компенсирует (`Math.max` для ряда полей, union для массивов), но только при загрузке; а `xp` хранится как «остаток до следующего уровня» — `Math.max` остатков некорректен (см. DAT-09).

**Влияние:** потеря XP/монет/лиг/сессий/ачивок между устройствами и вкладками; лидерборд (доверяющий клиенту — дубль SEC-11) искажается. «Аддитивные данные при LWW» из ТЗ — ровно этот случай.

**Фикс:** серверные RPC: `increment_xp(delta)`/`increment_coins`, `greatest` для рекордов, апсерт `sessions`/`achievements` отдельными таблицами (append-only), `updated_at = now()` на сервере, условный конфликт-резолв (`WHERE excluded.updated_at > table.updated_at`).

---

### DAT-09 · P1 · Офлайн-XP отбрасывается при «умном слиянии» уровней

**Файл:** `src/core/db.ts:442-449`

```ts
442:      if ((globalData.level || 0) > state.userStats.level) {
443:        // Если в облаке уровень выше, полностью доверяем облаку
444:        state.userStats.level = globalData.level;
445:        state.userStats.xp = globalData.xp ?? 0;
446:      } else if ((globalData.level || 0) === state.userStats.level) {
447:        // Если уровни одинаковые, берем больший XP
448:        state.userStats.xp = Math.max(state.userStats.xp, globalData.xp ?? 0);
449:      }
```

**Механизм:**
1. `xp` в приложении — остаток опыта внутри текущего уровня (`addXP` вычитает `getXPForNextLevel(level)` в цикле — `stats.ts:108-118`). Это не аддитивная величина.
2. Сценарий: телефон офлайн, уровень 3, остаток 400 XP; планшет за это время дошёл до уровня 4. При входе на телефоне облачный уровень > локального → `xp = cloud.xp`, локальные 400 XP исчезают (они не конвертируются в прогресс).
3. Вариант «уровни равны»: `max` для «остатков» тоже некорректен — 400+300 в одном уровне должно давать 700 (возможен level-up), а не 400.
4. Чистка прогресса также возможна: `validateUserStats` после такого merge может отклонить значения, если cloud.xp оказался отрицательным (см. DAT-29).

**Влияние:** потеря офлайн-опыта при входе с другого устройства — типичный сценарий «занимался в метро без сети».

**Фикс:** мержить по суммарному опыту: `total = getTotalXP(localLevel, localXp)`, `total = max(total, getTotalXP(cloudLevel, cloudXp))`, затем пересчитать `(level, xp)` обратным циклом; либо хранить суммарный XP на сервере.

---

### DAT-10 · P1 · `user_progress` загружается без пагинации (тихий лимит 1000 строк)

**Файл:** `src/core/db.ts:587-598`

```ts
587:    const { data: wordData } = await client
588:      .from(DB_TABLES.USER_PROGRESS)
589:      .select("*")
590:      .eq("user_id", user.id);
...
594:    if (wordData) {
595:      for (let i = 0; i < wordData.length; i++) {
596:        const row = wordData[i];
597:        const id = row.word_id;
598:        if (!validIds.has(String(id))) continue;
```

**Механизм:**
1. PostgREST по умолчанию ограничивает ответ (`max-rows`, обычно 1000). Здесь нет `.range()`, `.order()` — сервер отдаст **произвольные** до 1000 строк.
2. Ошибки нет: `{ data }` содержит усечённый набор, код молча применяет его. Словарь из 5–10k слов с прогрессом легко даёт >1000 строк.
3. При переустановке/очистке кэша/новом устройстве прогресс для остальных слов не восстановится; `cleanupInvalidStateIds` (DAT-13) при этом может дополнительно почистить локальные остатки.
4. Заодно `select("*")` тянет все колонки — лишний трафик.

**Влияние:** пользователь с большим прогрессом теряет часть истории на новом устройстве; расхождение устройств.

**Фикс:** пагинация `range(page*1000, ...)` c `.order("word_id")`, выбор только нужных колонок, цикл до пустой страницы; лог/тост при достижении лимита.

---

### DAT-11 · P1 · Выход из аккаунта/истечение токена не сбрасывают состояние — следующий аккаунт наследует прогресс

**Файл:** `src/app.ts:1399-1421`

```ts
1399:  AuthService.onAuthStateChange(async (event: string, session: Session | null) => {
1400:    if (event === "INITIAL_SESSION") return;
...
1403:      if (session?.user) {
...
1405:        if (event === "SIGNED_IN") {
...
1407:          await loadFromSupabase(session.user as unknown as User);
...
1420:        updateAuthUI(null);
```

**Механизм:**
1. На `SIGNED_OUT` выполняется только `updateAuthUI(null)` — `state.learned/mistakes/favorites/wordHistory/userStats/sessions` остаются в памяти, `word_history_v5` и остальное — в localStorage.
2. Истечение токена (`auth.ts:18-42`) вызывает `client.auth.signOut()` → то же самое, без очистки.
3. Следующий пользователь на этом устройстве логинится → `loadFromSupabase` мержит его облако в чужое локальное состояние (union флагов, `Math.max` и т.д.), а `syncGlobalStats` затем отправляет это объединение в **его** аккаунт: прогресс предыдущего пользователя записывается новому.
4. Частично это компенсируется `handleLogout` (`auth.ts:670-702`) — но только для явного «Выйти»; session-expired, удаление аккаунта и краш без выхода этот путь не проходят. `handleLogout` и сам не чистит IndexedDB/SW-кэши (дубль SEC-15).

**Влияние:** приватность (следующий пользователь видит прогресс и приватные слова предыдущего) + порча данных второго аккаунта. Для «общего планшета в классе» — реальный инцидент.

**Фикс:** на `SIGNED_OUT` — очистка пользовательских ключей/сетов (с сохранением словаря), `caches.delete`, очистка IDB; либо namespace всех ключей по `user.id` + гидратация только своего namespace.

---

### DAT-12 · P1 · Импорт JSON может заблокировать сохранение всей статистики

**Файл:** `src/ui/ui_data.ts:236-251, 296-304`; `src/core/db.ts:42-47, 74-77`

```ts
236:        state.userStats.xp = Number(data.stats.xp) || 0;
237:        state.userStats.level = Math.max(1, Number(data.stats.level) || 1);
238:        state.userStats.sprintRecord = data.stats.sprintRecord || 0;
239:        state.userStats.survivalRecord = data.stats.survivalRecord || 0;
240:        state.userStats.coins = data.stats.coins || 0;
...
253:      if (Array.isArray(data.learned)) state.learned = new Set(data.learned as (string | number)[]);
...
258:      if (data.wordHistory)
259:        state.wordHistory = data.wordHistory as Record<string | number, WordHistoryItem>;
```

```ts
43:  const isValid = numericFields.every((field) => {
44:    const value = s[field];
45:    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
```

**Механизм:**
1. Часть полей приводится (`Number(...) || 0`), часть — нет: `data.stats.sprintRecord || 0` вернёт строку `"500"`/объект как есть; `wordHistory` принимается целиком без проверки.
2. `validateUserStats` требует `typeof === "number"` и `>= 0`. Если после импорта хотя бы одно поле не число (или отрицательное), `saveUserStats` навсегда (до перезаписи) уходит в early-return с `console.warn` (`db.ts:746-749`); `immediateSaveState` вовсе прерывает весь `saveAllState` (`:74-77`).
3. Пользователь видит «✅ Данные импортированы!», продолжает заниматься — XP/coins/level/streakFreeze не сохраняются, при reload теряются.
4. Плохой `wordHistory` даёт `undefined` в `correct` → `calculateOverallAccuracy` возвращает `NaN` (см. DAT-28), ломает UI.
5. Формат экспорта/импорта не содержит `schemaVersion` — совместимость вперёд не гарантируется.

**Влияние:** потеря статистики после импорта «своего» бэкапа (типовой сценарий миграции на новое устройство), причём молчаливая.

**Фикс:** валидировать весь объект по схеме (числа — только конечные, массивы — типизированные), нормализовать (`Number.isFinite ? value : 0`), отклонять файл при ошибках с понятным сообщением, добавить `schemaVersion`.

---

### DAT-13 · P1 · `cleanupInvalidStateIds` удаляет прогресс для слов, отсутствующих в текущем словаре

**Файл:** `src/core/db.ts:91-115` (+ вызовы `:231`, `:670`)

```ts
91: function cleanupInvalidStateIds() {
92:   if (!state.dataStore || state.dataStore.length === 0) return;
93:
94:   const validIds = new Set(state.dataStore.map((w) => String(w.id)));
...
106:   state.learned = cleanSet(state.learned);
107:   state.mistakes = cleanSet(state.mistakes);
108:   state.favorites = cleanSet(state.favorites);
...
110:   for (const key in state.wordHistory) {
111:     if (!validIds.has(String(key))) {
112:       delete state.wordHistory[key];
113:     }
114:   }
```

**Механизм:**
1. Вызывается после каждого `finalizeDataStore` (`:231`) — т.е. после каждого full/partial синка, — и в конце `loadFromSupabase` (`:670`).
2. `validIds` строится из локального `dataStore`, а он может быть **уже́** серверного набора: soft-deleted слова (`ui_bulk.ts:186`, `ui_edit_word.ts:247`), слова, скрытые RLS при анонимной/просроченной сессии, приватные слова не того аккаунта, «урезанный» ответ сервера.
3. Для всех таких ID прогресс (learned/mistakes/favorites/wordHistory) удаляется, и это **немедленно** сохраняется (`finalizeDataStore` → `immediateSaveState`, `:232`).
4. Для авторизованного пользователя облако хранит копию и можно восстановить при следующем `loadFromSupabase`, но только если слово вернётся в словарь (для soft-deleted/restored — не сразу; для гостя облака нет вовсе). Флаги при этом не помечаются dirty — на сервер ничего не уходит.
5. Пара `cleanup_user_progress` RPC (см. DAT-14), которая, судя по названию, должна делать это на сервере, отсутствует в репозитории.

**Влияние:** тихая деградация прогресса, особенно заметная после «чисток словаря» админом или при RLS-ограничении; у гостя — безвозвратно.

**Фикс:** не удалять сразу: перенести осиротевшие ID в отдельный «архив» с `lastSeen` и чистить только по подтверждённому серверному tombstone (или после N дней); никогда не сохранять результат очистки, если словарь получен частичным ответом (проверять, что full-sync дошёл до последней страницы).

---

### DAT-14 · P1 · Schema drift: схемы БД нет в репозитории, а код требует колонки, констрейнты и RPC

**Файл:** `src/core/sync.ts:113-136`; `supabase/migrations/0001_initial_rls.sql:1-7`

```sql
1: -- =============================================================================
2: -- 0001_initial_rls.sql
3: -- Включение RLS и базовые политики для таблиц и storage-бакетов TOPIK APP.
4: -- Файл только создаёт политики; он НЕ применяется автоматически к БД.
```

```ts
132:    const { error: globalError } = await client
133:      .from(DB_TABLES.USER_GLOBAL_STATS)
134:      .upsert(globalUpdates, { onConflict: "user_id" });
...
165:          const { error: progressError } = await client
166:            .from(DB_TABLES.USER_PROGRESS)
167:            .upsert(chunk, { onConflict: "user_id,word_id" });
```

**Механизм / что именно сверялось:**
1. В `supabase/migrations/` один файл — только RLS-политики (`0001_initial_rls.sql`); `CREATE TABLE`/`ALTER TABLE`/уникальных индексов в репозитории нет. README (`:125, 221-223`) утверждает, что RLS применён и «схема сверена» с БД, но сверять нечего.
2. Код пишет в `user_global_stats`: `user_id, xp, level, weekly_xp, league, sprint_record, survival_record, coins, streak_freeze, achievements, sessions, settings, updated_at, avatar_url, full_name` и требует UNIQUE(`user_id`) для `onConflict: "user_id"`.
3. Код пишет в `user_progress`: `user_id, word_id, is_learned, is_mistake, is_favorite, attempts, correct, last_review, sm2_interval, sm2_repetitions, sm2_ef, sm2_next_review, learned_date, updated_at` и требует UNIQUE(`user_id, word_id`).
4. Код читает в `loadFromSupabase`: `globalData.level/xp/sprint_record/survival_record/coins/streak_freeze/weekly_xp/league/settings/achievements/sessions` (`db.ts:440-585`) и `user_favorite_quotes.quote_id`, `quotes.*`.
5. Вызывается RPC `cleanup_user_progress` (`db.ts:428`), которого нет ни в одной миграции (дубль SEC-21).
6. Если хотя бы одной колонки/констрейнта нет, PostgREST вернёт 400 (`PGRST204`/`42P10`) на первый же upsert глобальной статистики — и весь синк падает (см. DAT-16/DAT-04); при этом `select("*")` «лишние» колонки не заметит, т.е. загрузка может работать, а запись — никогда.

**Влияние:** это главный «непроверяемый» риск: в проде синхронизация может не работать вовсе (или работать с другой схемой, чем в коде), что объясняет, почему P0/P1-дефекты могли не проявляться на тестовом проекте. Проверяется только SQL-интроспекцией (`pg_columns`, `pg_constraints`, `pg_proc`).

**Фикс:** закоммитить полные DDL-миграции всех таблиц (или `supabase db pull` → в репо), включая UNIQUE-констрейнты и RPC; добавить CI-шаг сравнения схемы; подключить `supabase gen types` для типизации клиента.

---

### DAT-15 · P1 · IndexedDB: утечка соединений и потеря записи при закрытии вкладки

**Файл:** `src/core/storage_idb.ts:10-61`

```ts
10: function openDb(): Promise<IDBDatabase> {
...
16:   const request = window.indexedDB.open(DB_NAME, DB_VERSION);
...
25:   request.onsuccess = () => resolve(request.result);
26:   request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
...
30: export async function getIdbItem<T>(key: string): Promise<T | null> {
32:   const db = await openDb();
34:     const tx = db.transaction(STORE_NAME, "readonly");
...
38:     req.onsuccess = () => resolve(req.result !== undefined ? (req.result as T) : null);
```

**Механизм:**
1. `openDb()` создаёт **новое соединение на каждый вызов** и нигде не вызывает `db.close()`. `saveVocabCache` дергает `setIdbItem` дважды на каждый `saveAllState`, а `saveAllState` — на каждый дебаунс (300 мс после каждого ответа). Соединения накапливаются до GC/лимита браузера; на длинной сессии могут появляться `InvalidStateError`/зависания.
2. Промис `setIdbItem` резолвится в `req.onsuccess`, не дожидаясь `tx.oncomplete`: по спецификации IDB запрос завершается раньше коммита транзакции. Закрытие/краш вкладки в этот момент → данные кэша не записаны, а `void setIdbItem(...)` (`db.ts:879-880`) не даёт об этом узнать.
3. `onupgradeneeded` только создаёт store; нет `onblocked` и `onversionchange`. Когда (в будущем) `DB_VERSION` поднимут, апгрейд заблокируется всеми открытыми вкладками с утёкшими соединениями — вкладка зависнет на `open` без `onblocked`-обработки.
4. В приватном режиме/при отключённом IDB `openDb` reject'ится → `null`/console.warn; приложение продолжает считать, что офлайн-кэш есть (тост PWA при этом уже показан) — молчаливая деградация.

**Влияние:** кэш словаря может не сохраниться → офлайн-старт невозможен без предупреждения; утечки и будущая невозможность миграции БД.

**Фикс:** singleton `let dbPromise = openDb()` с кэшированием; `request.onblocked`; `db.onversionchange = () => db.close()`; резолвить `setIdbItem` на `tx.oncomplete`; вернуть `Promise<boolean>` и учитывать результат в UI/офлайн-статусе.

---

### DAT-16 · P1 · Один «плохой» ряд блокирует отправку прогресса навсегда

**Файл:** `src/core/sync.ts:161-171`

```ts
161:      if (updates.length > 0) {
162:        const BATCH_SIZE = 100;
163:        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
164:          const chunk = updates.slice(i, i + BATCH_SIZE);
165:          const { error: progressError } = await client
166:            .from(DB_TABLES.USER_PROGRESS)
167:            .upsert(chunk, { onConflict: "user_id,word_id" });
168:
169:          if (progressError) throw progressError;
```

**Механизм:**
1. Апсерт 100 строк — одна SQL-операция: если одна строка нарушает констрейнт/тип/FK или не проходит RLS CHECK, падает весь чанк (ошибка 4xx).
2. `throw` уводит в `catch`; `dirtyWordIds` не очищаются (это хорошо), но весь набор, включая валидные ряды, будет повторяться на каждом следующем синке — вечно, потому что плохой ID не исчезнет.
3. Нет dead-letter/карантина, нет разбора `progressError` (transient 5xx vs permanent 4xx), нет уведомления пользователю о конкретных словах. В сочетании с DAT-04 (нет backoff) это бесконечная повторяющаяся ошибка на каждый ответ.
4. Причины «плохого» ряда реальны: `word_id` слова, удалённого физически (FK), несовместимый тип после импорта (DAT-12/33), некорректный `sm2_ef`, RLS-политика `WITH CHECK`.

**Влияние:** весь прогресс пользователя перестаёт синхронизироваться из-за одного слова; локально выглядит нормально, в облаке — застой; квота/трафик/тосты засоряются.

**Фикс:** при 4xx разбирать ошибку, ретраить чанк по одному ряду, невалидные ID — в карантин с тостом («N записей не синхронизируются»), валидировать `word_id`/поля перед отправкой; для transient — backoff.

---

### DAT-17 · P2 · Полный словарь сериализуется на каждый дебаунс (main thread)

**Файл:** `src/core/db.ts:58-65, 232, 875-890`; `src/app.ts:1384`

```ts
58: export function scheduleSaveState(delay: number = 300): void {
59:   if (_saveTimer) clearTimeout(_saveTimer);
60:   _saveTimer = window.setTimeout(() => {
61:     saveAllState();
62:     _saveTimer = null;
63:     syncGlobalStats();
64:   }, delay);
65: }
...
876: export function saveVocabCache(): void {
877:   try {
878:     if (state.dataStore && state.dataStore.length > 0) {
879:       void setIdbItem(LS_KEYS.VOCAB_CACHE, state.dataStore);
880:       void setIdbItem(LS_KEYS.VOCAB_VERSION, VOCABULARY_CACHE_VERSION);
881:       try {
882:         localStorage.setItem(LS_KEYS.VOCAB_CACHE, JSON.stringify(state.dataStore));
```

**Механизм:**
1. `recordAttempt` (каждый ответ) → `scheduleSaveState` → через 300 мс `saveAllState`, в котором `saveVocabCache` делает `JSON.stringify` **всего** `dataStore` (5–10k объектов с кириллицей/корейским, `_searchStr`, `_parsed*`) — синхронно в main thread, дважды (localStorage + structured clone для IDB).
2. `finalizeDataStore` дополнительно пересортировывает массив и пересчитывает `_searchStr` для всех слов, затем вызывает `immediateSaveState` (`:232`) — т.е. на каждый sync словаря ещё один полный save.
3. `state.ts:476-500` на старте синхронно парсит `vocabulary_cache_v1` из localStorage (потенциально несколько МБ) — блокирует первую отрисовку; затем `fetchVocabulary` читает IDB и подменяет `dataStore`.
4. `app.ts:1384` отправляет весь `dataStore` в `searchWorker` через structured clone — двойная память на словарь.
5. `searchWorker` (`_searchStr`) держит свою копию ещё и после каждого `SET_DATA` в realtime (`app.ts:1140`).

**Влияние:** заметные фризы при ответах на 5–10k слов, повышенный расход батареи/памяти, риск квоты (DAT-03), медленный старт. Целевая аудитория — мобильные устройства, где это критично.

**Фикс:** словарь сохранять отдельно и редко (по изменению/`requestIdleCallback`/`pagehide`), прогресс — отдельными мелкими ключами; убрать localStorage-копию словаря; `_searchStr` вычислять в воркере.

---

### DAT-18 · P2 · Активная сессия не персистится и теряется при reload/закрытии

**Файл:** `src/core/session.ts:64-87, 112-127`; `src/core/db.ts:896-912`; `src/app.ts:1592-1594`

```ts
64: export function endSession() {
65:   if (!state.sessionActive) return;
...
76:   const sessionData = { date: new Date().toISOString(), duration: state.sessionSeconds, ... };
82:   state.sessions.push(sessionData);
...
85:   scheduleSaveState();
```

```ts
112: function resetIdleTimer() {
...
118:   if (isPaused) {
119:     resumeSession();
120:     return;   // ← таймер простоя не взводится
121:   }
123:   idleTimer = window.setTimeout(() => { ... pauseSession(); }, IDLE_TIMEOUT);
```

**Механизм:**
1. `sessionActive/sessionSeconds/sessionWordsReviewed/sessionInterval` — только в памяти; в `saveAllState` (`db.ts:896-912`) их нет; `beforeunload` (`app.ts:1592-1594`) вызывает лишь `immediateSaveState`, который эти поля не сохраняет.
2. Сессия попадает в историю только по явному `endSession` (кнопка/`toggleSessionTimer`/конец квиза). Закрытие вкладки, swipe-to-kill на мобильном, краш → сессия не записана вообще (ни время, ни количество слов).
3. Дополнительный баг idle: при активности во время паузы `resetIdleTimer` вызывает `resumeSession()` и делает `return` до `setTimeout` — таймер простоя взводится только следующим событием; автопауза может сработать позже, чем ожидается.
4. `document.addEventListener` для 4 событий (`:129-135`) вешаются при импорте модуля и никогда не снимаются (в SPA живут всегда — приемлемо, но при HMR/повторном импорте размножатся).

**Влияние:** потеря истории сессий/времени (и связанных наград/ачивок, считающихся от сессий) в каждом сценарии «закрыл телефон на середине занятия».

**Фикс:** персистить `{startedAt, pausedAt, seconds, reviewed}` в отдельный ключ с троттлингом (каждые 5 с/на `pauseSession`/`pagehide`/`visibilitychange`), при старте восстанавливать, на `pagehide` — `endSession`-safe (запись без UI).

---

### DAT-19 · P2 · Safety backup нельзя восстановить, он перезаписывается и молча пропускается

**Файл:** `src/core/backup.ts:3-61`

```ts
3: export function createLocalBackup() {
...
34:    if (size > 3 * 1024 * 1024) {
35:      console.warn("⚠️ Backup skipped: Data too large for localStorage duplication.");
36:      return;
37:    }
38:    localStorage.setItem(LS_KEYS.SAFETY_BACKUP, JSON.stringify(backup));
...
45: export function restoreLocalBackup(): boolean {
```

**Механизм:**
1. `restoreLocalBackup` объявлен, но **не вызывается ниоткуда** (проверено grep по всему `src`); в UI нет кнопки восстановления. То есть бэкап существует только как побочный файл в localStorage.
2. `createLocalBackup` вызывается перед миграцией (`state.ts:287`), перед `resetAllProgress` (`ui_data.ts:28`) и импортом (`:194`). Каждый вызов **перезаписывает** единственный слот; если миграция/сброс повторяются (а миграции повторяются при ошибке, DAT-31) — предыдущий бэкап потерян.
3. Дублирование всех данных перед записью часто само по себе упирается в квоту (3 МБ порог уже близко к лимиту 5 МБ с учётом словаря) → `Backup skipped` без предупреждения пользователю.
4. Список ключей захардкожен (`backup.ts:5-19`) и дублирует `LS_KEYS` — при добавлении ключа бэкап молча неполный; не включает `sync_outbox_v1`, `trash_retention_v1`, `purchased_items_v1`, `vocabulary_cache_v1`.
5. `restoreLocalBackup` перезаписывает ключи без валидации JSON и `location.reload()`.

**Влияние:** последняя линия защиты от потери данных (перед миграцией/сбросом) недоступна пользователю; при инциденте восстановить нечего. Дубль SEC-29 (импорт без схемы) по другому пути.

**Фикс:** подключить восстановление в UI («Восстановить последнюю копию»), хранить 2–3 слота с датой, строить список ключей из `LS_KEYS`, исключить словарь из бэкапа, не пропускать молча (показать предупреждение).

---

### DAT-20 · P2 · PWA-обновление: новая версия SW активируется, страница остаётся старой; старые чанки удаляются

**Файл:** `src/core/pwa.ts:51-59, 74-81`; `src/sw.ts:21-24, 141-145`; `vite.config.ts:21`

```ts
51:        const handleUpdate = (worker: ServiceWorker) => {
52:          if (state.autoUpdate) {
53:            worker.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
54:          } else {
55:            showUpdateNotification(worker);
56:          }
57:        };
...
74:    let refreshing = false;
75:    navigator.serviceWorker.addEventListener("controllerchange", () => {
76:      if (refreshing) return;
77:      refreshing = true;
78:      // Автоматическая перезагрузка при смене контроллера SW отключена, ...
```

```ts
21: clientsClaim();
22: cleanupOutdatedCaches();
24: precacheAndRoute(self.__WB_MANIFEST);
```

**Механизм:**
1. `state.autoUpdate` по умолчанию `true` (`state.ts:214`); при появлении нового SW он сразу получает `SKIP_WAITING` и активируется (`sw.ts:141-145`), а `clientsClaim()` делает его контроллером текущей страницы.
2. `controllerchange`-обработчик пуст — перезагрузки/уведомления нет; вкладка продолжает выполнять **старый** JS-бандл.
3. При активации нового SW precache-контроллер Workbox удаляет ревизии, которых нет в новом манифесте (а `cleanupOutdatedCaches()` — старые кэши), поэтому старые precache-entries исчезают. Если в старой странице после этого срабатывает `import("./ui/ui_shop.ts")`/`ui_share`/`ui_data`/`ui_collections` (динамические import с хешированными именами), файла нет ни в новом precache, ни на сервере после деплоя → 404, функция падает.
4. В `vite.config.ts` указан `registerType: "autoUpdate"`, но регистрация ручная (`injectRegister: false`, `pwa.ts:20-21`) — опция не влияет; фактическое поведение определяется самописным `SKIP_WAITING`.
5. Тост «Приложение готово к работе офлайн!» показывается по `!navigator.serviceWorker.controller` (`pwa.ts:32-34`) — на самом первом визите контроллера ещё нет, но precache мог ещё не завершиться.

**Влияние:** после каждого деплоя «висящая» вкладка теряет ленивые функции (магазин, шаринг, коллекции, данные), может показать битый UI до перезагрузки. Если пользователь в этот момент в квизе — перезагрузка без сохранения сессии (DAT-18) тоже плохо; нужен аккуратный выбор момента.

**Фикс:** при `controllerchange` — перезагружать страницу, если нет активного квиза/черновика, иначе показывать баннер «Доступно обновление»; `skipWaiting` только по кнопке; в старом SW не удалять precache до перезагрузки клиентов (или использовать `registerType:"autoUpdate"` со `vite-plugin-pwa`-регистрацией).

---

### DAT-21 · P2 · SW-кэш словаря: `StaleWhileRevalidate` + `maxEntries: 1` + пагинация

**Файл:** `src/sw.ts:84-100, 147-179`

```ts
84: // Кэширование данных словаря (API Supabase)
86: registerRoute(
87:   ({ url }) => url.hostname.includes("supabase.co") && url.pathname.includes("/vocabulary"),
88:   new StaleWhileRevalidate({
89:     cacheName: "api-vocabulary-cache",
...
94:       new ExpirationPlugin({
95:         maxEntries: 1, // Нам нужен только последний актуальный слепок базы
```

```ts
165:    const vocabUrl = `${SUPABASE_URL}/rest/v1/vocabulary?select=*`;
...
171:    // Делаем запрос. Существующий обработчик `registerRoute` для словаря
172:    // перехватит его и обновит кэш 'api-vocabulary-cache' благодаря стратегии StaleWhileRevalidate.
173:    await fetch(vocabUrl, { headers });
```

**Механизм / доказательство:**
1. `fetchVocabulary` ходит страницами: URL различаются `offset`/`limit`/`select` → **разные ключи кэша** для каждой страницы. `maxEntries: 1` означает, что после каждой страницы предыдущая запись вытесняется; сохраняется только последняя запрошенная страница.
2. Периодический синк (`:165-173`) **ничего не кэширует**: по спецификации Service Worker запросы, инициированные самим SW (`fetch()` внутри воркера), не проходят через его же `fetch`-обработчик, поэтому комментарий `:171-172` («обработчик перехватит его и обновит кэш») неверен — ответ `?select=*` выбрасывается. Даже если бы кэшировал, это был бы отдельный ключ, конкурирующий за единственный слот.
3. Если какой-то код (не `fetchVocabulary`, а, например, будущий offline-режим) запросит словарь офлайн, SW может отдать «чужую страницу» или устаревший кэш — молча, как валидный JSON.
4. `maxAgeSeconds: 14 дней` — устаревшие данные отдаются приоритетно (SWR сначала кэш). Комментарий «нам нужен только последний актуальный слепок» не соответствует реализации с пагинацией.
5. Сам `fetchVocabulary` офлайн не использует SW (проверяет `navigator.onLine` до запроса) — т.е. кэш для основного словаря бесполезен, но занимает квоту Cache Storage.

**Влияние:** бесполезный/вводящий в заблуждение кэш, потенциальная выдача неполного словаря; занимает место; при появлении кода, читающего словарь офлайн, — источник тихих багов.

**Фикс:** кэшировать канонический снимок словаря (без пагинации, отдельный URL для «полного» словаря) с явным версионированием; либо убрать маршрут, раз IDB уже является источником истины; периодик-синк выровнять с каноническим URL.

---

### DAT-22 · P2 · BackgroundSync на все non-GET Supabase-запросы

**Файл:** `src/sw.ts:128-139`

```ts
128: // Настройка Background Sync
129: const bgSyncPlugin = new BackgroundSyncPlugin("supabase-queue", {
130:   maxRetentionTime: 24 * 60, // Повторять попытки в течение 24 часов (в минутах)
131: });
...
134: registerRoute(
135:   ({ url, request }) => url.hostname.includes("supabase.co") && request.method !== "GET",
136:   new NetworkOnly({ plugins: [bgSyncPlugin] }),
137: );
```

**Механизм:**
1. Плагин перехватывает **любые** не-GET запросы к Supabase: `INSERT` в `word_requests`/`vocabulary`/`user_favorite_quotes`, auth-запросы (`/auth/v1/token`, signUp/signIn), update/delete. Успел ли сервер применить запрос — неизвестно; Workbox кладёт `Request` (с заголовком `Authorization`) в IndexedDB (`workbox-background-sync`) и повторяет при следующем sync.
2. Для неидемпотентных операций (insert) повтор = дубликат: `ui_custom_words.ts:266-269` вставляет заявки без idempotency-ключа; повторное выполнение создаёт вторые заявки (и Edge-функция обработает дважды).
3. Токен в сохранённом запросе — тот, что был на момент сбоя: через час он истёк, повтор получает 401; Workbox продолжает ретраить до `maxRetentionTime` (24 ч), после чего **молча** выбрасывает запрос. Пользователь не узнает, что запись не ушла.
4. Очередь не чистится при logout (дубль SEC-14) → после смены аккаунта может выполниться от имени... формально со старым (уже невалидным) токеном, но при достаточном TTL — потенциально от имени нового пользователя, если токен ещё жив и это его же браузер.
5. Это дублирует прикладной outbox (`sync.ts`) — записи могут быть отправлены дважды разными механизмами.

**Влияние:** дубликаты пользовательских данных, скрытая потеря записей через 24 ч, утечка старых токенов на диск, конфликт двух механизмов ретраев.

**Фикс:** ограничить BackgroundSync явным allowlist идемпотентных upsert-эндпоинтов; для insert — генерировать `Idempotency-Key` на клиенте и проверять на сервере; уведомлять UI о финальном провале; чистить очередь в `handleLogout`.

---

### DAT-23 · P2 · `workbox.runtimeCaching` в `injectManifest` не работает — README врёт про кэш Supabase API

**Файл:** `vite.config.ts:51-83`

```ts
51:        workbox: {
52:          runtimeCaching: [
...
67:            // Кэширование Supabase API для офлайн-доступа
68:            {
69:              urlPattern: /^https:\/\/[^.]+\.supabase\.co\/rest\/v1\/.*/i,
70:              handler: "StaleWhileRevalidate",
71:              options: {
72:                cacheName: "supabase-api-cache",
```

**Механизм / доказательство:**
1. Стратегия `strategies: "injectManifest"` (`:18`), SW — свой `src/sw.ts`; в этом режиме `workbox.runtimeCaching`/`globPatterns` не применяются (плагин только инжектит `self.__WB_MANIFEST` и собирает SW).
2. Свежая сборка Lead (`audit/build-out/sw.js`, `audit/logs/vite-build.txt: mode injectManifest, precache 23 entries`) не содержит ни `supabase-api-cache`, ни `html2canvas` (проверено подсчётом вхождений: 0), хотя маршруты `api-vocabulary-cache`/`api-collections-cache`/`api-quotes-cache` из `sw.ts` присутствуют.
3. `README.md:184` заявляет «Supabase API кэшируется через `StaleWhileRevalidate` (24 часа)» — это неверно: кэшируются только 4 конкретных табличных маршрута из `sw.ts`, и с другими TTL/лимитами.
4. Следствие: generic GET'ы (articles, user_global_stats/leaderboard, shop, feedback, list_items вне маршрута) офлайн не отдаются; html2canvas-плагин при динамической загрузке с CDN не кэшируется при плохом соединении.

**Влияние:** неверные ожидания от офлайна (и документации); часть экранов не работает без сети, хотя по конфигу «должна».

**Фикс:** удалить мёртвую секцию, перенести нужные маршруты в `src/sw.ts` (или перейти на `generateSW`); синхронизировать README с реальностью.

---

### DAT-24 · P2 · Сброс прогресса: ошибки облачных удалений игнорируются, а re-auth запускает параллельную загрузку

**Файл:** `src/ui/ui_data.ts:26-96, 105-134`

```ts
73:    const { data } = await client.auth.getSession();
74:    if (data && data.session) {
75:      showToast("☁️ Очистка облака...");
76:      await client.from("user_progress").delete().eq("user_id", data.session.user.id);
78:      await client.from("user_global_stats").delete().eq("user_id", data.session.user.id);
79:    }
```

**Механизм:**
1. `supabase-js` возвращает `{ error }` в ответе, а не бросает исключение; здесь результат не проверяется. Офлайн/401/RLS → удаление не произошло, но пользователь видит «✅ Прогресс полностью сброшен» (локально-то он очищен), и `scheduleSaveState` может отправить нулевую статистику.
2. При следующем входе `loadFromSupabase` вернёт старые `user_progress` строки (`attempts > 0`) и global stats — прогресс «воскресает». Пользователь считает, что данные удалены (это ещё и приватность: «удалить данные» не удаляет).
3. `clearData` (`:105-134`) для email-аккаунтов сначала вызывает `client.auth.signInWithPassword(email, password)` для проверки пароля. Успешный вход порождает событие `SIGNED_IN`, обработчик в `app.ts:1405-1413` тут же запускает `loadFromSupabase` (async, не ждёт) — параллельно с `resetAllProgress`, который в этот момент уже очистил state. Гонка: возможно восстановление прогресса сразу после очистки и/или повторная отправка.
4. Локальный `createLocalBackup()` перед сбросом не помогает, т.к. восстановление недоступно (DAT-19).

**Влияние:** «сброс» не гарантирован ни офлайн, ни онлайн; риск загрузки старых данных обратно; не удаляется то, что пользователь просил удалить.

**Фикс:** проверять `error` у каждого delete и при ошибке прерывать с понятным сообщением; выполнять сброс через серверную RPC/Edge Function (атомарно); на время re-auth подавлять `SIGNED_IN`/`loadFromSupabase` (флаг `suppressAuthLoad`).

---

### DAT-25 · P2 · Индикаторы синхронизации — мёртвый код (элементов нет в разметке)

**Файл:** `src/core/sync.ts:9-20`; `src/core/ui_sync.ts:7-8`

```ts
9: export const setSyncState = (status: "syncing" | "success" | "error" | "offline") => {
10:   const el = document.getElementById("sync-status");
11:   if (!el) return;
12:   el.className = `sync-status ${status}`;
13:   const icons: Record<string, string> = {
14:     syncing: "⏳",
15:     success: "✅",
16:     error: "❌",
17:     offline: "📡",
18:   };
```

```ts
7: export function setSyncState(status: "idle" | "syncing" | "success" | "error" | "offline") {
8:   const syncBtn = document.getElementById("sync-btn");
9:   if (!syncBtn) return;
```

**Механизм / доказательство:**
1. Полнотекстовый поиск по `src/**/*.ts`, `src/html/**`, `index.html`: `id="sync-status"` и `id="sync-btn"` отсутствуют полностью — оба модуля всегда выходят на первой строке.
2. Результат: пользователь видит только тосты `sync.ts:195-203`, статус «синхронизируется/офлайн/ошибка» в шапке не отображается; ручной кнопки синхронизации нет вовсе.
3. Дополнительно: в `app.ts:149` импорт `setSyncState` не используется → `npm run build` падает на `tsc` (`audit/logs/tsc.txt: src/app.ts(149,1): error TS6133`; дубль F-34). Это блокирует выпуск сборки штатной командой.

**Влияние:** нулевая обратная связь о синхронизации (в offline-first приложении это критично для доверия), мёртвый код; сборка сломана.

**Фикс:** реализовать один реальный индикатор в `header.html` + связать с `syncGlobalStats`; убрать второй модуль и неиспользуемый импорт.

---

### DAT-26 · P2 · `PROCESS_DOWNLOAD_QUEUE`: сообщение SW никто не обрабатывает

**Файл:** `src/core/network.ts:100-111`; `src/core/constants.ts:89`

```ts
100:    conn.addEventListener("change", () => {
101:      if (!conn.saveData && ["3g", "4g"].includes(conn.effectiveType)) {
102:        if (navigator.serviceWorker.controller) {
103:          console.log("📶 Connection improved. Processing download queue...");
104:          navigator.serviceWorker.controller.postMessage({
105:            type: "PROCESS_DOWNLOAD_QUEUE",
106:          });
107:          showToast("📶 Интернет улучшился. Докачиваем файлы...");
```

**Механизм:**
1. `SW_MESSAGES.PROCESS_DOWNLOAD_QUEUE` отправляется контроллеру, но `src/sw.ts` обрабатывает только `SKIP_WAITING` (`:141-145`); в собранном `sw.js` (и `dist`, и свежем `audit/build-out`) есть только `SKIP_WAITING`/`content-sync` (tree-shaking убрал неиспользуемую константу — 0 вхождений).
2. Пользователю показывается тост «докачиваем файлы», хотя очереди загрузки не существует; `DOWNLOAD_QUEUE_COMPLETED` также никто не отправляет.

**Влияние:** ложное уведомление, мёртвая фича, по которой, возможно, планировалось офлайн-кэширование медиа.

**Фикс:** либо реализовать очередь в SW (сообщение + обработчик + `DOWNLOAD_QUEUE_COMPLETED`), либо удалить отправителя и тост.

---

### DAT-27 · P2 · Настройки: LWW целым блоком по клиентским часам

**Файл:** `src/core/db.ts:501-512`; `src/core/sync.ts:91-111`; `src/ui/ui_settings.ts:228-231`

```ts
501:      if (globalData.settings) {
502:        const s = globalData.settings;
503:        const cloudTime = s.settingsUpdatedAt || 0;
504:        const localTime = state.settingsUpdatedAt || 0;
...
508:        if (cloudTime >= localTime) {
509:          state.settingsUpdatedAt = cloudTime;
510:          localStorage.setItem("settings_updated_at", String(cloudTime));
```

```ts
228: function updateSettingsTimestamp() {
229:   state.settingsUpdatedAt = Date.now();
230:   localStorage.setItem("settings_updated_at", String(state.settingsUpdatedAt));
231: }
```

**Механизм:**
1. В облако уходит весь объект `settings` (18 полей) + `settingsUpdatedAt = Date.now()` **клиента** (`sync.ts:91-111`). Сервер не сравнивает версии — при upsert блок перезаписывается целиком.
2. Сценарий: устройство A (офлайн, старое состояние) меняет громкость → `settingsUpdatedAt` = «сейчас» → синк затирает в облаке новые `darkMode/themeColor`, сделанные на B. Дата-время — единственный арбитр, но сравнивается только на загрузке (`cloudTime >= localTime`), а при заливке — победитель всегда последний отправитель.
3. Откат/сдвиг часов: если `settingsUpdatedAt` у устройства отстаёт навсегда (часы сбиты), его изменения не применятся ни на нём (облако старше), ни в облаке (его снимок уйдёт, но `settingsUpdatedAt` меньше локального на других устройствах — они не примут). Настройки «застревают».
4. Дублирование данных: `lastDailyReward`, `streakLastDate`, `survivalHealth`, `lastFreezeDate` лежат и в `settings`, и отдельными колонками (`:548-571`); часть пишется в разные места — потенциальный дрейф (например, `lastDailyReward`).

**Влияние:** потеря/откат настроек между устройствами и вкладками; синк настроек перестаёт работать после сбоя часов.

**Фикс:** сравнивать на сервере (`WHERE settings_updated_at > excluded...` — не сработает при клиентском времени; лучше серверное `now()`), хранить пер-полевые timestamps или отдельные колонки; вынести `settingsUpdatedAt` в серверную часть; не дублировать поля.

---

### DAT-28 · P2 · Точность и её «кэш»: недостижимый код и NaN

**Файл:** `src/core/stats.ts:277-298`; `src/core/session.ts:80`

```ts
277: export function calculateOverallAccuracy() {
278:   if (cachedAccuracy !== null) return cachedAccuracy;
...
290:   if (totalAttempts === 0) return 0;
291:   return Math.round((totalCorrect / totalAttempts) * 100);
292:   if (totalAttempts === 0) {        // ← недостижимо
293:     cachedAccuracy = 0;
294:     return 0;
295:   }
296:   cachedAccuracy = Math.round((totalCorrect / totalAttempts) * 100);  // ← недостижимо
```

**Механизм:**
1. `return` на `:291` делает весь блок кэширования мёртвым: `cachedAccuracy` никогда не присваивается, `invalidateStatsCache()` бесполезен, каждый вызов — O(n) по `wordHistory` (список может быть 5–10k).
2. `totalCorrect += w.correct` без проверки типа: при повреждённой/импортированной истории без `correct` (DAT-12/33) получается `NaN` → UI показывает «NaN%», ломаются ачивки/условия.
3. В сессию (`session.ts:80`) пишется `calculateOverallAccuracy()` — **общая** точность за всё время, а не за сессию; история сессий искажена, ачивки «точность» считаются не по тем данным.
4. Пересекается с LL-29 (мёртвый кэш/O(n)-сканы) — здесь акцент на NaN и на семантике сессионной accuracy; не дублировать фикс.

**Влияние:** ложные проценты в статистике/сессиях, лишние O(n) на каждый рендер, NaN в UI при битой истории.

**Фикс:** убрать `return` до кэш-блока, `Number(w.correct) || 0`, считать accuracy сессии по счётчикам сессии (правильные/всего за сессию, вести их в state).

---

### DAT-29 · P2 · Отрицательный XP: валидатор блокирует сохранение статистики

**Файл:** `src/core/db.ts:42-47, 74-77, 744-754`; `src/core/stats.ts:96-100`

```ts
42:  const numericFields = ["xp", "level", "coins", "sprintRecord", "survivalRecord"];
43:  const isValid = numericFields.every((field) => {
44:    const value = s[field];
45:    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return false;
```

```ts
96:  state.userStats.xp = (state.userStats.xp || 0) + val;
97:  if (val > 0) {
98:    state.userStats.weeklyXp = (state.userStats.weeklyXp || 0) + val;
```

```ts
// ui_card.ts:656 / quiz.ts:1015
656:   addXP(-5);
1015:    addXP(-2);
```

**Механизм:**
1. Штрафы (`addXP(-5)`, `addXP(-2)`) могут сделать `xp` отрицательным: `state.userStats.xp = 0 + (-5) = -5`.
2. `validateUserStats` считает любое отрицательное значение невалидным → `saveUserStats` делает early-return (только `console.warn`), `immediateSaveState` вообще прерывает всё сохранение.
3. `syncGlobalStats` валидации не имеет — в облако уходит `xp: -5`. `loadFromSupabase` при равных уровнях берёт `Math.max` (в ноль не выйдет, но если уровень в облаке выше — примет отрицательный, `db.ts:445`), после чего сохранения заблокированы до первого положительного набора.
4. Если пользователь закроет приложение в этом состоянии — последние изменения `userStats` (XP/coins/level/streakFreeze) теряются.

**Влияние:** «залипшее» сохранение статистики, зависящее от знака XP; расхождение локально/облако; простая ошибка пользователя (ошибся в квизе) может стоить сохранения прогресса.

**Фикс:** клампить `xp = Math.max(0, xp)` (или разрешить отрицательный XP в валидаторе, но не ниже -N), добавить такую же валидацию в синк, логировать блокировку в UI.

---

### DAT-30 · P2 · Retry-обёртка: слепые ретраи неидемпотентных запросов и логирование `init`

**Файл:** `src/core/supabaseClient.ts:20-150` (особенно `:57-60, 113-117, 134-147`)

```ts
113:      if (!response.ok && response.status >= 500) {
114:        const body = await response.text();
115:        throw new Error(`Server error: ${response.status}: ${body}`);
116:      }
...
134:      if (i < retries - 1) {
135:        const delay = initialDelay * Math.pow(2, i);
136:        console.warn(`[Retry ${i + 1}/${retries}] Request failed with ...`, error, init);
...
141:        await new Promise((resolve) => setTimeout(resolve, delay));
```

**Механизм:**
1. Обёртка вокруг **всего** fetch Supabase-клиента: на 5xx и на сетевые ошибки/`AbortError` от собственного таймаута повторяет запрос, не различая методы. POST/insert, PATCH, DELETE повторяются до 4 раз.
2. Если сервер применил операцию, но ответ потерялся (таймаут 10 с), повтор создаёт второй ряд (заявки на слова, избранные цитаты, отклики) — idempotency-key нет.
3. Таймауты: 10 с × 4 попытки + backoff 1.5+3+6 с ≈ 52 с на **один** запрос; чанк прогресса — до 100 строк, а `syncGlobalStats` делает несколько запросов подряд → `state.isSyncing` держится минуты, синк-иконка (мертвая, DAT-25) и ожидания UI; блокировка повторных синков всё это время.
4. `console.warn(..., init)` печатает `init` с заголовком `Authorization: Bearer <access_token>` — дубль SEC-16 (не повторяем детали, но фиксируем пересечение).
5. 4xx не ретраятся (правильно), но 5xx с телом `Server error...` превращаются в `Error` без `code`, поэтому в `sync.ts:191-194` они не классифицируются как сетевые и показывают «❌ Ошибка синхронизации» без офлайн-семантики.

**Влияние:** дубликаты пользовательских данных, затянутые зависания синка, избыточные логи с токеном; замедление работы при нестабильной сети.

**Фикс:** ретраить только GET/HEAD или явно идемпотентные upsert; для остальных — 1 попытка + запись в outbox; не логировать `init`/headers; уважать `Retry-After`; ограничить общий бюджет времени синка.

---

### DAT-31 · P3 · Три версии схемы, отсутствие инвалидации IDB и хрупкие миграции

**Файл:** `src/core/state.ts:140, 280-437`; `src/core/db.ts:11`; `src/core/storage_idb.ts:7`

```ts
140: export const CURRENT_DB_VERSION = 10;
```
```ts
11: const VOCABULARY_CACHE_VERSION = "v1.1"; // Increment this when DB schema changes
```
```ts
7: const DB_VERSION = 1;  // IndexedDB
```

**Механизм:**
1. Три независимые «версии» для трёх хранилищ; `CURRENT_DB_VERSION` (10) отвечает за миграции localStorage, `"v1.1"` — за совместимость кэша словаря, IDB `1` — за структуру IndexedDB. Ни одна не синхронизирована; при изменении схемы `Word` (новая колонка) IDB-кэш не инвалидируется — `validateSchema` (DAT-34) проверит только первую строку.
2. `runMigrations`: `storedVersion >= CURRENT` → выход; иначе — набор блоков, где **v10** (`state.ts:420-430`) делает `JSON.parse(raw)` без локального `try` (внешний `try` на `:433` ловит всё, но тогда `DB_VERSION` не записывается вовсе → миграции повторяются при каждом запуске, а `createLocalBackup` каждый раз перезаписывает бэкап).
3. Миграция v5 ищет ключи `*_v4` → `*_v5`, хотя в `LS_KEYS` уже используются `*_v5`; на «свежей» установке (`storedVersion = 0`) все блоки выполняются вхолостую, но и это не бесплатно.
4. Нет версионирования форматов внутри ключей (`sessions_v5` и т.п. менялись без смены версии БД).

**Влияние:** риск повреждения/потери при обновлениях, невозможность откатиться, лишние бэкапы; в будущем — несовместимый кэш.

**Фикс:** единый `SCHEMA_VERSION` (и для localStorage-миграций, и для IDB-кэша), пошаговая запись прогресса миграции, `try/catch` на каждый блок, тест «после миграции данные читаются».

---

### DAT-32 · P3 · Offline shell: offline.html почти недостижим, дублируется в precache, медиа не precache'ится

**Файл:** `src/sw.ts:198-206`; `vite.config.ts:24`; `audit/logs/vite-build.txt`

```ts
198: // Offline fallback
200: const handler = createHandlerBoundToURL("/offline.html");
201: const navigationRoute = new NavigationRoute(handler, {
202:   denylist: [
203:     new RegExp("/[^/?]+\\.[^/]+$"), // Игнорируем запросы к файлам с расширениями
204:   ],
205: });
206: registerRoute(navigationRoute);
```

**Механизм / доказательство:**
1. `precacheAndRoute` покрывает `/index.html` и через `directoryIndex` — стартовый URL `/`; навигация на `/` офлайн получает **precache-копию index.html**, а не `offline.html`. Т.е. `offline.html` работает только для «глубоких» навигаций, которых у SPA с hash-роутингом нет.
2. `NavigationRoute` без `fallbackToNetwork` отдаёт `offline.html` для любой навигации, не попавшей в precache, **даже при наличии сети** — например, `/unknown` покажет «Вы офлайн» онлайн.
3. В precache-manifest'е свежей сборки `offline.html` присутствует **дважды** (`{"revision":"03fe…","url":"offline.html"}` дважды; 23 записи = 22 уникальных) — из-за `includeAssets` + `globPatterns`, Workbox дедуплицирует, но это шум/потенциальные warning'и.
4. 3 mp3-файла (9.6 МБ) лежат в `public/audio`, но в precache их нет (`audit/logs/vite-build.txt`: 23 записи, 908.72 KiB) → фоновая музыка офлайн недоступна, пока не проиграна онлайн (CacheFirst-маршрут `sw.ts:181-196` заполняется только по факту запроса).
5. Шрифт Pretendard и apple-touch-icon грузятся с CDN (`index.html:12,17-28`); CSS/jsdelivr кэшируется CacheFirst **после** первой загрузки, apple-touch-icon не кэшируется вовсе — первый офлайн-старт без шрифта (fallback ОК, но FOUT/задержка блокирующего CSS).
6. `public/_redirects` (`/* /index.html 200`) — синтаксис Netlify/Cloudflare, а `package.json` deploy — `gh-pages`; на GitHub Pages deep-links дают 404 (дубль SEC-32).

**Влияние:** реальный офлайн-старт работает (precache index + чанков достаточно), но заявленная «страница offline.html» в основном декоративна; музыка/иконки офлайн отсутствуют; онлайн-навигация по неизвестному URL может удивить «Вы офлайн».

**Фикс:** navigation route: network-first → fallback на precache `index.html` → `offline.html` только при ошибке; убрать дубль `includeAssets` для html; медиа — по требованию/в очередь; перенести шрифт локально или precache'ить.

---

### DAT-33 · P3 · Импорт/экспорт: нет версии формата и нормализации

**Файл:** `src/ui/ui_data.ts:136-185, 253-269`

```ts
253:      if (Array.isArray(data.learned)) state.learned = new Set(data.learned as (string | number)[]);
...
258:      if (data.wordHistory)
259:        state.wordHistory = data.wordHistory as Record<string | number, WordHistoryItem>;
...
265:      if (Array.isArray(data.customWords)) state.customWords = data.customWords as Word[];
```

**Механизм:**
1. В экспортируемом JSON нет `schemaVersion`/даты формата — обратная совместимость не контролируется.
2. Присвоенные `customWords` не проходят `finalizeDataStore`: у них нет `_searchStr`/`_parsedTopic`/`_parsedCategory`, поэтому `searchWorker` (`w._searchStr && ...`) их не найдёт, а рендерер останется без подготовленных полей до следующего full-sync (который, впрочем, может отфильтровать их по `word_kr`).
3. `wordHistory` принимается как есть (нет проверки, что это объект, а значения — числа), что даёт NaN (DAT-28), невозможность сохранить прогресс (DAT-12).
4. Экспорт не включает `dirtyWordIds`, `sync_outbox_v1`, активную сессию, настройки `trash_retention`/`purchased_items` есть, но `purchasedItems` импортируется без проверки.

**Влияние:** импортированные пользовательские слова не находятся поиском; будущие изменения формата сломают старые бэкапы; возможна порча статистики.

**Фикс:** добавить `schemaVersion` и миграцию формата; нормализовать импорт через `finalizeDataStore`; валидировать типы; включить `dirtyWordIds`/outbox в экспорт (для переноса на устройство).

---

### DAT-34 · P3 · Мелкие дефекты данных/PWA

**Файл:** `src/core/db.ts:18-28, 684-708, 711-736`; `src/core/pwa.ts:32-34`

```ts
18: function validateSchema(data: Word[]) {
19:   if (!data || data.length === 0) return;
20:   const sample = data[0];  // ← проверяется только первая строка
...
684: export async function fetchRandomQuote() {
...
687:     const { count, error: countError } = await client
688:       .from(DB_TABLES.QUOTES)
689:       .select("*", { count: "exact", head: true });
...
700:       .range(randomIndex, randomIndex)
701:       .single();
```

**Механизм:**
1. `validateSchema` проверяет 5 полей только у первого элемента — массив, где остальные 9 999 строк без `translation`, пройдёт валидацию (а `state.ts:484-488` проверяет `id`/`word_kr` у всех — непоследовательность).
2. `fetchRandomQuote`: `count` + `range(randomIndex, randomIndex).single()` без `order` — при фильтрации/RLS (`quotes` может расширяться) выборка нестабильна, может вернуть `null`; `.single()` бросает при 0 строк (обёрнуто в catch → просто нет цитаты).
3. `isDatabaseActive` продублирован в `db.ts:711-736` и `network.ts:29-53` — дрейф поведения при правках.
4. `pwa.ts:32-34`: «✅ Приложение готово к работе офлайн!» показывается, когда `!navigator.serviceWorker.controller`, т.е. до того, как precache реально установлен; на первом визите это ложь (и при ошибке IDB/SW тоже).
5. `state.ts:476-500`: синхронный `JSON.parse` кэша словаря на старте + дублирующая загрузка из IDB в `fetchVocabulary` — двойная работа (см. DAT-17).

**Влияние:** низкое; качество и предсказуемость.

**Фикс:** валидировать все/выборочно несколько элементов; `order("id")` для случайной цитаты; удалить дубль; показывать тост после `navigator.serviceWorker.ready`/`controllerchange`.

---

### DAT-35 · P3 · Избранные цитаты: локальные изменения не выгружаются повторно, офлайн-удаление «воскресает»

**Файл:** `src/core/db.ts:640-668`; `src/app.ts:566-599`

```ts
648:    } else if (favQuotesData) {
649:      const quoteIds = favQuotesData.map((q) => q.quote_id);
650:      if (quoteIds.length > 0) {
...
661:          state.favoriteQuotes = quotes || [];   // ← полная замена локального списка
```

```ts
578:              if (isFav) {
579:                state.favoriteQuotes = state.favoriteQuotes.filter((q) => q.id !== quoteId);
...
583:                await client.from(DB_TABLES.USER_FAVORITE_QUOTES).delete().match({ user_id: user.id, quote_id: quoteId });
```

**Механизм:**
1. Добавление/удаление цитаты выполняется local-first, но результат `insert/delete` не проверяется (`await` без `{error}`): офлайн/ошибка → локально состояние изменено, в облаке — нет.
2. Отдельного dirty/outbox для цитат нет: локально добавленная офлайн цитата **никогда** не будет выгружена (только при повторном ручном toggle, которого пользователь не сделает).
3. Локально удалённая офлайн цитата остаётся в облаке; при следующем входе `loadFromSupabase` при непустом облачном списке заменяет локальный (`:661`) → цитата «воскресает»; при пустом — намеренно сохраняет локальные (комментарий `:663-667`), но так и не выгружает их.
4. `immediateSaveState` в конце — локальное сохранение, синк не триггерится.

**Влияние:** низкое (не прогресс), но нарушает ожидания «избранное синхронизируется» и создаёт расхождение устройств.

**Фикс:** очередь операций для цитат (insert/delete + retry), проверка `error`, merge с tombstone-временем; либо убрать фичу из «синхронизируемых» и задокументировать.

---

## 5. «Убийственные» полевые ситуации

| # | Сценарий | Ожидание (по README/ТЗ) | Реальность (находки) |
|---|---|---|---|
| 1 | Потеря сети посреди экзаменационной тренировки (квиз/спринт), ответы продолжаются | Все ответы сохраняются локально, затем досылаются; UI не зависает | Локально — да (с задержкой 300 мс и риском квоты). Облако: часть ответов, попавших в окно идущего синка, никогда не уйдёт (DAT-01); при ошибке сервера outbox не переигрывает XP/сессии (DAT-04); SW BackgroundSync может продублировать вставки (DAT-22). Спиннер синка может висеть минуты (DAT-30), сессия не сохранится при закрытии (DAT-18). |
| 2 | Два устройства (телефон + планшет): учить, снимать «изучено», добавлять XP | Слияние прогресса без потерь, действия видны на обоих | Устаревшее устройство затирает флаги (DAT-06/07), XP/coins/лигу/сессии (DAT-08), офлайн-XP отбрасывается (DAT-09); >1000 строк прогресса не восстановятся (DAT-10); настройки откатываются целым блоком (DAT-27). |
| 3 | Исчерпание квоты localStorage (10k слов + история) | Понятное предупреждение + переход на IndexedDB, данные целы | Полный словарь пишется в localStorage на каждый дебаунс, ошибка глушится; пользователь не предупреждён (тост недостижим), часть ключей перестаёт сохраняться → потеря после reload (DAT-03/17). IDB-кэш тоже может не записаться (DAT-15). |
| 4 | Откат времени / смена часового пояса (перелёт, ручная коррекция) | Стрик/XP/лиги корректны, синк продолжается | `LAST_VOCAB_SYNC`/`gt(updated_at)` — клиентское время: при откате инкрементальный синк «замораживается» (DAT-05); `settingsUpdatedAt` и `updated_at` LWW — настройки/статистика не синкаются или затираются (DAT-08/27); стрик/лиги считаются по локальной дате (дубль LL-17/LL-18), что даёт дубли/сбросы. |
| 5 | Закрытие вкладки/перезагрузка в середине занятия (или краш WebView) | Сессия и последние ответы сохранены, при старте можно продолжить | Сессия не персистится и не записывается (DAT-18); теряются последние ≤300 мс ответов; незавершённый синк оставляет dirty-ids (outbox частично), но `globalUpdates` не переигрываются (DAT-04); возможен принудительный `localStorage.clear()` при ошибке init (DAT-02). |
| 6 | Первый холодный старт без сети (установка из стора, поездка в метро) | Приложение открывается, словарь доступен, статус «офлайн» | Если кэш был собран — открывается (precache 23 записи + IDB). Если нет — `init()` бросает «Не удалось загрузить данные», показывается error-overlay, `offline.html` не используется (DAT-32); приватный режим/сбой IDB не диагностируется (DAT-15). |
| 7 | Выход из аккаунта / истечение токена на общем устройстве | Данные текущего пользователя скрыты/очищены | На `SIGNED_OUT` состояние не чистится, следующий аккаунт наследует и загружает чужой прогресс (DAT-11); IndexedDB/SW-кэши остаются (дубль SEC-14/15). |
| 8 | Деплой новой версии, пока пользователь занимается | Обновление не ломает текущую сессию, функции доступны | Новый SW активируется без перезагрузки, старые чанки удаляются — lazy-модули падают 404 (DAT-20); при перезагрузке сессия не сохранена (DAT-18). |

---

## 6. Хорошо сделано

1. **`fetchVocabulary` с офлайн-проверкой до запроса и `AbortController` 30 с** (`db.ts:316-327`) — осознанное решение против «4 ретрая × 10 с = 40 с тишины»; таймаут снимается в `finally` (`:366-368`).
2. **Защита от пустого ответа сервера** (`db.ts:241-245`): пустой словарь не стирает локальный кэш — правильный инвариант.
3. **Пагинация словаря с `MAX_PAGES`** (`db.ts:333-365`) и комментарий про лимит PostgREST 1000 строк — редкий для проекта случай явного учёта серверного cap (жаль, что не применён к `user_progress`, DAT-10).
4. **«Умное слияние» глобальной статистики** (`db.ts:442-492`): max для рекордов/coins/streakFreeze, монотонность лиги, union по достижениям/сессиям — видно продуманную попытку не терять офлайн-прогресс (пусть и с дефектами DAT-08/09).
5. **Валидация и нормализация при старте** (`db.ts:35-52`; `state.ts:512-533`): защита от `level = 0` и бесконечного цикла `addXP`, клампы отрицательных значений — правильные инварианты (жаль, что `addXP` умеет их нарушать, DAT-29).
6. **Мягкое удаление слов** (`ui_bulk.ts:183-186`, `ui_edit_word.ts:247`) + корзина/восстановление — правильный подход, сохраняющий связанные прогресс/списки (минус — локальная чистка в DAT-13).
7. **Персист dirty-ids и outbox между перезагрузками** (`db.ts:794-801`; `sync.ts:29-54`) — базовая идея durable-очереди есть, и `isSyncing` выставляется **до** первого `await` (`sync.ts:63-67`), что защищает от двойного параллельного синка в одной вкладке.
8. **`beforeunload → immediateSaveState`** (`app.ts:1592-1594`) + изоляция ошибок по каждому ключу: одна «плохая» запись не блокирует остальные (но см. DAT-03 про то, что все ошибки глушатся).
9. **RLS-гигиена в миграции**: `is_admin()` как `SECURITY DEFINER` с `SET search_path = public`, запрет `PUBLIC`, политики `USING`+`WITH CHECK` на всех таблицах, «своя папка» в Storage — качественная заготовка (дубль-оценка SEC).
10. **Precache реально покрывает все рантайм-чанки** (свежая сборка `audit/logs/vite-build.txt`: 23 entries / 908.72 KiB, включая `searchWorker`, CSS, все lazy-чанки), `offline.html` и `clientsClaim()` присутствуют — офлайн-оболочка собрана (проблемы — в деталях, DAT-20/21/32).
11. **Скрытие секретов в клиентском бандле** проверено: в `vite.config.ts` в SW попадают только `VITE_SUPABASE_*` (publishable/anon по `.env.example`), серверные секреты в клиент не утекают (security-аудит отдельно).
12. **Тост-политика и офлайн-индикатор** (`network.ts:59-93`, `index.html:445-448`) — пользователь хотя бы уведомляется о потере сети и восстановлении.
13. **Тесты честно «зелёные», но пустые**: 29 тестов проходят (`audit/logs/coverage.txt`), при этом `db.ts`, `sync.ts`, `storage_idb.ts`, `pwa.ts`, `session.ts` — 0% (мок). Это не «хорошо», но зафиксировано в ограничениях, а не выдано за покрытие.

---

## 7. Ограничения аудита

1. **Статический анализ**: приложение не запускалось в браузере; реальные офлайн-старты, SW-обновления, квоты, мультитаб, Network throttling и поведение Workbox не воспроизводились. Сценарии из раздела 5 — моделирование по коду, а не воспроизведение.
2. **Схема прод-БД недоступна**: в репозитории только RLS-миграция, DDL нет. Выводы DAT-14 (колонки/уникальные констрейнты/`cleanup_user_progress`), а также «синк работает/не работает» требуют SQL-интроспекции (`pg_columns`, `pg_constraints`, `pg_proc`) и логов прод-запросов.
3. **Размер словаря и данные не измерялись**: оценки квоты/производительности даны по типичным размерам JSON Word (300–600 Б) и целевым «5–10k слов»; фактический размер `dataStore` нужно проверить в DevTools (`Application → Local Storage/IDB`).
4. **Эталонные прогоны выполнял Lead**: `npm run build` падает на `tsc` (`app.ts:149`, `audit/logs/build.txt`/`tsc.txt`), `vitest` в песочнице падал `EPERM` (`audit/logs/test.txt`), позже тесты прошли (`coverage.txt` — 29 тестов, 1.87% покрытия). Собственных сборок/тестов я не запускал (по правилам).
5. **`dist/` в репо устарел** (собран 2026-11-20, рабочее дерево — 2026-11-22): выводы о SW делались по свежей сборке Lead в `audit/build-out` (2026-11-22, injectManifest 23 entries) и по текущему исходнику; `dist/sw.js` разобран как артефакт для сравнения.
6. **`.env` не читался** (только имена переменных): TTL токенов, `max-rows` PostgREST, лимиты/rate-limits проекта, настройки Auth неизвестны.
7. **Часть модулей прочитана фрагментарно** (`app.ts`, `stats.ts`, `ui_settings.ts`, `auth.ts`, `ui_card.ts`, `ui_trash.ts`): покрыты все пути данных, но не весь UI-код; `ui_collections.ts`/`ui_custom_words.ts` — только data-операции через grep.
8. **Мультитаб-выводы** основаны на отсутствии `storage`/`BroadcastChannel`/`visibilitychange`-обработчиков (проверено grep) и на устройстве `saveAllState`/`dirty_ids_v1`; реальная гонка вкладок не воспроизводилась.
9. **Поведение Workbox** (`NavigationRoute` fallback, `directoryIndex`, `cleanupOutdatedCaches`) выведено из собранного `sw.js` и документации версии 7.x; версия `workbox-*` в `package.json` не зафиксирована (caret `^7.0.0`/`^7.4.0`) — поведение может отличаться между минорными версиями.
10. **Правила задачи**: исходники/конфиги не изменялись, `git`-операции не выполнялись (кроме чтения `git status/rev-parse/log` до начала работы), пакеты не ставились, сборки/тесты не запускались; секреты из `.env` не печатались.

---

## 8. Кросс-скоуп

- **`audit/reports/security.md`**: SEC-14 (SW кэширует персонализированные ответы, BackgroundSync хранит `Authorization`), SEC-15 (logout не чистит кэши/IDB — стыкуется с DAT-11), SEC-16 (токен в `console.warn` — DAT-30 не дублирует, только ссылается), SEC-21 (`cleanup_user_progress` — DAT-14), SEC-27 (fail-open мок-клиент: при отсутствии env «синк» тихо no-op, что маскирует DAT-04/16), SEC-29 (импорт бэкапа без схемы — DAT-12/33), SEC-32 (`_redirects` — DAT-32).
- **`audit/reports/frontend.md`**: F-34 (`app.ts:149` `TS6133`, мёртвый `ui_sync.ts`, сломанный `npm run build`) — DAT-25; F-24 (quota в `ui_writing` — DAT-03/17); F-20/F-21/F-22 (Chart.js/рендер/префетч — DAT-17). Фронтенд-часть `ui_data.ts` (импорт/экспорт) и `stats.ts` (accuracy) частично пересекается — в моём отчёте акцент на последствиях для слоя данных.
- **`audit/reports/learning-logic.md`**: LL-06 (двойной учёт сессий) — DAT-18 (персист сессии), LL-17/LL-18 (стрик/лиги по локальной дате — сценарий «откат времени»), LL-20 (импорт без валидации — DAT-12/33), LL-21 (фиктивные тесты — раздел «Ограничения»), LL-29 (мёртвый кэш точности — DAT-28, без дублирования), LL-19 (смена формулы уровней — DAT-09/31).
- **Сервер/Edge Functions**: `process-word-request/index.ts:210` создаёт слова с `is_public: false`, `created_by/user_id` — слова пользователя приватны по RLS; в связке с `app.ts:1376-1378` (фильтр приватных только при старте) и `cleanupInvalidStateIds` (DAT-13) это создаёт риск «пропажи» прогресса по приватным словам. `submitWordRequest` (`ui_custom_words.ts:266-269`) — неидемпотентный `insert` заявок: дубли при ретраях DAT-22/30. Судьба `is_public`/словаря — к аудиторам RLS/Edge.
- **Деплой/CI**: `.github/workflows/deploy.yml` собирает фронтенд, но **шага публикации фронтенда нет** (только `deploy-functions`); `package.json` предлагает `gh-pages`, при этом `public/_redirects` — Netlify-синтаксис. Т.е. вопрос «как артефакт `dist` попадает к пользователю» вне моего скоупа, но он влияет на реальный офлайн (какая версия precache'ится). `npm run build` на рабочем дереве падает (`tsc`), CI-джоба `test` тоже упадёт на `npm run check/build` (см. F-34) — значит, текущее состояние в принципе не может быть задеплоено штатным пайплайном.
- **Документация**: `README.md:47,182-185` («durable outbox», «Supabase API кэшируется SWR 24h», «23 записи precache» — верно только последнее), `README.md:221-223` ([x] RLS/схема — DAT-14), `GEMINI.md:25-26` («bidirectional sync, dirty records pushed») — требуют синхронизации с фактическим кодом.

---

*Отчёт подготовлен только на основании чтения кода из указанных путей; все цитаты приведены с реальными номерами строк, проверенными чтением. Значения секретов из `.env` не печатались. Исходники, конфиги и `git`-состояние не изменялись.*
