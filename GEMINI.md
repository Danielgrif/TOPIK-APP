# TOPIK Master Pro - AI Context & Architecture

# GEMINI CODE ASSIST CONTEXT

## Project Overview

TOPIK Master Pro is an advanced Progressive Web App (PWA) designed for preparing for the TOPIK (Test of Proficiency in Korean) exam. It focuses on vocabulary acquisition, spaced repetition (SM-2), and gamified learning.
Этот файл содержит контекст архитектуры проекта TOPIK APP для AI-ассистента.
Используй эту информацию при генерации кода и рефакторинге.

## Tech Stack

- **Frontend:** TypeScript, HTML5, CSS3 (Variables, Animations). No frameworks (Vanilla JS architecture).
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions).
- **Server-Side Logic:** Supabase Edge Functions (Deno, TypeScript).
- **AI:** Google Gemini (via Edge Functions).
- **Audio:** Microsoft Edge TTS (via Edge Functions using WebSocket for streaming).
- **Build:** Vite.

## 🏗️ Архитектурные паттерны

## Core Architecture

1.  **State Management (`src/core/state.ts`):** Centralized reactive state object. Changes trigger UI updates via custom events.
2.  **Offline-First (`src/core/db.ts`):** Data is loaded from `localStorage` immediately for instant UI, then synced with Supabase in the background
3.  **Sync Logic (`src/core/sync.ts`):** Bidirectional sync for user progress. "Dirty" records are pushed to the cloud.
4.  **UI Components (`src/ui/`):** Modular UI logic. HTML templates are injected dynamically (`component_loader.ts`).
5.  **Edge Functions (`supabase/functions/`):** Serverless functions handling AI generation, word processing, background tasks, and admin operations.

### 1. UI Компоненты (`src/ui/`)

В проекте используется **Vanilla TypeScript** с классовым подходом.

## Database Schema (Key Tables)

- `vocabulary`: The master dictionary. Contains words, translations, examples, audio URLs.
- `user_progress`: SRS data (SM-2 intervals) for each user-word pair.
- `user_global_stats`: XP, Level, Coins, Settings.
- `word_requests`: Queue for AI generation.
- `user_lists` / `list_items`: Custom user collections.
- `ai_cache`: Caching AI responses to save tokens.
- `quotes` / `user_favorite_quotes`: Daily quotes system.
- `articles`: Reading materials with translations and levels.
  **Правило:** Все новые UI-контроллеры (модальные окна, экраны) ДОЛЖНЫ наследоваться от `BaseComponent`.

## Edge Functions

- `process-word-request`: Orchestrates adding new words: fetches data from Gemini, checks duplicates, inserts into DB.
- `generate-word-data`: Wraps Gemini API to generate structured JSON data for words.
- `generate-media-for-word`: Generates TTS audio (male/female) and fetches images.
- `background-worker`: Cron job for batch processing missing media or retrying failed requests.
- `check-essay`: AI evaluation of TOPIK writing tasks.
- `regenerate-image`: Searches or generates images for words.
- `retry-word-request`: Manually triggers reprocessing of failed word requests.
- `delete-user`: Admin function for complete account deletion.

```typescript
import { BaseComponent } from "./BaseComponent.ts";

## Key Features
- **SM-2 Algorithm:** Custom implementation in `src/core/scheduler.ts`.
- **Gamification:** Leagues, XP, Daily Challenges, Shop (`src/core/shop_data.ts`), Achievements.
- **Modes:** Sprint, Survival, Typing, Listening, Flashcards, Essay, Dialogue.
- **Pronunciation:** Speech recognition analysis (`src/core/speech.ts`) with visual feedback.
- **Hanja:** Dedicated support for Sino-Korean characters.
class MyFeatureComponent extends BaseComponent {
  constructor() {
    super("modal-id-in-dom");
  }

## Development Guidelines
- **Strict Typing:** Use TypeScript interfaces (`src/types/index.ts`).
- **No Frameworks:** Keep the runtime lightweight. Direct DOM manipulation.
- **Error Handling:** Use `showToast` for user feedback and `console.error` for debugging.
- **Shared Logic:** Use `supabase/functions/_shared/` for code shared between Edge Functions.
  // Вызывается один раз при инициализации
  public init() {
    super.init();
    // Навешивание слушателей DOM
  }

  // Подписки на изменение стейта
  protected setupStateSubscriptions() {
    this.listen("some_event", () => this.render());
  }

  // Отрисовка данных
  protected render() {
    // DOM manipulation
  }
}
```

### 2. Управление состоянием (`src/core/state.ts`)

Используется простой паттерн **Observer (Pub/Sub)**.

- Изменение данных: `state.userStats.xp += 10; notify("stats_updated");`
- Реакция UI: `this.listen("stats_updated", () => ...)` внутри `BaseComponent`.

**Правило:** Никогда не вызывай методы `ui_*.ts` напрямую из `core/`. Используй `notify()`.

### 3. Бэкенд (Supabase Edge Functions)

Код находится в `supabase/functions/`.

- Среда выполнения: **Deno**.
- Импорты: Используй `deno.json` и URL-импорты (например, `esm.sh`).
- Shared code: Общий код лежит в `supabase/functions/_shared/`.

### 4. Обработка ошибок

- Используй `showToast(msg)` для уведомлений пользователя.
- Для критических ошибок используй `console.error` и `showError` (глобальный оверлей).

---

## 📂 Структура файлов

| Путь                  | Назначение                                             |
| --------------------- | ------------------------------------------------------ |
| `src/core/`           | Чистая бизнес-логика, API, State. Без DOM манипуляций. |
| `src/ui/`             | UI контроллеры. Работа с DOM, ивенты.                  |
| `src/utils/`          | Утилиты (formatters, helpers).                         |
| `src/types/`          | Глобальные TypeScript интерфейсы.                      |
| `supabase/functions/` | Бэкенд код (Deno).                                     |

---

## 🚨 Важные правила (Do's and Don'ts)

1.  **НЕ** смешивай Node.js и Deno импорты.
    - Frontend (`src/`): Node.js/Vite style (`import ... from "./file"`).
    - Backend (`supabase/`): Deno style (`import ... from "./file.ts"` - расширение обязательно).
2.  **НЕ** используй React/Vue/Angular паттерны. Проект на нативном DOM API.
3.  **НЕ** создавай циклические зависимости между `core` и `ui`. Поток данных: `UI -> Core -> State -> Notify -> UI`.
4.  **ИСПОЛЬЗУЙ** `BaseComponent` для автоматической очистки событий (`destroy`).

## 🔧 Конфигурация IDE

Файл `.vscode/settings.json` настроен на разделение контекстов:

- `deno.enablePaths`: `["supabase/functions"]` — Deno активен только там.
- Основной `tsconfig.json` исключает папку функций.

---

При генерации новых функций следуй этим паттернам.
