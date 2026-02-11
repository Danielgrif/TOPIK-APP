import { state } from "../core/state.ts";
import { client } from "../core/supabaseClient.ts";
import { openModal, closeModal, openConfirm } from "./ui_modal.ts";
import { showToast } from "../utils/utils.ts";
// import { render } from "./ui_card.ts"; // Убираем, чтобы разорвать цикл
import { DB_TABLES } from "../core/constants.ts";
import { Word } from "../types/index.ts";

let onUpdateCallback: (() => void) | null = null;

function populateSuggestions() {
  const topics = new Set<string>();
  const categories = new Set<string>();

  state.dataStore.forEach((word) => {
    const topic = word.topic || word.topic_ru || word.topic_kr;
    const category = word.category || word.category_ru || word.category_kr;
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
  const topicInput = document.getElementById(
    "edit-word-topic",
  ) as HTMLInputElement;
  const catInput = document.getElementById(
    "edit-word-category",
  ) as HTMLInputElement;

  if (idInput) idInput.value = String(word.id);
  if (krInput) krInput.value = word.word_kr || "";
  if (ruInput) ruInput.value = word.translation || "";

  // Берем текущую тему/категорию (учитывая двуязычные поля)
  const topic = word.topic || word.topic_ru || word.topic_kr || "";
  const category = word.category || word.category_ru || word.category_kr || "";

  if (topicInput) topicInput.value = topic;
  if (catInput) catInput.value = category;

  // Inject Level Selector if not present
  let levelSelect = document.getElementById(
    "edit-word-level",
  ) as HTMLSelectElement;
  if (!levelSelect && catInput) {
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
    catInput.parentNode?.insertBefore(container, catInput.nextSibling);
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
  if (!grammarInput && catInput && catInput.parentNode) {
    const container = document.createElement("div");
    container.style.marginTop = "15px";
    container.innerHTML = `
      <label style="display:block; font-size:12px; font-weight:bold; color:var(--text-tertiary); margin-bottom:5px;">ГРАММАТИКА / ИНФО</label>
      <textarea id="edit-word-grammar" class="auth-input" style="width:100%; min-height:80px; resize:vertical; font-family:inherit;"></textarea>
    `;
    const ref = levelSelect ? levelSelect.parentNode : catInput;
    if (ref) ref.parentNode?.insertBefore(container, ref.nextSibling);
    grammarInput = document.getElementById(
      "edit-word-grammar",
    ) as HTMLTextAreaElement;
  }

  if (grammarInput) {
    grammarInput.value = word.grammar_info || "";
  }

  populateSuggestions();
  openModal("edit-word-modal");
}

export async function saveWordChanges() {
  const idInput = document.getElementById("edit-word-id") as HTMLInputElement;
  const krInput = document.getElementById("edit-word-kr") as HTMLInputElement;
  const ruInput = document.getElementById("edit-word-ru") as HTMLInputElement;
  const topicInput = document.getElementById(
    "edit-word-topic",
  ) as HTMLInputElement;
  const catInput = document.getElementById(
    "edit-word-category",
  ) as HTMLInputElement;
  const levelSelect = document.getElementById(
    "edit-word-level",
  ) as HTMLSelectElement;
  const grammarInput = document.getElementById(
    "edit-word-grammar",
  ) as HTMLTextAreaElement;

  const id = idInput.value;
  const updates: Partial<Word> = {
    word_kr: krInput.value.trim(),
    translation: ruInput.value.trim(),
    topic: topicInput.value.trim(),
    category: catInput.value.trim(),
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
  const { error } = await client
    .from(DB_TABLES.VOCABULARY)
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Update error:", error);
    showToast("Ошибка сохранения: " + error.message);
  } else {
    showToast("✅ Слово обновлено");
    closeModal("edit-word-modal");
    if (onUpdateCallback) onUpdateCallback(); // Вызываем callback для перерисовки

    // Обновляем фильтры, чтобы новая тема появилась в списке
    import("./ui_filters.ts").then((m) => m.populateFilters());
  }
}

export async function deleteWord() {
  const idInput = document.getElementById("edit-word-id") as HTMLInputElement;
  const id = idInput.value;

  if (!id) return;

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
    if (onUpdateCallback) onUpdateCallback();
    closeModal("edit-word-modal");

    // Soft delete
    const { error } = await client
      .from(DB_TABLES.VOCABULARY)
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      showToast(`❌ Ошибка: ${error.message}`);
      // Восстанавливаем слово в UI при ошибке
      state.dataStore.splice(wordIndex, 0, wordBackup);
      if (onUpdateCallback) onUpdateCallback();
    } else {
      showToast("🗑️ Слово перемещено в корзину");
    }
  });
}

declare global {
  interface Window {
    openEditWordModal: typeof openEditWordModal;
    saveWordChanges: typeof saveWordChanges;
    deleteWord: typeof deleteWord;
  }
}

window.openEditWordModal = openEditWordModal;
window.saveWordChanges = saveWordChanges;
window.deleteWord = deleteWord;
