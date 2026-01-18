import { state } from "../core/state.ts";
import { showToast } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { scheduleSaveState, immediateSaveState } from "../core/db.ts";
import { openConfirm } from "./ui_modal.ts";
import { syncGlobalStats } from "../core/sync.ts";

const THEME_PALETTES: Record<string, { main: string; hover: string; light: string; accent: string; bg: string; surface: string; surface2: string; border: string; textMain: string; textSub: string; textTertiary: string }> = {
  purple: { main: "#7c3aed", hover: "#6d28d9", light: "rgba(124, 58, 237, 0.15)", accent: "#a78bfa", bg: "#f5f3ff", surface: "#ffffff", surface2: "#ede9fe", border: "#ddd6fe", textMain: "#2e1065", textSub: "#5b21b6", textTertiary: "#7c3aed" },
  blue:   { main: "#2563eb", hover: "#1d4ed8", light: "rgba(37, 99, 235, 0.15)", accent: "#60a5fa", bg: "#e0f2fe", surface: "#ffffff", surface2: "#dbeafe", border: "#bfdbfe", textMain: "#172554", textSub: "#1e40af", textTertiary: "#2563eb" },
  green:  { main: "#059669", hover: "#047857", light: "rgba(5, 150, 105, 0.15)", accent: "#34d399", bg: "#f0fdf4", surface: "#ffffff", surface2: "#dcfce7", border: "#bbf7d0", textMain: "#022c22", textSub: "#047857", textTertiary: "#059669" },
  orange: { main: "#ea580c", hover: "#c2410c", light: "rgba(234, 88, 12, 0.15)", accent: "#fb923c", bg: "#fff7ed", surface: "#ffffff", surface2: "#ffedd5", border: "#fed7aa", textMain: "#431407", textSub: "#c2410c", textTertiary: "#ea580c" },
  pink:   { main: "#db2777", hover: "#be185d", light: "rgba(219, 39, 119, 0.15)", accent: "#f472b6", bg: "#fdf2f8", surface: "#ffffff", surface2: "#fce7f3", border: "#fbcfe8", textMain: "#500724", textSub: "#be185d", textTertiary: "#db2777" },
};

const THEME_PALETTES_DARK: Record<string, { main: string; hover: string; light: string; accent: string; bg: string; surface: string; surface2: string; border: string; textMain: string; textSub: string; textTertiary: string }> = {
  purple: { main: "#a78bfa", hover: "#8b5cf6", light: "rgba(167, 139, 250, 0.15)", accent: "#c4b5fd", bg: "#1e1b4b", surface: "#28235e", surface2: "#312e6f", border: "#3730a3", textMain: "#ede9fe", textSub: "#a78bfa", textTertiary: "#8b5cf6" },
  blue:   { main: "#60a5fa", hover: "#3b82f6", light: "rgba(96, 165, 250, 0.15)", accent: "#93c5fd", bg: "#172554", surface: "#1e3a8a", surface2: "#1d4ed8", border: "#2563eb", textMain: "#dbeafe", textSub: "#60a5fa", textTertiary: "#3b82f6" },
  green:  { main: "#34d399", hover: "#10b981", light: "rgba(52, 211, 153, 0.15)", accent: "#6ee7b7", bg: "#064e3b", surface: "#065f46", surface2: "#047857", border: "#059669", textMain: "#d1fae5", textSub: "#34d399", textTertiary: "#10b981" },
  orange: { main: "#fb923c", hover: "#f97316", light: "rgba(251, 146, 60, 0.15)", accent: "#fdba74", bg: "#431407", surface: "#7c2d12", surface2: "#9a3412", border: "#c2410c", textMain: "#ffedd5", textSub: "#fb923c", textTertiary: "#f97316" },
  pink:   { main: "#f472b6", hover: "#ec4899", light: "rgba(244, 114, 182, 0.15)", accent: "#f9a8d4", bg: "#701a75", surface: "#86198f", surface2: "#9d174d", border: "#be185d", textMain: "#fce7f3", textSub: "#f472b6", textTertiary: "#ec4899" },
};

/**
 * Toggles Hanja display mode.
 * @param {HTMLInputElement} el - The checkbox element.
 */
export function toggleHanjaMode(el: HTMLInputElement) {
  state.hanjaMode = el.checked;
  localStorage.setItem("hanja_mode_v1", String(state.hanjaMode));
  render();
  immediateSaveState();
  syncGlobalStats();
}

/**
 * Toggles the TTS voice between male and female.
 */
export function toggleVoice() {
  state.currentVoice = state.currentVoice === "female" ? "male" : "female";
  localStorage.setItem("voice_pref", state.currentVoice);
  updateVoiceUI();
  showToast(
    `Голос: ${state.currentVoice === "female" ? "Женский" : "Мужской"}`,
  );
  immediateSaveState();
  syncGlobalStats();
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
  localStorage.setItem("audio_speed_v1", String(state.audioSpeed));
  const el = document.getElementById("speed-val");
  if (el) el.textContent = state.audioSpeed + "x";
  scheduleSaveState();
}

/**
 * Toggles auto theme mode based on time.
 * @param {HTMLInputElement} el
 */
export function toggleAutoTheme(el: HTMLInputElement) {
  state.autoTheme = el.checked;
  localStorage.setItem("auto_theme_v1", String(state.autoTheme));
  if (state.autoTheme) {
    checkAutoTheme();
  }
  showToast(`Авто-тема: ${state.autoTheme ? "ВКЛ" : "ВЫКЛ"}`);
  immediateSaveState();
  syncGlobalStats();
}

export function checkAutoTheme() {
  if (!state.autoTheme) return;
  const hour = new Date().getHours();
  const isNight = hour >= 20 || hour < 6; // Ночь с 20:00 до 06:00

  if (state.darkMode !== isNight) {
    state.darkMode = isNight;
    localStorage.setItem("dark_mode_v1", String(state.darkMode));
    applyTheme();
  }
}

/**
 * Toggles dark mode on and off.
 */
export function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("dark_mode_v1", String(state.darkMode));
  applyTheme();
  immediateSaveState();
  syncGlobalStats();
}

/**
 * Toggles the auto-update setting for the PWA.
 * @param {HTMLInputElement} el
 */
export function toggleAutoUpdate(el: HTMLInputElement) {
  state.autoUpdate = el.checked;
  localStorage.setItem("auto_update_v1", String(state.autoUpdate));
  showToast(`Автообновление: ${state.autoUpdate ? "ВКЛ" : "ВЫКЛ"}`);
  immediateSaveState();
  syncGlobalStats();
}

/**
 * Applies the current theme (dark/light) and accent color to the UI.
 */
export function applyTheme() {
  if (state.darkMode) document.body.classList.add("dark-mode");
  else document.body.classList.remove("dark-mode");

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
  state.themeColor = colorKey;
  localStorage.setItem("theme_color_v1", state.themeColor);
  applyAccentColor();
  immediateSaveState();
  syncGlobalStats();
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

  // Use document.body to ensure we override body.dark-mode CSS variables
  const target = document.body.style;

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
  document.querySelectorAll(".color-option, .stats-color-btn").forEach((btn) => {
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

  const target = document.body.style;

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
 * Toggles focus mode.
 */
export function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  localStorage.setItem("focus_mode_v1", String(state.focusMode));
  applyFocusMode();
  showToast(`Режим фокусировки: ${state.focusMode ? "ВКЛ" : "ВЫКЛ"}`);
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
    "background_music_enabled_v1",
    String(state.backgroundMusicEnabled),
  );
  applyBackgroundMusic();
  showToast(`Музыка: ${state.backgroundMusicEnabled ? "ВКЛ" : "ВЫКЛ"}`);
  immediateSaveState();
  syncGlobalStats();
}

/**
 * Populates the music track selection dropdown.
 */
export function populateMusicTrackSelect() {
  const selectEl = document.getElementById("background-music-select");
  if (!selectEl) return;

  selectEl.innerHTML = ""; // Clear existing options
  state.MUSIC_TRACKS.forEach((track) => {
    const option = document.createElement("option");
    option.value = track.filename;
    option.textContent = track.name;
    if (
      state.backgroundMusicTrack &&
      track.filename === state.backgroundMusicTrack
    ) {
      option.selected = true;
    }
    selectEl.appendChild(option);
  });
}

let activePlayerId = "a";
let hasInteracted = false;
/** @type {number|null} */
let volumeAnimationInterval: number | null = null; // Единый интервал для всех анимаций громкости
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
  const isQuizActive = quizGame && quizGame.style.display === "block";

  if (isQuizActive) {
    trackId = "quiz";
  }

  const targetTrack = state.MUSIC_TRACKS.find((t) => t.id === trackId);
  if (!targetTrack)
    return console.warn(`Музыкальный трек для ID "${trackId}" не найден.`);
  const targetTrackFilename = targetTrack.filename;

  const targetSrc = `./audio/${targetTrackFilename}`;

  // Если музыка выключена, просто останавливаем оба плеера
  if (!state.backgroundMusicEnabled && !forcePlay) {
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
        if (e.name !== "AbortError") console.warn("Music play failed:", e);
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
    "background_music_volume_v1",
    String(state.backgroundMusicVolume),
  );
  const el = document.getElementById("background-music-volume-val");
  if (el) el.textContent = `${Math.round(state.backgroundMusicVolume * 100)}%`;
  // FIX: Передаем true, чтобы музыка включилась, если была выключена, но громкость меняют
  applyBackgroundMusic(true);
  scheduleSaveState();
}

/**
 * Temporarily lowers or restores the background music volume (audio ducking).
 * @param {boolean} duck - True to lower volume, false to restore.
 */
export function duckBackgroundMusic(duck: boolean) {
  const activePlayer = document.getElementById(
    activePlayerId === "a" ? "music-player-a" : "music-player-b",
  ) as HTMLAudioElement | null;
  if (!activePlayer || !state.backgroundMusicEnabled || activePlayer.paused)
    return;

  if (volumeAnimationInterval) {
    clearInterval(volumeAnimationInterval);
  }
  // Если прервали кроссфейд, очищаем хвосты
  if (currentFadeOutPlayer) {
    currentFadeOutPlayer.volume = 0;
    currentFadeOutPlayer.pause();
    currentFadeOutPlayer = null;
  }

  const targetVolume = duck
    ? state.backgroundMusicVolume * 0.2
    : state.backgroundMusicVolume;
  const startVolume = activePlayer.volume;

  if (Math.abs(startVolume - targetVolume) < 0.01) return;

  let stepCount = 0;
  const totalSteps = 10;

  volumeAnimationInterval = setInterval(() => {
    stepCount++;
    const progress = stepCount / totalSteps;

    activePlayer.volume = startVolume + (targetVolume - startVolume) * progress;

    if (stepCount >= totalSteps) {
      activePlayer.volume = targetVolume;
      if (volumeAnimationInterval) clearInterval(volumeAnimationInterval);
      volumeAnimationInterval = null;
    }
  }, 20);
}

export function resetAllSettings() {
  openConfirm("Сбросить все настройки к значениям по умолчанию?", () => {
    const settingsKeys = [
      "hanja_mode_v1",
      "voice_pref",
      "audio_speed_v1",
      "dark_mode_v1",
      "auto_update_v1",
      "auto_theme_v1",
      "theme_color_v1",
      "background_music_enabled_v1",
      "background_music_volume_v1",
      "focus_mode_v1",
      "zen_mode_v1",
      "view_mode_v1",
      "study_goal_v1",
      "quiz_difficulty_v1",
      "quiz_topic_v1",
      "quiz_category_v1",
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
    });

    showToast("⚙️ Настройки сброшены. Перезагрузка...");
    setTimeout(() => location.reload(), 800);
  });
}
