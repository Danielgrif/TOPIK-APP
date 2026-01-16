const CACHE_NAME = 'topik-master-v93'; // Fix API caching
const AUDIO_CACHE_NAME = 'topik-audio-v1'; // Отдельный кэш для аудио
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './favicon.svg',
  './tests.js',
  './test_crossfade.js',
  './js/app.js',
  './js/ui/ui.js',
  './js/ui/ui_card.js',
  './js/ui/ui_modal.js',
  './js/ui/ui_review.js',
  './js/ui/ui_shop.js',
  './js/ui/ui_share.js',
  './js/ui/ui_settings.js',
  './js/ui/ui_hanja.js',
  './js/ui/ui_grammar.js',
  './js/ui/ui_custom_words.js',
  './js/core/state.js',
  './js/core/db.js',
  './js/core/auth.js',
  './js/ui/quiz.js',
  './js/core/speech.js',
  './js/ui/quiz_strategies.js',
  './js/core/stats.js',
  './js/utils/utils.js',
  './js/core/confusing_words.js',
  './js/core/associations.js',
  './js/core/scheduler.js',
  './js/workers/searchWorker.js',
  './js/core/supabaseClient.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js'
];

self.addEventListener('install', (/** @type {any} */ e) => {
  /** @type {any} */ (self).skipWaiting(); // Force activation to fix stale index.html
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    /** @type {any} */ (self).skipWaiting();
  }
});

self.addEventListener('activate', (/** @type {any} */ e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== AUDIO_CACHE_NAME) {
          return caches.delete(key); // Удаляем старый кэш
        }
      }));
    }).then(() => /** @type {any} */ (self).clients.claim()) // Немедленный захват контроля над страницей
  );
});

self.addEventListener('fetch', (/** @type {any} */ e) => {
  const url = new URL(e.request.url);

  // FIX: Игнорируем не-GET запросы (POST) и схемы кроме http/https (chrome-extension)
  if (e.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // FIX: Не кэшируем запросы к API Supabase (данные должны быть свежими)
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // 1. Стратегия для Аудио: Cache First -> Network -> Cache
  // Ловим все .mp3 или запросы к бакету audio-files
  if (url.pathname.endsWith('.mp3') || url.href.includes('/audio-files/')) {
    e.respondWith(
      caches.open(AUDIO_CACHE_NAME).then(cache => {
        return cache.match(e.request).then(response => {
          if (response) return response;
          return fetch(e.request).then(networkResponse => {
            // Если скачали успешно, кладем копию в кэш
            if (networkResponse && networkResponse.status === 200) {
                cache.put(e.request, networkResponse.clone());
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

  // 2. Стратегия для статики: Stale-While-Revalidate (Сначала кэш, потом обновление)
  // Это обеспечивает мгновенную загрузку, а обновления прилетают следующим запуском
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const networkFetch = fetch(e.request).then((networkResponse) => {
        // Кэшируем только успешные ответы (200 OK)
        if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, resClone);
            });
        }
        return networkResponse;
      }).catch((err) => {
        console.error('[SW] Network Error:', url.pathname, err);
        // Если сеть упала, но есть кэш - возвращаем кэш.
        // Если кэша нет - пробрасываем ошибку, чтобы не возвращать undefined
        if (cachedResponse) return cachedResponse;
        throw err;
      });

      return cachedResponse || networkFetch;
    })
  );
});