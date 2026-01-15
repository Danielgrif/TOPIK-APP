# Context: TOPIK APP (Full Architecture)

## 1. Project Overview
**TOPIK II Master Pro** — PWA-приложение для подготовки к экзамену TOPIK II (уровни 3-6).
Архитектура: Vanilla JS SPA (Single Page Application) без фреймворков с улучшенной модульной структурой (`core/`, `ui/`).
Данные: Supabase (PostgreSQL, Auth, Storage).
Автоматизация: Python (`content_worker.py`) с `asyncio` для массовой генерации контента.
**Особенности:** PWA (Progressive Web App), Dark Mode, 3D-карточки, SRS (SuperMemo-2), Skeleton Loading.

## 2. Critical Development Rules (User Constraints)
* **NO CODE TRUNCATION**: Строгий запрет на сокращение кода ("// ..."). Всегда возвращай полный текст файла.
* **PRESERVE STYLISTICS**: Не удаляй существующие CSS-классы и не меняй структуру DOM без необходимости. Сохраняй иконки и эмодзи.
* **ERROR HANDLING**: Используй `try/catch` для всех асинхронных операций. Логируй ошибки через `console.error` и показывай `showToast`.
* **STATE MANAGEMENT**: Все изменения данных должны проходить через `state.js`. Не храни состояние в глобальных переменных `window` (кроме экспорта функций для HTML).
* **DOM MANIPULATION**: Весь код, работающий с UI, должен находиться в `ui.js` или специализированных модулях (`quiz.js`, `auth.js` для своих модалок).
* **MODULARITY**: Соблюдай разделение ответственности. `app.js` — точка входа, `db.js` — данные, `ui.js` — рендеринг.
* **THEMING**: Используй CSS-переменные (`var(--surface-1)`, `var(--text-main)`) для поддержки светлой и темной тем.

## 3. Module Responsibilities & API

### Core Data & Logic
- **`js/core/state.js`**:
  - Центральное хранилище данных (Singleton `state`).
  - Хранит: `dataStore` (словарь), `userStats`, `learned`, `mistakes`, `favorites`, `wordHistory`.
  - Настройки: `currentTopic` (array), `audioSpeed`, `darkMode`, `hanjaMode`.
  - Инициализирует состояние из `localStorage`.

- **`js/core/supabaseClient.js`**:
  - Инициализация клиента `createClient`.
  - Использует ключи: `SUPABASE_URL`, `SUPABASE_KEY` (Anon).

- **`js/core/db.js`**:
  - Взаимодействие с БД и LocalStorage.
  - Функции: `fetchVocabulary()`, `loadFromSupabase()`, `syncWithSupabase()`, `immediateSaveState()`, `recordAttempt()`.
  - Управляет синхронизацией прогресса, избранного и "грязными" записями (`dirtyWordIds`).

  - **`searchWorker.js`**:
  - Web Worker для фонового поиска по словарю.
  - Разгружает UI-поток при вводе текста.

- **`js/core/scheduler.js`**:
  - Алгоритм интервальных повторений (SuperMemo-2 / Anki-like).
  - Методы: `calculate(grade, item)`, `getQueue()`, `submitReview()`.

- **`js/core/stats.js`**:
  - Логика статистики и достижений.
  - Функции: `addXP()`, `checkAchievements()`, `renderActivityChart()`, `renderLearnedChart()`, `renderDetailedStats()`.

### UI & Presentation
- **`js/app.js`**:
  - Точка входа (`init`).
  - Настройка глобальных слушателей (Auth, Search).
  - Регистрация Service Worker (PWA).
  - Экспорт функций в `window` для inline-событий HTML.

- **`js/ui/ui.js`**:
  - Управление глобальными элементами UI: фильтры, таймер сессии, жесты, навигация.
  - Функции-координаторы: `saveAndRender()`, `populateFilters()`.

- **`js/ui/ui_card.js`**: Рендеринг списка слов, создание 3D-карточек, логика Skeleton-заглушек.
- **`js/ui/ui_modal.js`**: Управление всеми модальными окнами.
- **`js/ui/ui_settings.js`**: Логика для окна настроек (тема, голос, скорость).

- **`js/ui/quiz.js`**:
  - Логика режимов тренировки (Sprint, Survival, Flashcard, etc.).
  - Управление состоянием квиза (`currentQuizMode`, `quizWords`).
  - Рендеринг вопросов квиза и обработка ответов (включая Levenshtein check).

- **`js/core/auth.js`**:
  - Логика аутентификации (Login, Signup, Reset Password).
  - Управление модальными окнами входа и профиля.

- **`js/utils/utils.js`**:
  - Утилиты: `debounce`, `showToast`, `speak` (TTS), `playTone` (Web Audio API), `levenshtein`, `generateDiffHtml`.

- **`style.css`**:
  - Стили интерфейса, адаптивность, анимации (Loader, Shake, FadeIn, Pulse).
  - Переменные CSS (`:root`, `.dark-mode`) для темизации.
  - Стили для 3D-карточек, графиков, модальных окон.

### PWA
- **`manifest.json`**: Метаданные приложения для установки.
- **`sw.js`**: Service Worker для кэширования ресурсов.
  - Стратегия Stale-While-Revalidate для статики (мгновенная загрузка).
  - Стратегия Cache First для аудиофайлов.

### Backend & Automation
- **`content_worker.py`**:
  - Python-скрипт для наполнения контента (Asyncio).
  - Генерирует аудио (Edge TTS) и загружает картинки (Pixabay) в Supabase Storage.
  - Обновляет таблицу `vocabulary`.

## 4. Data Flow (Типичный сценарий)
1. **Start**: `app.js` -> `db.js` (fetchVocabulary) -> `state.js` (загрузка LocalStorage) -> `ui.js` (render).
2. **Auth**: `auth.js` -> `supabaseClient` -> `db.js` (loadFromSupabase) -> `state.js` (merge data) -> `ui.js` (saveAndRender).
3. **Quiz**: `ui.js` (openModal) -> `quiz.js` (buildQuizModes) -> `state.js` (фильтрация слов) -> `quiz.js` (startQuizMode).
4. **Answer**: `quiz.js` (checkAnswer) -> `db.js` (recordAttempt) -> `scheduler.js` (если режим повторения) -> `state.js` (обновление статистики) -> `db.js` (scheduleSaveState).

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

### 📊 Evaluation (Score: 9.0/10)
**Strengths:** Performance (Workers, PWA), Clean Vanilla JS Architecture, Automation (Python pipeline), Skeleton loading implemented for smoother UI.
**Weaknesses:**
  - **Critical:** Database schema drift. Код ожидал колонки (`image_pixabay`), которых не было в БД, что приводило к ошибкам в бэкенд-сервисах. Это указывает на отсутствие процесса миграции/валидации схемы.
  - Insufficient test coverage (только `Scheduler` частично протестирован).
  - Некоторые модули (`ui.js`, `quiz.js`) все еще велики и могут быть дополнительно разделены.
  - **In Progress:** TypeScript integration (Configured `tsconfig.json` & `package.json`).
  - **Resolved:** XSS vulnerabilities in Quiz Strategies (fixed via DOM methods).
  - **Resolved:** Python worker default API key check.

### 🛣️ Improvement Program

#### Phase 1: Stability & Quality (Immediate)
1. **Critical:** Implement a schema validation/migration strategy. Все сервисы должны работать с единым источником правды о схеме БД.
2. **Unit Tests:** Расширить покрытие тестами (Jest/Vitest) для `utils.js`, `db.js` и логики квизов.
3. **Type Safety:** Внедрить JSDoc-аннотации во все ключевые модули для раннего обнаружения ошибок.
4. **Refactoring:** Продолжить рефакторинг `ui.js` и `quiz.js`, вынося логику в более мелкие, сфокусированные модули.
5. **Security:** Ensure all user inputs are sanitized (completed for Quiz Strategies).

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

#### Phase 4: Content & Community (Next Steps)
1. **User Custom Words:** Allow users to add, edit, and delete their own words (stored locally or in Supabase).
2. **Mistake Analysis:** A dedicated view to analyze *why* mistakes happen (e.g., confusing pairs, typo).
3. **Advanced Search:** Filter by "Has Audio", "Has Image", "Has Example".

#### Phase 5: Technical Debt & Performance (Long-term)
1. **Virtual Scrolling:** Replace pagination with a virtual scroller for the main grid to support 10k+ words.
2. **TypeScript Migration:** Gradually convert `.js` files to `.ts`.
3. **Framework Migration:** Move UI logic to Preact/Lit for better state management.