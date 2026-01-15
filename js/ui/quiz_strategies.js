import { state } from '../core/state.js';
import { levenshtein, generateDiffHtml, speak } from '../utils/utils.js';
import { enableQuizKeyboard } from './ui.js';
import { findAssociations, checkAssociation } from '../core/associations.js'; 
import { checkPronunciation } from '../core/speech.js';
import { quitQuiz } from './quiz.js';
import { findConfusingWords } from '../core/confusing_words.js';

/**
 * @typedef {Object} Word
 * @property {string|number} id
 * @property {string} word_kr
 * @property {string} translation
 * @property {string} [word_hanja]
 * @property {string} [level]
 * @property {string} [type]
 * @property {string} [audio_url]
 * @property {string} [audio_male]
 * @property {string} [image]
 * @property {string} [example_kr]
 * @property {string} [example_ru]
 * @property {string} [example_audio]
 * @property {string} [my_notes]
 * @property {string} [synonyms]
 * @property {string} [antonyms]
 */

/**
 * Helper to generate random options including the correct word.
 * @param {Word} correctWord 
 * @param {number} count 
 * @returns {Array<Word>}
 */
function getOptions(correctWord, count = 4) {
    const options = [correctWord];
    while (options.length < count && state.dataStore.length > count) {
        const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
        if (r && !options.find(o => o.id === r.id)) options.push(r);
    }
    return options.sort(() => Math.random() - 0.5);
}

/**
 * Common handler for button clicks in choice-based modes.
 * @param {boolean} isCorrect 
 * @param {HTMLElement} btn 
 * @param {Function} onAnswer 
 */
function handleChoiceClick(isCorrect, btn, onAnswer) {
    if (btn && btn.parentElement) {
        btn.parentElement.querySelectorAll('.quiz-option').forEach(b => {
            const button = /** @type {HTMLButtonElement} */ (b);
            button.disabled = true;
            if (button.dataset.correct === 'true') button.classList.add('correct');
        });
    }
    if (btn) btn.classList.add(isCorrect ? 'correct' : 'incorrect');
    onAnswer(isCorrect);
}

/**
 * Safely sets text content to avoid XSS
 * @param {HTMLElement} el
 * @param {string} html
 */
function safeSetHTML(el, html) {
    el.innerHTML = html; // Only use this if you are sure html contains NO user input
}

/**
 * @typedef {Object} Strategy
 * @property {(word: Word, container: HTMLElement, onAnswer: (isCorrect: boolean|null, autoAdvance?: boolean, forceNext?: boolean) => void, qEl: HTMLElement) => void} render
 * @property {(word: Word, container: HTMLElement, onAnswer: (isCorrect: boolean|null, autoAdvance?: boolean, forceNext?: boolean) => void) => void} [_renderInput]
 * @property {(container: HTMLElement, onAnswer: (isCorrect: boolean|null, autoAdvance?: boolean, forceNext?: boolean) => void) => void} [_addNextBtn]
 */

/** @type {Record<string, Strategy>} */
export const QuizStrategies = {
    'multiple-choice': {
        render(word, container, onAnswer, qEl) {
            qEl.innerText = `Что означает "${word.word_kr}"?`;
            container.innerHTML = '';
            getOptions(word).forEach(opt => {
                const btn = document.createElement('button'); 
                btn.className = 'quiz-option'; 
                btn.textContent = opt.translation;
                if (opt.id === word.id) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'flashcard': {
        render(word, container, onAnswer, qEl) {
            qEl.innerText = word.word_kr;
            container.innerHTML = '';
            const btn = document.createElement('button'); 
            btn.className = 'quiz-option'; 
            btn.textContent = 'Показать ответ';
            btn.onclick = () => {
                qEl.innerText = word.translation;
                container.innerHTML = '';
                const ok = document.createElement('button'); ok.className = 'quiz-option correct'; ok.textContent = '✓ Знаю'; ok.onclick = () => onAnswer(true);
                const no = document.createElement('button'); no.className = 'quiz-option incorrect'; no.textContent = '✗ Не знаю'; no.onclick = () => onAnswer(false);
                container.appendChild(ok); container.appendChild(no);
                enableQuizKeyboard(container);
            };
            container.appendChild(btn);
            enableQuizKeyboard(container);
        }
    },

    'reverse': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = '';
            const textNode = document.createTextNode(`Выберите корейское слово: "${word.translation}"`);
            qEl.appendChild(textNode);
            if (word.my_notes) {
                const hint = document.createElement('div');
                hint.style.cssText = "font-size:14px; color:var(--text-sub); font-weight:normal;";
                hint.textContent = `(${word.my_notes})`;
                qEl.appendChild(hint);
            }
            container.innerHTML = '';
            getOptions(word).forEach(opt => {
                const btn = document.createElement('button'); btn.className = 'quiz-option'; btn.textContent = opt.word_kr;
                if (opt.id === word.id) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'sentence': {
        render(word, container, onAnswer, qEl) {
            const full = word.example_kr || '';
            const display = full.includes(word.word_kr) ? full.replace(word.word_kr, '___') : `___ ${full}`;
            // Add speak button for the full sentence
            const audioBtn = word.example_audio ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>` : '';
            
            qEl.innerHTML = '';
            const textSpan = document.createElement('span');
            textSpan.textContent = `Вставьте слово: "${display}" `;
            qEl.appendChild(textSpan);
            if (word.example_audio) qEl.innerHTML += audioBtn; // audioBtn is safe (generated locally)

            container.innerHTML = '';
            getOptions(word).forEach(opt => {
                const btn = document.createElement('button'); btn.className = 'quiz-option'; btn.textContent = opt.word_kr;
                if (opt.id === word.id) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'typing': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = '';
            if (word.image) { const img = document.createElement('img'); img.src = word.image; img.className = 'quiz-image'; qEl.appendChild(img); }
            const txt = document.createElement('div');
            txt.textContent = `Напишите перевод для: "${word.translation}"`;
            if (word.my_notes) {
                txt.innerHTML += `<br><span style="font-size:14px; color:var(--text-sub); font-weight:normal;">(${word.my_notes.replace(/</g, "&lt;")})</span>`;
            }
            qEl.appendChild(txt);
            if (this._renderInput) this._renderInput(word, container, onAnswer);
        },
        _renderInput(word, container, onAnswer) {
            container.innerHTML = '';
            const input = document.createElement('input'); input.type = 'text'; input.className = 'quiz-input'; input.placeholder = 'Корейское слово...'; input.autocomplete = 'off';
            const btn = document.createElement('button'); btn.className = 'btn btn-quiz'; btn.style.width = '100%'; btn.textContent = 'Проверить';
            const feedback = document.createElement('div'); feedback.className = 'essay-feedback';
            
            const check = () => {
                if (input.disabled) return;
                const val = input.value.trim().toLowerCase();
                const correct = word.word_kr.trim().toLowerCase();
                const dist = levenshtein(val, correct);
                const isRight = dist <= (correct.length > 3 ? 1 : 0);
                input.disabled = true;
                let autoAdvance = true;
                if (isRight) { 
                    input.classList.add('correct'); input.classList.add('pulse-green');
                    if(dist > 0) { feedback.innerHTML = `<div style="color:var(--warning); font-weight:bold; margin-bottom:5px;">Опечатка:</div><div style="font-size:18px;">${generateDiffHtml(val, correct)}</div>`; container.appendChild(feedback); autoAdvance = false; }
                } else { 
                    input.classList.add('incorrect'); input.classList.add('shake');
                    feedback.innerHTML = `<div style="color:var(--danger); font-weight:bold; margin-bottom:5px;">Неверно! Ответ: ${word.word_kr}</div><div style="font-size:18px;">${generateDiffHtml(val, correct)}</div>`;
                    container.appendChild(feedback); autoAdvance = false;
                }
                onAnswer(isRight, autoAdvance);
                if (!autoAdvance) this._addNextBtn(container, onAnswer);
            };
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
            btn.onclick = check;
            container.appendChild(input); container.appendChild(btn);
            setTimeout(() => input.focus(), 100);
        },
        _addNextBtn(container, onAnswer) {
            const nextBtn = document.createElement('button'); nextBtn.className = 'btn btn-quiz'; nextBtn.style.marginTop = '15px'; nextBtn.style.width = '100%'; nextBtn.textContent = 'Далее ➡';
            nextBtn.onclick = () => onAnswer(null, true, true); // Special flag to just advance
            container.appendChild(nextBtn); setTimeout(() => nextBtn.focus(), 100);
        }
    },

    'essay': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = '';
            const label = document.createElement('div');
            label.style.cssText = "font-size:15px; margin-bottom:10px; color:var(--text-sub);";
            label.textContent = "Переведите предложение на корейский:";
            const sentence = document.createElement('div');
            sentence.style.cssText = "font-size:18px; font-weight:bold;";
            sentence.textContent = `"${word.example_ru || '...'}"`;
            qEl.appendChild(label);
            qEl.appendChild(sentence);
            
            container.innerHTML = '';
            
            const textarea = document.createElement('textarea');
            textarea.className = 'quiz-textarea';
            textarea.rows = 3;
            textarea.placeholder = 'Ваш перевод...';
            
            const checkBtn = document.createElement('button');
            checkBtn.className = 'btn btn-quiz';
            checkBtn.style.width = '100%';
            checkBtn.textContent = 'Показать правильный ответ';

            checkBtn.onclick = () => {
                textarea.disabled = true;
                checkBtn.style.display = 'none';

                const feedback = document.createElement('div');
                feedback.className = 'essay-feedback';
                const diffHtml = generateDiffHtml(textarea.value, word.example_kr);
                const audioBtn = word.example_audio ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>` : '';
                feedback.innerHTML = `
                    <div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div>
                    <div style="font-size:18px; margin-bottom:10px; display:flex; align-items:center;"><span>${word.example_kr}</span> ${audioBtn}</div>
                    <div style="font-weight:bold; margin-bottom:5px;">Ваш вариант (сравнение):</div>
                    <div style="font-size:18px;">${diffHtml}</div>
                `;
                container.appendChild(feedback);

                const correctBtn = document.createElement('button'); correctBtn.className = 'quiz-option correct'; correctBtn.textContent = '✓ Верно'; correctBtn.onclick = () => onAnswer(true);
                const incorrectBtn = document.createElement('button'); incorrectBtn.className = 'quiz-option incorrect'; incorrectBtn.textContent = '✗ Неверно'; incorrectBtn.onclick = () => onAnswer(false);
                
                const buttonContainer = document.createElement('div'); buttonContainer.className = 'quiz-options'; buttonContainer.style.marginTop = '15px';
                buttonContainer.appendChild(correctBtn); buttonContainer.appendChild(incorrectBtn);
                container.appendChild(buttonContainer);
                enableQuizKeyboard(buttonContainer);
            };

            container.appendChild(textarea); container.appendChild(checkBtn); setTimeout(() => textarea.focus(), 100);
        }
    },

    'dictation': {
        render(word, container, onAnswer, qEl) {
            // word_kr is passed to onclick, need to escape quotes if any
            const safeWord = word.word_kr.replace(/'/g, "\\'");
            qEl.innerHTML = `<div style="text-align:center; margin-bottom:20px;">
                <button class="audio-btn-lg" onclick="speak('${safeWord}')">🔊</button>
                <div style="margin-top:15px; font-weight:bold;">Напишите услышанное</div>
            </div>`;
            setTimeout(() => speak(word.word_kr, null), 300);
            const typingStrat = QuizStrategies['typing'];
            if (typingStrat && typingStrat._renderInput) {
                typingStrat._renderInput(word, container, onAnswer);
            }
        }
    },

    'sprint': {
        render(word, container, onAnswer, qEl) {
            let isCorrectPair = Math.random() > 0.5;
            let shownTranslation = word.translation;
            if (!isCorrectPair) {
                let other;
                do { other = state.dataStore[Math.floor(Math.random() * state.dataStore.length)]; } while (other && other.id === word.id);
                // FIX: Убедимся, что случайный перевод не совпадает с правильным
                if (other && other.translation !== word.translation) {
                    shownTranslation = other.translation;
                } else { isCorrectPair = true; } // Если случайно выпал тот же перевод, делаем пару верной
            }
            qEl.innerHTML = '';
            const wDiv = document.createElement('div');
            wDiv.style.cssText = "font-size:32px; margin-bottom:10px;";
            wDiv.textContent = word.word_kr;
            const tDiv = document.createElement('div');
            tDiv.style.cssText = "color:var(--text-sub); font-size:20px;";
            tDiv.textContent = shownTranslation;
            qEl.appendChild(wDiv);
            qEl.appendChild(tDiv);
            
            container.innerHTML = '';
            const yes = document.createElement('button'); yes.className = 'quiz-option sprint-btn yes'; yes.textContent = 'ВЕРНО'; 
            if (isCorrectPair) yes.dataset.correct = 'true';
            yes.onclick = () => handleChoiceClick(isCorrectPair, yes, onAnswer);
            const no = document.createElement('button'); no.className = 'quiz-option sprint-btn no'; no.textContent = 'НЕВЕРНО'; 
            if (!isCorrectPair) no.dataset.correct = 'true';
            no.onclick = () => handleChoiceClick(!isCorrectPair, no, onAnswer);
            container.appendChild(yes); container.appendChild(no);
        }
    },

    'audio': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = '';
            
            const wrapper = document.createElement('div');
            wrapper.style.textAlign = 'center';
            wrapper.style.marginBottom = '20px';
            
            const btn = document.createElement('button');
            btn.className = 'audio-btn-lg';
            btn.textContent = '🔊';
            const currentVoice = /** @type {any} */ (state).currentVoice;
            const url = (currentVoice === 'male' && word.audio_male) ? word.audio_male : word.audio_url;
            const play = () => {
                btn.style.transform = 'scale(0.95)'; setTimeout(() => btn.style.transform = '', 150);
                speak(word.word_kr, url);
            };
            btn.onclick = play;
            
            wrapper.appendChild(btn);
            wrapper.innerHTML += `<div style="margin-top:15px; color:var(--text-sub);">Прослушайте слово</div>`;
            qEl.appendChild(wrapper);
            setTimeout(play, 400);

            // Рендерим варианты ответов вручную (копия логики multiple-choice, но без изменения qEl)
            container.innerHTML = '';
            getOptions(word).forEach(opt => {
                const b = document.createElement('button'); b.className = 'quiz-option'; b.textContent = opt.translation;
                if (opt.id === word.id) b.dataset.correct = 'true';
                b.onclick = () => handleChoiceClick(opt.id === word.id, b, onAnswer);
                container.appendChild(b);
            });
            enableQuizKeyboard(container);
        }
    },

    'dialogue': {
        render(word, container, onAnswer, qEl) {
            const fullText = word.example_kr || '';
            const maskedText = fullText.replace(new RegExp(word.word_kr, 'gi'), '_______');
            
            qEl.innerHTML = `<div style="text-align:center; margin-bottom:20px;">
                <button class="audio-btn-lg" onclick="speak(null, '${word.example_audio}')">▶️</button>
                <div id="dialogue-text" style="margin-top:15px; font-size:18px; line-height:1.5; white-space: pre-line;"></div>
                <div style="margin-top:10px; color:var(--text-sub); font-size:14px;">Какое слово пропущено?</div>
            </div>`;
            const dialogueText = qEl.querySelector('#dialogue-text');
            if (dialogueText) dialogueText.textContent = maskedText;

            setTimeout(() => speak('', word.example_audio), 400);
            QuizStrategies['multiple-choice'].render(word, container, onAnswer, qEl);
        }
    },

    'scramble': {
        render(word, container, onAnswer, qEl) {
            const sentence = (word.example_kr || '').trim();
            const parts = sentence.split(/\s+/).filter(p => p);
            
            qEl.innerHTML = `<div style="font-size:15px; margin-bottom:10px; color:var(--text-sub);">Соберите предложение:</div>
            <div id="scramble-ru" style="font-size:18px; font-weight:bold; margin-bottom:20px; color:var(--primary);"></div>
            <div id="scramble-target" class="scramble-container" style="background:white; border-color:var(--primary);"></div>
            <div id="scramble-source" class="scramble-container"></div>`;
            
            const scrambleRu = qEl.querySelector('#scramble-ru');
            if (scrambleRu) scrambleRu.textContent = `"${word.example_ru || '...'}"`;

            const sourceEl = document.getElementById('scramble-source');
            const targetEl = document.getElementById('scramble-target');
            if (!sourceEl || !targetEl) return;

            container.innerHTML = '';
            /** @type {Array<{text: string, id: number}>} */
            let currentAnswer = [];
            const pool = parts.map((text, i) => ({ text, id: i })).sort(() => Math.random() - 0.5);
            const renderChips = () => {
                if (sourceEl) sourceEl.innerHTML = ''; 
                if (targetEl) targetEl.innerHTML = '';
                currentAnswer.forEach((item, idx) => { 
                    const chip = document.createElement('div'); chip.className = 'scramble-chip'; chip.textContent = item.text; 
                    chip.onclick = () => { currentAnswer.splice(idx, 1); renderChips(); }; 
                    if (targetEl) targetEl.appendChild(chip); 
                });
                pool.forEach(item => { 
                    if (currentAnswer.find(x => x.id === item.id)) return; 
                    const chip = document.createElement('div'); chip.className = 'scramble-chip'; chip.textContent = item.text; 
                    chip.onclick = () => { 
                        currentAnswer.push(item); 
                        renderChips();
                        if (currentAnswer.length === parts.length) {
                            const userAnswer = currentAnswer.map(x => x.text).join(' ');
                            const isCorrect = userAnswer === sentence;
                            if (isCorrect) {
                                if (targetEl) { targetEl.style.borderColor = 'var(--success)'; targetEl.style.background = '#d1fae5'; }
                            } else {
                                if (targetEl) { targetEl.style.borderColor = 'var(--danger)'; targetEl.style.background = '#fee2e2'; }
                                const feedback = document.createElement('div');
                                feedback.className = 'essay-feedback';
                                const audioBtn = word.example_audio ? `<button class="speak-btn" onclick="window.speak(null, '${word.example_audio}')">🔊</button>` : '';
                                feedback.innerHTML = `<div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div><div style="font-size:18px; display:flex; align-items:center;"><span>${sentence}</span> ${audioBtn}</div>`;
                                container.appendChild(feedback);
                            }
                            onAnswer(isCorrect, false); QuizStrategies.typing._addNextBtn(container, onAnswer); } 
                    }; 
                    if (sourceEl) sourceEl.appendChild(chip); 
                });
            };
            renderChips();
        }
    },

    'confusing': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = `Выберите правильное слово:`;
            const tDiv = document.createElement('div');
            tDiv.style.cssText = "font-size:24px; color:var(--primary); margin-top:10px;";
            tDiv.textContent = `"${word.translation}"`;
            qEl.appendChild(tDiv);
            container.innerHTML = '';
            
            // Находим группу похожих слов для текущего слова
            const allGroups = findConfusingWords();
            const group = allGroups.find(g => g.find(w => w.id === word.id)) || [word];
            
            // Используем похожие слова как варианты ответа
            let options = [...group];
            
            // Если похожих слов меньше 4, дополняем случайными (но это редкость для этого режима)
            while (options.length < 4 && state.dataStore.length > 4) {
                const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
                if (r && !options.find(o => o.id === r.id)) options.push(r);
            }
            options = options.slice(0, 4).sort(() => Math.random() - 0.5);
            
            options.forEach(opt => {
                const btn = document.createElement('button'); btn.className = 'quiz-option'; btn.textContent = opt.word_kr;
                if (opt.id === word.id) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.id === word.id, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'synonyms': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = `Найдите синоним к слову:`;
            const wDiv = document.createElement('div');
            wDiv.style.cssText = "font-size:32px; font-weight:bold; margin:10px 0; color:var(--primary);";
            wDiv.textContent = word.word_kr;
            qEl.appendChild(wDiv);
            container.innerHTML = '';
            
            const syns = (word.synonyms || '').split(/[,;]/).map(s => s.trim()).filter(s => s);
            // Берем случайный синоним из списка правильных
            const correctText = syns[Math.floor(Math.random() * syns.length)];
            
            const options = [{ text: correctText, correct: true }];
            
            // Добираем дистракторы
            while (options.length < 4 && state.dataStore.length > 4) {
                const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
                // Убеждаемся, что дистрактор не является самим словом и не входит в список его синонимов
                if (r && r.word_kr !== word.word_kr && !syns.includes(r.word_kr) && !options.find(o => o && o.text === r.word_kr)) {
                    options.push({ text: r.word_kr, correct: false });
                }
            }
            options.sort(() => Math.random() - 0.5);
            
            options.forEach(opt => {
                const btn = document.createElement('button'); 
                btn.className = 'quiz-option'; 
                btn.textContent = opt.text;
                if (opt.correct) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.correct, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'antonyms': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = `Найдите антоним к слову:`;
            const wDiv = document.createElement('div');
            wDiv.style.cssText = "font-size:32px; font-weight:bold; margin:10px 0; color:var(--danger);";
            wDiv.textContent = word.word_kr;
            qEl.appendChild(wDiv);
            container.innerHTML = '';
            
            const ants = (word.antonyms || '').split(/[,;]/).map(s => s.trim()).filter(s => s);
            const correctText = ants[Math.floor(Math.random() * ants.length)];
            
            const options = [{ text: correctText, correct: true }];
            while (options.length < 4 && state.dataStore.length > 4) {
                const r = state.dataStore[Math.floor(Math.random() * state.dataStore.length)];
                // FIX: Проверяем, чтобы дистрактор не был одним из антонимов
                if (r && r.word_kr !== word.word_kr && !ants.includes(r.word_kr) && !options.find(o => o && o.text === r.word_kr)) {
                    options.push({ text: r.word_kr, correct: false });
                }
            }
            options.sort(() => Math.random() - 0.5);
            
            options.forEach(opt => {
                const btn = document.createElement('button'); 
                btn.className = 'quiz-option'; 
                btn.textContent = opt.text;
                if (opt.correct) btn.dataset.correct = 'true';
                btn.onclick = () => handleChoiceClick(opt.correct, btn, onAnswer);
                container.appendChild(btn);
            });
            enableQuizKeyboard(container);
        }
    },

    'association': {
        render(word, container, onAnswer, qEl) {
            // Note: 'word' here is ignored, we generate a full board
            qEl.innerHTML = `<div style="font-size:18px; margin-bottom:15px;">Соедините слово с переводом</div>`;
            container.innerHTML = '';
            
            const pairs = findAssociations();
            if (pairs.length < 5) {
                qEl.innerText = "Недостаточно слов для этого режима.";
                setTimeout(() => quitQuiz(), 1500);
                return;
            }

            const leftSide = pairs.map(p => p.left).sort(() => Math.random() - 0.5);
            const rightSide = pairs.map(p => p.right).sort(() => Math.random() - 0.5);
            
            /** @type {HTMLButtonElement|null} */
            let selectedLeft = null;
            let matchesFound = 0;

            /**
             * @param {Array<Word>} items
             * @param {string} side
             */
            const createCol = (items, side) => {
                const col = document.createElement('div');
                col.style.display = 'flex'; col.style.flexDirection = 'column'; col.style.gap = '10px'; col.style.flex = '1';
                items.forEach(w => {
                    const btn = document.createElement('button');
                    btn.className = 'quiz-option'; 
                    // FIX: Display Korean on Left, Translation on Right
                    btn.textContent = side === 'left' ? w.word_kr : w.translation;
                    btn.style.fontSize = '14px';
                    btn.onclick = () => {
                        if (side === 'left') {
                            if (selectedLeft) selectedLeft.classList.remove('selected');
                            selectedLeft = btn;
                            btn.classList.add('selected');
                            btn.dataset.wordId = String(w.id);
                        } else {
                            if (!selectedLeft) return;
                            const w1 = state.dataStore.find(x => String(x.id) === (selectedLeft ? selectedLeft.dataset.wordId : ''));
                            const isMatch = checkAssociation(w1, w);
                            if (isMatch) {
                                if (selectedLeft) { selectedLeft.classList.add('correct'); selectedLeft.disabled = true; selectedLeft.classList.remove('selected'); }
                                btn.classList.add('correct'); btn.disabled = true;
                                selectedLeft = null;
                                matchesFound++;
                                if (matchesFound === pairs.length) onAnswer(true);
                            } else {
                                btn.classList.add('incorrect'); 
                                if (selectedLeft) selectedLeft.classList.add('incorrect');
                                setTimeout(() => {
                                    btn.classList.remove('incorrect');
                                    if (selectedLeft) selectedLeft.classList.remove('incorrect');
                                }, 500);
                            }
                        }
                    };
                    col.appendChild(btn);
                });
                return col;
            };

            const board = document.createElement('div');
            board.style.display = 'flex'; board.style.gap = '20px';
            board.appendChild(createCol(leftSide, 'left'));
            board.appendChild(createCol(rightSide, 'right'));
            container.appendChild(board);
        }
    },

    'pronunciation': {
        render(word, container, onAnswer, qEl) {
            qEl.innerHTML = '';
            const wDiv = document.createElement('div');
            wDiv.style.cssText = "font-size:32px; margin-bottom:10px;";
            wDiv.textContent = word.word_kr;
            const tDiv = document.createElement('div');
            tDiv.style.cssText = "color:var(--text-sub); font-size:18px;";
            tDiv.textContent = word.translation;
            qEl.appendChild(wDiv); qEl.appendChild(tDiv);
            container.innerHTML = '';
            
            const btn = document.createElement('button');
            btn.className = 'audio-btn-lg';
            btn.style.marginTop = '20px';
            btn.innerHTML = '🎤';
            
            const feedback = document.createElement('div');
            feedback.style.marginTop = '20px';
            feedback.style.fontSize = '18px';
            feedback.style.minHeight = '30px';

            btn.onclick = () => {
                checkPronunciation(word.word_kr, btn, (/** @type {number} */ similarity, /** @type {string} */ text) => {
                    const isPass = similarity >= 60;
                    feedback.innerHTML = isPass 
                        ? `<span style="color:var(--success)">✅ ${similarity}% ("${text}")</span>`
                        : `<span style="color:var(--danger)">❌ ${similarity}% ("${text}")</span>`;
                    
                    setTimeout(() => onAnswer(isPass, false), 1500); // Auto advance after delay
                });
            };
            
            container.appendChild(btn);
            container.appendChild(feedback);
        }
    }
};

// Псевдоним для ясности: режим "Правда/Ложь" использует ту же логику, что и "Спринт"
QuizStrategies['true-false'] = QuizStrategies['sprint'];