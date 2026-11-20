/// <reference types="vitest" />
import { defineConfig, loadEnv, type UserConfig } from "vite";

import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  return {
    // Глобальные константы для Service Worker (src/sw.ts).
    // Значения берутся только из VITE_* — серверные секреты сюда не попадают.
    define: {
      SUPABASE_URL: JSON.stringify(env.VITE_SUPABASE_URL ?? ""),
      SUPABASE_KEY: JSON.stringify(env.VITE_SUPABASE_KEY ?? ""),
    },
    plugins: [
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        injectRegister: false,
        scope: "/",
        includeAssets: ["app-logo.svg", "offline.html", "favicon.svg"],
        manifest: {
          name: "TOPIK II Master Pro",
          short_name: "TOPIK Pro",
          description: "Приложение для подготовки к экзамену TOPIK II",
          lang: "ru",
          id: "/",
          start_url: "/",
          scope: "/",
          theme_color: "#6c5ce7",
          background_color: "#f5f3ff",
          display: "standalone",
          orientation: "portrait-primary",
          categories: ["education", "productivity"],
          icons: [
            {
              src: "/app-logo.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: "module",
        },
        workbox: {
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/html2canvas\.hertzen\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "html2canvas-cache",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 365 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            // Кэширование Supabase API для офлайн-доступа
            {
              urlPattern: /^https:\/\/[^.]+\.supabase\.co\/rest\/v1\/.*/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "supabase-api-cache",
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24, // 24 часа
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    base: "/",
    server: {
      host: "localhost",
      port: 5173,
      hmr: {
        protocol: "ws",
        host: "localhost",
      },
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-charts": ["chart.js"],
            "vendor-confetti": ["canvas-confetti"],
          },
        },
      },
    },
    test: {
      globals: true,
      environment: "node",
      setupFiles: ["src/test-setup.ts"],
      include: ["src/**/*.{test,spec}.{js,ts}"],
      coverage: {
        provider: "v8",
        reporter: ["text", "json", "html"],
        include: ["src/**/*.{js,ts}"],
        exclude: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/types/**"],
        all: true,
      },
    },
  } as UserConfig;
});
