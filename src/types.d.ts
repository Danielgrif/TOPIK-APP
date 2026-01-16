declare global {
  interface Window {
    // --- External Libraries (CDN) ---

    /** Supabase Client injected via CDN */
    supabase: {
      createClient: (url: string, key: string) => unknown;
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
    Chart: any;

    // --- Browser APIs ---
    SpeechRecognition: unknown;
    webkitSpeechRecognition: unknown;

    // --- App Global Functions (exposed for HTML event handlers) ---

    /** PWA Install prompt handler */
    installApp: () => void;

    /** TTS Helper */
    speak: (text: string | null, url?: string | null) => Promise<void>;

    /** UI & Logic Helpers */
    checkPronunciation: (word: string, btn?: HTMLElement) => void;
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

    // Auth & Settings
    handleAuth: (type: string) => void;
    signInWithGoogle: () => void;

    // Shop
    buyItem: (id: string) => void;
    claimDailyReward: () => void;
  }
}

export {};
