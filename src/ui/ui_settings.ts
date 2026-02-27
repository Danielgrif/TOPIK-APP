/* eslint-disable no-console */
import { state } from "../core/state.ts";
import { showToast, speak } from "../utils/utils.ts";
import { render } from "./ui_card.ts";
import { scheduleSaveState } from "../core/db.ts";
import { openConfirm } from "./ui_modal.ts";
import { LS_KEYS } from "../core/constants.ts";
import { RARE_THEMES, SHOP_ITEMS } from "../core/shop_data.ts";

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
  ruby: {
    main: "#e11d48",
    hover: "#be123c",
    light: "rgba(225, 29, 72, 0.15)",
    accent: "#f43f5e",
    bg: "#fff1f2",
    surface: "#ffffff",
    surface2: "#ffe4e6",
    border: "#fecdd3",
    textMain: "#881337",
    textSub: "#9f1239",
    textTertiary: "#be123c",
  },
  amethyst: {
    main: "#9333ea",
    hover: "#7e22ce",
    light: "rgba(147, 51, 234, 0.15)",
    accent: "#a855f7",
    bg: "#f5f3ff",
    surface: "#ffffff",
    surface2: "#ede9fe",
    border: "#ddd6fe",
    textMain: "#4c1d95",
    textSub: "#5b21b6",
    textTertiary: "#6d28d9",
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
  ruby: {
    main: "#fb7185",
    hover: "#f43f5e",
    light: "rgba(225, 29, 72, 0.15)",
    accent: "#fda4af",
    bg: "#4c0519",
    surface: "#881337",
    surface2: "#9f1239",
    border: "#be123c",
    textMain: "#fff1f2",
    textSub: "#fda4af",
    textTertiary: "#fb7185",
  },
  amethyst: {
    main: "#c084fc",
    hover: "#a855f7",
    light: "rgba(147, 51, 234, 0.15)",
    accent: "#d8b4fe",
    bg: "#3b0764",
    surface: "#581c87",
    surface2: "#6b21a8",
    border: "#7e22ce",
    textMain: "#faf5ff",
    textSub: "#d8b4fe",
    textTertiary: "#c084fc",
  },
};

function updateSettingsTimestamp() {
  state.settingsUpdatedAt = Date.now();
  localStorage.setItem("settings_updated_at", String(state.settingsUpdatedAt));
}

/**
 * Synchronizes all settings UI elements with the current state.
 * Handles dependencies like disabling Dark Mode toggle when Auto Theme is on.
 */
export function updateSettingsUI() {
  const darkModeCheckbox = document.getElementById(
    "dark-mode-toggle-switch",
  ) as HTMLInputElement;
  const autoThemeCheckbox = document.getElementById(
    "auto-theme-toggle-switch",
  ) as HTMLInputElement;
  const autoThemeTimes = document.getElementById("auto-theme-times");
  const autoThemeStartInput = document.getElementById(
    "auto-theme-start",
  ) as HTMLInputElement;
  const autoThemeEndInput = document.getElementById(
    "auto-theme-end",
  ) as HTMLInputElement;

  const hanjaCheckbox = document.getElementById(
    "hanja-setting-check",
  ) as HTMLInputElement;
  const musicCheckbox = document.getElementById(
    "background-music-check",
  ) as HTMLInputElement;
  const autoUpdateCheckbox = document.getElementById(
    "auto-update-check",
  ) as HTMLInputElement;
  const speedSlider = document.getElementById(
    "speed-slider",
  ) as HTMLInputElement;
  const speedVal = document.getElementById("speed-val");
  const musicVolumeSlider = document.getElementById(
    "background-music-volume-slider",
  ) as HTMLInputElement;

  // Dark Mode & Auto Theme Logic
  if (darkModeCheckbox) {
    darkModeCheckbox.checked = state.darkMode;
    const row = darkModeCheckbox.closest(".setting-item") as HTMLElement;
    const label = row?.querySelector(".setting-label");

    if (state.autoTheme) {
      darkModeCheckbox.disabled = true;
      if (row) row.style.opacity = "0.5";
      if (label) label.textContent = "Ночной режим (Авто)";
    } else {
      darkModeCheckbox.disabled = false;
      if (row) row.style.opacity = "1";
      if (label) label.textContent = "Ночной режим";
    }
  }

  if (autoThemeCheckbox) autoThemeCheckbox.checked = state.autoTheme;
  if (autoThemeTimes)
    autoThemeTimes.style.display = state.autoTheme ? "flex" : "none";
  if (autoThemeStartInput)
    autoThemeStartInput.value = String(state.autoThemeStart);
  if (autoThemeEndInput) autoThemeEndInput.value = String(state.autoThemeEnd);

  if (hanjaCheckbox) hanjaCheckbox.checked = state.hanjaMode;
  if (musicCheckbox) musicCheckbox.checked = state.backgroundMusicEnabled;
  if (autoUpdateCheckbox) autoUpdateCheckbox.checked = state.autoUpdate;

  if (speedSlider) speedSlider.value = String(state.audioSpeed);
  if (speedVal) speedVal.textContent = state.audioSpeed + "x";

  if (musicVolumeSlider) {
    musicVolumeSlider.value = String(state.backgroundMusicVolume);
  }

  updateMusicUI(); // Updates music slider state
  updateVoiceUI();
  updateThemePickerUI();
  updateTrashRetentionUI();
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
 * Sets the TTS voice.
 * @param {string} voice - 'female' or 'male'
 */
export function setVoice(voice: string) {
  if (voice !== "female" && voice !== "male") return;

  state.currentVoice = voice;
  localStorage.setItem(LS_KEYS.VOICE_PREF, state.currentVoice);
  updateVoiceUI();
  showToast(`Голос: ${voice === "female" ? "Женский" : "Мужской"}`);
  updateSettingsTimestamp();
  scheduleSaveState();

  // Проигрываем тестовый пример
  speak("안녕하세요", null);
  render();
}

/**
 * Updates the voice selection UI (segment control).
 */
export function updateVoiceUI() {
  const container = document.getElementById("voice-selection");
  if (container) {
    container.querySelectorAll(".segment-btn").forEach((btn) => {
      if (btn.getAttribute("data-value") === state.currentVoice) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }
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

  let changed = false;
  if (state.autoTheme) {
    changed = checkAutoTheme();
  }

  // Показываем общее уведомление только если тема НЕ изменилась (чтобы не было дублей)
  if (!changed) {
    showToast(`Авто-тема: ${state.autoTheme ? "ВКЛ" : "ВЫКЛ"}`);
  }

  updateSettingsUI();
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function setAutoThemeStart(val: string) {
  let hour = parseInt(val, 10);
  if (isNaN(hour)) return;
  hour = Math.max(0, Math.min(23, hour));
  state.autoThemeStart = hour;
  localStorage.setItem(LS_KEYS.AUTO_THEME_START, String(hour));
  checkAutoTheme();
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function setAutoThemeEnd(val: string) {
  let hour = parseInt(val, 10);
  if (isNaN(hour)) return;
  hour = Math.max(0, Math.min(23, hour));
  state.autoThemeEnd = hour;
  localStorage.setItem(LS_KEYS.AUTO_THEME_END, String(hour));
  checkAutoTheme();
  updateSettingsTimestamp();
  scheduleSaveState();
}

export function checkAutoTheme(): boolean {
  if (!state.autoTheme) return false;
  const hour = new Date().getHours();

  let isNight = false;
  // Если начало больше конца (например, 20:00 -> 06:00), то ночь это ">= 20 ИЛИ < 6"
  if (state.autoThemeStart > state.autoThemeEnd)
    isNight = hour >= state.autoThemeStart || hour < state.autoThemeEnd;
  else isNight = hour >= state.autoThemeStart && hour < state.autoThemeEnd;

  if (state.darkMode !== isNight) {
    state.darkMode = isNight;
    localStorage.setItem(LS_KEYS.DARK_MODE, String(state.darkMode));
    applyTheme();
    showToast(`Авто-тема: ${isNight ? "Ночь 🌙" : "День ☀️"}`);
    updateSettingsUI();
    return true;
  }
  // Ensure UI is in sync (e.g. if modal is open)
  updateSettingsUI();
  return false;
}

/**
 * Sets up a listener for system theme changes.
 */
export function setupSystemThemeListener() {
  if (!window.matchMedia) return;

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const handleChange = (e: MediaQueryListEvent) => {
    // Если пользователь не установил тему вручную (нет записи в localStorage)
    // и не включена авто-тема по времени
    if (localStorage.getItem(LS_KEYS.DARK_MODE) === null && !state.autoTheme) {
      state.darkMode = e.matches;
      applyTheme();
      updateSettingsUI();
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", handleChange);
  } else {
    // Fallback
    mediaQuery.addListener(handleChange);
  }
}

/**
 * Toggles dark mode on and off.
 * @param {HTMLInputElement} [el] - The checkbox element.
 */
export function toggleDarkMode(el?: HTMLInputElement) {
  // Если включена авто-тема, любое ручное переключение должно её отключать
  if (state.autoTheme) {
    state.autoTheme = false;
    localStorage.setItem(LS_KEYS.AUTO_THEME, "false");
    showToast("Авто-тема отключена");
  }

  state.darkMode = el && el.type === "checkbox" ? el.checked : !state.darkMode;
  localStorage.setItem(LS_KEYS.DARK_MODE, String(state.darkMode));
  applyTheme();

  updateSettingsUI();
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
  document.body.classList.toggle("dark-mode", state.darkMode);
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
  if (!THEME_PALETTES[colorKey]) return;

  // Проверка прав на тему
  if (colorKey !== "purple") {
    const shopId = `theme_${colorKey}`;
    if (!state.purchasedItems.includes(shopId)) {
      const isRare = RARE_THEMES.some((t) => t.value === colorKey);
      if (isRare) {
        showToast("🎁 Эту тему можно найти в Таинственной коробке (День 7)!");
      } else {
        showToast("Эта тема доступна в магазине");
      }
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
  const container = document.getElementById("theme-picker-container");
  if (!container) return;

  const allThemes = [
    { id: "theme_default", name: "Стандарт", value: "purple", price: 0 },
    ...SHOP_ITEMS.filter((item) => item.type === "theme"),
    ...RARE_THEMES,
  ];

  container.innerHTML = ""; // Clear before re-rendering

  allThemes.forEach((theme) => {
    const isRare = RARE_THEMES.some((rt) => rt.id === theme.id);
    const isPurchased =
      state.purchasedItems.includes(theme.id) || (theme.price === 0 && !isRare);
    const isActive = state.themeColor === theme.value;

    const btn = document.createElement("button");
    btn.className = "color-option";
    if (isActive) btn.classList.add("active");
    btn.dataset.value = theme.value;
    btn.title = theme.name;

    if (isPurchased) {
      btn.dataset.action = "set-accent";
    } else {
      btn.classList.add("locked");
      btn.style.opacity = "0.6";
      btn.style.filter = "grayscale(1)";
      if (isRare) {
        btn.innerHTML = `<span style="font-size: 16px;">?</span>`;
        btn.title = `${theme.name} (редкая награда)`;
        btn.onclick = (e) => {
          e.stopPropagation();
          showToast("🎁 Эту тему можно найти в Таинственной коробке (День 7)!");
        };
      } else {
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
        btn.appendChild(buyBtn);
        btn.title = `${theme.name} (в магазине)`;
      }
    }
    container.appendChild(btn);
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
  updateMusicUI();
  applyBackgroundMusic();
  showToast(`Музыка: ${state.backgroundMusicEnabled ? "ВКЛ" : "ВЫКЛ"}`);
  updateSettingsTimestamp();
  scheduleSaveState();
}

/**
 * Updates the music UI state (disables volume slider if music is off).
 */
export function updateMusicUI() {
  const volSlider = document.getElementById(
    "background-music-volume-slider",
  ) as HTMLInputElement;
  if (volSlider) {
    volSlider.disabled = !state.backgroundMusicEnabled;
    volSlider.style.opacity = state.backgroundMusicEnabled ? "1" : "0.5";
    volSlider.style.cursor = state.backgroundMusicEnabled
      ? "pointer"
      : "not-allowed";
  }
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
