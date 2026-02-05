/// <reference types="vite/client" />
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chart } from "chart.js";

declare global {
  interface Window {
    // --- External Libraries (CDN) ---

    /** Supabase Client injected via CDN */
    supabase: {
      createClient: (
        url: string,
        key: string,
        options?: object,
      ) => SupabaseClient;
    };

    /** Canvas Confetti library */
    confetti: (options?: {
      particleCount?: number;
      spread?: number;
      origin?: { y: number; x?: number };
      zIndex?: number;
      [key: string]: unknown;
    }) => void;

    /** Chart.js */
    Chart: typeof Chart;

    // --- Browser APIs ---
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;
    webkitAudioContext: typeof AudioContext;

    // --- App Global Functions (exposed for HTML event handlers) ---

    /** PWA Install prompt handler */
    installApp?: () => void;

    /** TTS Helper */
    speak: (text: string | null, url?: string | null) => Promise<void>;

    /** UI & Logic Helpers */
    checkPronunciation: (
      word: string,
      btn?: HTMLElement,
      callback?: (score: number, text: string, audioUrl?: string) => void,
      canvas?: HTMLCanvasElement,
    ) => void;
    setBackgroundMusicVolume: (volume: string | number) => void;
    scheduleSaveState: () => void;

    // Navigation & Modals
    toggleFocusMode: () => void;
    openProfileModal: () => void;
    openShopModal: () => void;
    toggleDarkMode: () => void;
    startDailyChallenge: () => void;
    toggleFilterPanel: () => void;
    toggleViewMode: (mode: string) => void;
    openModal: (id: string) => void;
    closeModal: (id: string) => void;
    openReviewMode: () => void;
    closeConfirm: () => void;
    quitQuiz: () => void;
    dismissInstallBanner: () => void;
    deleteList: (id: string, btn?: HTMLElement) => void;
    openEditListModal: (id: string, title: string, icon: string) => void;
    setCollectionFilter: (id: string) => void;
    openEditWordModal: (id: string | number, onUpdate?: () => void) => void;
    restoreWord: (id: number) => void;
    permanentlyDeleteWord: (id: number, btn: HTMLElement) => void;
    handleBulkAddToList: (listId: string) => void;
    toggleWordInList: (listId: string, wId: number, el: HTMLElement) => void;
    startMistakeQuiz: () => void;
    handleQuizSummaryContinue: () => void;

    // Auth & Settings
    handleAuth: (type: string) => void;
    signInWithGoogle: () => void;

    // Shop
    buyItem: (id: string, btn?: HTMLElement) => void;
    claimDailyReward: (btn?: HTMLElement) => void;
    switchShopTab: (tab: string) => void;
  }
}

export {};
