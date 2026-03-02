import { state } from "../core/state.ts";
import { scheduleSaveState } from "../core/db.ts";
import { escapeHtml, showToast } from "../utils/utils.ts";
import { client } from "../core/supabaseClient.ts";
import { DB_TABLES, WORD_REQUEST_STATUS } from "../core/constants.ts";

export function addFailedRequest(
  word: string,
  error: string,
  meta?: {
    targetListId?: string;
    topic?: string;
    category?: string;
    level?: string;
  },
) {
  // Avoid duplicates
  if (state.wordRequests.some((r) => r.word === word && r.status === "error"))
    return;

  // Deduplication: Check if word is already in the dictionary
  if (state.dataStore.some((w) => w.word_kr === word)) {
    return;
  }

  state.wordRequests.push({
    id: Date.now(),
    word,
    status: "error",
    error,
    timestamp: Date.now(),
    ...meta,
  });
  scheduleSaveState();
  renderRequestErrors();
}

export function renderRequestErrors() {
  // Try to find the container, or inject it if missing
  let container = document.getElementById("add-word-errors");
  if (!container) {
    const formView = document.getElementById("add-word-form-view");
    if (formView) {
      container = document.createElement("div");
      container.id = "add-word-errors";
      // Insert at the top of the form
      formView.insertBefore(container, formView.firstChild);
    } else {
      return;
    }
  }

  // Cleanup resolved requests (if word appeared in dataStore)
  const initialLength = state.wordRequests.length;
  state.wordRequests = state.wordRequests.filter((req) => {
    if (req.status !== "error") return true;
    const exists = state.dataStore.some((w) => w.word_kr === req.word);
    return !exists;
  });

  if (state.wordRequests.length !== initialLength) {
    scheduleSaveState();
  }

  const errors = state.wordRequests.filter((r) => r.status === "error");
  container.innerHTML = "";

  errors.forEach((req) => {
    const div = document.createElement("div");
    div.className = "request-error-container";
    div.innerHTML = `
            <div class="request-error-text">
                <div style="font-weight:700">${escapeHtml(req.word)}</div>
                <div style="font-size:11px; opacity:0.8">${escapeHtml(req.error || "")}</div>
            </div>
            <button class="retry-btn">Повторить</button>
            <button class="btn-icon-tiny-cancel" style="margin-left:8px">✕</button>
        `;

    const retryBtn = div.querySelector(".retry-btn") as HTMLButtonElement;
    retryBtn.onclick = () => {
      const input = document.getElementById(
        "new-word-input",
      ) as HTMLTextAreaElement;
      const btn = document.querySelector(
        '[data-action="submit-word-request"]',
      ) as HTMLButtonElement;
      if (input && btn) {
        input.value = req.word;
        // Remove from list
        state.wordRequests = state.wordRequests.filter((r) => r.id !== req.id);
        renderRequestErrors();
        // Trigger click
        btn.click();
      }
    };

    const cancelBtn = div.querySelector(
      ".btn-icon-tiny-cancel",
    ) as HTMLButtonElement;
    cancelBtn.onclick = () => {
      state.wordRequests = state.wordRequests.filter((r) => r.id !== req.id);
      renderRequestErrors();
    };

    container.appendChild(div);
  });
}

export async function syncOfflineRequests() {
  if (!navigator.onLine) return;

  // Фильтруем заявки, у которых есть необходимые данные для авто-отправки
  const offlineRequests = state.wordRequests.filter(
    (r) => r.status === "error" && r.targetListId,
  );

  if (offlineRequests.length === 0) return;

  const { data } = await client.auth.getSession();
  const user = data?.session?.user;
  if (!user) return;

  showToast(`🔄 Синхронизация ${offlineRequests.length} офлайн-заявок...`);

  const payload = offlineRequests.map((req) => ({
    user_id: user.id,
    word_kr: req.word,
    status: WORD_REQUEST_STATUS.PENDING,
    target_list_id: req.targetListId,
    topic: req.topic || "Мои слова (My Words)",
    category: req.category,
    level: req.level || "★★★",
  }));

  try {
    const { error } = await client
      .from(DB_TABLES.WORD_REQUESTS)
      .insert(payload);

    if (error) throw error;

    // Удаляем успешно отправленные заявки из локального списка ошибок
    const syncedIds = new Set(offlineRequests.map((r) => r.id));
    state.wordRequests = state.wordRequests.filter((r) => !syncedIds.has(r.id));
    scheduleSaveState();

    showToast(`✅ ${offlineRequests.length} заявок отправлено на сервер`);
    renderRequestErrors(); // Обновляем UI, если он открыт
  } catch (e: unknown) {
    console.error("Offline sync failed", e);
    const message = e instanceof Error ? e.message : String(e);
    showToast("❌ Ошибка синхронизации: " + message);
  }
}
