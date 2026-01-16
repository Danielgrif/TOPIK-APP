import { state } from "../core/state.ts";
import { client } from "../core/supabaseClient.ts";
import { speak, showToast, debounce } from "../utils/utils.ts";
import { scheduleSaveState, recordAttempt } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";
import { ensureSessionStarted, saveAndRender } from "./ui.ts";
import { Word } from "../types/index.ts";

// --- Virtual Scroll Constants (for List View) ---
const ITEM_HEIGHT_LIST = 72;
const ITEM_HEIGHT_GRID = 280;
const MIN_COL_WIDTH = 160;
const BUFFER_ITEMS = 10;

let virtualScrollInitialized = false;
const debouncedRenderVisible = debounce(renderVisibleListItems, 50);

/** @type {IntersectionObserver | null} */
const scrollObserver: IntersectionObserver | null = null;
/** @type {IntersectionObserver | null} */
let appearanceObserver: IntersectionObserver | null = null;

export function renderSkeletons() {
  const grid = document.getElementById("vocabulary-grid");
  if (!grid) return;
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

  if (virtualScrollInitialized) {
    grid.removeEventListener("scroll", debouncedRenderVisible as EventListener);
    virtualScrollInitialized = false;
  }
  grid.classList.remove("virtual-scroll-container", "list-view", "grid");
  grid.innerHTML = "";

  if (state.viewMode === "list") {
    grid.classList.add("list-view", "virtual-scroll-container");
    initVirtualScroll(grid);
    return;
  }

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

function getFilteredData(): Word[] {
  const source = (state.searchResults || state.dataStore || []) as Word[];
  return source.filter((w) => {
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

function initGridVirtualScroll(grid: HTMLElement) {
  const sourceData = getFilteredData();

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

  grid.addEventListener("scroll", debouncedRenderVisible as EventListener);
  window.addEventListener("resize", debouncedRenderVisible as EventListener);

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
  const grid = (params.target || params.currentTarget) as HTMLElement;
  if (!grid) return;

  const sourceData = params.sourceData || getFilteredData();
  const content =
    params.contentContainer || document.getElementById("virtual-grid-content");
  const sizer = params.sizer || grid.querySelector(".virtual-sizer");

  if (!content || !sizer) return;

  const gridWidth = grid.clientWidth;
  const gap = 15;
  const colCount = Math.max(
    1,
    Math.floor((gridWidth + gap) / (MIN_COL_WIDTH + gap)),
  );

  const totalRows = Math.ceil(sourceData.length / colCount);
  const totalHeight = totalRows * ITEM_HEIGHT_GRID;

  sizer.style.height = `${totalHeight}px`;

  const scrollTop = grid.scrollTop;
  const viewportHeight = grid.clientHeight;

  const startRow = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT_GRID) - 2);
  const visibleRows = Math.ceil(viewportHeight / ITEM_HEIGHT_GRID) + 4;

  const startIndex = startRow * colCount;
  const endIndex = Math.min(
    sourceData.length,
    startIndex + visibleRows * colCount,
  );

  content.innerHTML = "";

  const topSpacerHeight = startRow * ITEM_HEIGHT_GRID;
  if (topSpacerHeight > 0) {
    const spacer = document.createElement("div");
    spacer.style.gridColumn = "1 / -1";
    spacer.style.height = `${topSpacerHeight}px`;
    content.appendChild(spacer);
  }

  const visibleData = sourceData.slice(startIndex, endIndex);
  const fragment = document.createDocumentFragment();

  visibleData.forEach((item: Word) => {
    fragment.appendChild(createCardElement(item));
  });

  content.appendChild(fragment);
}

function initVirtualScroll(grid: HTMLElement) {
  const sourceData = getFilteredData();

  if (sourceData.length === 0) {
    renderEmptyState(grid);
    return;
  }

  const sizer = document.createElement("div");
  sizer.className = "virtual-sizer";
  sizer.style.height = `${sourceData.length * ITEM_HEIGHT_LIST}px`;
  grid.appendChild(sizer);

  grid.addEventListener("scroll", debouncedRenderVisible as EventListener);
  virtualScrollInitialized = true;

  renderVisibleListItems({ target: grid, sourceData });
}

function renderVisibleListItems(params: {
  target: HTMLElement;
  sourceData: Word[];
}) {
  const grid = (params.target || params.currentTarget) as HTMLElement;
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
    const el = createListItem(item);
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

function createCardElement(item: Word): HTMLElement {
  const el = document.createElement("div");
  el.className = "card";
  if (state.hanjaMode) el.classList.add("hanja-mode");
  if (item.type === "grammar") el.classList.add("grammar-card");
  if (state.learned.has(item.id)) el.classList.add("learned");
  if (state.mistakes.has(item.id)) el.classList.add("has-mistake");

  const inner = document.createElement("div");
  inner.className = "card-inner";
  const front = createCardFront(item);
  const back = createCardBack(item);

  inner.appendChild(front);
  inner.appendChild(back);
  el.appendChild(inner);
  el.onclick = () => {
    el.classList.toggle("revealed");
    if (navigator.vibrate) navigator.vibrate(10);
  };
  return el;
}

function createCardFront(item: Word): HTMLElement {
  const front = document.createElement("div");
  front.className = "card-front";
  const isFav = state.favorites.has(item.id);

  const topRow = document.createElement("div");
  topRow.className = "card-top-row";

  const levelBadge = document.createElement("div");
  levelBadge.className = "card-level-badge";
  levelBadge.textContent = item.level || "★☆☆";
  topRow.appendChild(levelBadge);

  const controlsDiv = document.createElement("div");
  controlsDiv.className = "card-top-right";
  const speakBtn = document.createElement("button");
  speakBtn.className = "icon-btn";
  speakBtn.textContent = "🔊";
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
  };
  const favBtn = document.createElement("button");
  favBtn.className = `icon-btn fav-btn ${isFav ? "active" : ""}`;
  favBtn.textContent = isFav ? "❤️" : "🤍";
  favBtn.title = isFav ? "Убрать из избранного" : "В избранное";
  favBtn.onclick = (e) => {
    e.stopPropagation();
    toggleFavorite(item.id, favBtn);
  };
  controlsDiv.appendChild(speakBtn);
  controlsDiv.appendChild(favBtn);
  topRow.appendChild(controlsDiv);
  front.appendChild(topRow);

  const mainContent = document.createElement("div");
  mainContent.className = "card-main";
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
            <div style="font-size: 10px; color: var(--text-sub); margin-top: 5px; opacity: 0.7; font-weight: 500;">(Мастер: >90% • Хорошо: >70%)</div>
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

  const imgContainer = document.createElement("div");
  imgContainer.className = "card-image-container";
  const imgUrl = item.image;
  const img = document.createElement("img");
  img.className = "card-image";
  img.loading = "lazy";
  img.draggable = false;
  if (imgUrl) {
    img.src = imgUrl;
    img.onerror = () => {
      img.style.display = "none";
    };
  } else {
    img.style.display = "none";
  }
  imgContainer.appendChild(img);

  const ctrls = document.createElement("div");
  ctrls.className = "img-controls";
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  fileInput.onchange = async (e) => {
    const target = e.target as HTMLInputElement;
    const file = target.files ? target.files[0] : null;
    if (!file) return;
    try {
      showToast("⏳ Загрузка...");

      if (item.image && item.image.includes(item.id + "_")) {
        const oldPath = (item.image.split("/").pop() || "").split("?")[0];
        await client.storage.from("image-files").remove([oldPath]);
      }

      const ext = file.name.split(".").pop();
      const path = `${item.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await client.storage
        .from("image-files")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = client.storage.from("image-files").getPublicUrl(path);
      const { error: dbErr } = await client
        .from("vocabulary")
        .update({ image: publicUrl, image_source: "user" })
        .eq("id", item.id);
      if (dbErr) throw dbErr;
      item.image = publicUrl;
      img.src = publicUrl;
      img.style.display = "block";
      showToast("✅ Фото обновлено");
    } catch (err) {
      console.error(err);
      showToast("❌ Ошибка загрузки");
    } finally {
      fileInput.value = "";
    }
  };
  const upBtn = document.createElement("button");
  upBtn.className = "btn-mini";
  upBtn.innerHTML = "📷";
  upBtn.title = "Загрузить фото";
  upBtn.onclick = (e) => {
    e.stopPropagation();
    fileInput.click();
  };
  ctrls.appendChild(fileInput);
  ctrls.appendChild(upBtn);

  if (item.image) {
    const delBtn = document.createElement("button");
    delBtn.className = "btn-mini delete";
    delBtn.innerHTML = "🗑";
    delBtn.title = "Удалить свое фото";
    delBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Удалить загруженное фото?")) return;
      try {
        const { error } = await client
          .from("vocabulary")
          .update({ image: null, image_source: null })
          .eq("id", item.id);
        if (error) throw error;
        item.image = undefined;
        item.image_source = undefined;
        img.style.display = "none";
        delBtn.remove();
        showToast("🗑 Фото удалено");
      } catch (err) {
        console.error(err);
        showToast("❌ Ошибка");
      }
    };
    ctrls.appendChild(delBtn);
  }
  imgContainer.appendChild(ctrls);
  backContent.appendChild(imgContainer);

  const trans = document.createElement("div");
  trans.className = "translation";
  trans.textContent = item.translation || "";
  backContent.appendChild(trans);

  if (item.synonyms || item.antonyms || item.collocations) {
    const tagsDiv = document.createElement("div");
    tagsDiv.className = "card-tags";
    if (item.synonyms)
      tagsDiv.innerHTML += `<span class="info-tag tag-syn">≈ ${item.synonyms}</span>`;
    if (item.antonyms)
      tagsDiv.innerHTML += `<span class="info-tag tag-ant">≠ ${item.antonyms}</span>`;
    if (item.collocations)
      tagsDiv.innerHTML += `<div class="info-tag tag-coll">🔗 ${item.collocations}</div>`;
    backContent.appendChild(tagsDiv);
  }

  if (item.example_kr || item.example_ru)
    backContent.innerHTML += `<div class="example-box"><div class="ex-kr">${item.example_kr || ""}</div><div class="ex-ru">${item.example_ru || ""}</div></div>`;
  if (item.my_notes)
    backContent.innerHTML += `<div class="note-box"><div style="font-size:16px;">💡</div><div>${item.my_notes}</div></div>`;
  if (item.grammar_info)
    backContent.innerHTML += `<div class="note-box"><div style="font-size:16px;">📘</div><div>${item.grammar_info}</div></div>`;

  back.appendChild(backContent);

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

  const practiceBtn = document.createElement("button");
  practiceBtn.className = "action-btn";
  practiceBtn.textContent = "🗣️";
  practiceBtn.title = "Проверить произношение";
  practiceBtn.style.background = "var(--info)";
  practiceBtn.style.flex = "0.5";
  practiceBtn.onclick = (e) => {
    e.stopPropagation();
    window.checkPronunciation(item.word_kr, practiceBtn);
  };
  actions.appendChild(practiceBtn);
  back.appendChild(actions);

  return back;
}

function createListItem(item: Word): HTMLElement {
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
  scheduleSaveState();
  if (state.currentStar === "favorites") render();
}

export function resetProgress(id: string | number) {
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

export function setupScrollObserver() {
  if (scrollObserver) scrollObserver.disconnect();
  if (appearanceObserver) appearanceObserver.disconnect();

  const cards = document.querySelectorAll(".card:not(.visible)");
  if (cards.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "50px" },
  );
  appearanceObserver = observer;

  cards.forEach((card) => observer.observe(card));
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
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;
    card.style.setProperty("--rx", `${rotateX}deg`);
    card.style.setProperty("--ry", `${rotateY}deg`);
  });
  grid.addEventListener("mouseout", (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const card = target.closest(".card") as HTMLElement;
    if (card && !card.contains(e.relatedTarget as Node)) {
      card.style.setProperty("--rx", "0deg");
      card.style.setProperty("--ry", "0deg");
    }
  });
}
