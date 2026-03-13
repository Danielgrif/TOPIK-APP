import { state, WordRequestState, Session } from "../core/state.ts";
import { client } from "../core/supabaseClient.ts";
import { showToast } from "../utils/utils.ts";
import { LS_KEYS } from "../core/constants.ts";
import { scheduleSaveState } from "../core/db.ts";
import { createLocalBackup } from "../core/backup.ts";
import {
  updateStats,
  updateSRSBadge,
  updateXPUI,
  checkAchievements,
  invalidateTopicMasteryCache,
} from "../core/stats.ts";
import { openConfirm } from "./ui_modal.ts";
import { saveAndRender } from "./ui.ts";
import {
  Word,
  WordHistoryItem,
  DailyChallenge,
  Achievement,
  UserStats,
  StudyGoal,
  Quote,
} from "../types/index.ts";

export async function resetAllProgress() {
  try {
    createLocalBackup(); // Создаем резервную копию перед удалением
    const progressKeys = [
      LS_KEYS.USER_STATS,
      LS_KEYS.LEARNED,
      LS_KEYS.MISTAKES,
      LS_KEYS.FAVORITES,
      LS_KEYS.WORD_HISTORY,
      LS_KEYS.STREAK,
      LS_KEYS.SESSIONS,
      LS_KEYS.ACHIEVEMENTS,
      "daily_challenge_v1",
      LS_KEYS.DIRTY_IDS,
    ];
    progressKeys.forEach((k) => localStorage.removeItem(k));

    state.userStats = {
      xp: 0,
      level: 1,
      sprintRecord: 0,
      survivalRecord: 0,
      coins: 0,
      streakFreeze: 0,
      lastDailyReward: null,
      dailyRewardStreak: 0,
      achievements: [],
      survivalHealth: 0,
      lastFreezeDate: null,
      timeFreeze: 0,
      skipQuestion: 0,
      fiftyFifty: 0,
      weeklyXp: 0,
      league: "Bronze",
      lastWeekId: "",
    };
    state.learned = new Set();
    state.mistakes = new Set();
    state.favorites = new Set();
    state.wordHistory = Object.create(null);
    state.streak = { count: 0, lastDate: null };
    state.sessions = [];
    state.achievements = [];
    state.dailyChallenge = { lastDate: null, completed: false, streak: 0 };
    state.dirtyWordIds = new Set();

    const { data } = await client.auth.getSession();
    if (data && data.session) {
      showToast("☁️ Очистка облака...");
      await client
        .from("user_progress")
        .delete()
        .eq("user_id", data.session.user.id);
      // Также сбрасываем глобальную статистику (удаляем строку, она пересоздастся при входе)
      await client
        .from("user_global_stats")
        .delete()
        .eq("user_id", data.session.user.id);
    }

    const shopBalance = document.getElementById("shop-user-points");
    if (shopBalance) shopBalance.innerText = "0";

    scheduleSaveState();
    invalidateTopicMasteryCache();
    updateStats();
    updateXPUI();
    document.dispatchEvent(new CustomEvent("state-changed"));
    updateSRSBadge();
    showToast("✅ Прогресс полностью сброшен");
  } catch (e: unknown) {
    console.error("resetAllProgress error", e);
    const error = e as Error;
    showToast("Ошибка: " + (error.message || String(e)));
  }
}

export async function clearData() {
  const {
    data: { session },
  } = await client.auth.getSession();
  const providers = session?.user?.app_metadata?.providers || [];
  const isEmailAuth = session && providers.includes("email");

  openConfirm(
    isEmailAuth
      ? "Для сброса прогресса введите ваш пароль:"
      : "Сбросить весь прогресс? Это действие нельзя отменить.",
    () => resetAllProgress(),
    {
      showInput: isEmailAuth || undefined,
      inputPlaceholder: "Ваш пароль",
      onValidate: isEmailAuth
        ? async (val: string) => {
            if (!val) {
              showToast("Введите пароль");
              return false;
            }
            showToast("⏳ Проверка...");
            if (!session?.user?.email) return false;
            const { error } = await client.auth.signInWithPassword({
              email: session.user.email,
              password: val,
            });
            if (error) {
              showToast("❌ Неверный пароль");
              return false;
            }
            return true;
          }
        : undefined,
    },
  );
}

export function exportProgress() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([
      JSON.stringify(
        {
          stats: state.userStats,
          learned: [...state.learned],
          mistakes: [...state.mistakes],
          favorites: [...state.favorites],
          wordHistory: state.wordHistory,
          streak: state.streak,
          sessions: state.sessions,
          achievements: state.achievements,
          dailyChallenge: state.dailyChallenge,
          settings: {
            darkMode: state.darkMode,
            hanjaMode: state.hanjaMode,
            audioSpeed: state.audioSpeed,
            currentVoice: state.currentVoice,
            autoUpdate: state.autoUpdate,
            focusMode: state.focusMode,
            zenMode: state.zenMode,
            viewMode: state.viewMode,
            studyGoal: state.studyGoal,
            themeColor: state.themeColor,
            autoTheme: state.autoTheme,
            autoThemeStart: state.autoThemeStart,
            autoThemeEnd: state.autoThemeEnd,
            backgroundMusicEnabled: state.backgroundMusicEnabled,
            backgroundMusicVolume: state.backgroundMusicVolume,
            ttsVolume: state.ttsVolume,
            trashRetentionDays: state.trashRetentionDays,
          },
          searchHistory: state.searchHistory,
          customWords: state.customWords,
          wordRequests: state.wordRequests,
          purchasedItems: state.purchasedItems,
          favoriteQuotes: state.favoriteQuotes,
        },
        null,
        2,
      ),
    ]),
  );
  const date = new Date().toISOString().split("T")[0];
  a.download = `topik_backup_${date}.json`;
  a.click();
}

export function importProgress(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files ? target.files[0] : null;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      createLocalBackup(); // Создаем резервную копию перед перезаписью
      const target = e.target as FileReader;
      const data = JSON.parse(target.result as string) as {
        stats?: Partial<UserStats>;
        learned?: unknown[];
        mistakes?: unknown[];
        favorites?: unknown[];
        wordHistory?: unknown;
        streak?: unknown;
        sessions?: unknown[];
        achievements?: unknown[];
        dailyChallenge?: unknown;
        searchHistory?: unknown[];
        customWords?: unknown[];
        wordRequests?: unknown[];
        purchasedItems?: string[];
        favoriteQuotes?: unknown[];
        settings?: {
          darkMode?: boolean;
          hanjaMode?: boolean;
          audioSpeed?: number;
          currentVoice?: string;
          autoUpdate?: boolean;
          focusMode?: boolean;
          zenMode?: boolean;
          viewMode?: string;
          studyGoal?: StudyGoal;
          themeColor?: string;
          lastDailyReward?: number | null;
          autoTheme?: boolean;
          autoThemeStart?: number;
          autoThemeEnd?: number;
          backgroundMusicEnabled?: boolean;
          backgroundMusicVolume?: number;
          ttsVolume?: number;
          trashRetentionDays?: number;
        };
      };
      if (!data || typeof data !== "object")
        throw new Error("Invalid data format");

      if (data.stats) {
        state.userStats.xp = Number(data.stats.xp) || 0;
        state.userStats.level = Math.max(1, Number(data.stats.level) || 1);
        state.userStats.sprintRecord = data.stats.sprintRecord || 0;
        state.userStats.survivalRecord = data.stats.survivalRecord || 0;
        state.userStats.coins = data.stats.coins || 0;
        state.userStats.streakFreeze = data.stats.streakFreeze || 0;
        state.userStats.lastDailyReward = data.stats.lastDailyReward || null;
        state.userStats.dailyRewardStreak = data.stats.dailyRewardStreak || 0;
        state.userStats.survivalHealth = data.stats.survivalHealth || 0;
        state.userStats.lastFreezeDate = data.stats.lastFreezeDate || null;
        state.userStats.timeFreeze = data.stats.timeFreeze || 0;
        state.userStats.skipQuestion = data.stats.skipQuestion || 0;
        state.userStats.fiftyFifty = data.stats.fiftyFifty || 0;
        state.userStats.weeklyXp = data.stats.weeklyXp || 0;
        state.userStats.league = data.stats.league || "Bronze";
        state.userStats.lastWeekId = data.stats.lastWeekId || "";
      }
      if (Array.isArray(data.learned))
        state.learned = new Set(data.learned as (string | number)[]);
      if (Array.isArray(data.mistakes))
        state.mistakes = new Set(data.mistakes as (string | number)[]);
      if (Array.isArray(data.favorites))
        state.favorites = new Set(data.favorites as (string | number)[]);
      if (data.wordHistory)
        state.wordHistory = data.wordHistory as Record<
          string | number,
          WordHistoryItem
        >;
      if (data.streak) state.streak = data.streak as typeof state.streak;
      if (Array.isArray(data.sessions))
        state.sessions = data.sessions as Session[];
      if (Array.isArray(data.achievements))
        state.achievements = data.achievements as Achievement[];
      if (data.dailyChallenge)
        state.dailyChallenge = data.dailyChallenge as DailyChallenge;
      if (Array.isArray(data.searchHistory))
        state.searchHistory = data.searchHistory as string[];
      if (Array.isArray(data.customWords))
        state.customWords = data.customWords as Word[];
      if (Array.isArray(data.wordRequests))
        state.wordRequests = data.wordRequests as WordRequestState[];
      if (Array.isArray(data.purchasedItems))
        state.purchasedItems = data.purchasedItems;
      if (Array.isArray(data.favoriteQuotes))
        state.favoriteQuotes = data.favoriteQuotes as Quote[];

      if (data.settings) {
        const s = data.settings;
        if (s.darkMode !== undefined) state.darkMode = s.darkMode;
        if (s.hanjaMode !== undefined) state.hanjaMode = s.hanjaMode;
        if (s.audioSpeed !== undefined) state.audioSpeed = s.audioSpeed;
        if (s.currentVoice !== undefined) state.currentVoice = s.currentVoice;
        if (s.autoUpdate !== undefined) state.autoUpdate = s.autoUpdate;
        if (s.focusMode !== undefined) state.focusMode = s.focusMode;
        if (s.zenMode !== undefined) state.zenMode = s.zenMode;
        if (s.viewMode !== undefined) state.viewMode = s.viewMode;
        if (s.studyGoal !== undefined) state.studyGoal = s.studyGoal;
        if (s.themeColor !== undefined) state.themeColor = s.themeColor;
        if (s.lastDailyReward !== undefined)
          state.userStats.lastDailyReward = s.lastDailyReward;
        if (s.autoTheme !== undefined) state.autoTheme = s.autoTheme;
        if (s.autoThemeStart !== undefined)
          state.autoThemeStart = s.autoThemeStart;
        if (s.autoThemeEnd !== undefined) state.autoThemeEnd = s.autoThemeEnd;
        if (s.backgroundMusicEnabled !== undefined)
          state.backgroundMusicEnabled = s.backgroundMusicEnabled;
        if (s.backgroundMusicVolume !== undefined)
          state.backgroundMusicVolume = s.backgroundMusicVolume;
        if (s.ttsVolume !== undefined) state.ttsVolume = s.ttsVolume;
        if (s.trashRetentionDays !== undefined)
          state.trashRetentionDays = s.trashRetentionDays;
      }

      // Помечаем все восстановленные данные как "грязные", чтобы они синхронизировались с облаком
      const markDirty = (ids: (string | number)[]) => {
        ids.forEach((id) => state.dirtyWordIds.add(id));
      };

      if (state.learned.size > 0) markDirty([...state.learned]);
      if (state.mistakes.size > 0) markDirty([...state.mistakes]);
      if (state.favorites.size > 0) markDirty([...state.favorites]);
      if (state.wordHistory) markDirty(Object.keys(state.wordHistory));

      saveAndRender();
      invalidateTopicMasteryCache();
      checkAchievements(false);
      showToast("✅ Данные импортированы!");
    } catch (err: unknown) {
      const error = err as Error;
      showToast("❌ Ошибка импорта: " + (error.message || String(err)));
    }
  };
  reader.readAsText(file);
}
