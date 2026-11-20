import { state } from "../core/state.ts";
import { openModal } from "./ui_modal.ts";
import { speak, playTone, cancelSpeech } from "../utils/utils.ts";
import { Word } from "../types/index.ts";
import { recordAttempt } from "../core/db.ts";
import { addXP, checkAchievements } from "../core/stats.ts";
import { BaseComponent } from "./BaseComponent.ts";

class ListeningComponent extends BaseComponent {
  private currentWord: Word | null = null;
  private isPlaying = false;
  private audioSpeed = 1.0;
  private animationId: number | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private observer: MutationObserver | null = null;

  constructor() {
    super("listening-modal");
  }

  public init() {
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("listening-modal");
      if (el) this.element = el;
    }
    super.init();
    this.setupControls();
  }

  public show() {
    openModal("listening-modal");
    this.setupObserver();
    this.loadNextRound();
  }

  public destroy() {
    super.destroy();
    this.stopPlayback();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  protected render(): void {
    // Not needed for this component structure
  }

  private setupObserver() {
    if (this.observer) this.observer.disconnect();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          if (!this.element.classList.contains("active")) {
            this.stopPlayback();
          }
        }
      }
    });
    this.observer.observe(this.element, { attributes: true, attributeFilter: ["class"] });
  }

  private setupControls() {
    const playBtn = this.element.querySelector("#listening-play-btn");
    const speedBtns = this.element.querySelectorAll("#listening-speed-control .btn-text");

    if (playBtn) {
      this.addEvent(playBtn, "click", () => {
        if (this.currentWord) this.playAudio();
      });
    }

    speedBtns.forEach((btn) => {
      this.addEvent(btn, "click", () => {
        speedBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        this.audioSpeed = parseFloat((btn as HTMLElement).dataset.speed || "1.0");
      });
    });
  }

  private loadNextRound() {
    if (!this.element.classList.contains("active")) return;

    // Фильтрация слов на основе настроек квиза
    const filterFn = (w: Word) => {
      if (w.type !== state.currentType) return false;

      const wTopic = w.topic_ru || w.topic_kr;
      const matchTopic = state.quizTopic === "all" || wTopic === state.quizTopic;

      const wCat = w.category_ru || w.category_kr;
      const matchCat = state.quizCategory === "all" || wCat === state.quizCategory;

      const matchStar = state.quizDifficulty === "all" || w.level === state.quizDifficulty;

      return matchTopic && matchCat && matchStar;
    };

    const pool = state.dataStore.filter((w) => (w.audio_url || w.audio_male) && filterFn(w));

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
    this.currentWord = pool[Math.floor(Math.random() * pool.length)];

    // Generate options
    const options = [this.currentWord];
    while (options.length < 4) {
      const r = pool[Math.floor(Math.random() * pool.length)];
      if (!options.find((o) => o.id === r.id)) options.push(r);
    }
    options.sort(() => Math.random() - 0.5);

    this.renderUI(options);
    setTimeout(() => this.playAudio(), 500);
  }

  private renderUI(options: Word[]) {
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
      btn.onclick = () => this.checkAnswer(opt);
      container.appendChild(btn);
    });
  }

  private async playAudio() {
    if (!this.element.classList.contains("active")) return;
    if (!this.currentWord || this.isPlaying) return;

    const btn = document.getElementById("listening-play-btn");
    if (btn) {
      btn.textContent = "⏸️";
      btn.classList.add("playing");
    }

    this.isPlaying = true;
    this.startVisualizer();

    const url =
      state.currentVoice === "male" && this.currentWord.audio_male
        ? this.currentWord.audio_male
        : this.currentWord.audio_url;

    try {
      if (url) {
        if (this.currentAudio) {
          this.currentAudio.pause();
          this.currentAudio = null;
        }
        const audio = new Audio(url);
        this.currentAudio = audio;
        audio.playbackRate = this.audioSpeed;
        await audio.play();
        await new Promise((r) => {
          audio.onended = r;
          audio.onerror = r;
        });
        this.currentAudio = null;
      } else {
        await speak(this.currentWord.word_kr, null);
      }
    } catch (e) {
      console.error("Audio play error", e);
    } finally {
      // Проверяем, активно ли окно, прежде чем обновлять UI
      if (this.element.classList.contains("active")) {
        this.isPlaying = false;
        this.stopVisualizer();
        if (btn) {
          btn.textContent = "▶️";
          btn.classList.remove("playing");
        }
      } else {
        // Если окно закрыто, просто сбрасываем состояние
        this.isPlaying = false;
        this.stopVisualizer();
      }
    }
  }

  private checkAnswer(selected: Word) {
    if (!this.currentWord) return;

    const isCorrect = selected.id === this.currentWord.id;
    const status = document.getElementById("listening-status");
    const btns = document.querySelectorAll("#listening-options .quiz-option");

    btns.forEach((b) => ((b as HTMLButtonElement).disabled = true));

    if (isCorrect) {
      playTone("success");
      if (status) {
        status.textContent = `Верно! ${this.currentWord.word_kr}`;
        status.style.color = "var(--success)";
      }
      recordAttempt(this.currentWord.id, true);
      addXP(10);
      checkAchievements();

      setTimeout(() => this.loadNextRound(), 1500);
    } else {
      playTone("failure");
      if (status) {
        status.textContent = `Ошибка. Это было: ${this.currentWord.word_kr}`;
        status.style.color = "var(--danger)";
      }
      recordAttempt(this.currentWord.id, false);

      setTimeout(() => this.loadNextRound(), 2500);
    }
  }

  private startVisualizer() {
    const canvas = document.getElementById("listening-visualizer") as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const bars = 30;

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--primary");

      for (let i = 0; i < bars; i++) {
        const height = Math.random() * h * 0.8;
        const x = i * (w / bars);
        const y = (h - height) / 2;
        ctx.fillRect(x + 2, y, w / bars - 4, height);
      }

      if (this.isPlaying) {
        this.animationId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    draw();
  }

  private stopVisualizer() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    const canvas = document.getElementById("listening-visualizer") as HTMLCanvasElement;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  private stopPlayback() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    cancelSpeech(); // Останавливаем TTS
    this.isPlaying = false;
    this.stopVisualizer();

    const btn = document.getElementById("listening-play-btn");
    if (btn) {
      btn.textContent = "▶️";
      btn.classList.remove("playing");
    }
  }
}

const listeningView = new ListeningComponent();

export function initListeningUI() {
  listeningView.init();
}

export function openListeningModal() {
  listeningView.show();
}
