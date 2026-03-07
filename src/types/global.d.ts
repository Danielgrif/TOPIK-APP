import { ConfirmOptions } from "./index.ts";

export {};

declare global {
  interface Window {
    // External libraries
    confetti: (options?: unknown) => void;
    supabase?: {
      createClient: unknown;
    };
    Chart?: unknown;

    // Browser APIs
    webkitAudioContext?: typeof AudioContext;
    SpeechRecognition?: unknown;
    webkitSpeechRecognition?: unknown;

    // App methods exposed to window
    installApp?: () => Promise<void>;
    updateSearchIndex?: () => void;

    openConfirm: (
      message: string,
      onConfirm: () => void,
      options?: ConfirmOptions,
    ) => void;
    closeConfirm: () => void;
    exportProgress: () => void;
    saveAndRender: () => void;
    importProgress: (event: Event) => void;
    clearData: () => void;
    toggleSessionTimer: () => void;
    sortByWeakWords: () => void;
    shuffleWords: () => void;
    setStarFilter: (star: string, btn: HTMLElement) => void;
    setTypeFilter: (type: string, btn: HTMLElement) => void;
    handleCategoryChange: (val: string) => void;
    toggleHanjaMode: (el: HTMLInputElement) => void;
    setVoice: (voice: string) => void;
    toggleFilterPanel: () => void;
    toggleDarkMode: (el?: HTMLInputElement) => void;
    toggleAutoUpdate: (el: HTMLInputElement) => void;
    toggleFocusMode: () => void;
    toggleViewMode: (mode: string) => void;
    toggleBackgroundMusic: (el?: HTMLInputElement) => void;
    setBackgroundMusicVolume: (val: string | number) => void;
    handleAuth: (type: string) => void;
    openProfileModal: (focusPassword?: boolean) => void;
    handleLogout: () => void;
    handleDeleteAccount: () => void;
    handleChangePassword: () => void;
    handleChangeEmail: () => void;
    toggleResetMode: (show: boolean) => void;
    togglePasswordVisibility: (triggerBtn?: HTMLElement) => void;
    setTtsVolume: (val: string | number) => void;
    setAudioSpeed: (val: string | number) => void;
    signInWithGoogle: () => void;
    speak: (text: string, url?: string | null) => Promise<void>;
    openLoginModal: () => void;
    openReviewMode: () => void;
    openShopModal: () => void;
    switchShopTab: (tab: string) => void;
    startDailyChallenge: () => void;
    quitQuiz: (skipConfirm?: boolean) => void;
    renderDetailedStats: () => void;
    checkPronunciation: (
      correctWord: string,
      btn?: HTMLElement,
      onResult?: (similarity: number, text: string, audioUrl?: string) => void,
      visualizerCanvas?: HTMLCanvasElement,
    ) => void;
    resetSearchHandler: () => void;
    forceUpdateSW: () => void;
    dismissInstallBanner: () => void;
    deleteList: (listId: string, btn?: HTMLElement) => void;
    openEditListModal: (
      listId: string,
      currentTitle: string,
      currentIcon: string,
    ) => void;
    setCollectionFilter: (listId: string | null, e?: Event) => void;
    openEditWordModal: (id: string | number, onUpdate?: () => void) => void;
    restoreWord: (id: string | number) => void;
    permanentlyDeleteWord: (id: string | number, btn: HTMLElement) => void;
    toggleTrashSelection: (id: string | number) => void;
  }
}
