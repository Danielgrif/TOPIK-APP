# Context: TOPIK APP (Full Architecture)

## 1. Project Overview
**TOPIK II Master Pro** — PWA-приложение для подготовки к экзамену TOPIK II (уровни 3-6).
Архитектура: Vanilla JS SPA (Single Page Application) без фреймворков с улучшенной модульной структурой (`src/core/`, `src/ui/`).
Данные: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
Автоматизация: Python (`content_worker.py`) с `asyncio` для массовой генерации контента.
**Особенности:** PWA (Progressive Web App), Dark Mode, 3D-карточки, SRS (SuperMemo-2), Skeleton Loading, Virtual Scrolling, Offline Support.

## 2. Critical Development Rules (User Constraints)
* **NO CODE TRUNCATION**: Строгий запрет на сокращение кода ("// ..."). Всегда возвращай полный текст файла.
* **PRESERVE STYLISTICS**: Не удаляй существующие CSS-классы и не меняй структуру DOM без необходимости. Сохраняй иконки и эмодзи.
* **ERROR HANDLING**: Используй `try/catch` для всех асинхронных операций. Логируй ошибки через `console.error` и показывай `showToast`.
* **STATE MANAGEMENT**: Все изменения данных должны проходить через `state.ts`. Не храни состояние в глобальных переменных `window` (кроме экспорта функций для HTML).
* **DOM MANIPULATION**: Весь код, работающий с UI, должен находиться в `ui/` или специализированных модулях.
* **MODULARITY**: Соблюдай разделение ответственности. `app.ts` — точка входа, `db.ts` — данные, `ui.ts` — рендеринг.
* **THEMING**: Используй CSS-переменные (`var(--surface-1)`, `var(--text-main)`) для поддержки светлой и темной тем.

## 3. Module Responsibilities & API

### Core Data & Logic
- **`src/core/state.ts`**:
  - Центральное хранилище данных (Singleton `state`).
  - Хранит: `dataStore` (словарь), `userStats`, `learned`, `mistakes`, `favorites`, `wordHistory`.
  - Настройки: `currentTopic` (array), `audioSpeed`, `darkMode`, `hanjaMode`.
  - Инициализирует состояние из `localStorage`.

- **`src/core/supabaseClient.ts`**:
  - Инициализация клиента `createClient`.
  - Использует ключи: `SUPABASE_URL`, `SUPABASE_KEY` (Anon).

- **`src/core/db.ts`**:
  - Взаимодействие с БД и LocalStorage.
  - Функции: `fetchVocabulary()`, `loadFromSupabase()`, `syncWithSupabase()`, `immediateSaveState()`, `recordAttempt()`.
  - Управляет синхронизацией прогресса, избранного и "грязными" записями (`dirtyWordIds`).

- **`src/workers/searchWorker.ts`**:
  - Web Worker для фонового поиска по словарю.
  - Разгружает UI-поток при вводе текста.

- **`src/core/scheduler.ts`**:
  - Алгоритм интервальных повторений (SuperMemo-2 / Anki-like).
  - Методы: `calculate(grade, item)`, `getQueue()`, `submitReview()`.

- **`src/core/stats.ts`**:
  - Логика статистики и достижений.
  - Функции: `addXP()`, `checkAchievements()`, `renderActivityChart()`, `renderLearnedChart()`, `renderDetailedStats()`.

### UI & Presentation
- **`src/app.ts`**:
  - Точка входа (`init`).
  - **Global Event Delegation**: Обработка `data-action` и `data-modal-target` для всего приложения.
  - Настройка глобальных слушателей (Auth, Search).
  - Регистрация Service Worker (PWA).

- **`src/ui/ui.ts`**:
  - Управление глобальными элементами UI: фильтры, таймер сессии, жесты, навигация.
  - Функции-координаторы: `saveAndRender()`, `populateFilters()`.

- **`src/ui/ui_card.ts`**:
  - Рендеринг списка слов (Grid/List view).
  - **Virtual Scrolling**: Оптимизированный рендеринг длинных списков.
  - **Image Management**: Загрузка пользовательских фото, удаление, регенерация через AI (Edge Function).
  - Логика Skeleton-заглушек и 3D-карточек.

- **`src/ui/ui_modal.ts`**: Управление всеми модальными окнами.
- **`src/ui/ui_settings.ts`**: Логика для окна настроек (тема, голос, скорость).

- **`src/ui/quiz.ts`**:
  - Логика режимов тренировки (Sprint, Survival, Flashcard, etc.).
  - Управление состоянием квиза (`currentQuizMode`, `quizWords`).
  - Рендеринг вопросов квиза и обработка ответов (включая Levenshtein check).

- **`src/core/auth.ts`**:
  - Логика аутентификации (Login, Signup, Reset Password).
  - Управление модальными окнами входа и профиля.

- **`src/utils/utils.ts`**:
  - Утилиты: `debounce`, `showToast`, `speak` (TTS), `playTone` (Web Audio API), `levenshtein`, `generateDiffHtml`.

### PWA
- **`manifest.json`**: Метаданные приложения для установки.
- **`src/sw.ts`**: Service Worker для кэширования ресурсов.
  - Стратегия Stale-While-Revalidate для статики (мгновенная загрузка).
  - Стратегия Cache First для аудиофайлов и изображений.
  - **Background Sync**: Очередь `supabase-queue` для синхронизации данных при появлении сети.
  - **Download Queue**: Отложенная загрузка тяжелых файлов при плохом соединении.

### Backend & Automation
- **`supabase/functions/regenerate-image`**:
  - Deno Edge Function.
  - Проксирует запросы к Pixabay API для поиска картинок.
  - Загружает изображения в Supabase Storage и обновляет БД.
- **`content_worker.py`**:
  - Python-скрипт для наполнения контента (Asyncio).
  - Генерирует аудио (Edge TTS) и загружает картинки (Pixabay) в Supabase Storage.
  - Обновляет таблицу `vocabulary`.
- **`validate_schema.py`**:
  - Скрипт валидации схемы БД (Supabase) и наличия бакетов.
  - Проверяет таблицы `vocabulary` и `user_progress`.

## 4. Data Flow (Типичный сценарий)
1. **Start**: `app.ts` -> `db.ts` (fetchVocabulary) -> `state.ts` (загрузка LocalStorage) -> `ui.ts` (render).
2. **Auth**: `auth.ts` -> `supabaseClient` -> `db.ts` (loadFromSupabase) -> `state.ts` (merge data) -> `ui.ts` (saveAndRender).
3. **Quiz**: `ui.ts` (openModal) -> `quiz.ts` (buildQuizModes) -> `state.ts` (фильтрация слов) -> `quiz.ts` (startQuizMode).
4. **Answer**: `quiz.ts` (checkAnswer) -> `db.ts` (recordAttempt) -> `scheduler.ts` (если режим повторения) -> `state.ts` (обновление статистики) -> `db.ts` (scheduleSaveState).
5. **Image Regen**: `ui_card.ts` -> `supabaseClient.functions.invoke` -> `regenerate-image` (Edge) -> `Pixabay` -> `Storage` -> `DB`.

## 5. Database Schema (Supabase)
- **`vocabulary`**:
  - `id`, `word_kr`, `translation`, `word_hanja`, `topic`, `category`, `level`, `type`.
  - `audio_url`, `audio_male`, `image`, `image_source`, `example_kr`, `example_ru`, `example_audio`.
  - `synonyms`, `antonyms`, `collocations`, `my_notes`, `grammar_info`.
- **`user_global_stats`**:
  - `user_id`, `xp`, `level`, `sprint_record`, `survival_record`, `streak_count`, `achievements`.
- **`user_progress`**:
  - `user_id`, `word_id`, `is_learned`, `is_mistake`, `is_favorite`.
  - `attempts`, `correct`, `last_review`.
  - `sm2_interval`, `sm2_repetitions`, `sm2_ef`, `sm2_next_review`.

## 6. TOPIK II Suitability
- **Hanja Mode**: Критически важен для уровней 5-6 (понимание корней).
- **Writing Modes**: `typing` и `sentence` помогают с орфографией для заданий 51-52.
- **SRS**: Необходим для удержания 5000+ слов продвинутого уровня.

## 7. Strict Evaluation & Roadmap

### 📊 Evaluation (Score: 9.5/10)
**Strengths:**
  - **Architecture**: Clean Vanilla JS with Event Delegation (`app.ts`).
  - **Performance**: Workers, PWA, Skeleton loading, Virtual Scrolling, Optimized DOM updates.
  - **Automation**: Robust Python pipeline (`content_worker.py`) and Edge Functions.
  - **Reliability:** Schema validation script (`validate_schema.py`) ensures DB integrity.
**Weaknesses:**
  - **Testing**: Unit tests cover Scheduler and Worker. UI logic needs more coverage (Vitest setup exists).

### 🛣️ Improvement Program

#### Phase 1: Stability & Quality (Completed/In Progress)
1.  **Schema Validation:** ✅ Implemented `validate_schema.py` to check DB columns and buckets.
2.  **Event Delegation:** ✅ Refactored `app.ts`.
3.  **Type Safety:** ✅ **(Done)** Project fully migrated to TypeScript (`.ts`).
4.  **CSS Modularization:** ✅ Split `style.css` into modules. Fixed nesting syntax errors.
5.  **Virtual Scrolling:** ✅ **(Done)** Implemented for Grid and List views in `ui_card.ts`.

#### Phase 2: UX & Content (Completed)
1. **Leaderboard:** Global XP leaderboard with Realtime updates. (Done)
2. **Dialogue Mode:** UI for dialogues. (Done)
3. **Word of the Day:** Widget implemented. (Done)
4. **Grammar Section:** Dedicated view and filters. (Done)
5. **Search History:** Recent queries saved. (Done)
6. **Cloud Sync:** Settings and sessions sync. (Done)
7. **PWA Install Banner:** Custom UI. (Done)

#### Phase 2.5: Advanced Features (Completed)
1. **Hanja Explorer:** Interactive Hanja characters to find related words. (Done)
2. **Zen Mode:** Distraction-free interface. (Done)
3. **List View:** Alternative vocabulary display. (Done)
4. **Grammar Detail View:** Modal for comprehensive grammar rules. (Done)
5. **Backup & Restore:** JSON export/import. (Done)
6. **Study Goals:** Daily targets. (Done)

#### Phase 3: Gamification & Engagement (Completed)
1. **Economy:** Coins system, Shop, Streak Freeze, Daily Rewards. (Done)
2. **Visuals:** Level Up Animation, Theme Customizer (Accent Colors). (Done)
3. **Social:** Share Statistics as image. (Done)
4. **New Quiz Modes:** Word Association, Pronunciation Check, Confusing Words. (Done)

#### Phase 4: Content & Community (Current Focus)
1. **User Custom Words:** ✅ **(Done)** Logic for adding/deleting custom words implemented.
2. **Image Management:** ✅ **(Done)** Upload custom images, regenerate via AI (Edge Function), delete images.
3. **Mistake Analysis:** ✅ **(Done)** Implemented breakdown by Topic/Part of Speech.
4. **Advanced Filters:** ✅ **(Done)** Redesigned filter panel with virtual scrolling, search, and multi-select for topics/categories.
5. **UI Polish:** ✅ **(Done)** Unified Card/List views, interactive Hanja grid, accordion details in list view.

#### Phase 5: Technical Debt & Performance (Long-term)
1.  **Full TypeScript Migration:** ✅ **(Done)**.
2.  **Edge Functions**: ✅ **(Done)** Implemented for image regeneration.
3.  **Offline Sync**: ✅ **(Done)** Background Sync implemented in Service Worker.
4.  **Virtualization**: ✅ **(Done)** Implemented for Grid, List, and Filter dropdowns.