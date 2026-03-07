import { state } from "../core/state.ts";
import { showToast, getIconForValue, escapeHtml } from "../utils/utils.ts";
import { Word } from "../types/index.ts";

const VIRTUAL_ITEM_HEIGHT = 36;
const VIRTUAL_BUFFER = 10;

// --- Optimization Cache ---
let cachedDataStoreRef: Word[] | null = null;
let cachedWordsByType: Record<string, Word[]> = Object.create(null);

function getWordsByType(type: string): Word[] {
  // Перестраиваем кэш только если массив данных изменился (по ссылке)
  if (cachedDataStoreRef !== state.dataStore) {
    cachedWordsByType = Object.create(null);
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
  setupSortButtons();
}

function setupSortButtons() {
  const container = document.querySelector(".sort-actions");
  if (!container) return;

  if (!container.querySelector('[data-action="sort-level"]')) {
    const btn = document.createElement("div");
    btn.className = "sort-btn";
    btn.setAttribute("data-action", "sort-level");
    btn.innerHTML = `<span class="sort-icon">⭐</span><span>По сложности</span>`;
    container.appendChild(btn);
  }

  if (!container.querySelector('[data-action="sort-date"]')) {
    const btn = document.createElement("div");
    btn.className = "sort-btn";
    btn.setAttribute("data-action", "sort-date");
    btn.innerHTML = `<span class="sort-icon">📅</span><span>По дате</span>`;
    container.appendChild(btn);
  }
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
  const data = state.dataStore;
  for (let i = 0; i < data.length; i++) {
    const w = data[i];
    if (w.type !== state.currentType) continue;
    const t = w.topic_ru || w.topic_kr;
    if (t) topics.add(t);
  }
  return Array.from(topics).sort();
}

function handleTopicSelection(value: string) {
  const isAllSelected = state.currentTopic.includes("all");
  const isCurrentlyChecked = state.currentTopic.includes(value);

  if (value === "all") {
    // Если выбрали "Все", сбрасываем остальные
    state.currentTopic = ["all"];
  } else if (isAllSelected) {
    // Если было выбрано "Все" и выбрали конкретную, убираем "Все"
    state.currentTopic = [value];
  } else if (isCurrentlyChecked) {
    // Если уже выбрано, убираем
    state.currentTopic = state.currentTopic.filter((t: string) => t !== value);
    // Если ничего не осталось, возвращаем "Все"
    if (state.currentTopic.length === 0) {
      state.currentTopic = ["all"];
    }
  } else {
    // Добавляем новую тему
    state.currentTopic.push(value);
  }

  populateFilters();
  document.dispatchEvent(new CustomEvent("state-changed"));
}

function createMultiselectItem(value: string, label: string): HTMLElement {
  const itemDiv = document.createElement("div");
  itemDiv.className = "multiselect-item";

  const isChecked =
    state.currentTopic.includes(value) ||
    (value === "all" && state.currentTopic.includes("all"));
  const icon = getIconForValue(value, "🏷️");
  itemDiv.innerHTML = `<input type="checkbox" ${isChecked ? "checked" : ""}> <span style="margin-right: 6px;">${icon}</span> <span>${escapeHtml(label)}</span>`;

  itemDiv.onclick = (e) => {
    e.stopPropagation();
    handleTopicSelection(value);
  };

  return itemDiv;
}

export function populateFilters() {
  // Update Topic Button Text
  const topicBtn = document.getElementById("topic-filter-btn");
  if (topicBtn) {
    const valEl = topicBtn.querySelector(".fs-value");
    const countLabel =
      state.currentTopic.includes("all") || state.currentTopic.length === 0
        ? "Все темы"
        : `Выбрано: ${state.currentTopic.length}`;
    if (valEl) valEl.textContent = countLabel;
  }

  // Render Topic Modal Content
  const topicContainer = document.getElementById("topic-modal-content");
  if (topicContainer) {
    // Save state before wipe
    let savedScroll = 0;
    const existingList = topicContainer.querySelector(
      ".multiselect-scroll-container",
    );
    if (existingList) savedScroll = existingList.scrollTop;

    let savedSearch = "";
    const existingSearch = topicContainer.querySelector(
      "input.search-box",
    ) as HTMLInputElement;
    if (existingSearch) savedSearch = existingSearch.value;

    topicContainer.innerHTML = "";

    // --- Search Input for Topics ---
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "🔍 Поиск тем...";
    searchInput.className = "search-box";
    searchInput.style.marginBottom = "10px";
    searchInput.value = savedSearch;
    searchInput.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value.toLowerCase();
      topicContainer.querySelectorAll(".multiselect-item").forEach((el) => {
        const text = el.textContent?.toLowerCase() || "";
        (el as HTMLElement).style.display = text.includes(val)
          ? "flex"
          : "none";
      });
    };
    topicContainer.appendChild(searchInput);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "multiselect-actions";

    const selectAllBtn = document.createElement("button");
    selectAllBtn.className = "multiselect-action-btn";
    selectAllBtn.textContent = "Выбрать все";
    selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentTopic = getTopicsForCurrentType();
      if (state.currentTopic.length === 0) state.currentTopic = ["all"];
      populateFilters();
      document.dispatchEvent(new CustomEvent("state-changed"));
    };

    const deselectAllBtn = document.createElement("button");
    deselectAllBtn.className = "multiselect-action-btn";
    deselectAllBtn.textContent = "Сбросить";
    deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentTopic = ["all"];
      populateFilters();
      document.dispatchEvent(new CustomEvent("state-changed"));
    };

    actionsDiv.appendChild(selectAllBtn);
    actionsDiv.appendChild(deselectAllBtn);
    topicContainer.appendChild(actionsDiv);

    // --- Virtual Scroll Setup ---
    const listContainer = document.createElement("div");
    listContainer.className = "multiselect-scroll-container";
    // Height is now handled by CSS flexbox

    const sizer = document.createElement("div");
    const virtualContent = document.createElement("div");
    virtualContent.className = "virtual-content";
    sizer.appendChild(virtualContent);
    listContainer.appendChild(sizer);
    topicContainer.appendChild(listContainer);

    const sortedTopics = getTopicsForCurrentType();
    const allItems = [
      { value: "all", label: "Все темы" },
      ...sortedTopics.map((t) => ({
        value: t,
        label: t, // t is already topic_ru
      })),
    ];
    let searchFilteredItems = allItems;
    if (savedSearch) {
      const val = savedSearch.toLowerCase();
      searchFilteredItems = allItems.filter((item) =>
        item.label.toLowerCase().includes(val),
      );
    }

    const renderVisibleItems = () => {
      const scrollTop = listContainer.scrollTop;
      const viewportHeight = listContainer.clientHeight;

      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER,
      );
      const visibleItemsCount = Math.ceil(viewportHeight / VIRTUAL_ITEM_HEIGHT);
      const endIndex = Math.min(
        searchFilteredItems.length,
        startIndex + visibleItemsCount + VIRTUAL_BUFFER * 2,
      );

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

    // Override input handler to update virtual list
    searchInput.oninput = (e) => {
      const val = (e.target as HTMLInputElement).value.toLowerCase();
      searchFilteredItems = allItems.filter((item) =>
        item.label.toLowerCase().includes(val),
      );
      sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
      listContainer.scrollTop = 0;
      renderVisibleItems();
    };

    listContainer.onscroll = renderVisibleItems;
    sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
    if (savedScroll > 0) listContainer.scrollTop = savedScroll;
    renderVisibleItems();
  }

  populateCategoryFilter();
}

function populateCategoryFilter() {
  // Update Category Button Text
  const catBtn = document.getElementById("category-filter-btn");
  if (catBtn) {
    const valEl = catBtn.querySelector(".fs-value");
    let currentLabel = "Все категории";
    if (
      !state.currentCategory.includes("all") &&
      state.currentCategory.length > 0
    ) {
      currentLabel = `Выбрано: ${state.currentCategory.length}`;
    }
    if (valEl) valEl.textContent = currentLabel;
  }

  // Render Category Modal Content
  const catContainer = document.getElementById("category-modal-content");
  if (catContainer) {
    // Save state
    let savedScroll = 0;
    const existingList = catContainer.querySelector(
      ".multiselect-scroll-container",
    );
    if (existingList) savedScroll = existingList.scrollTop;

    let savedSearch = "";
    const existingSearch = catContainer.querySelector(
      "input.search-box",
    ) as HTMLInputElement;
    if (existingSearch) savedSearch = existingSearch.value;

    catContainer.innerHTML = "";

    const getCategories = () => {
      const categories = new Set<string>();
      const data = state.dataStore;
      const currentType = state.currentType;
      const currentTopic = state.currentTopic;
      const isAllTopics = currentTopic.includes("all");

      for (let i = 0; i < data.length; i++) {
        const w = data[i];
        if (w.type !== currentType) continue;
        const t = w.topic_ru || w.topic_kr;
        if (!t || (!isAllTopics && !currentTopic.includes(t))) continue;

        const c = w.category_ru || w.category_kr;
        if (c) categories.add(c);
      }
      return Array.from(categories).sort();
    };

    // --- Search Input for Categories ---
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "🔍 Поиск категорий...";
    searchInput.className = "search-box";
    searchInput.style.marginBottom = "10px";
    searchInput.value = savedSearch;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "multiselect-actions";

    const selectAllBtn = document.createElement("button");
    selectAllBtn.className = "multiselect-action-btn";
    selectAllBtn.textContent = "Выбрать все";
    selectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentCategory = getCategories();
      if (state.currentCategory.length === 0) state.currentCategory = ["all"];
      populateCategoryFilter();
      document.dispatchEvent(new CustomEvent("state-changed"));
    };

    const deselectAllBtn = document.createElement("button");
    deselectAllBtn.className = "multiselect-action-btn";
    deselectAllBtn.textContent = "Сбросить";
    deselectAllBtn.onclick = (e) => {
      e.stopPropagation();
      state.currentCategory = ["all"];
      populateCategoryFilter();
      document.dispatchEvent(new CustomEvent("state-changed"));
    };

    actionsDiv.appendChild(selectAllBtn);
    actionsDiv.appendChild(deselectAllBtn);
    catContainer.appendChild(searchInput);
    catContainer.appendChild(actionsDiv);

    // --- Virtual Scroll Setup ---
    const listContainer = document.createElement("div");
    listContainer.className = "multiselect-scroll-container";
    // Height is now handled by CSS flexbox

    const sizer = document.createElement("div");
    const virtualContent = document.createElement("div");
    virtualContent.className = "virtual-content";
    sizer.appendChild(virtualContent);
    listContainer.appendChild(sizer);
    catContainer.appendChild(listContainer);

    const allItems = [
      { value: "all", label: "Все категории" },
      ...getCategories().map((c) => ({
        value: c,
        label: c, // c is already category_ru
      })),
    ];
    let searchFilteredItems = allItems;
    if (savedSearch) {
      const val = savedSearch.toLowerCase();
      searchFilteredItems = allItems.filter((item) =>
        item.label.toLowerCase().includes(val),
      );
    }

    const renderVisibleItems = () => {
      const scrollTop = listContainer.scrollTop;
      const viewportHeight = listContainer.clientHeight;

      const startIndex = Math.max(
        0,
        Math.floor(scrollTop / VIRTUAL_ITEM_HEIGHT) - VIRTUAL_BUFFER,
      );
      const visibleItemsCount = Math.ceil(viewportHeight / VIRTUAL_ITEM_HEIGHT);
      const endIndex = Math.min(
        searchFilteredItems.length,
        startIndex + visibleItemsCount + VIRTUAL_BUFFER * 2,
      );

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
      searchFilteredItems = allItems.filter((item) =>
        item.label.toLowerCase().includes(val),
      );
      sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
      listContainer.scrollTop = 0;
      renderVisibleItems();
    };

    listContainer.onscroll = renderVisibleItems;
    sizer.style.height = `${searchFilteredItems.length * VIRTUAL_ITEM_HEIGHT}px`;
    if (savedScroll > 0) listContainer.scrollTop = savedScroll;
    renderVisibleItems();
  }
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
  document.dispatchEvent(new CustomEvent("state-changed"));
}

function createCategoryItem(value: string, label: string): HTMLElement {
  const itemDiv = document.createElement("div");
  itemDiv.className = "multiselect-item";
  const isChecked =
    state.currentCategory.includes(value) ||
    (value === "all" && state.currentCategory.includes("all"));
  const icon = getIconForValue(value, "🔹");
  itemDiv.innerHTML = `<input type="checkbox" ${isChecked ? "checked" : ""}> <span style="margin-right: 6px;">${icon}</span> <span>${escapeHtml(label)}</span>`;
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
  document.dispatchEvent(new CustomEvent("state-changed"));
}

export function setStarFilter(star: string, btn: HTMLElement) {
  state.currentStar = star;
  // Сбрасываем активный класс у всех кнопок фильтрации (и уровни, и статусы)
  document
    .querySelectorAll(".filter-chip")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.dispatchEvent(new CustomEvent("state-changed"));
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
  document.querySelectorAll(".filter-chip").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-value") === "all");
  });

  populateFilters(); // Пересоздает списки тем и категорий
  updateFilterCounts(); // Обновляет счетчики
  document.dispatchEvent(new CustomEvent("state-changed"));
  showToast("Фильтры сброшены");
}

export function updateFilterCounts() {
  // Ищем все кнопки фильтров (и в level-grid, и в status-grid)
  const buttons = document.querySelectorAll<HTMLButtonElement>(".filter-chip");
  if (buttons.length === 0) return;

  // Используем requestAnimationFrame, чтобы не блокировать UI при открытии панели
  requestAnimationFrame(() => {
    const counts: Record<string, number> = {
      all: 0,
      "★★★": 0,
      "★★☆": 0,
      "★☆☆": 0,
      favorites: 0,
      mistakes: 0,
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

    buttons.forEach((btn) => {
      const filterValue = btn.dataset.value;
      if (filterValue && counts[filterValue] !== undefined) {
        const count = counts[filterValue];

        let countSpan = btn.querySelector<HTMLElement>(".filter-count");
        if (!countSpan) {
          countSpan = document.createElement("span");
          countSpan.className = "filter-count";
          btn.appendChild(countSpan);
        }

        const newText = String(count);
        if (countSpan.textContent !== newText) {
          countSpan.textContent = newText;
          countSpan.classList.remove("pop");
          void countSpan.offsetWidth; // Force reflow to restart animation
          countSpan.classList.add("pop");
        }
      }
    });
  });
}
