import { state } from "./state.ts";
import { Word } from "../types/index.ts";
import { escapeHtml, getIconForValue } from "../utils/utils.ts";
import { collectionsState } from "./collections_data.ts";
import { openConfirm } from "../ui/ui_modal.ts";

// Helper to avoid circular dependencies
const getUiCard = () => import("../ui/ui_card.ts");
const getUiBulk = () => import("../ui/ui_bulk.ts");
const getUiEditWord = () => import("../ui/ui_edit_word.ts");
const getUiCustomWords = () => import("../ui/ui_custom_words.ts");

function getAccuracy(id: string | number): number {
  const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
  if (stats.attempts === 0) return 0;
  return Math.min(100, Math.round((stats.correct / stats.attempts) * 100));
}

function setupLongPress(el: HTMLElement, itemId: string | number) {
  let timer: number | null = null;
  const duration = 600;

  const start = (e: Event) => {
    if (
      state.selectMode ||
      (e.target as HTMLElement).closest("button, input, textarea")
    )
      return;

    timer = window.setTimeout(() => {
      getUiBulk().then((m) => {
        if (!state.selectMode) {
          m.toggleSelectMode();
          el.dataset.lpHandled = "true";
          m.toggleSelection(itemId);
          if (navigator.vibrate) navigator.vibrate(50);
        }
      });
    }, duration);
  };

  const clear = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  el.addEventListener("touchstart", start, { passive: true });
  el.addEventListener("touchend", clear, { passive: true });
  el.addEventListener("touchmove", clear, { passive: true });
  el.addEventListener("mousedown", start);
  el.addEventListener("mouseup", clear);
  el.addEventListener("mouseleave", clear);
}

export function createCardElement(item: Word, index: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  el.tabIndex = 0;
  el.onkeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      el.click();
    }
  };
  el.dataset.wordId = String(item.id);

  if (state.selectMode) {
    el.classList.add("select-mode");
    if (state.selectedWords.has(item.id)) el.classList.add("selected");
  }

  if (state.hanjaMode) el.classList.add("hanja-mode");
  if (item.type === "grammar") el.classList.add("grammar-card");
  if (state.learned.has(item.id)) el.classList.add("learned");
  if (state.mistakes.has(item.id)) el.classList.add("has-mistake");

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const checkbox = document.createElement("div");
  checkbox.className = "select-checkbox";
  if (state.selectedWords.has(item.id)) checkbox.innerHTML = "✓";
  el.appendChild(checkbox);

  const front = createCardFront(item, index);
  const back = createCardBack(item);

  inner.appendChild(front);
  inner.appendChild(back);
  el.appendChild(inner);

  setupLongPress(el, item.id);

  let imageLoaded = false;
  el.onclick = (e) => {
    if (el.dataset.lpHandled) return;

    if (state.selectMode) {
      e.stopPropagation();
      getUiBulk().then((m) => m.toggleSelection(item.id));
      return;
    }

    if ((e.target as HTMLElement).closest("button")) return;

    el.classList.toggle("revealed");
    if (navigator.vibrate) navigator.vibrate(10);
    // playTone("flip"); // Removed to avoid dependency on utils/audio here, or import it if needed

    if (el.classList.contains("revealed") && !imageLoaded) {
      const img = el.querySelector(".card-image") as HTMLImageElement;
      if (img && img.dataset.src) {
        img.src = img.dataset.src;
        imageLoaded = true;
        // Prefetching logic can be handled by the caller or a separate utility
      }
    }
  };
  return el;
}

function createCardFront(item: Word, _index: number): HTMLElement {
  const front = document.createElement("div");
  front.className = "card-front";
  const isFav = state.favorites.has(item.id);

  const topRow = document.createElement("div");
  topRow.className = "card-top-row";

  const speakBtn = document.createElement("button");
  speakBtn.className = "icon-btn";
  speakBtn.innerHTML = "🔊";
  speakBtn.setAttribute("data-action", "speak-word");
  speakBtn.setAttribute("data-value", String(item.id));
  speakBtn.title = "Озвучить";
  topRow.appendChild(speakBtn);

  const addListBtn = document.createElement("button");
  addListBtn.className = "icon-btn";
  addListBtn.innerHTML = "📁";
  addListBtn.setAttribute("data-action", "add-to-list");
  addListBtn.setAttribute("data-value", String(item.id));
  addListBtn.title = "Добавить в список";
  topRow.appendChild(addListBtn);

  if (
    collectionsState.currentCollectionFilter &&
    collectionsState.currentCollectionFilter !== "my-custom" &&
    collectionsState.currentCollectionFilter !== "uncategorized"
  ) {
    const removeListBtn = document.createElement("button");
    removeListBtn.className = "icon-btn";
    removeListBtn.innerHTML = "➖";
    removeListBtn.title = "Убрать из этого списка";
    removeListBtn.style.color = "var(--danger)";
    removeListBtn.setAttribute("data-action", "remove-from-list");
    removeListBtn.setAttribute("data-value", String(item.id));
    topRow.appendChild(removeListBtn);
  }

  const favBtn = document.createElement("button");
  favBtn.className = `icon-btn fav-btn ${isFav ? "active" : ""}`;
  favBtn.innerHTML = isFav ? "❤️" : "🤍";
  favBtn.title = isFav ? "Убрать из избранного" : "В избранное";
  favBtn.setAttribute("data-action", "toggle-favorite");
  favBtn.setAttribute("data-value", String(item.id));
  topRow.appendChild(favBtn);

  front.appendChild(topRow);

  const mainContent = document.createElement("div");
  mainContent.className = "card-main";

  const levelSection = document.createElement("div");
  levelSection.className = "front-section";
  const levelBadge = document.createElement("div");
  levelBadge.className = "card-level-stars";
  levelBadge.textContent = item.level || "★☆☆";
  levelSection.appendChild(levelBadge);
  mainContent.appendChild(levelSection);

  const wordSection = document.createElement("div");
  wordSection.className = "front-section";

  let statusIcon = "";
  if (state.learned.has(item.id)) statusIcon = "✅";
  else if (state.mistakes.has(item.id)) statusIcon = "❌";

  const wordWrapper = document.createElement("div");
  wordWrapper.style.display = "flex";
  wordWrapper.style.alignItems = "center";
  wordWrapper.style.justifyContent = "center";
  wordWrapper.style.gap = "10px";

  const wordDiv = document.createElement("div");
  wordDiv.className = "word";
  wordDiv.textContent = item.word_kr || "";
  wordDiv.title = "Нажмите, чтобы скопировать";
  wordDiv.style.cursor = "copy";
  wordDiv.setAttribute("data-action", "copy-word");
  wordDiv.setAttribute("data-value", item.word_kr);
  wordWrapper.appendChild(wordDiv);

  if (statusIcon) {
    const iconDiv = document.createElement("div");
    iconDiv.textContent = statusIcon;
    iconDiv.style.fontSize = "24px";
    wordWrapper.appendChild(iconDiv);
  }

  wordSection.appendChild(wordWrapper);
  mainContent.appendChild(wordSection);

  if (item.word_hanja) {
    const hanjaSection = document.createElement("div");
    hanjaSection.className = "front-section";
    const hanjaContainer = document.createElement("div");
    hanjaContainer.className = "hanja-container";
    [...item.word_hanja].forEach((char) => {
      const span = document.createElement("span");
      span.className = "hanja-char";
      span.setAttribute("role", "button");
      span.tabIndex = 0;
      span.textContent = char;
      span.setAttribute("data-action", "open-hanja-modal");
      span.setAttribute("data-value", char);
      span.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          span.click();
        }
      };
      hanjaContainer.appendChild(span);
    });
    mainContent.appendChild(hanjaContainer);
  }

  if (item.grammar_info) {
    const grammarBadge = document.createElement("div");
    grammarBadge.className = "grammar-badge";
    grammarBadge.textContent = "📘 Грамматика";
    grammarBadge.style.cursor = "pointer";
    grammarBadge.setAttribute("data-action", "open-grammar-modal");
    grammarBadge.setAttribute("data-value", String(item.id));
    mainContent.appendChild(grammarBadge);
  }

  const stats = state.wordHistory[item.id] || { attempts: 0, correct: 0 };
  if (stats.attempts > 0) {
    const acc = getAccuracy(item.id);
    let statusText = "В процессе";
    let statusClass = "neutral";

    if (stats.attempts < 3) {
      statusText = "Новое";
    } else if (acc >= 90) {
      statusText = "Мастер";
      statusClass = "success";
    } else if (acc >= 70) {
      statusText = "Хорошо";
      statusClass = "success";
    } else if (acc >= 40) {
      statusText = "Средне";
    } else {
      statusText = "Слабо";
      statusClass = "failure";
    }

    const statEl = document.createElement("div");
    statEl.className = `card-stat-pill ${statusClass}`;
    statEl.innerHTML = `<span>🎯 ${acc}%</span><span class="sep">|</span><span>${statusText}</span>`;
    mainContent.appendChild(statEl);
  }

  const topicRu = item.topic_ru || "Общее";
  const topicKr = item.topic_kr || "기타";
  const catRu = item.category_ru || "Общее";
  const catKr = item.category_kr || "기타";

  const topicDisplay =
    topicRu === topicKr ? topicRu : `${topicRu} (${topicKr})`;
  const catDisplay = catRu === catKr ? catRu : `${catRu} (${catKr})`;

  const topicIcon = getIconForValue(topicRu, "🏷");
  const catIcon = getIconForValue(catRu, "🔹");

  const tagsDiv = document.createElement("div");
  tagsDiv.className = "card-tags";
  tagsDiv.innerHTML = `
      <span class="tag-pill topic">${topicIcon} ${escapeHtml(topicDisplay)}</span>
      <span class="tag-pill category">${catIcon} ${escapeHtml(catDisplay)}</span>
  `;
  if (item.isLocal) {
    tagsDiv.innerHTML += `<span class="tag-pill ai">⏳ AI</span>`;
  }
  mainContent.appendChild(tagsDiv);

  front.appendChild(mainContent);
  return front;
}

function createCardBack(item: Word): HTMLElement {
  const back = document.createElement("div");
  back.className = "card-back";

  const header = document.createElement("div");
  header.className = "card-back-header";
  header.innerHTML = `<div class="back-translation">${escapeHtml(item.translation || "")}</div>`;
  back.appendChild(header);

  const content = document.createElement("div");
  content.className = "card-back-scroll";

  // Image Section
  const imgWrapper = document.createElement("div");
  imgWrapper.style.marginBottom = "16px";

  const showImgBtn = document.createElement("button");
  showImgBtn.className = "btn-text";
  showImgBtn.style.width = "100%";
  showImgBtn.style.background = item.image
    ? "var(--surface-3)"
    : "var(--surface-1)";
  showImgBtn.style.border = item.image
    ? "none"
    : "1px dashed var(--border-color)";
  showImgBtn.style.borderRadius = "12px";
  showImgBtn.style.padding = "12px";
  showImgBtn.innerHTML = item.image
    ? "📷 Показать изображение"
    : "🖼️ Добавить изображение";

  const imgContainer = document.createElement("div");
  imgContainer.className = "back-image-container";
  imgContainer.style.display = "none";

  const img = document.createElement("img");
  img.dataset.src = item.image;
  img.className = "card-image";
  img.style.objectFit = "cover";
  img.alt = item.word_kr;
  img.draggable = false;

  const revealOverlay = document.createElement("div");
  revealOverlay.className = "back-image-overlay";
  revealOverlay.innerHTML = "<span>👁️ Скрыть</span>";

  showImgBtn.onclick = (e) => {
    e.stopPropagation();
    if (item.image) {
      showImgBtn.style.display = "none";
      imgContainer.style.display = "block";
    } else {
      getUiCard().then((m) =>
        m.openImagePicker(item, showImgBtn as HTMLButtonElement),
      );
    }
  };

  imgContainer.onclick = (e) => {
    e.stopPropagation();
    if (
      (e.target as HTMLElement).closest("button") ||
      (e.target as HTMLElement).closest("input")
    )
      return;
    if (item.image) {
      imgContainer.style.display = "none";
      showImgBtn.style.display = "block";
    }
  };

  // Image controls
  const zoomBtn = document.createElement("button");
  zoomBtn.className = "card-image-zoom-btn btn-icon";
  zoomBtn.title = "На весь экран";
  zoomBtn.innerHTML = "🔍";
  zoomBtn.style.left = "10px";
  zoomBtn.style.position = "absolute";
  zoomBtn.style.top = "10px";
  zoomBtn.style.zIndex = "20";
  zoomBtn.onclick = (e) => {
    e.stopPropagation();
    getUiCard().then((m) => m.showFullScreenImage(img.src, item.word_kr));
  };

  const regenBtn = document.createElement("button");
  regenBtn.className = "card-image-regenerate-btn btn-icon";
  regenBtn.title = "Сгенерировать AI";
  regenBtn.innerHTML = "🔄";
  regenBtn.onclick = (e) => {
    e.stopPropagation();
    // Capture the button element before the async call
    const buttonElement = e.currentTarget as HTMLButtonElement;
    getUiCard().then((m) => m.openImagePicker(item, buttonElement));
  };

  imgContainer.appendChild(img);
  imgContainer.appendChild(revealOverlay);
  imgContainer.appendChild(zoomBtn);
  imgContainer.appendChild(regenBtn);

  if (item.image) {
    imgWrapper.appendChild(imgContainer);
  }
  imgWrapper.insertBefore(showImgBtn, imgWrapper.firstChild);
  content.appendChild(imgWrapper);

  // Examples
  if (item.example_kr && item.example_kr.trim()) {
    const exBox = document.createElement("div");
    exBox.className = "back-section";
    exBox.style.borderLeft = "3px solid var(--section-info-border)";
    exBox.style.backgroundColor = "var(--section-info-bg)";
    exBox.style.padding = "12px 12px 12px 16px";
    exBox.style.marginBottom = "16px";
    exBox.style.borderRadius = "8px";

    const safeKr = escapeHtml(item.example_kr);
    const safeWord = escapeHtml(item.word_kr || "");
    const highlightedKr = safeWord
      ? safeKr.replace(
          new RegExp(escapeHtml(safeWord), "gi"),
          `<span class="highlight">$&</span>`,
        )
      : safeKr;

    exBox.innerHTML = `
        <div class="section-label" style="color: var(--section-info-border); font-weight: bold; margin-bottom: 4px;">💬 Пример</div>
        <div class="back-example-kr">${highlightedKr}</div>
        <div class="back-example-ru">${escapeHtml(item.example_ru || "")}</div>
    `;
    content.appendChild(exBox);
  }

  // Relations (Synonyms/Antonyms)
  if (item.synonyms || item.antonyms) {
    const relationsBox = document.createElement("div");
    relationsBox.className = "back-section";
    let relationsHTML = '<div class="section-label">⛓️ Связи</div>';

    if (item.synonyms) {
      const synChips = item.synonyms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `<span class="rel-chip syn">${escapeHtml(s)}</span>`)
        .join("");
      if (synChips) {
        relationsHTML += `<div class="relation-row"><span class="rel-icon">↔️</span><div class="rel-chips">${synChips}</div></div>`;
      }
    }
    if (item.antonyms) {
      const antChips = item.antonyms
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `<span class="rel-chip ant">${escapeHtml(s)}</span>`)
        .join("");
      if (antChips) {
        relationsHTML += `<div class="relation-row"><span class="rel-icon">≠</span><div class="rel-chips">${antChips}</div></div>`;
      }
    }

    relationsBox.innerHTML = relationsHTML;
    content.appendChild(relationsBox);
  }

  // Synonyms/Antonyms/Notes/Grammar sections...
  // (Simplified for brevity, similar logic as above)
  if (item.my_notes && item.my_notes.trim()) {
    const noteBox = document.createElement("div");
    noteBox.className = "back-section";
    noteBox.innerHTML = `<div class="section-label">📝 Заметки</div><div class="info-item">${escapeHtml(item.my_notes)}</div>`;
    content.appendChild(noteBox);
  }

  back.appendChild(content);

  // Actions Footer
  const actions = document.createElement("div");
  actions.className = "card-back-actions";

  if (item.created_by) {
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn";
    editBtn.textContent = "✏️ Изменить";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      getUiEditWord().then((m) => m.openEditWordModal(String(item.id)));
    };
    actions.appendChild(editBtn);
  }

  const isL = state.learned.has(item.id);
  const isM = state.mistakes.has(item.id);
  if (isL || isM) {
    const resetBtn = document.createElement("button");
    resetBtn.className = "action-btn action-reset";
    resetBtn.textContent = "Сброс";
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      getUiCard().then((m) => m.resetProgress(item.id));
    };
    actions.appendChild(resetBtn);
  } else {
    const mistakeBtn = document.createElement("button");
    mistakeBtn.className = "action-btn action-mistake";
    mistakeBtn.textContent = "Забыл";
    mistakeBtn.onclick = (e) => {
      e.stopPropagation();
      getUiCard().then((m) => m.markMistake(item.id));
    };
    const learnedBtn = document.createElement("button");
    learnedBtn.className = "action-btn action-learned";
    learnedBtn.textContent = "Знаю";
    learnedBtn.onclick = (e) => {
      e.stopPropagation();
      getUiCard().then((m) => m.markLearned(item.id));
    };
    actions.appendChild(mistakeBtn);
    actions.appendChild(learnedBtn);
  }

  if (item.isLocal) {
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn";
    delBtn.innerHTML = "🗑️";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      openConfirm("Удалить заявку?", () => {
        getUiCustomWords().then((m) => m.deleteCustomWord(item.id));
      });
    };
    actions.appendChild(delBtn);
  }

  back.appendChild(actions);
  return back;
}

export function createListItem(item: Word, _index: number): HTMLElement {
  const container = document.createElement("div");
  container.className = "list-item-wrapper";
  container.dataset.wordId = String(item.id);

  if (state.selectMode) {
    container.classList.add("select-mode");
    if (state.selectedWords.has(item.id)) container.classList.add("selected");
  }

  const el = document.createElement("div");
  el.className = "list-item";
  const isFav = state.favorites.has(item.id);

  const checkbox = document.createElement("div");
  checkbox.className = "select-checkbox";
  if (state.selectedWords.has(item.id)) checkbox.innerHTML = "✓";
  el.appendChild(checkbox);

  const mainDiv = document.createElement("div");
  mainDiv.className = "list-col-main";
  mainDiv.innerHTML = `
    <div class="list-word-row">
        <div class="list-word">${escapeHtml(item.word_kr)}</div>
    </div>
    <div class="list-trans">${escapeHtml(item.translation || "")}</div>
  `;
  el.appendChild(mainDiv);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "list-col-actions";

  const favBtn = document.createElement("button");
  favBtn.className = `btn-icon list-action-btn ${isFav ? "active" : ""}`;
  favBtn.textContent = isFav ? "❤️" : "🤍";
  favBtn.setAttribute("data-action", "toggle-favorite");
  favBtn.setAttribute("data-value", String(item.id));
  actionsDiv.appendChild(favBtn);
  el.appendChild(actionsDiv);

  setupLongPress(el, item.id);

  el.onclick = (e) => {
    if (el.dataset.lpHandled) return;
    if (state.selectMode) {
      e.stopPropagation();
      getUiBulk().then((m) => m.toggleSelection(item.id));
      return;
    }
    if ((e.target as HTMLElement).closest("button")) return;
    container.classList.toggle("expanded");
  };

  container.appendChild(el);
  return container;
}
