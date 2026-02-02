import { state } from "../core/state.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { openModal } from "./ui_modal.ts";
import { scheduleSaveState } from "../core/db.ts";
import { saveAndRender } from "./ui.ts";

const SHOP_ITEMS = [
  {
    id: "streak_freeze",
    name: "Заморозка серии",
    desc: "Защищает серию (Streak) от сброса, если вы пропустите один день занятий.",
    price: 500,
    icon: "❄️",
    max: 2,
    condition: () => state.userStats.streakFreeze < 2,
  },
  {
    id: "xp_scroll",
    name: "Свиток опыта",
    desc: "Мгновенно добавляет 500 XP к вашему прогрессу.",
    price: 300,
    icon: "📜",
    max: -1, // Unlimited
    condition: () => true,
  },
  {
    id: "survival_heart",
    name: "Сердце выживания",
    desc: "Увеличивает начальное количество жизней в режиме Выживания (+1).",
    price: 1000,
    icon: "❤️",
    max: 3,
    condition: () => (state.userStats.survivalHealth || 0) < 3,
  },
];

export function openShopModal() {
  playTone("cash-register", 400);
  openModal("shop-modal");
}

export function renderShop() {
  const container = document.getElementById("shop-items");
  const balanceEl = document.getElementById("shop-balance");
  if (!container || !balanceEl) return;

  const coins = state.userStats.coins ?? 0;
  balanceEl.innerText = String(coins);
  container.innerHTML = "";

  const rewardEl = document.createElement("div");
  rewardEl.className = "shop-item daily-reward";

  const now = Date.now();
  const lastReward = state.userStats.lastDailyReward || 0;
  const oneDay = 24 * 60 * 60 * 1000;
  const canClaim = now - lastReward >= oneDay;

  const rewardBtnText = canClaim ? "Забрать" : "Завтра";
  const rewardBtnClass = canClaim ? "btn btn-quiz" : "btn";
  // Use global function call
  const rewardAction = canClaim ? `window.claimDailyReward(this)` : "";

  rewardEl.innerHTML = `
        <div class="shop-icon bg-gold">🎁</div>
        <div class="shop-info">
            <div class="shop-title">Ежедневный подарок</div>
            <div class="shop-desc">Заходите каждый день и получайте 100 монет!</div>
        </div>
        <button class="${rewardBtnClass}" ${!canClaim ? "disabled" : ""} onclick="${rewardAction}">${rewardBtnText}</button>
    `;
  container.appendChild(rewardEl);

  SHOP_ITEMS.forEach((item) => {
    const el = document.createElement("div");
    el.className = "shop-item";
    const canBuy = state.userStats.coins >= item.price;
    const limitReached = !item.condition();

    let btnText = `${item.price} 💰`;
    let btnClass = "btn btn-quiz";
    let disabled = false;
    // Use global function call
    let onclick = `window.buyItem('${item.id}', this)`;

    if (limitReached) {
      btnText = "Максимум";
      btnClass = "btn";
      disabled = true;
      onclick = "";
    } else if (!canBuy) {
      btnClass = "btn";
    }

    el.innerHTML = `
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-title">${item.name}</div>
                <div class="shop-desc">${item.desc}</div>
                ${item.id === "streak_freeze" ? `<div class="shop-meta">В наличии: ${state.userStats.streakFreeze} / ${item.max}</div>` : ""}
                ${item.id === "survival_heart" ? `<div class="shop-meta">Уровень: ${state.userStats.survivalHealth || 0} / ${item.max}</div>` : ""}
            </div>
            <button class="${btnClass}" ${disabled ? "disabled" : ""} onclick="${onclick}">${btnText}</button>
        `;
    container.appendChild(el);
  });
}

export function buyItem(id: string, btn?: HTMLElement) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return;

  if (state.userStats.coins >= item.price && item.condition()) {
    const balanceEl = document.getElementById("shop-balance");
    if (btn && balanceEl) {
      animateCoins(balanceEl, btn); // Трата: Баланс -> Предмет
    }

    state.userStats.coins -= item.price;

    if (id === "streak_freeze") {
      state.userStats.streakFreeze++;
      const inventoryTab = document.querySelector(
        ".shop-tab[onclick*='inventory']",
      ) as HTMLElement;
      if (btn && inventoryTab)
        animateItemToTarget(btn, inventoryTab, item.icon);
    }
    if (id === "xp_scroll") {
      import("../core/stats.ts").then((m) => m.addXP(500));
      const xpWidget = document.getElementById("xp-level-widget");
      if (btn && xpWidget) animateItemToTarget(btn, xpWidget, item.icon);
    }
    if (id === "survival_heart") {
      state.userStats.survivalHealth =
        (state.userStats.survivalHealth || 0) + 1;
      const inventoryTab = document.querySelector(
        ".shop-tab[onclick*='inventory']",
      ) as HTMLElement;
      if (btn && inventoryTab)
        animateItemToTarget(btn, inventoryTab, item.icon);
    }

    playTone("success");
    showToast(`Куплено: ${item.name}`);
    scheduleSaveState();
    renderShop();
    import("../core/stats.ts").then((m) => m.updateStats());
  } else {
    playTone("failure");
    showToast("Недостаточно монет или лимит исчерпан");
    if (btn) {
      btn.classList.remove("shake");
      void btn.offsetWidth; // Форсируем перерисовку для перезапуска анимации
      btn.classList.add("shake");
      setTimeout(() => btn.classList.remove("shake"), 500);
    }
  }
}

export function claimDailyReward(btn?: HTMLElement) {
  const now = Date.now();
  const lastReward = state.userStats.lastDailyReward || 0;
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - lastReward >= oneDay) {
    const balanceEl = document.getElementById("shop-balance");
    if (btn && balanceEl) {
      animateCoins(btn, balanceEl); // Награда: Кнопка -> Баланс
    }

    state.userStats.coins += 100;
    state.userStats.lastDailyReward = now;
    playTone("success");
    showToast("🎁 Получено: 100 монет!");
    saveAndRender();
    renderShop();
  }
}

function animateCoins(fromEl: HTMLElement, toEl: HTMLElement) {
  const startRect = fromEl.getBoundingClientRect();
  const endRect = toEl.getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const endX = endRect.left + endRect.width / 2;
  const endY = endRect.top + endRect.height / 2;

  for (let i = 0; i < 10; i++) {
    const coin = document.createElement("div");
    coin.textContent = "🪙";
    coin.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      font-size: 24px;
      z-index: 10000;
      pointer-events: none;
      transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.6s;
      opacity: 1;
    `;
    document.body.appendChild(coin);

    // Небольшой разброс при старте
    const scatterX = (Math.random() - 0.5) * 40;
    const scatterY = (Math.random() - 0.5) * 40;

    // Форсируем отрисовку
    void coin.offsetWidth;

    setTimeout(() => {
      coin.style.transform = `translate(${endX - startX + scatterX}px, ${endY - startY + scatterY}px) scale(0.5)`;
      coin.style.opacity = "0";
    }, i * 50);

    setTimeout(() => coin.remove(), 1000);
  }
}

function animateItemToTarget(
  startEl: HTMLElement,
  targetEl: HTMLElement,
  icon: string,
) {
  const startRect = startEl.getBoundingClientRect();
  const endRect = targetEl.getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2;
  const startY = startRect.top + startRect.height / 2;
  const endX = endRect.left + endRect.width / 2;
  const endY = endRect.top + endRect.height / 2;

  const flyingItem = document.createElement("div");
  flyingItem.textContent = icon;
  flyingItem.style.cssText = `
    position: fixed;
    left: ${startX}px;
    top: ${startY}px;
    font-size: 32px;
    z-index: 10000;
    pointer-events: none;
    transition: transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.8s;
    opacity: 1;
    transform: translate(-50%, -50%);
  `;
  document.body.appendChild(flyingItem);

  // Force reflow
  void flyingItem.offsetWidth;

  const translateX = endX - startX;
  const translateY = endY - startY;

  flyingItem.style.transform = `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) scale(0.5)`;
  flyingItem.style.opacity = "0";

  setTimeout(() => {
    flyingItem.remove();
    targetEl.classList.add("glow-effect");
    setTimeout(() => targetEl.classList.remove("glow-effect"), 600);
  }, 800);
}

export function switchShopTab(tab: string) {
  const tabs = document.querySelectorAll(".shop-tab");
  tabs.forEach((t) => {
    if (t.getAttribute("onclick")?.includes(`'${tab}'`)) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });

  const shopGrid = document.getElementById("shop-items");
  const invGrid = document.getElementById("inventory-items");

  if (tab === "shop") {
    if (shopGrid) shopGrid.style.display = "grid";
    if (invGrid) invGrid.style.display = "none";
    renderShop();
  } else {
    if (shopGrid) shopGrid.style.display = "none";
    if (invGrid) invGrid.style.display = "grid";
    renderInventory();
  }
}

function renderInventory() {
  const container = document.getElementById("inventory-items");
  if (!container) return;
  container.innerHTML = "";

  const items = [];

  if (state.userStats.streakFreeze > 0) {
    items.push({
      name: "Заморозка серии",
      icon: "❄️",
      desc: "Защита от сброса серии",
      count: state.userStats.streakFreeze,
    });
  }

  if ((state.userStats.survivalHealth || 0) > 0) {
    items.push({
      name: "Сердце выживания",
      icon: "❤️",
      desc: "Дополнительные жизни",
      count: state.userStats.survivalHealth,
    });
  }

  if (items.length === 0) {
    container.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; color: var(--text-sub); padding: 40px;">Инвентарь пуст 🤷‍♂️</div>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "shop-item";
    el.innerHTML = `
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-title">${item.name}</div>
                <div class="shop-desc">${item.desc}</div>
                <div class="shop-meta" style="color: var(--primary); font-weight: bold;">В наличии: ${item.count}</div>
            </div>
        `;
    container.appendChild(el);
  });
}

// Expose functions to window for inline onclick handlers
window.buyItem = buyItem;
window.claimDailyReward = claimDailyReward;
