import { LS_KEYS } from "./constants";

/* eslint-disable no-console */
export function createLocalBackup() {
  try {
    const keys = [
      "user_stats_v5",
      "learned_v5",
      "mistakes_v5",
      "favorites_v5",
      "word_history_v5",
      "streak_v5",
      "sessions_v5",
      "achievements_v5",
      "daily_challenge_v1",
      "custom_words_v1",
      "favorite_quotes_v1",
      "dirty_ids_v1",
      "word_requests_state_v1",
    ];

    const backup: Record<string, string> = Object.create(null);
    let size = 0;

    keys.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val) {
        backup[key] = val;
        size += val.length;
      }
    });

    // Предотвращаем ошибку квоты, если данных слишком много (> 3MB)
    // localStorage обычно ограничен 5MB
    if (size > 3 * 1024 * 1024) {
      console.warn(
        "⚠️ Backup skipped: Data too large for localStorage duplication.",
      );
      return;
    }

    localStorage.setItem(LS_KEYS.SAFETY_BACKUP, JSON.stringify(backup));
  } catch (e) {
    console.warn("⚠️ Backup failed:", e);
  }
}

export function restoreLocalBackup(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEYS.SAFETY_BACKUP);
    if (!raw) return false;

    const backup = JSON.parse(raw);
    Object.entries(backup).forEach(([key, val]) => {
      if (typeof val === "string") localStorage.setItem(key, val);
    });

    location.reload();
    return true;
  } catch (e) {
    console.error("Restore failed:", e);
    return false;
  }
}
