import { state } from "../core/state.ts";
import { client } from "../core/supabaseClient.ts";
import { openModal, closeModal, openConfirm } from "./ui_modal.ts";
import { showToast } from "../utils/utils.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";

let onUpdateCallback: (() => void) | null = null;

function populateSuggestions() {
  const topics = new Set<string>();
  const categories = new Set<string>();

  state.dataStore.forEach((word) => {
    const topic = word.topic_ru; // Предлагаем русские названия
    const category = word.category_ru;
    if (topic) topics.add(topic);
    if (category) categories.add(category);
  });

  const topicDatalist = document.getElementById("topic-suggestions");
  if (topicDatalist) {
    topicDatalist.innerHTML = Array.from(topics)
      .map((t) => `<option value="${t}"></option>`)
      .join("");
  }

  const categoryDatalist = document.getElementById("category-suggestions");
  if (categoryDatalist) {
    categoryDatalist.innerHTML = Array.from(categories)
      .map((c) => `<option value="${c}"></option>`)
      .join("");
  }
}

export function openEditWordModal(id: string | number, onUpdate?: () => void) {
  onUpdateCallback = onUpdate || null;

  const word = state.dataStore.find((w) => String(w.id) === String(id));
  if (!word) {
    showToast("Слово не найдено");
    return;
  }

  const idInput = document.getElementById("edit-word-id") as HTMLInputElement;
  const krInput = document.getElementById("edit-word-kr") as HTMLInputElement;
  const ruInput = document.getElementById("edit-word-ru") as HTMLInputElement;

  // Обновляем HTML модального окна, чтобы добавить поля для KR
  // (Предполагается, что в HTML шаблоне есть эти ID, или мы их сейчас создадим динамически если их нет)
  // Для простоты используем существующие инпуты как RU, и добавим KR

  const topicInputRu = document.getElementById(
    "edit-word-topic",
  ) as HTMLInputElement;
  const catInputRu = document.getElementById(
    "edit-word-category",
  ) as HTMLInputElement;

  if (idInput) idInput.value = String(word.id);
  if (krInput) krInput.value = word.word_kr || "";
  if (ruInput) ruInput.value = word.translation || "";

  if (topicInputRu) topicInputRu.value = word.topic_ru || "";
  if (catInputRu) catInputRu.value = word.category_ru || "";

  // TODO: В идеале нужно добавить инпуты для topic_kr и category_kr в HTML шаблон
  // Но пока сохраним совместимость, используя только RU поля для редактирования

  // Inject Level Selector if not present
  let levelSelect = document.getElementById(
    "edit-word-level",
  ) as HTMLSelectElement;
  if (!levelSelect && catInputRu) {
    const container = document.createElement("div");
    container.style.marginTop = "15px";
    container.innerHTML = `
      <label style="display:block; font-size:12px; font-weight:bold; color:var(--text-tertiary); margin-bottom:5px;">УРОВЕНЬ СЛОЖНОСТИ</label>
      <select id="edit-word-level" class="auth-input" style="width:100%;">
        <option value="★☆☆">Высокий (★)</option>
        <option value="★★☆">Средний (★★)</option>
        <option value="★★★">Начальный (★★★)</option>
      </select>
    `;
    catInputRu.parentNode?.insertBefore(container, catInputRu.nextSibling);
    levelSelect = document.getElementById(
      "edit-word-level",
    ) as HTMLSelectElement;
  }

  if (levelSelect) {
    // Default to 'High' (★☆☆) if not set, or match existing
    // Logic: 1 star = High, 3 stars = Low
    levelSelect.value = word.level || "★☆☆";
  }

  // Inject Grammar Info if not present
  let grammarInput = document.getElementById(
    "edit-word-grammar",
  ) as HTMLTextAreaElement;
  if (!grammarInput && catInputRu && catInputRu.parentNode) {
    const container = document.createElement("div");
    container.style.marginTop = "15px";
    container.innerHTML = `
      <label style="display:block; font-size:12px; font-weight:bold; color:var(--text-tertiary); margin-bottom:5px;">ГРАММАТИКА / ИНФО</label>
      <textarea id="edit-word-grammar" class="auth-input" style="width:100%; min-height:80px; resize:vertical; font-family:inherit;"></textarea>
    `;
    const ref = levelSelect ? levelSelect.parentNode : catInputRu;
    if (ref) ref.parentNode?.insertBefore(container, ref.nextSibling);
    grammarInput = document.getElementById(
      "edit-word-grammar",
    ) as HTMLTextAreaElement;
  }

  if (grammarInput) {
    grammarInput.value = word.grammar_info || "";
  }

  populateSuggestions();

  // --- Проверка прав доступа ---
  // Системные слова (created_by === null) или чужие слова доступны только для чтения
  const isOwner = state.currentUser && word.created_by === state.currentUser.id;
  const canEdit = !!word.created_by && isOwner;

  const modalEl = document.getElementById("edit-word-modal");
  if (modalEl) {
    // Блокируем/разблокируем инпуты
    const inputs = modalEl.querySelectorAll("input, select, textarea");
    inputs.forEach((el) => {
      (el as HTMLInputElement).disabled = !canEdit;
    });

    // Скрываем/показываем кнопки действий
    const saveBtn = modalEl.querySelector(
      '[data-action="save-word-changes"]',
    ) as HTMLElement;
    const deleteBtn = modalEl.querySelector(
      '[data-action="delete-word"]',
    ) as HTMLElement;

    if (saveBtn) saveBtn.style.display = canEdit ? "" : "none";
    if (deleteBtn) deleteBtn.style.display = canEdit ? "" : "none";
  }

  const modal = document.getElementById("edit-word-modal");
  if (modal) {
    const body = modal.querySelector(".modal-body-container");
    if (body) body.scrollTop = 0;
  }

  openModal("edit-word-modal");
}

export async function saveWordChanges() {
  const idInput = document.getElementById("edit-word-id") as HTMLInputElement;
  const krInput = document.getElementById("edit-word-kr") as HTMLInputElement;
  const ruInput = document.getElementById("edit-word-ru") as HTMLInputElement;
  const topicInputRu = document.getElementById(
    "edit-word-topic",
  ) as HTMLInputElement;
  const catInputRu = document.getElementById(
    "edit-word-category",
  ) as HTMLInputElement;
  const levelSelect = document.getElementById(
    "edit-word-level",
  ) as HTMLSelectElement;
  const grammarInput = document.getElementById(
    "edit-word-grammar",
  ) as HTMLTextAreaElement;

  const id = idInput.value;
  const word = state.dataStore.find((w) => String(w.id) === String(id));

  if (
    word &&
    (!word.created_by ||
      (state.currentUser && word.created_by !== state.currentUser.id))
  ) {
    showToast("⛔ Системные слова нельзя изменять");
    return;
  }

  const updates: Partial<Word> = {
    word_kr: krInput.value.trim(),
    translation: ruInput.value.trim(),
    topic_ru: topicInputRu.value.trim(),
    // topic_kr: ... // Пока не редактируем KR
    category_ru: catInputRu.value.trim(),
    // category_kr: ...
    level: levelSelect ? levelSelect.value : "★☆☆",
    grammar_info: grammarInput ? grammarInput.value.trim() : undefined,
  };

  if (!updates.word_kr || !updates.translation) {
    showToast("Слово и перевод обязательны");
    return;
  }

  // Оптимистичное обновление интерфейса (сразу меняем данные в памяти)
  const wordIndex = state.dataStore.findIndex(
    (w) => String(w.id) === String(id),
  );
  if (wordIndex > -1) {
    state.dataStore[wordIndex] = { ...state.dataStore[wordIndex], ...updates };
  }

  // Отправка в базу данных
  const { error, data } = await client
    .from(DB_TABLES.VOCABULARY)
    .update(updates)
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("Update error:", error);
    showToast("Ошибка сохранения: " + error.message);
  } else if (!data || data.length === 0) {
    showToast("⚠️ Не удалось сохранить (нет прав или слово не найдено)");
  } else {
    showToast("✅ Слово обновлено");
    closeModal("edit-word-modal");

    const grid = document.getElementById("vocabulary-grid");
    const savedScroll = grid ? grid.scrollTop : 0;

    document.dispatchEvent(new CustomEvent("state-changed"));

    if (grid) grid.scrollTop = savedScroll;

    // Обновляем фильтры, чтобы новая тема появилась в списке
    import("./ui_filters.ts").then((m) => m.populateFilters());
    // Обновляем поиск
    if (window.updateSearchIndex) window.updateSearchIndex();
  }
}

export async function deleteWord() {
  const idInput = document.getElementById("edit-word-id") as HTMLInputElement;
  const id = idInput.value;

  if (!id) return;

  const word = state.dataStore.find((w) => String(w.id) === String(id));
  if (
    word &&
    (!word.created_by ||
      (state.currentUser && word.created_by !== state.currentUser.id))
  ) {
    showToast("⛔ Системные слова нельзя удалять");
    return;
  }

  openConfirm("Переместить это слово в корзину?", async () => {
    // Оптимистичное удаление
    const wordIndex = state.dataStore.findIndex(
      (w) => String(w.id) === String(id),
    );
    if (wordIndex === -1) return;
    const wordBackup = { ...state.dataStore[wordIndex] };

    if (wordIndex > -1) {
      state.dataStore.splice(wordIndex, 1);
    }
    if (state.searchResults) {
      state.searchResults = state.searchResults.filter(
        (w) => String(w.id) !== String(id),
      );
    }

    const grid = document.getElementById("vocabulary-grid");
    const savedScroll = grid ? grid.scrollTop : 0;

    if (onUpdateCallback) onUpdateCallback();
    closeModal("edit-word-modal");
    if (grid) grid.scrollTop = savedScroll;

    // Soft delete
    const { error, data } = await client
      .from(DB_TABLES.VOCABULARY)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select("id");

    if (error) {
      showToast(`❌ Ошибка: ${error.message}`);
      // Восстанавливаем слово в UI при ошибке
      state.dataStore.splice(wordIndex, 0, wordBackup);
      document.dispatchEvent(new CustomEvent("state-changed"));
    } else if (!data || data.length === 0) {
      showToast("⚠️ Не удалось удалить (нет прав)");
      // Восстанавливаем слово в UI при ошибке
      state.dataStore.splice(wordIndex, 0, wordBackup);
      document.dispatchEvent(new CustomEvent("state-changed"));
    } else {
      showToast("🗑️ Слово перемещено в корзину");
      // Обновляем поиск после удаления
      if (window.updateSearchIndex) window.updateSearchIndex();
    }
  });
}
