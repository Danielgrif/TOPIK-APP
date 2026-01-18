import { state } from "../core/state.ts";
import { levenshtein, generateDiffHtml, speak } from "../utils/utils.ts";
import { enableQuizKeyboard } from "./ui.ts";
import { findAssociations, checkAssociation } from "../core/associations.ts";
import { checkPronunciation } from "../core/speech.ts";
import { quitQuiz } from "./quiz.ts";
import { findConfusingWords } from "../core/confusing_words.ts";
import { Word } from "../types/index.ts";

function getOptions(correctWord: Word, count: number = 4): Word[] {
  const options: Word[] = [correctWord];
  while (options.length < count && state.dataStore.length > count) {
    const r =
      state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
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
  onAnswer(isCorrect);
}

interface Strategy {
  render: (
    word: Word,
    container: HTMLElement,
    onAnswer: (
      isCorrect: boolean | null,
      autoAdvance?: boolean,
      forceNext?: boolean,
    ) => void,
    qEl: HTMLElement,
  ) => void;
  _renderInput?: (
    word: Word,
    container: HTMLElement,
    onAnswer: (
      isCorrect: boolean | null,
      autoAdvance?: boolean,
      forceNext?: boolean,
    ) => void,
  ) => void;
  _addNextBtn?: (
    container: HTMLElement,
    onAnswer: (
      isCorrect: boolean | null,
      autoAdvance?: boolean,
      forceNext?: boolean,
    ) => void,
  ) => void;
}

export const QuizStrategies: Record<string, Strategy> = {
  "multiple-choice": {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text">${word.word_kr}</div><div class="quiz-question-sub">Выберите перевод</div>`;
      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.translation;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () =>
          handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  flashcard: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text">${word.word_kr}</div><div class="quiz-question-sub">Вспомните перевод</div>`;
      container.innerHTML = "";
      const btn = document.createElement("button");
      btn.className = "btn btn-quiz";
      btn.style.width = "100%";
      btn.textContent = "Показать ответ";
      btn.onclick = () => {
        qEl.innerHTML = `<div class="quiz-question-text" style="color:var(--primary)">${word.translation}</div><div class="quiz-question-sub">${word.word_kr}</div>`;
        container.innerHTML = "";
        const ok = document.createElement("button");
        ok.className = "quiz-option correct";
        ok.textContent = "✓ Знаю";
        ok.onclick = () => onAnswer(true);
        const no = document.createElement("button");
        no.className = "quiz-option incorrect";
        no.textContent = "✗ Не знаю";
        no.onclick = () => onAnswer(false);
        container.appendChild(ok);
        container.appendChild(no);
        enableQuizKeyboard(container);
      };
      container.appendChild(btn);
      enableQuizKeyboard(container);
    },
  },

  reverse: {
    render(word, container, onAnswer, qEl) {
      let html = `<div class="quiz-question-text">${word.translation}</div><div class="quiz-question-sub">Выберите корейское слово</div>`;
      if (word.my_notes) {
        html += `<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${word.my_notes})</div>`;
      }
      qEl.innerHTML = html;
      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () =>
          handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  sentence: {
    render(word, container, onAnswer, qEl) {
      const full = word.example_kr || "";
      const display = full.includes(word.word_kr)
        ? full.replace(word.word_kr, "___")
        : `___ ${full}`;
      const audioBtn = word.example_audio
        ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>`
        : "";

      qEl.innerHTML = `<div class="quiz-question-text" style="font-size:22px;">"${display}"</div><div class="quiz-question-sub">Вставьте пропущенное слово</div>`;
      if (word.example_audio) qEl.innerHTML += audioBtn;

      container.innerHTML = "";
      getOptions(word).forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () =>
          handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  typing: {
    render(word, container, onAnswer, qEl) {
      let html = "";
      if (word.image) {
        html += `<img src="${word.image}" class="quiz-image">`;
      }
      html += `<div class="quiz-question-text">${word.translation}</div><div class="quiz-question-sub">Напишите на корейском</div>`;
      
      if (word.my_notes) {
        html += `<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${word.my_notes.replace(/</g, "&lt;")})</div>`;
      }
      qEl.innerHTML = html;
      if (typeof this._renderInput === "function")
        this._renderInput(word, container, onAnswer);
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
      const feedback = document.createElement("div");
      feedback.className = "essay-feedback";

      const check = () => {
        if (input.disabled) return;
        const val = input.value.trim().toLowerCase();
        const correct = word.word_kr.trim().toLowerCase();
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
          feedback.innerHTML = `<div style="color:var(--danger); font-weight:bold; margin-bottom:5px;">Неверно! Ответ: ${word.word_kr}</div><div style="font-size:18px;">${generateDiffHtml(val, correct)}</div>`;
          container.appendChild(feedback);
          autoAdvance = false;
        }
        onAnswer(isRight, autoAdvance);
        if (!autoAdvance && this._addNextBtn)
          this._addNextBtn(container, onAnswer);
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") check();
      });
      btn.onclick = check;
      container.appendChild(input);
      container.appendChild(btn);
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
      qEl.innerHTML = `<div class="quiz-question-text" style="font-size:20px;">"${word.example_ru || "..."}"</div><div class="quiz-question-sub">Переведите предложение</div>`;

      container.innerHTML = "";

      const textarea = document.createElement("textarea");
      textarea.className = "quiz-textarea";
      textarea.rows = 3;
      textarea.placeholder = "Ваш перевод...";

      const checkBtn = document.createElement("button");
      checkBtn.className = "btn btn-quiz";
      checkBtn.style.width = "100%";
      checkBtn.textContent = "Показать правильный ответ";

      checkBtn.onclick = () => {
        textarea.disabled = true;
        checkBtn.style.display = "none";

        const feedback = document.createElement("div");
        feedback.className = "essay-feedback";
        const diffHtml = generateDiffHtml(
          textarea.value,
          word.example_kr || "",
        );
        const audioBtn = word.example_audio
          ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>`
          : "";
        feedback.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div>
                    <div style="font-size:18px; margin-bottom:10px; display:flex; align-items:center;"><span>${word.example_kr}</span> ${audioBtn}</div>
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

      container.appendChild(textarea);
      container.appendChild(checkBtn);
      setTimeout(() => textarea.focus(), 100);
    },
  },

  dictation: {
    render(word, container, onAnswer, qEl) {
      const currentVoice = state.currentVoice;
      const url =
        currentVoice === "male" && word.audio_male
          ? word.audio_male
          : word.audio_url;

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
          other =
            state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        } while (other && other.id === word.id);
        if (other && other.translation !== word.translation) {
          shownTranslation = other.translation;
        } else {
          isCorrectPair = true;
        }
      }
      qEl.innerHTML = `<div class="quiz-question-text">${word.word_kr}</div><div class="quiz-question-sub" style="font-size:20px; color:var(--primary)">${shownTranslation}</div>`;

      container.innerHTML = "";
      const yes = document.createElement("button");
      yes.className = "quiz-option sprint-btn yes";
      yes.textContent = "ВЕРНО";
      if (isCorrectPair) yes.dataset.correct = "true";
      yes.onclick = () => handleChoiceClick(isCorrectPair, yes, onAnswer);
      const no = document.createElement("button");
      no.className = "quiz-option sprint-btn no";
      no.textContent = "НЕВЕРНО";
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
      const url =
        currentVoice === "male" && word.audio_male
          ? word.audio_male
          : word.audio_url;
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
      const maskedText = fullText.replace(
        new RegExp(word.word_kr, "gi"),
        "_______",
      );

      qEl.innerHTML = `<div style="text-align:center; margin-bottom:20px;">
                <button class="audio-btn-lg" onclick="speak(null, '${word.example_audio}')">▶️</button>
                <div id="dialogue-text" style="margin-top:15px; font-size:18px; line-height:1.5; white-space: pre-line;"></div>
                <div style="margin-top:10px; color:var(--text-sub); font-size:14px;">Какое слово пропущено?</div>
            </div>`;
      const dialogueText = qEl.querySelector("#dialogue-text");
      if (dialogueText) dialogueText.textContent = maskedText;

      setTimeout(() => speak("", word.example_audio || null), 400);
      QuizStrategies["multiple-choice"].render(word, container, onAnswer, qEl);
    },
  },

  scramble: {
    render(word, container, onAnswer, qEl) {
      const sentence = (word.example_kr || "").trim();
      const parts = sentence.split(/\s+/).filter((p) => p);

      qEl.innerHTML = `<div id="scramble-ru" class="quiz-question-text" style="font-size:20px; color:var(--primary);"></div>
            <div id="scramble-target" class="scramble-container" style="background:white; border-color:var(--primary);"></div>
            <div id="scramble-source" class="scramble-container"></div>`;

      const scrambleRu = qEl.querySelector("#scramble-ru");
      if (scrambleRu) scrambleRu.textContent = `"${word.example_ru || "..."}"`;

      const sourceEl = document.getElementById("scramble-source");
      const targetEl = document.getElementById("scramble-target");
      if (!sourceEl || !targetEl) return;

      container.innerHTML = "";

      const resetBtn = document.createElement("button");
      resetBtn.className = "btn";
      resetBtn.style.cssText = "margin-bottom: 15px; padding: 8px 16px; font-size: 14px; display: none; background: var(--surface-3); color: var(--text-main);";
      resetBtn.innerHTML = "↺ Сброс";
      resetBtn.onclick = () => {
        currentAnswer.length = 0;
        if (targetEl) targetEl.style.background = "";
        if (targetEl) targetEl.style.borderColor = "";
        renderChips();
      };
      container.appendChild(resetBtn);

      const currentAnswer: Array<{ text: string; id: number }> = [];
      const pool = parts
        .map((text, i) => ({ text, id: i }))
        .sort(() => Math.random() - 0.5);
      const renderChips = () => {
        if (sourceEl) sourceEl.innerHTML = "";
        if (targetEl) targetEl.innerHTML = "";
        resetBtn.style.display = currentAnswer.length > 0 ? "inline-block" : "none";
        currentAnswer.forEach((item, idx) => {
          const chip = document.createElement("div");
          chip.className = "scramble-chip";
          chip.textContent = item.text;
          chip.onclick = () => {
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
            currentAnswer.push(item);
            renderChips();
            if (currentAnswer.length === parts.length) {
              const userAnswer = currentAnswer.map((x) => x.text).join(" ");
              const isCorrect = userAnswer === sentence;
              if (isCorrect) {
                if (targetEl) {
                  targetEl.style.borderColor = "var(--success)";
                  targetEl.style.background = "#d1fae5";
                }
              } else {
                if (targetEl) {
                  targetEl.style.borderColor = "var(--danger)";
                  targetEl.style.background = "#fee2e2";
                }
                const feedback = document.createElement("div");
                feedback.className = "essay-feedback";
                const audioBtn = word.example_audio
                  ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>`
                  : "";
                feedback.innerHTML = `<div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div><div style="font-size:18px; display:flex; align-items:center;"><span>${sentence}</span> ${audioBtn}</div>`;
                container.appendChild(feedback);
              }
              onAnswer(isCorrect, false);
              
              const nextBtn = document.createElement("button");
              nextBtn.className = "btn btn-quiz";
              nextBtn.style.marginTop = "15px";
              nextBtn.style.width = "100%";
              nextBtn.textContent = "Далее ➡";
              nextBtn.onclick = () => onAnswer(null, true, true);
              container.appendChild(nextBtn);
            }
          };
          if (sourceEl) sourceEl.appendChild(chip);
        });
      };
      renderChips();
    },
  },

  confusing: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text" style="color:var(--primary)">"${word.translation}"</div><div class="quiz-question-sub">Выберите правильное слово</div>`;
      container.innerHTML = "";

      const allGroups = findConfusingWords();
      const group = allGroups.find((g) => g.find((w) => w.id === word.id)) || [
        word,
      ];

      let options = [...group];

      while (options.length < 4 && state.dataStore.length > 4) {
        const r =
          state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        if (r && !options.find((o) => o.id === r.id)) options.push(r);
      }
      options = options.slice(0, 4).sort(() => Math.random() - 0.5);

      options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "quiz-option";
        btn.textContent = opt.word_kr;
        if (opt.id === word.id) btn.dataset.correct = "true";
        btn.onclick = () =>
          handleChoiceClick(opt.id === word.id, btn, onAnswer);
        container.appendChild(btn);
      });
      enableQuizKeyboard(container);
    },
  },

  synonyms: {
    render(word, container, onAnswer, qEl) {
      qEl.innerHTML = `<div class="quiz-question-text" style="color:var(--primary)">${word.word_kr}</div><div class="quiz-question-sub">Найдите синоним</div>`;
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
        const r =
          state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
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
      qEl.innerHTML = `<div class="quiz-question-text" style="color:var(--danger)">${word.word_kr}</div><div class="quiz-question-sub">Найдите антоним</div>`;
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
        const r =
          state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
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
        setTimeout(() => quitQuiz(), 1500);
        return;
      }

      const leftSide = pairs.map((p) => p.left).sort(() => Math.random() - 0.5);
      const rightSide = pairs
        .map((p) => p.right)
        .sort(() => Math.random() - 0.5);

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
              const w1 = state.dataStore.find(
                (x) =>
                  String(x.id) ===
                  (selectedLeft ? selectedLeft.dataset.wordId : ""),
              );
              const isMatch = checkAssociation(w1, w);
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
                if (matchesFound === pairs.length) onAnswer(true);
                
                // FIX: Записываем успех для конкретного слова
                if (w1) {
 import("../core/db.ts").then(m => m.recordAttempt(w1.id, true));
 import("../core/db.ts").then(m => m.recordAttempt(w.id, true));
                }
              } else {
                btn.classList.add("incorrect");
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
      qEl.innerHTML = `<div class="quiz-question-text">${word.word_kr}</div><div class="quiz-question-sub">${word.translation}</div>`;
      container.innerHTML = "";

      const btn = document.createElement("button");
      btn.className = "audio-btn-lg";
      btn.style.marginTop = "20px";
      btn.innerHTML = "🎤";

      const feedback = document.createElement("div");
      feedback.style.marginTop = "20px";
      feedback.style.fontSize = "18px";
      feedback.style.minHeight = "30px";
      feedback.style.display = "flex";
      feedback.style.flexDirection = "column";
      feedback.style.alignItems = "center";
      feedback.style.gap = "10px";

      btn.onclick = () => {
        checkPronunciation(
          word.word_kr,
          btn,
          (similarity: number, text: string, audioUrl?: string) => {
            const isPass = similarity >= 60;
            feedback.innerHTML = isPass
              ? `<span style="color:var(--success)">✅ ${similarity}% ("${text}")</span>`
              : `<span style="color:var(--danger)">❌ ${similarity}% ("${text}")</span>`;

            if (audioUrl) {
              const playBtn = document.createElement("button");
              playBtn.className = "btn";
              playBtn.style.cssText = "padding: 8px 16px; font-size: 14px;";
              playBtn.textContent = "▶️ Моя запись";
              const audio = new Audio(audioUrl);
              audio.onended = () => (playBtn.textContent = "▶️ Моя запись");
              playBtn.onclick = () => {
                if (audio.paused) {
                  audio.play();
                  playBtn.textContent = "⏸️ Моя запись";
                } else {
                  audio.pause();
                  playBtn.textContent = "▶️ Моя запись";
                }
              };
              feedback.appendChild(playBtn);
            }

            const nextBtn = document.createElement("button");
            nextBtn.className = "btn btn-quiz";
            nextBtn.textContent = "Далее ➡";
            nextBtn.onclick = () => onAnswer(null, true, true);
            feedback.appendChild(nextBtn);

            onAnswer(isPass, false);
          },
        );
      };

      container.appendChild(btn);
      container.appendChild(feedback);
    },
  },
};

QuizStrategies["true-false"] = QuizStrategies["sprint"];
