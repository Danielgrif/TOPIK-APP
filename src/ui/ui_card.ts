import { state } from "../core/state.ts";
import { speak, showToast } from "../utils/utils.ts";
import { scheduleSaveState, recordAttempt } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";
import { ensureSessionStarted, saveAndRender } from "./ui.ts";
import { Word } from "../types/index.ts";

// --- Virtual Scroll Constants (for List View) ---
const ITEM_HEIGHT_LIST = 72;
let ITEM_HEIGHT_GRID = 500;
const MIN_COL_WIDTH = 280;
const BUFFER_ITEMS = 10;
const GRID_GAP = 16;

let virtualScrollInitialized = false;
let scrollRafId: number | null = null;
let currentFilteredData: Word[] = [];
let resizeHandler: (() => void) | null = null;

let counterTimeout: number | null = null;

export function updateGridCardHeight() {
  // Header (~70) + Toolbar (~60) + BottomNav (~80) + Margins (~30) = ~240px
  // Оставляем место для интерфейса, остальное отдаем карточке
  const uiOffset = 240;
  const minHeight = 400;
  const availableHeight = window.innerHeight - uiOffset;
  ITEM_HEIGHT_GRID = Math.max(minHeight, availableHeight);
  document.documentElement.style.setProperty("--card-height", `${ITEM_HEIGHT_GRID}px`);
}

export function renderSkeletons() {
  const grid = document.getElementById("vocabulary-grid");
  if (!grid) return;
  updateGridCardHeight(); // FIX: Рассчитываем высоту ДО рендера скелетонов, чтобы избежать CLS
  grid.innerHTML = "";
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < 12; i++) {
    const el = document.createElement("div");
    el.className = "card skeleton";
    el.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-main">
                        <div class="word skeleton-pulse"></div>
                        <div class="hanja skeleton-pulse"></div>
                        <div class="card-meta-central">
                            <div class="meta-level skeleton-pulse"></div>
                            <div class="meta-info skeleton-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    fragment.appendChild(el);
  }
  grid.appendChild(fragment);
}

export function render() {
  const grid = document.getElementById("vocabulary-grid");
  if (!grid) return;

  // Оптимизация: кэшируем отфильтрованные данные один раз при рендере
  updateFilteredData();

  if (virtualScrollInitialized) {
    grid.removeEventListener("scroll", onVirtualScroll);
    if (resizeHandler) window.removeEventListener("resize", resizeHandler);
    virtualScrollInitialized = false;
  }
  grid.classList.remove("virtual-scroll-container", "list-view", "grid");
  grid.innerHTML = "";

  if (state.viewMode === "list") {
    grid.classList.add("list-view", "virtual-scroll-container");
    initVirtualScroll(grid);
    return;
  }

  updateGridCardHeight();
  grid.classList.add("grid", "virtual-scroll-container");
  initGridVirtualScroll(grid);
}

function renderEmptyState(grid: HTMLElement) {
  grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-sub); animation: fadeIn 0.5s;">
                <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🔍</div>
                <div style="font-size: 20px; font-weight: 800; margin-bottom: 10px;">Ничего не найдено</div>
                <div style="font-size: 14px; margin-bottom: 25px;">Попробуйте изменить запрос или фильтры</div>
                <button class="btn" onclick="resetSearchHandler()">Сбросить поиск</button>
            </div>
        `;
}

function updateFilteredData() {
  const source = (state.searchResults || state.dataStore || []) as Word[];
  currentFilteredData = source.filter((w) => {
    if (!w) return false;
    if (
      state.currentStar !== "all" &&
      state.currentStar !== "favorites" &&
      state.currentStar !== "mistakes" &&
      w.level !== state.currentStar
    )
      return false;
    if (state.currentStar === "favorites" && !state.favorites.has(w.id))
      return false;
    if (state.currentStar === "mistakes" && !state.mistakes.has(w.id))
      return false;
    if (w.type !== state.currentType) return false;
    const wTopic = w.topic || w.topic_ru || w.topic_kr || "";
    const topics = Array.isArray(state.currentTopic)
      ? state.currentTopic
      : [state.currentTopic];
    if (!topics.includes("all") && !topics.includes(wTopic)) return false;
    const wCat = w.category || w.category_ru || w.category_kr;
    if (state.currentCategory !== "all" && wCat !== state.currentCategory)
      return false;
    return true;
  });
}

function getFilteredData(): Word[] {
  return currentFilteredData;
}

function onVirtualScroll(_e: Event) {
  if (scrollRafId) return;

  scrollRafId = window.requestAnimationFrame(() => {
    const grid = document.getElementById("vocabulary-grid");
    if (grid) {
      if (state.viewMode === "list") {
        renderVisibleListItems({
          target: grid,
          sourceData: currentFilteredData,
        });
      } else {
        renderVisibleGridItems({
          target: grid,
          sourceData: currentFilteredData,
        });
      }
    }
    scrollRafId = null;

    // Update Card Counter (grid is already defined above)
    // const grid = document.getElementById("vocabulary-grid"); // Removed redeclaration
    const indicator = document.getElementById("card-counter-indicator");
    if (grid && indicator && currentFilteredData.length > 0) {
      const scrollTop = grid.scrollTop;
      // Calculate approximate index based on scroll position
      const itemHeight = state.viewMode === "list" ? ITEM_HEIGHT_LIST : (ITEM_HEIGHT_GRID + GRID_GAP);
      // For grid, we need to know columns.
      const gridWidth = grid.clientWidth;
      const gap = GRID_GAP; // CSS gap
      const colCount = state.viewMode === "list" ? 1 : Math.max(1, Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)));
      
      const currentRow = Math.floor((scrollTop + itemHeight / 2) / itemHeight);
      const currentIndex = Math.min(currentFilteredData.length, Math.max(1, currentRow * colCount + 1));
      
      indicator.textContent = `${currentIndex} / ${currentFilteredData.length}`;
      indicator.classList.add("visible");
      
      if (counterTimeout) clearTimeout(counterTimeout);
      counterTimeout = window.setTimeout(() => {
        indicator.classList.remove("visible");
      }, 2000);
    }
  });
}

function initGridVirtualScroll(grid: HTMLElement) {
  const sourceData = currentFilteredData;

  if (sourceData.length === 0) {
    renderEmptyState(grid);
    return;
  }

  const content = document.createElement("div");
  content.id = "virtual-grid-content";
  content.style.display = "contents";
  grid.appendChild(content);

  const sizer = document.createElement("div");
  sizer.className = "virtual-sizer";
  grid.appendChild(sizer);

  grid.addEventListener("scroll", onVirtualScroll);
  resizeHandler = () => {
    updateGridCardHeight();
    onVirtualScroll(new Event("resize"));
  };
  window.addEventListener("resize", resizeHandler);

  virtualScrollInitialized = true;

  renderVisibleGridItems({
    target: grid,
    sourceData,
    contentContainer: content,
    sizer,
  });
}

function renderVisibleGridItems(params: {
  target: HTMLElement;
  sourceData: Word[];
  contentContainer?: HTMLElement;
  sizer?: HTMLElement;
}) {
  const grid = params.target;
  if (!grid) return;

  const sourceData = params.sourceData || getFilteredData();
  const content =
    params.contentContainer || document.getElementById("virtual-grid-content");
  const sizer = params.sizer || grid.querySelector(".virtual-sizer");

  if (!content || !sizer) return;

  const gridWidth = grid.clientWidth;
  const gap = GRID_GAP;
  const colCount = Math.max(
    1,
    Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)),
  );

  const totalRows = Math.ceil(sourceData.length / colCount);
  const totalHeight = totalRows * (ITEM_HEIGHT_GRID + gap) - gap;

  (sizer as HTMLElement).style.height = `${totalHeight}px`;

  const scrollTop = grid.scrollTop;
  const viewportHeight = grid.clientHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / (ITEM_HEIGHT_GRID + gap)) - 2);
  const visibleRows = Math.ceil(viewportHeight / (ITEM_HEIGHT_GRID + gap)) + 4;

  const startIndex = startRow * colCount;
  const endIndex = Math.min(
    sourceData.length,
    startIndex + visibleRows * colCount,
  );

  content.innerHTML = "";

  const topSpacerHeight = startRow * (ITEM_HEIGHT_GRID + gap);
  if (topSpacerHeight > 0) {
    const spacer = document.createElement("div");
    spacer.style.gridColumn = "1 / -1";
    spacer.style.height = `${topSpacerHeight}px`;
    content.appendChild(spacer);
  }

  const visibleData = sourceData.slice(startIndex, endIndex);
  const fragment = document.createDocumentFragment();

  visibleData.forEach((item: Word, i: number) => {
    const absoluteIndex = startIndex + i;
    fragment.appendChild(createCardElement(item, absoluteIndex));
  });

  content.appendChild(fragment);
}

function initVirtualScroll(grid: HTMLElement) {
  const sourceData = currentFilteredData;

  if (sourceData.length === 0) {
    renderEmptyState(grid);
    return;
  }

  const sizer = document.createElement("div");
  sizer.className = "virtual-sizer";
  sizer.style.height = `${sourceData.length * ITEM_HEIGHT_LIST}px`;
  grid.appendChild(sizer);

  grid.addEventListener("scroll", onVirtualScroll);
  resizeHandler = () => onVirtualScroll(new Event("resize"));
  window.addEventListener("resize", resizeHandler);
  virtualScrollInitialized = true;

  renderVisibleListItems({ target: grid, sourceData });
}

function renderVisibleListItems(params: {
  target: HTMLElement;
  sourceData: Word[];
}) {
  const grid = params.target;
  if (!grid) return;

  const sourceData = params.sourceData || getFilteredData();

  const scrollTop = grid.scrollTop;
  const viewportHeight = grid.clientHeight;

  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / ITEM_HEIGHT_LIST) - BUFFER_ITEMS,
  );
  const visibleItemsCount = Math.ceil(viewportHeight / ITEM_HEIGHT_LIST);
  const endIndex = Math.min(
    sourceData.length,
    startIndex + visibleItemsCount + BUFFER_ITEMS * 2,
  );

  const visibleData = sourceData.slice(startIndex, endIndex);
  const fragment = document.createDocumentFragment();

  visibleData.forEach((item: Word, index: number) => {
    const absoluteIndex = startIndex + index;
    const el = createListItem(item, absoluteIndex);
    el.style.position = "absolute";
    el.style.top = `${absoluteIndex * ITEM_HEIGHT_LIST}px`;
    el.style.width = "100%";
    el.classList.add("visible");
    fragment.appendChild(el);
  });

  while (grid.children.length > 1) {
    if (grid.lastChild) grid.removeChild(grid.lastChild);
  }
  grid.appendChild(fragment);
}

function prefetchNextImages(currentIndex: number, count: number = 3) {
  if (currentIndex < 0) return;

  for (let i = 1; i <= count; i++) {
    const nextItemIndex = currentIndex + i;
    if (nextItemIndex < currentFilteredData.length) {
      const nextItem = currentFilteredData[nextItemIndex];
      if (nextItem && nextItem.image) {
        const img = new Image();
        img.src = nextItem.image;
        if (import.meta.env.DEV) console.log(`🖼️ Prefetching: ${nextItem.word_kr}`);
      }
    }
  }
}

function prefetchNextAudio(currentIndex: number, count: number = 3) {
  if (currentIndex < 0) return;

  for (let i = 1; i <= count; i++) {
    const nextItemIndex = currentIndex + i;
    if (nextItemIndex < currentFilteredData.length) {
      const nextItem = currentFilteredData[nextItemIndex];
      let url = nextItem.audio_url;
      if (state.currentVoice === "male" && nextItem.audio_male) url = nextItem.audio_male;

      if (url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "auto";
        if (import.meta.env.DEV) console.log(`🔊 Prefetching audio: ${nextItem.word_kr}`);
      }
    }
  }
}

function createCardElement(item: Word, index: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  if (state.hanjaMode) el.classList.add("hanja-mode");
  if (item.type === "grammar") el.classList.add("grammar-card");
  if (state.learned.has(item.id)) el.classList.add("learned");
  if (state.mistakes.has(item.id)) el.classList.add("has-mistake");

  const inner = document.createElement("div");
  inner.className = "card-inner";
  const front = createCardFront(item, index);
  const back = createCardBack(item);

  inner.appendChild(front);
  inner.appendChild(back);
  el.appendChild(inner);

  let imageLoaded = false;
  el.onclick = (e) => {
    // Не переворачивать, если клик был по кнопке
    if ((e.target as HTMLElement).closest("button")) return;

    el.classList.toggle("revealed");
    if (navigator.vibrate) navigator.vibrate(10);

    // Ленивая загрузка изображения при первом переворачивании
    if (el.classList.contains("revealed") && !imageLoaded) {
      const img = el.querySelector(".card-image") as HTMLImageElement;
      if (img && img.dataset.src) {
        img.src = img.dataset.src;
        imageLoaded = true;
        prefetchNextImages(index);
        prefetchNextAudio(index);
      }
    }
  };
  return el;
}

function createCardFront(item: Word, index: number): HTMLElement {
  const front = document.createElement("div");
  front.className = "card-front";
  const isFav = state.favorites.has(item.id);

  const topRow = document.createElement("div");
  topRow.className = "card-top-row";

  const speakBtn = document.createElement("button");
  speakBtn.className = "icon-btn";
  speakBtn.textContent = "🔊";
  speakBtn.style.fontSize = "24px"; // Larger icon
  speakBtn.style.padding = "10px";
  speakBtn.onclick = (e) => {
    e.stopPropagation();
    speakBtn.textContent = "📶";
    speakBtn.style.color = "var(--primary)";
    speakBtn.style.borderColor = "var(--primary)";
    let url = item.audio_url;
    if (state.currentVoice === "male" && item.audio_male) url = item.audio_male;
    speak(item.word_kr || "", url || null).then(() => {
      speakBtn.textContent = "🔊";
      speakBtn.style.color = "";
      speakBtn.style.borderColor = "";
    });
    prefetchNextAudio(index);
  };
  const favBtn = document.createElement("button");
  favBtn.className = `icon-btn fav-btn ${isFav ? "active" : ""}`;
  favBtn.textContent = isFav ? "❤️" : "🤍";
  favBtn.style.fontSize = "24px"; // Larger icon
  favBtn.style.padding = "10px";
  favBtn.title = isFav ? "Убрать из избранного" : "В избранное";
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(item.id, favBtn);
  };
  topRow.appendChild(speakBtn);
  topRow.appendChild(favBtn);
  front.appendChild(topRow);

  const mainContent = document.createElement("div");
  mainContent.className = "card-main";

  const levelBadge = document.createElement("div");
  levelBadge.className = "card-level-badge";
  levelBadge.textContent = item.level || "★☆☆";
  mainContent.appendChild(levelBadge);

  const wordDiv = document.createElement("div");
  wordDiv.className = "word";
  wordDiv.textContent = item.word_kr || "";
  mainContent.appendChild(wordDiv);

  if (item.word_hanja) {
    const hanjaContainer = document.createElement("div");
    hanjaContainer.className = "hanja-container";
    [...item.word_hanja].forEach((char) => {
      const span = document.createElement("span");
      span.className = "hanja-char";
      span.textContent = char;
      span.onclick = (e) => {
        e.stopPropagation();
        import("./ui_hanja.ts").then((m) => m.openHanjaModal(char));
      };
      hanjaContainer.appendChild(span);
    });
    mainContent.appendChild(hanjaContainer);
  }

  if (item.type === "grammar" && item.grammar_info) {
    const grammarBadge = document.createElement("div");
    grammarBadge.className = "grammar-badge";
    grammarBadge.textContent = "📘 Грамматика";
    grammarBadge.style.cursor = "pointer";
    grammarBadge.onclick = (e) => {
      e.stopPropagation();
      import("./ui_grammar.ts").then((m) => m.openGrammarModal(item));
    };
    mainContent.appendChild(grammarBadge);
  }

  const topicObj = item._parsedTopic || { kr: "기타", ru: "Общее" };
  const catObj = item._parsedCategory || { kr: "기타", ru: "Общее" };
  const formatBi = (obj: { kr: string; ru: string }) =>
    obj.kr && obj.ru && obj.kr !== obj.ru
      ? `${obj.kr} (${obj.ru})`
      : obj.kr || obj.ru;

  const bottomRow = document.createElement("div");
  bottomRow.className = "card-bottom-row";
  bottomRow.innerHTML = `
        <div class="meta-topic-badge">🏷 ${formatBi(topicObj)}</div>
        <div class="meta-cat-badge">${formatBi(catObj)}</div>
    `;

  if (item.isLocal) {
    const localBadge = document.createElement("div");
    localBadge.className = "meta-topic-badge";
    localBadge.style.backgroundColor = "var(--warning)";
    localBadge.style.color = "#000";
    localBadge.textContent = "⏳ AI";
    bottomRow.appendChild(localBadge);
  }

  const stats = state.wordHistory[item.id] || { attempts: 0, correct: 0 };
  if (stats.attempts > 0) {
    const accEl = document.createElement("div");
    let statusText = "В процессе",
      barColor = "var(--primary)",
      bgClass = "neutral";
    const acc = getAccuracy(item.id);
    if (stats.attempts < 3) {
      statusText = "Новое";
      bgClass = "neutral";
      barColor = "var(--info)";
    } else if (acc >= 90) {
      statusText = "Мастер";
      bgClass = "success";
      barColor = "var(--success)";
    } else if (acc >= 70) {
      statusText = "Хорошо";
      bgClass = "success";
      barColor = "#55efc4";
    } else if (acc >= 40) {
      statusText = "Средне";
      bgClass = "neutral";
      barColor = "var(--warning)";
    } else {
      statusText = "Слабо";
      bgClass = "failure";
      barColor = "var(--danger)";
    }

    accEl.className = "attempt-indicator-central " + bgClass;
    accEl.title = "Мастер: 90%+, Хорошо: 70%+, Средне: 40%+";
    accEl.innerHTML = `
            <div class="acc-text">🎯 ${acc}% <span style="opacity:0.5; margin:0 4px;">|</span> ${statusText}</div>
            <div class="acc-bar-bg"><div class="acc-bar-fill" style="width:${acc}%; background:${barColor};"></div></div> 
        `;
    mainContent.appendChild(accEl);
  }
  front.appendChild(mainContent);
  front.appendChild(bottomRow);

  return front;
}

function createCardBack(item: Word): HTMLElement {
  const back = document.createElement("div");
  back.className = "card-back";
  const backContent = document.createElement("div");
  backContent.className = "card-back-content";

  // --- 1. Image Section (Toggleable) ---
  if (item.image) {
    const imgSection = document.createElement("div");
    imgSection.className = "card-section";
    imgSection.style.padding = "0";

    const toggleDiv = document.createElement("div");
    toggleDiv.className = "card-image-toggle hidden"; // По умолчанию скрыто
    toggleDiv.title = "Нажмите, чтобы показать/скрыть";
    toggleDiv.onclick = (e) => {
      e.stopPropagation();
      toggleDiv.classList.toggle("hidden");
    };

    const img = document.createElement("img");
    img.className = "card-image";
    img.draggable = false;
    img.dataset.src = item.image; // Lazy load
    
    toggleDiv.appendChild(img);
    imgSection.appendChild(toggleDiv);
    backContent.appendChild(imgSection);
  }

  // --- 2. Translation & Relations ---
  const transSection = document.createElement("div");
  transSection.className = "card-section";
  
  const trans = document.createElement("div");
  trans.className = "translation";
  trans.textContent = item.translation || "";
  transSection.appendChild(trans);

  if (item.synonyms || item.antonyms) {
    const relContainer = document.createElement("div");
    relContainer.className = "relations-container";

    if (item.synonyms) {
      item.synonyms.split(/[,;]/).forEach((s) => {
        if (s.trim()) {
          const chip = document.createElement("span");
          chip.className = "relation-chip";
          chip.textContent = `≈ ${s.trim()}`;
          relContainer.appendChild(chip);
        }
      });
    }
    if (item.antonyms) {
      item.antonyms.split(/[,;]/).forEach((a) => {
        if (a.trim()) {
          const chip = document.createElement("span");
          chip.className = "relation-chip antonym";
          chip.textContent = `≠ ${a.trim()}`;
          relContainer.appendChild(chip);
        }
      });
    }
    transSection.appendChild(relContainer);
  }
  backContent.appendChild(transSection);

  // --- 3. Info (Collocations, Notes, Grammar) ---
  if (item.collocations || item.my_notes || item.grammar_info) {
    const infoSection = document.createElement("div");
    infoSection.className = "card-section";

    if (item.collocations) {
      const block = document.createElement("div");
      block.className = "info-block";
      block.innerHTML = `<div class="info-label">Коллокации</div><div class="info-text">${item.collocations}</div>`;
      infoSection.appendChild(block);
    }

    if (item.grammar_info) {
      const block = document.createElement("div");
      block.className = "info-block";
      block.innerHTML = `<div class="info-label">Грамматика</div><div class="info-text">${item.grammar_info}</div>`;
      infoSection.appendChild(block);
    }

    if (item.my_notes) {
      const block = document.createElement("div");
      block.className = "info-block";
      block.innerHTML = `<div class="info-label">Нюансы / Заметки</div><div class="info-text">${item.my_notes}</div>`;
      infoSection.appendChild(block);
    }
    backContent.appendChild(infoSection);
  }

  // --- 4. Examples ---
  if (item.example_kr) {
    const exSection = document.createElement("div");
    exSection.className = "card-section";
    const exBox = document.createElement("div");
    exBox.className = "example-box";
    exBox.innerHTML = `<div class="example-kr">${item.example_kr}</div><div class="example-ru">${item.example_ru || ""}</div>`;
    exSection.appendChild(exBox);
    backContent.appendChild(exSection);
  }

  back.appendChild(backContent);

  // --- 5. Actions ---
  const actions = document.createElement("div");
  actions.className = "card-actions";

  if (item.isLocal) {
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn action-mistake";
    delBtn.textContent = "Отменить заявку";
    delBtn.style.width = "100%";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      import("./ui_custom_words.ts").then((m) => m.deleteCustomWord(item.id));
    };
    actions.appendChild(delBtn);
    back.appendChild(actions);
    return back;
  }

  const isL = state.learned.has(item.id);
  const isM = state.mistakes.has(item.id);
  if (isL || isM) {
    const resetBtn = document.createElement("button");
    resetBtn.className = "action-btn action-reset";
    resetBtn.textContent = "Сброс";
    resetBtn.onclick = (e) => {
      e.stopPropagation();
      resetProgress(item.id);
    };
    actions.appendChild(resetBtn);
  } else {
    const mistakeBtn = document.createElement("button");
    mistakeBtn.className = "action-btn action-mistake";
    mistakeBtn.textContent = "Забыл";
    mistakeBtn.onclick = (e) => {
      e.stopPropagation();
      markMistake(item.id);
    };
    const learnedBtn = document.createElement("button");
    learnedBtn.className = "action-btn action-learned";
    learnedBtn.textContent = "Знаю";
    learnedBtn.onclick = (e) => {
      e.stopPropagation();
      markLearned(item.id);
    };
    actions.appendChild(mistakeBtn);
    actions.appendChild(learnedBtn);
  }

  back.appendChild(actions);

  return back;
}

function createListItem(item: Word, index: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "list-item";
  if (state.learned.has(item.id)) el.classList.add("learned");
  if (state.mistakes.has(item.id)) el.classList.add("mistake");
  const isFav = state.favorites.has(item.id);

  const mainDiv = document.createElement("div");
  mainDiv.className = "list-col-main";
  mainDiv.innerHTML = `<div class="list-word">${item.word_kr} ${item.word_hanja ? `<span class="list-hanja">${item.word_hanja}</span>` : ""}</div><div class="list-trans">${item.translation}</div>`;

  const metaDiv = document.createElement("div");
  metaDiv.className = "list-col-meta";
  metaDiv.innerHTML = `<span class="list-badge">${item.level || "★☆☆"}</span>`;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "list-col-actions";

  const speakBtn = document.createElement("button");
  speakBtn.className = "btn-icon list-action-btn";
  speakBtn.textContent = "🔊";
  speakBtn.onclick = (e) => {
    e.stopPropagation();
    speak(item.word_kr, item.audio_url || null);
    prefetchNextAudio(index);
  };

  const favBtn = document.createElement("button");
  favBtn.className = `btn-icon list-action-btn ${isFav ? "active" : ""}`;
  favBtn.textContent = isFav ? "❤️" : "🤍";
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(item.id, favBtn);
  };

  actionsDiv.appendChild(speakBtn);
  actionsDiv.appendChild(favBtn);

  el.appendChild(mainDiv);
  el.appendChild(metaDiv);
  el.appendChild(actionsDiv);
  return el;
}

function getAccuracy(id: string | number): number {
  const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
  if (stats.attempts === 0) return 0;
  return Math.min(100, Math.round((stats.correct / stats.attempts) * 100));
}

function markLearned(id: string | number) {
  ensureSessionStarted();
  state.learned.add(id);
  state.mistakes.delete(id);
  recordAttempt(id, true);
  state.dirtyWordIds.add(id);
  addXP(10);
  checkAchievements();
  saveAndRender();
}

function markMistake(id: string | number) {
  ensureSessionStarted();
  state.mistakes.add(id);
  state.learned.delete(id);
  recordAttempt(id, false);
  state.dirtyWordIds.add(id);
  addXP(-5);
  saveAndRender();
}

function toggleFavorite(id: string | number, btn?: HTMLElement) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    if (btn) {
      btn.textContent = "🤍";
      btn.classList.remove("active");
    }
  } else {
    state.favorites.add(id);
    if (btn) {
      btn.textContent = "❤️";
      btn.classList.add("active");
    }
    showToast("Добавлено в избранное");
  }
  state.dirtyWordIds.add(id);
  scheduleSaveState();
  if (state.currentStar === "favorites") render();
}

function resetProgress(id: string | number) {
  state.learned.delete(id);
  state.mistakes.delete(id);
  delete state.wordHistory[id];
  state.dirtyWordIds.add(id);
  scheduleSaveState();
  saveAndRender();
}

export function resetSearchHandler() {
  const s = document.getElementById("searchInput") as HTMLInputElement;
  if (s) {
    s.value = "";
    s.focus();
    s.dispatchEvent(new Event("input"));
  }
}

export function setupGridEffects() {
  const grid = document.getElementById("vocabulary-grid");
  if (!grid) return;
  grid.addEventListener("mousemove", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest(".card") as HTMLElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    const shadowX = ((x - centerX) / centerX) * -25;
    const shadowY = ((y - centerY) / centerY) * -25 + 15;

    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
    card.style.setProperty("--sx", `${shadowX}px`);
    card.style.setProperty("--sy", `${shadowY}px`);
  });
  grid.addEventListener("mouseout", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest(".card") as HTMLElement;
    if (card && !card.contains(e.relatedTarget as Node)) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
      card.style.removeProperty("--sx");
      card.style.removeProperty("--sy");
    }
  });
}
