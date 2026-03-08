import { state } from "../core/state.ts";
import { openModal } from "./ui_modal.ts";
import { speak, playTone, cancelSpeech } from "../utils/utils.ts";
import { Word } from "../types/index.ts";
import { recordAttempt } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";

let currentWord: Word | null = null;
let isPlaying = false;
let audioSpeed = 1.0;
let animationId: number | null = null;
let currentAudio: HTMLAudioElement | null = null;
let observer: MutationObserver | null = null;

export function openListeningModal() {
  const modal = document.getElementById("listening-modal");
  if (modal) {
    openModal("listening-modal");
    setupListeningControls();
    loadNextRound();

    // Настраиваем наблюдатель для остановки аудио при закрытии окна
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          if (!modal.classList.contains("active")) {
            stopPlayback();
          }
        }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }
}

function setupListeningControls() {
  const playBtn = document.getElementById("listening-play-btn");
  const speedBtns = document.querySelectorAll(
    "#listening-speed-control .btn-text",
  );

  if (playBtn) {
    playBtn.onclick = () => {
      if (currentWord) playAudio();
    };
  }

  speedBtns.forEach((btn) => {
    (btn as HTMLElement).onclick = () => {
      speedBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      audioSpeed = parseFloat((btn as HTMLElement).dataset.speed || "1.0");
    };
  });
}

function loadNextRound() {
  const modal = document.getElementById("listening-modal");
  if (!modal || !modal.classList.contains("active")) return;

  // Фильтрация слов на основе настроек квиза
  const filterFn = (w: Word) => {
    if (w.type !== state.currentType) return false;

    const wTopic = w.topic_ru || w.topic_kr;
    const matchTopic = state.quizTopic === "all" || wTopic === state.quizTopic;

    const wCat = w.category_ru || w.category_kr;
    const matchCat =
      state.quizCategory === "all" || wCat === state.quizCategory;

    const matchStar =
      state.quizDifficulty === "all" || w.level === state.quizDifficulty;

    return matchTopic && matchCat && matchStar;
  };

  const pool = state.dataStore.filter(
    (w) => (w.audio_url || w.audio_male) && filterFn(w),
  );

  if (pool.length < 4) {
    const container = document.getElementById("listening-options");
    const status = document.getElementById("listening-status");
    if (status) {
      status.textContent = "Недостаточно слов в фильтре (нужно 4+)";
      status.style.color = "var(--danger)";
    }
    if (container) container.innerHTML = "";
    return;
  }

  // Pick a random word
  currentWord = pool[Math.floor(Math.random() * pool.length)];

  // Generate options
  const options = [currentWord];
  while (options.length < 4) {
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!options.find((o) => o.id === r.id)) options.push(r);
  }
  options.sort(() => Math.random() - 0.5);

  renderUI(options);
  setTimeout(() => playAudio(), 500);
}

function renderUI(options: Word[]) {
  const container = document.getElementById("listening-options");
  const status = document.getElementById("listening-status");
  if (!container || !status) return;

  status.textContent = "Прослушайте и выберите перевод";
  status.style.color = "var(--text-sub)";

  container.innerHTML = "";
  options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "quiz-option";
    btn.textContent = opt.translation;
    btn.onclick = () => checkAnswer(opt);
    container.appendChild(btn);
  });
}

async function playAudio() {
  const modal = document.getElementById("listening-modal");
  if (!modal || !modal.classList.contains("active")) return;

  if (!currentWord || isPlaying) return;

  const btn = document.getElementById("listening-play-btn");
  if (btn) {
    btn.textContent = "⏸️";
    btn.classList.add("playing");
  }

  isPlaying = true;
  startVisualizer();

  const url =
    state.currentVoice === "male" && currentWord.audio_male
      ? currentWord.audio_male
      : currentWord.audio_url;

  try {
    if (url) {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      const audio = new Audio(url);
      currentAudio = audio;
      audio.playbackRate = audioSpeed;
      await audio.play();
      await new Promise((r) => {
        audio.onended = r;
        audio.onerror = r;
      });
      currentAudio = null;
    } else {
      await speak(currentWord.word_kr, null);
    }
  } catch (e) {
    console.error("Audio play error", e);
  } finally {
    // Проверяем, активно ли окно, прежде чем обновлять UI
    if (
      document.getElementById("listening-modal")?.classList.contains("active")
    ) {
      isPlaying = false;
      stopVisualizer();
      if (btn) {
        btn.textContent = "▶️";
        btn.classList.remove("playing");
      }
    } else {
      // Если окно закрыто, просто сбрасываем состояние
      isPlaying = false;
      stopVisualizer();
    }
  }
}

function checkAnswer(selected: Word) {
  if (!currentWord) return;

  const isCorrect = selected.id === currentWord.id;
  const status = document.getElementById("listening-status");
  const btns = document.querySelectorAll("#listening-options .quiz-option");

  btns.forEach((b) => ((b as HTMLButtonElement).disabled = true));

  if (isCorrect) {
    playTone("success");
    if (status) {
      status.textContent = `Верно! ${currentWord.word_kr}`;
      status.style.color = "var(--success)";
    }
    recordAttempt(currentWord.id, true);
    addXP(10);
    checkAchievements();

    setTimeout(loadNextRound, 1500);
  } else {
    playTone("failure");
    if (status) {
      status.textContent = `Ошибка. Это было: ${currentWord.word_kr}`;
      status.style.color = "var(--danger)";
    }
    recordAttempt(currentWord.id, false);

    setTimeout(loadNextRound, 2500);
  }
}

function startVisualizer() {
  const canvas = document.getElementById(
    "listening-visualizer",
  ) as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  const bars = 30;

  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue(
      "--primary",
    );

    for (let i = 0; i < bars; i++) {
      const height = Math.random() * h * 0.8;
      const x = i * (w / bars);
      const y = (h - height) / 2;
      ctx.fillRect(x + 2, y, w / bars - 4, height);
    }

    if (isPlaying) {
      animationId = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, w, h);
    }
  };
  draw();
}

function stopVisualizer() {
  if (animationId) cancelAnimationFrame(animationId);
  const canvas = document.getElementById(
    "listening-visualizer",
  ) as HTMLCanvasElement;
  const ctx = canvas?.getContext("2d");
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function stopPlayback() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  cancelSpeech(); // Останавливаем TTS
  isPlaying = false;
  stopVisualizer();

  const btn = document.getElementById("listening-play-btn");
  if (btn) {
    btn.textContent = "▶️";
    btn.classList.remove("playing");
  }
}
