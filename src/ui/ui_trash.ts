/* eslint-disable @typescript-eslint/no-explicit-any */
import { client } from "../core/supabaseClient.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import { openModal, openConfirm } from "./ui_modal.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";
import { state } from "../core/state.ts";
import { render } from "./ui_card.ts";

export function setupTrash() {
  (window as any).openTrashModal = openTrashModal;
  (window as any).restoreWord = restoreWord;
  (window as any).permanentlyDeleteWord = permanentlyDeleteWord;
  (window as any).emptyTrash = emptyTrash;
  cleanupExpiredTrash();
}

export async function openTrashModal() {
  const modalId = "trash-modal";
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    modal.setAttribute("data-close-modal", modalId);
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🗑️ Корзина</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn-text" onclick="window.emptyTrash()" style="color: var(--danger); font-size: 13px; font-weight: 600;">Очистить всё</button>
            <button class="btn btn-icon close-modal-btn" data-close-modal="${modalId}">✕</button>
          </div>
        </div>
        <div id="trash-list" class="trash-list-container">
          <div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  openModal(modalId);
  loadTrashItems();
}

async function loadTrashItems() {
  const container = document.getElementById("trash-list");
  if (!container) return;
  container.scrollTop = 0;

  container.innerHTML =
    '<div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>';

  const { data, error } = await client
    .from(DB_TABLES.VOCABULARY)
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    container.innerHTML = `<div style="text-align:center; color:var(--danger);">Ошибка загрузки: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:20px;">Корзина пуста</div>`;
    return;
  }

  container.innerHTML = data
    .map(
      (w: Word) => `
    <div class="trash-item">
      <div class="trash-item-info">
        <div class="trash-item-word">${escapeHtml(w.word_kr)}</div>
        <div class="trash-item-date">${new Date(w.deleted_at!).toLocaleDateString()}</div>
      </div>
      <div class="trash-item-actions">
        <button class="btn-icon" onclick="window.restoreWord(${w.id})" title="Восстановить">♻️</button>
        <button class="btn-icon" onclick="window.permanentlyDeleteWord(${w.id}, this)" title="Удалить навсегда" style="color:var(--danger);">✕</button>
      </div>
    </div>
  `,
    )
    .join("");
}

export async function restoreWord(id: number) {
  const { error } = await client
    .from(DB_TABLES.VOCABULARY)
    .update({ deleted_at: null })
    .eq("id", id);

  if (error) {
    showToast("Ошибка восстановления");
  } else {
    showToast("Слово восстановлено");
    loadTrashItems();

    // Fetch the restored word to add it back to local state
    const { data: restored } = await client
      .from(DB_TABLES.VOCABULARY)
      .select("*")
      .eq("id", id)
      .single();
    if (restored) {
      state.dataStore.unshift(restored);
      render(); // Update the main grid immediately
    }
  }
}

export async function permanentlyDeleteWord(id: number, btn: HTMLElement) {
  openConfirm("Удалить навсегда? Это действие нельзя отменить.", async () => {
    const item = btn.closest(".trash-item") as HTMLElement;
    if (item) {
      item.style.transition = "opacity 0.3s, transform 0.3s";
      item.style.opacity = "0";
      item.style.transform = "translateX(20px)";
      setTimeout(() => item.remove(), 300);
    }

    const { error } = await client
      .from(DB_TABLES.VOCABULARY)
      .delete()
      .eq("id", id);

    if (error) {
      showToast("Ошибка удаления");
      loadTrashItems();
    } else {
      showToast("Удалено навсегда");
    }
  });
}

export async function emptyTrash() {
  const container = document.getElementById("trash-list");
  if (container && container.querySelector(".trash-item") === null) {
    showToast("Корзина уже пуста");
    return;
  }

  openConfirm(
    "Удалить все слова из корзины навсегда? Это действие нельзя отменить.",
    async () => {
      const { error } = await client
        .from(DB_TABLES.VOCABULARY)
        .delete()
        .not("deleted_at", "is", null);

      if (error) {
        showToast("Ошибка: " + error.message);
      } else {
        showToast("Корзина очищена");
        loadTrashItems();
      }
    },
  );
}

async function cleanupExpiredTrash() {
  const days = state.trashRetentionDays || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  const { error } = await client
    .from(DB_TABLES.VOCABULARY)
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoffStr);

  if (error) {
    console.error("Failed to cleanup expired trash:", error);
  }
}
