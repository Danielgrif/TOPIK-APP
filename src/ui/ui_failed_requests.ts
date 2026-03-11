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
            <button class="btn-text" id="retry-all-failed-btn" style="color: var(--primary); font-size: 13px; font-weight: 600; display: none;">Повторить все</button>
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
    console.error("Error loading failed requests:", error);
    container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки</div>`;
    return;
  }

  const retryAllBtn = document.getElementById(
    "retry-all-failed-btn",
  ) as HTMLButtonElement | null;

  if (!allData || allData.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:40px 20px;"><div style="font-size:40px; margin-bottom:10px; opacity:0.5;">✅</div><div>Все заявки обработаны успешно</div></div>`;
    if (retryAllBtn) retryAllBtn.style.display = "none";
    return;
  }

  if (retryAllBtn) {
    retryAllBtn.style.display = "inline-block";
    retryAllBtn.textContent = `Повторить все (${allData.length})`;
    retryAllBtn.onclick = async () => {
      const ids = allData.map((w) => w.id);
      if (ids.length === 0) return;

      retryAllBtn.disabled = true;
      retryAllBtn.innerHTML = '<div class="spinner-tiny"></div>';

      const promises = ids.map((id) =>
        client.functions.invoke("retry-word-request", {
          body: { request_id: id },
        }),
      );

      try {
        const results = await Promise.allSettled(promises);
        const failedCount = results.filter(
          (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" && r.value.error),
        ).length;

        if (failedCount > 0) {
          showToast(
            `❌ ${failedCount} из ${ids.length} заявок не удалось повторить.`,
          );
        } else {
          showToast(`✅ Все ${ids.length} заявок отправлены повторно.`);
        }
        loadFailedRequests(); // Refresh the list
      } catch (e) {
        showToast(`Критическая ошибка: ${(e as Error).message}`);
        retryAllBtn.disabled = false;
      }
    };
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
        const btn = e.currentTarget as HTMLButtonElement;
        const id = btn.dataset.id;
        if (id) {
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner-tiny"></div>';

          try {
            // Вызываем "умную" функцию повтора
            const { error } = await client.functions.invoke(
              "retry-word-request",
              { body: { request_id: id } },
            );

            if (error) {
              throw error;
            }
            showToast("Заявка отправлена повторно.");
            // Оптимистично удаляем элемент из списка
            btn.closest(".trash-item")?.remove();
          } catch (err) {
            console.error("Failed to retry request:", err);
            showToast(`Ошибка: ${(err as Error).message}`);
            btn.disabled = false;
            btn.innerHTML = "↻";
          }
        }
      });
    });
}
