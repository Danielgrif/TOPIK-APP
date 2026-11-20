import { client } from "../core/supabaseClient.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import { openModal, openConfirm } from "./ui_modal.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";
import { state } from "../core/state.ts";
import { BaseComponent } from "./BaseComponent.ts";

export function setupTrash() {
  cleanupExpiredTrash();
}

class TrashComponent extends BaseComponent {
  constructor() {
    super("trash-modal");
  }

  public async show() {
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("trash-modal");
      if (el) this.element = el;
    }
    this.ensureStructure();
    openModal("trash-modal");
    await this.loadTrashItems();
  }

  protected render(): void {
    // Not used for initial render
  }

  private ensureStructure() {
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("trash-modal");
      if (el) this.element = el;
    }
    let modal = document.getElementById("trash-modal");
    if (modal) {
      this.element = modal;
    }

    if (!modal) {
      modal = document.createElement("div");
      modal.id = "trash-modal";
      modal.className = "modal";
      modal.setAttribute("data-close-modal", "trash-modal");
      document.body.appendChild(modal);
    }

    // Re-render content to ensure freshness
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🗑️ Корзина</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn-text" id="empty-trash-action" style="color: var(--danger); font-size: 13px; font-weight: 600;">Очистить всё</button>
            <button class="btn btn-icon close-modal-btn" data-close-modal="trash-modal" aria-label="Закрыть">✕</button>
          </div>
        </div>
        <div id="trash-list" class="trash-list-container">
          <div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>
        </div>
      </div>
    `;
    this.element = modal;

    // Attach listener for "Empty Trash"
    const emptyBtn = modal.querySelector("#empty-trash-action");
    if (emptyBtn) {
      this.addEvent(emptyBtn, "click", () => emptyTrash());
    }
  }

  public async loadTrashItems() {
    const container = document.getElementById("trash-list");
    if (!container) return;
    container.scrollTop = 0;

    container.innerHTML =
      '<div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>';

    let userId = state.currentUser?.id;
    if (!userId) {
      const { data: sessionData } = await client.auth.getSession();
      userId = sessionData?.session?.user?.id;
    }

    let query = client
      .from(DB_TABLES.VOCABULARY)
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (userId) {
      query = query.eq("created_by", userId);
    }

    const { data: allData, error } = await query;

    if (error) {
      console.error("Error loading trash:", error);
      container.innerHTML = `<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки</div>`;
      return;
    }

    if (!allData || allData.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:20px;">Корзина пуста</div>`;
      return;
    }

    container.innerHTML = allData
      .map((w: Word) => {
        return `
      <div class="trash-item">
        <div class="trash-item-info">
          <div class="trash-item-word">${escapeHtml(w.word_kr)}</div>
          <div class="trash-item-date">${w.deleted_at ? new Date(w.deleted_at).toLocaleDateString() : ""}</div>
        </div>
        <div class="trash-item-actions">
          <button class="btn-icon" data-action="restore-word" data-value="${w.id}" title="Восстановить" aria-label="Восстановить">♻️</button>
          <button class="btn-icon" data-action="delete-word-permanent" data-value="${w.id}" title="Удалить навсегда" style="color:var(--danger);" aria-label="Удалить навсегда">✕</button>
        </div>
      </div>
    `;
      })
      .join("");
  }
}

const trashView = new TrashComponent();

export async function openTrashModal() {
  trashView.show();
}

export async function restoreWord(id: string | number) {
  let realId = id;
  if (typeof id === "string" && /^\d+$/.test(id)) {
    realId = parseInt(id, 10);
  }

  try {
    const { error } = await client
      .from(DB_TABLES.VOCABULARY)
      .update({ deleted_at: null })
      .eq("id", realId);

    if (error) throw error;

    showToast("Слово восстановлено");

    // Refresh the list through the component instance
    trashView.loadTrashItems();

    const { data: restored } = await client
      .from(DB_TABLES.VOCABULARY)
      .select("*")
      .eq("id", realId)
      .single();

    if (restored) {
      // Add back to local state
      if (!state.dataStore.find((w) => w.id === restored.id)) {
        state.dataStore.unshift(restored);
        // Notify about update
        document.dispatchEvent(new CustomEvent("state-changed"));
        if (window.updateSearchIndex) window.updateSearchIndex();
      }
    }
  } catch (e) {
    const err = e as Error;
    showToast("Ошибка восстановления: " + err.message);
  }
}

export async function permanentlyDeleteWord(id: string | number, btn: HTMLElement) {
  // Handle stringified numbers from DOM attributes
  let realId = id;
  if (typeof id === "string" && /^\d+$/.test(id)) {
    realId = parseInt(id, 10);
  }

  openConfirm("Удалить навсегда? Это действие нельзя отменить.", async () => {
    const item = btn.closest(".trash-item") as HTMLElement;
    if (item) {
      item.style.transition = "opacity 0.3s, transform 0.3s";
      item.style.opacity = "0";
      item.style.transform = "translateX(20px)";
      await new Promise((r) => setTimeout(r, 300));
      item.remove();
    }

    // 1. Удаляем само слово
    const { error } = await client.from(DB_TABLES.VOCABULARY).delete().eq("id", realId);

    if (error) {
      showToast("Ошибка удаления: " + error.message);
      trashView.loadTrashItems(); // Перезагружаем список, если удаление не удалось
    } else {
      // 2. ВАЖНО: Удаляем прогресс для этого слова (ручная очистка)
      // Игнорируем ошибку, если прогресса не было
      await client.from(DB_TABLES.USER_PROGRESS).delete().eq("word_id", realId);

      showToast("Удалено навсегда");

      // Если в корзине пусто, обновляем вид
      const container = document.getElementById("trash-list");
      if (container && container.children.length === 0 && trashView) {
        trashView.loadTrashItems();
      }
    }
  });
}

export async function emptyTrash() {
  const container = document.getElementById("trash-list");
  if (container && container.querySelector(".trash-item") === null) {
    showToast("Корзина уже пуста");
    return;
  }

  openConfirm("Удалить все слова из корзины навсегда? Это действие нельзя отменить.", async () => {
    let userId = state.currentUser?.id;
    if (!userId) {
      const { data } = await client.auth.getSession();
      userId = data?.session?.user?.id;
    }
    if (userId) {
      // Сначала получаем ID удаляемых слов, чтобы почистить прогресс
      const { data: userTrashIds } = await client
        .from(DB_TABLES.VOCABULARY)
        .select("id")
        .eq("created_by", userId)
        .not("deleted_at", "is", null);

      if (userTrashIds && userTrashIds.length > 0) {
        const ids = userTrashIds.map((r) => r.id);
        // Удаляем прогресс
        await client.from(DB_TABLES.USER_PROGRESS).delete().in("word_id", ids);
        // Удаляем слова
        await client.from(DB_TABLES.VOCABULARY).delete().in("id", ids);
      }
    }

    showToast("Корзина очищена");
    trashView.loadTrashItems();
  });
}

async function cleanupExpiredTrash() {
  // Skip for guest users — no server-side trash to clean up
  if (!state.currentUser?.id) return;

  const days = state.trashRetentionDays || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const userId = state.currentUser.id;
  const { error } = await client
    .from(DB_TABLES.VOCABULARY)
    .delete()
    .eq("created_by", userId)
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoffStr);

  if (error) console.error("Failed to cleanup expired trash:", error);
}
