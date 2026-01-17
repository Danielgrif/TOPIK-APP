import { state } from "../core/state.ts";
import { setTypeFilter } from "./ui_filters.ts";
import { closeModal } from "./ui_modal.ts";
import { showToast, playTone } from "../utils/utils.ts";

export function showUpdateNotification(worker: ServiceWorker) {
  let el = document.getElementById("update-notification");
  if (!el) {
    el = document.createElement("div");
    el.id = "update-notification";
    el.innerHTML = `
            <div style="font-weight:bold; font-size:14px;">🚀 Доступна новая версия</div>
            <button class="btn btn-quiz" id="update-btn" style="padding: 6px 14px; font-size:12px; border-radius:20px;">Обновить</button>
        `;
    document.body.appendChild(el);
    const btn = document.getElementById("update-btn");
    if (btn) btn.onclick = () => worker.postMessage({ type: "SKIP_WAITING" });
  }
  setTimeout(() => el!.classList.add("show"), 500);
}

export function setupGestures() {
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener(
    "touchstart",
    (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    (e) => {
      const touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      if (e.target)
        handleGesture(touchStartX, touchStartY, touchEndX, touchEndY, e.target);
    },
    { passive: true },
  );
}

function handleGesture(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  target: EventTarget,
) {
  const diffX = endX - startX;
  const diffY = endY - startY;
  const absX = Math.abs(diffX);
  const absY = Math.abs(diffY);
  const minSwipe = 60;

  const activeModal = document.querySelector(".modal.active");
  if (activeModal && target instanceof Node && activeModal.contains(target)) {
    const content = activeModal.querySelector(".modal-content");
    if (
      diffY > minSwipe &&
      absY > absX * 1.5 &&
      content &&
      content.scrollTop <= 0
    ) {
      closeModal(activeModal.id);
    }
    return;
  }

  if (
    target instanceof Element &&
    (target.closest(".stats-strip") || target.closest(".slider"))
  )
    return;

  if (absX > minSwipe && absX > absY * 1.5) {
    const btns = document.querySelectorAll("#type-filters .segment-btn");
    if (btns.length < 2) return;

    if (diffX > 0 && state.currentType === "grammar") {
      setTypeFilter("word", btns[0] as HTMLElement);
      showToast("📖 Слова");
    } else if (diffX < 0 && state.currentType === "word") {
      setTypeFilter("grammar", btns[1] as HTMLElement);
      showToast("📘 Грамматика");
    }
  }
}

export function setupScrollBehavior() {
  const header = document.getElementById("main-header");
  if (!header) return;

  let lastScrollY = window.scrollY;

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50)
        header.classList.add("hidden");
      else header.classList.remove("hidden");
      lastScrollY = currentScrollY;
    },
    { passive: true },
  );
}

export function saveSearchHistory(query: string) {
  if (!query || query.length < 2) return;

  state.searchHistory = state.searchHistory.filter((q: string) => q !== query);
  state.searchHistory.unshift(query);
  if (state.searchHistory.length > 5)
    state.searchHistory = state.searchHistory.slice(0, 5);

  localStorage.setItem(
    "search_history_v1",
    JSON.stringify(state.searchHistory),
  );
}

export function showSearchHistory(inputEl: HTMLInputElement) {
  if (!state.searchHistory || state.searchHistory.length === 0) return;

  let dropdown = document.getElementById("search-history-dropdown");
  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.id = "search-history-dropdown";
    dropdown.className = "search-history-dropdown";
    if (inputEl.parentNode) inputEl.parentNode.appendChild(dropdown);
  }

  dropdown.innerHTML = "";

  state.searchHistory.forEach((q: string) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<span style="opacity:0.5;">🕒</span> ${q}`;

    item.onmousedown = (e) => {
      e.preventDefault();
      inputEl.value = q;
      inputEl.dispatchEvent(new Event("input"));
      hideSearchHistory();
    };

    const delBtn = document.createElement("span");
    delBtn.innerHTML = "✕";
    delBtn.className = "history-del";
    delBtn.onclick = (e) => {
      e.stopPropagation();
      state.searchHistory = state.searchHistory.filter((x: string) => x !== q);
      localStorage.setItem(
        "search_history_v1",
        JSON.stringify(state.searchHistory),
      );
      showSearchHistory(inputEl);
      if (state.searchHistory.length === 0) hideSearchHistory();
    };

    item.appendChild(delBtn);
    dropdown!.appendChild(item);
  });

  dropdown.style.display = "block";
}

export function hideSearchHistory() {
  const dropdown = document.getElementById("search-history-dropdown");
  if (dropdown) {
    dropdown.style.display = "none";
  }
}

export function showInstallBanner() {
  if (localStorage.getItem("pwa_banner_dismissed_v1")) return;

  const banner = document.getElementById("install-banner");
  if (banner) {
    setTimeout(() => banner.classList.add("show"), 4000);
  }
}

export function dismissInstallBanner() {
  const banner = document.getElementById("install-banner");
  if (banner) banner.classList.remove("show");
  localStorage.setItem("pwa_banner_dismissed_v1", "true");
}

export function showLevelUpAnimation(level: number) {
  const overlay = document.getElementById("level-up-overlay");
  const valEl = document.getElementById("level-up-val");
  if (!overlay || !valEl) return;

  valEl.textContent = String(level);
  overlay.classList.add("active");
  playTone("success", 300);

  if (typeof window.confetti === "function") {
    window.confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      zIndex: 20020,
    });
  }
}
