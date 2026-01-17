import { state } from "../core/state.ts";
import { showToast } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { scheduleSaveState } from "../core/db.ts";
import { openConfirm } from "./ui_modal.ts";

const THEME_COLORS = {
  purple: "#6c5ce7",
  blue: "#0984e3",
  green: "#00b894",
  orange: "#e17055",
  pink: "#e84393",
};

/**
 * Toggles Hanja display mode.
 * @param {HTMLInputElement} el - The checkbox element.
 */
export function toggleHanjaMode(el: HTMLInputElement) {
  state.hanjaMode = el.checked;
  localStorage.setItem("hanja_mode_v1", String(state.hanjaMode));
  render();
  scheduleSaveState();
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
  localStorage.setItem("audio_speed_v1", String(state.audioSpeed));
  const el = document.getElementById("speed-val");
  if (el) el.textContent = state.audioSpeed + "x";
  scheduleSaveState();
}

/**
 * Toggles dark mode on and off.
 */
export function toggleDarkMode() {
  state.darkMode = !state.darkMode;
  localStorage.setItem("dark_mode_v1", String(state.darkMode));
  applyTheme();
  scheduleSaveState();
}

/**
 * Toggles the auto-update setting for the PWA.
 * @param {HTMLInputElement} el
 */
export function toggleAutoUpdate(el: HTMLInputElement) {
  state.autoUpdate = el.checked;
  localStorage.setItem("auto_update_v1", String(state.autoUpdate));
  showToast(`Автообновление: ${state.autoUpdate ? "ВКЛ" : "ВЫКЛ"}`);
  scheduleSaveState();
}

/**
 * Applies the current theme (dark/light) and accent color to the UI.
 */
export function applyTheme() {
  if (state.darkMode) document.body.classList.add("dark-mode");
  else document.body.classList.remove("dark-mode");

  const icon = state.darkMode ? "🌙" : "☀️";

  const headerBtn = document.getElementById("header-dark-mode-toggle");
  if (headerBtn) headerBtn.textContent = icon;

  applyAccentColor();
}

/**
 * Sets the primary accent color for the theme.
 * @param {string} colorKey
 */
export function setAccentColor(colorKey: string) {
  if (!Object.keys(THEME_COLORS).includes(colorKey)) return;
  state.themeColor = colorKey;
  localStorage.setItem("theme_color_v1", state.themeColor);
  applyAccentColor();
  scheduleSaveState();
}

/**
 * Applies the current accent color to the root element.
 */
export function applyAccentColor() {
  const colorKey = state.themeColor || "purple";
  const color =
    (THEME_COLORS as Record<string, string>)[colorKey] || THEME_COLORS.purple;
  document.documentElement.style.setProperty("--primary", color);
  // Update active state in UI if selector exists
  document.querySelectorAll(".color-option").forEach((btn) => {
    if (btn instanceof HTMLElement)
      btn.classList.toggle(
        "active",
        btn.getAttribute("data-color") === state.themeColor,
      );
  });
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
  scheduleSaveState();
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
    if (state.backgroundMusicTrack && track.filename === state.backgroundMusicTrack) {
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
function crossfade(
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
