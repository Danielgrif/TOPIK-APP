/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    // Если деплоите на https://<USERNAME>.github.io/<REPO>/, раскомментируйте и укажите имя репозитория:
    // base: '/<REPO>/',
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      scope: '/',
      manifest: {
        name: 'TOPIK II Master Pro',
        short_name: 'TOPIK Pro',
        description: 'Приложение для подготовки к экзамену TOPIK II',
        theme_color: '#6c5ce7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/app-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],
  build: {
    target: 'esnext'
  },
  // @ts-ignore
  test: { // This is a Vitest specific configuration, not a standard Vite config property.
          // Ignoring TypeScript error as it's handled by Vitest.
    globals: true, 
    environment: 'happy-dom', 
    include: ['src/**/*.{test,spec}.{js,ts}'], 
    coverage: { 
      provider: 'v8', 
      reporter: ['text', 'json', 'html'], 
      include: ['src/**/*.{js,ts}'], 
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/types/**'], 
      all: true 
    }
  }
});