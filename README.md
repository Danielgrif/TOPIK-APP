# 🇰🇷 TOPIK Master Pro

Приложение для подготовки к экзамену TOPIK II (Korean Language Proficiency Test) с использованием AI, интервального повторения (SRS) и геймификации.

## 🚀 Технологический стек

### Frontend

- **Сборщик:** [Vite](https://vitejs.dev/)
- **Язык:** TypeScript (Strict Mode)
- **UI Архитектура:** Vanilla JS + `BaseComponent` (Custom Component Pattern)
- **Стили:** Modular CSS + CSS Variables
- **PWA:** `vite-plugin-pwa` (Workbox) для офлайн-режима
- **Тесты:** Vitest
- **Линтинг:** ESLint + Prettier

### Backend & Cloud (Supabase)

- **База данных:** PostgreSQL
- **Аутентификация:** Supabase Auth (Email, Google)
- **Хранилище:** Supabase Storage (Audio, Images)
- **Serverless:** Supabase Edge Functions (Deno + TypeScript)
- **Безопасность:** RLS (Row Level Security), JWT на всех Edge Functions

### AI Features

- **Writing AI:** Проверка эссе и исправление ошибок (Gemini).
- **TTS/Speech:** Генерация озвучки и распознавание речи.
- **Content Gen:** Автоматическая генерация примеров и контента.

---

## 🏗️ Архитектура Проекта

Проект разделен на четкие слои ответственности:

### 1. Core (`src/core/`)

Бизнес-логика, не зависящая от UI.

- **`state.ts`**: Глобальное состояние и система событий (Pub/Sub `notify`/`subscribe`).
- **`db.ts`**: Взаимодействие с Supabase и локальным кэшем (LocalStorage, IndexedDB).
- **`scheduler.ts`**: Алгоритм интервального повторения (SM-2/FSRS).
- **`auth.ts`**: Логика авторизации.
- **`stats.ts`**: Расчёт XP, уровней, лиг.
- **`session.ts`**: Управление учебной сессией (пауза/возобновление/завершение).
- **`sync.ts`**: Синхронизация с облаком с durable outbox.

### 2. UI (`src/ui/`)

Компоненты интерфейса.

- **`BaseComponent.ts`**: Базовый класс для всех UI-контроллеров. Управляет жизненным циклом (`init`, `destroy`) и подписками.
- **Контроллеры:** `ui_shop.ts`, `ui_writing.ts`, `ui_quiz.ts` и др. наследуются от `BaseComponent`.
- **`component_loader.ts`**: Инъекция HTML-шаблонов и инициализация компонентов.

### 3. Backend Functions (`supabase/functions/`)

Серверный код на Deno.

- **`check-essay`**: Проверка корейского эссе через Gemini.
- **`generate-word-data`**: AI-генерация переводов и примеров.
- **`generate-media-for-word`**: Генерация аудио и изображений.
- **`regenerate-image`**: Перегенерация изображений.
- **`process-word-request` / `retry-word-request`**: Обработка заявок на слова.
- **`delete-user`**: Удаление пользователя.
- **`submit-feedback`**: Обратная связь с вложениями.
- **`get-feedback-reports` / `update-feedback-status`**: Администрирование отзывов.
- **`background-worker`**: Фоновые задачи.
- **`ocr-image`**: Распознавание корейского текста с изображения через Gemini Vision.

---

## 🛠️ Установка и Запуск

### Предварительные требования

- Node.js (v18+)
- Deno (для разработки Edge Functions)
- Supabase CLI (опционально, для локальной разработки функций)

### 1. Клонирование и установка зависимостей

```bash
git clone <repo_url>
cd topik-app
npm install
```

### 2. Настройка окружения

Создайте файл `.env` в корне проекта на основе `.env.example`:

```bash
cp .env.example .env
```

Заполните переменные:

```env
# Публичные переменные (попадают в бандл — не секреты)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key

# Секретные переменные (только на сервере)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
```

> ⚠️ **Важно:** `VITE_*` переменные встраиваются в клиентский бандл при сборке. Секретные ключи (`SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`) должны храниться только на сервере.

### 3. Применение миграции базы данных

Перед первым запуском в продакшене примените миграцию RLS:

```bash
# Через Supabase CLI
supabase db push

# Или вручную через Supabase SQL Editor — содержимое файла:
# supabase/migrations/0001_initial_rls.sql
```

Мigration включает:
- RLS на всех таблицах (`vocabulary`, `user_progress`, `user_global_stats`, `feedback_reports` и др.)
- Политики доступа: публичное чтение справочников, пользовательские строки только владельцу
- Админ-доступ через `public.is_admin()` (SECURITY DEFINER)
- Политики Storage для бакетов `audio-files`, `image-files`, `feedback_attachments`

### 4. Запуск локального сервера

```bash
npm run dev
```

### 5. Сборка для продакшена

```bash
npm run build
```

Собранные файлы окажутся в папке `dist/`.

---

## 🔧 Разработка Edge Functions

Функции находятся в папке `supabase/functions`. VS Code настроен (`.vscode/settings.json`) для использования Deno Language Server только в этой папке, чтобы избежать конфликтов с Node.js.

### Запуск проверок

```bash
# Проверка типов всех функций
deno task check

# Линтинг функций
deno lint supabase/functions

# Запуск тестов функций
deno test supabase/functions/*/test.ts
```

### Запуск функций локально

```bash
supabase start
supabase functions serve
```

### Развёртывание функций

```bash
supabase functions deploy --project-ref <project-id>
```

---

## 📱 PWA и офлайн-режим

Приложение является прогрессивным веб-приложением:

- Service Worker кэширует статические ресурсы (23 записи в precache)
- `offline.html` доступна без интернета
- Supabase API кэшируется через `StaleWhileRevalidate` (24 часа)
- При восстановлении сети отложенные изменения синхронизируются через durable outbox

---

## 🧪 Тестирование

```bash
# Все тесты фронтенда
npm run test

# Тесты с покрытием
npm run test -- --coverage

# Проверка типов TypeScript
npm run check

# Линтинг
npm run lint

# Полная сборка
npm run build
```

### Структура тестов

- `src/core/scheduler.test.ts` — алгоритм интервального повторения
- `src/core/stats.test.ts` — XP, уровни, лиги, защита от бесконечного цикла
- `src/core/session.test.ts` — пауза/возобновление/завершение сессии
- `src/core/db.test.ts` — отслеживание dirty-слов
- `supabase/functions/*/test.ts` — тесты Edge Functions (Deno)

---

## 📋 План улучшений (P0 → P3)

### P0 (kritisch — до релиза)
- [x] Применить миграцию RLS к реальной БД (`supabase/migrations/0001_initial_rls.sql`)
- [x] Покрыть ядро тестами (db, stats, session, sync)
- [x] Проверить соответствие схемы миграции реальной БД

### P1 (высокий приоритет)
- [x] Добавить unit-тесты для Edge Functions (check-essay, regenerate-image)
- [x] Обновить README с инструкциями по развёртыванию
- [x] Унифицировать константы Gemini (`supabase/functions/constants.ts`)
- [x] Структурированное логирование в Edge Functions
- [x] Строгие правила ESLint

### P2 (средний приоритет)
- [ ] Добавить runtime-кэширование Supabase API в Service Worker
- [ ] Сгенерировать типизированный клиент Supabase (`supabase gen types`)
- [ ] Очистить оставшиеся динамические импорты

### P3 (низкий приоритет)
- [ ] Включить `deno fmt --check` в CI с ограничением на `supabase/functions`
- [ ] Провести аудит зависимостей (`npm audit`)
- [ ] Добавить мониторинг ошибок в продакшене

---

## 🔐 Безопасность

- Все Edge Functions требуют валидный JWT (`verify_jwt = true`)
- RLS политики ограничивают доступ к данным пользователей
- CORS настроен с явными методами (GET, POST, DELETE, OPTIONS)
- Внутренние ошибки (БД, Gemini) не попадают в ответ клиенту
- Секретные ключи не попадают в клиентский бандл

---

License: Proprietary / Private
