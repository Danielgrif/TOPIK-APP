let syncStateTimeout: number | null = null;

/**
 * Updates the UI of the synchronization status indicator.
 * @param status - The current synchronization status.
 */
export function setSyncState(
  status: "idle" | "syncing" | "success" | "error" | "offline",
) {
  const syncBtn = document.getElementById("sync-btn");
  if (!syncBtn) return;

  if (syncStateTimeout) {
    clearTimeout(syncStateTimeout);
    syncStateTimeout = null;
  }

  // Reset all classes first
  syncBtn.classList.remove(
    "rotating",
    "syncing",
    "success",
    "error",
    "offline",
  );

  switch (status) {
    case "syncing":
      syncBtn.classList.add("rotating", "syncing");
      syncBtn.title = "Синхронизация...";
      break;
    case "success":
      syncBtn.classList.add("success");
      syncBtn.title = "Синхронизировано";
      syncStateTimeout = window.setTimeout(() => setSyncState("idle"), 2000);
      break;
    case "error":
      syncBtn.classList.add("error");
      syncBtn.title = "Ошибка синхронизации";
      syncStateTimeout = window.setTimeout(() => setSyncState("idle"), 4000);
      break;
    case "offline":
      syncBtn.classList.add("offline");
      syncBtn.title = "Офлайн. Изменения будут сохранены позже.";
      break;
    case "idle":
    default:
      syncBtn.title = "Статус синхронизации";
      break;
  }
}
