import { client } from "../core/supabaseClient.ts";
import { showToast, showUndoToast } from "../utils/utils.ts";
import { closeModal } from "./ui_modal.ts";
import { state } from "../core/state.ts";
import { immediateSaveState } from "../core/db.ts";
import { render } from "./ui_card.ts";
import { toKorean } from "../utils/hangul.ts";

console.log("📂 Loaded: ui_custom_words.ts");

export async function submitWordRequest() {
  console.log("🚀 submitWordRequest: Function started");

  const input = document.getElementById("new-word-input") as HTMLTextAreaElement;
  const listSelect = document.getElementById("new-word-target-list") as HTMLSelectElement;
  const topicInput = document.getElementById("new-word-topic") as HTMLInputElement;
  const categoryInput = document.getElementById("new-word-category") as HTMLInputElement;
  const formView = document.getElementById("add-word-form-view");
  const progressView = document.getElementById("add-word-progress-view");
  
  console.log("👀 Elements found:", { input: !!input, listSelect: !!listSelect, formView: !!formView, progressView: !!progressView });
  
  // UI: Сразу блокируем кнопку для мгновенного отклика
  const btn = document.querySelector('[data-action="submit-word-request"]') as HTMLButtonElement;
  let originalContent = "";
  if (btn) {
      console.log("🔘 Button state: Loading");
      originalContent = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<div class="spinner-tiny"></div> Проверка...';
  } else {
      console.warn("⚠️ Submit button not found in DOM");
  }

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

    console.log("🔐 Checking auth...");
    // FIX: Используем getSession вместо getUser, чтобы избежать зависания при плохой сети
    const { data } = await client.auth.getSession();
    const user = data.session?.user;
    
    console.log("👤 User:", user?.id || "Guest");

    if (!user) {
      showToast("Войдите в профиль, чтобы предлагать слова");
      return;
    }

    // Split by comma or newline
    const rawWords = rawText.split(/[,;\n]+/).map(w => w.trim()).filter(w => w.length > 0);
    console.log("✂️ Parsed words:", rawWords);
    
    if (rawWords.length === 0) return;

    // --- Валидация и Авто-исправление ---
    const validWords: string[] = [];
    const corrections: { original: string, corrected: string }[] = [];
    // Разрешаем: Корейский, Английский, пробелы, дефис.
    const VALID_PATTERN = /^[a-zA-Z\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\s\-]+$/;

    for (const w of rawWords) {
        let wordToAdd = w;

        // Авто-исправление: если слово полностью на английском, пробуем конвертировать в Hangul
        if (/^[a-zA-Z]+$/.test(w)) {
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
        showToast(`⚠️ Пропущено слов с ошибками: ${rawWords.length - validWords.length}`);
    }

    // Обновляем текст кнопки перед подтверждениями
    if (btn) btn.innerHTML = '<div class="spinner-tiny"></div> Отправка...';

    // --- Подтверждение исправлений ---
    if (corrections.length > 0) {
        console.log("❓ Requesting confirmation for corrections...");
        const confirmed = await new Promise<boolean>((resolve) => {
            const list = corrections.map(c => `${c.original} ➡ ${c.corrected}`).join("\n");
            import("./ui_modal.ts").then(({ openConfirm }) => {
                openConfirm(
                    `Исправить опечатки?\n\n${list}`,
                    () => resolve(true),
                    { onCancel: () => resolve(false), showCopy: true, copyText: list }
                );
            });
        });
        console.log("🤔 Confirmation result:", confirmed);

        if (!confirmed) {
             console.log("🚫 Cancelled by user");
             return; // finally восстановит кнопку
        }
    }

    // --- Проверка на дубликаты (с учетом омонимов) ---
    const duplicates: { word: string, translations: string[] }[] = [];
    
    for (const w of validWords) {
        // Ищем точное совпадение по написанию в текущем словаре
        const existing = state.dataStore.filter((item: any) => item.word_kr === w);
        if (existing.length > 0) {
            duplicates.push({
                word: w,
                translations: existing.map((e: any) => e.translation).filter((t: any) => !!t)
            });
        }
    }

    if (duplicates.length > 0) {
        console.log("⚠️ Found duplicates:", duplicates);
        const confirmed = await new Promise<boolean>((resolve) => {
            const limit = 5;
            let list = duplicates.slice(0, limit).map(d => 
                `• ${d.word} (${d.translations.join(", ") || "без перевода"})`
            ).join("\n");
            
            if (duplicates.length > limit) {
                list += `\n...и еще ${duplicates.length - limit}`;
            }

            import("./ui_modal.ts").then(({ openConfirm }) => {
                openConfirm(
                    `⚠️ Слова уже есть в словаре:\n\n${list}\n\nДобавить их снова (например, это омонимы)?`,
                    () => resolve(true),
                    { onCancel: () => resolve(false) }
                );
            });
        });

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
    const INVALID_CHARS = /[^a-zA-Zа-яА-Я가-힣\u3130-\u318F\s\-]/;

    if (topicVal && INVALID_CHARS.test(topicVal)) {
        showToast("❌ Тема: только буквы");
        if (topicInput) {
             topicInput.classList.add("shake");
             setTimeout(() => topicInput.classList.remove("shake"), 500);
        }
        return;
    }

    if (catVal && INVALID_CHARS.test(catVal)) {
        showToast("❌ Категория: только буквы");
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
    const customTopic = topicInput && topicInput.value.trim() ? topicInput.value.trim() : "Мои слова (My Words)";
    const customCategory = categoryInput ? categoryInput.value.trim() : null;

    const payload = validWords.map(w => ({
        user_id: user.id,
        word_kr: w,
        status: "pending",
        target_list_id: targetListId || null,
        topic: customTopic,
        category: customCategory
    }));

    console.log("📤 Sending payload to Supabase:", payload);

    // 1. Отправляем заявки и получаем их ID (select() важен для отслеживания)
    const { data: insertedData, error } = await client.from("word_requests").insert(payload).select();

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
            trackProgress(insertedData, input, listSelect, topicInput, categoryInput, formView, progressView, btn, originalContent);
        } else {
            console.log("ℹ️ Fallback UI (No progress view)");
            // Fallback, если HTML элементов нет
            showToast(`✅ Заявка принята! Слов: ${validWords.length}. Ждите уведомления.`);
            input.value = "";
            if (listSelect) listSelect.value = "";
            if (topicInput) topicInput.value = "";
            if (categoryInput) categoryInput.value = "";
            closeModal("add-word-modal");
        }
    }
  } catch (e: any) {
      console.error("❌ Error in submitWordRequest:", e);
      showToast("Ошибка: " + (e.message || "Не удалось отправить"));
  } finally {
      // Восстанавливаем кнопку, если мы НЕ перешли в режим прогресса (там своя логика восстановления)
      if (!keepButtonDisabled && btn) {
          btn.disabled = false;
          btn.innerHTML = originalContent || "Отправить заявку";
      }
  }
}

function trackProgress(
    requests: any[], 
    input: HTMLTextAreaElement, 
    listSelect: HTMLSelectElement,
    topicInput: HTMLInputElement,
    categoryInput: HTMLInputElement,
    formView: HTMLElement,
    progressView: HTMLElement,
    btn: HTMLButtonElement | null,
    originalBtnContent: string
) {
    const total = requests.length;
    const processedIds = new Set<string>(); // Отслеживаем ID, чтобы не считать дважды
    const progressBar = document.getElementById("word-request-progress-bar");
    const statusText = document.getElementById("word-request-status-text");
    let errorCount = 0;
    
    if (statusText) statusText.textContent = `Обработано: 0 из ${total}`;

    const updateUI = () => {
        const count = processedIds.size;
        const percent = (count / total) * 100;
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (statusText) statusText.textContent = `Обработано: ${count} из ${total}`;

        if (count === total) {
            cleanup(); // Останавливаем прослушку и таймер
            if (errorCount > 0) {
                showToast(`⚠️ Готово, но с ошибками: ${errorCount}`);
            } else {
                showToast("✅ Готово! Слова добавлены.");
            }
            
            setTimeout(() => {
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
            }, 1000);
        }
    };

    // Подписываемся на изменения (UPDATE) в таблице word_requests
    const channel = client.channel('word_requests_tracker')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'word_requests',
            filter: `user_id=eq.${requests[0].user_id}` // Фильтруем только свои заявки
        }, (payload: any) => {
            const updated = payload.new;
            if (requests.find(r => r.id === updated.id)) {
                if ((updated.status === 'processed' || updated.status === 'error') && !processedIds.has(updated.id)) {
                    console.log(`⚡ Realtime update: ${updated.word_kr} -> ${updated.status}`);
                    if (updated.status === 'error') {
                        errorCount++;
                        showToast(`❌ Ошибка сервера: ${updated.word_kr}`);
                    }
                    processedIds.add(updated.id);
                    updateUI();
                }
            }
        })
        .subscribe();

    // Fallback: Опрос сервера каждые 2 секунды (если Realtime не сработал)
    const interval = setInterval(async () => {
        if (processedIds.size === total) return;
        
        // Берем ID, которые еще не обработаны
        const pendingIds = requests.filter(r => !processedIds.has(r.id)).map(r => r.id);
        if (pendingIds.length === 0) return;

        const { data } = await client.from('word_requests').select('id, status').in('id', pendingIds);
        if (data) {
            data.forEach((row: any) => {
                if ((row.status === 'processed' || row.status === 'error') && !processedIds.has(row.id)) {
                    console.log(`🔄 Polling update: ${row.id} -> ${row.status}`);
                    if (row.status === 'error') {
                        errorCount++;
                        showToast(`❌ Ошибка: ${row.status}`);
                    }
                    processedIds.add(row.id);
                    updateUI();
                }
            });
        }
    }, 2000);

    // Safety Timeout: Если через 45 секунд ничего не произошло, разблокируем интерфейс
    const safetyTimeout = setTimeout(() => {
        if (processedIds.size < total) {
            cleanup();
            showToast("⏳ Сервер долго не отвечает. Попробуйте позже.");
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent || "Отправить заявку";
            }
            if (statusText) statusText.textContent = "⚠️ Время ожидания истекло";
            // Возвращаем форму, чтобы можно было повторить
            formView.style.display = "block";
            progressView.style.display = "none";
        }
    }, 90000); // Увеличено до 90 секунд

    const cleanup = () => {
        clearInterval(interval);
        clearTimeout(safetyTimeout);
        client.removeChannel(channel);
    };

    // Обработка кнопки отмены
    const cancelBtn = document.getElementById("cancel-word-request-btn");
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            cleanup();
            showToast("🚫 Ожидание отменено");
            
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnContent || "Отправить заявку";
            }
            formView.style.display = "block";
            progressView.style.display = "none";
        };
    }
}

export async function deleteCustomWord(id: string | number) {
    const wordIndex = state.customWords.findIndex(w => w.id === id);
    const dataIndex = state.dataStore.findIndex(w => w.id === id);
    
    const wordBackup = state.customWords[wordIndex];
    const dataBackup = state.dataStore[dataIndex];

    // Оптимистичное удаление
    if (wordIndex > -1) state.customWords.splice(wordIndex, 1);
    if (dataIndex > -1) state.dataStore.splice(dataIndex, 1);
    if (state.searchResults) state.searchResults = state.searchResults.filter(w => w.id !== id);
    
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
            await client.from("word_requests").delete().eq("id", id);
            immediateSaveState();
        }
    );
}
