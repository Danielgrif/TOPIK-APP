/* eslint-disable @typescript-eslint/no-explicit-any */
import { state } from "./state.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { showLevelUpAnimation } from "../ui/ui_interactions.ts";
import { Scheduler } from "./scheduler.ts";
import { scheduleSaveState } from "./db.ts";

export function getXPForNextLevel(lvl: number): number {
  // Было: 100 + lvl * 50 (Линейная)
  // Стало: 100 * (lvl ^ 1.2) (Слегка экспоненциальная, сложнее на высоких уровнях)
  return Math.floor(100 * Math.pow(lvl, 1.2));
}

export function addXP(val: number) {
  state.userStats.xp = (state.userStats.xp || 0) + val;
  if (val > 0) state.userStats.coins = (state.userStats.coins || 0) + val;

  let currentLevel = Number(state.userStats.level || 1);
  let requiredForCurrentLevel = getXPForNextLevel(currentLevel);
  let leveledUp = false;

  while (state.userStats.xp >= requiredForCurrentLevel) {
    state.userStats.xp -= requiredForCurrentLevel;
    currentLevel++;
    showLevelUpAnimation(currentLevel);
    leveledUp = true;

    requiredForCurrentLevel = getXPForNextLevel(currentLevel);
  }

  state.userStats.level = currentLevel;
  updateXPUI();

  if (leveledUp) {
    const bar = document.getElementById("xp-fill");
    if (bar) {
      bar.classList.remove("level-up-shine");
      void bar.offsetWidth; // Force reflow для перезапуска анимации
      bar.classList.add("level-up-shine");
      setTimeout(() => bar.classList.remove("level-up-shine"), 1500);
    }
  }

  scheduleSaveState();
}

export function updateXPUI() {
  const lvl = state.userStats.level;
  const xp = state.userStats.xp;
  const denom = getXPForNextLevel(lvl);
  const userLevel = document.getElementById("user-level");
  if (userLevel) userLevel.innerText = String(lvl);
  const xpText = document.getElementById("xp-text");
  if (xpText) xpText.innerText = `${xp}/${denom}`;

  const bar = document.getElementById("xp-fill");
  if (bar) {
    const pct = Math.min(100, Math.max(0, (xp / denom) * 100));
    if (bar.tagName === "path" || bar.tagName === "PATH") {
        bar.setAttribute("stroke-dasharray", `${pct}, 100`);
    } else {
        bar.style.width = `${pct}%`;
    }
  }
}

export function updateStats() {
  const headerCoins = document.getElementById("coins-count-header");
  if (headerCoins) headerCoins.innerText = String(state.userStats.coins);

  const strip = document.getElementById("stats-strip");
  if (strip) {
    const accuracy = calculateOverallAccuracy();
    const stats = [
      {
        label: "Серия",
        value: state.streak.count,
        icon: "🔥",
        color: "var(--danger)",
        isChart: false,
      },
      {
        label: "Изучено",
        value: state.learned.size,
        icon: "📚",
        color: "var(--success)",
        isChart: false,
      },
      {
        label: "Точность",
        value: accuracy,
        icon: "🎯",
        color: "var(--primary)",
        isChart: true,
      },
      {
        label: "Ошибок",
        value: state.mistakes.size,
        icon: "⚠️",
        color: "var(--warning)",
        isChart: false,
      },
      {
        label: "Сессии",
        value: state.sessions.length,
        icon: "⏱",
        color: "var(--info)",
        isChart: false,
      },
    ];

    strip.innerHTML = stats
      .map((s) => {
        if (s.isChart) {
          return `
                <div class="stat-card-primary" style="border-bottom: 3px solid ${s.color}">
                    <div class="stat-chart-wrapper">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle-fill" stroke="${s.color}" stroke-dasharray="${s.value}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="stat-chart-text">${s.value}%</div>
                    </div>
                    <div class="stat-label-primary">${s.label}</div>
                </div>
            `;
        }
        return `
          <div class="stat-card-primary" style="border-bottom: 3px solid ${s.color}">
              <div class="stat-icon-primary">${s.icon}</div>
              <div class="stat-info-primary">
                  <div class="stat-value-primary">${s.value}</div>
                  <div class="stat-label-primary">${s.label}</div>
              </div>
          </div>
      `;
      })
      .join("");
  }
}

export function updateSRSBadge() {
  try {
    Scheduler.init({
      dataStore: state.dataStore,
      wordHistory: state.wordHistory,
    });
    const q = Scheduler.getQueue({ limit: 999 });
    const badge = document.getElementById("srs-badge");

    if (badge) {
      const currentCount = parseInt(badge.textContent || "0");
      const newCount = q.length;

      badge.textContent = String(q.length);
      badge.style.display = q.length > 0 ? "inline-block" : "none";

      if (newCount > 0 && newCount !== currentCount) {
        badge.classList.remove("badge-pop");
        void badge.offsetWidth; // Force reflow
        badge.classList.add("badge-pop");
      }
    }

    const reviewBtn = document.querySelector(
      '.nav-btn[onclick="openReviewMode()"]',
    );
    if (reviewBtn) {
      if (q.length > 0) {
        reviewBtn.classList.add("has-reviews");
      } else {
        reviewBtn.classList.remove("has-reviews");
      }
    }
  } catch (e) {
    console.warn("SRS Badge update failed:", e);
  }
}

export function calculateOverallAccuracy(): number {
  let totalAttempts = 0,
    totalCorrect = 0;
  const history = Object.values(state.wordHistory);
  for (let i = 0; i < history.length; i++) {
    const w = history[i];
    if (w && typeof w.attempts === "number") {
      totalAttempts += w.attempts;
      totalCorrect += w.correct;
    }
  }
  if (totalAttempts === 0) return 0;
  return Math.round((totalCorrect / totalAttempts) * 100);
}

export function getAchievementDefinitions() {
  // Optimization: Calculate mastered count once to avoid iterating wordHistory multiple times
  const masteredCount = Object.values(state.wordHistory).filter(
    (h) => h.attempts >= 3 && h.correct / h.attempts >= 0.9,
  ).length;

  const getMasteredCount = () => masteredCount;

  return [
    {
      id: "first_10",
      title: "Первые шаги",
      description: "Выучить 10 слов",
      emoji: "🎯",
      progress: () => state.learned.size,
      max: 10,
    },
    {
      id: "first_50",
      title: "Словарный запас",
      description: "Выучить 50 слов",
      emoji: "💪",
      progress: () => state.learned.size,
      max: 50,
    },
    {
      id: "first_100",
      title: "Сотня!",
      description: "Выучить 100 слов",
      emoji: "🔥",
      progress: () => state.learned.size,
      max: 100,
    },
    {
      id: "master_10",
      title: "Мастер",
      description: "Довести 10 слов до 90% точности",
      emoji: "👑",
      progress: getMasteredCount,
      max: 10,
    },
    {
      id: "master_50",
      title: "Сэнсэй",
      description: "Довести 50 слов до 90% точности",
      emoji: "🎓",
      progress: getMasteredCount,
      max: 50,
    },
    {
      id: "first_favorite",
      title: "На заметку",
      description: "Добавить первое слово в избранное",
      emoji: "❤️",
      progress: () => state.favorites.size,
      max: 1,
    },
    {
      id: "zero_mistakes",
      title: "Перфекционист",
      description: "Выучить 5 слов без единой ошибки",
      emoji: "✨",
      progress: () =>
        state.mistakes.size === 0 && state.learned.size >= 5 ? 1 : 0,
      max: 1,
    },
    {
      id: "streak_3",
      title: "Начало положено",
      description: "Серия занятий 3 дня подряд",
      emoji: "🌱",
      progress: () => state.streak.count,
      max: 3,
    },
    {
      id: "streak_7",
      title: "Марафонец",
      description: "Серия занятий 7 дней подряд",
      emoji: "🏆",
      progress: () => state.streak.count,
      max: 7,
    },
    {
      id: "sessions_5",
      title: "Регулярность",
      description: "Завершить 5 учебных сессий",
      emoji: "📚",
      progress: () => state.sessions.length,
      max: 5,
    },
    {
      id: "sprint_20",
      title: "Спринтер",
      description: "Набрать 20 очков в Спринте",
      emoji: "⚡",
      progress: () => state.userStats.sprintRecord || 0,
      max: 20,
    },
    {
      id: "survival_20",
      title: "Выживший",
      description: "Набрать 20 очков в Выживании",
      emoji: "☠️",
      progress: () => state.userStats.survivalRecord || 0,
      max: 20,
    },
    {
      id: "collector_1000",
      title: "Коллекционер",
      description: "Накопить 1000 монет",
      emoji: "💰",
      progress: () => state.userStats.coins,
      max: 1000,
    },
    {
      id: "shopaholic",
      title: "Покупатель",
      description: "Купить предмет в магазине",
      emoji: "🛍️",
      progress: () => (state.userStats.streakFreeze > 0 ? 1 : 0),
      max: 1,
    },
    {
      id: "level_5",
      title: "Пятый уровень",
      description: "Достичь 5 уровня",
      emoji: "⭐",
      progress: () => state.userStats.level,
      max: 5,
    },
    {
      id: "level_10",
      title: "Десятый уровень",
      description: "Достичь 10 уровня",
      emoji: "🌟",
      progress: () => state.userStats.level,
      max: 10,
    },
    {
      id: "night_owl",
      title: "Ночная сова",
      description: "Секретное достижение",
      secretDesc: "Заниматься после 23:00",
      emoji: "🦉",
      progress: () => (new Date().getHours() >= 23 ? 1 : 0),
      max: 1,
      secret: true,
    },
    {
      id: "early_bird",
      title: "Жаворонок",
      description: "Секретное достижение",
      secretDesc: "Заниматься до 6:00 утра",
      emoji: "🌅",
      progress: () => (new Date().getHours() < 6 ? 1 : 0),
      max: 1,
      secret: true,
    },
  ];
}

export function checkAchievements(showAlert = true) {
  const defs = getAchievementDefinitions();
  defs.forEach((ach) => {
    if (state.achievements.find((a) => a.id === ach.id)) return;
    if (ach.progress() >= ach.max) {
      state.achievements.push({ id: ach.id, date: Date.now() });
      if (showAlert) {
        showToast(`🎉 Новое достижение: ${ach.emoji} ${ach.title}`);
        playTone("achievement-unlock");
        if (typeof window.confetti === "function") {
          window.confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            zIndex: 20005,
          });
        }
      }
    }
  });
  localStorage.setItem("achievements_v5", JSON.stringify(state.achievements));
}

export function renderAchievements() {
  const container = document.getElementById("achievements-list");
  const header = document.getElementById("achievements-header");
  if (!container) return;
  container.scrollTop = 0;

  container.innerHTML = "";
  const defs = getAchievementDefinitions();
  const unlockedIds = new Set(state.achievements.map((a) => a.id));
  const unlockedCount = unlockedIds.size;
  const totalCount = defs.length;

  if (header) {
    header.innerHTML = `
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 10px; font-weight: 500; text-align: center;">Открыто ${unlockedCount} из ${totalCount}</div>
            <div class="xp-bar-container" style="height: 10px; max-width: 100%; margin: 0 auto; background: var(--surface-2); border-radius: 5px; overflow: hidden;">
                <div id="ach-progress-fill" class="xp-bar-fill" style="width: 0%; background: var(--gold); height: 100%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);"></div>
            </div>
        `;

    // Trigger animation after a brief delay
    requestAnimationFrame(() => {
      const fill = document.getElementById("ach-progress-fill");
      if (fill) fill.style.width = `${(unlockedCount / totalCount) * 100}%`;
    });
  }

  defs.forEach((ach, index) => {
    const isUnlocked = unlockedIds.has(ach.id);
    const card = document.createElement("div");
    card.className = "achievement-card";
    card.style.animation = `fadeInUpList 0.3s ease-out ${index * 0.05}s backwards`;
    if (isUnlocked) card.classList.add("unlocked");
    else card.classList.add("locked");

    let icon = ach.emoji,
      title = ach.title,
      desc = ach.description;
    if (!isUnlocked && (ach as { secret?: boolean }).secret) {
      card.classList.add("secret");
      icon = "❓";
      title = "Секретное достижение";
      desc = "Выполните особое условие";
    }

    const currentProgress = ach.progress();
    const progressPercent = Math.min(100, (currentProgress / ach.max) * 100);

    let progressBar = "";
    if (!isUnlocked && ach.max > 1) {
      progressBar = `<div class="ach-progress-bar"><div class="ach-progress-fill" style="width: ${progressPercent}%"></div></div><div class="ach-progress-text">${currentProgress} / ${ach.max}</div>`;
    }

    card.innerHTML = `<div class="achievement-icon">${icon}</div><div class="achievement-info"><div class="achievement-title">${title}</div><div class="achievement-desc">${desc}</div></div>${progressBar}`;
    container.appendChild(card);
  });
}

let cachedTopicMasteryHtml: string | null = null;
let cachedLearnedSize: number = -1;
let cachedCurrentType: string | null = null;

export function invalidateTopicMasteryCache() {
  cachedTopicMasteryHtml = null;
  cachedLearnedSize = -1;
  cachedCurrentType = null;
}

export function renderTopicMastery() {
  const container = document.getElementById("topic-mastery-list");
  if (!container) return;

  // Optimization: Use cached HTML if learned count and type haven't changed
  if (
    cachedTopicMasteryHtml &&
    state.learned.size === cachedLearnedSize &&
    state.currentType === cachedCurrentType
  ) {
    container.innerHTML = cachedTopicMasteryHtml;
    return;
  }

  const topics: Record<string, { total: number; learned: number }> =
    Object.create(null);

  const data = state.dataStore;
  const len = data.length;
  const currentType = state.currentType;

  for (let i = 0; i < len; i++) {
    const w = data[i];
    if (w.type !== currentType) continue;
    const t = w.topic || w.topic_ru || w.topic_kr || "Other";
    if (!topics[t]) topics[t] = { total: 0, learned: 0 };
    topics[t].total++;
    if (state.learned.has(w.id)) topics[t].learned++;
  }

  let html = "";
  Object.entries(topics).forEach(([topic, stats]) => {
    const pct = Math.round((stats.learned / stats.total) * 100);
    html += `
        <div class="topic-mastery-item">
            <div class="topic-name">${topic}</div>
            <div class="topic-progress">
                <div class="topic-bar" style="width: ${pct}%"></div>
            </div>
            <div class="topic-stats">${stats.learned}/${stats.total}</div>
        </div>`;
  });

  container.innerHTML = html;
  cachedTopicMasteryHtml = html;
  cachedLearnedSize = state.learned.size;
  cachedCurrentType = currentType;
}

const chartInstances: Record<string, any> = {};

interface ChartTooltipContext {
  raw: any;
  label: any;
  dataset: { label: any; data?: any[] };
}

// Helper for chart styling
function getChartTheme() {
  const isDark = document.body.classList.contains("dark-mode");
  return {
    textColor: isDark ? "rgba(255, 255, 255, 0.7)" : "#64748b",
    gridColor: isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
    tooltipBg: isDark ? "#1e1b4b" : "#ffffff",
    tooltipText: isDark ? "#ffffff" : "#1e293b",
    fontFamily: "'Pretendard Variable', sans-serif",
    success: isDark ? "#34d399" : "#059669",
    danger: isDark ? "#fb7185" : "#e11d48",
  };
}

function destroyChart(key: string) {
  const instance = chartInstances[key];
  if (instance && typeof instance.destroy === "function") {
    instance.destroy();
  }
}

function getLast7DaysActivity() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const localDateStr = d.toLocaleDateString("en-CA");
    const hasSession = state.sessions.some((s) => {
      if (!s.date) return false;
      return new Date(s.date).toLocaleDateString("en-CA") === localDateStr;
    });
    days.push({
      day: d.toLocaleDateString("ru-RU", { weekday: "short" }),
      date: d.getDate(),
      active: hasSession,
      isToday: i === 0,
    });
  }
  return days;
}

export function renderDetailedStats() {
  const container = document.getElementById("stats-details");
  if (!container) return;

  // Reset scroll on the parent container (modal body)
  const scrollParent = container.closest(".modal-body-container");
  if (scrollParent) {
    scrollParent.scrollTop = 0;
  }

  // Проверяем наличие Chart.js
  if (typeof window.Chart === "undefined") {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-sub);">Графики недоступны (Chart.js не загружен)</div>`;
    return;
  }

  const days = getLast7DaysActivity();
  const additionalHtml = ""; // Define additionalHtml to prevent error
  let streakHtml = `
    <div id="streak-calendar-card" class="streak-calendar-card" style="background: var(--surface-1); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 15px;">
      <div style="display: flex; align-items: center; gap: 15px;">
        <div style="font-size: 32px;">🔥</div>
        <div>
          <div style="font-size: 14px; color: var(--text-sub);">Текущая серия</div>
          <div style="font-size: 24px; font-weight: 800;">${state.streak.count} дн.</div>
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        ${days
          .map(
            (d) => `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
            <div style="font-size: 10px; color: var(--text-sub); text-transform: uppercase;">${d.day}</div>
            <div style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; 
              ${d.active ? "background: var(--danger); color: white; box-shadow: 0 2px 8px rgba(225, 112, 85, 0.4);" : "background: var(--surface-2); color: var(--text-sub);"} 
              ${d.isToday && !d.active ? "border: 2px solid var(--danger);" : ""}">
              ${d.active ? "✓" : d.date}
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  `;

  // Add Mistake Analysis Button if there are mistakes
  if (state.mistakes.size > 0) {
    streakHtml += `
      <button class="btn" data-action="open-mistakes" style="width: 100%; margin-bottom: 20px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid var(--danger);">
        ⚠️ Анализ ошибок (${state.mistakes.size})
      </button>
    `;
  }

  const existingStreak = document.getElementById("streak-calendar-card");
  if (existingStreak && existingStreak.parentElement) {
    existingStreak.outerHTML = streakHtml + additionalHtml;
  } else if (!document.getElementById("activityChart")) {
    container.innerHTML = `
      ${streakHtml}
      ${additionalHtml}
      <div class="charts-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-top: 20px;">
        <div class="chart-card" style="background: var(--surface-1); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">📊 Активность (7 дней)</h3>
          <div style="position: relative; height: 200px;">
            <canvas id="activityChart"></canvas>
          </div>
        </div>
        <div class="chart-card" style="background: var(--surface-1); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">📅 Изучено слов</h3>
          <div style="position: relative; height: 200px;">
            <canvas id="learnedChart"></canvas>
          </div>
        </div>
        <div class="chart-card" style="background: var(--surface-1); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">🧠 Распределение SRS</h3>
          <div style="position: relative; height: 200px;">
            <canvas id="srsChart"></canvas>
          </div>
        </div>
        <div class="chart-card" style="background: var(--surface-1); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">📉 Кривая забывания</h3>
          <div style="position: relative; height: 200px;">
            <canvas id="forgettingChart"></canvas>
          </div>
        </div>
        <div class="chart-card" style="background: var(--surface-1); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 700;">🎯 Точность сессий</h3>
          <div style="position: relative; height: 200px;">
            <canvas id="accuracyChart"></canvas>
          </div>
        </div>
      </div>
    `;
  } else {
    container.insertAdjacentHTML("afterbegin", streakHtml + additionalHtml);
  }
}

export function renderActivityChart() {
  const ctx = (
    document.getElementById("activityChart") as HTMLCanvasElement
  )?.getContext("2d");
  if (!ctx) return;
  destroyChart("activity");

  const labels = [];
  const dataPoints = [];
  const now = new Date();
  const theme = getChartTheme();

  // Optimization: Pre-calculate activity map to avoid iterating wordHistory 7 times
  const activityMap = new Map<string, number>();
  Object.values(state.wordHistory).forEach((h) => {
    if (h.learnedDate) {
      const ld = new Date(h.learnedDate).toLocaleDateString("en-CA");
      activityMap.set(ld, (activityMap.get(ld) || 0) + 1);
    }
  });

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const localDateStr = d.toLocaleDateString("en-CA");
    labels.push(d.toLocaleDateString("ru-RU", { weekday: "short" }));

    // Hybrid approach:
    // 1. Count newly learned words (precise)
    let learnedCount = activityMap.get(localDateStr) || 0;

    // 2. If learned count is 0 (likely past days before migration), fallback to session activity
    // This ensures the chart isn't empty for past active days
    if (learnedCount === 0 && i > 0) {
      const sessionActivity = state.sessions
        .filter(
          (s) => new Date(s.date).toLocaleDateString("en-CA") === localDateStr,
        )
        .reduce((acc, s) => acc + (s.wordsReviewed || 0), 0);
      // Use session activity but scale it down slightly to approximate "learned" vs "reviewed"
      learnedCount = Math.ceil(sessionActivity * 0.5);
    }

    dataPoints.push(learnedCount);
  }

  // Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(108, 92, 231, 0.8)");
  gradient.addColorStop(1, "rgba(108, 92, 231, 0.2)");

  chartInstances["activity"] = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Активность",
          data: dataPoints,
          backgroundColor: gradient,
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 20,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: theme.gridColor, drawBorder: false },
          ticks: {
            color: theme.textColor,
            font: { family: theme.fontFamily },
            precision: 0,
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: theme.fontFamily } },
        },
      },
      animation: {
        duration: 1000,
        easing: "easeOutQuart",
      },
      tooltip: {
        backgroundColor: theme.tooltipBg,
        titleColor: theme.tooltipText,
        bodyColor: theme.tooltipText,
        borderColor: theme.gridColor,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: ChartTooltipContext) => `📝 ~${context.raw} слов`,
        },
      },
    },
  });
}

export function renderLearnedChart() {
  const ctx = (
    document.getElementById("learnedChart") as HTMLCanvasElement
  )?.getContext("2d");
  if (!ctx) return;
  destroyChart("learned");

  const theme = getChartTheme();

  // Group learned words by level
  const levels = { "★☆☆": 0, "★★☆": 0, "★★★": 0 };
  const totals = { "★☆☆": 0, "★★☆": 0, "★★★": 0 };

  const data = state.dataStore;
  for (let i = 0; i < data.length; i++) {
    const w = data[i];
    if (w.level && w.level in totals) {
      // @ts-expect-error Index signature mismatch
      totals[w.level]++;
      if (state.learned.has(w.id)) {
        // @ts-expect-error Index signature mismatch
        levels[w.level]++;
      }
    }
  }

  chartInstances["learned"] = new window.Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(levels),
      datasets: [
        {
          label: "Изучено",
          data: Object.values(levels),
          backgroundColor: ["#00b894", "#0984e3", "#6c5ce7"],
          borderRadius: 6,
          barThickness: 25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context: ChartTooltipContext) => {
              const lvl = context.label as keyof typeof totals;
              const total = totals[lvl] || 0;
              const val = context.raw;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return `📚 ${val} из ${total} (${pct}%)`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: theme.gridColor, drawBorder: false },
          ticks: {
            color: theme.textColor,
            font: { family: theme.fontFamily },
            precision: 0,
          },
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: theme.fontFamily } },
        },
      },
    },
  });
}

export function renderAccuracyChart() {
  const ctx = (
    document.getElementById("accuracyChart") as HTMLCanvasElement
  )?.getContext("2d");
  if (!ctx) return;
  destroyChart("accuracy");

  const theme = getChartTheme();
  const recentSessions = state.sessions.slice(-10);

  if (recentSessions.length === 0) {
    // Если нет данных, можно очистить канвас или нарисовать "Нет данных"
    // В данном случае просто выходим, оставляя пустой канвас (или старый график, если он был, но destroyChart его удалил)
    return;
  }

  // Format dates for labels
  const labels = recentSessions.map((s) => {
    const d = new Date(s.date);
    return `${d.getDate()}.${d.getMonth() + 1}`;
  });
  const data = recentSessions.map((s) => s.accuracy || 0);

  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, "rgba(0, 184, 148, 0.4)");
  gradient.addColorStop(1, "rgba(0, 184, 148, 0.0)");

  chartInstances["accuracy"] = new window.Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Точность %",
          data,
          borderColor: "#00b894",
          backgroundColor: gradient,
          borderWidth: 3,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#00b894",
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context: ChartTooltipContext) => `🎯 ${context.raw}%`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: theme.gridColor, drawBorder: false },
          ticks: { color: theme.textColor, font: { family: theme.fontFamily } },
        },
        x: {
          grid: { display: false },
          ticks: {
            color: theme.textColor,
            font: { family: theme.fontFamily },
            maxRotation: 0,
            autoSkip: true,
          },
        },
      },
    },
  });
}

export function renderForgettingCurve() {
  const ctx = (
    document.getElementById("forgettingChart") as HTMLCanvasElement
  )?.getContext("2d");
  if (!ctx) return;
  destroyChart("forgetting");

  const theme = getChartTheme();

  // --- Calculate User's Average Stability ---
  let totalInterval = 0;
  let reviewedCount = 0;
  Object.values(state.wordHistory).forEach((h) => {
    if (h && h.sm2 && h.sm2.interval > 1) {
      // Use interval > 1 to only count reviewed words
      totalInterval += h.sm2.interval;
      reviewedCount++;
    }
  });
  const averageStability =
    reviewedCount > 0 ? totalInterval / reviewedCount : 2.5;

  const labels = [];
  const theoreticalData = [];
  const userData = [];
  for (let t = 0; t <= 7; t++) {
    labels.push(t === 0 ? "Сейчас" : t + "д");
    // Ebbinghaus curve approximation: R = e^(-t/S)
    theoreticalData.push(Math.exp(-t / 2.5) * 100);
    userData.push(Math.exp(-t / averageStability) * 100);
  }

  const gradientUser = ctx.createLinearGradient(0, 0, 0, 200);
  gradientUser.addColorStop(0, "rgba(52, 211, 153, 0.5)");
  gradientUser.addColorStop(1, "rgba(52, 211, 153, 0.0)");

  chartInstances["forgetting"] = new window.Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Ваша память",
          data: userData,
          borderColor: theme.success,
          backgroundColor: gradientUser,
          borderWidth: 3,
          pointRadius: 2,
          pointBackgroundColor: theme.success,
          pointHoverRadius: 4,
          fill: true,
          tension: 0.4,
        },
        {
          label: "Без повторений",
          data: theoreticalData,
          borderColor: "#e17055",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          labels: {
            color: theme.textColor,
            font: { family: theme.fontFamily },
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1,
          callbacks: {
            label: (context: ChartTooltipContext) =>
              `🧠 ${context.dataset.label}: ${Math.round(context.raw)}%`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: theme.gridColor, drawBorder: false },
          ticks: { color: theme.textColor, font: { family: theme.fontFamily } },
        },
        x: {
          grid: { display: false },
          ticks: { color: theme.textColor, font: { family: theme.fontFamily } },
        },
      },
    },
  });
}

export function renderSRSDistributionChart() {
  const ctx = (
    document.getElementById("srsChart") as HTMLCanvasElement
  )?.getContext("2d");
  if (!ctx) return;
  destroyChart("srs");

  const theme = getChartTheme();
  const counts = [0, 0, 0, 0];
  const data = state.dataStore;
  for (let i = 0; i < data.length; i++) {
    const w = data[i];
    const h = state.wordHistory[w.id];
    if (!h || !h.sm2 || h.sm2.interval === 0) counts[0]++;
    else if (h.sm2.interval < 3) counts[1]++;
    else if (h.sm2.interval < 21) counts[2]++;
    else counts[3]++;
  }

  const totalWords = counts.reduce((a, b) => a + b, 0);

  chartInstances["srs"] = new window.Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Новые", "Изучаю", "Закрепляю", "Выучено"],
      datasets: [
        {
          data: counts,
          backgroundColor: [
            theme.gridColor,
            "rgba(96, 165, 250, 0.8)", // --info
            "rgba(167, 139, 250, 0.9)", // --primary
            "rgba(52, 211, 153, 0.9)", // --success
          ],
          borderColor: theme.tooltipBg, // Use background for separation
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            color: theme.textColor,
            font: { family: theme.fontFamily, size: 12 },
            padding: 20,
          },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.gridColor,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context: ChartTooltipContext) => {
              const val = context.raw as number;
              const total = (context.dataset.data || []).reduce(
                (a: number, b: number) => a + b,
                0,
              );
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${context.label}: ${val} (${pct}%)`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
      },
    },
    plugins: [
      {
        id: "centerText",
        afterDraw: (chart: { ctx?: any; width?: any; height?: any }) => {
          const ctx = chart.ctx;
          const { width, height } = chart;

          ctx.restore();
          const fontSize = (height / 115).toFixed(2);
          ctx.font = `bold ${fontSize}em ${theme.fontFamily}`;
          ctx.textBaseline = "middle";
          ctx.textAlign = "center";

          const text = `${totalWords}`;
          const textX = width / 2;
          const textY = height / 2;

          const label = "слов";
          const labelFontSize = (height / 250).toFixed(2);

          ctx.fillStyle = theme.textColor;
          ctx.fillText(text, textX, textY - height * 0.05);

          ctx.font = `600 ${labelFontSize}em ${theme.fontFamily}`;
          ctx.fillStyle = theme.textColor.replace(")", ", 0.7)");
          ctx.fillText(label, textX, textY + height * 0.08);

          ctx.save();
        },
      },
    ],
  });
}
