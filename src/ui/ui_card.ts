import { state } from "../core/state.ts";
import { speak, showToast, playTone } from "../utils/utils.ts";
import { scheduleSaveState, recordAttempt } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";
import { ensureSessionStarted, saveAndRender } from "./ui.ts";
import { client } from "../core/supabaseClient.ts";
import { Word } from "../types/index.ts";

// --- Virtual Scroll Constants (for List View) ---
const ITEM_HEIGHT_LIST = 72;
let ITEM_HEIGHT_GRID = 400;
const MIN_COL_WIDTH = 340; // Увеличено для еще более крупных карточек
const BUFFER_ITEMS = 10;
const GRID_GAP = 16;
const GRID_PADDING_X = 48; // 24px left + 24px right

let virtualScrollInitialized = false;
let scrollRafId: number | null = null;
let currentFilteredData: Word[] = [];
let resizeHandler: (() => void) | null = null;

let counterTimeout: number | null = null;

export function updateGridCardHeight() {
  // FIX: Устанавливаем фиксированную высоту для карточек в сетке.
  // Динамический расчет (window.innerHeight) делал их слишком огромными.
  ITEM_HEIGHT_GRID = 400; // Базовая высота, но карточки могут растягиваться
  document.documentElement.style.setProperty("--card-height", `${ITEM_HEIGHT_GRID}px`);
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

  // Контейнер прокрутки должен быть контекстом для позиционирования
  grid.style.position = "relative";

  const content = document.createElement("div");
  content.id = "virtual-grid-content";
  content.className = "vocabulary-inner-grid"; // Настоящий grid-контейнер
  content.style.position = "absolute";
  content.style.top = "0";
  content.style.left = "0";
  content.style.width = "100%";
  content.style.padding = "24px 24px 100px 24px"; // Move padding here
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
    sourceData
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
  const gridWidth = grid.clientWidth - GRID_PADDING_X;
  const gap = GRID_GAP;
  const colCount = Math.max(
    1,
    Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)),
  );

  // FIX: Синхронизируем колонки CSS Grid с расчетами JS
  content.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;

  const totalRows = Math.ceil(sourceData.length / colCount);
  const totalHeight = totalRows > 0 ? totalRows * (ITEM_HEIGHT_GRID + gap) - gap : 0;

  // Добавляем высоту паддингов (24px сверху + 100px снизу = 124px)
  (sizer as HTMLElement).style.height = `${totalHeight + 124}px`;

  const scrollTop = grid.scrollTop;
  const viewportHeight = grid.clientHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / (ITEM_HEIGHT_GRID + gap)));
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

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_LIST) - BUFFER_ITEMS);
  const visibleItemsCount = Math.ceil(viewportHeight / ITEM_HEIGHT_LIST);
  const endIndex = Math.min(sourceData.length, startIndex + visibleItemsCount + BUFFER_ITEMS * 2);

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
  speakBtn.textContent = "🔊";
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

  const levelBadge = document.createElement("div");
  levelBadge.className = "card-level-pill";
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

  front.appendChild(mainContent);

  const footer = document.createElement("div");
  footer.className = "card-footer";

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
    footer.appendChild(statEl);
  }

  const topicObj = item._parsedTopic || { kr: "기타", ru: "Общее" };
  const catObj = item._parsedCategory || { kr: "기타", ru: "Общее" };
  const formatBi = (obj: { kr: string; ru: string }) =>
    obj.kr && obj.ru && obj.kr !== obj.ru
      ? `${obj.kr} (${obj.ru})`
      : obj.kr || obj.ru;

  const tagsDiv = document.createElement("div");
  tagsDiv.className = "card-tags";
  tagsDiv.innerHTML = `
      <span class="tag-pill topic">🏷 ${formatBi(topicObj)}</span>
      <span class="tag-pill category">${formatBi(catObj)}</span>
  `;
  if (item.isLocal) {
      tagsDiv.innerHTML += `<span class="tag-pill ai">⏳ AI</span>`;
  }
  footer.appendChild(tagsDiv);

  front.appendChild(footer);

  return front;
}

function createCardBack(item: Word): HTMLElement {
  const back = document.createElement("div");
  back.className = "card-back";
  
  // 1. Header (Translation) - Fixed at top
  const header = document.createElement("div");
  header.className = "card-back-header";
  header.innerHTML = `<div class="back-translation">${item.translation}</div>`;
  back.appendChild(header);

  // 2. Scrollable Content
  const content = document.createElement("div");
  content.className = "card-back-scroll";

  // --- Image (Blur Reveal) ---
  if (item.image) {
    const imgContainer = document.createElement("div");
    imgContainer.className = "back-image-container blurred"; // Start blurred
    
    const img = document.createElement("img");
    img.dataset.src = item.image;
    img.className = "card-image"; // Keep class for lazy loader
    img.style.objectFit = "cover";
    img.alt = item.word_kr;
    img.draggable = false;
    
    const revealOverlay = document.createElement("div");
    revealOverlay.className = "back-image-overlay";
    revealOverlay.innerHTML = "<span>👁️ Показать</span>";
    
    imgContainer.onclick = (e) => {
      e.stopPropagation();
      // Если клик по кнопкам или инпуту — игнорируем
      if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
      
      imgContainer.classList.toggle("blurred");
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
      const imageUrl = prompt("Вставьте URL изображения (прямую ссылку):");
      if (!imageUrl) return;

      urlBtn.disabled = true;
      urlBtn.classList.add("rotating");

      try {
        // 1. Загружаем картинку по URL. Может не сработать из-за CORS-политики сайта-источника.
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Не удалось загрузить: ${response.statusText} (возможно, CORS)`);
        }
        const imageBlob = await response.blob();
        await uploadAndSaveImage(imageBlob, item, img, imgContainer, revealOverlay, deleteBtn);
        showToast("✅ Картинка загружена по URL!");
      } catch (err: any) {
        showToast("❌ Ошибка: " + (err.message || "Не удалось загрузить по URL"));
      } finally {
        urlBtn.disabled = false;
        urlBtn.classList.remove("rotating");
      }
    };

    // --- Кнопка удаления картинки ---
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "card-image-delete-btn btn-icon";
    deleteBtn.title = "Удалить картинку";
    deleteBtn.innerHTML = "🗑️";
    deleteBtn.style.right = "90px"; // Сдвигаем левее загрузки

    deleteBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Удалить текущее изображение?")) return;

      deleteBtn.disabled = true;
      try {
        // Если картинка своя — удаляем файл из хранилища
        if (item.image_source === 'custom' && item.image) {
           const fileName = item.image.split('/').pop()?.split('?')[0];
           if (fileName) await client.storage.from('image-files').remove([fileName]);
        }

        // Очищаем поле в БД
        const { error } = await client.from('vocabulary').update({ image: null, image_source: null }).eq('id', item.id);
        if (error) throw error;

        // Обновляем UI: скрываем картинку, показываем заглушку
        item.image = undefined;
        item.image_source = undefined;
        img.style.display = "none";
        imgContainer.classList.remove("blurred");
        imgContainer.style.backgroundColor = "var(--surface-3)"; // Цвет заглушки
        revealOverlay.style.display = "none";
        deleteBtn.style.display = "none"; // Скрываем кнопку удаления
        showToast("🗑️ Картинка удалена");
      } catch (err: any) {
        console.error("Delete error:", err);
        showToast("❌ Ошибка удаления");
        deleteBtn.disabled = false;
      }
    };

    const regenBtn = document.createElement("button");
    regenBtn.className = "card-image-regenerate-btn btn-icon";
    regenBtn.title = "Сгенерировать AI";
    regenBtn.innerHTML = "🔄";
    regenBtn.onclick = async (e) => {
      e.stopPropagation();
      const btn = e.currentTarget as HTMLButtonElement;
      btn.disabled = true;
      btn.classList.add('rotating');
      
      try {
        const { data, error } = await client.functions.invoke('regenerate-image', {
          body: { 
            id: item.id, 
            word: item.word_kr, 
            translation: item.translation 
          }
        });

        if (!error && data && data.imageUrl) {
          img.src = data.imageUrl; // URL уже содержит timestamp из Edge Function
          img.dataset.src = data.imageUrl;
          item.image = data.imageUrl;
          item.image_source = 'pixabay';
          imgContainer.classList.remove('blurred');
          
          // Восстанавливаем UI после возможного удаления
          img.style.display = "";
          imgContainer.style.backgroundColor = "";
          revealOverlay.style.display = "";
          deleteBtn.style.display = "flex";
          deleteBtn.disabled = false;
          
          showToast("✅ Картинка обновлена!");
        } else {
        console.error("Regenerate Error:", error); // Log the full error object
        let errorMsg = error.message || "Неизвестная ошибка";
        // The `error.context` is the raw Response. We need to await its JSON body.
        if (error.context && typeof error.context.json === 'function') {
          try {
            const errorBody = await error.context.json();
            errorMsg = errorBody.error || errorMsg; // Use the message from our function
          } catch {
            // Ignore JSON parsing errors, use the default message
          }
        }
        showToast(`❌ Ошибка: ${errorMsg}`);
        }
      } catch (err: any) {
        console.error("Client Error:", err);
        showToast(`❌ Сбой клиента: ${err.message || err}`);
      } finally {
        btn.classList.remove('rotating');
        btn.disabled = false;
      }
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
      if (file.size > 15 * 1024 * 1024) { // Увеличим до 15MB
        showToast("❌ Файл слишком большой (макс 15MB)");
        return;
      }

      uploadBtn.disabled = true;
      uploadBtn.classList.add("rotating");
      try {
        await uploadAndSaveImage(file, item, img, imgContainer, revealOverlay, deleteBtn);
        showToast("✅ Картинка загружена!");
      } catch (err: any) {
        showToast("❌ Ошибка: " + (err.message || "Не удалось загрузить"));
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
    content.appendChild(imgContainer);
  }

  // --- Examples ---
  if (item.example_kr) {
    const exBox = document.createElement("div");
    exBox.className = "back-section";
    // Highlight the word in the example
    const highlightedKr = item.example_kr.replace(
        new RegExp(item.word_kr, 'gi'), 
        `<span class="highlight">${item.word_kr}</span>`
    );
    exBox.innerHTML = `
        <div class="section-label">Пример</div>
        <div class="back-example-kr">${highlightedKr}</div>
        <div class="back-example-ru">${item.example_ru || ""}</div>
    `;
    content.appendChild(exBox);
  }

  // --- Relations (Synonyms/Antonyms) ---
  if (item.synonyms || item.antonyms) {
    const relBox = document.createElement("div");
    relBox.className = "back-section";
    
    if (item.synonyms) {
        const row = document.createElement("div");
        row.className = "relation-row";
        row.innerHTML = `<span class="rel-icon">≈</span> <div class="rel-chips">${
            item.synonyms.split(/[,;]/).map(s => `<span class="rel-chip syn">${s.trim()}</span>`).join("")
        }</div>`;
        relBox.appendChild(row);
    }
    if (item.antonyms) {
        const row = document.createElement("div");
        row.className = "relation-row";
        row.innerHTML = `<span class="rel-icon">≠</span> <div class="rel-chips">${
            item.antonyms.split(/[,;]/).map(s => `<span class="rel-chip ant">${s.trim()}</span>`).join("")
        }</div>`;
        relBox.appendChild(row);
    }
    content.appendChild(relBox);
  }

  // --- Info (Collocations, Grammar, Notes) ---
  if (item.collocations || item.grammar_info || item.my_notes) {
      const infoBox = document.createElement("div");
      infoBox.className = "back-section";
      
      if (item.collocations) {
          infoBox.innerHTML += `<div class="info-item"><span class="info-label">Коллокации:</span> ${item.collocations}</div>`;
      }
      if (item.grammar_info) {
          infoBox.innerHTML += `<div class="info-item"><span class="info-label">Грамматика:</span> ${item.grammar_info}</div>`;
      }
      if (item.my_notes) {
          infoBox.innerHTML += `<div class="info-item"><span class="info-label">Заметки:</span> ${item.my_notes}</div>`;
      }
      content.appendChild(infoBox);
  }

  back.appendChild(content);

  // 3. Footer (Actions) - Fixed at bottom
  const actions = document.createElement("div");
  actions.className = "card-back-actions";

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
  deleteBtn: HTMLButtonElement
) {
    const compressedBlob = await compressImage(imageBlob as File);
    const fileName = `${item.id}_custom_${Date.now()}.jpg`;
    
    const { error: uploadError } = await client.storage.from('image-files').upload(fileName, compressedBlob, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = client.storage.from('image-files').getPublicUrl(fileName);
    
    const { error: dbError } = await client.from('vocabulary').update({ image: publicUrl, image_source: 'custom' }).eq('id', item.id);
    if (dbError) throw dbError;

    item.image = publicUrl;
    item.image_source = 'custom';
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
  const overlay = document.createElement('div');
  overlay.className = 'fullscreen-image-overlay';
  overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 30000;
      display: flex; justify-content: center; align-items: center;
      cursor: zoom-out; opacity: 0; transition: opacity 0.3s;
  `;
  
  const img = document.createElement('img');
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
      overlay.style.opacity = '1';
      img.style.transform = 'scale(1)';
  });
  
  overlay.onclick = () => {
      overlay.style.opacity = '0';
      img.style.transform = 'scale(0.9)';
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
function compressImage(file: File, maxWidth: number = 1280, quality: number = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
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
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Could not get canvas context'));
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Canvas to Blob failed')), 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
