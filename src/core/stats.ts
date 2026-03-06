import { state } from "./state.ts";
import { showToast, playTone, showComboEffect } from "../utils/utils.ts";
import { showLevelUpAnimation } from "../ui/ui_animations.ts";
import { Scheduler } from "./scheduler.ts";
import { scheduleSaveState } from "./db.ts";
import { openModal } from "../ui/ui_modal.ts";

export const LEAGUES = [
  "Bronze",
  "Silver",
  "Gold",
  "Platinum",
  "Diamond",
  "Master",
  "Grandmaster",
  "Challenger",
];

export function getXPForNextLevel(lvl: number): number {
  // Было: 100 + lvl * 50 (Линейная)
  // Стало: 100 * (lvl ^ 1.2) (Слегка экспоненциальная, сложнее на высоких уровнях)
  return Math.floor(100 * Math.pow(lvl, 1.2));
}

export function getTotalXP(level: number, currentXP: number): number {
  let total = currentXP;
  for (let i = 1; i < level; i++) {
    total += getXPForNextLevel(i);
  }
  return total;
}

export function getCurrentWeekId() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getFullYear()}-W${weekNo}`;
}

export function checkWeeklyReset() {
  const currentWeek = getCurrentWeekId();

  // Инициализация, если запускается впервые
  if (!state.userStats.lastWeekId) {
    state.userStats.lastWeekId = currentWeek;
    return null;
  }

  if (state.userStats.lastWeekId !== currentWeek) {
    const prevXp = state.userStats.weeklyXp || 0;
    const oldLeague = state.userStats.league || "Bronze";
    let newLeague = oldLeague;

    const idx = LEAGUES.indexOf(oldLeague);
    if (idx !== -1) {
      // Пороги повышения (XP за неделю для перехода на уровень выше)
      const promoThresholds = [
        300,
        600,
        1000,
        1500,
        2000,
        3000,
        5000,
        Infinity,
      ];
      // Пороги понижения (Если XP меньше этого, падаем вниз)
      const demoThresholds = [0, 50, 150, 300, 500, 800, 1200, 2000];

      if (idx < LEAGUES.length - 1 && prevXp >= promoThresholds[idx]) {
        newLeague = LEAGUES[idx + 1];
      } else if (idx > 0 && prevXp < demoThresholds[idx]) {
        newLeague = LEAGUES[idx - 1];
      }
    }

    state.userStats.weeklyXp = 0;
    state.userStats.lastWeekId = currentWeek;
    state.userStats.league = newLeague;
    scheduleSaveState();

    return { oldLeague, newLeague, prevXp };
  }
  return null;
}

export function processWeeklyResetUI() {
  const result = checkWeeklyReset();
  if (result) {
    const { oldLeague, newLeague, prevXp } = result;
    setTimeout(() => {
      if (newLeague !== oldLeague) {
        const isPromo = LEAGUES.indexOf(newLeague) > LEAGUES.indexOf(oldLeague);
        const msg = isPromo
          ? `🎉 Повышение лиги!\n${oldLeague} ➡ ${newLeague}`
          : `📉 Понижение лиги...\n${oldLeague} ➡ ${newLeague}`;
        showComboEffect(msg);
        playTone(isPromo ? "achievement-unlock" : "failure");
        if (isPromo && typeof window.confetti === "function") {
          window.confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        }
      } else {
        showToast(`📅 Новая неделя! Итог прошлой: ${prevXp} XP`);
      }
    }, 1500); // Задержка, чтобы интерфейс успел загрузиться
  }
}

export function addXP(val: number) {
  const resetResult = checkWeeklyReset();

  // Если сброс произошел во время начисления опыта (например, сессия через полночь)
  if (resetResult) {
    const { oldLeague, newLeague } = resetResult;
    if (newLeague !== oldLeague) {
      const isPromo = LEAGUES.indexOf(newLeague) > LEAGUES.indexOf(oldLeague);
      showComboEffect(
        isPromo ? `🎉 Лига: ${newLeague}!` : `📉 Лига: ${newLeague}`,
      );
    }
  }

  state.userStats.xp = (state.userStats.xp || 0) + val;
  if (val > 0) {
    state.userStats.weeklyXp = (state.userStats.weeklyXp || 0) + val;
  }
  if (val > 0) state.userStats.coins = (state.userStats.coins || 0) + val;

  let currentLevel = Number(state.userStats.level || 1);
  const oldRole = getRole(currentLevel);
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

  const newRole = getRole(currentLevel);
  if (newRole.name !== oldRole.name) {
    setTimeout(() => {
      showComboEffect(`🏆 Новое звание: ${newRole.name}!`);
      playTone("achievement-unlock");
      if (typeof window.confetti === "function") {
        window.confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.6 },
        });
      }
    }, 1000); // Show after level up animation
  }

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

  const role = getRole(lvl);
  const xpLabel = document.querySelector("#xp-level-widget .xp-label");
  if (xpLabel) {
    xpLabel.textContent = `${role.icon} LVL`;
  }

  const bar = document.getElementById("xp-fill");
  if (bar) {
    const pct = Math.min(100, Math.max(0, (xp / denom) * 100));
    if (bar.tagName === "path" || bar.tagName === "PATH") {
      bar.setAttribute("stroke-dasharray", `${pct}, 100`);
      bar.style.stroke = role.color;
    } else {
      bar.style.width = `${pct}%`;
      bar.style.backgroundColor = role.color;
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
                <div class="stat-card-primary">
                    <div class="stat-chart-wrapper">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle-fill" stroke="${s.color}" stroke-dasharray="${s.value}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="stat-chart-text" style="color: ${s.color}">${s.value}%</div>
                    </div>
                    <div class="stat-label-primary">${s.label}</div>
                </div>
            `;
        }
        return `
          <div class="stat-card-primary">
              <div class="stat-icon-primary" style="background: ${s.color}20; color: ${s.color};">${s.icon}</div>
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
        <div class="topic-mastery-card">
            <div class="topic-header"><span class="topic-name">${topic}</span> <span class="topic-pct">${pct}%</span></div>
            <div class="topic-progress">
                <div class="topic-bar" style="width: ${pct}%; background-color: hsl(${pct * 1.2}, 70%, 50%);"></div>
            </div>
            <div class="topic-stats">${stats.learned} из ${stats.total} слов</div>
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
    <div id="streak-calendar-card" class="streak-calendar-card">
      <div class="streak-info">
        <div class="streak-icon-lg">🔥</div>
        <div>
          <div class="streak-label">Текущая серия</div>
          <div class="streak-value">${state.streak.count} дн.</div>
        </div>
      </div>
      <div class="streak-days-grid">
        ${days
          .map(
            (d) => `
          <div class="streak-day-col">
            <div class="streak-day-name">${d.day}</div>
            <div class="streak-day-circle ${d.active ? "active" : ""} ${d.isToday ? "today" : ""}">
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
      <button class="btn" data-action="open-mistakes" style="width: 100%; margin-bottom: 24px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid var(--danger);">
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
      <div class="charts-grid">
        <div class="chart-card">
          <h3 class="chart-title">📊 Активность (7 дней)</h3>
          <div class="chart-container">
            <canvas id="activityChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">📅 Изучено слов</h3>
          <div class="chart-container">
            <canvas id="learnedChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🧠 Распределение SRS</h3>
          <div class="chart-container">
            <canvas id="srsChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">📉 Кривая забывания</h3>
          <div class="chart-container">
            <canvas id="forgettingChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🎯 Точность сессий</h3>
          <div class="chart-container">
            <canvas id="accuracyChart"></canvas>
          </div>
        </div>
      </div>
    `;
  } else {
    container.insertAdjacentHTML("afterbegin", streakHtml + additionalHtml);
  }

  // FIX: Явно вызываем рендеринг графиков после вставки HTML
  requestAnimationFrame(() => {
    renderActivityChart();
    renderLearnedChart();
    renderSRSDistributionChart();
    renderForgettingCurve();
    renderAccuracyChart();
  });
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
        duration: 2000,
        easing: "easeOutQuart",
        delay: (context: any) => {
          let delay = 0;
          if (context.type === "data" && context.mode === "default") {
            delay = context.dataIndex * 100 + context.datasetIndex * 100;
          }
          return delay;
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
      animation: {
        duration: 1500,
        easing: "easeOutBounce",
        delay: (context: any) => {
          let delay = 0;
          if (context.type === "data" && context.mode === "default") {
            delay = context.dataIndex * 150;
          }
          return delay;
        },
      },
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
      animation: {
        duration: 2000,
        easing: "easeOutCubic",
        y: {
          from: (ctx: any) => (ctx.type === "data" ? 0 : null),
        },
      },
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
      animation: {
        duration: 2500,
        easing: "easeInOutQuart",
        loop: false,
      },
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
      animation: {
        animateRotate: true,
        animateScale: true,
        duration: 1500,
        easing: "easeOutCirc",
      },
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

export const ROLES = [
  { minLevel: 100, name: "Божество", icon: "👑", color: "#FFD700" },
  { minLevel: 75, name: "Титан", icon: "⚡", color: "#E11D48" },
  { minLevel: 50, name: "Легенда", icon: "🏆", color: "#9333EA" },
  { minLevel: 40, name: "Мудрец", icon: "📜", color: "#2563EB" },
  { minLevel: 30, name: "Грандмастер", icon: "🔮", color: "#059669" },
  { minLevel: 20, name: "Мастер", icon: "🥋", color: "#0D9488" },
  { minLevel: 15, name: "Эксперт", icon: "🎓", color: "#CA8A04" },
  { minLevel: 10, name: "Знаток", icon: "🧠", color: "#EA580C" },
  { minLevel: 5, name: "Студент", icon: "📚", color: "#4F46E5" },
  { minLevel: 3, name: "Ученик", icon: "📝", color: "#64748B" },
  { minLevel: 0, name: "Новичок", icon: "🌱", color: "#94A3B8" },
];

export function getRole(lvl: number) {
  return ROLES.find((r) => lvl >= r.minLevel) || ROLES[ROLES.length - 1];
}

export function openRolesModal() {
  let modal = document.getElementById("roles-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "roles-modal";
    modal.className = "modal";
    modal.setAttribute("data-close-modal", "roles-modal");
    document.body.appendChild(modal);
  }

  const currentLevel = state.userStats.level;
  const currentRole = getRole(currentLevel);
  const currentRoleIndex = ROLES.indexOf(currentRole);
  const nextRole = currentRoleIndex > 0 ? ROLES[currentRoleIndex - 1] : null;

  let progressHtml = "";
  if (nextRole) {
    const prevRoleMinLevel = currentRole.minLevel;
    const nextRoleMinLevel = nextRole.minLevel;
    const totalLevels = nextRoleMinLevel - prevRoleMinLevel;
    const gainedLevels = currentLevel - prevRoleMinLevel;
    const percent = Math.min(
      100,
      Math.max(0, (gainedLevels / totalLevels) * 100),
    );
    const levelsLeft = nextRoleMinLevel - currentLevel;

    progressHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background: var(--surface-2); border-radius: 16px; text-align: center; border: 1px solid var(--border-color);">
        <div style="font-size: 13px; color: var(--text-sub); margin-bottom: 10px;">
          До звания <strong style="color: ${nextRole.color}">${nextRole.name}</strong> осталось уровней: <strong>${levelsLeft}</strong>
        </div>
        <div class="xp-bar-container" style="height: 10px; background: var(--surface-3); border-radius: 5px; overflow: hidden; position: relative;">
          <div class="xp-bar-fill" style="width: ${percent}%; background: ${nextRole.color}; height: 100%; transition: width 0.5s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-tertiary); font-weight: 600;">
          <span>${currentRole.icon} ${currentRole.name} (L${prevRoleMinLevel})</span>
          <span>${nextRole.icon} ${nextRole.name} (L${nextRoleMinLevel})</span>
        </div>
      </div>
    `;
  } else {
    progressHtml = `
      <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, var(--surface-2), var(--surface-1)); border-radius: 16px; text-align: center; border: 1px solid var(--gold);">
        <div style="font-size: 24px; margin-bottom: 5px;">👑</div>
        <div style="font-size: 15px; font-weight: 800; color: var(--gold);">Вы достигли вершины!</div>
        <div style="font-size: 12px; color: var(--text-sub);">Вы — легенда этого мира.</div>
      </div>
    `;
  }

  // Отображаем от меньшего к большему, чтобы был виден путь
  const rolesList = [...ROLES].reverse();

  const rolesHtml = rolesList
    .map((role) => {
      const isCurrent =
        currentLevel >= role.minLevel &&
        ROLES.find((r) => currentLevel >= r.minLevel) === role;
      const isUnlocked = currentLevel >= role.minLevel;

      return `
            <div class="role-item" style="
                display: flex; 
                align-items: center; 
                padding: 12px; 
                margin-bottom: 8px; 
                background: var(--surface-2); 
                border-radius: 12px; 
                border: 2px solid ${isCurrent ? role.color : "transparent"};
                opacity: ${isUnlocked ? 1 : 0.5};
                filter: ${isUnlocked ? "none" : "grayscale(0.8)"};
            ">
                <div style="font-size: 24px; margin-right: 15px; width: 40px; text-align: center;">${role.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 800; color: var(--text-main);">${role.name}</div>
                    <div style="font-size: 12px; color: var(--text-sub);">Уровень ${role.minLevel}+</div>
                </div>
                ${isCurrent ? `<div style="font-size: 11px; font-weight: bold; color: white; background: ${role.color}; padding: 4px 8px; border-radius: 8px;">Вы здесь</div>` : ""}
                ${!isUnlocked ? `<div style="font-size: 16px;">🔒</div>` : ""}
            </div>
        `;
    })
    .join("");

  modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>🏆 Звания</h3>
                <button class="btn btn-icon close-modal-btn" data-close-modal="roles-modal">✕</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;">
                ${progressHtml}
                ${rolesHtml}
            </div>
        </div>
    `;

  openModal("roles-modal");
}
