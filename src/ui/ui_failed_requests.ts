import { client } from "../core/supabaseClient.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import { openModal } from "./ui_modal.ts";
import { DB_TABLES, WORD_REQUEST_STATUS } from "../core/constants.ts";

export async function openFailedRequestsModal() {
  const modalId = "failed-requests-modal";
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    modal.setAttribute("data-close-modal", modalId);
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>❌ Ошибочные Заявки</h3>
          <div class="header-actions">
            <button class="btn btn-icon close-modal-btn" data-close-modal="${modalId}" aria-label="Закрыть">✕</button>
          </div>
        </div>
        <div id="failed-requests-list" class="trash-list-container">
          <div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  openModal(modalId);
  loadFailedRequests();
}

async function loadFailedRequests() {
  const container = document.getElementById("failed-requests-list");
  if (!container) return;
  container.scrollTop = 0;

  const { data: sessionData } = await client.auth.getSession();
  const userId = sessionData?.session?.user?.id;

  // Load failed word requests from database
  const query = client
    .from(DB_TABLES.WORD_REQUESTS)
    .select("*")
    .eq("user_id", userId)
    .eq("status", WORD_REQUEST_STATUS.ERROR);

  const { data: allData, error } = await query;

  if (error) {
    console.error("Error loading trash:", error);
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки</div>`;
    return;
  }

  if (!allData || allData.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:20px;">Нет неудачных заявок</div>`;
    return;
  }

  container.innerHTML = allData
    .map((w) => {
      return `
            <div class="trash-item">
              <div class="trash-item-info">
                <div class="trash-item-word">${escapeHtml(w.word_kr)}</div>
                <div style="font-size: 11px; opacity: 0.8;">${escapeHtml(w.my_notes)}</div>
                <div class="trash-item-date">${w.created_at ? new Date(w.created_at).toLocaleDateString() : ""}</div>
              </div>
              <div class="trash-item-actions">
                <button class="btn-icon" data-action="retry-request" data-id="${w.id}" title="Повторить отправку" aria-label="Повторить отправку">↻</button>
              </div>
            </div>
          `;
    })
    .join("");

  // Attach event listeners for retry buttons
  container
    .querySelectorAll('[data-action="retry-request"]')
    .forEach((button) => {
      button.addEventListener("click", async (e) => {
        const id = (e.target as HTMLElement).dataset.id;
        if (id) {
          try {
            // Update the status back to pending
            const { error } = await client
              .from(DB_TABLES.WORD_REQUESTS)
              .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: null })
              .eq("id", id);

            if (error) {
              throw error;
            }
            showToast("Заявка отправлена повторно.");
            loadFailedRequests(); // Refresh the list
          } catch (err) {
            console.error("Failed to retry request:", err);
            showToast(
              `Ошибка при повторной отправке: ${(err as Error).message}`,
            );
          }
        }
      });
    });
}
