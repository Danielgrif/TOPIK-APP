import { state } from "./state.ts";
import { client } from "./supabaseClient.ts";
import { showToast } from "../utils/utils.ts";
import { setSyncState, syncGlobalStats } from "./sync.ts";

/**
 * Сетевые утилиты: проверка подключения, мониторинг онлайн/офлайн.
 * Выделено из src/app.ts для réduction God Object.
 */

/**
 * Обновляет визуальное состояние подключения к БД.
 */
export function updateDbStatus(status: "active" | "waking" | "error") {
  const el = document.getElementById("db-status-indicator");
  if (!el) return;
  el.classList.remove("active", "waking", "error");
  el.classList.add(status);
  if (status === "active") el.title = "🟢 База данных активна";
  if (status === "waking") el.title = "🟡 Подключение к базе...";
  if (status === "error") el.title = "🔴 Нет соединения с базой";
}

/**
 * Проверяет доступность Supabase API через простой HEAD-запрос.
 * @param timeout Таймаут в миллисекундах (по умолчанию 5000).
 * @returns true, если сервер отвечает, иначе false.
 */
export async function isDatabaseActive(timeout: number = 5000): Promise<boolean> {
  try {
    // @ts-expect-error - supabaseUrl is protected but we need it for health check
    const baseUrl = client.supabaseUrl;
    // @ts-expect-error - supabaseKey is protected but we need it for health check
    const apiKey = client.supabaseKey;
    if (!baseUrl) return false;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(`${baseUrl}/rest/v1/`, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      signal: controller.signal,
      headers: apiKey ? { apikey: apiKey } : {},
    });

    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Инициализирует сетевые слушатели: онлайн/офлайн, качество соединения.
 * Выделено из src/app.ts для уменьшения God Object.
 */
export function setupNetworkListeners(): void {
  let indicator = document.getElementById("offline-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "offline-indicator";
    indicator.textContent = "📡 Нет подключения к интернету";
    document.body.appendChild(indicator);
  }

  const updateStatus = () => {
    if (navigator.onLine) {
      indicator?.classList.remove("visible");
    } else {
      indicator?.classList.add("visible");
    }
  };

  window.addEventListener("online", () => {
    updateStatus();
    showToast("🌐 Соединение восстановлено");
    setSyncState("syncing");
    // Принудительно восстанавливаем Realtime соединение при появлении сети
    client.realtime.connect();
    updateDbStatus("waking");
    isDatabaseActive(5000).then((active) => updateDbStatus(active ? "active" : "error"));
    syncGlobalStats();
    // Запускаем синхронизацию сохранённых заявок
    import("../ui/ui_retry.ts").then((m) => m.syncOfflineRequests());
  });
  window.addEventListener("offline", () => {
    updateStatus();
    showToast("📡 Вы перешли в офлайн режим");
    updateDbStatus("error");
    setSyncState("offline");
  });

  // Слушаем изменения качества соединения (Network Information API)
  // @ts-expect-error Navigator connection API is experimental
  if (navigator.connection) {
    // @ts-expect-error Navigator connection API is experimental
    const conn = navigator.connection;
    conn.addEventListener("change", () => {
      // Если интернет стал хорошим (3g или 4g) и не включена экономия данных
      if (!conn.saveData && ["3g", "4g"].includes(conn.effectiveType)) {
        if (navigator.serviceWorker.controller) {
          console.info("📶 Connection improved. Processing download queue...");
          navigator.serviceWorker.controller.postMessage({
            type: "PROCESS_DOWNLOAD_QUEUE",
          });
          showToast("📶 Интернет улучшился. Докачиваем файлы...");
        }
      }
    });
  }

  // Initial check
  updateStatus();
}

/**
 * Измеряет пинг до Supabase API.
 */
export async function measurePing(): Promise<number> {
  if (!navigator.onLine) {
    state.networkPing = null;
    return -1;
  }
  try {
    // @ts-expect-error - supabaseUrl is protected but we need it for ping check
    const baseUrl = client.supabaseUrl;
    // @ts-expect-error - supabaseKey is protected but we need it for ping check
    const apiKey = client.supabaseKey;
    if (!baseUrl) {
      state.networkPing = null;
      return -1;
    }

    const start = performance.now();
    // Ping the PostgREST root endpoint — returns OpenAPI spec, works for anon without RLS
    const apiUrl = `${baseUrl}/rest/v1/`;

    await fetch(apiUrl, {
      method: "HEAD",
      mode: "cors",
      cache: "no-store",
      headers: apiKey ? { apikey: apiKey } : {},
    });

    state.networkPing = Math.round(performance.now() - start);
    updatePingIndicator();
    return state.networkPing;
  } catch {
    state.networkPing = null;
    updatePingIndicator();
    return -1;
  }
}

/**
 * Обновляет индикатор пинга в UI.
 */
export function updatePingIndicator(): void {
  const el = document.getElementById("ping-indicator");
  if (!el) return;
  const ping = state.networkPing;
  if (ping === null || ping < 0) {
    el.textContent = "Ping: --";
    el.className = "ping-indicator offline";
  } else if (ping < 100) {
    el.textContent = `Ping: ${ping}ms`;
    el.className = "ping-indicator good";
  } else if (ping < 200) {
    el.textContent = `Ping: ${ping}ms`;
    el.className = "ping-indicator warning";
  } else {
    el.textContent = `Ping: ${ping}ms`;
    el.className = "ping-indicator error";
  }
}
