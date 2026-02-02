import { client } from "./supabaseClient.ts";
import { state } from "./state.ts";
import { showToast } from "../utils/utils.ts";

export async function syncGlobalStats() {
  if (state.isSyncing) return;

  // FIX: Используем getSession вместо getUser для поддержки офлайн-режима.
  // getUser требует сети, а getSession берет токен из localStorage.
  const { data, error } = await client.auth.getSession();

  if (error || !data?.session?.user) {
    // console.warn("Sync skipped: No active session.");
    return;
  }

  const user = data.session.user;

  state.isSyncing = true;
  const syncBtn = document.getElementById("sync-btn");
  if (syncBtn) syncBtn.classList.add("rotating");

  try {
    // 1. Sync Global Stats
    const settings = {
      darkMode: state.darkMode,
      hanjaMode: state.hanjaMode,
      audioSpeed: state.audioSpeed,
      currentVoice: state.currentVoice,
      autoUpdate: state.autoUpdate,
      autoTheme: state.autoTheme,
      studyGoal: state.studyGoal,
      lastDailyReward: state.userStats.lastDailyReward,
      themeColor: state.themeColor,
      backgroundMusicEnabled: state.backgroundMusicEnabled,
      backgroundMusicVolume: state.backgroundMusicVolume,
      ttsVolume: state.ttsVolume,
      streakLastDate: state.streak.lastDate,
      survivalHealth: state.userStats.survivalHealth,
    };

    const globalUpdates = {
      user_id: user.id,
      xp: state.userStats.xp,
      level: state.userStats.level,
      sprint_record: state.userStats.sprintRecord,
      survival_record: state.userStats.survivalRecord,
      coins: state.userStats.coins,
      streak_freeze: state.userStats.streakFreeze,
      achievements: state.achievements,
      sessions: state.sessions,
      settings: settings,
      updated_at: new Date().toISOString(),
    };

    const { error: globalError } = await client
      .from("user_global_stats")
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
          .from("user_progress")
          .upsert(updates, { onConflict: "user_id,word_id" });

        if (progressError) throw progressError;
      }

      state.dirtyWordIds.clear();
      localStorage.setItem("dirty_ids_v1", "[]");
    }
  } catch (e) {
    console.error("Sync failed:", e);
    // @ts-ignore
    if (e?.message?.includes("JWT") || e?.code === "PGRST301") {
      // Токен мог истечь во время выполнения запроса
      showToast("⚠️ Ошибка синхронизации: требуется повторный вход");
      // Здесь можно вызвать logout или открыть модалку входа, если это критично
    }
  } finally {
    state.isSyncing = false;
    if (syncBtn) syncBtn.classList.remove("rotating");
  }
}
