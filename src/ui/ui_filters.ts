import { state } from "../core/state.ts";
import { parseBilingualString, showToast } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { Word } from "../types/index.ts";

const VIRTUAL_ITEM_HEIGHT = 36;
const VIRTUAL_BUFFER = 10;

// --- Optimization Cache ---
let cachedDataStoreRef: Word[] | null = null;
let cachedWordsByType: Record<string, Word[]> = {};

function getWordsByType(type: string): Word[] {
  // Перестраиваем кэш только если массив данных изменился (по ссылке)
  if (cachedDataStoreRef !== state.dataStore) {
    cachedWordsByType = {};
    for (let i = 0; i < state.dataStore.length; i++) {
      const w = state.dataStore[i];
      const t = w.type || "word";
      if (!cachedWordsByType[t]) cachedWordsByType[t] = [];
      cachedWordsByType[t].push(w);
    }
    cachedDataStoreRef = state.dataStore;
  }
  return cachedWordsByType[type] || [];
}

export function setupFilterBehavior() {
  window.addEventListener("click", (e) => {
    document.querySelectorAll(".multiselect-content.show").forEach((el) => {
      if (
        el.parentElement &&
        e.target instanceof Node &&
        !el.parentElement.contains(e.target)
      )
        el.classList.remove("show");
    });
  });
}

export function toggleFilterPanel() {
  const panel = document.getElementById("filter-panel");
  const overlay = document.getElementById("filter-panel-overlay");
  if (panel) panel.classList.toggle("show");
  if (overlay) overlay.classList.toggle("show");
  if (panel) {
    const isShown = panel.classList.contains("show");
    document.body.style.overflow = isShown ? "hidden" : "";
    if (isShown) updateFilterCounts();
  }
}

function getTopicsForCurrentType(): string[] {
  const topics = new Set<string>();
  state.dataStore.forEach((w: Word) => {
    if (w.type !== state.currentType) return;
    const t = w.topic || w.topic_ru || w.topic_kr;
    if (t) topics.add(t);
  });
  return Array.from(topics).sort();
}

function handleTopicSelection(value: string) {
  const isAllSelected = state.currentTopic.includes("all");
  const isCurrentlyChecked = state.currentTopic.includes(value);

  if (value === "all") {
    state.currentTopic = ["all"];
  } else if (isAllSelected) {
    state.currentTopic = [value];
  } else if (isCurrentlyChecked) {
    state.currentTopic = state.currentTopic.filter((t: string) => t !== value);
    if (state.currentTopic.length === 0) {
      state.currentTopic = ["all"];
    }
  } else {
    state.currentTopic.push(value);
  }

  populateFilters();
  render();
}

function createMultiselectItem(value: string, label: string): HTMLElement {
  const itemDiv = document.createElement("div");
  itemDiv.className = "multiselect-item";

  const isChecked = state.currentTopic.includes(value) || (value === "all" && state.currentTopic.includes("all"));
  itemDiv.innerHTML = `<input type="checkbox" ${isChecked ? "checked" : ""}> <span>${label}</span>`;

  itemDiv.onclick = (e) => {
    e.stopPropagation();
    handleTopicSelection(value);
  };

  return itemDiv;
}

export function populateFilters() {
  const topicSelect = document.getElementById("topicSelect");
  if (!topicSelect) return;

  const wasOpen =
    topicSelect.querySelector(".multiselect-content.show") !== null;

  topicSelect.innerHTML = "";

  const btn = document.createElement("div");
  btn.className = "multiselect-btn";
  btn.style.cursor = "pointer";
  
  const countLabel = state.currentTopic.includes("all") || state.currentTopic.length === 0
    ? "Все темы"
    : `Выбрано: ${state.currentTopic.length}`;
  btn.innerHTML = `<span>${countLabel}</span><span style="font-size: 10px; opacity: 0.6;">▼</span>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    topicSelect.querySelector(".multiselect-content")?.classList.toggle("show");
  };
  topicSelect.appendChild(btn);

  const content = document.createElement("div");
  content.className = "multiselect-content";
  if (wasOpen) {
    content.classList.add("show");
  }

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display: flex; gap: 8px; padding: 5px 10px 10px; border-bottom: 1px solid var(--border-color);';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'btn-text';
  selectAllBtn.style.fontSize = '12px';
  selectAllBtn.textContent = 'Выбрать все';
  selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentTopic = getTopicsForCurrentType();
      if (state.currentTopic.length === 0) state.currentTopic = ['all'];
      populateFilters();
      render();
  };

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.className = 'btn-text';
  deselectAllBtn.style.fontSize = '12px';
  deselectAllBtn.textContent = 'Сбросить';
  deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentTopic = ['all'];
      populateFilters();
      render();
  };

  // --- Search Input for Topics ---
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 Поиск тем...";
  searchInput.className = "filter-search-input";
  searchInput.onclick = (e) => e.stopPropagation();
  searchInput.oninput = (e) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase();
    content.querySelectorAll(".multiselect-item").forEach((el) => {
      const text = el.textContent?.toLowerCase() || "";
      (el as HTMLElement).style.display = text.includes(val) ? "flex" : "none";
    });
  };

  // --- Virtual Scroll Setup ---
  const listContainer = document.createElement("div");
  listContainer.className = "multiselect-scroll-container";

  const sizer = document.createElement("div");
  const virtualContent = document.createElement("div");
  virtualContent.className = "virtual-content";
  sizer.appendChild(virtualContent);
  listContainer.appendChild(sizer);

  actionsDiv.appendChild(selectAllBtn);
  actionsDiv.appendChild(deselectAllBtn);
  content.appendChild(actionsDiv);
  content.appendChild(searchInput);
  content.appendChild(listContainer);

  const sortedTopics = getTopicsForCurrentType();
  const allItems = [{ value: "all", label: "Все темы" }, ...sortedTopics.map(t => ({ value: t, label: parseBilingualString(t).ru }))];
  let searchFilteredItems = allItems;

  const renderVisibleItems = () => {
    const scrollTop = listContainer.scrollTop;
    const viewportHeight = listContainer.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER);
    const visibleItemsCount = Math.ceil(viewportHeight / VIRTUAL_ITEM_HEIGHT);
    const endIndex = Math.min(searchFilteredItems.length, startIndex + visibleItemsCount + VIRTUAL_BUFFER * 2);

    const topOffset = startIndex * VIRTUAL_ITEM_HEIGHT;
    virtualContent.style.transform = `translateY(${topOffset}px)`;
    virtualContent.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const item = searchFilteredItems[i];
        fragment.appendChild(createMultiselectItem(item.value, item.label));
    }
    virtualContent.appendChild(fragment);
  };

  searchInput.oninput = () => {
    const val = searchInput.value.toLowerCase();
    searchFilteredItems = allItems.filter(item => item.label.toLowerCase().includes(val));
    sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
    listContainer.scrollTop = 0;
    renderVisibleItems();
  };

  listContainer.onscroll = renderVisibleItems;

  sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
  renderVisibleItems();

  topicSelect.appendChild(content);

  populateCategoryFilter();
}

function populateCategoryFilter() {
  const categorySelect = document.getElementById("categorySelect");
  if (!categorySelect) return;

  const wasOpen = categorySelect.querySelector(".multiselect-content.show") !== null;
  categorySelect.innerHTML = "";

  // Button
  const btn = document.createElement("div");
  btn.className = "multiselect-btn";
  btn.style.cursor = "pointer";
  
  let currentLabel = "Все категории";
  if (!state.currentCategory.includes("all") && state.currentCategory.length > 0) {
     currentLabel = `Выбрано: ${state.currentCategory.length}`;
  }

  btn.innerHTML = `<span>${currentLabel}</span><span style="font-size: 10px; opacity: 0.6;">▼</span>`;
  btn.onclick = (e) => {
    e.stopPropagation();
    // Close other dropdowns
    document.querySelectorAll(".multiselect-content.show").forEach(el => {
        if (el.parentElement !== categorySelect) el.classList.remove("show");
    });
    categorySelect.querySelector(".multiselect-content")?.classList.toggle("show");
  };
  categorySelect.appendChild(btn);

  const content = document.createElement("div");
  content.className = "multiselect-content";
  if (wasOpen) content.classList.add("show");

  const getCategories = () => {
    const categories = new Set<string>();
    state.dataStore.forEach((w: Word) => {
      if (w.type !== state.currentType) return;
      const t = w.topic || w.topic_ru || w.topic_kr;
      if (
        !t ||
        (!state.currentTopic.includes("all") && !state.currentTopic.includes(t))
      )
        return;
      const c = w.category || w.category_ru || w.category_kr;
      if (c) categories.add(c);
    });
    return Array.from(categories).sort();
  };

  // --- Search Input for Categories ---
  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.placeholder = "🔍 Поиск категорий...";
  searchInput.className = "filter-search-input";
  searchInput.onclick = (e) => e.stopPropagation();
  searchInput.oninput = (e) => {
    const val = (e.target as HTMLInputElement).value.toLowerCase();
    content.querySelectorAll(".multiselect-item").forEach((el) => {
       const text = el.textContent?.toLowerCase() || "";
       (el as HTMLElement).style.display = text.includes(val) ? "flex" : "none";
    });
  };

  const actionsDiv = document.createElement('div');
  actionsDiv.style.cssText = 'display: flex; gap: 8px; padding: 5px 10px 10px; border-bottom: 1px solid var(--border-color);';
  
  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'btn-text';
  selectAllBtn.style.fontSize = '12px';
  selectAllBtn.textContent = 'Выбрать все';
  selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentCategory = getCategories();
      if (state.currentCategory.length === 0) state.currentCategory = ['all'];
      populateCategoryFilter();
      render();
  };

  const deselectAllBtn = document.createElement('button');
  deselectAllBtn.className = 'btn-text';
  deselectAllBtn.style.fontSize = '12px';
  deselectAllBtn.textContent = 'Сбросить';
  deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentCategory = ['all'];
      populateCategoryFilter();
      render();
  };

  actionsDiv.appendChild(selectAllBtn);
  actionsDiv.appendChild(deselectAllBtn);

  // --- Virtual Scroll Setup ---
  const listContainer = document.createElement("div");
  listContainer.className = "multiselect-scroll-container";

  const sizer = document.createElement("div");
  const virtualContent = document.createElement("div");
  virtualContent.className = "virtual-content";
  sizer.appendChild(virtualContent);
  listContainer.appendChild(sizer);

  content.appendChild(actionsDiv);
  content.appendChild(searchInput);
  content.appendChild(listContainer);

  const allItems = [{ value: "all", label: "Все категории" }, ...getCategories().map(c => ({ value: c, label: parseBilingualString(c).ru }))];
  let searchFilteredItems = allItems;

  const renderVisibleItems = () => {
    const scrollTop = listContainer.scrollTop;
    const viewportHeight = listContainer.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER);
    const visibleItemsCount = Math.ceil(viewportHeight / VIRTUAL_ITEM_HEIGHT);
    const endIndex = Math.min(searchFilteredItems.length, startIndex + visibleItemsCount + VIRTUAL_BUFFER * 2);

    const topOffset = startIndex * VIRTUAL_ITEM_HEIGHT;
    virtualContent.style.transform = `translateY(${topOffset}px)`;
    virtualContent.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = startIndex; i < endIndex; i++) {
        const item = searchFilteredItems[i];
        fragment.appendChild(createCategoryItem(item.value, item.label));
    }
    virtualContent.appendChild(fragment);
  };

  searchInput.oninput = () => {
    const val = searchInput.value.toLowerCase();
    searchFilteredItems = allItems.filter(item => item.label.toLowerCase().includes(val));
    sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
    listContainer.scrollTop = 0;
    renderVisibleItems();
  };

  listContainer.onscroll = renderVisibleItems;

  sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
  renderVisibleItems();
  
  categorySelect.appendChild(content);
}

export function handleCategoryChange(val: string) {
  const isAllSelected = state.currentCategory.includes("all");
  const isCurrentlyChecked = state.currentCategory.includes(val);

  if (val === "all") {
    state.currentCategory = ["all"];
  } else if (isAllSelected) {
    state.currentCategory = [val];
  } else if (isCurrentlyChecked) {
    state.currentCategory = state.currentCategory.filter((c) => c !== val);
    if (state.currentCategory.length === 0) state.currentCategory = ["all"];
  } else {
    state.currentCategory.push(val);
  }
  populateCategoryFilter();
  render();
}

function createCategoryItem(value: string, label: string): HTMLElement {
  const itemDiv = document.createElement("div");
  itemDiv.className = "multiselect-item";
  const isChecked = state.currentCategory.includes(value) || (value === "all" && state.currentCategory.includes("all"));
  itemDiv.innerHTML = `<input type="checkbox" ${isChecked ? "checked" : ""}> <span>${label}</span>`;
  itemDiv.onclick = (e) => {
      e.stopPropagation();
      handleCategoryChange(value);
  };
  return itemDiv;
}

export function setTypeFilter(type: string, btn: HTMLElement) {
  state.currentType = type;
  document
    .querySelectorAll("#type-filters button")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  populateFilters();
  updateFilterCounts();
  render();
}

export function setStarFilter(star: string, btn: HTMLElement) {
  state.currentStar = star;
  document
    .querySelectorAll("#level-filters button")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  render();
}

export function resetFilters() {
  state.currentType = "word";
  state.currentStar = "all";
  state.currentTopic = ["all"];
  state.currentCategory = ["all"];

  // Обновляем UI переключателя типа
  document.querySelectorAll("#type-filters .segment-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-value") === "word");
  });

  // Обновляем UI фильтров уровня
  document.querySelectorAll("#level-filters .filter-chip").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-value") === "all");
  });

  populateFilters(); // Пересоздает списки тем и категорий
  updateFilterCounts(); // Обновляет счетчики
  render(); // Перерисовывает сетку
  showToast("Фильтры сброшены");
}

export function updateFilterCounts() {
  const levelFiltersContainer = document.getElementById("level-filters");
  if (!levelFiltersContainer) return;

  // Используем requestAnimationFrame, чтобы не блокировать UI при открытии панели
  requestAnimationFrame(() => {
    const counts: Record<string, number> = {
      'all': 0,
      '★★★': 0,
      '★★☆': 0,
      '★☆☆': 0,
      'favorites': 0,
      'mistakes': 0,
    };

    const type = state.currentType;
    // Используем кэшированный список слов для текущего типа
    const words = getWordsByType(type);

    // Используем классический цикл for для максимальной производительности
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      counts.all++;
      
      if (word.level && counts[word.level] !== undefined) {
        counts[word.level]++;
      }
      if (state.favorites.has(word.id)) {
        counts.favorites++;
      }
      if (state.mistakes.has(word.id)) {
        counts.mistakes++;
      }
    }

    const buttons = levelFiltersContainer.querySelectorAll<HTMLButtonElement>(".filter-chip");
    buttons.forEach(btn => {
      const filterValue = btn.dataset.value;
      if (filterValue && counts[filterValue] !== undefined) {
        const count = counts[filterValue];
        
        let countSpan = btn.querySelector<HTMLElement>('.filter-count');
        if (!countSpan) {
          countSpan = document.createElement('span');
          countSpan.className = 'filter-count';
          btn.appendChild(countSpan);
        }
        
        const newText = String(count);
        if (countSpan.textContent !== newText) {
          countSpan.textContent = newText;
          countSpan.classList.remove('pop');
          void countSpan.offsetWidth; // Force reflow to restart animation
          countSpan.classList.add('pop');
        }
      }
    });
  });
}
