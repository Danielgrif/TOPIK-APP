import { client } from "./supabaseClient.ts";
import { state } from "./state.ts";
import { showToast } from "../utils/utils.ts";
import { DB_TABLES, LS_KEYS } from "./constants.ts";

/**
 * Updates the visual sync state in the UI.
 */
const setSyncState = (status: "syncing" | "success" | "error" | "offline") => {
  const el = document.getElementById("sync-status");
  if (!el) return;
  el.className = `sync-status ${status}`;
  const icons: Record<string, string> = {
    syncing: "⏳",
    success: "✅",
    error: "❌",
    offline: "📡",
  };
  el.textContent = icons[status] || "";
};

export async function syncGlobalStats() {
  if (state.isSyncing) return;

  // FIX: Используем getSession вместо getUser для поддержки офлайн-режима.
  // getUser требует сети, а getSession берет токен из localStorage.
  const { data, error } = await client.auth.getSession();

  if (error || !data?.session?.user) {
    // console.warn("Sync skipped: No active session.");
    return;
  }

  if (!navigator.onLine) {
    setSyncState("offline");
    return;
  }

  state.isSyncing = true;
  setSyncState("syncing");
  const user = data.session.user;

  try {
    // 1. Sync Global Stats
    const settings = {
      darkMode: state.darkMode,
      hanjaMode: state.hanjaMode,
      audioSpeed: state.audioSpeed,
      currentVoice: state.currentVoice,
      autoUpdate: state.autoUpdate,
      autoTheme: state.autoTheme,
      autoThemeStart: state.autoThemeStart,
      autoThemeEnd: state.autoThemeEnd,
      studyGoal: state.studyGoal,
      lastDailyReward: state.userStats.lastDailyReward,
      themeColor: state.themeColor,
      backgroundMusicEnabled: state.backgroundMusicEnabled,
      backgroundMusicVolume: state.backgroundMusicVolume,
      ttsVolume: state.ttsVolume,
      streakLastDate: state.streak.lastDate,
      survivalHealth: state.userStats.survivalHealth,
      lastFreezeDate: state.userStats.lastFreezeDate,
      settingsUpdatedAt: state.settingsUpdatedAt,
    };

    const globalUpdates = {
      user_id: user.id,
      xp: state.userStats.xp,
      level: state.userStats.level,
      weekly_xp: state.userStats.weeklyXp,
      league: state.userStats.league,
      sprint_record: state.userStats.sprintRecord,
      survival_record: state.userStats.survivalRecord,
      coins: state.userStats.coins,
      streak_freeze: state.userStats.streakFreeze,
      achievements: state.achievements,
      sessions: state.sessions,
      settings: settings,
      updated_at: new Date().toISOString(),
      avatar_url: user.user_metadata?.avatar_url || null,
      full_name: user.user_metadata?.full_name || null,
    };

    const { error: globalError } = await client
      .from(DB_TABLES.USER_GLOBAL_STATS)
      .upsert(globalUpdates, { onConflict: "user_id" });

    if (globalError) throw globalError;

    // 2. Sync Word Progress (Dirty words only)
    if (state.dirtyWordIds.size > 0) {
      const updates = [];
      for (const id of state.dirtyWordIds) {
        const h = state.wordHistory[id];
        if (!h) continue;

        updates.push({
          user_id: user.id,
          word_id: id,
          is_learned: state.learned.has(id),
          is_mistake: state.mistakes.has(id),
          is_favorite: state.favorites.has(id),
          attempts: h.attempts,
          correct: h.correct,
          last_review: h.lastReview,
          sm2_interval: h.sm2?.interval || 0,
          sm2_repetitions: h.sm2?.repetitions || 0,
          sm2_ef: h.sm2?.ef || 2.5,
          sm2_next_review: h.sm2?.nextReview || null,
          learned_date: h.learnedDate || null,
          updated_at: new Date().toISOString(),
        });
      }

      if (updates.length > 0) {
        const { error: progressError } = await client
          .from(DB_TABLES.USER_PROGRESS)
          .upsert(updates, { onConflict: "user_id,word_id" });

        if (progressError) throw progressError;
      }

      state.dirtyWordIds.clear();
      localStorage.setItem(LS_KEYS.DIRTY_IDS, "[]");
    }

    setSyncState("success");
  } catch (error: unknown) {
    const e = error as { message?: string; code?: string };
    console.error(`Sync failed:`, e?.message || e);

    const isNetworkError = e?.message
      ?.toLowerCase()
      .includes("failed to fetch");
    if (isNetworkError) {
      showToast(
        "🌐 Нет связи с сервером. Изменения сохранятся при восстановлении сети.",
      );
      setSyncState("offline");
    } else if (e?.message?.includes("JWT") || e?.code === "PGRST301") {
      showToast("⚠️ Ошибка синхронизации: требуется повторный вход");
      setSyncState("error");
    } else {
      showToast("❌ Ошибка синхронизации. Попробуйте позже.");
      setSyncState("error");
    }
  } finally {
    state.isSyncing = false;
  }
}
