import { state } from "../core/state.ts";
import {
  showToast,
  parseBilingualString,
  playTone,
  playComboSound,
  escapeHtml,
} from "../utils/utils.ts";
import { ensureSessionStarted, playAndSpeak, saveAndRender } from "./ui.ts";
import { closeModal, openModal, openConfirm } from "./ui_modal.ts";
import { recordAttempt, scheduleSaveState } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";
import { applyBackgroundMusic } from "./ui_settings.ts";
import { QuizStrategies } from "./quiz_strategies.ts";
import { Word } from "../types/index.ts";
import { getQuizConfig, QuizConfig } from "./quiz_modes_config.ts";

let currentQuizMode: string;
let quizWords: Word[] = [];
let quizIndex: number;
let quizStart: number;
let quizLastTick: number; // Для отслеживания дельты времени
let quizStar: string = "all";
let quizTopic: string = "all";
let quizCategory: string = "all";
let quizSearch: string = "";
let quizInterval: number | null = null;
let quizCorrectCount: number = 0;
let quizTimerValue: number = 0;
let survivalLives: number = 0;
let isQuizPaused: boolean = false;
let advanceTimer: number | null = null;
let currentConfig: QuizConfig | null = null;
let quizXPGained: number = 0;
let quizStreak: number = 0;

export function updateDailyChallengeUI() {
  const btn = document.querySelector(".fire-btn") as HTMLElement;
  if (!btn) return;

  const today = new Date().toLocaleDateString("en-CA");
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = d.toLocaleDateString("en-CA");
  const challenge = state.dailyChallenge || {
    lastDate: null,
    completed: false,
    streak: 0,
  };

  const isCompleted = challenge.lastDate === today && challenge.completed;
  // Серия под угрозой, если она > 0, задание на сегодня не выполнено, и последнее выполнение было вчера
  const isAtRisk =
    (challenge.streak || 0) > 0 &&
    !isCompleted &&
    challenge.lastDate === yesterday;
  const isMaster = (challenge.streak || 0) >= 7;

  const isSunday = new Date().getDay() === 0;

  if (isSunday) {
    btn.classList.add("super-challenge");
    btn.innerHTML = "🌟";
    btn.title = "Супер-вызов (x2 Награда)";
  } else {
    btn.classList.remove("super-challenge");
    btn.innerHTML = "🔥";
    btn.title = "Ежедневный вызов";
  }

  if (!isCompleted) {
    btn.classList.add("has-notification");
    if (isAtRisk) {
      btn.classList.add("streak-risk");
    } else {
      btn.classList.remove("streak-risk");
    }
  } else {
    btn.classList.remove("has-notification");
    btn.classList.remove("streak-risk");
  }

  if (isMaster) {
    btn.classList.add("streak-master");
  } else {
    btn.classList.remove("streak-master");
  }
}

export function checkSuperChallengeNotification() {
  const today = new Date().toLocaleDateString("en-CA");
  const isCompleted =
    state.dailyChallenge &&
    state.dailyChallenge.lastDate === today &&
    state.dailyChallenge.completed;
  const isSunday = new Date().getDay() === 0;

  if (isSunday && !isCompleted) {
    setTimeout(() => {
      showToast("🌟 Сегодня доступен СУПЕР-ВЫЗОВ! (x2 Награда)", 5000);
    }, 2000);
  }
}

export function buildQuizModes() {
  const searchInput = document.getElementById("quiz-search-input");
  if (searchInput) searchInput.style.display = "block";
  const quizCount = document.getElementById("quiz-count");
  if (quizCount) quizCount.style.display = "block";
  const header = document.querySelector(
    "#quiz-modal .modal-header",
  ) as HTMLElement;
  if (header) header.style.display = "flex";
  const quizGame = document.getElementById("quiz-game");
  if (quizGame) quizGame.style.display = "none";
  const modeSelector = document.getElementById("quiz-mode-selector");
  if (modeSelector) modeSelector.style.display = "flex";
  const quizDiff = document.getElementById("quiz-difficulty");
  if (quizDiff) quizDiff.style.display = "flex";
  const quizFilters = document.getElementById("quiz-filters");
  if (quizFilters) quizFilters.style.display = "flex";

  const modes = [
    // Challenges
    {
      id: "mix",
      emoji: "🔀",
      label: "Микс",
      mode: "mix",
      category: "challenge",
    },
    {
      id: "sprint",
      emoji: "⚡",
      label: "Спринт",
      mode: "sprint",
      category: "challenge",
    },
    {
      id: "survival",
      emoji: "☠️",
      label: "Выживание",
      mode: "survival",
      category: "challenge",
    },

    // Basics
    {
      id: "multiple-choice",
      emoji: "🎯",
      label: "Выбор",
      mode: "multiple-choice",
      category: "basics",
    },
    {
      id: "reverse",
      emoji: "🔄",
      label: "Обратно",
      mode: "reverse",
      category: "basics",
    },
    {
      id: "flashcard",
      emoji: "🃏",
      label: "Карточки",
      mode: "flashcard",
      category: "basics",
    },
    {
      id: "true-false",
      emoji: "✅",
      label: "Верно/Нет",
      mode: "true-false",
      category: "basics",
    },

    // Writing & Context
    {
      id: "typing",
      emoji: "⌨️",
      label: "Написание",
      mode: "typing",
      category: "writing",
    },
    {
      id: "sentence",
      emoji: "📝",
      label: "Пропуски",
      mode: "sentence",
      category: "writing",
    },
    {
      id: "scramble",
      emoji: "🧩",
      label: "Конструктор",
      mode: "scramble",
      category: "writing",
    },
    {
      id: "essay",
      emoji: "✍️",
      label: "Эссе",
      mode: "essay",
      category: "writing",
    },

    // Audio
    {
      id: "audio",
      emoji: "🎧",
      label: "Аудио",
      mode: "audio",
      category: "audio",
    },
    {
      id: "dictation",
      emoji: "✍️",
      label: "Диктант",
      mode: "dictation",
      category: "audio",
    },
    {
      id: "dialogue",
      emoji: "🗣️",
      label: "Диалог",
      mode: "dialogue",
      category: "audio",
    },
    {
      id: "pronunciation",
      emoji: "🎤",
      label: "Речь",
      mode: "pronunciation",
      category: "audio",
    },

    // Advanced
    {
      id: "association",
      emoji: "🔗",
      label: "Пары",
      mode: "association",
      category: "advanced",
    },
    {
      id: "confusing",
      emoji: "🤔",
      label: "Похожие",
      mode: "confusing",
      category: "advanced",
    },
    {
      id: "synonyms",
      emoji: "🤝",
      label: "Синонимы",
      mode: "synonyms",
      category: "advanced",
    },
    {
      id: "antonyms",
      emoji: "↔️",
      label: "Антонимы",
      mode: "antonyms",
      category: "advanced",
    },
  ];

  const categories: Record<string, string> = {
    challenge: "🔥 Вызовы",
    basics: "📚 Основы",
    writing: "✍️ Письмо",
    audio: "🎧 Аудирование",
    advanced: "🧠 Продвинутый",
  };

  quizTopic = state.quizTopic || "all";
  quizCategory = state.quizCategory || "all";
  quizStar = state.quizDifficulty || "all";
  quizSearch = "";

  const sInput = document.getElementById(
    "quiz-search-input",
  ) as HTMLInputElement;
  if (sInput) {
    sInput.value = "";
    sInput.oninput = (e) => {
      const target = e.target as HTMLInputElement;
      if (target) {
        quizSearch = target.value.trim().toLowerCase();
        updateQuizCount();
      }
    };
  }

  populateQuizFilters();
  populateQuizDifficulty();

  const selector = document.getElementById("quiz-mode-selector");
  if (selector) {
    selector.innerHTML = "";

    // Group modes by category
    const grouped: Record<string, typeof modes> = Object.create(null);
    modes.forEach((m) => {
      if (!grouped[m.category]) grouped[m.category] = [];
      grouped[m.category].push(m);
    });

    // Render categories
    Object.entries(categories).forEach(([catKey, catTitle]) => {
      if (grouped[catKey]) {
        const header = document.createElement("div");
        header.className = "quiz-category-header";
        header.textContent = catTitle;
        selector.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "quiz-group-grid";

        grouped[catKey].forEach((m) => {
          const btn = document.createElement("button");
          btn.className = "quiz-mode-btn";
          btn.dataset.mode = m.mode;
          btn.innerHTML = `<span class="mode-icon">${m.emoji}</span><span class="mode-label">${m.label}</span>`;
          btn.onclick = (e) => {
            createRipple(e, btn);
            setTimeout(() => startQuizMode(m.mode), 300);
          };
          grid.appendChild(btn);
        });
        selector.appendChild(grid);
      }
    });
  }
  updateQuizCount();
}

function createRipple(event: MouseEvent, button: HTMLElement) {
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;
  const rect = button.getBoundingClientRect();

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - rect.left - radius}px`;
  circle.style.top = `${event.clientY - rect.top - radius}px`;
  circle.classList.add("ripple");

  const ripple = button.getElementsByClassName("ripple")[0];
  if (ripple) ripple.remove();

  button.appendChild(circle);
}

function populateQuizFilters() {
  const tSelect = document.getElementById(
    "quiz-topic-select",
  ) as HTMLSelectElement;
  if (!tSelect || !state.dataStore) return;

  const topics = new Set<string>();
  state.dataStore.forEach((w: Word) => {
    if (w.type === state.currentType) {
      const t = w.topic || w.topic_ru || w.topic_kr;
      if (t) topics.add(t);
    }
  });
  tSelect.innerHTML = '<option value="all">Все темы</option>';
  Array.from(topics)
    .sort()
    .forEach((t) => {
      if (t) {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = parseBilingualString(t).ru;
        tSelect.appendChild(opt);
      }
    });
  tSelect.value = quizTopic;
  tSelect.onchange = () => {
    quizTopic = tSelect.value;
    quizCategory = "all";
    state.quizTopic = quizTopic;
    state.quizCategory = quizCategory;
    localStorage.setItem("quiz_topic_v1", quizTopic);
    localStorage.setItem("quiz_category_v1", quizCategory);
    populateQuizCategories();
    updateQuizCount();
  };
  populateQuizCategories();
}

function populateQuizCategories() {
  const cSelect = document.getElementById(
    "quiz-category-select",
  ) as HTMLSelectElement;
  if (!cSelect || !state.dataStore) return;
  const categories = new Set<string>();
  state.dataStore.forEach((w: Word) => {
    if (w.type !== state.currentType) return;
    const t = w.topic || w.topic_ru || w.topic_kr;
    if (quizTopic !== "all" && t !== quizTopic) return;
    const c = w.category || w.category_ru || w.category_kr;
    if (c) categories.add(c);
  });
  cSelect.innerHTML = '<option value="all">Все категории</option>';
  Array.from(categories)
    .sort()
    .forEach((c) => {
      if (c) {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = parseBilingualString(c).ru;
        cSelect.appendChild(opt);
      }
    });
  cSelect.value = quizCategory;
  cSelect.onchange = () => {
    quizCategory = cSelect.value;
    state.quizCategory = quizCategory;
    localStorage.setItem("quiz_category_v1", quizCategory);
    updateQuizCount();
  };
}

function populateQuizDifficulty() {
  const container = document.getElementById("quiz-difficulty");
  if (!container) return;
  container.innerHTML = "";
  const levels = ["all", "★★★", "★★☆", "★☆☆"];
  levels.forEach((lvl) => {
    const btn = document.createElement("button");
    btn.className = "btn quiz-difficulty-btn";
    btn.dataset.lvl = lvl;
    if (lvl === quizStar) btn.classList.add("active");
    btn.textContent = lvl === "all" ? "Все уровни" : lvl;
    btn.onclick = () => {
      quizStar = lvl;
      container
        .querySelectorAll(".btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.quizDifficulty = lvl;
      localStorage.setItem("quiz_difficulty_v1", lvl);
      updateQuizCount();
    };
    container.appendChild(btn);
  });
}

export function startQuizMode(mode: string) {
  currentQuizMode = mode;
  currentConfig = getQuizConfig(mode);
  ensureSessionStarted();

  const filterFn = (w: Word) => {
    if (w.type !== state.currentType) return false;
    const wTopic = w.topic || w.topic_ru || w.topic_kr;
    const matchTopic = quizTopic === "all" || wTopic === quizTopic;
    const wCat = w.category || w.category_ru || w.category_kr;
    const matchCat = quizCategory === "all" || wCat === quizCategory;
    const matchStar = quizStar === "all" || w.level === quizStar;
    const matchSearch =
      !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
    return matchTopic && matchCat && matchStar && matchSearch;
  };

  const pool = state.dataStore.filter(filterFn);
  quizWords = currentConfig.getWords(pool);

  if (quizWords.length === 0) {
    if (mode === "confusing") {
      showToast("Не найдено похожих слов для тренировки!");
      return;
    }
    if (quizTopic !== "all" || quizCategory !== "all") {
      showToast("Нет слов для тренировки в выбранной теме!");
    } else {
      // Fallback if filter is too strict but we need something
      quizWords = state.dataStore.slice(0, 10);
    }
    if (quizWords.length === 0) return;
  }

  const uniqueQuizMap = new Map();
  quizWords.forEach((w) => {
    if (!uniqueQuizMap.has(w.id)) uniqueQuizMap.set(w.id, w);
  });
  quizWords = Array.from(uniqueQuizMap.values());

  quizIndex = 0;
  quizStart = Date.now();
  quizLastTick = Date.now();
  quizCorrectCount = 0;
  quizXPGained = 0;
  quizStreak = 0;
  quizTimerValue = currentConfig.initialTimer;
  survivalLives = currentConfig.initialLives;
  isQuizPaused = false;

  const comboEl = document.getElementById("quiz-combo");
  if (comboEl) comboEl.style.display = "none";

  const bar = document.getElementById("quiz-progress-fill");
  if (bar) {
    bar.style.transition = "";
    bar.style.background = "";
  }
  if (currentConfig.isTimerCountdown)
    if (bar)
      bar.style.transition = "width 1s linear, background-color 1s linear";

  if (quizInterval) {
    clearInterval(quizInterval);
    quizInterval = null;
  }
  quizInterval = window.setInterval(() => {
    const now = Date.now();
    // Если прошло меньше 100мс (защита от дребезга), пропускаем
    if (now - quizLastTick < 100) return;

    if (isQuizPaused) return;

    if (!currentConfig || !currentConfig.onTick) return;

    // Вычисляем, сколько секунд прошло с прошлого тика (обычно 1, но может быть больше при лагах)
    const deltaSeconds = Math.round((now - quizLastTick) / 1000);
    if (deltaSeconds < 1) return; // Ждем накопления полной секунды

    const { gameOver, nextTimer, ui } = currentConfig.onTick(
      quizTimerValue,
      deltaSeconds,
    );
    quizTimerValue = nextTimer;
    quizLastTick = now;

    if (ui) {
      const el = document.getElementById("quiz-timer-display");
      if (el) {
        el.innerText = ui.text;
        el.style.color = ui.isDanger ? "var(--danger)" : "";
        if (ui.isDanger) {
          playTone("tick");
          el.style.transform = "scale(1.15)";
          setTimeout(() => (el.style.transform = ""), 200);
        }
      }
      if (bar) {
        bar.style.width = `${ui.barPercent}%`;
        if (currentConfig.isTimerCountdown) {
          bar.style.backgroundColor = `hsl(${Math.floor((ui.barPercent / 100) * 120)}, 80%, 45%)`;
        } else {
          bar.style.backgroundColor = "";
        }
      }

      // Update sprint button timers if they exist
      const sprintBars = document.querySelectorAll(".sprint-timer-bar");
      sprintBars.forEach((sb) => {
        (sb as HTMLElement).style.width = `${ui.barPercent}%`;
      });
    }

    if (gameOver) endQuiz(false);
  }, 1000);

  const quizDiff = document.getElementById("quiz-difficulty");
  if (quizDiff) quizDiff.style.display = "none";
  const quizFilters = document.getElementById("quiz-filters");
  if (quizFilters) quizFilters.style.display = "none";
  const modeSelector = document.getElementById("quiz-mode-selector");
  if (modeSelector) modeSelector.style.display = "none";

  const searchInput = document.getElementById("quiz-search-input");
  if (searchInput) searchInput.style.display = "none";
  const quizCount = document.getElementById("quiz-count");
  if (quizCount) quizCount.style.display = "none";
  const header = document.querySelector(
    "#quiz-modal .modal-header",
  ) as HTMLElement;
  if (header) header.style.display = "none";

  const quizGame = document.getElementById("quiz-game");
  if (quizGame) quizGame.style.display = "flex";

  const modalBody = document.querySelector("#quiz-modal .modal-body-container");
  if (modalBody) modalBody.scrollTop = 0;

  applyBackgroundMusic(true);

  const modalContent = document.querySelector("#quiz-modal .modal-content");
  if (modalContent) modalContent.classList.add("game-active");

  nextQuizQuestion();
}

export function startDailyChallenge() {
  const today = new Date().toLocaleDateString("en-CA");
  if (
    state.dailyChallenge &&
    state.dailyChallenge.lastDate === today &&
    state.dailyChallenge.completed
  ) {
    openDailyStatusModal();
    return;
  }

  const launch = () => {
    const isSunday = new Date().getDay() === 0;
    currentQuizMode = isSunday ? "super-daily" : "daily";
    currentConfig = getQuizConfig(currentQuizMode);
    ensureSessionStarted();

    quizWords = currentConfig.getWords(state.dataStore);

    if (!quizWords || quizWords.length === 0) {
      showToast("⚠️ Не удалось подобрать слова для вызова. Попробуйте позже.");
      return;
    }

    quizIndex = 0;
    quizStart = Date.now();
    quizCorrectCount = 0;
    quizXPGained = 0;
    quizStreak = 0;

    const quizDiff = document.getElementById("quiz-difficulty");
    if (quizDiff) quizDiff.style.display = "none";
    const quizFilters = document.getElementById("quiz-filters");
    if (quizFilters) quizFilters.style.display = "none";
    const modeSelector = document.getElementById("quiz-mode-selector");
    if (modeSelector) modeSelector.style.display = "none";
    const searchInput = document.getElementById("quiz-search-input");
    if (searchInput) searchInput.style.display = "none";
    const quizCount = document.getElementById("quiz-count");
    if (quizCount) quizCount.style.display = "none";
    const header = document.querySelector(
      "#quiz-modal .modal-header",
    ) as HTMLElement;
    if (header) header.style.display = "none";

    const quizGame = document.getElementById("quiz-game");
    if (quizGame) quizGame.style.display = "flex";
    applyBackgroundMusic(true);

    nextQuizQuestion();
    showToast(
      isSunday
        ? "🌟 СУПЕР-ВЫЗОВ начат! (x2 Награда)"
        : "🔥 Ежедневный вызов начат!",
    );
  };

  const modal = document.getElementById("quiz-modal");
  if (modal && !modal.classList.contains("active")) {
    openModal("quiz-modal");
    setTimeout(launch, 300);
  } else {
    launch();
  }
}

function openDailyStatusModal() {
  const now = new Date();
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  const diff = tomorrow.getTime() - now.getTime();
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const streak = state.dailyChallenge.streak || 0;
  const isTomorrowSuper = tomorrow.getDay() === 0;
  const multiplier = isTomorrowSuper ? 2 : 1;

  const nextStreak = streak + 1;
  const nextBase = 50 * multiplier;
  const nextBonus = Math.min(nextStreak, 7) * 10 * multiplier;
  const nextTotal = nextBase + nextBonus;

  let modal = document.getElementById("daily-status-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "daily-status-modal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.onclick = (e) => {
      if (e.target === modal) closeModal("daily-status-modal");
    };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-content modal-centered" style="text-align: center; max-width: 350px;">
            <div style="position: absolute; top: 15px; right: 15px;">
                <button class="btn btn-icon close-modal-btn" onclick="closeModal('daily-status-modal')">✕</button>
            </div>
            <div style="font-size: 64px; margin-bottom: 10px;">${isTomorrowSuper ? "🌟" : "🔥"}</div>
            <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">Серия: ${streak} дн.</div>
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 25px;">Вызов на сегодня выполнен!</div>
            
            <div style="background: var(--surface-2); padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid var(--border-color);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; margin-bottom: 10px;">
                    ${isTomorrowSuper ? "🌟 Супер-награда завтра" : "Награда завтра"}
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="font-size: 32px; font-weight: 900; color: var(--gold);">${nextTotal}</div>
                    <div style="font-size: 24px;">💰</div>
                </div>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 5px;">
                    (${nextBase} база + ${nextBonus} бонус серии)
                </div>
            </div>

            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 10px;">До следующего вызова:</div>
            <div style="font-size: 28px; font-weight: 800; font-family: monospace; color: var(--primary); margin-bottom: 25px;">
                ${h}ч ${String(m).padStart(2, "0")}м
            </div>
            
            <button class="btn btn-quiz" style="width: 100%; padding: 15px; font-size: 16px;" onclick="closeModal('daily-status-modal')">Отлично</button>
        </div>
    `;

  openModal("daily-status-modal");
}

function nextQuizQuestion() {
  if (quizIndex >= quizWords.length) {
    endQuiz();
    return;
  }
  const container = document.getElementById("quiz-opts");

  const infoEl = document.getElementById("quiz-extra-info");
  if (infoEl) infoEl.remove();

  // Reset container classes (remove grid-2 etc from previous questions)
  if (container) container.className = "quiz-options";

  if (container)
    container
      .querySelectorAll(".quiz-option")
      .forEach((btn) => ((btn as HTMLButtonElement).disabled = false));
  const progressEl = document.getElementById("quiz-progress-fill");
  if (progressEl) progressEl.style.backgroundColor = "";

  preloadNextAudio();
  const word = quizWords[quizIndex];
  const scoreEl = document.getElementById("quiz-score");
  if (scoreEl)
    scoreEl.innerText = `Вопрос ${quizIndex + 1} / ${quizWords.length}`;
  if (currentQuizMode === "survival") {
    if (scoreEl) scoreEl.innerText = `❤️ ${survivalLives}`;
  }

  const qEl = document.getElementById("quiz-q") as HTMLElement;

  let strategyKey = currentQuizMode;

  if (currentQuizMode === "daily" || currentQuizMode === "super-daily") {
    const allowed = ["multiple-choice", "reverse"];
    if (word.audio_url || word.audio_male) allowed.push("audio");
    strategyKey = allowed[Math.floor(Math.random() * allowed.length)];
  } else if (currentQuizMode === "mix") {
    const allowed = [
      "multiple-choice",
      "reverse",
      "typing",
      "flashcard",
      "true-false",
    ];

    if (word.audio_url || word.audio_male) {
      allowed.push("audio");
      allowed.push("dictation");
    }

    if (word.example_kr && word.example_ru && word.example_kr.length > 5) {
      allowed.push("sentence");
      allowed.push("scramble");
    }

    if (word.synonyms && word.synonyms.trim()) allowed.push("synonyms");
    if (word.antonyms && word.antonyms.trim()) allowed.push("antonyms");

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
      allowed.push("pronunciation");

    strategyKey = allowed[Math.floor(Math.random() * allowed.length)];
  }

  if (currentQuizMode === "association") strategyKey = "association";
  if (currentQuizMode === "pronunciation") strategyKey = "pronunciation";
  if (currentQuizMode === "confusing") strategyKey = "confusing";
  if (currentQuizMode === "synonyms") strategyKey = "synonyms";
  if (currentQuizMode === "antonyms") strategyKey = "antonyms";
  if (currentQuizMode === "survival") strategyKey = "multiple-choice";

  const strategy =
    QuizStrategies[strategyKey] || QuizStrategies["multiple-choice"];

  strategy.render(
    word,
    container as HTMLElement,
    (isCorrect: boolean | null, autoAdvance?: boolean, forceNext?: boolean) => {
      if (forceNext || isCorrect === null) {
        if (quizIndex < quizWords.length - 1) {
          quizIndex++;
          nextQuizQuestion();
        } else {
          endQuiz(false); // FIX: Естественное завершение через кнопку "Далее" не должно считаться провалом
        }
        return;
      }
      recordQuizAnswer(isCorrect as boolean, autoAdvance);
    },
    qEl,
  );
}

function preloadNextAudio() {
  try {
    for (let i = 1; i <= 3; i++) {
      const w = quizWords[quizIndex + i];
      if (w) {
        let url = w.audio_url;
        if (state.currentVoice === "male" && w.audio_male) url = w.audio_male;
        if (url) {
          const a = new Audio();
          a.src = url;
          a.preload = "auto";
        }
      }
    }
  } catch {
    /* ignore */
  }
}

function recordQuizAnswer(isCorrect: boolean, autoAdvance: boolean = true) {
  const word = quizWords[quizIndex];
  // FIX: Не записываем статистику для фиктивных слов (режим Ассоциации)
  if (word.id !== "dummy") {
    recordAttempt(word.id, isCorrect);
  }

  let hasExtraInfo = false;
  if (
    (word.synonyms && word.synonyms.trim()) ||
    (word.antonyms && word.antonyms.trim())
  ) {
    const body = document.querySelector(".quiz-body");
    if (body) {
      let infoEl = document.getElementById("quiz-extra-info");
      if (!infoEl) {
        infoEl = document.createElement("div");
        infoEl.id = "quiz-extra-info";
        infoEl.style.cssText =
          "margin-top: 15px; padding: 12px; background: var(--surface-2); border-radius: 12px; text-align: center; animation: fadeIn 0.3s; border: 1px solid var(--border-color); font-size: 14px;";
        body.appendChild(infoEl);
      }

      let content = "";
      if (word.synonyms && word.synonyms.trim())
        content += `<div style="margin-bottom:4px;"><span style="font-weight:bold; color:var(--primary);">≈</span> ${escapeHtml(word.synonyms)}</div>`;
      if (word.antonyms && word.antonyms.trim())
        content += `<div><span style="font-weight:bold; color:var(--danger);">≠</span> ${escapeHtml(word.antonyms)}</div>`;

      infoEl.innerHTML = content;
      hasExtraInfo = true;
    }
  }

  if (isCorrect) {
    quizCorrectCount++;
    state.learned.add(word.id);
    state.mistakes.delete(word.id);
    quizStreak++;

    if (state.wordHistory[word.id] && !state.wordHistory[word.id].learnedDate) {
      state.wordHistory[word.id].learnedDate = Date.now();
    }

    addXP(10);
    quizXPGained += 10;

    if (currentConfig) {
      const { timeChange, livesChange } = currentConfig.onAnswer(
        true,
        quizTimerValue,
        survivalLives,
      );
      quizTimerValue += timeChange;
      survivalLives += livesChange;
    }
    updateComboUI(quizStreak);

    document.body.classList.add("correct-flash");
    setTimeout(() => document.body.classList.remove("correct-flash"), 700);
  } else {
    state.mistakes.add(word.id);
    quizStreak = 0;
    addXP(-2);
    quizXPGained -= 2;
    const questionEl = document.getElementById("quiz-q");
    if (questionEl) {
      questionEl.classList.remove("shake");
      void questionEl.offsetWidth;
      questionEl.classList.add("shake");
      setTimeout(() => questionEl.classList.remove("shake"), 500);
    }

    if (currentConfig) {
      const { timeChange, livesChange, gameOver } = currentConfig.onAnswer(
        false,
        quizTimerValue,
        survivalLives,
      );
      quizTimerValue += timeChange;
      survivalLives += livesChange;

      const scoreEl = document.getElementById("quiz-score");
      if (scoreEl && currentQuizMode === "survival")
        scoreEl.innerText = `❤️ ${survivalLives}`;

      if (currentQuizMode === "survival" && livesChange < 0) {
        playTone("life-lost");
        document.body.classList.remove("damage-flash");
        void document.body.offsetWidth;
        document.body.classList.add("damage-flash");
        setTimeout(() => document.body.classList.remove("damage-flash"), 600);
      }

      if (gameOver) {
        endQuiz(false);
        return;
      }
    }
    document.body.classList.add("wrong-flash");
    setTimeout(() => document.body.classList.remove("wrong-flash"), 700);
    updateComboUI(0);
  }
  checkAchievements();
  saveAndRender();
  if (currentQuizMode !== "survival" || isCorrect) {
    if (isCorrect && quizStreak > 1) {
      playComboSound(quizStreak);
    } else {
      playTone(isCorrect ? "success" : "failure");
    }
  }

  const advance = () => {
    if (!autoAdvance) return;
    const delay = hasExtraInfo ? 2500 : 500;
    if (advanceTimer) clearTimeout(advanceTimer);
    advanceTimer = window.setTimeout(() => {
      if (quizIndex < quizWords.length - 1) {
        quizIndex++;
        nextQuizQuestion();
      } else {
        endQuiz();
      }
    }, delay);
  };

  if (isCorrect) {
    isQuizPaused = true;
    playAndSpeak(word).then(() => {
      isQuizPaused = false;
      advance();
    });
  } else {
    advance();
  }
}

function endQuiz(forceEnd: boolean = false) {
  if (quizInterval) {
    clearInterval(quizInterval);
    quizInterval = null;
  }
  if (advanceTimer) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }

  // FIX: Проверяем, был ли квиз действительно завершен для Ежедневного вызова
  const isDaily =
    currentQuizMode === "daily" || currentQuizMode === "super-daily";
  // Квиз завершен, если это не принудительный выход И мы дошли до конца
  const isCompleted =
    !forceEnd && quizWords.length > 0 && quizIndex >= quizWords.length - 1;

  if (isDaily && !isCompleted) {
    showToast("⚠️ Вызов прерван. Награда не получена.");
  } else {
    if (currentConfig && currentConfig.onEnd) {
      currentConfig.onEnd(quizCorrectCount);
    }
  }

  if (currentQuizMode === "daily" || currentQuizMode === "super-daily") {
    updateDailyChallengeUI();
  }

  if (state.sessionActive && quizWords && quizIndex >= 0) {
    const count = quizIndex + 1;
    state.sessions.push({
      date: new Date().toISOString(),
      duration: Math.round((Date.now() - quizStart) / 1000),
      wordsReviewed: count,
      accuracy: count > 0 ? Math.round((quizCorrectCount / count) * 100) : 0,
    });
    localStorage.setItem("sessions_v5", JSON.stringify(state.sessions));
    scheduleSaveState();
  }

  const quizGameEl = document.getElementById("quiz-game");
  if (quizGameEl) quizGameEl.style.display = "none";
  const quizModeSelectorEl = document.getElementById("quiz-mode-selector");
  if (quizModeSelectorEl) quizModeSelectorEl.style.display = "flex";
  const quizDifficultyEl = document.getElementById("quiz-difficulty");
  if (quizDifficultyEl) quizDifficultyEl.style.display = "flex";
  const quizFiltersEl = document.getElementById("quiz-filters");
  if (quizFiltersEl) quizFiltersEl.style.display = "flex";
  applyBackgroundMusic();

  const modalContent = document.querySelector("#quiz-modal .modal-content");
  if (modalContent) modalContent.classList.remove("game-active");

  const searchInputEl = document.getElementById("quiz-search-input");
  if (searchInputEl) searchInputEl.style.display = "block";
  const quizCountEl = document.getElementById("quiz-count");
  if (quizCountEl) quizCountEl.style.display = "block";
  const header = document.querySelector(
    "#quiz-modal .modal-header",
  ) as HTMLElement;
  if (header) header.style.display = "flex";

  if (!forceEnd) {
    let total = quizWords.length;
    if (currentQuizMode === "survival" || currentQuizMode === "sprint") {
      total = quizIndex + 1;
      total = Math.min(total, quizWords.length);
    }
    checkAchievements();
    showQuizSummaryModal(quizCorrectCount, total, Math.max(0, quizXPGained));
  } else {
    showToast("Тренировка прервана");
  }
}

export function quitQuiz(skipConfirm: boolean = false) {
  const doQuit = () => {
    if (quizInterval) {
      clearInterval(quizInterval);
      quizInterval = null;
    }
    if (advanceTimer) {
      clearTimeout(advanceTimer);
      advanceTimer = null;
    }
    endQuiz(true); // FIX: Ручной выход теперь считается принудительным завершением
  };

  if (skipConfirm) {
    doQuit();
    return;
  }

  isQuizPaused = true;
  openConfirm(
    "Вы уверены, что хотите прервать тренировку?",
    () => {
      doQuit();
    },
    {
      confirmText: "Прервать",
      cancelText: "Продолжить",
      onCancel: () => {
        isQuizPaused = false;
      },
    },
  );
}

export function updateQuizCount() {
  const countEl = document.getElementById("quiz-count");
  if (!countEl) return;
  const filterFn = (w: Word) => {
    if (w.type !== state.currentType) return false;
    const wTopic = w.topic || w.topic_ru || w.topic_kr;
    const matchTopic = quizTopic === "all" || wTopic === quizTopic;
    const wCat = w.category || w.category_ru || w.category_kr;
    const matchCat = quizCategory === "all" || wCat === quizCategory;
    const matchStar = quizStar === "all" || w.level === quizStar;
    const matchSearch =
      !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
    return matchTopic && matchCat && matchStar && matchSearch;
  };
  const total = state.dataStore.filter(filterFn).length;
  const notLearned = state.dataStore.filter(
    (w: Word) => filterFn(w) && !state.learned.has(w.id),
  ).length;
  countEl.textContent = `Неизучено: ${notLearned} / Всего: ${total} (по фильтру)`;
  updateQuizModesAvailability();
  updateResetButton();
}

function updateQuizModesAvailability() {
  const selector = document.getElementById("quiz-mode-selector");
  if (!selector) return;
  const buttons = selector.querySelectorAll(".quiz-mode-btn");
  const filterFn = (w: Word) => {
    if (w.type !== state.currentType) return false;
    const wTopic = w.topic || w.topic_ru || w.topic_kr;
    const matchTopic = quizTopic === "all" || wTopic === quizTopic;
    const wCat = w.category || w.category_ru || w.category_kr;
    const matchCat = quizCategory === "all" || wCat === quizCategory;
    const matchStar = quizStar === "all" || w.level === quizStar;
    const matchSearch =
      !quizSearch || (w._searchStr && w._searchStr.includes(quizSearch));
    return matchTopic && matchCat && matchStar && matchSearch;
  };
  const basePool = state.dataStore.filter(filterFn);
  buttons.forEach((b) => {
    const btn = b as HTMLButtonElement;
    const mode = btn.dataset.mode;
    let count = basePool.length;
    let reason = "";
    let minWords = 1;

    if (mode === "scramble" || mode === "essay") {
      minWords = 5;
      count = basePool.filter(
        (w) => w.example_kr && w.example_kr.length > 5 && w.example_ru,
      ).length;
      if (count < minWords) reason = `Мало примеров (${count}/${minWords})`;
    } else if (mode === "dialogue") {
      minWords = 5;
      count = basePool.filter((w) => w.example_audio && w.example_kr).length;
      if (count < minWords)
        reason = `Мало аудио-диалогов (${count}/${minWords})`;
    } else if (mode === "synonyms") {
      minWords = 5;
      count = basePool.filter(
        (w) => w.synonyms && w.synonyms.trim().length > 0,
      ).length;
      if (count < minWords) reason = `Мало синонимов (${count}/${minWords})`;
    } else if (mode === "antonyms") {
      minWords = 5;
      count = basePool.filter(
        (w) => w.antonyms && w.antonyms.trim().length > 0,
      ).length;
      if (count < minWords) reason = `Мало антонимов (${count}/${minWords})`;
    } else if (mode === "confusing") {
      count = state.dataStore.length;
    } else if (mode === "association") {
      count = state.dataStore.length;
    } else {
      if (count < 1) reason = `Нет слов`;
    }
    if (count < minWords) {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.cursor = "not-allowed";
      btn.title = reason;
    } else {
      btn.disabled = false;
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
      btn.title = "";
    }
  });
}

function updateResetButton() {
  const container = document.getElementById("quiz-filters");
  if (!container) return;

  let btn = document.getElementById("quiz-reset-btn");
  const hasFilters =
    quizTopic !== "all" ||
    quizCategory !== "all" ||
    quizStar !== "all" ||
    quizSearch !== "";

  if (hasFilters) {
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "quiz-reset-btn";
      btn.className = "btn";
      btn.style.padding = "0 12px";
      btn.style.animation = "fadeIn 0.5s ease-out";
      btn.innerHTML = "↺";
      btn.title = "Сбросить фильтры";
      btn.onclick = () => {
        quizTopic = "all";
        state.quizTopic = "all";
        localStorage.setItem("quiz_topic_v1", "all");
        quizCategory = "all";
        state.quizCategory = "all";
        localStorage.setItem("quiz_category_v1", "all");
        quizStar = "all";
        state.quizDifficulty = "all";
        localStorage.setItem("quiz_difficulty_v1", "all");

        quizSearch = "";
        const sInput = document.getElementById(
          "quiz-search-input",
        ) as HTMLInputElement;
        if (sInput) sInput.value = "";

        populateQuizFilters();
        populateQuizDifficulty();
        updateQuizCount();
      };
      container.appendChild(btn);
    }
    btn.style.display = "inline-flex";
  } else {
    if (btn) btn.style.display = "none";
  }
}

function showQuizSummaryModal(correct: number, total: number, xp: number) {
  let modal = document.getElementById("quiz-summary-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "quiz-summary-modal";
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.onclick = (e) => {
      if (e.target === modal) closeModal("quiz-summary-modal");
    };
    document.body.appendChild(modal);
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  let title = "Неплохо!";
  let emoji = "🙂";
  let color = "var(--text-main)";

  if (accuracy === 100) {
    title = "Идеально!";
    emoji = "🏆";
    color = "var(--gold)";
    if (typeof window.confetti === "function") {
      window.confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 20005,
      });
    }
  } else if (accuracy >= 80) {
    title = "Отлично!";
    emoji = "🔥";
    color = "var(--success)";
  } else if (accuracy >= 50) {
    title = "Хорошо";
    emoji = "👍";
    color = "var(--primary)";
  } else {
    title = "Надо потренироваться";
    emoji = "💪";
    color = "var(--text-sub)";
  }

  modal.innerHTML = `
    <div class="modal-content modal-centered" style="text-align: center; max-width: 350px; padding: 30px 20px;">
        <div style="font-size: 64px; margin-bottom: 15px; animation: bounce 1s;">${emoji}</div>
        <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px; color: ${color};">${title}</div>
        <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 30px;">Тренировка завершена</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
            <div style="background: var(--surface-2); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 5px; font-weight: 600;">Точность</div>
                <div style="font-size: 24px; font-weight: 900; color: ${accuracy >= 80 ? "var(--success)" : "var(--text-main)"};">${accuracy}%</div>
            </div>
            <div style="background: var(--surface-2); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 5px; font-weight: 600;">XP</div>
                <div style="font-size: 24px; font-weight: 900; color: var(--gold);">+${xp}</div>
            </div>
        </div>

        <div style="font-size: 15px; color: var(--text-main); margin-bottom: 25px; background: var(--surface-2); padding: 10px; border-radius: 12px;">
            Правильных ответов: <b>${correct}</b> из <b>${total}</b>
        </div>
        
        <button class="btn btn-quiz" style="width: 100%; padding: 15px; font-size: 16px; border-radius: 16px;" onclick="window.handleQuizSummaryContinue()">Продолжить</button>
    </div>
  `;

  openModal("quiz-summary-modal");
}

function updateComboUI(streak: number | undefined) {
  const el = document.getElementById("quiz-combo");
  if (!el) return;

  if (streak && streak > 1) {
    el.style.display = "block";
    el.innerText = `🔥 ${streak}`;
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  } else {
    el.style.display = "none";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).handleQuizSummaryContinue = () => {
  closeModal("quiz-summary-modal");
  // Если это был ежедневный вызов, показываем статус (серию и награду) после закрытия сводки
  if (currentQuizMode === "daily" || currentQuizMode === "super-daily") {
    setTimeout(() => openDailyStatusModal(), 300);
  }
};

declare global {
  interface Window {
    quitQuiz: typeof quitQuiz;
  }
}
window.quitQuiz = quitQuiz;
