import { client } from "../core/supabaseClient.ts";
import {
  showToast,
  showUndoToast,
  promiseWithTimeout,
  debounce,
  escapeHtml,
} from "../utils/utils.ts";
import { closeModal, openConfirm } from "./ui_modal.ts";
import { state } from "../core/state.ts";
import { immediateSaveState } from "../core/db.ts";
import { toKorean } from "../utils/hangul.ts";
import { DB_TABLES, WORD_REQUEST_STATUS } from "../core/constants.ts";
import { WordRequestState } from "../core/state.ts";
import {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/supabase-js";

interface CancellationToken {
  isCancelled: boolean;
}

let cancellationToken: CancellationToken | null = null;

// New state for tracking progress of each word
const requestProgress = new Map<
  string | number,
  {
    status: "pending" | "ai" | "audio" | "done" | "error";
    word: string;
    error?: string;
    justFinished?: boolean;
  }
>();

function ensureLevelSelector(categoryInput: HTMLInputElement) {
  if (
    categoryInput &&
    categoryInput.parentNode &&
    !document.getElementById("new-word-level")
  ) {
    const container = document.createElement("div");
    container.className = "form-group";
    container.innerHTML = `
      <label for="new-word-level" class="form-label">УРОВЕНЬ СЛОЖНОСТИ</label>
      <div class="custom-select-wrapper">
        <select id="new-word-level" class="custom-select">
            <option value="★☆☆">Высокий (★)</option>
            <option value="★★☆">Средний (★★)</option>
            <option value="★★★" selected>Начальный (★★★)</option>
        </select>
        <span class="select-arrow">▼</span>
      </div>
    `;
    categoryInput.parentNode.insertBefore(container, categoryInput.nextSibling);
  }
}

function showWordPreviewModal(
  wordData: Record<string, unknown>,
  onConfirm: (data: Record<string, unknown>) => Promise<boolean>,
  onCancel: () => void,
  index?: number,
  total?: number,
) {
  const modalId = "word-preview-modal";
  let modal = document.getElementById(modalId);

  if (!modal) {
    modal = document.createElement("div");
    modal.id = modalId;
    modal.className = "modal";
    modal.setAttribute("data-close-modal", modalId);
    document.body.appendChild(modal);
  }

  const word = wordData;

  const title =
    index !== undefined && total !== undefined && total > 1
      ? `👀 Предпросмотр (${index + 1}/${total})`
      : "👀 Предпросмотр";

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="btn-icon close-modal-btn" id="preview-close-btn">✕</button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label class="form-label">Слово (KR)</label>
          <input type="text" id="preview-word-kr" class="auth-input" value="${escapeHtml(String(word.word_kr || ""))}">
        </div>
        <div class="input-group">
          <label class="form-label">Перевод (RU)</label>
          <input type="text" id="preview-translation" class="auth-input" value="${escapeHtml(String(word.translation || ""))}">
        </div>
        <div class="input-group">
          <label class="form-label">Пример (KR)</label>
          <textarea id="preview-example-kr" class="auth-input" rows="2">${escapeHtml(String(word.example_kr || ""))}</textarea>
        </div>
        <div class="input-group">
          <label class="form-label">Пример (RU)</label>
          <textarea id="preview-example-ru" class="auth-input" rows="2">${escapeHtml(String(word.example_ru || ""))}</textarea>
        </div>
         <div class="input-group">
          <label class="form-label">Hanja</label>
          <input type="text" id="preview-hanja" class="auth-input" value="${escapeHtml(String(word.word_hanja || ""))}">
        </div>
        
        <div style="display: flex; gap: 10px; margin-top: 20px;">
          <button class="btn" id="preview-cancel-btn" style="flex: 1;">Отмена</button>
          <button class="btn btn-primary" id="preview-confirm-btn" style="flex: 1;">Сохранить</button>
        </div>
      </div>
    </div>
  `;

  const closeBtn = modal.querySelector("#preview-close-btn") as HTMLElement;
  const cancelBtn = modal.querySelector("#preview-cancel-btn") as HTMLElement;
  const confirmBtn = modal.querySelector(
    "#preview-confirm-btn",
  ) as HTMLButtonElement;

  // Используем флаг, чтобы избежать двойного вызова колбэков
  let isResolved = false;

  const close = () => {
    if (isResolved) return;
    isResolved = true;
    modal?.classList.remove("active");
    onCancel();
  };

  // Наблюдатель за закрытием окна извне (например, по Esc)
  const observer = new MutationObserver(() => {
    if (!modal?.classList.contains("active") && !isResolved) {
      isResolved = true;
      onCancel();
      observer.disconnect();
    }
  });
  if (modal) {
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  closeBtn.onclick = close;
  cancelBtn.onclick = close;

  confirmBtn.onclick = async () => {
    const updatedData = { ...wordData };
    const krInput = document.getElementById(
      "preview-word-kr",
    ) as HTMLInputElement;
    const trInput = document.getElementById(
      "preview-translation",
    ) as HTMLInputElement;
    const exKrInput = document.getElementById(
      "preview-example-kr",
    ) as HTMLTextAreaElement;
    const exRuInput = document.getElementById(
      "preview-example-ru",
    ) as HTMLTextAreaElement;
    const hanjaInput = document.getElementById(
      "preview-hanja",
    ) as HTMLInputElement;

    if (krInput) updatedData.word_kr = krInput.value.trim();
    if (trInput) updatedData.translation = trInput.value.trim();
    if (exKrInput) updatedData.example_kr = exKrInput.value.trim();
    if (exRuInput) updatedData.example_ru = exRuInput.value.trim();
    if (hanjaInput) updatedData.word_hanja = hanjaInput.value.trim();

    const originalText = confirmBtn.textContent;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<div class="spinner-tiny"></div>';

    const success = await onConfirm(updatedData);

    confirmBtn.disabled = false;
    confirmBtn.textContent = originalText;

    if (success) {
      isResolved = true;
      observer.disconnect();
      modal?.classList.remove("active");
    }
  };

  // Allow saving with Enter key if focus is not on textarea
  modal.onkeydown = (e) => {
    if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
      confirmBtn.click();
    }
  };

  modal.classList.add("active");
}

export async function submitWordRequest() {
  const input = document.getElementById(
    "new-word-input",
  ) as HTMLTextAreaElement;
  const listSelect = document.getElementById(
    "new-word-target-list",
  ) as HTMLSelectElement;
  const topicInput = document.getElementById(
    "new-word-topic",
  ) as HTMLInputElement;
  const categoryInput = document.getElementById(
    "new-word-category",
  ) as HTMLInputElement;
  const levelSelect = document.getElementById(
    "new-word-level",
  ) as HTMLSelectElement;

  // --- Cancellation Setup ---
  cancellationToken = { isCancelled: false };
  const currentToken = cancellationToken;
  // UI: Сразу блокируем кнопку для мгновенного отклика
  const btn = document.querySelector(
    '[data-action="submit-word-request"]',
  ) as HTMLButtonElement;
  let originalContent = "";
  if (btn) {
    originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-tiny"></div> Проверка...';
  } else {
    console.warn("⚠️ Submit button not found in DOM");
  }

  const updateButtonText = (text: string, showCancel: boolean = true) => {
    if (btn) {
      const cancelHtml = showCancel
        ? `<button id="submission-cancel-btn" class="btn-icon-tiny-cancel" title="Отменить" aria-label="Отменить">✕</button>`
        : "";
      btn.innerHTML = `<div class="spinner-tiny"></div> ${text} ${cancelHtml}`;
      if (showCancel) {
        const cancelBtn = document.getElementById("submission-cancel-btn");
        if (cancelBtn) {
          cancelBtn.onclick = (e) => {
            e.stopPropagation();
            if (currentToken) currentToken.isCancelled = true;
          };
        }
      }
    }
  };

  const keepButtonDisabled = false; // Флаг для передачи управления кнопкой в trackProgress
  const validWords: string[] = [];

  let targetListId: string | null = null;
  let customTopic: string | null = null;
  let customCategory: string | null = null;

  try {
    if (!input) {
      throw new Error("Input element not found");
    }

    const rawText = input.value.trim();

    if (!rawText) {
      showToast("Введите слово");
      return;
    }

    if (currentToken.isCancelled) throw new Error("Cancelled by user");

    let user = state.currentUser;

    // Если пользователя нет в стейте, пробуем получить его с таймаутом
    if (!user) {
      updateButtonText("Авторизация...", true);
      const { data, error: authError } = await promiseWithTimeout<{
        data: { session: { user: import("../types/index.ts").User } | null };
        error: unknown;
      }>(
        client.auth.getSession(),
        10000,
        new Error("Время проверки авторизации истекло. Проверьте интернет."),
      );

      if (authError) throw authError as Error;
      user = data?.session?.user || null;
    }

    if (currentToken.isCancelled) throw new Error("Cancelled by user");

    if (!user) {
      showToast("Войдите в профиль, чтобы предлагать слова");
      // Не возвращаем, а кидаем ошибку, чтобы finally сработал
      throw new Error("User not authenticated");
    }

    updateButtonText("Анализ слов...", true);
    // Split by comma or newline
    const rawWords = rawText
      .split(/[,;\n]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (rawWords.length === 0) return;

    // --- Валидация и Авто-исправление ---
    const corrections: { original: string; corrected: string }[] = [];
    // Разрешаем: Корейский, Английский, Цифры, пробелы, дефис, знаки препинания.
    const VALID_PATTERN =
      /^[a-zA-Z\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F0-9\s.,?!~-]+$/;

    for (const w of rawWords) {
      let wordToAdd = w;

      // Авто-исправление: если слово похоже на английский ввод (буквы, цифры, дефисы, знаки), пробуем конвертировать
      if (/^[a-zA-Z0-9\s.,?!~-]+$/.test(w)) {
        const corrected = toKorean(w);
        // Если результат содержит корейские слоги, считаем это опечаткой и исправляем
        if (/[가-힣]/.test(corrected)) {
          wordToAdd = corrected;
          corrections.push({ original: w, corrected: corrected });
        }
      }

      if (wordToAdd.length > 50 || !VALID_PATTERN.test(wordToAdd)) {
        continue;
      }
      validWords.push(wordToAdd);
    }

    if (rawWords.length > validWords.length) {
      showToast(
        `⚠️ Пропущено слов с ошибками: ${rawWords.length - validWords.length}`,
      );
    }

    // --- Подтверждение исправлений ---
    if (corrections.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        const list = corrections
          .map((c) => `${c.original} ➡ ${c.corrected}`)
          .join("\n");
        import("./ui_modal.ts").then(({ openConfirm }) => {
          openConfirm(`Исправить опечатки?\n\n${list}`, () => resolve(true), {
            onCancel: () => resolve(false),
            showCopy: true,
            copyText: list,
          });
        });
      });

      if (currentToken.isCancelled) throw new Error("Cancelled by user");

      if (!confirmed) {
        return; // finally восстановит кнопку
      }
    }

    // --- Проверка на дубликаты (с учетом омонимов) ---
    const duplicates: { word: string; translations: string[] }[] = [];

    for (const w of validWords) {
      // Ищем точное совпадение по написанию в текущем словаре
      const existing = state.dataStore.filter((item) => item.word_kr === w);
      if (existing.length > 0) {
        duplicates.push({
          word: w,
          translations: existing.map((e) => e.translation).filter((t) => !!t),
        });
      }
    }

    if (duplicates.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        const limit = 5;
        let list = duplicates
          .slice(0, limit)
          .map(
            (d) =>
              `• ${d.word} (${d.translations.join(", ") || "без перевода"})`,
          )
          .join("\n");

        if (duplicates.length > limit) {
          list += `\n...и еще ${duplicates.length - limit}`;
        }

        import("./ui_modal.ts").then(({ openConfirm }) => {
          openConfirm(
            `⚠️ Слова уже есть в словаре:\n\n${list}\n\nДобавить их снова (например, это омонимы)?`,
            () => resolve(true),
            { onCancel: () => resolve(false) },
          );
        });
      });

      if (currentToken.isCancelled) throw new Error("Cancelled by user");

      if (!confirmed) {
        return; // finally восстановит кнопку
      }
    }

    if (validWords.length === 0) {
      showToast("❌ Введите корректные слова (буквы)");
      return;
    }

    // --- Validation for Topic/Category ---
    const topicVal = topicInput ? topicInput.value.trim() : "";
    const catVal = categoryInput ? categoryInput.value.trim() : "";
    const INVALID_CHARS = /[^a-zA-Zа-яА-Я가-힣\u3130-\u318F0-9\s-]/;

    if (topicVal && INVALID_CHARS.test(topicVal)) {
      showToast("❌ Тема: недопустимые символы");
      if (topicInput) {
        topicInput.classList.add("shake");
        setTimeout(() => topicInput.classList.remove("shake"), 500);
      }
      return;
    }

    if (catVal && INVALID_CHARS.test(catVal)) {
      showToast("❌ Категория: недопустимые символы");
      if (categoryInput) {
        categoryInput.classList.add("shake");
        setTimeout(() => categoryInput.classList.remove("shake"), 500);
      }
      return;
    }

    targetListId = listSelect ? listSelect.value : null;

    if (!targetListId) {
      showToast("⚠️ Выберите список (обязательно)");
      if (listSelect) {
        listSelect.classList.add("shake");
        setTimeout(() => listSelect.classList.remove("shake"), 500);
        listSelect.focus();
      }
      return;
    }

    // FIX: Если тема не указана, ставим "Мои слова", чтобы не смешивать с общим словарем
    customTopic =
      topicInput && topicInput.value.trim()
        ? topicInput.value.trim()
        : "Мои слова (My Words)";
    customCategory = categoryInput ? categoryInput.value.trim() : null;

    updateButtonText("Сохранение...", false); // Отключаем отмену на последнем шаге

    // 1. Вызываем Edge Function для каждого слова
    // TODO: В будущем можно сделать batch-обработку в самой функции
    let savedCount = 0;

    let currentWordIndex = 0;
    for (const word of validWords) {
      try {
        updateButtonText(`Обработка: ${word}...`, false);

        const { data: aiData, error: aiError } = await client.functions.invoke(
          "generate-word-data",
          {
            body: { word },
          },
        );

        if (aiError) throw aiError;
        if (!aiData || !aiData.data || !Array.isArray(aiData.data))
          throw new Error("Invalid AI response");

        // Обрабатываем полученные данные через предпросмотр
        for (const item of aiData.data) {
          await new Promise<boolean>((resolve) => {
            showWordPreviewModal(
              item,
              async (confirmedData) => {
                try {
                  const wordData = {
                    ...confirmedData,
                    user_id: user!.id, // Для совместимости, если нужно
                    created_by: user!.id,
                    is_public: false,
                    topic_ru: customTopic, // Приоритет пользовательской темы
                    category_ru: customCategory,
                    level: levelSelect
                      ? levelSelect.value
                      : confirmedData.level || "★★★",
                    // Очищаем поля, которые могли прийти из AI, но мы хотим свои
                    topic: undefined,
                    category: undefined,
                  };

                  // Вставка в vocabulary (сразу, без word_requests)
                  const { data: insertedWord, error: dbError } = await client
                    .from(DB_TABLES.VOCABULARY)
                    .insert(wordData)
                    .select()
                    .single();

                  if (dbError) throw dbError;

                  if (insertedWord) {
                    // Добавляем в список
                    if (targetListId) {
                      await client
                        .from(DB_TABLES.LIST_ITEMS)
                        .upsert(
                          { list_id: targetListId, word_id: insertedWord.id },
                          { onConflict: "list_id,word_id" },
                        );
                    }

                    // Добавляем в локальный стейт
                    state.dataStore.unshift(insertedWord);

                    // Обновляем кэш списка, если он загружен
                    if (targetListId) {
                      const { collectionsState } =
                        await import("../core/collections_data.ts");
                      if (!collectionsState.listItems[targetListId]) {
                        collectionsState.listItems[targetListId] = new Set();
                      }
                      collectionsState.listItems[targetListId].add(
                        insertedWord.id,
                      );
                    }
                  }
                  savedCount++;
                  resolve(true); // Теперь это валидно, так как Promise<boolean>
                  return true;
                } catch (e) {
                  console.error("Error saving word:", e);
                  showToast("Ошибка сохранения слова");
                  // Не резолвим промис модалки как успех, чтобы пользователь мог повторить
                  resolve(false); // Резолвим как false при ошибке
                  return false;
                }
              },
              () => {
                // Cancelled by user closing the modal without saving
                resolve(false);
              },
              currentWordIndex,
              validWords.length,
            );
          });
        }
      } catch (err) {
        console.error(`Failed to process word ${word}:`, err);
        const msg = (err as Error).message;

        // Check for specific Supabase function errors or network issues
        const isNetworkError =
          msg.includes("Failed to send a request") ||
          msg.includes("Failed to fetch");
        const displayMsg = isNetworkError
          ? "Ошибка соединения с AI сервером"
          : msg;

        showToast(`Ошибка с словом "${word}": ${displayMsg}`);

        // Если ошибка связана с недоступностью функции (сеть/сервер), прерываем цикл
        if (isNetworkError) {
          showToast("⚠️ Остановка: Сервер AI недоступен.");
          break;
        }
      }
      currentWordIndex++;
    }

    if (savedCount > 0) {
      showToast(`✅ Успешно добавлено слов: ${savedCount}`);
      input.value = "";
      if (listSelect) listSelect.value = "";
      if (topicInput) topicInput.value = "";
      if (categoryInput) categoryInput.value = "";

      // Обновляем UI
      document.dispatchEvent(new CustomEvent("state-changed"));
      if (window.updateSearchIndex) window.updateSearchIndex();

      closeModal("add-word-modal");
    }
  } catch (e: unknown) {
    const err = e as Error;
    const isOffline = !navigator.onLine;

    if (err.message === "Cancelled by user") {
      showToast("🚫 Отменено");
    } else if (isOffline) {
      showToast("⚠️ Вы оффлайн. Функция требует интернета.");
    } else {
      console.error("❌ Error in submitWordRequest:", err);
      showToast("Ошибка: " + (err.message || "Не удалось обработать"));
    }
  } finally {
    // Восстанавливаем кнопку, если мы НЕ перешли в режим прогресса (там своя логика восстановления)
    cancellationToken = null;
    if (!keepButtonDisabled && btn) {
      btn.disabled = false;
      btn.innerHTML = originalContent || "Отправить заявку";
    }
  }
}

async function restorePendingRequests() {
  const user = state.currentUser;
  if (!user) return;

  // Ищем заявки, которые еще не обработаны (pending)
  const { data, error } = await client
    .from(DB_TABLES.WORD_REQUESTS)
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (!error && data && data.length > 0) {
    const formView = document.getElementById("add-word-form-view");
    const progressView = document.getElementById("add-word-progress-view");
    const input = document.getElementById(
      "new-word-input",
    ) as HTMLTextAreaElement;
    const listSelect = document.getElementById(
      "new-word-target-list",
    ) as HTMLSelectElement;
    const topicInput = document.getElementById(
      "new-word-topic",
    ) as HTMLInputElement;
    const categoryInput = document.getElementById(
      "new-word-category",
    ) as HTMLInputElement;
    const btn = document.querySelector(
      '[data-action="submit-word-request"]',
    ) as HTMLButtonElement;

    if (formView && progressView) {
      formView.style.display = "none";
      progressView.style.display = "block";

      const requests: WordRequestState[] = data.map(
        (row: {
          id: string | number;
          word_kr: string;
          created_at: string;
          my_notes?: string;
        }) => ({
          id: row.id,
          word: row.word_kr,
          status: "pending",
          timestamp: new Date(row.created_at).getTime(),
          error: row.my_notes,
        }),
      );

      trackProgress(
        requests,
        input,
        listSelect,
        topicInput,
        categoryInput,
        formView,
        progressView,
        btn,
        "Отправить заявку",
      );

      showToast(`🔄 Восстановлено ${requests.length} активных заявок`);
    }
  }
}

export function setupAddWordPreview() {
  const container = document.querySelector(
    "#add-word-modal .modal-body-container",
  );
  if (!container) return;

  container.scrollTop = 0;

  // 1. Инъекция селектора уровня, если его нет (для корректного отображения в превью)
  const categoryInput = document.getElementById(
    "new-word-category",
  ) as HTMLInputElement;
  if (categoryInput) ensureLevelSelector(categoryInput as HTMLInputElement);

  // 2. Создание контейнера превью
  let previewWrapper = document.getElementById("add-word-preview-wrapper");
  if (!previewWrapper) {
    previewWrapper = document.createElement("div");
    previewWrapper.id = "add-word-preview-wrapper";
    previewWrapper.style.marginBottom = "24px";
    // Вставляем в начало формы
    container.insertBefore(previewWrapper, container.firstChild);
  }

  // Контейнер для предупреждения о дубликатах
  let warningWrapper = document.getElementById("add-word-warning-wrapper");
  if (!warningWrapper) {
    warningWrapper = document.createElement("div");
    warningWrapper.id = "add-word-warning-wrapper";
    warningWrapper.style.marginTop = "-10px";
    warningWrapper.style.marginBottom = "20px";
    // Вставляем после контейнера с превью
    previewWrapper.insertAdjacentElement("afterend", warningWrapper);
  }

  // 3. Настройка слушателей
  const input = document.getElementById(
    "new-word-input",
  ) as HTMLTextAreaElement;
  // Подсказка браузеру переключить клавиатуру на корейский (работает на мобильных/некоторых ОС)
  if (input) input.setAttribute("lang", "ko");

  const levelSelect = document.getElementById(
    "new-word-level",
  ) as HTMLSelectElement;

  const checkWordExistence = debounce((...args: unknown[]) => {
    const word = args[0] as string;
    const warningEl = document.getElementById("add-word-warning-wrapper");
    if (!warningEl) return;
    if (!word) {
      warningEl.innerHTML = "";
      return;
    }
    const existing = state.dataStore.filter((w) => w.word_kr === word);
    if (existing.length > 0) {
      const translations = existing.map((e) => e.translation).join(", ");
      warningEl.innerHTML = `<div style="padding: 10px 14px; background: rgba(217, 119, 6, 0.1); border: 1px solid rgba(217, 119, 6, 0.3); border-radius: 12px; font-size: 13px; color: var(--warning);"><b>⚠️ Внимание:</b> Слово <b>${escapeHtml(word)}</b> уже есть в словаре с переводом: "${escapeHtml(translations)}".</div>`;
    } else {
      warningEl.innerHTML = "";
    }
  }, 300);

  const update = () => {
    const text = input
      ? input.value
          .trim()
          .split(/[\n,;]/)[0]
          .trim()
      : "";
    const level = levelSelect ? levelSelect.value : "★★★";
    renderPreview(previewWrapper!, text, level);
    checkWordExistence(text);
  };

  if (input && !input.dataset.previewInitialized) {
    input.addEventListener("input", update);
    input.dataset.previewInitialized = "true";
  }
  if (levelSelect && !levelSelect.dataset.previewInitialized) {
    levelSelect.addEventListener("change", update);
    levelSelect.dataset.previewInitialized = "true";
  }

  // Первичный рендер
  update();

  // 4. Восстановление состояния (если были незавершенные заявки)
  restorePendingRequests();
}

function renderPreview(container: HTMLElement, word: string, level: string) {
  const isSkeleton = !word;
  const displayWord = word || "";

  // Check if structure exists to avoid full re-render
  if (!container.querySelector(".card")) {
    container.innerHTML = `
    <div class="card" style="height: 180px; pointer-events: none; transform: none; box-shadow: var(--shadow-sm);">
        <div class="card-inner">
            <div class="card-front" style="background: var(--surface-2); border: 1px solid var(--border-color);">
                <div class="card-main" style="justify-content: center; padding: 15px;">
                    <div class="card-level-stars" style="font-size: 24px; margin-bottom: 8px;"></div>
                    <div id="preview-word-container"></div>
                    <div class="card-tags" style="margin-top: 12px; opacity: 0.7;">
                        <span class="tag-pill topic">🏷️ Тема</span>
                        <span class="tag-pill category">🔹 Категория</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div style="text-align: center; font-size: 11px; color: var(--text-tertiary); margin-top: 8px; text-transform: uppercase; letter-spacing: 1px;">Предпросмотр</div>
  `;
  }

  const levelEl = container.querySelector(".card-level-stars");
  if (levelEl && levelEl.textContent !== level) levelEl.textContent = level;

  const wordContainer = container.querySelector("#preview-word-container");
  if (wordContainer) {
    if (isSkeleton) {
      if (!wordContainer.querySelector(".skeleton-pulse")) {
        wordContainer.innerHTML = `<div class="skeleton-pulse" style="height: 32px; width: 60%; border-radius: 8px; margin: 0 auto;"></div>`;
      }
    } else {
      const wordEl = wordContainer.querySelector(".word");
      if (wordEl) {
        if (wordEl.textContent !== displayWord)
          wordEl.textContent = displayWord;
      } else {
        wordContainer.innerHTML = `<div class="word" style="font-size: 32px; margin-bottom: 0;">${escapeHtml(displayWord)}</div>`;
      }
    }
  }
}

function trackProgress(
  requests: WordRequestState[],
  input: HTMLTextAreaElement,
  listSelect: HTMLSelectElement,
  topicInput: HTMLInputElement,
  categoryInput: HTMLInputElement,
  formView: HTMLElement,
  progressView: HTMLElement,
  btn: HTMLButtonElement | null,
  originalBtnContent: string,
) {
  const progressBar = document.getElementById("word-request-progress-bar");
  const statusText = document.getElementById("word-request-status-text");
  const progressViewContainer =
    progressView.querySelector(".modal-body-container") || progressView;
  let errorCount = 0;

  let vocabChannel: RealtimeChannel | null = null;

  let requestChannel: RealtimeChannel | null = null;
  let safetyTimeout: number | null = null;
  let observer: MutationObserver | null = null;
  let workerWarningTimeout: number | null = null;
  let pollingTimeout: number | null = null;
  let isTracking = true;

  // Очистка старых элементов UI прогресса (чтобы избежать дублирования при повторном использовании)
  const oldDetails = document.getElementById("word-request-details");
  if (oldDetails) oldDetails.remove();
  const oldToggle = document.getElementById("toggle-details-btn");
  if (oldToggle) oldToggle.remove();
  const oldRetry = document.getElementById("retry-all-errors-btn");
  if (oldRetry) oldRetry.remove();
  document.querySelectorAll(".worker-warning").forEach((el) => el.remove());

  // Создаем контейнер для детального списка
  const detailsList = document.createElement("div");
  detailsList.id = "word-request-details";
  detailsList.className = "progress-details-list";

  if (requests.length > 5) {
    const toggleBtn = document.createElement("button");
    toggleBtn.id = "toggle-details-btn";
    toggleBtn.className = "btn-text";
    toggleBtn.style.cssText =
      "margin: 10px auto; display: block; font-size: 13px; color: var(--text-sub); cursor: pointer;";
    toggleBtn.textContent = `▼ Показать список (${requests.length})`;

    detailsList.style.display = "none";

    toggleBtn.onclick = () => {
      const isHidden = detailsList.style.display === "none";
      detailsList.style.display = isHidden ? "flex" : "none";
      toggleBtn.textContent = isHidden
        ? "▲ Скрыть список"
        : `▼ Показать список (${requestProgress.size})`;
    };

    if (statusText) {
      statusText.insertAdjacentElement("afterend", toggleBtn);
      toggleBtn.insertAdjacentElement("afterend", detailsList);
    } else {
      progressViewContainer.appendChild(toggleBtn);
      progressViewContainer.appendChild(detailsList);
    }
  } else {
    if (statusText) statusText.insertAdjacentElement("afterend", detailsList);
    else progressViewContainer.appendChild(detailsList);
  }

  // Обработчик удаления отдельной заявки
  detailsList.onclick = async (e) => {
    const target = e.target as HTMLElement;
    const cancelBtn = target.closest('[data-action="cancel-single-request"]');
    if (cancelBtn) {
      e.stopPropagation();
      const idStr = cancelBtn.getAttribute("data-id");
      if (!idStr) return;

      // ID может быть числом (Date.now()) или строкой (UUID), пробуем оба варианта
      let id: string | number = idStr;
      if (!requestProgress.has(id)) {
        id = Number(idStr);
      }

      if (requestProgress.has(id)) {
        requestProgress.delete(id);

        // Удаляем из БД
        client
          .from(DB_TABLES.WORD_REQUESTS)
          .delete()
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("Failed to delete request:", error);
          });

        if (requestProgress.size === 0) {
          cleanup();
          resetFormAndClose();
          showToast("Все заявки отменены");
        } else {
          updateUIWithStages();
        }
      }
    }
  };

  const cleanup = () => {
    isTracking = false;
    if (safetyTimeout) clearTimeout(safetyTimeout);
    if (workerWarningTimeout) clearTimeout(workerWarningTimeout);
    if (pollingTimeout) clearTimeout(pollingTimeout);
    if (vocabChannel) client.removeChannel(vocabChannel);
    if (requestChannel) client.removeChannel(requestChannel);
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };

  const resetUIState = () => {
    input.value = "";
    if (listSelect) listSelect.value = "";
    if (topicInput) topicInput.value = "";
    if (categoryInput) categoryInput.value = "";

    formView.style.display = "block";
    progressView.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnContent || "Отправить заявку";
    }

    const grid = document.getElementById("vocabulary-grid");
    const savedScroll = grid ? grid.scrollTop : 0;
    document.dispatchEvent(new CustomEvent("state-changed"));
    if (grid) grid.scrollTop = savedScroll;
  };

  const resetFormAndClose = () => {
    closeModal("add-word-modal");
    resetUIState();
  };

  // Initialize progress state for each request
  requestProgress.clear();
  requests.forEach((req) => {
    // Если статус уже есть (например, при восстановлении), используем его, иначе pending
    const initialStatus = req.status === "error" ? "error" : "pending";
    requestProgress.set(req.id, {
      status: initialStatus,
      word: req.word,
      error: req.error,
    });
  });

  const renderDetails = () => {
    if (!detailsList) return;
    detailsList.innerHTML = Array.from(requestProgress.entries())
      .map(([id, item]) => {
        let icon =
          '<div class="spinner-tiny" style="border-color: var(--text-tertiary); border-top-color: var(--primary);"></div>';
        let text = "Ожидание...";
        let cssClass = "status-pending";
        let extraAttrs = "";

        if (item.status === "ai") {
          icon = "🤖";
          text = "AI генерирует контент...";
          cssClass = "status-processing";
        } else if (item.status === "audio") {
          icon = "🔊";
          text = "Создание озвучки...";
          cssClass = "status-processing";
        } else if (item.status === "done") {
          icon = "✅";
          text = "Готово";
          cssClass = "status-done";
          if (item.justFinished) {
            extraAttrs += ` style="animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);"`;
          }
        } else if (item.status === "error") {
          icon = "❌";
          text = "Ошибка";
          cssClass = "status-error";
          const safeError = escapeHtml(item.error || "Неизвестная ошибка");
          extraAttrs = `data-action="show-request-error" data-error="${safeError}" style="cursor: pointer;" title="Нажмите, чтобы увидеть детали"`;
        }

        return `
            <div class="progress-item ${cssClass}" ${extraAttrs}>
                <div class="progress-word">${escapeHtml(item.word)}</div>
                <div class="progress-state">
                    <span class="progress-icon">${icon}</span>
                    <span class="progress-text">${text}</span>
                </div>
                <button class="btn-icon-tiny-cancel" data-action="cancel-single-request" data-id="${id}" title="Отменить и удалить" aria-label="Отменить и удалить">✕</button>
            </div>
        `;
      })
      .join("");
  };

  const updateUIWithStages = () => {
    const currentTotal = requestProgress.size;
    if (currentTotal === 0) return;

    const doneCount = Array.from(requestProgress.values()).filter(
      (p) => p.status === "done",
    ).length;
    const audioCount = Array.from(requestProgress.values()).filter(
      (p) => p.status === "audio",
    ).length;
    const aiCount = Array.from(requestProgress.values()).filter(
      (p) => p.status === "ai",
    ).length;

    // Weighted progress for a smoother bar
    const progress =
      (doneCount * 100 + audioCount * 80 + aiCount * 40) / currentTotal;

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusText) {
      let currentAction = "Завершение...";
      if (aiCount > 0) currentAction = "🤖 Анализ AI...";
      if (audioCount > 0) currentAction = "🔊 Генерация аудио...";
      if (doneCount === currentTotal) currentAction = "✅ Готово!";

      statusText.textContent = `${currentAction} (${doneCount}/${currentTotal})`;
    }

    // Обновляем текст кнопки "Показать список", если она есть
    const toggleBtn = document.getElementById("toggle-details-btn");
    if (toggleBtn) {
      const isHidden = detailsList.style.display === "none";
      if (isHidden)
        toggleBtn.textContent = `▼ Показать список (${currentTotal})`;
      // Если список открыт, текст "Скрыть список" не меняется
    }

    renderDetails();

    // Сбрасываем флаг анимации после рендера, чтобы она не проигрывалась повторно
    requestProgress.forEach((p) => {
      if (p.justFinished) p.justFinished = false;
    });

    // --- Retry Button Logic ---
    const errorEntries = Array.from(requestProgress.entries()).filter(
      ([_, p]) => p.status === "error",
    );

    // Автоматически разворачиваем список, если есть ошибки
    if (
      errorEntries.length > 0 &&
      detailsList &&
      detailsList.style.display === "none"
    ) {
      const toggleBtn = document.getElementById("toggle-details-btn");
      if (toggleBtn) {
        detailsList.style.display = "flex";
        toggleBtn.textContent = "▲ Скрыть список";
      }
    }

    let retryBtn = document.getElementById("retry-all-errors-btn");

    if (errorEntries.length > 0) {
      if (!retryBtn) {
        retryBtn = document.createElement("button");
        retryBtn.id = "retry-all-errors-btn";
        retryBtn.className = "btn";
        retryBtn.style.cssText =
          "width: 100%; margin-top: 15px; background: var(--warning); color: white; font-weight: bold; border: none; border-radius: 12px; padding: 12px; cursor: pointer; transition: transform 0.2s;";
        retryBtn.innerHTML = `↻ Повторить сбойные (${errorEntries.length})`;
        retryBtn.onmousedown = () =>
          (retryBtn!.style.transform = "scale(0.98)");
        retryBtn.onmouseup = () => (retryBtn!.style.transform = "scale(1)");

        retryBtn.onclick = async () => {
          const btn = document.getElementById(
            "retry-all-errors-btn",
          ) as HTMLButtonElement;
          if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<div class="spinner-tiny"></div> Отправка...';
          }

          const ids = errorEntries.map(([id]) => id);

          const { error } = await client
            .from(DB_TABLES.WORD_REQUESTS)
            .update({ status: WORD_REQUEST_STATUS.PENDING, my_notes: null })
            .in("id", ids);

          if (error) {
            showToast("Ошибка: " + error.message);
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = `↻ Повторить сбойные (${errorEntries.length})`;
            }
          } else {
            // Optimistic update
            ids.forEach((id) => {
              const item = requestProgress.get(id);
              if (item) {
                item.status = "pending";
                item.error = undefined;
              }
            });
            if (btn) btn.remove();
            updateUIWithStages();
          }
        };

        if (detailsList && detailsList.parentNode) {
          detailsList.parentNode.insertBefore(
            retryBtn,
            detailsList.nextSibling,
          );
        }
      } else {
        retryBtn.innerHTML = `↻ Повторить сбойные (${errorEntries.length})`;
      }
    } else {
      if (retryBtn) retryBtn.remove();
    }

    if (doneCount === currentTotal) {
      cleanup(); // Останавливаем прослушку и таймер
      if (errorCount > 0) {
        showToast(`⚠️ Готово, но с ошибками: ${errorCount}`);
      } else {
        showToast("✅ Готово! Слова добавлены.");
        // Wait a bit before closing to show "Готово!"
        setTimeout(resetFormAndClose, 3000);
      }
    }
  };

  // Detect if modal is closed externally (e.g. by user clicking X or overlay)
  const modal = document.getElementById("add-word-modal");
  if (modal) {
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class" &&
          !modal.classList.contains("active")
        ) {
          // Modal was closed, cleanup listeners
          cleanup();
          resetUIState();
        }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  // Set initial stage to 'ai' to start the progress
  requestProgress.forEach((item) => {
    if (item.status === "pending") {
      item.status = WORD_REQUEST_STATUS.AI as "ai";
    }
  });
  updateUIWithStages();

  // Таймер предупреждения о воркере (если через 8 сек ничего не изменилось)
  workerWarningTimeout = window.setTimeout(() => {
    const anyProgress = Array.from(requestProgress.values()).some(
      (p) => p.status !== "pending" && p.status !== "ai",
    );
    if (!anyProgress && detailsList) {
      const warning = document.createElement("div");
      warning.className = "worker-warning";
      warning.innerHTML =
        "⚠️ Сервер долго не отвечает. Возможно, очередь перегружена.";
      detailsList.insertAdjacentElement("beforebegin", warning);
    }
  }, 8000);

  // --- Robust Polling Loop (Резервный опрос) ---
  // Используем рекурсивный setTimeout вместо setInterval для предотвращения наслоения запросов
  const pollStatus = async () => {
    if (!isTracking) return;

    if (!navigator.onLine) {
      // Если оффлайн, пробуем реже
      pollingTimeout = window.setTimeout(pollStatus, 5000);
      return;
    }

    const pendingIds = Array.from(requestProgress.entries())
      .filter(([_, p]) => p.status !== "done" && p.status !== "error")
      .map(([id]) => id);

    if (pendingIds.length === 0) {
      // Если нет активных задач, но мы все еще в режиме отслеживания, проверяем реже
      pollingTimeout = window.setTimeout(pollStatus, 3000);
      return;
    }

    try {
      const { data, error } = await (client
        .from(DB_TABLES.WORD_REQUESTS)
        .select("id, status, my_notes, word_kr")
        .in("id", pendingIds) as unknown as Promise<{
        data:
          | {
              id: string | number;
              status: string;
              my_notes: string;
              word_kr: string;
            }[]
          | null;
        error: unknown;
      }>);

      if (!error && data) {
        let changed = false;
        data.forEach(
          (row: {
            id: string | number;
            status: string;
            my_notes: string;
            word_kr: string;
          }) => {
            const progress = requestProgress.get(row.id);
            if (progress) {
              let newStatus = progress.status;
              // Маппинг статусов из БД в UI
              if (row.status === WORD_REQUEST_STATUS.PROCESSED)
                newStatus = "done";
              else if (row.status === WORD_REQUEST_STATUS.ERROR)
                newStatus = "error";
              else if (row.status === WORD_REQUEST_STATUS.AI) newStatus = "ai";
              else if (row.status === WORD_REQUEST_STATUS.AUDIO)
                newStatus = "audio";

              if (newStatus !== progress.status) {
                progress.status = newStatus as
                  | "pending"
                  | "ai"
                  | "audio"
                  | "done"
                  | "error";
                if (newStatus === "done") progress.justFinished = true;
                if (newStatus === "error") {
                  progress.error = row.my_notes || "Ошибка обработки";
                  // Увеличиваем счетчик ошибок только если это новая ошибка
                  if (progress.status !== "error") errorCount++;
                }
                changed = true;
              }
            }
          },
        );
        if (changed) updateUIWithStages();
      }
    } catch (e) {
      console.warn("Polling error (ignored):", e);
    }

    if (isTracking) {
      pollingTimeout = window.setTimeout(pollStatus, 3000);
    }
  };

  // Запускаем опрос сразу, чтобы синхронизировать состояние
  pollStatus();

  // --- Realtime Listeners ---
  const handleVocabInsert = (
    payload: RealtimePostgresChangesPayload<{ word_kr: string }>,
  ) => {
    const newWord = payload.new;
    if (!newWord || !("word_kr" in newWord)) return;

    // Find the request that matches the newly inserted word
    for (const progress of requestProgress.values()) {
      if (progress.word === newWord.word_kr && progress.status !== "done") {
        progress.status = WORD_REQUEST_STATUS.AUDIO as "audio";
        updateUIWithStages();
        break; // Assume one request per word_kr for now
      }
    }
  };

  vocabChannel = client
    .channel("public:vocabulary:custom-words")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: DB_TABLES.VOCABULARY },
      handleVocabInsert,
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`Vocab channel error: ${status}`);
      }
    });

  requestChannel = client
    .channel("word_requests_tracker")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: DB_TABLES.WORD_REQUESTS,
        filter: `id=in.(${requests.map((r) => r.id).join(",")})`,
      },
      (
        payload: RealtimePostgresChangesPayload<{
          id: string | number;
          status: string;
          my_notes?: string;
        }>,
      ) => {
        const updated = payload.new;
        if (!updated || !("id" in updated)) return;
        const progress = requestProgress.get(updated.id);
        if (
          progress &&
          progress.status !== "done" &&
          progress.status !== "error"
        ) {
          if (updated.status === WORD_REQUEST_STATUS.PROCESSED) {
            progress.status = "done";
            progress.justFinished = true;
            updateUIWithStages();
          } else if (updated.status === WORD_REQUEST_STATUS.ERROR) {
            errorCount++;
            progress.status = "error";
            progress.error = updated.my_notes || "Неизвестная ошибка";
            updateUIWithStages();
          }
        }
      },
    )
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.warn(`Request channel error: ${status}`);
        showToast(
          "⚠️ Проблема с подключением. Обновления могут задерживаться.",
        );
      }
    });

  // Safety Timeout: Если через 45 секунд ничего не произошло, разблокируем интерфейс
  safetyTimeout = window.setTimeout(() => {
    const doneCount = Array.from(requestProgress.values()).filter(
      (p) => p.status === "done",
    ).length;
    if (doneCount < requestProgress.size) {
      cleanup();
      showToast("⏳ Сервер долго не отвечает. Попробуйте позже.");
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnContent || "Отправить заявку";
      }
      if (statusText) statusText.textContent = "⚠️ Время ожидания истекло";
      resetFormAndClose();
    }
  }, 90000); // Увеличено до 90 секунд

  const cancelBtn = document.getElementById("cancel-word-request-btn");
  if (cancelBtn) {
    cancelBtn.onclick = async () => {
      cleanup();
      showToast("🚫 Отмена...");

      const idsToCancel = requests.map((r) => r.id);
      if (idsToCancel.length > 0) {
        try {
          await client
            .from(DB_TABLES.WORD_REQUESTS)
            .delete()
            .in("id", idsToCancel);
          showToast("🚫 Заявка отменена на сервере");
        } catch (e) {
          console.error("Failed to cancel request on server:", e);
          showToast("⚠️ Не удалось отменить на сервере");
        }
      }

      resetFormAndClose();
    };
  }
}

export async function deleteCustomWord(id: string | number) {
  const wordIndex = state.customWords.findIndex((w) => w.id === id);
  const dataIndex = state.dataStore.findIndex((w) => w.id === id);

  const wordBackup = state.customWords[wordIndex];
  const dataBackup = state.dataStore[dataIndex];

  // Оптимистичное удаление
  if (wordIndex > -1) state.customWords.splice(wordIndex, 1);
  if (dataIndex > -1) state.dataStore.splice(dataIndex, 1);
  if (state.searchResults)
    state.searchResults = state.searchResults.filter((w) => w.id !== id);

  const grid = document.getElementById("vocabulary-grid");
  const savedScroll = grid ? grid.scrollTop : 0;
  document.dispatchEvent(new CustomEvent("state-changed"));
  if (window.updateSearchIndex) window.updateSearchIndex();

  if (grid) grid.scrollTop = savedScroll;

  showUndoToast(
    "Заявка удалена",
    () => {
      // Undo
      if (wordBackup) state.customWords.splice(wordIndex, 0, wordBackup);
      if (dataBackup) state.dataStore.splice(dataIndex, 0, dataBackup);
      document.dispatchEvent(new CustomEvent("state-changed"));
    },
    async () => {
      // Commit
      await client.from(DB_TABLES.WORD_REQUESTS).delete().eq("id", id);
      immediateSaveState();
    },
  );
}

export function showRequestError(error: string) {
  openConfirm(`Детали ошибки:\n\n${error}`, () => {}, { showCancel: false });
}
