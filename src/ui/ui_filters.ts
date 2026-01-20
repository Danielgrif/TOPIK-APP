import { state } from "../core/state.ts";
import { parseBilingualString, showToast } from "../utils/utils.ts";
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

  const actionsContainer = document.createElement('div');
  actionsContainer.id = 'topic-actions-container';
  actionsContainer.style.marginTop = '8px';
  actionsContainer.style.display = 'flex';
  actionsContainer.style.flexDirection = 'column';
  actionsContainer.style.gap = '8px';
  topicSelect.appendChild(actionsContainer);

  if (!state.currentTopic.includes("all") && state.currentTopic.length > 0) {
    const dlBtn = document.createElement("div");
    dlBtn.className = "btn-text";
    dlBtn.style.cssText = "text-align: center; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--primary);";
    dlBtn.innerHTML = "<span>📥</span> Скачать аудио";
    dlBtn.title = "Сохранить озвучку для офлайн-режима";
    dlBtn.onclick = (e) => {
      e.stopPropagation();
      downloadTopicAudio();
    };
    actionsContainer.appendChild(dlBtn);
  }

  // Asynchronously check for cache and add delete button
  addDeleteAudioButton(actionsContainer);

  populateCategoryFilter();
}

function populateCategoryFilter() {
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

function addDeleteAudioButton(container: HTMLElement) {
    if (!("caches" in window)) return;

    caches.has("topik-audio-v1").then(cacheExists => {
        if (cacheExists) {
            const deleteBtn = document.createElement("div");
            deleteBtn.className = "btn-text delete-audio-btn";
            deleteBtn.style.cssText = "text-align: center; cursor: pointer; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px; color: var(--danger);";
            deleteBtn.innerHTML = "<span>🗑️</span> Удалить аудио";
            deleteBtn.title = "Удалить все скачанные аудиофайлы";
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteTopicAudio();
            };
            container.appendChild(deleteBtn);
        } else {
            const existingBtn = container.querySelector('.delete-audio-btn');
            if (existingBtn) existingBtn.remove();
        }
    });
}

export async function downloadTopicAudio() {
  if (!("caches" in window)) {
    showToast("Кэширование недоступно в этом браузере");
    return;
  }

  const topics = state.currentTopic;
  if (topics.includes("all") || topics.length === 0) {
    showToast("Выберите конкретную тему для скачивания");
    return;
  }

  const words = state.dataStore.filter((w) => {
    if (w.type !== state.currentType) return false;
    const t = w.topic || w.topic_ru || w.topic_kr;
    return t && topics.includes(t);
  });

  if (words.length === 0) {
    showToast("Нет слов в выбранной теме");
    return;
  }

  const urls = new Set<string>();
  words.forEach((w) => {
    if (w.audio_url) urls.add(w.audio_url);
    if (w.audio_male) urls.add(w.audio_male);
    if (w.example_audio) urls.add(w.example_audio);
  });

  if (urls.size === 0) {
    showToast("Нет аудиофайлов для скачивания");
    return;
  }

  const toastContainer = document.getElementById("toast-container");
  let progressToast: HTMLDivElement | null = null;

  if (toastContainer) {
    progressToast = document.createElement("div");
    progressToast.className = "toast-item";
    progressToast.textContent = `⏳ Скачивание: 0%`;
    toastContainer.appendChild(progressToast);
  }

  try {
    const cache = await caches.open("topik-audio-v1");
    const urlArray = Array.from(urls);
    let completed = 0;
    
    // Скачиваем пачками по 5, чтобы не перегружать сеть
    const batchSize = 5;
    for (let i = 0; i < urlArray.length; i += batchSize) {
      const batch = urlArray.slice(i, i + batchSize);
      await Promise.all(batch.map(url => cache.add(url).catch(_e => console.warn("Cache fail:", url))));
      
      completed += batch.length;
      if (progressToast) {
        const percent = Math.min(100, Math.round((completed / urlArray.length) * 100));
        progressToast.textContent = `⏳ Скачивание: ${percent}% (${Math.min(completed, urlArray.length)}/${urlArray.length})`;
      }
    }
    
    if (progressToast) {
      progressToast.textContent = `✅ Успешно скачано ${urls.size} файлов!`;
      setTimeout(() => {
        progressToast?.classList.add("toast-hide");
        setTimeout(() => progressToast?.remove(), 500);
      }, 3000);
    } else {
      showToast(`✅ Успешно скачано ${urls.size} файлов!`);
    }
  } catch (e) {
    console.error(e);
    if (progressToast) progressToast.remove();
    showToast("Ошибка при скачивании");
  }
}

export async function deleteTopicAudio() {
  if (!("caches" in window)) {
    showToast("Кэширование недоступно в этом браузере");
    return;
  }

  try {
    const cacheExists = await caches.has("topik-audio-v1");
    if (!cacheExists) {
      showToast("Нет скачанных аудиофайлов для удаления");
      return;
    }

    showToast("⏳ Удаление аудиофайлов...");
    await caches.delete("topik-audio-v1");
    showToast("✅ Все скачанные аудиофайлы удалены");
    document.querySelector('.delete-audio-btn')?.remove();
  } catch (e) {
    console.error(e);
    showToast("Ошибка при удалении кэша");
  }
}
