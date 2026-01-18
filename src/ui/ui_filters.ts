import { state } from "../core/state.ts";
import { parseBilingualString } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { Word } from "../types/index.ts";

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
  if (panel)
    document.body.style.overflow = panel.classList.contains("show")
      ? "hidden"
      : "";
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

  content.appendChild(createMultiselectItem("all", "Все темы"));
  const sortedTopics = getTopicsForCurrentType();
  sortedTopics.forEach((t) => {
    const topicLabel = parseBilingualString(t).ru;
    content.appendChild(createMultiselectItem(t, topicLabel));
  });
  topicSelect.appendChild(content);

  populateCategoryFilter();
}

export function populateCategoryFilter() {
  const categorySelect = document.getElementById(
    "categorySelect",
  ) as HTMLSelectElement;
  if (!categorySelect) return;
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
  categorySelect.innerHTML = '<option value="all">Все категории</option>';
  Array.from(categories)
    .sort()
    .forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = parseBilingualString(c).ru;
      categorySelect.appendChild(opt);
    });
  categorySelect.value = "all";
  state.currentCategory = "all";
}

export function handleCategoryChange(val: string) {
  state.currentCategory = val;
  render();
}

export function setTypeFilter(type: string, btn: HTMLElement) {
  state.currentType = type;
  document
    .querySelectorAll("#type-filters button")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  populateFilters();
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
