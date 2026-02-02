# TOPIK II Master Pro 🇰🇷

A comprehensive Progressive Web App (PWA) designed to help students prepare for the TOPIK II exam (Levels 3-6). This application combines advanced vocabulary learning techniques, including a Spaced Repetition System (SRS), with gamified elements to make studying Korean effective and engaging.

## 🚀 Features

*   **Smart Flashcards:** 3D flip cards with translations, examples, Hanja, and audio.
*   **Spaced Repetition System (SRS):** Built-in SM-2 algorithm to schedule reviews at optimal intervals.
*   **Multiple Quiz Modes:**
    *   🎯 **Multiple Choice & Reverse:** Standard vocabulary testing.
    *   ⌨️ **Typing:** Hardcore mode for spelling practice.
    *   ⚡ **Sprint:** Time-attack mode to test quick recall.
    *   ☠️ **Survival:** Quiz with limited lives.
    *   🎧 **Audio & Dictation:** Listening comprehension.
    *   🧩 **Sentence Scramble:** Construct sentences from parts.
    *   🗣️ **Pronunciation:** Speech recognition to check pronunciation.
    *   🔗 **Association:** Match words with their meanings.
*   **Gamification:**
    *   XP System & Leveling.
    *   Coins & Shop (Buy streak freezes, themes, extra lives).
    *   Daily Challenges & Streaks.
    *   Achievements.
*   **Content:**
    *   Vocabulary (Words & Grammar).
    *   Hanja Explorer (Chinese characters root lookup).
    *   Word of the Day / Quotes.
*   **Technical:**
    *   **Offline Support:** Fully functional PWA.
    *   **Dark Mode & Themes:** Customizable UI.
    *   **Cloud Sync:** Sync progress across devices via Supabase.
    *   **Text-to-Speech:** Integrated TTS with fallback.

## 🛠️ Tech Stack

*   **Frontend:** TypeScript, Vanilla JS (No framework), HTML5.
*   **Styling:** CSS Variables, Modular CSS.
*   **Build Tool:** Vite.
*   **State Management:** Custom Singleton State Store (`src/core/state.ts`).
*   **Database & Auth:** Supabase.
*   **PWA:** Vite PWA Plugin, Service Workers (Workbox).
*   **Automation:** Python (Asyncio, Edge TTS, Pixabay API) for content generation.

## 📂 Project Structure

```text
/
├── public/             # Static assets (icons, manifest)
├── scripts/            # Python automation scripts
│   ├── content_worker.py   # Generates audio/images and updates DB
│   ├── validate_schema.py  # Checks DB integrity
│   └── validate_ts.py      # TypeScript validation utility
├── src/
│   ├── core/           # Core business logic
│   │   ├── backup.ts   # Local backup utilities
│   │   ├── collections_data.ts # Collections state
│   │   ├── db.ts       # Database interactions & Sync
│   │   ├── scheduler.ts # SM-2 Spaced Repetition Algorithm
│   │   ├── state.ts    # Global App State
│   │   └── ...
│   ├── css/            # Modular CSS files
│   ├── types/          # TypeScript interfaces
│   ├── ui/             # UI Controllers & Components
│   │   ├── component_loader.ts # HTML Injection
│   │   ├── quiz.ts     # Quiz logic & orchestration
│   │   ├── ui_card.ts  # Card rendering (Virtual Scroll)
│   │   ├── ui_collections.ts # User Lists
│   │   ├── ui_custom_words.ts # Word Requests
│   │   ├── ui_bulk.ts  # Bulk Actions
│   │   └── ...
│   ├── utils/          # Helper functions
│   ├── workers/        # Web Workers (Search offloading)
│   ├── app.ts          # Application Entry point
│   └── sw.ts           # Service Worker logic
├── index.html          # Main HTML entry
└── vite.config.ts      # Vite configuration
```

## ⚡ Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   Python 3.8+ (for content scripts)
*   Supabase Account

### 1. Frontend Setup

```bash
# Clone the repository
git clone <repository-url>
cd topik-app

# Install dependencies
npm install

# Configure Environment
# Create a .env file in the root directory with the following:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_KEY=your_supabase_anon_key
```

### 2. Python Environment (Optional, for content generation)

```bash
# Install Python dependencies
pip install supabase python-dotenv requests idna edge-tts pillow google-genai

# Add to .env:
# SUPABASE_SERVICE_KEY=your_service_role_key (Required for writing to Storage)
# GEMINI_API_KEY=your_gemini_key (Optional, for AI generation)
# PIXABAY_API_KEY=your_pixabay_key (Optional, for images)
```

## 🏃‍♂️ Running the App

### Development
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build
```bash
npm run build
npm run preview
```

## 🏗️ Architecture Highlights

*   **State Management:** The app uses a centralized `state` object initialized from `localStorage` for immediate offline access, syncing with Supabase in the background.
*   **Virtual Scrolling:** To handle large vocabulary lists efficiently, `src/ui/ui_card.ts` implements a custom virtual scroller that renders only the visible items in the DOM.
*   **Web Workers:** Search operations are offloaded to `src/workers/searchWorker.ts` to prevent UI blocking during typing.
*   **PWA Strategy:** Uses a Cache-First strategy for audio files to ensure instant playback during reviews, and Stale-While-Revalidate for static assets.