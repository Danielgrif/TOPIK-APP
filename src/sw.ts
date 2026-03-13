/// <reference lib="webworker" />

import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { registerRoute, NavigationRoute } from "workbox-routing";
import {
  NetworkOnly,
  CacheFirst,
  StaleWhileRevalidate,
} from "workbox-strategies";
import { BackgroundSyncPlugin } from "workbox-background-sync";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { SW_MESSAGES } from "./core/constants.ts";

declare let self: ServiceWorkerGlobalScope;

declare const SUPABASE_URL: string;
declare const SUPABASE_KEY: string;

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

// Кэширование для списков слов (коллекций)
registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") &&
    (url.pathname.includes("/user_lists") ||
      url.pathname.includes("/list_items")),
  new StaleWhileRevalidate({
    cacheName: "api-collections-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7 }), // 1 неделя
    ],
  }),
);

// Кэширование для цитат
registerRoute(
  ({ url }) =>
    url.hostname.includes("supabase.co") && url.pathname.includes("/quotes"),
  new StaleWhileRevalidate({
    cacheName: "api-quotes-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 }), // 1 день
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

self.addEventListener("message", (event) => {
  if (event.data?.type === SW_MESSAGES.SKIP_WAITING) {
    self.skipWaiting();
  }
});

// --- Periodic Background Sync ---

// @ts-expect-error - PeriodicSyncEvent is not in the default lib
self.addEventListener("periodicsync", (event: PeriodicSyncEvent) => {
  if (event.tag === SW_MESSAGES.CONTENT_SYNC) {
    event.waitUntil(performPeriodicSync());
  }
});

async function performPeriodicSync() {
  console.info("[SW] 🔄 Performing periodic background sync...");
  try {
    // Эти переменные заменяются Vite во время сборки (см. vite.config.ts)
    if (!SUPABASE_URL || !SUPABASE_URL.startsWith("http")) {
      console.warn(
        "[SW] Periodic sync skipped: Supabase URL not configured for Service Worker.",
      );
      return;
    }

    const vocabUrl = `${SUPABASE_URL}/rest/v1/vocabulary?select=*`;
    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    };

    // Делаем запрос. Существующий обработчик `registerRoute` для словаря
    // перехватит его и обновит кэш 'api-vocabulary-cache' благодаря стратегии StaleWhileRevalidate.
    await fetch(vocabUrl, { headers });

    console.info("[SW] ✅ Periodic sync successful: Vocabulary cache updated.");
  } catch (error) {
    console.error("[SW] ❌ Periodic sync failed:", error);
  }
}

// Упрощенная и более надежная стратегия для аудио
registerRoute(
  ({ request }) => request.destination === "audio",
  new CacheFirst({
    cacheName: AUDIO_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Кэшируем непрозрачные ответы для CDN
      }),
      new ExpirationPlugin({
        maxEntries: MAX_AUDIO_ITEMS,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        purgeOnQuotaError: true, // Автоматически удаляем при нехватке места
      }),
    ],
  }),
);

// Offline fallback
// Эта страница должна быть в папке public, чтобы попасть в precache-манифест
const handler = createHandlerBoundToURL("/offline.html");
const navigationRoute = new NavigationRoute(handler, {
  denylist: [
    new RegExp("/[^/?]+\\.[^/]+$"), // Игнорируем запросы к файлам с расширениями
  ],
});
registerRoute(navigationRoute);
