import { state } from "../core/state.ts";
import { scheduleSaveState } from "../core/db.ts";
import { escapeHtml } from "../utils/utils.ts";

export function addFailedRequest(word: string, error: string) {
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
