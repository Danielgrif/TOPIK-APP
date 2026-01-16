import { state } from "../core/state.ts";
import { showToast, playTone } from "../utils/utils.ts";
import { openModal } from "./ui_modal.ts";
import { scheduleSaveState } from "../core/db.ts";
import { saveAndRender } from "./ui.ts";
import { updateStats } from "../core/stats.ts";

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
];

export function openShopModal() {
  renderShop();
  openModal("shop-modal");
}

function renderShop() {
  const container = document.getElementById("shop-items");
  const balanceEl = document.getElementById("shop-balance");
  if (!container || !balanceEl) return;

  balanceEl.innerText = String(state.userStats.coins);
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
  const rewardAction = canClaim ? `window.claimDailyReward()` : "";

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
    let onclick = `window.buyItem('${item.id}')`;

    if (limitReached) {
      btnText = "Максимум";
      btnClass = "btn";
      disabled = true;
      onclick = "";
    } else if (!canBuy) {
      btnClass = "btn";
      disabled = true;
      onclick = "";
    }

    el.innerHTML = `
            <div class="shop-icon">${item.icon}</div>
            <div class="shop-info">
                <div class="shop-title">${item.name}</div>
                <div class="shop-desc">${item.desc}</div>
                ${item.id === "streak_freeze" ? `<div class="shop-meta">В наличии: ${state.userStats.streakFreeze} / ${item.max}</div>` : ""}
            </div>
            <button class="${btnClass}" ${disabled ? "disabled" : ""} onclick="${onclick}">${btnText}</button>
        `;
    container.appendChild(el);
  });
}

export function buyItem(id: string) {
  const item = SHOP_ITEMS.find((i) => i.id === id);
  if (!item) return;

  if (state.userStats.coins >= item.price && item.condition()) {
    state.userStats.coins -= item.price;

    if (id === "streak_freeze") {
      state.userStats.streakFreeze++;
    }

    playTone("success");
    showToast(`Куплено: ${item.name}`);
    scheduleSaveState();
    renderShop();
    updateStats();
  } else {
    showToast("Недостаточно монет или лимит исчерпан");
  }
}

export function claimDailyReward() {
  const now = Date.now();
  const lastReward = state.userStats.lastDailyReward || 0;
  const oneDay = 24 * 60 * 60 * 1000;

  if (now - lastReward >= oneDay) {
    state.userStats.coins += 100;
    state.userStats.lastDailyReward = now;
    playTone("success");
    showToast("🎁 Получено: 100 монет!");
    saveAndRender();
    renderShop();
  }
}

// Expose functions to window for inline onclick handlers
window.buyItem = buyItem;
window.claimDailyReward = claimDailyReward;
window.buyItem = buyItem;
window.claimDailyReward = claimDailyReward;
