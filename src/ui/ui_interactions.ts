import { state } from "../core/state.ts";
import { setTypeFilter } from "./ui_filters.ts";
import { closeModal } from "./ui_modal.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { LS_KEYS, SW_MESSAGES } from "../core/constants.ts";

export function showUpdateNotification(worker: ServiceWorker) {
  let el = document.getElementById("update-notification");
  if (!el) {
    el = document.createElement("div");
    el.id = "update-notification";
    el.innerHTML = `
            <div style="font-weight:700; font-size:14px; color:var(--text-main);">🚀 Доступна новая версия</div>
            <button class="btn btn-quiz" id="update-btn" style="padding: 6px 14px; font-size:12px; border-radius:20px; min-height: 32px;">Обновить</button>
        `;
    document.body.appendChild(el);
    const btn = document.getElementById("update-btn");
    if (btn)
      btn.onclick = () =>
        worker.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
  }
  setTimeout(() => el!.classList.add("show"), 100);
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
    let content = activeModal.querySelector(".modal-content") as HTMLElement;

    // FIX: Для модальных окон с фиксированным хедером (где .modal-content имеет overflow:hidden),
    // нужно проверять скролл на внутреннем контейнере.
    const scrollableChild = activeModal.querySelector(
      "#collections-list, #review-container, #trash-list, #mistakes-content, #grammar-content, #hanja-list, #achievements-list, #profile-scroll-container, .modal-body-container, #shop-scroll-container, #quotes-list, #image-picker-grid, .multiselect-scroll-container, #add-to-list-content",
    );

    if (scrollableChild) {
      content = scrollableChild as HTMLElement;
    }

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
  const scrollContainer = document.getElementById("vocabulary-grid");
  if (!header || !scrollContainer) return;

  // --- Back to Top Button ---
  let backToTopBtn = document.getElementById("back-to-top-btn");
  if (!backToTopBtn) {
    backToTopBtn = document.createElement("button");
    backToTopBtn.id = "back-to-top-btn";
    backToTopBtn.className = "back-to-top-btn";
    backToTopBtn.innerHTML = "↑";
    backToTopBtn.title = "Наверх";
    backToTopBtn.onclick = () => {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.body.appendChild(backToTopBtn);
  }

  let lastScrollY = scrollContainer.scrollTop;

  scrollContainer.addEventListener(
    "scroll",
    () => {
      const currentScrollY = scrollContainer.scrollTop;

      // Header visibility
      if (currentScrollY > lastScrollY && currentScrollY > 50)
        header.classList.add("hidden");
      else header.classList.remove("hidden");

      // Back to Top visibility
      if (currentScrollY > 400) {
        backToTopBtn?.classList.add("visible");
      } else {
        backToTopBtn?.classList.remove("visible");
      }

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
    LS_KEYS.SEARCH_HISTORY,
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
        LS_KEYS.SEARCH_HISTORY,
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
  if (localStorage.getItem(LS_KEYS.PWA_BANNER_DISMISSED)) return;

  const banner = document.getElementById("install-banner");
  if (banner) {
    setTimeout(() => banner.classList.add("show"), 4000);
  }
}

export function dismissInstallBanner() {
  const banner = document.getElementById("install-banner");
  if (banner) banner.classList.remove("show");
  localStorage.setItem(LS_KEYS.PWA_BANNER_DISMISSED, "true");
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
