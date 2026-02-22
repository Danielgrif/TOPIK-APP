/* eslint-disable no-console */
import { state } from "../core/state.ts";
import { showToast } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { scheduleSaveState } from "../core/db.ts";
import { openConfirm } from "./ui_modal.ts";
import { LS_KEYS } from "../core/constants.ts";

const THEME_PALETTES: Record<
  string,
  {
    main: string;
    hover: string;
    light: string;
    accent: string;
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    textMain: string;
    textSub: string;
    textTertiary: string;
  }
> = {
  purple: {
    main: "#7c3aed",
    hover: "#6d28d9",
    light: "rgba(124, 58, 237, 0.15)",
    accent: "#a78bfa",
    bg: "#f5f3ff",
    surface: "#ffffff",
    surface2: "#ede9fe",
    border: "#ddd6fe",
    textMain: "#2e1065",
    textSub: "#5b21b6",
    textTertiary: "#7c3aed",
  },
  blue: {
    main: "#2563eb",
    hover: "#1d4ed8",
    light: "rgba(37, 99, 235, 0.15)",
    accent: "#60a5fa",
    bg: "linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)",
    surface: "rgba(255, 255, 255, 0.8)",
    surface2: "rgba(239, 246, 255, 0.7)",
    border: "#bfdbfe",
    textMain: "#172554",
    textSub: "#1e40af",
    textTertiary: "#2563eb",
  },
  green: {
    main: "#059669",
    hover: "#047857",
    light: "rgba(5, 150, 105, 0.15)",
    accent: "#34d399",
    bg: "linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",
    surface: "rgba(255, 255, 255, 0.8)",
    surface2: "rgba(240, 253, 244, 0.7)",
    border: "#bbf7d0",
    textMain: "#022c22",
    textSub: "#047857",
    textTertiary: "#059669",
  },
  orange: {
    main: "#ea580c",
    hover: "#c2410c",
    light: "rgba(234, 88, 12, 0.15)",
    accent: "#fb923c",
    bg: "linear-gradient(180deg, #fffbeb 0%, #fff7ed 100%)",
    surface: "rgba(255, 255, 255, 0.8)",
    surface2: "rgba(255, 247, 237, 0.7)",
    border: "#fed7aa",
    textMain: "#431407",
    textSub: "#c2410c",
    textTertiary: "#ea580c",
  },
  pink: {
    main: "#db2777",
    hover: "#be185d",
    light: "rgba(219, 39, 119, 0.15)",
    accent: "#f472b6",
    bg: "linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)",
    surface: "rgba(255, 255, 255, 0.8)",
    surface2: "rgba(252, 231, 243, 0.7)",
    border: "#fbcfe8",
    textMain: "#500724",
    textSub: "#be185d",
    textTertiary: "#db2777",
  },
};

const THEME_PALETTES_DARK: Record<
  string,
  {
    main: string;
    hover: string;
    light: string;
    accent: string;
    bg: string;
    surface: string;
    surface2: string;
    border: string;
    textMain: string;
    textSub: string;
    textTertiary: string;
  }
> = {
  purple: {
    main: "#a78bfa",
    hover: "#8b5cf6",
    light: "rgba(167, 139, 250, 0.15)",
    accent: "#c4b5fd",
    bg: "#1e1b4b",
    surface: "#28235e",
    surface2: "#312e6f",
    border: "#3730a3",
    textMain: "#ede9fe",
    textSub: "#a78bfa",
    textTertiary: "#8b5cf6",
  },
  blue: {
    main: "#60a5fa",
    hover: "#3b82f6",
    light: "rgba(96, 165, 250, 0.15)",
    accent: "#93c5fd",
    bg: "linear-gradient(180deg, #0c2a4d 0%, #172554 100%)",
    surface: "rgba(30, 58, 138, 0.7)",
    surface2: "rgba(30, 64, 175, 0.6)",
    border: "#2563eb",
    textMain: "#dbeafe",
    textSub: "#60a5fa",
    textTertiary: "#3b82f6",
  },
  green: {
    main: "#34d399",
    hover: "#10b981",
    light: "rgba(52, 211, 153, 0.15)",
    accent: "#6ee7b7",
    bg: "linear-gradient(180deg, #042f2e 0%, #064e3b 100%)",
    surface: "rgba(4, 78, 57, 0.7)",
    surface2: "rgba(5, 117, 87, 0.6)",
    border: "#059669",
    textMain: "#d1fae5",
    textSub: "#34d399",
    textTertiary: "#10b981",
  },
  orange: {
    main: "#fb923c",
    hover: "#f97316",
    light: "rgba(251, 146, 60, 0.15)",
    accent: "#fdba74",
    bg: "linear-gradient(180deg, #431407 0%, #7c2d12 100%)",
    surface: "rgba(124, 45, 18, 0.7)",
    surface2: "rgba(154, 52, 18, 0.6)",
    border: "#c2410c",
    textMain: "#ffedd5",
    textSub: "#fb923c",
    textTertiary: "#f97316",
  },
  pink: {
    main: "#f472b6",
    hover: "#ec4899",
    light: "rgba(244, 114, 182, 0.15)",
    accent: "#f9a8d4",
    bg: "linear-gradient(180deg, #581c87 0%, #701a75 100%)",
    surface: "rgba(134, 25, 143, 0.7)",
    surface2: "rgba(157, 23, 77, 0.6)",
    border: "#be185d",
    textMain: "#fce7f3",
    textSub: "#f472b6",
    textTertiary: "#ec4899",
  },
};

function updateSettingsTimestamp() {
  state.settingsUpdatedAt = Date.now();
  localStorage.setItem("settings_updated_at", String(state.settingsUpdatedAt));
}

/**
 * Toggles Hanja display mode.
 * @param {HTMLInputElement} el - The checkbox element.
 */
export function toggleHanjaMode(el: HTMLInputElement) {
  state.hanjaMode = el.checked;
  localStorage.setItem(LS_KEYS.HANJA_MODE, String(state.hanjaMode));
  render();
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Toggles the TTS voice between male and female.
 */
export function toggleVoice() {
  state.currentVoice = state.currentVoice === "female" ? "male" : "female";
  localStorage.setItem(LS_KEYS.VOICE_PREF, state.currentVoice);
  updateVoiceUI();
  showToast(
    `Голос: ${state.currentVoice === "female" ? "Женский" : "Мужской"}`,
  );
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Updates the voice selection button UI.
 */
export function updateVoiceUI() {
  const btn = document.getElementById("voice-setting-btn");
  if (btn)
    btn.textContent =
      state.currentVoice === "female" ? "👩 Женский" : "👨 Мужской";
}

/**
 * Sets the audio playback speed.
 * @param {string|number} val
 */
export function setAudioSpeed(val: string | number) {
  state.audioSpeed = typeof val === "string" ? parseFloat(val) : val;
  localStorage.setItem(LS_KEYS.AUDIO_SPEED, String(state.audioSpeed));
  const el = document.getElementById("speed-val");
  if (el) el.textContent = state.audioSpeed + "x";
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Sets the TTS volume.
 * @param {string|number} val
 */
export function setTtsVolume(val: string | number) {
  state.ttsVolume = typeof val === "string" ? parseFloat(val) : val;
  localStorage.setItem(LS_KEYS.TTS_VOLUME, String(state.ttsVolume));
  const el = document.getElementById("tts-volume-val");
  if (el) el.textContent = `${Math.round(state.ttsVolume * 100)}%`;
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Toggles auto theme mode based on time.
 * @param {HTMLInputElement} el
 */
export function toggleAutoTheme(el: HTMLInputElement) {
  state.autoTheme = el.checked;
  localStorage.setItem(LS_KEYS.AUTO_THEME, String(state.autoTheme));
  if (state.autoTheme) {
    checkAutoTheme();
  }
  showToast(`Авто-тема: ${state.autoTheme ? "ВКЛ" : "ВЫКЛ"}`);
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function checkAutoTheme() {
  if (!state.autoTheme) return;
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6; // Ночь с 20:00 до 06:00

  if (state.darkMode !== isNight) {
    state.darkMode = isNight;
    localStorage.setItem(LS_KEYS.DARK_MODE, String(state.darkMode));
    applyTheme();

    // Обновляем чекбокс в настройках, если он есть в DOM
    const checkbox = document.querySelector(
      'input[onchange*="toggleDarkMode"]',
    ) as HTMLInputElement;
    if (checkbox) checkbox.checked = state.darkMode;
  }
}

/**
 * Toggles dark mode on and off.
 * @param {HTMLInputElement} [el] - The checkbox element.
 */
export function toggleDarkMode(el?: HTMLInputElement) {
  state.darkMode = el && el.type === "checkbox" ? el.checked : !state.darkMode;
  localStorage.setItem(LS_KEYS.DARK_MODE, String(state.darkMode));
  applyTheme();

  // Синхронизируем чекбокс, если переключение вызвано не им (например, кнопкой в хедере)
  if (!el || el.type !== "checkbox") {
    const checkbox = document.querySelector(
      'input[onchange*="toggleDarkMode"]',
    ) as HTMLInputElement;
    if (checkbox) checkbox.checked = state.darkMode;
  }

  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Toggles the auto-update setting for the PWA.
 * @param {HTMLInputElement} el
 */
export function toggleAutoUpdate(el: HTMLInputElement) {
  state.autoUpdate = el.checked;
  localStorage.setItem(LS_KEYS.AUTO_UPDATE, String(state.autoUpdate));
  showToast(`Автообновление: ${state.autoUpdate ? "ВКЛ" : "ВЫКЛ"}`);
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Applies the current theme (dark/light) and accent color to the UI.
 */
export function applyTheme() {
  const root = document.documentElement.style;

  if (state.darkMode) {
    document.body.classList.add("dark-mode");

    // Цвета для темной темы (Пастельные/Светлые для контраста)
    root.setProperty("--section-info-border", "#74b9ff");
    root.setProperty("--section-relation-border", "#fab1a0");
    root.setProperty("--section-extra-border", "#55efc4");

    // Фон: низкая прозрачность, чтобы не конфликтовать с насыщенными фонами темных тем
    root.setProperty("--section-info-bg", "rgba(116, 185, 255, 0.1)");
    root.setProperty("--section-relation-bg", "rgba(250, 177, 160, 0.1)");
    root.setProperty("--section-extra-bg", "rgba(85, 239, 196, 0.1)");
  } else {
    document.body.classList.remove("dark-mode");

    // Цвета для светлой темы (Чуть темнее для четкости на белом)
    root.setProperty("--section-info-border", "#0984e3");
    root.setProperty("--section-relation-border", "#e17055");
    root.setProperty("--section-extra-border", "#00b894");

    // Фон: очень легкий оттенок
    root.setProperty("--section-info-bg", "rgba(9, 132, 227, 0.06)");
    root.setProperty("--section-relation-bg", "rgba(225, 112, 85, 0.06)");
    root.setProperty("--section-extra-bg", "rgba(0, 184, 148, 0.06)");
  }

  const icon = state.darkMode ? "🌙" : "☀️";

  const headerBtn = document.getElementById("header-dark-mode-toggle");
  if (headerBtn) {
    headerBtn.textContent = icon;
    headerBtn.classList.remove("rotate-icon");
    void headerBtn.offsetWidth; // Force reflow to restart animation
    headerBtn.classList.add("rotate-icon");
  }

  applyAccentColor();
}

/**
 * Sets the primary accent color for the theme.
 * @param {string} colorKey
 */
export function setAccentColor(colorKey: string) {
  if (!Object.keys(THEME_PALETTES).includes(colorKey)) return;

  // Проверка прав на тему
  if (colorKey !== "purple") {
    const shopId = `theme_${colorKey}`;
    if (!state.purchasedItems.includes(shopId)) {
      showToast("Эта тема доступна в магазине");
      return;
    }
  }

  state.themeColor = colorKey;
  localStorage.setItem(LS_KEYS.THEME_COLOR, state.themeColor);
  applyAccentColor();
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Applies the current accent color to the root element.
 */
export function applyAccentColor() {
  const colorKey = state.themeColor || "purple";
  let palette = THEME_PALETTES[colorKey] || THEME_PALETTES.purple;

  if (state.darkMode) {
    palette = THEME_PALETTES_DARK[colorKey] || THEME_PALETTES_DARK.purple;
  }

  // Use documentElement to apply background gradients to the whole page
  const target = document.documentElement.style;

  target.setProperty("--primary", palette.main);
  target.setProperty("--primary-hover", palette.hover);
  target.setProperty("--primary-light", palette.light);
  target.setProperty("--accent", palette.accent);
  target.setProperty("--bg", palette.bg);
  target.setProperty("--surface-1", palette.surface);
  target.setProperty("--surface-2", palette.surface2);
  target.setProperty("--surface-3", palette.border);
  target.setProperty("--border-color", palette.border);
  target.setProperty("--input-bg", palette.surface2);
  target.setProperty("--text-main", palette.textMain);
  target.setProperty("--text-sub", palette.textSub);
  target.setProperty("--text-tertiary", palette.textTertiary);

  // Update active state in UI if selector exists
  document
    .querySelectorAll(".color-option, .stats-color-btn")
    .forEach((btn) => {
      if (btn instanceof HTMLElement)
        btn.classList.toggle(
          "active",
          btn.getAttribute("data-value") === state.themeColor,
        );
    });
}

/**
 * Temporarily applies an accent color for preview.
 * @param {string} colorKey
 */
export function previewAccentColor(colorKey: string) {
  let palette = THEME_PALETTES[colorKey] || THEME_PALETTES.purple;

  if (state.darkMode) {
    palette = THEME_PALETTES_DARK[colorKey] || THEME_PALETTES_DARK.purple;
  }

  const target = document.documentElement.style;

  target.setProperty("--primary", palette.main);
  target.setProperty("--primary-hover", palette.hover);
  target.setProperty("--primary-light", palette.light);
  target.setProperty("--accent", palette.accent);
  target.setProperty("--bg", palette.bg);
  target.setProperty("--surface-1", palette.surface);
  target.setProperty("--surface-2", palette.surface2);
  target.setProperty("--surface-3", palette.border);
  target.setProperty("--border-color", palette.border);
  target.setProperty("--input-bg", palette.surface2);
  target.setProperty("--text-main", palette.textMain);
  target.setProperty("--text-sub", palette.textSub);
  target.setProperty("--text-tertiary", palette.textTertiary);
}

/**
 * Updates the theme picker UI to lock unpurchased themes.
 */
export function updateThemePickerUI() {
  const buttons = document.querySelectorAll(".color-option, .stats-color-btn");
  buttons.forEach((btn) => {
    const el = btn as HTMLElement;
    const color = el.getAttribute("data-value");
    if (!color) return;

    const isDefault = color === "purple";
    const shopId = `theme_${color}`;
    const isPurchased = state.purchasedItems.includes(shopId);

    if (isDefault || isPurchased) {
      el.classList.remove("locked");
      el.style.pointerEvents = "";
      el.style.opacity = "";
      el.style.filter = "";
      const lock = el.querySelector(".lock-icon");
      if (lock) lock.remove();
    } else {
      el.classList.add("locked");
      el.style.pointerEvents = "auto"; // Разрешаем клики для кнопки покупки
      el.style.opacity = "0.6";
      el.style.filter = "grayscale(0.8)";

      // Добавляем кнопку "Купить", если ее еще нет
      if (!el.querySelector(".buy-theme-btn")) {
        const buyBtn = document.createElement("button");
        buyBtn.className = "buy-theme-btn";
        buyBtn.innerHTML = "💰";
        buyBtn.title = "Купить в магазине";
        buyBtn.onclick = (e) => {
          e.stopPropagation();
          import("./ui_shop.ts").then((shop) => {
            shop.openShopModal();
            setTimeout(() => shop.switchShopTab("theme"), 100);
          });
        };
        el.appendChild(buyBtn);
      }
    }
  });
}

/**
 * Toggles focus mode.
 */
export function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  applyFocusMode();
  showToast(`Режим фокусировки: ${state.focusMode ? "ВКЛ" : "ВЫКЛ"}`);
  applyBackgroundMusic();
  updateSettingsTimestamp();

  // Перерисовываем сетку, чтобы применить новую высоту карточек
  if (state.viewMode !== "list") {
    const grid = document.getElementById("vocabulary-grid");
    const oldScroll = grid ? grid.scrollTop : 0;
    const oldHeight = state.focusMode
      ? 400
      : Math.floor(window.innerHeight * 0.75);

    render();

    if (grid && oldScroll > 0) {
      const newHeight = state.focusMode
        ? Math.floor(window.innerHeight * 0.75)
        : 400;
      // Корректируем скролл пропорционально изменению высоты
      grid.scrollTop = oldScroll * (newHeight / oldHeight);
    }
  }
}

/**
 * Applies focus mode styles to the UI.
 */
export function applyFocusMode() {
  if (state.focusMode) {
    document.body.classList.add("focus-mode");
    document.documentElement.classList.add("focus-mode");
  } else {
    document.body.classList.remove("focus-mode");
    document.documentElement.classList.remove("focus-mode");
  }
  const mainBtn = document.getElementById("focus-mode-btn");
  if (mainBtn) mainBtn.classList.toggle("active", state.focusMode);
}

/**
 * Toggles background music on/off.
 * @param {HTMLInputElement} [el] - The checkbox element.
 */
export function toggleBackgroundMusic(el?: HTMLInputElement) {
  state.backgroundMusicEnabled = el
    ? el.checked
    : !state.backgroundMusicEnabled;
  localStorage.setItem(
    LS_KEYS.MUSIC_ENABLED,
    String(state.backgroundMusicEnabled),
  );
  applyBackgroundMusic();
  showToast(`Музыка: ${state.backgroundMusicEnabled ? "ВКЛ" : "ВЫКЛ"}`);
  updateSettingsTimestamp();
  scheduleSaveState();
}

let activePlayerId = "a";
let hasInteracted = false;
/** @type {ReturnType<typeof setInterval>|null} */
let volumeAnimationInterval: ReturnType<typeof setInterval> | null = null; // Единый интервал для всех анимаций громкости
let currentFadeOutPlayer: HTMLAudioElement | null = null; // Ссылка на плеер, который затухает

/**
 * Applies the background music setting (plays/pauses).
 * @param {boolean} [forcePlay=false] - If true, forces play regardless of state.backgroundMusicEnabled.
 */
export function applyBackgroundMusic(forcePlay: boolean = false) {
  const playerA = document.getElementById(
    "music-player-a",
  ) as HTMLAudioElement | null;
  const playerB = document.getElementById(
    "music-player-b",
  ) as HTMLAudioElement | null;
  if (!playerA || !playerB) return;

  const activePlayer = activePlayerId === "a" ? playerA : playerB;
  const inactivePlayer = activePlayerId === "a" ? playerB : playerA;

  // Плавное включение громкости при первом взаимодействии
  if (!hasInteracted && state.backgroundMusicEnabled && forcePlay) {
    hasInteracted = true; // Флаг, чтобы это сработало только один раз
    if (activePlayer.volume < state.backgroundMusicVolume) {
      crossfade(
        activePlayer,
        null,
        state.backgroundMusicVolume,
        activePlayer.volume,
      );
    }
  }

  // Определяем, какой трек должен играть
  let trackId = "default";
  const quizGame = document.getElementById("quiz-game");
  const isQuizActive = quizGame && quizGame.style.display !== "none";

  if (isQuizActive) {
    trackId = "quiz";
  } else if (state.focusMode) {
    trackId = "zen";
  }

  const targetTrack = state.MUSIC_TRACKS.find((t) => t.id === trackId);
  if (!targetTrack)
    return console.warn(`Музыкальный трек для ID "${trackId}" не найден.`);
  const targetTrackFilename = targetTrack.filename;

  // FIX: Используем относительный путь для совместимости с разными окружениями
  const targetSrc = `./audio/${encodeURIComponent(targetTrackFilename)}`;

  // Если музыка выключена, просто останавливаем оба плеера
  if (!state.backgroundMusicEnabled) {
    crossfade(activePlayer, inactivePlayer, 0, 0); // Fade out both
    return;
  }

  // Если трек не меняется, просто убеждаемся, что он играет
  // FIX: Декодируем src, так как браузер кодирует пробелы (%20), а в имени файла их нет
  if (
    decodeURIComponent(activePlayer.src).includes(targetTrackFilename) &&
    !activePlayer.paused
  ) {
    activePlayer.volume = state.backgroundMusicVolume; // Обновляем громкость на всякий случай
    return;
  }

  // Если трек меняется, запускаем кроссфейд
  if (!decodeURIComponent(activePlayer.src).includes(targetTrackFilename)) {
    inactivePlayer.src = targetSrc;
    inactivePlayer.volume = 0; // Начинаем с нулевой громкости
    inactivePlayer
      .play()
      .then(() => {
        crossfade(inactivePlayer, activePlayer, state.backgroundMusicVolume, 0);
        // Меняем активный плеер
        activePlayerId = activePlayerId === "a" ? "b" : "a";
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          console.warn("Music play failed:", e);
          showToast(`Ошибка аудио: ${e.message}`); // Показываем ошибку пользователю

          // Fallback: Пробуем найти любой другой рабочий трек, если текущий не грузится
          const fallbackTrack =
            state.MUSIC_TRACKS.find(
              (t) => t.id !== trackId && t.id === "default",
            ) || state.MUSIC_TRACKS[0];
          if (fallbackTrack && fallbackTrack.id !== trackId) {
            console.log("Attempting fallback track:", fallbackTrack.name);
            inactivePlayer.src = `./audio/${encodeURIComponent(fallbackTrack.filename)}`;
            inactivePlayer
              .play()
              .then(() => {
                crossfade(
                  inactivePlayer,
                  activePlayer,
                  state.backgroundMusicVolume,
                  0,
                );
                activePlayerId = activePlayerId === "a" ? "b" : "a";
              })
              .catch((err) => console.warn("Fallback failed:", err));
          }
        }
      });
  } else {
    // Если трек тот же, но был на паузе
    // Плавное появление (Fade In) если трек был на паузе
    if (activePlayer.paused) {
      activePlayer.volume = 0;
      activePlayer
        .play()
        .then(() => {
          crossfade(activePlayer, null, state.backgroundMusicVolume, 0);
        })
        .catch((e) => {
          if (e.name !== "AbortError") console.warn("Music play failed:", e);
        });
    } else {
      activePlayer.volume = state.backgroundMusicVolume;
    }
  }
}

// Listen for ducking events from utils.ts
document.addEventListener("duck-music", (e: Event) => {
  const detail = (e as CustomEvent).detail;
  duckBackgroundMusic(detail.duck);
});

/**
 * Temporarily lowers volume for TTS.
 */
export function duckBackgroundMusic(duck: boolean) {
  if (!state.backgroundMusicEnabled) return;
  const player = document.getElementById(
    activePlayerId === "a" ? "music-player-a" : "music-player-b",
  ) as HTMLAudioElement;
  if (player) {
    const target = duck
      ? state.backgroundMusicVolume * 0.2
      : state.backgroundMusicVolume;
    player.volume = target;
  }
}

/**
 * @param {HTMLAudioElement} fadeInPlayer
 * @param {HTMLAudioElement|null} fadeOutPlayer
 * @param {number} finalVolume
 * @param {number} [startVolume] - Optional starting volume for the fadeInPlayer.
 */
export function crossfade(
  fadeInPlayer: HTMLAudioElement,
  fadeOutPlayer: HTMLAudioElement | null,
  finalVolume: number,
  startVolume?: number,
) {
  if (volumeAnimationInterval) {
    clearInterval(volumeAnimationInterval);
  }
  // Если предыдущий кроссфейд был прерван, убедимся, что уходящий плеер остановлен
  if (currentFadeOutPlayer) {
    currentFadeOutPlayer.volume = 0;
    currentFadeOutPlayer.pause();
    currentFadeOutPlayer = null;
  }

  let stepCount = 0;
  const totalSteps = 20;
  const initialFadeInVol =
    startVolume !== undefined ? startVolume : fadeInPlayer.volume;
  const initialFadeOutVol = fadeOutPlayer ? fadeOutPlayer.volume : 0;
  currentFadeOutPlayer = fadeOutPlayer;

  volumeAnimationInterval = setInterval(() => {
    stepCount++;
    const progress = stepCount / totalSteps;

    // Рассчитываем текущую громкость на основе прогресса (линейная интерполяция)
    fadeInPlayer.volume =
      initialFadeInVol + (finalVolume - initialFadeInVol) * progress;
    if (fadeOutPlayer) {
      // Цель для fadeOut всегда 0
      fadeOutPlayer.volume =
        initialFadeOutVol + (0 - initialFadeOutVol) * progress;
    }

    if (stepCount >= totalSteps) {
      fadeInPlayer.volume = finalVolume; // Устанавливаем точное конечное значение
      if (fadeOutPlayer) {
        fadeOutPlayer.volume = 0;
        fadeOutPlayer.pause();
      }
      if (volumeAnimationInterval) clearInterval(volumeAnimationInterval);
      volumeAnimationInterval = null;
      currentFadeOutPlayer = null;
    }
  }, 50); // 50ms * 20 steps = 1 second duration
}

/**
 * @param {string|number} val
 */
export function setBackgroundMusicVolume(val: string | number) {
  state.backgroundMusicVolume = typeof val === "string" ? parseFloat(val) : val;
  localStorage.setItem(
    LS_KEYS.MUSIC_VOLUME,
    String(state.backgroundMusicVolume),
  );
  const el = document.getElementById("background-music-volume-val");
  if (el) el.textContent = `${Math.round(state.backgroundMusicVolume * 100)}%`;
  // FIX: Передаем true, чтобы музыка включилась, если была выключена, но громкость меняют
  applyBackgroundMusic(true);
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function resetAllSettings() {
  openConfirm("Сбросить все настройки к значениям по умолчанию?", () => {
    const settingsKeys = [
      LS_KEYS.HANJA_MODE,
      LS_KEYS.VOICE_PREF,
      LS_KEYS.AUDIO_SPEED,
      LS_KEYS.DARK_MODE,
      LS_KEYS.AUTO_UPDATE,
      LS_KEYS.AUTO_THEME,
      LS_KEYS.THEME_COLOR,
      LS_KEYS.MUSIC_ENABLED,
      LS_KEYS.MUSIC_VOLUME,
      "focus_mode_v1", // Not in LS_KEYS, seems intentional
      LS_KEYS.ZEN_MODE,
      LS_KEYS.VIEW_MODE,
      LS_KEYS.STUDY_GOAL,
      LS_KEYS.QUIZ_DIFFICULTY,
      LS_KEYS.QUIZ_TOPIC,
      LS_KEYS.QUIZ_CATEGORY,
    ];

    settingsKeys.forEach((key) => localStorage.removeItem(key));

    // Reset state object to defaults
    Object.assign(state, {
      hanjaMode: false,
      currentVoice: "female",
      audioSpeed: 0.9,
      darkMode: false,
      autoUpdate: true,
      autoTheme: false,
      themeColor: "purple",
      backgroundMusicEnabled: false,
      backgroundMusicVolume: 0.3,
      focusMode: false,
      viewMode: "grid",
      settingsUpdatedAt: Date.now(),
    });

    scheduleSaveState(50);

    showToast("⚙️ Настройки сброшены. Перезагрузка...");
    setTimeout(() => location.reload(), 800);
  });
}

export function setTrashRetention(days: string | number) {
  const retentionDays = Number(days);
  if (![7, 30, 90, 365].includes(retentionDays)) return;

  state.trashRetentionDays = retentionDays;

  updateTrashRetentionUI();

  showToast(
    `Срок хранения в корзине: ${retentionDays === 365 ? "1 год" : `${retentionDays} дн.`}`,
  );
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function updateTrashRetentionUI() {
  const container = document.getElementById("trash-retention-options");
  if (container) {
    container.querySelectorAll(".segment-btn").forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.getAttribute("data-value") === String(state.trashRetentionDays),
      );
    });
  }
}

export function resetOnboarding() {
  localStorage.removeItem(LS_KEYS.ONBOARDING);
  showToast("🎓 Обучение сброшено. Перезагрузка...");
  setTimeout(() => location.reload(), 800);
}
