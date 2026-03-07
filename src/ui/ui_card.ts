import { state } from "../core/state.ts";
import { scheduleSaveState, recordAttempt } from "../core/db.ts";
import {
  updateSRSBadge,
  updateStats,
  addXP,
  checkAchievements,
} from "../core/stats.ts";
import { Word } from "../types/index.ts";
import { collectionsState } from "../core/collections_data.ts";
import { createCardElement, createListItem } from "../core/renderer.ts"; // Now this import is valid
import { client } from "../core/supabaseClient.ts";
import { showToast, promiseWithTimeout } from "../utils/utils.ts";
import { openModal, closeModal } from "./ui_modal.ts";
import { ensureSessionStarted } from "./ui.ts";
import { DB_BUCKETS } from "../core/constants.ts";

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

  // Обновляем глобальный стейт для доступа из renderer.ts (prefetching)
  state.filteredData = currentFilteredData;
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

  prefetchNextImages(endIndex, 4);
  prefetchNextAudio(endIndex, 2);
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

  prefetchNextImages(endIndex, 4);
  prefetchNextAudio(endIndex, 2);
}

export function setupLongPress(el: HTMLElement, itemId: string | number) {
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

function prefetchNextImages(startIndex: number, count: number = 5) {
  const data = currentFilteredData;
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    if (idx < data.length) {
      const item = data[idx];
      if (item.image) {
        const img = new Image();
        img.src = item.image;
      }
    }
  }
}

function prefetchNextAudio(startIndex: number, count: number = 3) {
  const data = currentFilteredData;
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    if (idx < data.length) {
      const item = data[idx];
      let url = item.audio_url;
      if (state.currentVoice === "male" && item.audio_male)
        url = item.audio_male;

      if (url) {
        const audio = new Audio();
        audio.src = url;
        audio.preload = "metadata";
      }
    }
  }
}

export async function openImagePicker(item: Word, btn: HTMLElement) {
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

export async function finalizeImageSelection(
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

export async function openAddToListModal(wordId: number) {
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

export function getAccuracy(id: string | number): number {
  const stats = state.wordHistory[id] || { attempts: 0, correct: 0 };
  if (stats.attempts === 0) return 0;
  return Math.min(100, Math.round((stats.correct / stats.attempts) * 100));
}

export function markLearned(id: string | number) {
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

export function markMistake(id: string | number) {
  ensureSessionStarted();
  state.mistakes.add(id);
  state.learned.delete(id);
  recordAttempt(id, false);
  state.dirtyWordIds.add(id);
  addXP(-5);
  checkAchievements();
  saveAndRender();
}

export function toggleFavorite(id: string | number, btn?: HTMLElement) {
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

export function resetProgress(id: string | number) {
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
export async function uploadAndSaveImage(
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

export function showFullScreenImage(src: string, alt: string) {
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
export function compressImage(
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
