import { state } from "../core/state.ts";
import { openModal, openConfirm } from "./ui_modal.ts";
import {
  SHOP_ITEMS,
  DAILY_REWARDS,
  MYSTERY_BOX_REWARDS,
} from "../core/shop_data.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { setAccentColor, applyTheme } from "./ui_settings.ts";
import { scheduleSaveState } from "../core/db.ts";
import { updateStats, addXP } from "../core/stats.ts";
import { ShopItem } from "../types/index.ts";

let currentTab = "all";

function createShopModal() {
  let modal = document.getElementById("shop-modal");
  // Проверяем целостность контента. Если ключевых элементов нет (например, загрузился пустой шаблон), пересоздаем.
  const isContentInvalid =
    !document.getElementById("shop-user-points") ||
    !document.getElementById("shop-items-container");

  if (modal && !isContentInvalid) return;

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "shop-modal";
    modal.className = "modal";
    modal.setAttribute("data-close-modal", "shop-modal");
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
        <div class="modal-content shop-modal-content">
            <div class="shop-header">
                <h2>Магазин</h2>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="shop-points" id="shop-user-points">💰 ${state.userStats.coins || 0}</div>
                    <button class="btn-icon" onclick="window.closeModal('shop-modal')" style="width: 32px; height: 32px; font-size: 16px; background: var(--surface-2);">✕</button>
                </div>
            </div>
            <!-- Daily Reward Section -->
            <div id="daily-reward-section"></div>
            <div class="shop-tabs">
                <button class="shop-tab active" onclick="window.switchShopTab('all')">Все</button>
                <button class="shop-tab" onclick="window.switchShopTab('theme')">Темы</button>
                <button class="shop-tab" onclick="window.switchShopTab('feature')">Улучшения</button>
            </div>
            <div class="shop-items-container" id="shop-items-container">
                <!-- Items will be rendered here -->
            </div>
        </div>
    `;
}

export function openShopModal() {
  createShopModal();
  renderDailyRewardUI();
  updateShopUI();
  openModal("shop-modal");
}

export function switchShopTab(tab: string) {
  currentTab = tab;
  const tabs = document.querySelectorAll(".shop-tab");
  tabs.forEach((t) => {
    if (t.getAttribute("onclick")?.includes(`'${tab}'`)) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });
  updateShopUI();
}

export function updateShopUI() {
  const container = document.getElementById("shop-items-container");
  const pointsEl = document.getElementById("shop-user-points");
  if (!container || !pointsEl) return;

  pointsEl.innerHTML = `💰 ${state.userStats.coins || 0}`;

  const itemsToRender = SHOP_ITEMS.filter((item) => {
    if (currentTab === "all") return true;
    return item.type === currentTab;
  });

  if (itemsToRender.length === 0) {
    container.innerHTML = `<p style="text-align: center; color: var(--text-sub);">В этой категории пока ничего нет.</p>`;
    return;
  }

  container.innerHTML = itemsToRender
    .map((item) => {
      const isPurchased = state.purchasedItems.includes(item.id);
      const isConsumable = item.value === "streak_freeze"; // Особая логика для заморозки
      const canAfford = (state.userStats.coins || 0) >= item.price;
      const isTheme = item.type === "theme";
      const isActiveTheme = isTheme && state.themeColor === item.value;

      let btnHtml = "";
      if (isPurchased && !isConsumable) {
        if (isTheme) {
          if (isActiveTheme) {
            btnHtml = `<button class="btn btn-quiz purchased" disabled>✓ Используется</button>`;
          } else {
            btnHtml = `<button class="btn btn-quiz" onclick="window.applyShopTheme('${item.value}')">Применить</button>`;
          }
        } else {
          btnHtml = `<button class="btn btn-quiz purchased" disabled>✓ Куплено</button>`;
        }
      } else if (isConsumable) {
        const count = state.userStats.streakFreeze || 0;
        btnHtml = `<button class="btn btn-quiz shop-item-buy-btn" onclick="window.buyItem('${item.id}', this)" ${
          !canAfford ? "disabled" : ""
        }>
                💰 ${item.price} <span style="font-size: 0.8em; opacity: 0.8; margin-left: 5px;">(У вас: ${count})</span>
            </button>`;
      } else {
        btnHtml = `<button class="btn btn-quiz shop-item-buy-btn" onclick="window.buyItem('${item.id}', this)" ${
          !canAfford ? "disabled" : ""
        }>
                💰 ${item.price}
            </button>`;
      }

      return `
            <div class="shop-item-card ${
              !canAfford && !isPurchased ? "disabled" : ""
            }" ${
              isTheme
                ? `data-action="preview-theme" data-value="${item.value}"`
                : ""
            }>
                <div class="shop-item-icon">${item.icon}</div>
                <h3 class="shop-item-name">${item.name}</h3>
                <p class="shop-item-desc">${item.description}</p>
                ${btnHtml}
            </div>
        `;
    })
    .join("");
}

export function buyItem(id: string, _btn?: HTMLButtonElement) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return;

  // Если предмет куплен и он НЕ расходуемый (как заморозка), то запрещаем покупку
  if (state.purchasedItems.includes(id) && item.value !== "streak_freeze") {
    showToast("Вы уже купили это улучшение");
    return;
  }

  if ((state.userStats.coins || 0) < item.price) {
    showToast("Недостаточно монет!");
    return;
  }

  openConfirm(
    `Купить «${item.name}» за 💰 ${item.price}?`,
    () => {
      // Re-check in case state changed while confirm modal was open
      if ((state.userStats.coins || 0) < item.price) {
        showToast("Недостаточно монет!");
        return;
      }

      state.userStats.coins = (state.userStats.coins || 0) - item.price;

      if (item.value === "streak_freeze") {
        state.userStats.streakFreeze = (state.userStats.streakFreeze || 0) + 1;
        showToast(
          `❄️ Заморозка добавлена! Всего: ${state.userStats.streakFreeze}`,
        );
      } else if (item.type === "theme") {
        state.purchasedItems.push(item.id);
        showToast(`🎉 Поздравляем! Вы купили «${item.name}»`);
      } else {
        state.purchasedItems.push(item.id);
        showToast(`🎉 Поздравляем! Вы купили «${item.name}»`);
      }

      playTone("cash-register");

      updateShopUI();
      updateStats();
      scheduleSaveState(); // Sync purchase to the cloud
    },
    { confirmText: "Купить", cancelText: "Отмена" },
  );
}

export function applyShopTheme(color: string) {
  setAccentColor(color);
  applyTheme();
  updateShopUI();
  showToast("Тема применена!");
}

// --- Daily Reward Logic ---

function isSameDay(ts1: number, ts2: number): boolean {
  const d1 = new Date(ts1);
  const d2 = new Date(ts2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(ts1: number, ts2: number): boolean {
  const d2 = new Date(ts2);
  const yesterday = new Date(d2);
  yesterday.setDate(d2.getDate() - 1);
  return isSameDay(ts1, yesterday.getTime());
}

/**
 * Calculates the current daily reward streak, accounting for missed days and streak freezes.
 * @returns An object with the current streak count, a flag indicating if a freeze was used, and if it needs to be consumed.
 */
function getDailyRewardStreak(): {
  streak: number;
  savedByFreeze: boolean;
  freezeConsumed: boolean;
} {
  const {
    lastDailyReward,
    dailyRewardStreak = 0,
    streakFreeze = 0,
    lastFreezeDate,
  } = state.userStats;

  // Check if the streak is broken (missed more than one day)
  if (
    lastDailyReward &&
    !isSameDay(lastDailyReward, Date.now()) &&
    !isYesterday(lastDailyReward, Date.now())
  ) {
    const today = new Date().toLocaleDateString("en-CA");
    const lastFreeze = lastFreezeDate
      ? new Date(lastFreezeDate).toLocaleDateString("en-CA")
      : null;
    const freezeUsedToday = lastFreeze === today;

    if (streakFreeze > 0 || freezeUsedToday) {
      // A freeze is available to save the streak.
      return {
        streak: dailyRewardStreak,
        savedByFreeze: true,
        freezeConsumed: !freezeUsedToday,
      };
    }
    // No freeze, so the streak is reset.
    return { streak: 0, savedByFreeze: false, freezeConsumed: false };
  }

  // Streak is not broken.
  return {
    streak: dailyRewardStreak,
    savedByFreeze: false,
    freezeConsumed: false,
  };
}

export function canClaimDailyReward(): boolean {
  const { lastDailyReward } = state.userStats;
  if (!lastDailyReward) return true;
  return !isSameDay(lastDailyReward, Date.now());
}

function renderDailyRewardUI() {
  const section = document.getElementById("daily-reward-section");
  if (!section) return;

  const { streak: currentStreak } = getDailyRewardStreak();
  const isClaimable = canClaimDailyReward();

  const calendarHtml = DAILY_REWARDS.map((reward, index) => {
    const dayNumber = index + 1;
    let classes = "reward-day";
    if (index < currentStreak) {
      classes += " claimed";
    } else if (index === currentStreak && isClaimable) {
      classes += " available";
    } else {
      classes += " future";
    }

    const amountText = reward.type === "mysteryBox" ? "Приз" : reward.amount;

    return `
      <div class="${classes}">
        <div class="day-number">День ${dayNumber}</div>
        <div class="day-icon">${reward.icon}</div>
        <div class="day-amount">${amountText}</div>
      </div>
    `;
  }).join("");

  let actionHtml = "";
  if (isClaimable) {
    actionHtml = `<button id="claim-reward-btn" class="btn btn-quiz" onclick="window.claimDailyReward()">🎁 Получить награду</button>`;
  } else {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    const msUntilTomorrow = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(msUntilTomorrow / (1000 * 60 * 60));
    const minutes = Math.floor(
      (msUntilTomorrow % (1000 * 60 * 60)) / (1000 * 60),
    );
    actionHtml = `<div id="next-reward-timer">Следующая награда через: ${hours}ч ${minutes}м</div>`;
  }

  section.innerHTML = `
    <div class="daily-reward-header">📅 Ежедневная награда</div>
    <div class="daily-reward-calendar">${calendarHtml}</div>
    ${actionHtml}
  `;
}

interface MysteryReward {
  type: string;
  amount?: number;
  message: string;
  item?: ShopItem;
}

function handleMysteryBox(): string {
  const rewardsPool: MysteryReward[] = [...MYSTERY_BOX_REWARDS];
  const unpurchasedThemes = SHOP_ITEMS.filter(
    (item) => item.type === "theme" && !state.purchasedItems.includes(item.id),
  );

  if (unpurchasedThemes.length > 0) {
    const randomTheme =
      unpurchasedThemes[Math.floor(Math.random() * unpurchasedThemes.length)];
    rewardsPool.push({
      type: "theme",
      item: randomTheme,
      message: `🎨 Новая тема: «${randomTheme.name}»!`,
    });
  }

  const reward = rewardsPool[Math.floor(Math.random() * rewardsPool.length)];

  if (reward.type === "coins") {
    state.userStats.coins = (state.userStats.coins || 0) + (reward.amount || 0);
  } else if (reward.type === "xp") {
    addXP(reward.amount || 0);
  } else if (reward.type === "streakFreeze") {
    state.userStats.streakFreeze =
      (state.userStats.streakFreeze || 0) + (reward.amount || 0);
  } else if (reward.type === "theme" && reward.item) {
    const themeItem = reward.item;
    if (!state.purchasedItems.includes(themeItem.id)) {
      state.purchasedItems.push(themeItem.id);
      setAccentColor(themeItem.value);
      applyTheme();
      updateShopUI();
    }
  }

  return `Таинственная коробка! Вы выиграли: ${reward.message}`;
}

export function claimDailyReward() {
  if (!canClaimDailyReward()) {
    showToast("Вы уже получили награду сегодня");
    return;
  }

  const {
    streak: currentStreak,
    savedByFreeze,
    freezeConsumed,
  } = getDailyRewardStreak();

  // If a streak freeze was used, consume it and notify the user.
  if (savedByFreeze) {
    if (freezeConsumed) {
      state.userStats.streakFreeze = (state.userStats.streakFreeze || 1) - 1;
      state.userStats.lastFreezeDate = Date.now();
    }
    showToast("❄️ Заморозка спасла вашу серию ежедневных наград!", 3000);
    playTone("achievement-unlock");
    updateStats(); // To update any UI showing streak freeze count
  }

  const rewardIndex = currentStreak % DAILY_REWARDS.length;
  const reward = DAILY_REWARDS[rewardIndex];

  let rewardMessage = "";
  if (reward.type === "coins") {
    state.userStats.coins = (state.userStats.coins || 0) + reward.amount;
    rewardMessage = `Вы получили ${reward.amount} монет!`;
  } else if (reward.type === "xp") {
    addXP(reward.amount);
    rewardMessage = `Вы получили ${reward.amount} XP!`;
  } else if (reward.type === "streakFreeze") {
    state.userStats.streakFreeze =
      (state.userStats.streakFreeze || 0) + reward.amount;
    rewardMessage = `Вы получили ${reward.amount} заморозку серии!`;
  } else if (reward.type === "mysteryBox") {
    rewardMessage = handleMysteryBox();
  }

  state.userStats.lastDailyReward = Date.now();
  state.userStats.dailyRewardStreak = currentStreak + 1;

  showToast(`🎁 ${rewardMessage}`, 4000);
  playTone("achievement-unlock");
  if (typeof window.confetti === "function") {
    window.confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      zIndex: 20005,
    });
  }

  scheduleSaveState();
  updateStats();
  renderDailyRewardUI();
  updateShopUI(); // Обновляем баланс монет
}

declare global {
  interface Window {
    switchShopTab: typeof switchShopTab;
    buyItem: typeof buyItem;
    claimDailyReward: typeof claimDailyReward;
    applyShopTheme: typeof applyShopTheme;
  }
}

window.switchShopTab = switchShopTab;
window.buyItem = buyItem;
window.claimDailyReward = claimDailyReward;
window.applyShopTheme = applyShopTheme;
