import { state } from "./state.ts";
import { SW_MESSAGES } from "./constants.ts";
import { installApp, dismissInstallBanner, forceUpdateSW } from "./pwa.ts";
import { openConfirm, closeConfirm } from "../ui/ui_modal.ts";
import {
  saveAndRender,
  toggleSessionTimer,
  sortByWeakWords,
  shuffleWords,
  toggleViewMode,
} from "../ui/ui.ts";
import {
  setStarFilter,
  setTypeFilter,
  handleCategoryChange,
  toggleFilterPanel,
} from "../ui/ui_filters.ts";
import {
  toggleHanjaMode,
  setVoice,
  toggleDarkMode,
  toggleFocusMode,
  toggleAutoUpdate,
  toggleBackgroundMusic,
  setBackgroundMusicVolume,
  setTtsVolume,
  setAudioSpeed,
} from "../ui/ui_settings.ts";
import {
  handleAuth,
  openProfileModal,
  handleLogout,
  handleDeleteAccount,
  handleChangePassword,
  handleChangeEmail,
  toggleResetMode,
  togglePasswordVisibility,
  signInWithGoogle,
  openLoginModal,
} from "./auth.ts";
import { speak } from "../utils/utils.ts";
import { startDailyChallenge, quitQuiz } from "../ui/quiz.ts";
import { renderDetailedStats } from "./stats.ts";
import { checkPronunciation } from "./speech.ts";
import { resetSearchHandler } from "../ui/ui_card.ts";

export function setupWindowBindings(searchWorker?: Worker | null): void {
  Object.assign(window, {
    openConfirm,
    closeConfirm,
    exportProgress: () => import("../ui/ui_data.ts").then((m) => m.exportProgress()),
    saveAndRender,
    importProgress: (event: Event) =>
      import("../ui/ui_data.ts").then((m) => m.importProgress(event)),
    clearData: () => import("../ui/ui_data.ts").then((m) => m.clearData()),
    toggleSessionTimer,
    sortByWeakWords,
    shuffleWords,
    setStarFilter,
    setTypeFilter,
    handleCategoryChange,
    toggleHanjaMode,
    setVoice,
    toggleFilterPanel,
    toggleDarkMode,
    toggleAutoUpdate: (el: HTMLInputElement) => {
      toggleAutoUpdate(el);
      if (state.autoUpdate && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting) reg.waiting.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
        });
      }
    },
    toggleFocusMode,
    toggleViewMode,
    toggleBackgroundMusic: (el: HTMLInputElement) => {
      toggleBackgroundMusic(el);
    },
    setBackgroundMusicVolume,
    handleAuth,
    openProfileModal,
    handleLogout,
    handleDeleteAccount,
    handleChangePassword,
    handleChangeEmail,
    toggleResetMode,
    togglePasswordVisibility,
    setTtsVolume,
    setAudioSpeed: (val: string | number) => setAudioSpeed(val),
    signInWithGoogle,
    speak,
    openLoginModal,
    openReviewMode: () => import("../ui/ui_review.ts").then((m) => m.openReviewMode()),
    openShopModal: () => import("../ui/ui_shop.ts").then((m) => m.openShopModal()),
    switchShopTab: (tab: string) => import("../ui/ui_shop.ts").then((m) => m.switchShopTab(tab)),
    startDailyChallenge,
    quitQuiz,
    renderDetailedStats,
    checkPronunciation: (
      word: string,
      btn: HTMLElement,
      callback?: (score: number, text: string, audioUrl?: string) => void,
      canvas?: HTMLCanvasElement,
      onInterim?: (text: string) => void,
      onVolume?: (volume: number) => void,
    ) => checkPronunciation(word, btn, callback, canvas, onInterim, onVolume),
    resetSearchHandler,
    forceUpdateSW,
    installApp,
    dismissInstallBanner,
    deleteList: (id: string, btn?: HTMLElement) =>
      import("../ui/ui_collections.ts").then((m) => m.deleteList(id, btn)),
    openEditListModal: (id: string, title: string, icon: string) =>
      import("../ui/ui_collections.ts").then((m) => m.openEditListModal(id, title, icon)),
    setCollectionFilter: (id: string) =>
      import("../ui/ui_collections.ts").then((m) => m.setCollectionFilter(id)),
    openEditWordModal: (id: string | number, onUpdate?: () => void) =>
      import("../ui/ui_edit_word.ts").then((m) => m.openEditWordModal(id, onUpdate)),
    restoreWord: (id: number) =>
      (window as unknown as { restoreWord: (id: number) => void }).restoreWord(id),
    permanentlyDeleteWord: (id: number, btn: HTMLElement) =>
      (
        window as unknown as {
          permanentlyDeleteWord: (id: number, btn: HTMLElement) => void;
        }
      ).permanentlyDeleteWord(id, btn),
    toggleTrashSelection: (id: number, checked: boolean) =>
      (
        window as unknown as {
          toggleTrashSelection: (id: number, checked: boolean) => void;
        }
      ).toggleTrashSelection(id, checked),
    updateSearchIndex: () => {
      if (searchWorker) {
        searchWorker.postMessage({ type: "SET_DATA", data: state.dataStore });
      }
    },
  });
}
