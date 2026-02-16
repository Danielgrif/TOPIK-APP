/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { state } from "../core/state.ts";
import { render, getFilteredData } from "./ui_card.ts";
import { showToast, showUndoToast, escapeHtml } from "../utils/utils.ts";
import { client } from "../core/supabaseClient.ts";
import { openConfirm, openModal, closeModal } from "./ui_modal.ts";
import { collectionsState, type UserList } from "../core/collections_data.ts";
import { DB_TABLES } from "../core/constants.ts";

export function toggleSelectMode() {
  state.selectMode = !state.selectMode;
  state.selectedWords.clear();
  updateBulkBar();

  const grid = document.getElementById("vocabulary-grid");
  const savedScroll = grid ? grid.scrollTop : 0;

  render();

  if (grid) grid.scrollTop = savedScroll;

  // Визуально переключаем кнопку в тулбаре
  const btn = document.querySelector('[data-action="toggle-select-mode"]');
  if (btn) btn.classList.toggle("active", state.selectMode);
}

export function toggleSelection(id: string | number) {
  if (state.selectedWords.has(id)) {
    state.selectedWords.delete(id);
  } else {
    state.selectedWords.add(id);
  }
  updateBulkBar();

  // Оптимизированное обновление UI без полного ререндера
  const card = document.querySelector(`[data-word-id="${id}"]`);
  if (card) {
    if (state.selectedWords.has(id)) {
      card.classList.add("selected");
      const cb = card.querySelector(".select-checkbox");
      if (cb) cb.innerHTML = "✓";
    } else {
      card.classList.remove("selected");
      const cb = card.querySelector(".select-checkbox");
      if (cb) cb.innerHTML = "";
    }
  }
}

function updateBulkBar() {
  const bar = document.getElementById("bulk-bar");
  const countEl = document.getElementById("bulk-count-val");
  if (bar && countEl) {
    if (state.selectMode) {
      bar.classList.add("visible");
      countEl.textContent = String(state.selectedWords.size);

      // Инъекция кнопки "Исключить из списка"
      let removeBtn = bar.querySelector(
        '[data-action="bulk-remove-list"]',
      ) as HTMLElement;
      if (!removeBtn) {
        const actionsDiv = bar.querySelector(".bulk-actions");
        if (actionsDiv) {
          removeBtn = document.createElement("button");
          removeBtn.className = "btn-icon";
          removeBtn.setAttribute("data-action", "bulk-remove-list");
          removeBtn.title = "Исключить из текущего списка";
          removeBtn.innerHTML = "➖";
          removeBtn.style.color = "var(--warning)";
          removeBtn.onclick = () => bulkRemoveFromList();
          // Вставляем перед кнопкой удаления (обычно последняя)
          const deleteBtn = bar.querySelector('[data-action="bulk-delete"]');
          if (deleteBtn) actionsDiv.insertBefore(removeBtn, deleteBtn);
          else actionsDiv.appendChild(removeBtn);
        }
      }
      const listId = collectionsState.currentCollectionFilter;
      const isSpecificList =
        listId && listId !== "uncategorized" && listId !== "my-custom";
      if (removeBtn) {
        removeBtn.style.display = isSpecificList ? "inline-flex" : "none";
      }
    } else {
      bar.classList.remove("visible");
    }
  }
}

export function bulkDelete() {
  if (state.selectedWords.size === 0) return;

  const executeDelete = async () => {
    const ids = Array.from(state.selectedWords);

    // Бэкап для отмены
    const backup = state.dataStore.filter((w) => state.selectedWords.has(w.id));

    // Оптимистичное удаление из локального стейта
    state.dataStore = state.dataStore.filter(
      (w) => !state.selectedWords.has(w.id),
    );
    if (state.searchResults) {
      state.searchResults = state.searchResults.filter(
        (w) => !state.selectedWords.has(w.id),
      );
    }

    const grid = document.getElementById("vocabulary-grid");
    const savedScroll = grid ? grid.scrollTop : 0;

    render();
    toggleSelectMode(); // Выходим из режима выбора

    if (grid) grid.scrollTop = savedScroll;

    showUndoToast(
      `Перемещено в корзину: ${ids.length}`,
      () => {
        // Undo
        state.dataStore.push(...backup);
        render();
      },
      async () => {
        // Commit: Soft Delete (перемещение в корзину)
        try {
          console.log(`🔥 Массовое удаление (Soft): ${ids.length} слов`);

          // FIX: Используем soft delete (deleted_at), не удаляем связи и прогресс!
          const { error, count } = await client
            .from(DB_TABLES.VOCABULARY)
            .update({ deleted_at: new Date().toISOString() })
            .in("id", ids)
            .select("id");

          console.log("   - Результат удаления:", { error, count });

          if (error) {
            console.error("Server delete error:", error);
            showToast(`❌ Ошибка сервера: ${error.message}`);
          } else if (count === 0) {
            showToast("⚠️ Ничего не удалено (проверьте права)");
          }
        } catch (e) {
          console.error("Delete exception:", e);
        }
      },
    );
  };

  if (state.selectedWords.size < 5) {
    executeDelete();
  } else {
    openConfirm(
      `Переместить выбранные слова (${state.selectedWords.size}) в корзину?`,
      executeDelete,
    );
  }
}

export function bulkRemoveFromList() {
  const listId = collectionsState.currentCollectionFilter;
  // Проверяем, что мы в конкретном списке
  if (!listId || listId === "uncategorized" || listId === "my-custom") return;
  if (state.selectedWords.size === 0) return;

  openConfirm(
    `Исключить выбранные слова (${state.selectedWords.size}) из текущего списка?`,
    async () => {
      const ids = Array.from(state.selectedWords);

      // Оптимистичное обновление
      ids.forEach((id) =>
        collectionsState.listItems[listId]?.delete(Number(id)),
      );

      // Обновляем UI (слова исчезнут из вида, так как фильтр активен)
      const grid = document.getElementById("vocabulary-grid");
      const savedScroll = grid ? grid.scrollTop : 0;

      render();
      toggleSelectMode();

      if (grid) grid.scrollTop = savedScroll;

      // Запрос к БД
      const { error } = await client
        .from(DB_TABLES.LIST_ITEMS)
        .delete()
        .eq("list_id", listId)
        .in("word_id", ids);

      if (error) {
        showToast("Ошибка: " + error.message);
        // Откат изменений в случае ошибки
        ids.forEach((id) =>
          collectionsState.listItems[listId]?.add(Number(id)),
        );
        render();
      } else {
        showToast("Слова исключены из списка");
      }
    },
  );
}

export function bulkMoveToTopic() {
  if (state.selectedWords.size === 0) return;

  openConfirm("Введите новую тему для выбранных слов:", () => {}, {
    showInput: true,
    inputPlaceholder: "Например: Мои слова",
    onValidate: async (newTopic) => {
      if (!newTopic.trim()) return false;

      const ids = Array.from(state.selectedWords);
      const updates = { topic: newTopic.trim() };

      // Обновляем локально
      state.dataStore.forEach((w) => {
        if (state.selectedWords.has(w.id)) {
          w.topic = newTopic.trim();
        }
      });

      // Обновляем в БД
      const { error } = await client
        .from("vocabulary")
        .update(updates)
        .in("id", ids);

      if (error) {
        showToast("Ошибка обновления: " + error.message);
        return false;
      }

      showToast(`Перемещено слов: ${ids.length}`);
      toggleSelectMode();
      return true;
    },
  });
}

export function bulkAddToList() {
  if (state.selectedWords.size === 0) return;

  const modal = document.getElementById("add-to-list-modal");
  const content = document.getElementById("add-to-list-content");
  if (!modal || !content) return;

  client.auth.getUser().then(({ data: { user } }: any) => {
    if (!user) {
      showToast("Войдите в аккаунт");
      return;
    }
    const myLists = collectionsState.userLists.filter(
      (l: UserList) => l.user_id === user.id,
    );

    content.scrollTop = 0;
    content.innerHTML =
      `
            <div style="padding: 10px; text-align: center; color: var(--text-sub); margin-bottom: 10px;">
                Добавить ${state.selectedWords.size} слов в список:
            </div>
        ` +
      `
        <div class="multiselect-item" onclick="window.createNewListForBulk()">
            <span style="margin-left: 10px; font-weight: bold; color: var(--primary);">➕ Создать новый список...</span>
        </div>
      ` +
      myLists
        .map(
          (list: UserList) => `
            <div class="multiselect-item" onclick="window.handleBulkAddToList('${list.id}')">
                <span style="margin-left: 10px;">${escapeHtml(list.icon || "📁")} ${escapeHtml(list.title)}</span>
            </div>
        `,
        )
        .join("");

    openModal("add-to-list-modal");
  });
}

// Глобальный обработчик для выбора списка
window.handleBulkAddToList = async (listId: string) => {
  const ids = Array.from(state.selectedWords);
  const rows = ids.map((id) => ({ list_id: listId, word_id: id }));

  const { error } = await client
    .from("list_items")
    .upsert(rows, { onConflict: "list_id,word_id" });

  if (error) {
    showToast("Ошибка: " + error.message);
  } else {
    showToast(`Добавлено в список!`);
    // Обновляем локальный кэш списков
    if (!collectionsState.listItems[listId])
      collectionsState.listItems[listId] = new Set();
    ids.forEach((id) => collectionsState.listItems[listId].add(Number(id)));

    closeModal("add-to-list-modal");
    toggleSelectMode();
  }
};

// Глобальный обработчик для создания нового списка из модального окна
window.createNewListForBulk = () => {
  closeModal("add-to-list-modal");
  openConfirm("Введите название нового списка:", () => {}, {
    showInput: true,
    inputPlaceholder: "Например: Избранное 2024",
    confirmText: "Создать и добавить",
    onValidate: async (title) => {
      if (!title.trim()) return false;

      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return false;

      // 1. Создаем список
      const { data: newList, error } = await client
        .from(DB_TABLES.USER_LISTS)
        .insert({ title: title.trim(), user_id: user.id, icon: "📁" })
        .select()
        .single();

      if (error || !newList) {
        showToast("Ошибка создания списка: " + (error?.message || ""));
        return false;
      }

      // 2. Обновляем локальное состояние
      collectionsState.userLists.unshift(newList);
      collectionsState.listItems[newList.id] = new Set();

      // 3. Добавляем слова в новый список
      await window.handleBulkAddToList(newList.id);

      return true;
    },
  });
};

export function selectAll() {
  const words = getFilteredData();
  words.forEach((w) => state.selectedWords.add(w.id));

  // Визуально обновляем карточки без полной перерисовки
  document.querySelectorAll(".card, .list-item-wrapper").forEach((el) => {
    const id = (el as HTMLElement).dataset.wordId;
    if (id && state.selectedWords.has(Number(id))) {
      el.classList.add("selected");
      const cb = el.querySelector(".select-checkbox");
      if (cb) cb.innerHTML = "✓";
    }
  });

  updateBulkBar();
}

declare global {
  interface Window {
    handleBulkAddToList: (listId: string) => void;
    createNewListForBulk: () => void;
  }
}
