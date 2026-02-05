import { client } from "../core/supabaseClient.ts";
import { state } from "../core/state.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";
import { openConfirm } from "./ui_modal.ts";
import { render } from "./ui_card.ts";
import { Word } from "../types/index.ts";

let deletedWords: Word[] = [];
const selectedTrashIds = new Set<number>();

async function fetchDeletedWords() {
  const { data, error } = await client
    .from("vocabulary")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  if (error) {
    showToast(`❌ Ошибка загрузки корзины: ${error.message}`);
    deletedWords = [];
  } else {
    deletedWords = data || [];
  }
  selectedTrashIds.clear(); // Сбрасываем выбор при обновлении
  renderTrashList();
}

function renderTrashList() {
  const container = document.getElementById("trash-list");
  if (!container) return;

  if (deletedWords.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-sub);">Корзина пуста</div>`;
  } else {
    container.innerHTML = deletedWords
      .map((word) => {
        const isSelected = selectedTrashIds.has(word.id as number);
        return `
            <div class="trash-item ${isSelected ? "selected" : ""}" id="trash-item-${word.id}">
                <div class="trash-item-selector">
                    <input type="checkbox" onclick="window.toggleTrashSelection(${word.id}, this.checked)" ${isSelected ? "checked" : ""} />
                </div>
                <div class="trash-item-info">
                    <div class="trash-item-word">${escapeHtml(word.word_kr)} - ${escapeHtml(word.translation)}</div>
                    <div class="trash-item-date">Удалено: ${new Date(word.deleted_at!).toLocaleDateString()}</div>
                </div>
                <div class="trash-item-actions">
                    <button class="btn-icon" title="Восстановить" onclick="window.restoreWord(${word.id})">🔄</button>
                    <button class="btn-icon" title="Удалить навсегда" onclick="window.permanentlyDeleteWord(${word.id}, this)" style="color: var(--danger);">🗑️</button>
                </div>
            </div>
        `;
      })
      .join("");
  }
  updateTrashActionButtons();
  updateTrashBadge();
}

export function updateTrashBadge() {
  const badge = document.getElementById("trash-count-badge");
  if (badge) {
    const count = deletedWords.length;
    badge.textContent = String(count);
    badge.style.display = count > 0 ? "inline-flex" : "none";
  }
}

export function setupTrash() {
  const trashModal = document.getElementById("trash-modal");
  if (trashModal) {
    const observer = new MutationObserver(() => {
      if (trashModal.classList.contains("active")) {
        fetchDeletedWords();
      }
    });
    observer.observe(trashModal, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  const emptyBtn = document.getElementById("empty-trash-btn");
  if (emptyBtn) {
    emptyBtn.onclick = () => bulkPermanentDelete();
  }

  const restoreAllBtn = document.getElementById("restore-all-btn");
  if (restoreAllBtn) {
    restoreAllBtn.onclick = () => bulkRestore();
  }

  const selectAllCheckbox = document.getElementById(
    "trash-select-all-checkbox",
  ) as HTMLInputElement;
  if (selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
      toggleSelectAllTrash(selectAllCheckbox.checked);
    };
  }
}

function toggleTrashSelection(id: number, isSelected: boolean) {
  if (isSelected) {
    selectedTrashIds.add(id);
  } else {
    selectedTrashIds.delete(id);
  }

  const itemEl = document.getElementById(`trash-item-${id}`);
  if (itemEl) {
    itemEl.classList.toggle("selected", isSelected);
  }

  updateTrashActionButtons();
}

function toggleSelectAllTrash(selectAll: boolean) {
  selectedTrashIds.clear();
  if (selectAll) {
    deletedWords.forEach((w) => selectedTrashIds.add(w.id as number));
  }

  document.querySelectorAll(".trash-item").forEach((el) => {
    const checkbox = el.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    if (checkbox) {
      checkbox.checked = selectAll;
      el.classList.toggle("selected", selectAll);
    }
  });

  updateTrashActionButtons();
}

function updateTrashActionButtons() {
  const emptyBtn = document.getElementById(
    "empty-trash-btn",
  ) as HTMLButtonElement;
  const restoreAllBtn = document.getElementById(
    "restore-all-btn",
  ) as HTMLButtonElement;
  const selectAllContainer = document.getElementById(
    "trash-select-all-container",
  );
  const selectAllCheckbox = document.getElementById(
    "trash-select-all-checkbox",
  ) as HTMLInputElement;

  if (!emptyBtn || !restoreAllBtn || !selectAllContainer || !selectAllCheckbox)
    return;

  const hasDeletedWords = deletedWords.length > 0;
  const selectedCount = selectedTrashIds.size;

  selectAllContainer.style.display = hasDeletedWords ? "flex" : "none";
  emptyBtn.style.display = hasDeletedWords ? "block" : "none";
  restoreAllBtn.style.display = hasDeletedWords ? "block" : "none";

  if (selectedCount > 0) {
    restoreAllBtn.textContent = `Восстановить (${selectedCount})`;
    emptyBtn.textContent = `Удалить (${selectedCount})`;
  } else {
    restoreAllBtn.textContent = "Восстановить все";
    emptyBtn.textContent = "Очистить корзину";
  }

  if (selectAllCheckbox) {
    selectAllCheckbox.checked =
      hasDeletedWords && selectedCount === deletedWords.length;
    selectAllCheckbox.indeterminate =
      selectedCount > 0 && selectedCount < deletedWords.length;
  }
}

async function restoreWord(id: number) {
  const word = deletedWords.find((w) => w.id === id);
  if (!word) return;

  const el = document.getElementById(`trash-item-${id}`);
  if (el) {
    // Анимация "вылетания" вверх (восстановление)
    el.style.transition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.opacity = "0";
    el.style.transform = "translateY(-50px) scale(0.95)";
    await new Promise((r) => setTimeout(r, 400));
  }

  deletedWords = deletedWords.filter((w) => w.id !== id);
  word.deleted_at = undefined;
  state.dataStore.unshift(word);
  renderTrashList();
  render();
  showToast("✅ Слово восстановлено");

  await client.from("vocabulary").update({ deleted_at: null }).eq("id", id);
}

async function permanentlyDeleteWord(id: number, btn: HTMLElement) {
  openConfirm(
    "Удалить это слово навсегда? Это действие нельзя отменить.\nВведите DELETE для подтверждения:",
    async () => {
      const card = btn.closest(".trash-item") as HTMLElement;
      if (card) {
        card.style.transition = "all 0.3s ease";
        card.style.opacity = "0";
        card.style.transform = "scale(0.9)";
        await new Promise((r) => setTimeout(r, 300));
      }

      deletedWords = deletedWords.filter((w) => w.id !== id);
      renderTrashList();
      showToast("🗑️ Слово удалено навсегда");

      await client.from("vocabulary").delete().eq("id", id);
    },
    {
      showInput: true,
      inputPlaceholder: "DELETE",
      onValidate: async (val) => {
        if (val.trim() !== "DELETE") {
          showToast("❌ Введите DELETE");
          return false;
        }
        return true;
      },
    },
  );
}

async function bulkPermanentDelete() {
  const idsToDelete =
    selectedTrashIds.size > 0
      ? Array.from(selectedTrashIds)
      : deletedWords.map((w) => w.id as number);
  if (idsToDelete.length === 0) {
    showToast("⚠️ Ничего не выбрано");
    return;
  }

  openConfirm(
    `Удалить навсегда ${idsToDelete.length} слов(а)?\nЭто действие нельзя отменить.\nВведите DELETE для подтверждения:`,
    async () => {
      // Animate and remove from UI
      for (const id of idsToDelete) {
        const card = document.getElementById(`trash-item-${id}`);
        if (card) {
          card.style.transition = "all 0.3s ease";
          card.style.opacity = "0";
          card.style.transform = "scale(0.9)";
        }
      }
      await new Promise((r) => setTimeout(r, 300));

      deletedWords = deletedWords.filter(
        (w) => !idsToDelete.includes(w.id as number),
      );
      selectedTrashIds.clear();
      renderTrashList();
      showToast(`🗑️ Удалено навсегда: ${idsToDelete.length} слов`);

      await client.from("vocabulary").delete().in("id", idsToDelete);
    },
    {
      showInput: true,
      inputPlaceholder: "DELETE",
      onValidate: async (val) => {
        if (val.trim() !== "DELETE") {
          showToast("❌ Введите DELETE");
          return false;
        }
        return true;
      },
    },
  );
}

async function bulkRestore() {
  const idsToRestore =
    selectedTrashIds.size > 0
      ? Array.from(selectedTrashIds)
      : deletedWords.map((w) => w.id as number);
  if (idsToRestore.length === 0) {
    showToast("⚠️ Ничего не выбрано");
    return;
  }

  openConfirm(`Восстановить ${idsToRestore.length} слов(а)?`, async () => {
    // Анимация для всех выбранных элементов перед удалением из DOM
    for (const id of idsToRestore) {
      const el = document.getElementById(`trash-item-${id}`);
      if (el) {
        el.style.transition = "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.opacity = "0";
        el.style.transform = "translateY(-50px) scale(0.95)";
      }
    }
    await new Promise((r) => setTimeout(r, 400));

    const wordsToRestore = deletedWords.filter((w) =>
      idsToRestore.includes(w.id as number),
    );

    // Optimistic UI update
    deletedWords = deletedWords.filter(
      (w) => !idsToRestore.includes(w.id as number),
    );
    wordsToRestore.forEach((w) => {
      w.deleted_at = undefined;
      state.dataStore.unshift(w);
    });

    selectedTrashIds.clear();
    renderTrashList();
    render();
    showToast(`✅ Восстановлено слов: ${wordsToRestore.length}`);

    // Server update
    const { error } = await client
      .from("vocabulary")
      .update({ deleted_at: null })
      .in("id", idsToRestore);
    if (error) {
      showToast(`❌ Ошибка восстановления: ${error.message}`);
      // Revert UI on error
      deletedWords.push(...wordsToRestore);
      state.dataStore = state.dataStore.filter(
        (w) => !idsToRestore.includes(w.id as number),
      );
      renderTrashList();
      render();
    }
  });
}

declare global {
  interface Window {
    restoreWord: typeof restoreWord;
    permanentlyDeleteWord: typeof permanentlyDeleteWord;
    toggleTrashSelection: typeof toggleTrashSelection;
  }
}

window.restoreWord = restoreWord;
window.permanentlyDeleteWord = permanentlyDeleteWord;
window.toggleTrashSelection = toggleTrashSelection;
