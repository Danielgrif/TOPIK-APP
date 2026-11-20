import { client } from "../core/supabaseClient.ts";
import { showToast, escapeHtml, playTone, debounce } from "../utils/utils.ts";
import { openModal, openConfirm, closeModal } from "./ui_modal.ts";
import { LS_KEYS } from "../core/constants.ts";
import { compressImage } from "./ui_card.ts";
import { renderVirtualKeyboard } from "./keyboard.ts";
import { BaseComponent } from "./BaseComponent.ts";

let currentTask = "51";
let currentHistoryFilter = "all";
let currentImage: { data: string; mimeType: string } | null = null;
let timerInterval: number | null = null;
let timeLeft = 0;
let isTimerRunning = false;
let observer: MutationObserver | null = null;
let currentFontSize = localStorage.getItem("writing_font_size_v1") || "md";
const FONT_SIZES = ["sm", "md", "lg", "xl"];

const TASK_LIMITS: Record<string, { min: number; max: number }> = {
  "51": { min: 5, max: 100 }, // Минимум слово с грамматикой, макс 1 предложение
  "52": { min: 5, max: 100 },
  "53": { min: 200, max: 300 },
  "54": { min: 600, max: 700 },
};

// Рекомендуемое время для заданий (в секундах)
const TASK_DURATIONS: Record<string, number> = {
  "51": 5 * 60, // 5 минут
  "52": 5 * 60, // 5 минут
  "53": 15 * 60, // 15 минут
  "54": 30 * 60, // 30 минут
};

export interface EssayCorrection {
  original: string;
  corrected: string;
  reason: string;
}

export interface WritingHistoryItem {
  id: string;
  timestamp: number;
  taskType: string;
  question: string;
  answer: string;
  image?: { data: string; mimeType: string } | null;
  isFavorite?: boolean;
  result: {
    score: number;
    feedback: string;
    corrections: EssayCorrection[];
    improved_version?: string;
  };
}

// Тип для ответа от Edge Function, включающий служебные поля
interface EssayCheckResponse {
  score: number;
  feedback: string;
  corrections: EssayCorrection[];
  improved_version?: string;
  success?: boolean;
  error?: string;
}

class WritingComponent extends BaseComponent {
  constructor() {
    super("writing-modal");
  }

  public init() {
    // FIX: Если компонент создан до инъекции HTML, element - это заглушка.
    // Обновляем ссылку на реальный элемент перед инициализацией.
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("writing-modal");
      if (el) this.element = el;
    }
    super.init();
    this.setupInternalListeners();
  }

  public destroy() {
    super.destroy();
    stopTimer(); // Ensure timer stops when component is destroyed
  }

  private setupInternalListeners() {
    const modal = this.element;

    // Observer for visibility changes to stop timer
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          if (!modal.classList.contains("active")) {
            stopTimer();
          }
        }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });

    // ... Rest of init logic ...
    // History Filters
    const historyFilters = document.getElementById("writing-history-filters");
    if (historyFilters) {
      const btns = historyFilters.querySelectorAll(".history-filter-btn");
      btns.forEach((btn) => {
        btn.addEventListener("click", () => {
          btns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          currentHistoryFilter = (btn as HTMLElement).dataset.filter || "all";
          showHistory();
        });
      });
    }

    // Expand (Maximize) Logic
    const expandBtn = document.getElementById("writing-expand-btn");
    const focusBtn = document.getElementById("writing-focus-btn");

    if (expandBtn) {
      expandBtn.onclick = () => setMaximized();
    }

    if (focusBtn) {
      focusBtn.onclick = () => setFocusMode();
    }

    // Font Size Logic
    const fontBtn = document.getElementById("writing-font-size-btn");
    if (fontBtn) {
      fontBtn.onclick = cycleFontSize;
    }

    // ... Continue with all existing listeners ...
    // Image Upload Logic, Timer Logic, etc.
    // (For brevity, assuming they are called or moved here.
    // Since they rely on global variables in this file, we can keep using the file-scope functions
    // but called from here to ensure initialization order).

    // Call existing setup functions that attach listeners
    this.setupImageUpload();
    this.setupTimer();
    this.setupInputs();
    this.setupHistory();

    // Restore Draft
    restoreDraft();
    applyFontSize();
  }

  private setupImageUpload() {
    const imgBtn = document.getElementById("writing-img-btn");
    const fileInput = document.getElementById("writing-file-input") as HTMLInputElement;
    const imgPreview = document.getElementById("writing-img-preview");
    const imgEl = document.getElementById("writing-question-img") as HTMLImageElement;
    const removeImgBtn = document.getElementById("remove-writing-img");

    if (imgBtn && fileInput) {
      imgBtn.onclick = () => fileInput.click();
      fileInput.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const compressedBlob = await compressImage(file, 800, 0.7);
          const base64 = await blobToBase64(compressedBlob);

          currentImage = {
            data: base64,
            mimeType: "image/jpeg",
          };

          if (imgEl && imgPreview) {
            imgEl.src = URL.createObjectURL(compressedBlob);
            imgPreview.style.display = "block";
          }
          showToast("📷 Изображение добавлено!");

          if (["51", "52", "54"].includes(currentTask) && currentImage) {
            const qInput = document.getElementById("writing-question") as HTMLTextAreaElement;
            if (qInput && !qInput.value.trim()) {
              showToast("🔍 Распознавание текста...");
              client.functions
                .invoke("ocr-image", { body: { image: currentImage } })
                .then(({ data }) => {
                  if (data && data.text) {
                    const ocrTextarea = document.getElementById(
                      "ocr-edit-textarea",
                    ) as HTMLTextAreaElement;
                    if (ocrTextarea) {
                      ocrTextarea.value = data.text.trim();
                      openModal("ocr-edit-modal");
                    }
                  }
                })
                .catch((err) => console.error("OCR Error:", err));
            }
          }
        } catch (err) {
          console.error("Image process error", err);
          showToast("Ошибка обработки изображения");
        }
        fileInput.value = "";
      };
    }

    if (removeImgBtn) {
      removeImgBtn.onclick = () => {
        currentImage = null;
        if (imgPreview) imgPreview.style.display = "none";
        if (imgEl) imgEl.src = "";
      };
    }

    const ocrConfirmBtn = document.getElementById("ocr-confirm-btn");
    if (ocrConfirmBtn) {
      ocrConfirmBtn.onclick = () => {
        const ocrTextarea = document.getElementById("ocr-edit-textarea") as HTMLTextAreaElement;
        const qInput = document.getElementById("writing-question") as HTMLTextAreaElement;
        if (ocrTextarea && qInput) {
          qInput.value = ocrTextarea.value.trim();
          saveDraft();
          closeModal("ocr-edit-modal");
          showToast("✅ Текст вставлен");
        }
      };
    }
  }

  private setupTimer() {
    const timerBtn = document.getElementById("writing-timer-toggle");
    if (timerBtn) {
      timerBtn.onclick = toggleTimer;
    }
    resetTimer();
  }

  private setupInputs() {
    const answerInput = document.getElementById("writing-answer") as HTMLTextAreaElement;
    const charCount = document.getElementById("char-count");

    // Virtual Keyboard
    if (answerInput) {
      const parent = answerInput.parentElement;
      if (parent) {
        parent.style.position = "relative";
        // Only add button if not exists
        if (!parent.querySelector(".kb-toggle-btn")) {
          const kbToggle = document.createElement("button");
          kbToggle.innerHTML = "⌨️";
          kbToggle.className = "btn-icon kb-toggle-btn";
          kbToggle.style.cssText =
            "position: absolute; right: 10px; bottom: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px; background: var(--surface-1); border: 1px solid var(--border-color); opacity: 0.8;";
          kbToggle.title = "Корейская клавиатура";
          parent.appendChild(kbToggle);

          const kbWrapper = document.createElement("div");
          parent.appendChild(kbWrapper);

          const kb = renderVirtualKeyboard(kbWrapper, answerInput, kbToggle);
          if (kb) {
            kbToggle.onclick = () => {
              const isVisible = kb.style.display === "grid";
              kb.style.display = isVisible ? "none" : "grid";
              if (!isVisible)
                setTimeout(() => kb.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
            };
          }
        }
      }

      // Input listeners
      answerInput.addEventListener("input", () => {
        // updateCharCount(); // Assuming this function is available or moved to method
        const len = answerInput.value.length;
        const limits = TASK_LIMITS[currentTask];

        if (charCount) {
          charCount.style.color = "var(--text-sub)";
          charCount.style.fontWeight = "normal";
          answerInput.style.borderColor = "";
          answerInput.style.boxShadow = "";

          if (limits && limits.max > 0) {
            charCount.textContent = `${len} / ${limits.max} знаков`;
            if (len < limits.min) {
              charCount.style.color = "var(--warning)";
            } else if (len > limits.max) {
              charCount.style.color = "var(--danger)";
              charCount.style.fontWeight = "bold";
              answerInput.style.borderColor = "var(--danger)";
              answerInput.style.boxShadow = "0 0 0 4px rgba(225, 29, 72, 0.1)";
            } else {
              charCount.style.color = "var(--success)";
            }
          } else {
            charCount.textContent = `${len} знаков`;
          }
        }
        saveDraft();
      });

      const debouncedSave = debounce(() => saveDraft(), 500);
      answerInput.addEventListener("click", debouncedSave);
      answerInput.addEventListener("keyup", debouncedSave);
    }

    const questionInput = document.getElementById("writing-question") as HTMLTextAreaElement;
    if (questionInput) {
      questionInput.addEventListener("input", saveDraft);
    }

    const taskSelector = document.getElementById("writing-task-selector");
    if (taskSelector) {
      const buttons = taskSelector.querySelectorAll(".segment-btn");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          currentTask = (btn as HTMLElement).dataset.task || "51";
          resetTimer();
          // Manually trigger input to update char count
          if (answerInput) answerInput.dispatchEvent(new Event("input"));
        });
      });
    }

    const checkBtn = document.getElementById("check-writing-btn");
    if (checkBtn) {
      checkBtn.onclick = handleCheck;
    }
  }

  private setupHistory() {
    const historyBtn = document.getElementById("writing-history-btn");
    if (historyBtn) historyBtn.onclick = showHistory;

    const backBtn = document.getElementById("back-to-editor-btn");
    if (backBtn) backBtn.onclick = hideHistory;

    const clearBtn = document.getElementById("clear-writing-history-btn");
    if (clearBtn) clearBtn.onclick = handleClearHistory;
  }

  protected render(): void {
    // No dynamic render on data change for now
  }
}

const writingView = new WritingComponent();

export function openWritingModal() {
  openModal("writing-modal");
}

/**
 * Initializes the Writing AI modal logic.
 * Must be called after the HTML components are injected.
 */
export function initWritingUI() {
  // Allow re-initialization if the modal was removed from DOM (e.g. re-injection)
  // checking if listeners are attached is hard, so we just check if element exists
  const modal = document.getElementById("writing-modal");
  if (!modal) return;

  writingView.init();

  // Additional listeners that were outside setupInternalListeners but part of global init
  // Orientation Handler: Auto-maximize/focus on mobile landscape
  const handleOrientation = () => {
    const isMobileLandscape = window.matchMedia(
      "(max-height: 500px) and (orientation: landscape)",
    ).matches;
    if (isMobileLandscape) {
      setFocusMode(true);
      setMaximized(true);
    }
  };
  const debouncedOrientationHandler = debounce(handleOrientation, 300);
  window.addEventListener("resize", debouncedOrientationHandler);
  handleOrientation();

  // Close Button Interceptor
  // Перехватываем нажатие на кнопку закрытия, чтобы показать подтверждение, если есть текст
  const closeBtn = modal.querySelector(".close-modal-btn");
  if (closeBtn) {
    // Using old style event listener because 'close-modal' logic is generic
    closeBtn.addEventListener("click", (e) => {
      const qVal = (
        document.getElementById("writing-question") as HTMLTextAreaElement
      )?.value.trim();
      const aVal = (document.getElementById("writing-answer") as HTMLTextAreaElement)?.value.trim();

      if (qVal || aVal) {
        e.preventDefault();
        e.stopPropagation(); // Останавливаем всплытие к глобальному обработчику в ui.ts
        openConfirm(
          "Черновик сохранен. Закрыть окно?",
          () => {
            stopTimer();
            closeModal("writing-modal");
          },
          { confirmText: "Закрыть", cancelText: "Отмена" },
        );
      }
    });
  }
}

function updateTimerDisplay() {
  const display = document.getElementById("writing-timer-display");
  if (!display) return;
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  display.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  // Красный цвет, если осталось меньше 1 минуты
  if (timeLeft < 60) {
    display.style.color = "var(--danger)";
  } else {
    display.style.color = "var(--text-main)";
  }
}

function startTimer() {
  if (isTimerRunning) return;
  isTimerRunning = true;
  const btn = document.getElementById("writing-timer-toggle");
  if (btn) btn.textContent = "⏸️";

  timerInterval = window.setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
    } else {
      stopTimer();
      showToast("⏰ Время вышло!");
      playTone("failure");
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  isTimerRunning = false;
  const btn = document.getElementById("writing-timer-toggle");
  if (btn) btn.textContent = "▶️";
}

function toggleTimer() {
  if (isTimerRunning) stopTimer();
  else startTimer();
}

function resetTimer() {
  stopTimer();
  timeLeft = TASK_DURATIONS[currentTask] || 300;
  updateTimerDisplay();
}

function setMaximized(force?: boolean) {
  const modal = document.getElementById("writing-modal");
  const btn = document.getElementById("writing-expand-btn");
  if (modal) {
    const isMax = force !== undefined ? force : !modal.classList.contains("maximized");
    if (isMax) modal.classList.add("maximized");
    else modal.classList.remove("maximized");

    if (btn) {
      btn.textContent = isMax ? "⤓" : "⤢";
      btn.title = isMax ? "Свернуть" : "На весь экран";
    }
  }
}

function setFocusMode(force?: boolean) {
  const modal = document.getElementById("writing-modal");
  if (modal) {
    const isFocus = force !== undefined ? force : !modal.classList.contains("focus-mode");
    if (isFocus) modal.classList.add("focus-mode");
    else modal.classList.remove("focus-mode");
  }
}

function cycleFontSize() {
  const idx = FONT_SIZES.indexOf(currentFontSize);
  const nextIdx = (idx + 1) % FONT_SIZES.length;
  currentFontSize = FONT_SIZES[nextIdx];
  localStorage.setItem("writing_font_size_v1", currentFontSize);
  applyFontSize();
  showToast(`Шрифт: ${currentFontSize.toUpperCase()}`);
}

function applyFontSize() {
  const modal = document.getElementById("writing-modal");
  if (!modal) return;
  FONT_SIZES.forEach((size) => modal.classList.remove(`font-size-${size}`));
  modal.classList.add(`font-size-${currentFontSize}`);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function saveDraft() {
  const question =
    (document.getElementById("writing-question") as HTMLTextAreaElement)?.value || "";
  const aInput = document.getElementById("writing-answer") as HTMLTextAreaElement;
  const answer = aInput?.value || "";
  const cursor = aInput?.selectionStart || 0;

  const draft = {
    taskType: currentTask,
    question,
    answer,
    cursor,
    timestamp: Date.now(),
  };
  localStorage.setItem(LS_KEYS.WRITING_DRAFT, JSON.stringify(draft));
}

function restoreDraft() {
  try {
    const saved = localStorage.getItem(LS_KEYS.WRITING_DRAFT);
    if (!saved) return;

    const draft = JSON.parse(saved);
    if (draft.taskType) {
      currentTask = draft.taskType;
      const btns = document.querySelectorAll("#writing-task-selector .segment-btn");
      btns.forEach((b) => {
        if ((b as HTMLElement).dataset.task === currentTask) b.classList.add("active");
        else b.classList.remove("active");
      });
      resetTimer(); // Update timer for restored task
    }

    const qInput = document.getElementById("writing-question") as HTMLTextAreaElement;
    if (qInput) qInput.value = draft.question || "";

    const aInput = document.getElementById("writing-answer") as HTMLTextAreaElement;
    if (aInput) {
      aInput.value = draft.answer || "";
      aInput.dispatchEvent(new Event("input")); // Update char count

      if (typeof draft.cursor === "number") {
        aInput.setSelectionRange(draft.cursor, draft.cursor);
      }
    }
  } catch (e) {
    console.error("Failed to restore draft", e);
  }
}

function saveToHistory(item: WritingHistoryItem) {
  try {
    const raw = localStorage.getItem(LS_KEYS.WRITING_HISTORY);
    const history: WritingHistoryItem[] = raw ? JSON.parse(raw) : [];
    history.unshift(item);
    if (history.length > 20) history.pop();
    localStorage.setItem(LS_KEYS.WRITING_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history", e);
  }
}

function toggleHistoryFavorite(id: string) {
  const raw = localStorage.getItem(LS_KEYS.WRITING_HISTORY);
  const items: WritingHistoryItem[] = raw ? JSON.parse(raw) : [];
  const item = items.find((i) => i.id === id);
  if (item) {
    item.isFavorite = !item.isFavorite;
    localStorage.setItem(LS_KEYS.WRITING_HISTORY, JSON.stringify(items));
    showHistory();
  }
}

function deleteHistoryItem(id: string) {
  openConfirm("Удалить эту запись?", () => {
    const raw = localStorage.getItem(LS_KEYS.WRITING_HISTORY);
    let items: WritingHistoryItem[] = raw ? JSON.parse(raw) : [];
    items = items.filter((i) => i.id !== id);
    localStorage.setItem(LS_KEYS.WRITING_HISTORY, JSON.stringify(items));
    showHistory(); // Refresh list
    showToast("Запись удалена");
  });
}

function showHistory() {
  const editor = document.getElementById("writing-editor-view");
  const history = document.getElementById("writing-history-view");
  const list = document.getElementById("writing-history-list");
  const clearBtn = document.getElementById("clear-writing-history-btn");

  if (editor) editor.style.display = "none";
  if (history) history.style.display = "flex";

  if (!list) return;
  list.innerHTML = "";

  const raw = localStorage.getItem(LS_KEYS.WRITING_HISTORY);
  const allItems: WritingHistoryItem[] = raw ? JSON.parse(raw) : [];

  if (allItems.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:20px;">История пуста</div>`;
    if (clearBtn) clearBtn.style.display = "none";
    return;
  }

  if (clearBtn) clearBtn.style.display = "block";

  // Apply Filter
  let filteredItems = allItems;
  if (currentHistoryFilter === "favorites") {
    filteredItems = allItems.filter((item) => item.isFavorite);
  } else if (currentHistoryFilter !== "all") {
    filteredItems = allItems.filter((item) => item.taskType === currentHistoryFilter);
  }

  if (filteredItems.length === 0) {
    const emptyMsg =
      currentHistoryFilter === "favorites"
        ? "Нет избранных эссе"
        : `Нет записей для задания ${currentHistoryFilter}`;
    list.innerHTML = `<div style="text-align:center; color:var(--text-sub); padding:20px;">${emptyMsg}</div>`;
    return;
  }

  filteredItems.forEach((item) => {
    const el = document.createElement("div");
    el.className = "history-card";
    const date =
      new Date(item.timestamp).toLocaleDateString() +
      " " +
      new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const hasImage = item.image ? "📷 " : "";
    const isFav = item.isFavorite;
    const starColor = isFav ? "var(--gold)" : "var(--text-tertiary)";

    el.innerHTML = `
      <div class="history-card-header">
        <span>${hasImage}Задание ${item.taskType} • <span style="opacity:0.7; font-size: 0.9em;">${date}</span></span>
        <div style="display:flex; align-items:center; gap:8px;">
            <button class="fav-history-item" style="background:none; border:none; color:${starColor}; cursor:pointer; font-size:18px; padding:0; line-height:1;" title="${isFav ? "Убрать из избранного" : "В избранное"}">${isFav ? "★" : "☆"}</button>
            <span class="history-card-score">${item.result.score}/10</span>
            <button class="delete-history-item" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; font-size:16px; padding:0;">✕</button>
        </div>
      </div>
      <div class="history-card-preview" style="color: var(--text-sub);">${escapeHtml(item.question || (item.image ? "Изображение" : "Без вопроса"))}</div>
      <div class="history-card-preview" style="margin-top:4px; font-weight:500;">${escapeHtml(item.answer)}</div>
    `;

    const favBtn = el.querySelector(".fav-history-item") as HTMLElement;
    if (favBtn) {
      favBtn.onclick = (e) => {
        e.stopPropagation();
        toggleHistoryFavorite(item.id);
      };
    }

    const delBtn = el.querySelector(".delete-history-item") as HTMLElement;
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteHistoryItem(item.id);
      };
    }

    el.onclick = (e) => {
      if ((e.target as HTMLElement).closest("button")) return;

      hideHistory();
      renderResult(item.result, item.question, item.answer);
      // Restore input values too
      const qInput = document.getElementById("writing-question") as HTMLTextAreaElement;
      const aInput = document.getElementById("writing-answer") as HTMLTextAreaElement;
      if (qInput) qInput.value = item.question;
      if (aInput) {
        aInput.value = item.answer;
        aInput.dispatchEvent(new Event("input"));
      }

      // Restore Image
      currentImage = item.image || null;
      const imgPreview = document.getElementById("writing-img-preview");
      const imgEl = document.getElementById("writing-question-img") as HTMLImageElement;
      if (currentImage && imgEl && imgPreview) {
        imgEl.src = `data:${currentImage.mimeType};base64,${currentImage.data}`;
        imgPreview.style.display = "block";
      } else if (imgPreview) {
        imgPreview.style.display = "none";
      }

      currentTask = item.taskType;
      const btns = document.querySelectorAll("#writing-task-selector .segment-btn");
      btns.forEach((b) => {
        if ((b as HTMLElement).dataset.task === currentTask) b.classList.add("active");
        else b.classList.remove("active");
      });
    };
    list.appendChild(el);
  });
}

function hideHistory() {
  const editor = document.getElementById("writing-editor-view");
  const history = document.getElementById("writing-history-view");
  if (editor) editor.style.display = "flex";
  if (history) history.style.display = "none";
}

function handleClearHistory() {
  openConfirm("Очистить историю проверок?", () => {
    localStorage.removeItem(LS_KEYS.WRITING_HISTORY);
    showHistory();
  });
}

function renderResult(
  data: {
    score: number;
    feedback: string;
    corrections: EssayCorrection[];
    improved_version?: string;
  },
  question: string,
  answer: string,
) {
  const resultEl = document.getElementById("writing-result");
  const feedbackContent = document.getElementById("writing-feedback-content");
  const scoreEl = document.getElementById("writing-score");

  if (!resultEl || !feedbackContent || !scoreEl) return;

  // Render Score
  scoreEl.textContent = `${data.score} / 10`;
  if (data.score >= 8) scoreEl.style.color = "var(--success)";
  else if (data.score >= 5) scoreEl.style.color = "var(--warning)";
  else scoreEl.style.color = "var(--danger)";

  // Render Feedback
  let html = `<div style="margin-bottom: 20px; font-size: 15px; line-height: 1.6;">${escapeHtml(data.feedback)}</div>`;

  // Render Corrections
  if (data.corrections && data.corrections.length > 0) {
    html += `<h4 style="margin-bottom: 10px;">Исправления</h4>`;
    data.corrections.forEach((c) => {
      html += `
          <div class="writing-correction-item">
            <div style="margin-bottom: 4px;">
              <span class="writing-correction-original">${escapeHtml(c.original)}</span> 
              ➜ 
              <span class="writing-correction-fixed">${escapeHtml(c.corrected)}</span>
            </div>
            <span class="writing-correction-reason">${escapeHtml(c.reason)}</span>
          </div>`;
    });
  }

  // Render Improved Version
  if (data.improved_version) {
    html += `
        <div class="writing-improved-box">
          <div style="font-weight: 700; margin-bottom: 8px; color: var(--success);">Улучшенная версия:</div>
          ${escapeHtml(data.improved_version)}
        </div>`;
  }

  // Share Button
  html += `
    <button id="writing-share-btn" class="btn btn-quiz" style="width:100%; margin-top:20px; display:flex; align-items:center; justify-content:center; gap:8px;">
      📤 Поделиться / Копировать
    </button>
  `;

  feedbackContent.innerHTML = html;
  resultEl.style.display = "block";
  resultEl.scrollIntoView({ behavior: "smooth" });

  const shareBtn = document.getElementById("writing-share-btn");
  if (shareBtn) {
    shareBtn.onclick = () => {
      const shareText = `🇰🇷 TOPIK Master - Writing Check\n\n❓ **Задание:**\n${question || "(Без текста)"}\n\n✍️ **Мой ответ:**\n${answer}\n\n📊 **Оценка:** ${data.score}/10\n\n💡 **Комментарий AI:**\n${data.feedback}\n\n${data.corrections.length > 0 ? "🛠 **Исправления:**\n" + data.corrections.map((c) => `• ${c.original} ➡ ${c.corrected}\n  (${c.reason})`).join("\n") + "\n\n" : ""}${data.improved_version ? "✨ **Улучшенная версия:**\n" + data.improved_version : ""}`;

      navigator.clipboard
        .writeText(shareText)
        .then(() => {
          showToast("📋 Результат скопирован!");
        })
        .catch(() => {
          showToast("❌ Ошибка копирования");
        });
    };
  }
}

async function handleCheck() {
  const questionEl = document.getElementById("writing-question") as HTMLTextAreaElement;
  const answerEl = document.getElementById("writing-answer") as HTMLTextAreaElement;
  const resultEl = document.getElementById("writing-result");
  const checkBtn = document.getElementById("check-writing-btn") as HTMLButtonElement;
  const feedbackContent = document.getElementById("writing-feedback-content");
  const scoreEl = document.getElementById("writing-score");

  if (!questionEl || !answerEl || !resultEl || !checkBtn || !feedbackContent || !scoreEl) return;

  const question = questionEl.value.trim();
  const answer = answerEl.value.trim();

  if ((!question && !currentImage) || !answer) {
    showToast("⚠️ Заполните тему (или фото) и ваш ответ.");
    return;
  }

  const limits = TASK_LIMITS[currentTask];
  if (limits && answer.length < limits.min) {
    showToast(`⚠️ Ответ слишком короткий (минимум ${limits.min} символов).`);
    return;
  }

  // UI Loading State
  checkBtn.disabled = true;
  checkBtn.innerHTML = `<span class="spinner-tiny"></span> Проверка...`;
  resultEl.style.display = "none";

  try {
    // Типизируем вызов функции
    const { data, error } = await client.functions.invoke<EssayCheckResponse>("check-essay", {
      body: {
        taskType: currentTask,
        question,
        answer,
        image: currentImage,
      },
    });

    if (error) throw error;
    if (data && !data.success && data.error) throw new Error(data.error);
    if (!data) throw new Error("No data received from server");
    // Контракт check-essay: score, feedback, corrections[], improved_version.
    if (
      typeof data.score !== "number" ||
      typeof data.feedback !== "string" ||
      !Array.isArray(data.corrections)
    ) {
      throw new Error("Некорректный ответ сервера проверки");
    }

    const result = {
      score: data.score,
      feedback: data.feedback,
      corrections: data.corrections,
      improved_version: data.improved_version,
    };

    saveToHistory({
      id: Date.now().toString(),
      timestamp: Date.now(),
      taskType: currentTask,
      question,
      answer,
      image: currentImage || undefined,
      result,
    });

    renderResult(result, question, answer);
  } catch (e: unknown) {
    console.error("Essay check failed:", e);
    showToast("❌ Ошибка проверки: " + ((e as Error).message || "Unknown error"));
  } finally {
    checkBtn.disabled = false;
    checkBtn.textContent = "✨ Проверить с AI";
  }
}
