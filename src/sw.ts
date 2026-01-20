/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { NetworkOnly, CacheFirst } from "workbox-strategies";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

const AUDIO_CACHE_NAME = "topik-audio-v1";
const MAX_AUDIO_ITEMS = 200;
const FONT_CACHE_NAME = "font-cache-v1";
const IMAGE_CACHE_NAME = "topik-images-v1";

// Кэширование шрифтов с CDN
registerRoute(
  ({ url }) => url.hostname === 'cdn.jsdelivr.net',
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
  })
);

// Кэширование изображений из Supabase Storage
registerRoute(
  ({ url }) => url.hostname.includes("supabase.co") && url.pathname.includes("/storage/v1/object/public/image-files/"),
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
  })
);

// Настройка Background Sync
const bgSyncPlugin = new BackgroundSyncPlugin('supabase-queue', {
  maxRetentionTime: 24 * 60 // Повторять попытки в течение 24 часов (в минутах)
});

// Перехватываем запросы на изменение данных в Supabase (POST, PUT, PATCH, DELETE)
registerRoute(
  ({ url, request }) => url.hostname.includes("supabase.co") && request.method !== 'GET',
  new NetworkOnly({
    plugins: [bgSyncPlugin]
  })
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
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
