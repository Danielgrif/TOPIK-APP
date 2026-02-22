/* eslint-disable @typescript-eslint/no-explicit-any */
import { client } from "../core/supabaseClient.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import { openModal, openConfirm } from "./ui_modal.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";
import { state } from "../core/state.ts";
import { render } from "./ui_card.ts";

export function setupTrash() {
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
            <button class="btn-text" data-action="empty-trash" style="color: var(--danger); font-size: 13px; font-weight: 600;">Очистить всё</button>
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

  // 1. Загружаем удаленные из общей таблицы
  const { data: globalData, error: globalError } = await client
    .from(DB_TABLES.VOCABULARY)
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (globalError) {
    console.error("Error loading global trash:", globalError);
  }

  // 2. Загружаем удаленные из пользовательской таблицы
  let userData: Word[] = [];
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData?.session?.user) {
    const { data, error } = await client
      .from(DB_TABLES.USER_VOCABULARY)
      .select("*")
      .eq("user_id", sessionData.session.user.id)
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });

    if (!error && data) {
      userData = data;
    }
  }

  const allData = [...(globalData || []), ...userData];

  if (allData.length === 0) {
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
        <button class="btn-icon" data-action="restore-word" data-value="${w.id}" title="Восстановить">♻️</button>
        <button class="btn-icon" data-action="delete-word-permanent" data-value="${w.id}" title="Удалить навсегда" style="color:var(--danger);">✕</button>
      </div>
    </div>
  `;
    })
    .join("");
}

export async function restoreWord(id: string | number) {
  // Handle stringified numbers from DOM attributes
  let realId = id;
  if (typeof id === "string" && /^\d+$/.test(id)) {
    realId = parseInt(id, 10);
  }

  // Определяем таблицу по типу ID (UUID = строка = пользовательское слово)
  const isUserWord = typeof realId === "string";
  const tableName = isUserWord
    ? DB_TABLES.USER_VOCABULARY
    : DB_TABLES.VOCABULARY;

  const { error } = await client
    .from(tableName)
    .update({ deleted_at: null })
    .eq("id", realId);

  if (error) {
    showToast("Ошибка восстановления: " + error.message);
  } else {
    showToast("Слово восстановлено");
    loadTrashItems();

    // Fetch the restored word to add it back to local state
    const { data: restored } = await client
      .from(tableName)
      .select("*")
      .eq("id", realId)
      .single();

    if (restored) {
      state.dataStore.unshift(restored);
      render(); // Update the main grid immediately
      if (window.updateSearchIndex) window.updateSearchIndex();
    }
  }
}

export async function permanentlyDeleteWord(
  id: string | number,
  btn: HTMLElement,
) {
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

    const isUserWord = typeof realId === "string";
    const tableName = isUserWord
      ? DB_TABLES.USER_VOCABULARY
      : DB_TABLES.VOCABULARY;

    // 1. Удаляем само слово
    const { error } = await client.from(tableName).delete().eq("id", realId);

    if (error) {
      showToast("Ошибка удаления: " + error.message);
      loadTrashItems(); // Перезагружаем список, если удаление не удалось
    } else {
      // 2. ВАЖНО: Удаляем прогресс для этого слова (ручная очистка)
      // Игнорируем ошибку, если прогресса не было
      await client.from(DB_TABLES.USER_PROGRESS).delete().eq("word_id", realId);

      showToast("Удалено навсегда");

      // Если в корзине пусто, обновляем вид
      const container = document.getElementById("trash-list");
      if (container && container.children.length === 0) {
        loadTrashItems();
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

  openConfirm(
    "Удалить все слова из корзины навсегда? Это действие нельзя отменить.",
    async () => {
      // 1. Очистка пользовательской корзины
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData?.session?.user) {
        // Сначала получаем ID удаляемых слов, чтобы почистить прогресс
        const { data: userTrashIds } = await client
          .from(DB_TABLES.USER_VOCABULARY)
          .select("id")
          .eq("user_id", sessionData.session.user.id)
          .not("deleted_at", "is", null);

        if (userTrashIds && userTrashIds.length > 0) {
          const ids = userTrashIds.map((r) => r.id);
          // Удаляем прогресс
          await client
            .from(DB_TABLES.USER_PROGRESS)
            .delete()
            .in("word_id", ids);
          // Удаляем слова
          await client.from(DB_TABLES.USER_VOCABULARY).delete().in("id", ids);
        }
      }

      // 2. Очистка общей корзины (если применимо)
      const { error } = await client
        .from(DB_TABLES.VOCABULARY)
        .delete()
        .not("deleted_at", "is", null);

      if (error) {
        // Ошибки общей корзины могут быть из-за прав доступа, это нормально
        console.warn("Global trash cleanup:", error.message);
      }

      showToast("Корзина очищена");
      loadTrashItems();
    },
  );
}

async function cleanupExpiredTrash() {
  const days = state.trashRetentionDays || 30;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();

  // Очистка старых записей в общей таблице
  const { error } = await client
    .from(DB_TABLES.VOCABULARY)
    .delete()
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoffStr);

  // Очистка старых записей в пользовательской таблице
  const { data: sessionData } = await client.auth.getSession();
  if (sessionData?.session?.user) {
    await client
      .from(DB_TABLES.USER_VOCABULARY)
      .delete()
      .eq("user_id", sessionData.session.user.id)
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffStr);
  }

  if (error) {
    console.error("Failed to cleanup expired trash:", error);
  }
}
