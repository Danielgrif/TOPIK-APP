import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST);

const CACHE_VERSION = 'v93';
const AUDIO_CACHE_NAME = 'topik-audio-v1';
const MAX_AUDIO_ITEMS = 200;

async function trimCache(cacheName: string, maxItems: number) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

self.addEventListener('fetch', (e: FetchEvent) => {
  const url = new URL(e.request.url);

  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Стратегия Cache First для аудио с обновлением в фоне (Stale-While-Revalidate) для надежности,
  // либо Cache First с fallback на сеть. Текущая реализация Cache First.
  if (url.pathname.endsWith('.mp3') || url.href.includes('/audio-files/')) {
    e.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(e.request).then(response => {
          if (response) return response;
          return fetch(e.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                cache.put(e.request, networkResponse.clone());
                trimCache(AUDIO_CACHE_NAME, MAX_AUDIO_ITEMS);
            }
            return networkResponse;
          });
        });
      }).catch((err) => {
        console.error('[SW] Audio Error:', err);
        return new Response(null, { status: 404, statusText: 'Audio Not Found' });
      })
    );
    return;
  }
});