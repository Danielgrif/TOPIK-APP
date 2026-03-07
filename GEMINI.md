# TOPIK Master Pro - AI Context & Architecture

## Project Overview
TOPIK Master Pro is an advanced Progressive Web App (PWA) designed for preparing for the TOPIK (Test of Proficiency in Korean) exam. It focuses on vocabulary acquisition, spaced repetition (SM-2), and gamified learning.

## Tech Stack
- **Frontend:** TypeScript, HTML5, CSS3 (Variables, Animations). No frameworks (Vanilla JS architecture).
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime, Edge Functions).
- **AI/Content:** Python scripts (`scripts/`) using Google Gemini (Content Generation) and EdgeTTS (Audio).
- **Build:** Vite.

## Core Architecture
1.  **State Management (`src/core/state.ts`):** Centralized reactive state object. Changes trigger UI updates via custom events.
2.  **Offline-First (`src/core/db.ts`):** Data is loaded from `localStorage` immediately for instant UI, then synced with Supabase in the background.
3.  **Sync Logic (`src/core/sync.ts`):** Bidirectional sync for user progress. "Dirty" records are pushed to the cloud.
4.  **UI Components (`src/ui/`):** Modular UI logic. HTML templates are injected dynamically (`component_loader.ts`).
5.  **Content Worker (`scripts/content_worker.py`):** Async Python worker that monitors `word_requests` table, generates translations/examples/audio using AI, and updates the `vocabulary` table.

## Database Schema (Key Tables)
- `vocabulary`: The master dictionary. Contains words, translations, examples, audio URLs.
- `user_progress`: SRS data (SM-2 intervals) for each user-word pair.
- `user_global_stats`: XP, Level, Coins, Settings.
- `word_requests`: Queue for AI generation.
- `user_lists` / `list_items`: Custom user collections.

## Key Features
- **SM-2 Algorithm:** Custom implementation in `src/core/scheduler.ts`.
- **Gamification:** Leagues, XP, Daily Challenges, Shop (`src/core/shop_data.ts`).
- **Modes:** Sprint, Survival, Typing, Audio, Flashcards.
- **Hanja:** Dedicated support for Sino-Korean characters.

## Development Guidelines
- **Strict Typing:** Use TypeScript interfaces (`src/types/index.ts`).
- **No Frameworks:** Keep the runtime lightweight. Direct DOM manipulation.
- **Error Handling:** Use `showToast` for user feedback and `console.error` for debugging.
- **AI Generation:** All heavy content generation happens server-side (Python worker), not in the client.