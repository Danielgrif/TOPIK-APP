/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import {
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

const SW_MESSAGES = {
  SKIP_WAITING: "SKIP_WAITING",
  PROCESS_DOWNLOAD_QUEUE: "PROCESS_DOWNLOAD_QUEUE",
  DOWNLOAD_QUEUE_COMPLETED: "DOWNLOAD_QUEUE_COMPLETED",
};

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

const AUDIO_CACHE_NAME = "topik-audio-v1";
const MAX_AUDIO_ITEMS = 200;
const FONT_CACHE_NAME = "font-cache-v1";
const IMAGE_CACHE_NAME = "topik-images-v1";
const STATIC_CACHE_NAME = "static-resources-v1";

// Кэширование шрифтов с CDN
registerRoute(
  ({ url }) => url.hostname === "cdn.jsdelivr.net",
  new CacheFirst({
    cacheName: FONT_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Кэшируем непрозрачные ответы от CDN
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 год
        maxEntries: 30,
      }),
    ],
  }),
);

// Кэширование локальных статических ресурсов (иконки, манифест)
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    /\.(png|jpg|jpeg|svg|ico|json|webmanifest)$/i.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
      }),
    ],
  }),
);

// Кэширование изображений из Supabase Storage
registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/storage/v1/object/public/image-files/"),
  new CacheFirst({
    cacheName: IMAGE_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 дней
        maxEntries: 100,
      }),
    ],
  }),
);

// Кэширование данных словаря (API Supabase)
// Используем StaleWhileRevalidate: отдаем кэш сразу, а в фоне обновляем его
registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") &&
    url.pathname.includes("/vocabulary"),
  new StaleWhileRevalidate({
    cacheName: "api-vocabulary-cache",
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1, // Нам нужен только последний актуальный слепок базы
        maxAgeSeconds: 60 * 60 * 24 * 14, // Хранить 2 недели
      }),
    ],
  }),
);

// Настройка Background Sync
const bgSyncPlugin = new BackgroundSyncPlugin("supabase-queue", {
  maxRetentionTime: 24 * 60, // Повторять попытки в течение 24 часов (в минутах)
});

// Перехватываем запросы на изменение данных в Supabase (POST, PUT, PATCH, DELETE)
registerRoute(
  ({ url, request }) =>
    url.hostname.includes("supabase.co") && request.method !== "GET",
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
);

// --- Очередь отложенных загрузок (IndexedDB) ---
const QUEUE_DB_NAME = "offline-queue-db";
const QUEUE_STORE = "downloads";

function openQueueDB() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(QUEUE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(QUEUE_STORE)) {
        req.result.createObjectStore(QUEUE_STORE, { keyPath: "url" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function addToQueue(url: string) {
  try {
    const db = await openQueueDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put({ url, added: Date.now() });
  } catch (e) {
    console.error("[SW] Queue add failed", e);
  }
}

async function processDownloadQueue() {
  try {
    const db = await openQueueDB();
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    const req = store.getAll();

    req.onsuccess = async () => {
      const items = req.result as { url: string }[];
      if (items.length === 0) return;

      // Очищаем очередь перед началом, чтобы избежать зацикливания
      const clearTx = db.transaction(QUEUE_STORE, "readwrite");
      clearTx.objectStore(QUEUE_STORE).clear();

      const cache = await caches.open(AUDIO_CACHE_NAME);

      // Скачиваем файлы последовательно
      for (const item of items) {
        try {
          // fetch внутри SW не проходит через fetch-слушатель SW, поэтому не будет заблокирован проверкой скорости
          const resp = await fetch(item.url);
          if (resp.ok) {
            await cache.put(item.url, resp);
          }
        } catch (e) {
          console.error(`[SW] Retry failed for ${item.url}`, e);
        }
      }

      // Сообщаем клиентам, что загрузка завершена (опционально)
      const clients = await self.clients.matchAll();
      clients.forEach((client) =>
        client.postMessage({
          type: SW_MESSAGES.DOWNLOAD_QUEUE_COMPLETED,
          count: items.length,
        }),
      );
    };
  } catch (e) {
    console.error("[SW] Queue process failed", e);
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === SW_MESSAGES.SKIP_WAITING) {
    self.skipWaiting();
  }
  if (event.data && event.data.type === SW_MESSAGES.PROCESS_DOWNLOAD_QUEUE) {
    processDownloadQueue();
  }
});

async function trimCache(cacheName: string, maxItems: number) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

self.addEventListener("fetch", (e: FetchEvent) => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Стратегия Cache First для аудио с обновлением в фоне (Stale-While-Revalidate) для надежности,
  // либо Cache First с fallback на сеть. Текущая реализация Cache First.
  if (url.pathname.endsWith(".mp3") || url.href.includes("/audio-files/")) {
    e.respondWith(
      caches
        .open(AUDIO_CACHE_NAME)
        .then((cache) => {
          return cache.match(e.request).then((response) => {
            if (response) return response;

            // 🐌 Проверка скорости сети: пропускаем загрузку тяжелых файлов на медленном интернете
            // @ts-expect-error Navigator connection API is experimental
            const conn = navigator.connection;
            if (
              conn &&
              (conn.saveData || ["slow-2g", "2g"].includes(conn.effectiveType))
            ) {
              addToQueue(e.request.url); // Добавляем в очередь на будущее
              return new Response(null, {
                status: 503,
                statusText: "Skipped due to slow connection",
              });
            }

            return fetch(e.request).then((networkResponse) => {
              if (
                networkResponse &&
                networkResponse.status === 200 &&
                networkResponse.type === "basic"
              ) {
                cache.put(e.request, networkResponse.clone());
                trimCache(AUDIO_CACHE_NAME, MAX_AUDIO_ITEMS);
              }
              return networkResponse;
            });
          });
        })
        .catch((err) => {
          console.error("[SW] Audio Error:", err);
          return new Response(null, {
            status: 404,
            statusText: "Audio Not Found",
          });
        }),
    );
    return;
  }

  // Игнорируем остальные запросы к Supabase (API, Auth и т.д.), чтобы они шли напрямую в сеть
  if (url.hostname.includes("supabase.co")) {
    return;
  }
});
