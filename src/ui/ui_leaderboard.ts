import { client } from "../core/supabaseClient.ts";
import { state } from "../core/state.ts";
import { openModal } from "./ui_modal.ts";
import { DB_TABLES } from "../core/constants.ts";
import { getRole, getTotalXP } from "../core/stats.ts";
import { escapeHtml, promiseWithTimeout, showToast } from "../utils/utils.ts";
import { isDatabaseActive } from "../core/db.ts";
import type { RealtimeChannel } from "@supabase/supabase-js";

let subscription: RealtimeChannel | null = null;
let currentMode: "weekly" | "all_time" = "weekly";

export async function openLeaderboard() {
  openModal("leaderboard-modal");
  setupLeaderboardTabs();
  await loadLeaderboard();

  // Подписываемся на обновления в реальном времени
  if (!subscription) {
    subscription = client
      .channel("leaderboard_updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: DB_TABLES.USER_GLOBAL_STATS },
        () => {
          // Обновляем только если модальное окно открыто
          if (
            document
              .getElementById("leaderboard-modal")
              ?.classList.contains("active")
          ) {
            loadLeaderboard();
          }
        },
      )
      .subscribe();
  }
}

function setupLeaderboardTabs() {
  const container = document.querySelector("#leaderboard-modal .modal-header");
  if (!container || container.querySelector(".lb-tabs")) return;

  const wrapper = document.createElement("div");
  wrapper.style.display = "flex";
  wrapper.style.alignItems = "center";
  wrapper.style.gap = "10px";
  wrapper.style.marginTop = "10px";
  wrapper.style.width = "100%";

  const tabs = document.createElement("div");
  tabs.className = "lb-tabs segment-control";
  tabs.style.flex = "1";
  tabs.innerHTML = `
    <button class="segment-btn active" data-lb-mode="weekly">Эта неделя</button>
    <button class="segment-btn" data-lb-mode="all_time">Все время</button>
  `;

  const refreshBtn = document.createElement("button");
  refreshBtn.className = "btn-icon";
  refreshBtn.style.width = "36px";
  refreshBtn.style.height = "36px";
  refreshBtn.style.fontSize = "18px";
  refreshBtn.innerHTML = "↻";
  refreshBtn.title = "Обновить";
  refreshBtn.onclick = () => {
    refreshBtn.classList.add("rotating");
    loadLeaderboard().finally(() => {
      setTimeout(() => refreshBtn.classList.remove("rotating"), 500);
    });
  };

  tabs.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      tabs
        .querySelectorAll("button")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMode = btn.dataset.lbMode as "weekly" | "all_time";
      loadLeaderboard();
    };
  });

  wrapper.appendChild(tabs);
  wrapper.appendChild(refreshBtn);
  container.appendChild(wrapper);
}

async function loadLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  // Используем локальный стиль для спиннера, чтобы избежать конфликтов с глобальным лоадером
  container.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column; gap: 15px;">
      <div style="width: 40px; height: 40px; border: 4px solid var(--surface-3); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="font-size: 13px; color: var(--text-sub);">Загрузка данных...</div>
    </div>
  `;

  let isAlive = await isDatabaseActive(2000);
  if (!isAlive) {
    showToast("⏳ База данных просыпается, подождите...");
    await new Promise((r) => setTimeout(r, 2000)); // Ждем 2 секунды
    isAlive = await isDatabaseActive(5000); // Пробуем снова с таймаутом 5 секунд
  }

  try {
    // 1. Загружаем Топ-50
    let query = client
      .from(DB_TABLES.USER_GLOBAL_STATS)
      .select("user_id, xp, weekly_xp, level, full_name, avatar_url, league");

    if (currentMode === "weekly") {
      query = query.order("weekly_xp", { ascending: false });
    } else {
      query = query
        .order("level", { ascending: false })
        .order("xp", { ascending: false });
    }

    query = query.limit(50);

    const { data: top50, error } = (await promiseWithTimeout(
      Promise.resolve(query),
      60000,
      new Error("Timeout"),
    )) as { data: any[] | null; error: any };

    if (error) throw error;

    // 2. Если текущий пользователь не в топе, находим его место
    let myData = null;
    let myRank = 0;
    const currentUserId = state.currentUser?.id;

    if (currentUserId && top50) {
      const inTop = top50.find((u: any) => u.user_id === currentUserId); // Keeping any for now
      if (!inTop) {
        // Загружаем статистику пользователя
        const { data: myStats } = await client
          .from(DB_TABLES.USER_GLOBAL_STATS)
          .select(
            "user_id, xp, weekly_xp, level, full_name, avatar_url, league",
          )
          .eq("user_id", currentUserId)
          .single();

        if (myStats) {
          myData = myStats;
          // Считаем ранг: количество людей, у которых XP больше
          let count = 0;

          if (currentMode === "weekly") {
            const res = await client
              .from(DB_TABLES.USER_GLOBAL_STATS)
              .select("user_id", { count: "exact", head: true })
              .gt("weekly_xp", myStats.weekly_xp);
            count = res.count || 0;
          } else {
            // Для общего рейтинга сложнее: (level > myLevel) OR (level = myLevel AND xp > myXP)
            const resHigherLevel = await client
              .from(DB_TABLES.USER_GLOBAL_STATS)
              .select("user_id", { count: "exact", head: true })
              .gt("level", myStats.level);
            const resSameLevel = await client
              .from(DB_TABLES.USER_GLOBAL_STATS)
              .select("user_id", { count: "exact", head: true })
              .eq("level", myStats.level)
              .gt("xp", myStats.xp);
            count = (resHigherLevel.count || 0) + (resSameLevel.count || 0);
          }

          myRank = count + 1;
        }
      }
    }

    renderLeaderboard(top50 || [], myData, myRank);
  } catch (e) {
    console.error("Leaderboard error:", e);
    const errorMessage =
      e instanceof Error
        ? e.message
        : (e as { message?: string })?.message || String(e);
    container.innerHTML = `
      <div style="text-align:center; padding:30px 20px; color: var(--text-sub);">
        <div style="font-size: 40px; margin-bottom: 10px;">📡</div>
        <div style="margin-bottom: 5px;">Не удалось загрузить таблицу лидеров</div>
        <div style="font-size: 12px; color: var(--danger); margin-bottom: 15px; max-width: 250px; margin-left: auto; margin-right: auto; line-height: 1.4;">${escapeHtml(errorMessage)}</div>
        <button class="btn btn-quiz" onclick="document.querySelector('[data-close-modal=\\'leaderboard-modal\\']').click(); setTimeout(() => import('./ui/ui_leaderboard.ts').then(m => m.openLeaderboard()), 100);">
          ↻ Повторить
        </button>
      </div>`;
  }
}

function renderLeaderboard(data: any[], myData: any | null, myRank: number) {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color: var(--text-sub);">
        <div style="font-size: 40px; margin-bottom: 10px;">🏆</div>
        <div>Пока пусто. Станьте первым!</div>
      </div>`;
    return;
  }

  let html = "";
  const currentUserId = state.currentUser?.id;

  const renderItem = (user: any, rank: number, isMe: boolean) => {
    const name = user.full_name || "Аноним";
    const avatar = user.avatar_url;
    const score =
      currentMode === "weekly"
        ? user.weekly_xp || 0
        : getTotalXP(user.level || 1, user.xp || 0);
    const level = user.level || 1;
    const role = getRole(level);
    const league = user.league || "Bronze";

    // Иконки лиг
    const leagueIcons: Record<string, string> = {
      Bronze: "🥉",
      Silver: "🥈",
      Gold: "🥇",
      Platinum: "💠",
      Diamond: "💎",
      Master: "🔮",
      Grandmaster: "👑",
      Challenger: "👹",
    };
    const leagueIcon = leagueIcons[league] || "🛡️";

    let rankDisplay = `<span class="rank-num">${rank}</span>`;
    let rankClass = "";

    if (rank === 1) {
      rankDisplay = "🥇";
      rankClass = "rank-1";
    } else if (rank === 2) {
      rankDisplay = "🥈";
      rankClass = "rank-2";
    } else if (rank === 3) {
      rankDisplay = "🥉";
      rankClass = "rank-3";
    }

    return `
      <div class="leaderboard-item ${isMe ? "is-me" : ""} ${rankClass}">
          <div class="lb-rank">${rankDisplay}</div>
          <div class="lb-avatar">
              ${avatar ? `<img src="${escapeHtml(avatar)}" alt="Avatar">` : `<div class="lb-avatar-placeholder">${name.charAt(0).toUpperCase()}</div>`}
          </div>
          <div class="lb-info">
              <div class="lb-name">${escapeHtml(name)} ${isMe ? "(Вы)" : ""}</div>
              <div class="lb-meta">
                <span class="lb-league-badge" title="${league}">${leagueIcon}</span>
                <span class="lb-level" style="color: ${role.color}">${role.icon} ${role.name}</span>
              </div>
          </div>
          <div class="lb-xp">${score.toLocaleString()} XP</div>
      </div>
    `;
  };

  // Рендер списка Топ-50
  html += data
    .map((user, index) =>
      renderItem(user, index + 1, user.user_id === currentUserId),
    )
    .join("");

  // Если пользователь не в топе, добавляем разделитель и его самого
  if (myData) {
    html += `
      <div class="leaderboard-separator">
        <span>•</span><span>•</span><span>•</span>
      </div>
    `;
    html += renderItem(myData, myRank, true);
  }

  container.innerHTML = html;
}
