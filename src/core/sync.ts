import { client } from "./supabaseClient.ts";
import { state, notify } from "./state.ts";
import { showToast } from "../utils/utils.ts";
import { DB_TABLES, LS_KEYS } from "./constants.ts";

/**
 * Updates the visual sync state in the UI.
 */
export const setSyncState = (status: "syncing" | "success" | "error" | "offline") => {
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

interface SyncOutbox {
  globalUpdates: Record<string, unknown>;
  dirtyWordIds: (string | number)[];
  timestamp: number;
}

/** Неотправленные изменения, сохранённые на устройстве. */
function readOutbox(): SyncOutbox | null {
  try {
    const raw = localStorage.getItem(LS_KEYS.SYNC_OUTBOX);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SyncOutbox;
    return parsed && Array.isArray(parsed.dirtyWordIds) ? parsed : null;
  } catch {
    return null;
  }
}

function writeOutbox(outbox: SyncOutbox) {
  try {
    localStorage.setItem(LS_KEYS.SYNC_OUTBOX, JSON.stringify(outbox));
  } catch (e) {
    console.warn("⚠️ Не удалось сохранить outbox синхронизации:", e);
  }
}

function clearOutbox() {
  try {
    localStorage.removeItem(LS_KEYS.SYNC_OUTBOX);
  } catch {
    // игнорируем
  }
}

export async function syncGlobalStats() {
  if (state.isSyncing) return;
  if (!navigator.onLine) {
    setSyncState("offline");
    return;
  }

  // Флаг выставляется ДО первого await, иначе два параллельных вызова
  // (scheduleSaveState + событие online) запускают две синхронизации.
  state.isSyncing = true;
  notify("sync_changed", { isSyncing: true });
  setSyncState("syncing");

  // Поднимаем отложенные изменения из предыдущей неудачной попытки.
  const pending = readOutbox();
  if (pending) {
    for (const id of pending.dirtyWordIds) state.dirtyWordIds.add(id);
  }

  let pendingGlobalUpdates: Record<string, unknown> | null = null;

  try {
    // OPTIMIZATION: Use state.currentUser if available to avoid auth lock contention
    let user = state.currentUser;

    if (!user) {
      const { data } = await client.auth.getSession();
      if (data?.session?.user) {
        user = data.session.user as unknown as import("../types/index.ts").User;
      }
    }

    if (!user) return;

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
      showQuizExtraInfo: state.showQuizExtraInfo,
    };

    const globalUpdates: Record<string, unknown> = {
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
      avatar_url: (user.user_metadata?.avatar_url as string) || null,
      full_name: (user.user_metadata?.full_name as string) || null,
    };
    pendingGlobalUpdates = globalUpdates;

    const { error: globalError } = await client
      .from(DB_TABLES.USER_GLOBAL_STATS)
      .upsert(globalUpdates, { onConflict: "user_id" });

    if (globalError) throw globalError;

    // 2. Sync Word Progress (Dirty words only, chunked into batches of 100)
    if (state.dirtyWordIds.size > 0) {
      const updates = [];
      for (const id of state.dirtyWordIds) {
        const h = state.wordHistory[id];
        updates.push({
          user_id: user.id,
          word_id: id,
          is_learned: state.learned.has(id),
          is_mistake: state.mistakes.has(id),
          is_favorite: state.favorites.has(id),
          attempts: h?.attempts ?? 0,
          correct: h?.correct ?? 0,
          last_review: h?.lastReview ?? 0,
          sm2_interval: h?.sm2?.interval ?? 0,
          sm2_repetitions: h?.sm2?.repetitions ?? 0,
          sm2_ef: h?.sm2?.ef ?? 2.5,
          sm2_next_review: h?.sm2?.nextReview ?? null,
          learned_date: h?.learnedDate ?? null,
          updated_at: new Date().toISOString(),
        });
      }

      if (updates.length > 0) {
        const BATCH_SIZE = 100;
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
          const chunk = updates.slice(i, i + BATCH_SIZE);
          const { error: progressError } = await client
            .from(DB_TABLES.USER_PROGRESS)
            .upsert(chunk, { onConflict: "user_id,word_id" });

          if (progressError) throw progressError;
        }
      }

      state.dirtyWordIds.clear();
      localStorage.setItem(LS_KEYS.DIRTY_IDS, "[]");
    }

    clearOutbox();
    setSyncState("success");
  } catch (error: unknown) {
    const e = error as { message?: string; code?: string };
    console.error(`Sync failed:`, e?.message || e);

    // Сохраняем непереданные изменения: при событии online syncGlobalStats
    // будет вызван снова и поднимет outbox.
    writeOutbox({
      globalUpdates: pendingGlobalUpdates ?? pending?.globalUpdates ?? {},
      dirtyWordIds: [...state.dirtyWordIds],
      timestamp: Date.now(),
    });

    const isNetworkError =
      e?.message?.toLowerCase().includes("failed to fetch") ||
      e?.message?.toLowerCase().includes("network") ||
      !navigator.onLine;
    if (isNetworkError) {
      showToast("🌐 Нет связи с сервером. Изменения сохранятся при восстановлении сети.");
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
    notify("sync_changed", { isSyncing: false });
  }
}
