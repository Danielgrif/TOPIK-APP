/* eslint-disable no-console */
import { state } from "../core/state.ts";
import {
  speak,
  showToast,
  showUndoToast,
  playTone,
  getIconForValue,
  escapeHtml,
  escapeRegExp,
  promiseWithTimeout,
} from "../utils/utils.ts";
import { scheduleSaveState, recordAttempt } from "../core/db.ts";
import {
  addXP,
  checkAchievements,
  updateSRSBadge,
  updateStats,
} from "../core/stats.ts";
import { ensureSessionStarted } from "../core/session.ts";
import { client } from "../core/supabaseClient.ts";
import { Word } from "../types/index.ts";
import { collectionsState } from "../core/collections_data.ts";
import { DB_BUCKETS } from "../core/constants.ts";
import { openModal, openConfirm, closeModal } from "./ui_modal.ts";

// --- Virtual Scroll Constants (for List View) ---
const ITEM_HEIGHT_LIST = 82;
let ITEM_HEIGHT_GRID = 480;
const MIN_COL_WIDTH = 340; // Увеличено для еще более крупных карточек
const BUFFER_ITEMS = 10;
const GRID_GAP = 16;

let virtualScrollInitialized = false;
let scrollRafId: number | null = null;
let currentFilteredData: Word[] = [];
let resizeHandler: (() => void) | null = null;

let counterTimeout: number | null = null;

export function updateGridCardHeight() {
  // FIX: Устанавливаем фиксированную высоту для карточек в сетке.
  // Динамический расчет (window.innerHeight) делал их слишком огромными.
  ITEM_HEIGHT_GRID = 480; // Увеличена высота
  document.documentElement.style.setProperty(
    "--card-height",
    `${ITEM_HEIGHT_GRID}px`,
  );
}

export function restoreScroll() {
  const grid = document.getElementById("vocabulary-grid");
  const saved = sessionStorage.getItem("vocab_scroll_top");
  if (grid && saved) {
    grid.scrollTop = Number(saved);
  }
}

function saveAndRender() {
  scheduleSaveState();
  updateSRSBadge();
  updateStats();
  render();
}

export function renderSkeletons() {
  const grid = document.getElementById("vocabulary-grid");
  if (!grid) return;

  // FIX: Возвращаем класс grid для правильного отображения скелетонов
  grid.classList.remove("virtual-scroll-container", "list-view");
  grid.classList.add("grid");

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
  grid.classList.add("virtual-scroll-container");
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

  // DEBUG: Analyze data types

  // Optimization: Pre-calculate set of all categorized IDs for O(1) lookup
  let allCategorizedIds: Set<number> | null = null;
  if (collectionsState.currentCollectionFilter === "uncategorized") {
    allCategorizedIds = new Set<number>();
    Object.values(collectionsState.listItems).forEach((set) => {
      set.forEach((id) => allCategorizedIds!.add(id));
    });
  }

  currentFilteredData = source.filter((w) => {
    if (!w) return false;
    if (
      state.currentStar !== "all" &&
      state.currentStar !== "favorites" &&
      state.currentStar !== "mistakes" &&
      w.level !== state.currentStar
    )
      return false;
    if (
      state.currentStar === "favorites" &&
      !state.favorites.has(w.id as number)
    )
      return false;
    if (state.currentStar === "mistakes" && !state.mistakes.has(w.id as number))
      return false;
    if (w.type !== state.currentType) return false;
    const wTopic = w.topic_ru || w.topic_kr || "Общее";
    const topics = Array.isArray(state.currentTopic)
      ? state.currentTopic
      : [state.currentTopic];
    if (!topics.includes("all") && !topics.includes(wTopic)) return false;
    const wCat = w.category_ru || w.category_kr || "Общее";
    const categories = Array.isArray(state.currentCategory)
      ? state.currentCategory
      : [state.currentCategory];
    if (!categories.includes("all") && !categories.includes(wCat)) return false;

    // Фильтр по коллекции
    if (collectionsState.currentCollectionFilter) {
      if (collectionsState.currentCollectionFilter === "uncategorized") {
        // Проверяем, входит ли слово хоть в один список
        const isInAnyList = allCategorizedIds?.has(w.id as number);
        if (isInAnyList) return false;
      } else if (collectionsState.currentCollectionFilter === "my-custom") {
        if (!state.currentUser || w.created_by !== state.currentUser.id)
          return false;
      } else if (
        collectionsState.listItems[collectionsState.currentCollectionFilter]
      ) {
        if (
          !collectionsState.listItems[
            collectionsState.currentCollectionFilter
          ].has(w.id as number)
        )
          return false;
      }
    }

    return true;
  });
}

export function getFilteredData(): Word[] {
  return currentFilteredData;
}

function onVirtualScroll(_e: Event) {
  if (scrollRafId) return;

  scrollRafId = window.requestAnimationFrame(() => {
    const grid = document.getElementById("vocabulary-grid");
    if (grid) {
      // Save scroll position for restoration after reload
      sessionStorage.setItem("vocab_scroll_top", String(grid.scrollTop));

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
      const itemHeight =
        state.viewMode === "list"
          ? ITEM_HEIGHT_LIST
          : ITEM_HEIGHT_GRID + GRID_GAP;
      // For grid, we need to know columns.
      const gridWidth = grid.clientWidth;
      const gap = GRID_GAP; // CSS gap
      const colCount =
        state.viewMode === "list"
          ? 1
          : Math.max(1, Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)));

      const currentRow = Math.floor((scrollTop + itemHeight / 2) / itemHeight);
      const currentIndex = Math.min(
        currentFilteredData.length,
        Math.max(1, currentRow * colCount + 1),
      );

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

  // Контейнер прокрутки должен быть контекстом для позиционирования
  grid.style.position = "relative";

  const content = document.createElement("div");
  content.id = "virtual-grid-content";
  content.className = "vocabulary-inner-grid"; // Настоящий grid-контейнер
  content.style.position = "absolute";
  content.style.top = "0";
  content.style.left = "0";
  content.style.width = "100%";
  const isMobile = window.innerWidth < 600;
  content.style.padding = isMobile
    ? "16px 16px 100px 16px"
    : "24px 24px 100px 24px";
  content.style.boxSizing = "border-box";
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
  const content = document.getElementById("virtual-grid-content");
  const sizer = grid.querySelector(".virtual-sizer");
  if (!content || !sizer) return;

  // Вычитаем padding, чтобы колонки рассчитывались для внутренней области
  const paddingX = window.innerWidth < 600 ? 32 : 48;
  const gridWidth = grid.clientWidth - paddingX;
  const gap = GRID_GAP;
  const colCount = Math.max(
    1,
    Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)),
  );

  // FIX: Синхронизируем колонки CSS Grid с расчетами JS
  content.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;

  const totalRows = Math.ceil(sourceData.length / colCount);
  const totalHeight =
    totalRows > 0 ? totalRows * (ITEM_HEIGHT_GRID + gap) - gap : 0;

  // Добавляем высоту паддингов (24px сверху + 100px снизу = 124px)
  (sizer as HTMLElement).style.height = `${totalHeight + 124}px`;

  const scrollTop = grid.scrollTop;
  const viewportHeight = grid.clientHeight;

  const startRow = Math.max(
    0,
    Math.floor(scrollTop / (ITEM_HEIGHT_GRID + gap)),
  );
  const visibleRows = Math.ceil(viewportHeight / (ITEM_HEIGHT_GRID + gap)) + 1;

  const startIndex = startRow * colCount;
  const endIndex = Math.min(
    sourceData.length,
    (startRow + visibleRows) * colCount,
  );

  const topOffset = startRow * (ITEM_HEIGHT_GRID + gap);
  (content as HTMLElement).style.transform = `translateY(${topOffset}px)`;

  content.innerHTML = "";

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

  grid.style.position = "relative";

  const content = document.createElement("div");
  content.id = "virtual-list-content";
  content.style.position = "absolute";
  content.style.top = "0";
  content.style.left = "0";
  content.style.width = "100%";
  grid.appendChild(content);

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
  const content = document.getElementById("virtual-list-content");
  if (!content) return;

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

  const topOffset = startIndex * ITEM_HEIGHT_LIST;
  (content as HTMLElement).style.transform = `translateY(${topOffset}px)`;
  content.innerHTML = "";

  const visibleData = sourceData.slice(startIndex, endIndex);
  const fragment = document.createDocumentFragment();

  visibleData.forEach((item: Word, index: number) => {
    const absoluteIndex = startIndex + index;
    const el = createListItem(item, absoluteIndex);
    fragment.appendChild(el);
  });

  content.appendChild(fragment);
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
        if (import.meta.env.DEV)
          console.log(`🖼️ Prefetching: ${nextItem.word_kr}`);
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
      if (state.currentVoice === "male" && nextItem.audio_male)
        url = nextItem.audio_male;

      if (url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "auto";
        if (import.meta.env.DEV)
          console.log(`🔊 Prefetching audio: ${nextItem.word_kr}`);
      }
    }
  }
}

function setupLongPress(el: HTMLElement, itemId: string | number) {
  let timer: number | null = null;
  const duration = 600; // 600ms для активации

  const start = (e: Event) => {
    // Игнорируем, если уже в режиме выбора или клик был по кнопке/инпуту
    if (
      state.selectMode ||
      (e.target as HTMLElement).closest("button, input, textarea")
    )
      return;

    timer = window.setTimeout(() => {
      import("./ui_bulk.ts").then((m) => {
        if (!state.selectMode) {
          m.toggleSelectMode();
          // Помечаем элемент, чтобы предотвратить срабатывание обычного клика после отпускания
          el.dataset.lpHandled = "true";
          // Выбираем элемент
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

function createCardElement(item: Word, index: number): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  el.tabIndex = 0; // Make accessible via keyboard
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

  // Checkbox overlay
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
    if (el.dataset.lpHandled) return; // Игнорируем клик, если сработал Long Press

    // Logic for Select Mode
    if (state.selectMode) {
      e.stopPropagation();
      import("./ui_bulk.ts").then((m) => m.toggleSelection(item.id));
      return;
    }

    // Не переворачивать, если клик был по кнопке
    if ((e.target as HTMLElement).closest("button")) return;

    el.classList.toggle("revealed");
    if (navigator.vibrate) navigator.vibrate(10);
    playTone("flip");

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
  speakBtn.textContent = state.currentVoice === "male" ? "👨" : "👩";
  speakBtn.onclick = (e) => {
    e.stopPropagation();
    speakBtn.classList.add("playing");
    let url = item.audio_url;
    if (state.currentVoice === "male" && item.audio_male) url = item.audio_male;
    speak(item.word_kr || "", url || null).then(() => {
      speakBtn.classList.remove("playing");
    });
    prefetchNextAudio(index);
  };
  topRow.appendChild(speakBtn); // Left corner

  // Кнопка добавления в список
  const addListBtn = document.createElement("button");
  addListBtn.className = "icon-btn";
  addListBtn.textContent = "📁";
  addListBtn.onclick = (e) => {
    e.stopPropagation();
    openAddToListModal(item.id as number);
  };
  // Вставляем перед сердечком
  topRow.appendChild(addListBtn);

  // Если активен фильтр по списку, добавляем кнопку удаления из этого списка
  if (
    collectionsState.currentCollectionFilter &&
    collectionsState.currentCollectionFilter !== "my-custom" &&
    collectionsState.currentCollectionFilter !== "uncategorized"
  ) {
    const removeListBtn = document.createElement("button");
    removeListBtn.className = "icon-btn";
    removeListBtn.textContent = "➖";
    removeListBtn.title = "Убрать из этого списка";
    removeListBtn.style.color = "var(--danger)";
    removeListBtn.onclick = (e) => {
      e.stopPropagation();
      // Удаляем без подтверждения, но с возможностью отмены (Undo)
      const listId = collectionsState.currentCollectionFilter!;

      // Оптимистичное удаление
      collectionsState.listItems[listId]?.delete(item.id as number);
      // Обновляем текущий вид
      currentFilteredData = currentFilteredData.filter((w) => w.id !== item.id);
      render();

      showUndoToast(
        "Убрано из списка",
        () => {
          // Undo
          collectionsState.listItems[listId]?.add(item.id as number);
          // При отмене нужно сбросить кэш фильтрации, чтобы слово вернулось
          // Проще всего вызвать render(), который перестроит список, но нужно вернуть слово в currentFilteredData
          // Или просто сбросить currentFilteredData и вызвать render
          render();
        },
        async () => {
          // Commit
          await client
            .from("list_items")
            .delete()
            .match({ list_id: listId, word_id: item.id });
        },
      );
    };
    topRow.appendChild(removeListBtn);
  }

  const favBtn = document.createElement("button");
  favBtn.className = `icon-btn fav-btn ${isFav ? "active" : ""}`;
  favBtn.textContent = isFav ? "❤️" : "🤍";
  favBtn.title = isFav ? "Убрать из избранного" : "В избранное";
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(item.id, favBtn);
  };
  topRow.appendChild(favBtn); // Right corner

  front.appendChild(topRow);

  const mainContent = document.createElement("div");
  mainContent.className = "card-main";

  // --- Level Section ---
  const levelSection = document.createElement("div");
  levelSection.className = "front-section";

  const levelBadge = document.createElement("div");
  levelBadge.className = "card-level-stars";
  levelBadge.textContent = item.level || "★☆☆";
  levelSection.appendChild(levelBadge);
  mainContent.appendChild(levelSection);

  // --- Word Section ---
  const wordSection = document.createElement("div");
  wordSection.className = "front-section";

  let statusIcon = "";

  if (state.learned.has(item.id)) {
    statusIcon = "✅";
  } else if (state.mistakes.has(item.id)) {
    statusIcon = "❌";
  }

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
  wordDiv.onclick = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.word_kr);
    showToast("📋 Скопировано!");
  };
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
      span.textContent = char;
      span.onclick = (e) => {
        e.stopPropagation();
        import("./ui_hanja.ts").then((m) => m.openHanjaModal(char));
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
    grammarBadge.onclick = (e) => {
      e.stopPropagation();
      import("./ui_grammar.ts").then((m) => m.openGrammarModal(item));
    };
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

  // 1. Header (Translation) - Fixed at top
  const header = document.createElement("div");
  header.className = "card-back-header";
  header.innerHTML = `<div class="back-translation">${escapeHtml(item.translation || "")}</div>`;
  back.appendChild(header);

  // 2. Scrollable Content
  const content = document.createElement("div");
  content.className = "card-back-scroll";

  // --- Image Section (View or Add) ---
  // Always create wrapper to allow adding images if missing
  {
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
        // If no image, open picker directly or show container with controls
        openImagePicker(item, showImgBtn as HTMLButtonElement);
      }
    };

    imgContainer.onclick = (e) => {
      e.stopPropagation();
      // Если клик по кнопкам или инпуту — игнорируем
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

    // --- Кнопка лупы (Full Screen) ---
    const zoomBtn = document.createElement("button");
    zoomBtn.className = "card-image-zoom-btn btn-icon";
    zoomBtn.title = "На весь экран";
    zoomBtn.innerHTML = "🔍";
    zoomBtn.style.left = "10px"; // Слева
    zoomBtn.style.position = "absolute";
    zoomBtn.style.top = "10px";
    zoomBtn.style.zIndex = "20";

    zoomBtn.onclick = (e) => {
      e.stopPropagation();
      showFullScreenImage(img.src, item.word_kr);
    };

    // --- Кнопка загрузки по URL ---
    const urlBtn = document.createElement("button");
    urlBtn.className = "card-image-url-btn btn-icon";
    urlBtn.title = "Загрузить по URL";
    urlBtn.innerHTML = "🔗";
    urlBtn.style.right = "130px"; // Сдвигаем еще левее

    urlBtn.onclick = async (e) => {
      e.stopPropagation();

      openConfirm(
        "Вставьте URL изображения (прямую ссылку):",
        () => {}, // Основное действие выполняется в onValidate
        {
          showInput: true,
          inputPlaceholder: "https://example.com/image.jpg",
          onValidate: async (imageUrl) => {
            if (!imageUrl) return false;
            urlBtn.disabled = true;
            urlBtn.classList.add("rotating");
            try {
              const response = await fetch(imageUrl);
              if (!response.ok)
                throw new Error(`Не удалось загрузить: ${response.statusText}`);
              const imageBlob = await response.blob();
              await uploadAndSaveImage(
                imageBlob,
                item,
                img,
                imgContainer,
                revealOverlay,
                deleteBtn,
              );
              showToast("✅ Картинка загружена!");
              return true;
            } catch (err: unknown) {
              showToast(
                "❌ Ошибка: " +
                  ((err as Error).message || "Не удалось загрузить"),
              );
              return false; // Оставляем окно открытым, чтобы можно было исправить URL
            } finally {
              urlBtn.disabled = false;
              urlBtn.classList.remove("rotating");
            }
          },
        },
      );
    };

    // --- Кнопка удаления картинки ---
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "card-image-delete-btn btn-icon";
    deleteBtn.title = "Удалить картинку";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.style.right = "90px"; // Сдвигаем левее загрузки

    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      openConfirm("Удалить текущее изображение?", async () => {
        deleteBtn.disabled = true;
        try {
          // Если картинка своя — удаляем файл из хранилища
          if (item.image_source === "custom" && item.image) {
            const fileName = item.image.split("/").pop()?.split("?")[0];
            if (fileName)
              await client.storage.from(DB_BUCKETS.IMAGES).remove([fileName]);
          }

          // Очищаем поле в БД
          const { error } = await client
            .from("vocabulary")
            .update({ image: null, image_source: null })
            .eq("id", item.id);
          if (error) throw error;

          // Обновляем UI: скрываем картинку, показываем заглушку
          item.image = undefined;
          item.image_source = undefined;
          // Re-render the card back to show "Add Image" button
          imgWrapper.remove();
          showToast("🗑️ Картинка удалена");
        } catch (err: unknown) {
          console.error("Delete error:", err);
          showToast("❌ Ошибка удаления");
          deleteBtn.disabled = false;
        }
      });
    };

    const regenBtn = document.createElement("button");
    regenBtn.className = "card-image-regenerate-btn btn-icon";
    regenBtn.title = "Сгенерировать AI";
    regenBtn.innerHTML = "🔄";
    regenBtn.onclick = (e) => {
      e.stopPropagation();
      openImagePicker(item, e.currentTarget as HTMLButtonElement);
    };

    // --- Кнопка загрузки своей картинки ---
    const uploadBtn = document.createElement("button");
    uploadBtn.className = "card-image-upload-btn btn-icon";
    uploadBtn.title = "Загрузить свою";
    uploadBtn.innerHTML = "📁";
    uploadBtn.style.right = "50px"; // Сдвигаем левее кнопки регенерации

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";

    uploadBtn.onclick = (e) => {
      e.stopPropagation();
      fileInput.click();
    };

    fileInput.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Увеличиваем лимит, так как будем сжимать
      if (file.size > 15 * 1024 * 1024) {
        // Увеличим до 15MB
        showToast("❌ Файл слишком большой (макс 15MB)");
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.classList.add("rotating");
      try {
        await uploadAndSaveImage(
          file,
          item,
          img,
          imgContainer,
          revealOverlay,
          deleteBtn,
        );
        showToast("✅ Картинка загружена!");
      } catch (err: unknown) {
        showToast(
          "❌ Ошибка: " + ((err as Error).message || "Не удалось загрузить"),
        );
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.classList.remove("rotating");
        target.value = ""; // Сброс инпута
      }
    };

    imgContainer.appendChild(img);
    imgContainer.appendChild(revealOverlay);
    imgContainer.appendChild(zoomBtn);
    imgContainer.appendChild(regenBtn);
    imgContainer.appendChild(urlBtn);
    imgContainer.appendChild(deleteBtn);
    imgContainer.appendChild(uploadBtn);
    imgContainer.appendChild(fileInput);

    // Only append container if image exists, otherwise logic is handled by showImgBtn click
    if (item.image) {
      imgWrapper.appendChild(imgContainer);
    }
    imgWrapper.insertBefore(showImgBtn, imgWrapper.firstChild);
    content.appendChild(imgWrapper);
  }

  // --- Examples ---
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
    // Highlight the word in the example
    const highlightedKr = safeWord
      ? safeKr.replace(
          new RegExp(escapeRegExp(safeWord), "gi"),
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

  // --- Synonyms ---
  if (item.synonyms && item.synonyms.trim()) {
    const synBox = document.createElement("div");
    synBox.className = "back-section";
    synBox.style.borderLeft = "3px solid var(--section-relation-border)";
    synBox.style.backgroundColor = "var(--section-relation-bg)";
    synBox.style.padding = "12px 12px 12px 16px";
    synBox.style.marginBottom = "16px";
    synBox.style.borderRadius = "8px";
    synBox.innerHTML = `
        <div class="section-label" style="color: var(--section-relation-border); font-weight: bold; margin-bottom: 8px;">🔗 Синонимы</div>
        <div class="relation-row">
            <div class="rel-chips">${item.synonyms
              .split(/[,;]/)
              .filter((s) => s.trim())
              .map(
                (s) =>
                  `<span class="rel-chip syn">${escapeHtml(s.trim())}</span>`,
              )
              .join("")}</div>
        </div>
    `;
    content.appendChild(synBox);
  }

  // --- Antonyms ---
  if (item.antonyms && item.antonyms.trim()) {
    const antBox = document.createElement("div");
    antBox.className = "back-section";
    antBox.style.borderLeft = "3px solid var(--section-relation-border)";
    antBox.style.backgroundColor = "var(--section-relation-bg)";
    antBox.style.padding = "12px 12px 12px 16px";
    antBox.style.marginBottom = "16px";
    antBox.style.borderRadius = "8px";
    antBox.innerHTML = `
        <div class="section-label" style="color: var(--section-relation-border); font-weight: bold; margin-bottom: 8px;">≠ Антонимы</div>
        <div class="relation-row">
            <div class="rel-chips">${item.antonyms
              .split(/[,;]/)
              .filter((s) => s.trim())
              .map(
                (s) =>
                  `<span class="rel-chip ant">${escapeHtml(s.trim())}</span>`,
              )
              .join("")}</div>
        </div>
    `;
    content.appendChild(antBox);
  }

  // --- Collocations ---
  if (item.collocations && item.collocations.trim()) {
    const colBox = document.createElement("div");
    colBox.className = "back-section";
    colBox.style.borderLeft = "3px solid var(--section-extra-border)";
    colBox.style.backgroundColor = "var(--section-extra-bg)";
    colBox.style.padding = "12px 12px 12px 16px";
    colBox.style.marginBottom = "16px";
    colBox.style.borderRadius = "8px";

    const safeCol = escapeHtml(item.collocations);
    const safeWord = escapeHtml(item.word_kr || "");
    const displayCollocations = safeWord
      ? safeCol.replace(
          new RegExp(escapeRegExp(safeWord), "gi"),
          `<span class="highlight">$&</span>`,
        )
      : safeCol;

    colBox.innerHTML = `
          <div class="section-label" style="color: var(--section-extra-border); font-weight: bold; margin-bottom: 8px;">🔗 Коллокации</div>
          <div class="info-item">${displayCollocations}</div>
      `;
    content.appendChild(colBox);
  }

  // --- Grammar ---
  if (item.grammar_info && item.grammar_info.trim()) {
    const gramBox = document.createElement("div");
    gramBox.className = "back-section";
    gramBox.style.borderLeft = "3px solid var(--section-extra-border)";
    gramBox.style.backgroundColor = "var(--section-extra-bg)";
    gramBox.style.padding = "12px 12px 12px 16px";
    gramBox.style.marginBottom = "16px";
    gramBox.style.borderRadius = "8px";
    gramBox.innerHTML = `
          <div class="section-label" style="color: var(--section-extra-border); font-weight: bold; margin-bottom: 8px;">📘 Грамматика</div>
          <div class="info-item">${escapeHtml(item.grammar_info)}</div>
      `;
    content.appendChild(gramBox);
  }

  // --- Notes ---
  if (item.my_notes && item.my_notes.trim()) {
    const noteBox = document.createElement("div");
    noteBox.className = "back-section";
    noteBox.style.borderLeft = "3px solid var(--section-extra-border)";
    noteBox.style.backgroundColor = "var(--section-extra-bg)";
    noteBox.style.padding = "12px 12px 12px 16px";
    noteBox.style.marginBottom = "16px";
    noteBox.style.borderRadius = "8px";

    const safeNotes = escapeHtml(item.my_notes);
    const safeWord = escapeHtml(item.word_kr || "");
    const displayNotes = safeWord
      ? safeNotes.replace(
          new RegExp(escapeRegExp(safeWord), "gi"),
          `<span class="highlight">$&</span>`,
        )
      : safeNotes;

    noteBox.innerHTML = `
          <div class="section-label" style="color: var(--section-extra-border); font-weight: bold; margin-bottom: 8px;">📝 Заметки</div>
          <div class="info-item">${displayNotes}</div>
      `;
    content.appendChild(noteBox);
  }

  back.appendChild(content);

  // 3. Footer (Actions) - Fixed at bottom
  const actions = document.createElement("div");
  actions.className = "card-back-actions";

  // Кнопка редактирования - только для слов, созданных пользователем
  if (item.created_by) {
    const editBtn = document.createElement("button");
    editBtn.className = "action-btn";
    editBtn.textContent = "✏️ Изменить";
    editBtn.onclick = (e) => {
      e.stopPropagation();
      window.openEditWordModal(String(item.id), render);
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

  // Для локальных слов добавляем кнопку удаления как дополнительную опцию
  if (item.isLocal) {
    const delBtn = document.createElement("button");
    delBtn.className = "action-btn";
    delBtn.style.background = "var(--surface-3)";
    delBtn.style.color = "var(--text-sub)";
    delBtn.style.flex = "0 0 auto"; // Не растягиваться
    delBtn.innerHTML = "🗑️";
    delBtn.title = "Отменить заявку";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      const cardEl = (e.target as HTMLElement).closest(".card");
      openConfirm("Удалить заявку на это слово?", async () => {
        if (cardEl) {
          (cardEl as HTMLElement).style.opacity = "0";
          await new Promise((r) => setTimeout(r, 300));
        }
        import("./ui_custom_words.ts").then((m) => m.deleteCustomWord(item.id));
      });
    };
    actions.appendChild(delBtn);
  }

  back.appendChild(actions);

  return back;
}

async function openImagePicker(item: Word, btn: HTMLElement) {
  if (btn instanceof HTMLButtonElement) {
    btn.disabled = true;
  }
  btn.classList.add("rotating");

  try {
    const invokePromise = client.functions.invoke("regenerate-image", {
      body: {
        mode: "search",
        id: item.id,
        word: item.word_kr,
        translation: item.translation,
      },
    });

    const { data, error } = await promiseWithTimeout<{
      data: { images: { url: string; source: string }[] } | null;
      error: Error | null;
    }>(invokePromise, 15000, new Error("Время ожидания от сервера истекло"));

    if (error || !data || !data.images) {
      throw new Error(error?.message || "Не удалось найти изображения");
    }

    const grid = document.getElementById("image-picker-grid");
    const regenAgainBtn = document.getElementById("regenerate-again-btn");
    if (!grid || !regenAgainBtn) return;

    grid.scrollTop = 0;
    grid.innerHTML = ""; // Clear previous results

    if (data.images.length === 0) {
      grid.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding: 20px;">Не найдено. Попробуйте еще раз.</div>`;
    } else {
      data.images.forEach((imgData: { url: string; source: string }) => {
        const previewItem = document.createElement("div");
        previewItem.className = "image-preview-item";
        previewItem.innerHTML = `
                    <img src="${imgData.url}" alt="Preview" loading="lazy">
                    <span class="source-badge">${imgData.source}</span>
                `;
        previewItem.onclick = () => {
          // Disable all other items
          grid.querySelectorAll(".image-preview-item").forEach((el) => {
            (el as HTMLElement).style.pointerEvents = "none";
          });
          previewItem.classList.add("loading");
          finalizeImageSelection(item, imgData.url, imgData.source);
        };
        grid.appendChild(previewItem);
      });
    }

    // Re-attach listener for regeneration
    const newRegenBtn = regenAgainBtn.cloneNode(true);
    regenAgainBtn.parentNode?.replaceChild(newRegenBtn, regenAgainBtn);
    (newRegenBtn as HTMLElement).onclick = () => {
      grid.innerHTML =
        '<div class="spinner-wrapper" style="height: 200px;"><div class="loader-circle"></div></div>';
      openImagePicker(item, btn as HTMLButtonElement); // Recursively call to search again
    };

    openModal("image-picker-modal");
  } catch (err: unknown) {
    showToast(`❌ Ошибка: ${(err as Error).message}`);
  } finally {
    if (btn instanceof HTMLButtonElement) {
      btn.disabled = false;
    }
    btn.classList.remove("rotating");
  }
}

async function finalizeImageSelection(
  item: Word,
  selectedUrl: string,
  source: string,
) {
  try {
    const invokePromise = client.functions.invoke("regenerate-image", {
      body: { mode: "finalize", id: item.id, selectedUrl, source },
    });

    const { data, error } = await promiseWithTimeout<{
      data: { finalUrl: string } | null;
      error: Error | null;
    }>(invokePromise, 20000, new Error("Время ожидания сохранения истекло"));

    if (error || !data || !data.finalUrl) {
      throw new Error(error?.message || "Не удалось сохранить изображение");
    }

    const wordInStore = state.dataStore.find((w) => w.id === item.id);
    if (wordInStore) {
      wordInStore.image = data.finalUrl;
      wordInStore.image_source = source;
    }

    const cardEl = document.querySelector(`.card[data-word-id="${item.id}"]`);
    if (cardEl) {
      const imgEl = cardEl.querySelector(".card-image") as HTMLImageElement;
      if (imgEl) {
        imgEl.src = data.finalUrl;
        imgEl.dataset.src = data.finalUrl;
        // Force reveal if it was hidden
        const container = cardEl.querySelector(
          ".back-image-container",
        ) as HTMLElement;
        if (container) container.style.display = "block";
        const btn = cardEl.querySelector(".btn-text") as HTMLElement; // The "Show Image" button
        if (btn && btn.innerHTML.includes("Показать"))
          btn.style.display = "none";
      }
    }

    closeModal("image-picker-modal");
    showToast("✅ Изображение обновлено!");
  } catch (err: unknown) {
    showToast(`❌ Ошибка сохранения: ${(err as Error).message}`);
    const grid = document.getElementById("image-picker-grid");
    if (grid) {
      grid.querySelectorAll(".image-preview-item").forEach((el) => {
        (el as HTMLElement).style.pointerEvents = "auto";
        el.classList.remove("loading");
      });
    }
  }
}

function createListItem(item: Word, index: number): HTMLElement {
  const container = document.createElement("div");
  container.className = "list-item-wrapper";
  container.dataset.wordId = String(item.id);

  if (state.selectMode) {
    container.classList.add("select-mode");
    if (state.selectedWords.has(item.id)) container.classList.add("selected");
  }
  // Убираем классы learned/mistake для контейнера, так как убираем полоску

  const el = document.createElement("div");
  el.className = "list-item";
  const isFav = state.favorites.has(item.id);

  let statusIcon = "";
  if (state.learned.has(item.id)) statusIcon = "✅";
  else if (state.mistakes.has(item.id)) statusIcon = "❌";

  // Checkbox overlay
  const checkbox = document.createElement("div");
  checkbox.className = "select-checkbox";
  if (state.selectedWords.has(item.id)) checkbox.innerHTML = "✓";
  el.appendChild(checkbox);

  const hanjaHtml = item.word_hanja
    ? `<span class="list-hanja">${[...item.word_hanja].map((char) => `<span class="list-hanja-char">${escapeHtml(char)}</span>`).join("")}</span>`
    : "";

  const grammarIcon = item.grammar_info
    ? `<span style="font-size: 14px; margin-left: 4px;" title="Грамматика">📘</span>`
    : "";

  const mainDiv = document.createElement("div");
  mainDiv.className = "list-col-main";
  mainDiv.innerHTML = `
    <div class="list-word-row">
        <div class="list-word">${escapeHtml(item.word_kr)}</div>
        ${statusIcon ? `<div class="list-status-icon">${statusIcon}</div>` : ""}
        ${grammarIcon}
        ${hanjaHtml}
    </div>
    <div class="list-trans">${escapeHtml(item.translation || "")}</div>
  `;

  if (item.word_hanja) {
    mainDiv.querySelectorAll(".list-hanja-char").forEach((span) => {
      (span as HTMLElement).onclick = (e) => {
        e.stopPropagation();
        const char = span.textContent;
        if (char) import("./ui_hanja.ts").then((m) => m.openHanjaModal(char));
      };
    });
  }

  const metaDiv = document.createElement("div");
  metaDiv.className = "list-col-meta";
  metaDiv.innerHTML = `<span class="list-badge">${item.level || "★☆☆"}</span>`;

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "list-col-actions";

  const speakBtn = document.createElement("button");
  speakBtn.className = "btn-icon list-action-btn";
  speakBtn.textContent = state.currentVoice === "male" ? "👨" : "👩";
  speakBtn.onclick = (e) => {
    e.stopPropagation();
    speakBtn.classList.add("playing");
    let url = item.audio_url;
    if (state.currentVoice === "male" && item.audio_male) url = item.audio_male;
    speak(item.word_kr, url || null).then(() => {
      speakBtn.classList.remove("playing");
    });
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

  // --- Details Section (Accordion) ---
  const details = document.createElement("div");
  details.className = "list-item-details";

  let detailsContent = "";

  // Example
  if (item.example_kr && item.example_kr.trim()) {
    const safeKr = escapeHtml(item.example_kr);
    const safeWord = escapeHtml(item.word_kr || "");
    const highlighted = safeWord
      ? safeKr.replace(
          new RegExp(escapeRegExp(safeWord), "gi"),
          `<span class="highlight">$&</span>`,
        )
      : safeKr;

    detailsContent += `
        <div class="list-detail-section" style="background: var(--section-info-bg); border-left-color: var(--section-info-border);">
            <div class="list-detail-label">💬 Пример</div>
            <div class="list-detail-text kr">${highlighted}</div>
            <div class="list-detail-text ru">${escapeHtml(item.example_ru || "")}</div>
        </div>
      `;
  }

  // Synonyms/Antonyms
  if (
    (item.synonyms && item.synonyms.trim()) ||
    (item.antonyms && item.antonyms.trim())
  ) {
    detailsContent += `<div class="list-detail-row">`;
    if (item.synonyms && item.synonyms.trim()) {
      detailsContent += `
            <div class="list-detail-section" style="flex:1; background: var(--section-relation-bg); border-left-color: var(--section-relation-border);">
                <div class="list-detail-label">🔗 Синонимы</div>
                <div class="list-detail-text">${escapeHtml(item.synonyms)}</div>
            </div>`;
    }
    if (item.antonyms && item.antonyms.trim()) {
      detailsContent += `
            <div class="list-detail-section" style="flex:1; background: var(--section-relation-bg); border-left-color: var(--section-relation-border);">
                <div class="list-detail-label">≠ Антонимы</div>
                <div class="list-detail-text">${escapeHtml(item.antonyms)}</div>
            </div>`;
    }
    detailsContent += `</div>`;
  }

  // Notes
  if (
    (item.my_notes && item.my_notes.trim()) ||
    (item.collocations && item.collocations.trim()) ||
    (item.grammar_info && item.grammar_info.trim())
  ) {
    const info = [
      item.collocations
        ? `<b>Коллокации:</b> ${escapeHtml(item.collocations)}`
        : "",
      item.grammar_info
        ? `<b>Грамматика:</b> ${escapeHtml(item.grammar_info)}`
        : "",
      item.my_notes ? `<b>Заметки:</b> ${escapeHtml(item.my_notes)}` : "",
    ]
      .filter((s) => s && s.trim())
      .join("<br>");
    detailsContent += `
        <div class="list-detail-section" style="background: var(--section-extra-bg); border-left-color: var(--section-extra-border);">
            <div class="list-detail-label">📝 Инфо</div>
            <div class="list-detail-text">${info}</div>
        </div>`;
  }

  details.innerHTML = `<div class="list-details-inner">${detailsContent || '<div class="list-detail-empty">Нет дополнительной информации</div>'}</div>`;

  setupLongPress(el, item.id);

  el.onclick = (e) => {
    if (el.dataset.lpHandled) return;

    if (state.selectMode) {
      e.stopPropagation();
      import("./ui_bulk.ts").then((m) => m.toggleSelection(item.id));
      return;
    }

    if ((e.target as HTMLElement).closest("button")) return;

    if (container.classList.contains("expanded")) {
      container.classList.remove("expanded");
      details.style.maxHeight = "0";
    } else {
      container.classList.add("expanded");
      details.style.maxHeight = details.scrollHeight + "px";
    }
  };

  container.appendChild(el);
  container.appendChild(details);
  return container;
}

async function openAddToListModal(wordId: number) {
  const modal = document.getElementById("add-to-list-modal");
  const content = document.getElementById("add-to-list-content");
  if (!modal || !content) return;

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    showToast("Войдите в аккаунт");
    return;
  }

  const myLists = collectionsState.userLists.filter(
    (l) => l.user_id === user.id,
  );

  content.scrollTop = 0;
  content.innerHTML = myLists
    .map((list, index) => {
      const hasWord = collectionsState.listItems[list.id]?.has(wordId);
      return `
        <div class="multiselect-item" data-action="toggle-word-in-list" data-list-id="${list.id}" data-word-id="${wordId}" style="animation: fadeInUpList 0.3s ease-out ${index * 0.05}s backwards">
            <input type="checkbox" ${hasWord ? "checked" : ""} style="pointer-events: none;">
            <span style="margin-left: 10px;">${list.icon || "📁"} ${list.title}</span>
        </div>
        `;
    })
    .join("");

  openModal("add-to-list-modal");
}

export async function toggleWordInList(
  listId: string,
  wId: number,
  el: HTMLElement,
) {
  const checkbox = el.querySelector("input") as HTMLInputElement;
  const isAdding = !checkbox.checked;
  checkbox.checked = isAdding;

  if (isAdding) {
    await client.from("list_items").insert({ list_id: listId, word_id: wId });
    if (!collectionsState.listItems[listId])
      collectionsState.listItems[listId] = new Set();
    collectionsState.listItems[listId].add(wId);
  } else {
    await client
      .from("list_items")
      .delete()
      .match({ list_id: listId, word_id: wId });
    collectionsState.listItems[listId]?.delete(wId);
  }
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

  if (state.wordHistory[id] && !state.wordHistory[id].learnedDate) {
    state.wordHistory[id].learnedDate = Date.now();
  }

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
  checkAchievements();
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
  checkAchievements();
  scheduleSaveState();
  if (state.currentStar === "favorites") render();
}

function resetProgress(id: string | number) {
  state.learned.delete(id);
  state.mistakes.delete(id);
  delete state.wordHistory[id];
  state.dirtyWordIds.add(id);
  checkAchievements();
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
  // 3D tilt effect removed to improve scroll performance and prevent jitter
}

/**
 * General helper to compress, upload, and save an image from a Blob/File.
 */
async function uploadAndSaveImage(
  imageBlob: Blob,
  item: Word,
  img: HTMLImageElement,
  imgContainer: HTMLElement,
  revealOverlay: HTMLElement,
  deleteBtn: HTMLButtonElement,
) {
  const compressedBlob = await compressImage(imageBlob as File);
  const fileName = `${item.id}_custom_${Date.now()}.jpg`;

  const { error: uploadError } = await client.storage
    .from(DB_BUCKETS.IMAGES)
    .upload(fileName, compressedBlob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = client.storage.from(DB_BUCKETS.IMAGES).getPublicUrl(fileName);

  const { error: dbError } = await client
    .from("vocabulary")
    .update({ image: publicUrl, image_source: "custom" })
    .eq("id", item.id);
  if (dbError) throw dbError;

  item.image = publicUrl;
  item.image_source = "custom";
  img.src = publicUrl;
  img.dataset.src = publicUrl;
  imgContainer.classList.remove("blurred");

  img.style.display = "";
  imgContainer.style.backgroundColor = "";
  revealOverlay.style.display = "";
  deleteBtn.style.display = "flex";
  deleteBtn.disabled = false;
}

function showFullScreenImage(src: string, alt: string) {
  const overlay = document.createElement("div");
  overlay.className = "fullscreen-image-overlay";
  overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 30000;
      display: flex; justify-content: center; align-items: center;
      cursor: zoom-out; opacity: 0; transition: opacity 0.3s;
  `;

  const img = document.createElement("img");
  img.src = src;
  img.alt = alt;
  img.style.cssText = `
      max-width: 95%; max-height: 95%; 
      object-fit: contain; border-radius: 8px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      transform: scale(0.9); transition: transform 0.3s;
  `;

  overlay.appendChild(img);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    img.style.transform = "scale(1)";
  });

  overlay.onclick = () => {
    overlay.style.opacity = "0";
    img.style.transform = "scale(0.9)";
    setTimeout(() => overlay.remove(), 300);
  };
}

/**
 * Compresses an image file before upload by drawing it to a canvas.
 * @param file The image file.
 * @param maxWidth The maximum width/height of the output image.
 * @param quality The JPEG quality (0 to 1).
 * @returns A promise that resolves with the compressed Blob.
 */
function compressImage(
  file: File,
  maxWidth: number = 1280,
  quality: number = 0.8,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          } else {
            width = Math.round(width * (maxWidth / height));
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not get canvas context"));

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) =>
            blob ? resolve(blob) : reject(new Error("Canvas to Blob failed")),
          "image/jpeg",
          quality,
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
