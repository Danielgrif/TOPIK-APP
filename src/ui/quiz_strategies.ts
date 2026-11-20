import { state } from "../core/state.ts";
import {
  levenshtein,
  generateDiffHtml,
  speak,
  playTone,
  escapeHtml,
  escapeRegExp,
  showToast,
} from "../utils/utils.ts";
import { enableQuizKeyboard } from "./ui.ts";
import { findAssociations } from "../core/associations.ts";
import { checkPronunciation } from "../core/speech.ts";
import { findConfusingWords } from "../core/confusing_words.ts";
import { Word } from "../types/index.ts";
import { quitQuiz } from "./quiz.ts";
import { recordAttempt } from "../core/db.ts";
import { renderVirtualKeyboard } from "./keyboard.ts";

function getAudioBtnHtml(url: string | undefined): string {
  if (!url) return "";
  const jsSafe = url.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `<button class="speak-btn" data-action="speak" data-url="${escapeHtml(jsSafe)}">🔊</button>`;
}

function getOptions(correctWord: Word, count: number = 4): Word[] {
  const options: Word[] = [correctWord];
  while (options.length < count && state.dataStore.length > count) {
    const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
    if (r && !options.find((o) => o.id === r.id)) options.push(r);
  }
  return options.sort(() => Math.random() - 0.5);
}

function handleChoiceClick(
  isCorrect: boolean,
  btn: HTMLElement,
  onAnswer: (isCorrect: boolean, autoAdvance?: boolean) => void,
) {
  if (btn && btn.parentElement) {
    btn.parentElement.querySelectorAll(".quiz-option").forEach((b) => {
      const button = b as HTMLButtonElement;
      button.disabled = true;
      if (button.dataset.correct === "true") button.classList.add("correct");
    });
  }
  if (btn) btn.classList.add(isCorrect ? "correct" : "incorrect");
  if (!isCorrect && btn) btn.classList.add("shake");
  onAnswer(isCorrect);
}

interface Strategy {
  render: (
    word: Word,
    container: HTMLElement,
    onAnswer: (isCorrect: boolean | null, autoAdvance?: boolean, forceNext?: boolean) => void,
    qEl: HTMLElement,
  ) => void;
  _renderInput?: (
    word: Word,
    container: HTMLElement,
    onAnswer: (isCorrect: boolean | null, autoAdvance?: boolean, forceNext?: boolean) => void,
  ) => void;
  _addNextBtn?: (
    container: HTMLElement,
    onAnswer: (isCorrect: boolean | null, autoAdvance?: boolean, forceNext?: boolean) => void,
  ) => void;
}

export const QuizStrategies: Record<string, Strategy> = {
  "multiple-choice": {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text">${escapeHtml(word.word_kr)}</div><div class="quiz-question-sub">Выберите перевод</div>`;
      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.translation;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  flashcard: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `
        <div class="quiz-question-flipper">
            <div class="quiz-question-front">
                <div class="quiz-question-text">${escapeHtml(word.word_kr)}</div>
                <div class="quiz-question-sub">Вспомните перевод</div>
            </div>
            <div class="quiz-question-back">
                <div class="quiz-question-text primary">${escapeHtml(word.translation || "")}</div>
                <div class="quiz-question-sub">${escapeHtml(word.word_kr)}</div>
            </div>
        </div>
      `;
      container.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "btn btn-quiz";
      btn.style.width = "100%";
      btn.textContent = "Показать ответ";
      btn.onclick = () => {
        playTone("flip");
        const flipper = qEl.querySelector(".quiz-question-flipper");
        if (flipper) {
          (flipper as HTMLElement).classList.add("is-flipped");
        }
        container.innerHTML = "";
        container.classList.add("grid-2"); // Отображаем кнопки в 2 колонки

        const easy = document.createElement("button");
        easy.className = "quiz-option flashcard-remember";
        easy.textContent = "✓ Помню отлично";
        easy.onclick = () => {
          if (easy.disabled) return;
          easy.disabled = true;
          medium.disabled = true;
          ok.disabled = true;
          onAnswer(true, true);
        };

        const medium = document.createElement("button");
        medium.className = "quiz-option flashcard-remember";
        medium.textContent = "✓ Помню с трудом";
        medium.onclick = () => {
          if (medium.disabled) return;
          easy.disabled = true;
          medium.disabled = true;
          ok.disabled = true;
          onAnswer(true, true);
        };

        const ok = document.createElement("button");
        ok.className = "quiz-option flashcard-forgot";
        ok.textContent = "✗ Забыл";
        ok.onclick = () => {
          if (ok.disabled) return;
          easy.disabled = true;
          medium.disabled = true;
          ok.disabled = true;
          onAnswer(false);
        };

        container.appendChild(easy);
        container.appendChild(medium);
        container.appendChild(ok);
      };
      container.appendChild(btn);
    },
  },

  reverse: {
    render(word, container, onAnswer, qEl) {
      let html = `<div class="quiz-question-text">${escapeHtml(word.translation || "")}</div><div class="quiz-question-sub">Выберите корейское слово</div>`;
      if (word.my_notes) {
        const maskHtml = `<span class="skeleton-pulse" style="display: inline-block; width: 2.5em; height: 0.8em; background: var(--surface-3); border-radius: 4px; vertical-align: middle; margin: 0 2px;"></span>`;
        const safeNotes = escapeHtml(word.my_notes);
        const safeWord = escapeHtml(word.word_kr);
        const maskedNotes = safeWord
          ? safeNotes.replace(new RegExp(escapeRegExp(safeWord), "gi"), maskHtml)
          : safeNotes;
        html += `<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${maskedNotes})</div>`;
      }
      qEl.innerHTML = html;
      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  sentence: {
    render(word, container, onAnswer, qEl) {
      const full = escapeHtml(word.example_kr || "");
      const safeWord = escapeHtml(word.word_kr);

      const display = full.includes(safeWord) ? full.replace(safeWord, "___") : `___ ${full}`;
      const audioBtn = getAudioBtnHtml(word.example_audio);

      qEl.innerHTML = `<div class="quiz-question-text small">"${display}"</div><div class="quiz-question-sub">Вставьте пропущенное слово</div>`;
      if (word.example_audio) qEl.insertAdjacentHTML("beforeend", audioBtn);

      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  typing: {
    render(word, container, onAnswer, qEl) {
      let html = "";
      if (word.image) {
        // & и кавычки экранируются для атрибута; браузер декодирует &amp; обратно в &, URL работает.
        html += `<img src="${escapeHtml(word.image)}" class="quiz-image" loading="lazy">`;
      }
      html += `<div class="quiz-question-text">${escapeHtml(word.translation || "")}</div><div class="quiz-question-sub">Напишите на корейском</div>`;

      if (word.my_notes) {
        const maskHtml = `<span class="skeleton-pulse" style="display: inline-block; width: 2.5em; height: 0.8em; background: var(--surface-3); border-radius: 4px; vertical-align: middle; margin: 0 2px;"></span>`;
        let notes = escapeHtml(word.my_notes);
        if (word.word_kr) {
          const safeWord = escapeHtml(word.word_kr);
          notes = notes.replace(new RegExp(escapeRegExp(safeWord), "gi"), maskHtml);
        }
        html += `<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${notes})</div>`;
      }
      qEl.innerHTML = html;
      if (typeof this._renderInput === "function") this._renderInput(word, container, onAnswer);
    },
    _renderInput(word, container, onAnswer) {
      container.innerHTML = "";
      const input = document.createElement("input");
      input.type = "text";
      input.className = "quiz-input";
      input.placeholder = "Корейское слово...";
      input.autocomplete = "off";
      const btn = document.createElement("button");
      btn.className = "btn btn-quiz";
      btn.style.width = "100%";
      btn.textContent = "Проверить";

      // Toggle Keyboard Button
      const kbToggle = document.createElement("button");
      kbToggle.innerHTML = "⌨️";
      kbToggle.className = "btn-icon";
      kbToggle.style.cssText =
        "position: absolute; right: 10px; top: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px;";

      const inputWrapper = document.createElement("div");
      inputWrapper.style.position = "relative";
      inputWrapper.appendChild(input);
      inputWrapper.appendChild(kbToggle);

      const feedback = document.createElement("div");
      feedback.className = "essay-feedback";

      const check = () => {
        if (input.disabled) return;
        const val = input.value.trim().toLowerCase();
        const correct = word.word_kr.trim().toLowerCase();

        // Validation: Check if input language matches target (Korean)
        // Simple regex for Hangul characters
        const hasHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(val);
        const shouldBeHangul = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(correct);

        if (shouldBeHangul && !hasHangul && val.length > 0) {
          playTone("failure");
          input.classList.add("shake");
          setTimeout(() => input.classList.remove("shake"), 500);
          showToast("⚠️ Введите ответ на корейском языке!");
          return;
        }

        const dist = levenshtein(val, correct);
        const isRight = dist <= (correct.length > 3 ? 1 : 0);
        input.disabled = true;
        let autoAdvance = true;
        if (isRight) {
          input.classList.add("correct");
          input.classList.add("pulse-green");
          if (dist > 0) {
            feedback.innerHTML = `<div style="color:var(--warning); font-weight:bold; margin-bottom:5px;">Опечатка:</div><div style="font-size:18px;">${generateDiffHtml(val, correct)}</div>`;
            container.appendChild(feedback);
            autoAdvance = false;
          }
        } else {
          input.classList.add("incorrect");
          input.classList.add("shake");
          feedback.innerHTML = `<div style="color:var(--danger); font-weight:bold; margin-bottom:5px;">Неверно! Ответ: ${escapeHtml(word.word_kr)}</div><div style="font-size:18px;">${generateDiffHtml(val, correct)}</div>`;
          container.appendChild(feedback);
          autoAdvance = false;
        }
        onAnswer(isRight, autoAdvance);
        if (!autoAdvance && this._addNextBtn) this._addNextBtn(container, onAnswer);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") check();
      });
      btn.onclick = check;
      container.appendChild(inputWrapper);
      container.appendChild(btn);

      // Init Virtual Keyboard
      const kb = renderVirtualKeyboard(container, input, kbToggle);
      if (kb) {
        kbToggle.onclick = () => {
          const isVisible = kb.style.display === "grid";
          kb.style.display = isVisible ? "none" : "grid";
        };
      }

      setTimeout(() => input.focus(), 100);
    },
    _addNextBtn(container, onAnswer) {
      const nextBtn = document.createElement("button");
      nextBtn.className = "btn btn-quiz";
      nextBtn.style.marginTop = "15px";
      nextBtn.style.width = "100%";
      nextBtn.textContent = "Далее ➡";
      nextBtn.onclick = () => onAnswer(null, true, true);
      container.appendChild(nextBtn);
      setTimeout(() => nextBtn.focus(), 100);
    },
  },

  essay: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text small">"${escapeHtml(word.example_ru || "...")}"</div><div class="quiz-question-sub">Переведите предложение</div>`;

      container.innerHTML = "";

      const textarea = document.createElement("textarea");
      textarea.className = "quiz-textarea";
      textarea.rows = 3;
      textarea.placeholder = "Ваш перевод...";

      // Container for keyboard
      const kbWrapper = document.createElement("div");

      const kbToggle = document.createElement("button");
      kbToggle.innerHTML = "⌨️";
      kbToggle.className = "btn-icon";
      kbToggle.style.cssText =
        "position: absolute; right: 10px; top: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px;";

      const inputWrapper = document.createElement("div");
      inputWrapper.style.position = "relative";
      inputWrapper.appendChild(textarea);
      inputWrapper.appendChild(kbToggle);

      const checkBtn = document.createElement("button");
      checkBtn.className = "btn btn-quiz";
      checkBtn.style.width = "100%";
      checkBtn.textContent = "Показать правильный ответ";

      checkBtn.onclick = () => {
        textarea.disabled = true;
        checkBtn.style.display = "none";
        kbWrapper.innerHTML = ""; // Hide keyboard if open

        const feedback = document.createElement("div");
        feedback.className = "essay-feedback";
        const diffHtml = generateDiffHtml(textarea.value, word.example_kr || "");
        const audioBtn = getAudioBtnHtml(word.example_audio);
        feedback.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div>
                    <div style="font-size:18px; margin-bottom:10px; display:flex; align-items:center;"><span>${escapeHtml(word.example_kr || "")}</span> ${audioBtn}</div>
                    <div style="font-weight:bold; margin-bottom:5px;">Ваш вариант (сравнение):</div>
                    <div style="font-size:18px;">${diffHtml}</div>
                `;
        container.appendChild(feedback);

        const correctBtn = document.createElement("button");
        correctBtn.className = "quiz-option correct";
        correctBtn.textContent = "✓ Верно";
        correctBtn.onclick = () => onAnswer(true);
        const incorrectBtn = document.createElement("button");
        incorrectBtn.className = "quiz-option incorrect";
        incorrectBtn.textContent = "✗ Неверно";
        incorrectBtn.onclick = () => onAnswer(false);

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "quiz-options";
        buttonContainer.style.marginTop = "15px";
        buttonContainer.appendChild(correctBtn);
        buttonContainer.appendChild(incorrectBtn);
        container.appendChild(buttonContainer);
        enableQuizKeyboard(buttonContainer);
      };

      container.appendChild(inputWrapper);
      container.appendChild(kbWrapper);
      container.appendChild(checkBtn);

      // Init Virtual Keyboard for Essay
      const kb = renderVirtualKeyboard(kbWrapper, textarea, kbToggle);
      if (kb) {
        kbToggle.onclick = () => {
          const isVisible = kb.style.display === "grid";
          kb.style.display = isVisible ? "none" : "grid";
        };
      }

      setTimeout(() => textarea.focus(), 100);
    },
  },

  dictation: {
    render(word, container, onAnswer, qEl) {
      const currentVoice = state.currentVoice;
      const url = currentVoice === "male" && word.audio_male ? word.audio_male : word.audio_url;

      qEl.innerHTML = `<div style="margin-bottom:15px;"><button class="audio-btn-lg" id="dictation-play-btn">🔊</button></div><div class="quiz-question-sub">Напишите услышанное</div>`;

      const btn = qEl.querySelector("#dictation-play-btn") as HTMLElement;
      if (btn) {
        btn.onclick = () => speak(word.word_kr, url || null);
      }

      setTimeout(() => speak(word.word_kr, url || null), 300);
      const typingStrat = QuizStrategies["typing"];
      if (typingStrat && typingStrat._renderInput) {
        typingStrat._renderInput(word, container, onAnswer);
      }
    },
  },

  sprint: {
    render(word, container, onAnswer, qEl) {
      let isCorrectPair = Math.random() > 0.5;
      let shownTranslation = word.translation;
      if (!isCorrectPair) {
        let other;
        do {
          other = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        } while (other && other.id === word.id);
        if (other && other.translation !== word.translation) {
          shownTranslation = other.translation;
        } else {
          isCorrectPair = true;
        }
      }
      qEl.innerHTML = `<div class="quiz-question-text">${escapeHtml(word.word_kr)}</div><div class="quiz-question-sub primary large">${escapeHtml(shownTranslation || "")}</div>`;

      container.classList.add("grid-2");
      container.innerHTML = "";
      const yes = document.createElement("button");
      yes.className = "quiz-option sprint-btn yes";
      yes.textContent = "ВЕРНО";
      yes.innerHTML += `<div class="sprint-timer-bar" style="width: 100%"></div>`;
      if (isCorrectPair) yes.dataset.correct = "true";
      yes.onclick = () => handleChoiceClick(isCorrectPair, yes, onAnswer);
      const no = document.createElement("button");
      no.className = "quiz-option sprint-btn no";
      no.textContent = "НЕВЕРНО";
      no.innerHTML += `<div class="sprint-timer-bar" style="width: 100%"></div>`;
      if (!isCorrectPair) no.dataset.correct = "true";
      no.onclick = () => handleChoiceClick(!isCorrectPair, no, onAnswer);
      container.appendChild(yes);
      container.appendChild(no);
    },
  },

  audio: {
    render(word, container, onAnswer, qEl) {
      const wrapper = document.createElement("div");

      const btn = document.createElement("button");
      btn.className = "audio-btn-lg";
      btn.textContent = "🔊";
      const currentVoice = state.currentVoice;
      const url = currentVoice === "male" && word.audio_male ? word.audio_male : word.audio_url;
      const play = () => {
        btn.style.transform = "scale(0.95)";
        setTimeout(() => (btn.style.transform = ""), 150);
        speak(word.word_kr, url || null);
      };
      btn.onclick = play;

      wrapper.appendChild(btn);
      qEl.innerHTML = "";
      qEl.appendChild(wrapper);
      qEl.innerHTML += `<div class="quiz-question-sub" style="margin-top:15px;">Выберите перевод</div>`;
      setTimeout(play, 300);

      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const b = document.createElement("button");
        b.className = "quiz-option";
        b.textContent = opt.translation;
        if (opt.id === word.id) b.dataset.correct = "true";
        b.onclick = () => handleChoiceClick(opt.id === word.id, b, onAnswer);
        container.appendChild(b);
      });
      enableQuizKeyboard(container);
    },
  },

  dialogue: {
    render(word, container, onAnswer, qEl) {
      const fullText = word.example_kr || "";

      // Улучшенная маскировка: если точного совпадения нет, не ломаем UI
      const hasWord = new RegExp(escapeRegExp(word.word_kr), "gi").test(fullText);
      const textToDisplay = hasWord ? fullText : `${fullText} \n\n(Слово: ${word.word_kr})`;

      const maskedText = textToDisplay.replace(
        new RegExp(escapeRegExp(word.word_kr), "gi"),
        "_______",
      );

      qEl.innerHTML = /*html*/ `<div style="text-align:center; margin-bottom:20px;">
                <button class="audio-btn-lg" id="dialogue-play-btn">▶️</button>
                <div id="dialogue-text" style="margin-top:15px; font-size:18px; line-height:1.5; white-space: pre-line;"></div>
                <div style="margin-top:10px; color:var(--text-sub); font-size:14px;">Какое слово пропущено?</div>
            </div>`;
      const dialogueText = qEl.querySelector("#dialogue-text");
      if (dialogueText) dialogueText.textContent = maskedText;

      const playBtn = qEl.querySelector("#dialogue-play-btn") as HTMLElement;
      // Передаем текст примера для TTS, если аудио-файла нет
      const play = () => speak(word.example_kr || "No text", word.example_audio || null);
      if (playBtn) playBtn.onclick = play;

      setTimeout(play, 400);

      // Logic from multiple-choice, adapted for this mode
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr; // Show Korean words as options
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  scramble: {
    render(word, container, onAnswer, qEl) {
      const sentence = (word.example_kr || "").trim();
      const parts = sentence.split(/\s+/).filter((p) => p);

      qEl.innerHTML = `<div id="scramble-ru" class="quiz-question-text small primary"></div>
            <div id="scramble-target" class="scramble-container" style="background:white; border-color:var(--primary);"></div>
            <div id="scramble-source" class="scramble-container"></div>`;

      const scrambleRu = qEl.querySelector("#scramble-ru");
      if (scrambleRu) scrambleRu.textContent = `"${word.example_ru || "..."}"`; // textContent is safe

      const sourceEl = document.getElementById("scramble-source");
      const targetEl = document.getElementById("scramble-target");
      if (!sourceEl || !targetEl) return;

      container.innerHTML = "";

      const resetBtn = document.createElement("button");
      resetBtn.className = "btn";
      resetBtn.style.cssText =
        "margin-bottom: 15px; padding: 8px 16px; font-size: 14px; display: none; background: var(--surface-3); color: var(--text-main);";
      resetBtn.innerHTML = "↺ Сброс";

      const checkBtn = document.createElement("button");
      checkBtn.className = "btn btn-quiz";
      checkBtn.style.cssText = "width: 100%; margin-top: 15px; display: none;";
      checkBtn.textContent = "Проверить";

      resetBtn.onclick = () => {
        currentAnswer.length = 0;
        if (targetEl) targetEl.style.background = "";
        if (targetEl) targetEl.style.borderColor = "";
        // Clean up previous next buttons if any
        const oldNextBtns = container.querySelectorAll(".next-btn-group");
        oldNextBtns.forEach((btn) => btn.remove());
        checkBtn.disabled = false;
        checkBtn.style.display = "none";
        renderChips();
      };
      container.appendChild(resetBtn);

      const currentAnswer: Array<{ text: string; id: number }> = [];
      const pool = parts.map((text, i) => ({ text, id: i })).sort(() => Math.random() - 0.5);
      const renderChips = () => {
        if (sourceEl) sourceEl.innerHTML = "";
        if (targetEl) targetEl.innerHTML = "";
        resetBtn.style.display = currentAnswer.length > 0 ? "inline-block" : "none";
        checkBtn.style.display = currentAnswer.length > 0 ? "block" : "none";

        currentAnswer.forEach((item, idx) => {
          const chip = document.createElement("div");
          chip.className = "scramble-chip";
          chip.textContent = item.text;
          chip.onclick = () => {
            playTone("pop");
            currentAnswer.splice(idx, 1);
            renderChips();
          };
          if (targetEl) targetEl.appendChild(chip);
        });
        pool.forEach((item) => {
          if (currentAnswer.find((x) => x.id === item.id)) return;
          const chip = document.createElement("div");
          chip.className = "scramble-chip";
          chip.textContent = item.text;
          chip.onclick = () => {
            playTone("pop");
            currentAnswer.push(item);
            renderChips();
          };
          if (sourceEl) sourceEl.appendChild(chip);
        });
      };

      checkBtn.onclick = () => {
        const userAnswer = currentAnswer.map((x) => x.text).join(" ");
        const isCorrect = userAnswer === sentence;
        checkBtn.disabled = true;

        if (isCorrect) {
          if (targetEl) {
            targetEl.style.borderColor = "var(--success)";
            targetEl.style.background = "#d1fae5";
            // FIX: Принудительно озвучиваем полное предложение, а не отдельное слово
            setTimeout(() => {
              speak(sentence, word.example_audio || null);
            }, 100);
          }
        } else {
          if (targetEl) {
            targetEl.style.borderColor = "var(--danger)";
            targetEl.style.background = "#fee2e2";
          }
          const feedback = document.createElement("div");
          feedback.className = "essay-feedback";
          const audioBtn = getAudioBtnHtml(word.example_audio);
          feedback.innerHTML = `<div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div><div style="font-size:18px; display:flex; align-items:center;"><span>${escapeHtml(sentence)}</span> ${audioBtn}</div>`;
          container.appendChild(feedback);
        }
        onAnswer(isCorrect, false);

        const nextBtn = document.createElement("button");
        nextBtn.className = "btn btn-quiz next-btn-group";
        nextBtn.style.marginTop = "15px";
        nextBtn.style.width = "100%";
        nextBtn.textContent = "Далее ➡";
        nextBtn.onclick = () => onAnswer(null, true, true);
        container.appendChild(nextBtn);
        checkBtn.style.display = "none";
      };

      renderChips();
      container.appendChild(checkBtn);
    },
  },

  confusing: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text primary">"${escapeHtml(word.translation || "")}"</div><div class="quiz-question-sub">Выберите правильное слово</div>`;
      container.innerHTML = "";

      const allGroups = findConfusingWords();
      const group = allGroups.find((g) => g.find((w) => w.id === word.id)) || [word];

      let options = [...group];

      while (options.length < 4 && state.dataStore.length > 4) {
        const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        if (r && !options.find((o) => o.id === r.id)) options.push(r);
      }
      options = options.slice(0, 4).sort(() => Math.random() - 0.5);

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  synonyms: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text primary">${escapeHtml(word.word_kr)}</div><div class="quiz-question-sub">Найдите синоним</div>`;
      container.innerHTML = "";

      const syns = (word.synonyms || "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s);
      const correctText = syns[Math.floor(Math.random() * syns.length)];

      const options: Array<{ text: string; correct: boolean }> = [
        { text: correctText, correct: true },
      ];

      while (options.length < 4 && state.dataStore.length > 4) {
        const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        if (
          r &&
          r.word_kr !== word.word_kr &&
          !syns.includes(r.word_kr) &&
          !options.find((o) => o && o.text === r.word_kr)
        ) {
          options.push({ text: r.word_kr, correct: false });
        }
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.text;
        if (opt.correct) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.correct, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  antonyms: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text danger">${escapeHtml(word.word_kr)}</div><div class="quiz-question-sub">Найдите антоним</div>`;
      container.innerHTML = "";

      const ants = (word.antonyms || "")
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s);
      const correctText = ants[Math.floor(Math.random() * ants.length)];

      const options: Array<{ text: string; correct: boolean }> = [
        { text: correctText, correct: true },
      ];
      while (options.length < 4 && state.dataStore.length > 4) {
        const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        // FIX: Проверяем, чтобы дистрактор не был одним из антонимов
        if (
          r &&
          r.word_kr !== word.word_kr &&
          !ants.includes(r.word_kr) &&
          !options.find((o) => o && o.text === r.word_kr)
        ) {
          options.push({ text: r.word_kr, correct: false });
        }
      }
      options.sort(() => Math.random() - 0.5);

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.text;
        if (opt.correct) btn.dataset.correct = "true";
        btn.onclick = () => handleChoiceClick(opt.correct, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  association: {
    render(_word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-sub">Соедините слово с переводом</div>`;
      container.innerHTML = "";

      const pairs = findAssociations();
      if (pairs.length < 5) {
        qEl.innerText = "Недостаточно слов для этого режима.";
        setTimeout(() => quitQuiz(true), 1500);
        return;
      }

      const leftSide = pairs.map((p) => p.left).sort(() => Math.random() - 0.5);
      const rightSide = pairs.map((p) => p.right).sort(() => Math.random() - 0.5);

      let selectedLeft: HTMLButtonElement | null = null;
      let matchesFound = 0;

      const createCol = (items: Word[], side: string) => {
        const col = document.createElement("div");
        col.style.display = "flex";
        col.style.flexDirection = "column";
        col.style.gap = "10px";
        col.style.flex = "1";
        items.forEach((w) => {
          const btn = document.createElement("button");
          btn.className = "quiz-option";
          btn.textContent = side === "left" ? w.word_kr : w.translation;
          btn.style.fontSize = "14px";
          btn.onclick = () => {
            if (side === "left") {
              if (selectedLeft) selectedLeft.classList.remove("selected");
              selectedLeft = btn;
              btn.classList.add("selected");
              btn.dataset.wordId = String(w.id);
            } else {
              if (!selectedLeft) return;

              const leftId = selectedLeft.dataset.wordId;
              const rightId = String(w.id);

              // Check if this specific pair exists in the generated pairs
              const isMatch = pairs.some(
                (p) => String(p.left.id) === leftId && String(p.right.id) === rightId,
              );

              if (isMatch) {
                if (selectedLeft) {
                  selectedLeft.classList.add("correct");
                  selectedLeft.disabled = true;
                  selectedLeft.classList.remove("selected");
                }
                btn.classList.add("correct");
                btn.disabled = true;
                selectedLeft = null;
                matchesFound++;
                if (matchesFound === pairs.length) {
                  onAnswer(true);
                } else {
                  playTone("success", 100);
                }

                // Record attempt for the word on the left (the "question" word)
                if (leftId) {
                  recordAttempt(leftId, true);
                }
              } else {
                playTone("failure", 100);
                btn.classList.add("incorrect");
                // FIX: Не завершаем раунд при ошибке в ассоциациях, даем попробовать еще раз
                // onAnswer(false);
                if (selectedLeft) selectedLeft.classList.add("incorrect");
                setTimeout(() => {
                  btn.classList.remove("incorrect");
                  if (selectedLeft) selectedLeft.classList.remove("incorrect");
                }, 500);
              }
            }
          };
          col.appendChild(btn);
        });
        return col;
      };

      const board = document.createElement("div");
      board.style.display = "flex";
      board.style.gap = "20px";
      board.appendChild(createCol(leftSide, "left"));
      board.appendChild(createCol(rightSide, "right"));
      container.appendChild(board);
    },
  },

  pronunciation: {
    render(word, container, onAnswer, qEl) {
      let targetText = word.word_kr;
      let isExample = false;

      const updateHeader = () => {
        if (isExample) {
          qEl.innerHTML = `<div class="quiz-question-text small" style="font-size: 1.4em;">"${escapeHtml(word.example_kr || "")}"</div><div class="quiz-question-sub">${escapeHtml(word.example_ru || "")}</div>`;
        } else {
          qEl.innerHTML = `<div class="quiz-question-text">${escapeHtml(word.word_kr)}</div><div class="quiz-question-sub">${escapeHtml(word.translation || "")}</div>`;
        }
      };

      updateHeader();
      container.innerHTML = "";

      const wrapper = document.createElement("div");
      wrapper.style.display = "flex";
      wrapper.style.flexDirection = "column";
      wrapper.style.alignItems = "center";
      wrapper.style.margin = "0 auto";
      wrapper.style.width = "100%";
      wrapper.style.maxWidth = "500px";

      // Add Switcher if example exists
      if (word.example_kr && word.example_kr.length > 2) {
        const switchContainer = document.createElement("div");
        switchContainer.className = "segment-control";
        switchContainer.style.marginBottom = "20px";
        switchContainer.style.width = "100%";

        const btnWord = document.createElement("button");
        btnWord.className = "segment-btn active";
        btnWord.textContent = "Слово";

        const btnEx = document.createElement("button");
        btnEx.className = "segment-btn";
        btnEx.textContent = "Пример";

        const toggle = (ex: boolean) => {
          isExample = ex;
          targetText = ex ? word.example_kr || "" : word.word_kr;
          if (ex) {
            btnWord.classList.remove("active");
            btnEx.classList.add("active");
          } else {
            btnWord.classList.add("active");
            btnEx.classList.remove("active");
          }
          updateHeader();
          // Hide feedback if any
          const fb = wrapper.querySelector(".essay-feedback") as HTMLElement;
          if (fb) fb.style.display = "none";
          // Reset hints
          const h = wrapper.querySelector(".quiz-hint") as HTMLElement;
          if (h) {
            h.style.display = "block";
            h.textContent = "Нажмите и произнесите " + (ex ? "предложение" : "слово");
            h.style.color = "var(--text-sub)";
          }
          // Reset controls
          const c = wrapper.querySelector(".pronunciation-controls") as HTMLElement;
          if (c) c.style.display = "flex";

          const b = wrapper.querySelector(".audio-btn-lg") as HTMLElement;
          if (b) {
            b.style.backgroundColor = "";
            b.classList.remove("pulse-red-effect");
          }
        };

        btnWord.onclick = () => toggle(false);
        btnEx.onclick = () => toggle(true);

        switchContainer.appendChild(btnWord);
        switchContainer.appendChild(btnEx);
        wrapper.appendChild(switchContainer);
      }

      const controls = document.createElement("div");
      controls.className = "pronunciation-controls";
      controls.style.cssText =
        "display: flex; gap: 20px; align-items: center; justify-content: center; width: 100%; margin-top: 10px; margin-bottom: 20px;";

      const listenBtn = document.createElement("button");
      listenBtn.className = "btn-icon";
      listenBtn.style.cssText =
        "width: 50px; height: 50px; font-size: 24px; background: var(--surface-2); color: var(--text-main); border: 1px solid var(--border-color);";
      listenBtn.innerHTML = "🔊";
      listenBtn.onclick = () => {
        const url = isExample
          ? word.example_audio
          : state.currentVoice === "male" && word.audio_male
            ? word.audio_male
            : word.audio_url;
        speak(targetText, url || null);
      };

      const btn = document.createElement("button");
      btn.className = "audio-btn-lg";
      btn.style.margin = "0";
      btn.innerHTML = "🎤";

      const hint = document.createElement("div");
      hint.className = "quiz-hint";
      hint.style.cssText = "color: var(--text-sub); margin-bottom: 20px; min-height: 24px;";
      hint.textContent = "Нажмите и произнесите слово";

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "120px";
      canvas.style.borderRadius = "12px";
      canvas.style.background = "var(--surface-3)";
      canvas.style.marginBottom = "20px";
      canvas.style.display = "none";

      const feedback = document.createElement("div");
      feedback.className = "essay-feedback";
      feedback.style.display = "none";
      feedback.style.width = "100%";

      controls.appendChild(listenBtn);
      controls.appendChild(btn);
      wrapper.appendChild(controls);

      wrapper.appendChild(hint);
      wrapper.appendChild(canvas);
      wrapper.appendChild(feedback);
      container.appendChild(wrapper);

      btn.onclick = () => {
        hint.textContent = "Слушаю...";
        hint.style.color = "var(--primary)";
        btn.style.backgroundColor = "var(--danger)";
        btn.classList.add("pulse-red-effect"); // Используем существующую анимацию или стиль

        canvas.style.display = "block";

        // Fix scaling for Retina/High DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * dpr;
        canvas.height = canvas.offsetHeight * dpr;

        checkPronunciation(
          targetText,
          btn,
          (similarity: number, text: string, audioUrl?: string, diffHtml?: string) => {
            btn.style.backgroundColor = "";
            btn.classList.remove("pulse-red-effect");
            hint.style.display = "none";
            canvas.style.display = "none";

            const isPass = similarity >= 60;
            feedback.style.display = "block";

            const color = isPass ? "var(--success)" : "var(--danger)";
            const icon = isPass ? "✅" : "❌";
            const title = isPass ? "Отлично!" : "Попробуйте еще раз";

            const resultDisplay = diffHtml
              ? `<div style="font-size: 18px; letter-spacing: 1px; word-break: break-all;">${diffHtml}</div>`
              : `<div style="font-size: 16px; font-weight: 600; color: var(--text-main);">${escapeHtml(text || "...")}</div>`;

            feedback.innerHTML = `
              <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 40px; margin-bottom: 5px;">${icon}</div>
                <div style="font-size: 20px; font-weight: 800; color: ${color};">${title}</div>
                
                <div style="margin-top: 15px; padding: 0 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; font-weight: 600;">
                        <span style="color: var(--text-sub);">Точность</span>
                        <span style="color: ${color};">${similarity}%</span>
                    </div>
                    <div style="height: 10px; background: var(--surface-2); border-radius: 5px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div style="width: ${similarity}%; background: ${color}; height: 100%; transition: width 1s ease-out; border-radius: 5px;"></div>
                    </div>
                </div>
              </div>
              
              <div style="background: var(--surface-2); padding: 12px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 4px;">Распознано:</div>
                ${resultDisplay}
              </div>
            `;

            const actionsRow = document.createElement("div");
            actionsRow.style.cssText =
              "display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;";

            const origBtn = document.createElement("button");
            origBtn.className = "btn";
            origBtn.style.cssText =
              "padding: 10px; font-size: 13px; background: var(--surface-3); color: var(--text-main); border: 1px solid var(--border-color); justify-content: center;";
            origBtn.innerHTML = "🔊 Оригинал";
            origBtn.onclick = () => {
              const url = isExample
                ? word.example_audio
                : state.currentVoice === "male" && word.audio_male
                  ? word.audio_male
                  : word.audio_url;
              speak(targetText, url || null);
            };
            actionsRow.appendChild(origBtn);

            if (audioUrl) {
              const userBtn = document.createElement("button");
              userBtn.className = "btn";
              userBtn.style.cssText =
                "padding: 10px; font-size: 13px; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary); justify-content: center;";
              userBtn.innerHTML = "▶️ Моя запись";
              const audio = new Audio(audioUrl);
              userBtn.onclick = () => audio.play();
              actionsRow.appendChild(userBtn);

              // Auto-playback sequence: Original -> User
              setTimeout(async () => {
                const url = isExample
                  ? word.example_audio
                  : state.currentVoice === "male" && word.audio_male
                    ? word.audio_male
                    : word.audio_url;
                await speak(targetText, url || null);
                setTimeout(() => audio.play().catch(() => {}), 500);
              }, 600);
            } else {
              origBtn.style.gridColumn = "1 / -1";
            }
            feedback.appendChild(actionsRow);

            const nextBtn = document.createElement("button");
            nextBtn.className = "btn btn-quiz";
            nextBtn.style.width = "100%";
            nextBtn.textContent = "Далее ➡";
            nextBtn.onclick = () => onAnswer(null, true, true);
            feedback.appendChild(nextBtn);

            // Скрываем кнопку записи, чтобы сфокусировать внимание на результате
            controls.style.display = "none";

            onAnswer(isPass, false);
          },
          canvas,
          (interimText) => {
            hint.textContent = interimText;
            hint.style.color = "var(--text-main)";
          },
        );
      };
    },
  },
};

QuizStrategies["true-false"] = QuizStrategies["sprint"];
