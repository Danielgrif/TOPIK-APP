/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { client } from "../core/supabaseClient.ts";
import {
  showToast,
  showUndoToast,
  promiseWithTimeout,
} from "../utils/utils.ts";
import { closeModal } from "./ui_modal.ts";
import { state } from "../core/state.ts";
import { immediateSaveState } from "../core/db.ts";
import { render } from "./ui_card.ts";
import { toKorean } from "../utils/hangul.ts";
import { DB_TABLES, WORD_REQUEST_STATUS } from "../core/constants.ts";
import { WordRequestState } from "../core/state.ts";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

console.log("📂 Loaded: ui_custom_words.ts");

interface CancellationToken {
  isCancelled: boolean;
}

let cancellationToken: CancellationToken | null = null;

// New state for tracking progress of each word
const requestProgress = new Map<
  string | number,
  { status: "pending" | "ai" | "audio" | "done"; word: string }
>();

export async function submitWordRequest() {
  console.log("🚀 submitWordRequest: Function started");

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
  const formView = document.getElementById("add-word-form-view");
  const progressView = document.getElementById("add-word-progress-view");

  console.log("👀 Elements found:", {
    input: !!input,
    listSelect: !!listSelect,
    formView: !!formView,
    progressView: !!progressView,
  });

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
        ? `<button id="submission-cancel-btn" class="btn-icon-tiny-cancel" title="Отменить">✕</button>`
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

  let keepButtonDisabled = false; // Флаг для передачи управления кнопкой в trackProgress

  try {
    if (!input) {
      throw new Error("Input element not found");
    }

    const rawText = input.value.trim();
    console.log("📝 Raw text:", rawText);

    if (!rawText) {
      console.warn("⚠️ Empty input");
      showToast("Введите слово");
      return;
    }

    if (currentToken.isCancelled) throw new Error("Cancelled by user");

    let user = state.currentUser;

    // Если пользователя нет в стейте, пробуем получить его с таймаутом
    if (!user) {
      updateButtonText("Авторизация...", true);
      console.log("🔐 No user in state, checking auth...");
      const { data, error: authError } = await promiseWithTimeout<any>(
        client.auth.getSession(),
        10000,
        new Error("Время проверки авторизации истекло. Проверьте интернет."),
      );

      if (authError) throw authError as Error;
      user = data?.session?.user;
    }

    if (currentToken.isCancelled) throw new Error("Cancelled by user");

    console.log("👤 User:", user?.id || "Guest");

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
    console.log("✂️ Parsed words:", rawWords);

    if (rawWords.length === 0) return;

    // --- Валидация и Авто-исправление ---
    const validWords: string[] = [];
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
        console.warn("⚠️ Invalid word skipped:", wordToAdd);
        continue;
      }
      validWords.push(wordToAdd);
    }

    console.log("✅ Valid words:", validWords);
    console.log("🔧 Corrections:", corrections);

    if (rawWords.length > validWords.length) {
      showToast(
        `⚠️ Пропущено слов с ошибками: ${rawWords.length - validWords.length}`,
      );
    }

    // --- Подтверждение исправлений ---
    if (corrections.length > 0) {
      console.log("❓ Requesting confirmation for corrections...");
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
      console.log("🤔 Confirmation result:", confirmed);

      if (currentToken.isCancelled) throw new Error("Cancelled by user");

      if (!confirmed) {
        console.log("🚫 Cancelled by user");
        return; // finally восстановит кнопку
      }
    }

    // --- Проверка на дубликаты (с учетом омонимов) ---
    const duplicates: { word: string; translations: string[] }[] = [];

    for (const w of validWords) {
      // Ищем точное совпадение по написанию в текущем словаре
      const existing = state.dataStore.filter(
        (item: any) => item.word_kr === w,
      );
      if (existing.length > 0) {
        duplicates.push({
          word: w,
          translations: existing
            .map((e: any) => e.translation)
            .filter((t: any) => !!t),
        });
      }
    }

    if (duplicates.length > 0) {
      console.log("⚠️ Found duplicates:", duplicates);
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
        console.log("🚫 Cancelled by user (duplicates)");
        return; // finally восстановит кнопку
      }
    }

    if (validWords.length === 0) {
      console.warn("❌ No valid words after validation");
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

    const targetListId = listSelect ? listSelect.value : null;

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
    const customTopic =
      topicInput && topicInput.value.trim()
        ? topicInput.value.trim()
        : "Мои слова (My Words)";
    const customCategory = categoryInput ? categoryInput.value.trim() : null;

    const payload = validWords.map((w) => ({
      user_id: user.id,
      word_kr: w,
      status: WORD_REQUEST_STATUS.PENDING,
      target_list_id: targetListId || null,
      topic: customTopic,
      category: customCategory,
    }));

    updateButtonText("Сохранение...", false); // Отключаем отмену на последнем шаге
    console.log("📤 Sending payload to Supabase:", payload);

    // 1. Отправляем заявки и получаем их ID (select() важен для отслеживания)
    const { data: insertedData, error } = await promiseWithTimeout<any>(
      client.from(DB_TABLES.WORD_REQUESTS).insert(payload).select() as any,
      30000,
      new Error("Сервер не ответил на запрос сохранения."),
    );

    if (currentToken.isCancelled) throw new Error("Cancelled by user");

    if (error) {
      throw error;
    } else {
      console.log("✅ Supabase Insert Success:", insertedData);
      // 2. Если есть UI прогресса, переключаемся на него
      if (formView && progressView && insertedData) {
        console.log("🔄 Switching to Progress View");
        formView.style.display = "none";
        progressView.style.display = "block";
        keepButtonDisabled = true; // Передаем управление кнопкой в trackProgress
        // Запускаем отслеживание
        trackProgress(
          insertedData,
          input,
          listSelect,
          topicInput,
          categoryInput,
          formView,
          progressView,
          btn,
          originalContent,
        );
      } else {
        console.log("ℹ️ Fallback UI (No progress view)");
        // Fallback, если HTML элементов нет
        showToast(
          `✅ Заявка принята! Слов: ${validWords.length}. Ждите уведомления.`,
        );
        input.value = "";
        if (listSelect) listSelect.value = "";
        if (topicInput) topicInput.value = "";
        if (categoryInput) categoryInput.value = "";
        closeModal("add-word-modal");
      }
    }
  } catch (e: any) {
    if (e.message === "Cancelled by user") {
      showToast("🚫 Отменено");
    } else {
      console.error("❌ Error in submitWordRequest:", e);
      showToast("Ошибка: " + (e.message || "Не удалось отправить"));
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
  const total = requests.length;
  const progressBar = document.getElementById("word-request-progress-bar");
  const statusText = document.getElementById("word-request-status-text");
  let errorCount = 0;

  // Initialize progress state for each request
  requestProgress.clear();
  requests.forEach((req) => {
    requestProgress.set(req.id, {
      status: WORD_REQUEST_STATUS.PENDING as any,
      word: req.word,
    });
  });

  const updateUIWithStages = () => {
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
    const progress = (doneCount * 100 + audioCount * 80 + aiCount * 40) / total;

    if (progressBar) progressBar.style.width = `${progress}%`;
    if (statusText) {
      let currentAction = "Завершение...";
      if (aiCount > 0) currentAction = "🤖 Анализ AI...";
      if (audioCount > 0) currentAction = "🔊 Генерация аудио...";
      if (doneCount === total) currentAction = "✅ Готово!";

      statusText.textContent = `${currentAction} (${doneCount}/${total})`;
    }

    if (doneCount === total) {
      cleanup(); // Останавливаем прослушку и таймер
      if (errorCount > 0) {
        showToast(`⚠️ Готово, но с ошибками: ${errorCount}`);
      } else {
        showToast("✅ Готово! Слова добавлены.");
      }

      // Wait a bit before closing to show "Готово!"
      setTimeout(resetFormAndClose, 1200);
    }
  };

  // Set initial stage to 'ai' to start the progress
  requestProgress.forEach(
    (item) => (item.status = WORD_REQUEST_STATUS.AI as any),
  );
  updateUIWithStages();

  // --- Realtime Listeners ---

  // 1. Listen for vocabulary INSERTs (marks 'audio' stage)
  const vocabChannel = client
    .channel("public:vocabulary:custom-words")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: DB_TABLES.VOCABULARY },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const newWord = payload.new as any;
        if (!newWord) return;

        // Find the request that matches the newly inserted word
        for (const progress of requestProgress.values()) {
          if (progress.word === newWord.word_kr && progress.status !== "done") {
            console.log(
              `🎤 Realtime vocab insert detected for: ${newWord.word_kr}`,
            );
            progress.status = WORD_REQUEST_STATUS.AUDIO as any;
            updateUIWithStages();
            break; // Assume one request per word_kr for now
          }
        }
      },
    )
    .subscribe();

  // 2. Listen for word_requests UPDATE (marks 'done' stage)
  const requestChannel = client
    .channel("word_requests_tracker")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: DB_TABLES.WORD_REQUESTS,
        filter: `id=in.(${requests.map((r) => r.id).join(",")})`,
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        const updated = payload.new as any;
        const progress = requestProgress.get(updated.id);
        if (progress && progress.status !== "done") {
          if (
            updated.status === WORD_REQUEST_STATUS.PROCESSED ||
            updated.status === WORD_REQUEST_STATUS.ERROR
          ) {
            console.log(`🏁 Realtime request update: ${progress.word}`);
            if (updated.status === "error") errorCount++;
            progress.status = "done";
            updateUIWithStages();
          }
        }
      },
    )
    .subscribe();

  // Safety Timeout: Если через 45 секунд ничего не произошло, разблокируем интерфейс
  const safetyTimeout = setTimeout(() => {
    const doneCount = Array.from(requestProgress.values()).filter(
      (p) => p.status === "done",
    ).length;
    if (doneCount < total) {
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

  const resetFormAndClose = () => {
    closeModal("add-word-modal");
    // Сброс формы
    input.value = "";
    if (listSelect) listSelect.value = "";
    if (topicInput) topicInput.value = "";
    if (categoryInput) categoryInput.value = "";

    // Возвращаем вид формы для следующего раза
    formView.style.display = "block";
    progressView.style.display = "none";
    if (progressBar) progressBar.style.width = "0%";

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalBtnContent || "Отправить заявку";
    }

    // Обновляем список слов на экране
    render();
  };

  const cleanup = () => {
    clearTimeout(safetyTimeout);
    client.removeChannel(vocabChannel);
    client.removeChannel(requestChannel);
  };

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

  render();

  showUndoToast(
    "Заявка удалена",
    () => {
      // Undo
      if (wordBackup) state.customWords.splice(wordIndex, 0, wordBackup);
      if (dataBackup) state.dataStore.splice(dataIndex, 0, dataBackup);
      render();
    },
    async () => {
      // Commit
      await client.from(DB_TABLES.WORD_REQUESTS).delete().eq("id", id);
      immediateSaveState();
    },
  );
}
