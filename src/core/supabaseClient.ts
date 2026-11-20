import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    isSessionExpired?: boolean;
  }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!SUPABASE_URL) console.warn("⚠️ VITE_SUPABASE_URL не найден в .env");
  if (!SUPABASE_KEY) console.warn("⚠️ VITE_SUPABASE_KEY не найден в .env");
  console.warn("⚠️ Supabase credentials not found in .env. Using offline mock mode.");
}

// Обертка для fetch с таймаутом
const fetchWithRetries = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const defaultRetries = 4;
  const initialDelay = 1500;

  // Безопасное получение URL из строки, Request или URL объекта
  const url = typeof input === "string" ? input : "url" in input ? input.url : input.toString();

  let timeout = 10000; // Оптимизация: 10 сек (было 20), чтобы успеть сделать больше попыток при сбоях
  let retries = defaultRetries;

  // Устанавливаем разные таймауты и количество повторов в зависимости от типа запроса
  if (url.includes("/storage/v1/object/")) {
    timeout = 120000; // Для загрузки файлов (Storage) — 2 минуты
    retries = 2; // Меньше повторов для файлов, чтобы не забивать канал
  } else if (url.includes("/functions/v1/")) {
    timeout = 60000; // Для Edge Functions — 1 минута
  }

  let id: ReturnType<typeof setTimeout> | undefined;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();

      // Поддержка внешней отмены (например, при уходе со страницы)
      if (init?.signal) {
        if (init.signal.aborted) {
          controller.abort();
        } else {
          init.signal.addEventListener("abort", () => controller.abort(), {
            once: true,
          });
        }
      }

      id = setTimeout(() => {
        console.warn(`Supabase request timed out after ${timeout / 1000}s for`, url, init);
        controller.abort();
      }, timeout);

      const response = await fetch(input, {
        ...init,
        //mode: 'no-cors',
        // Добавляем логирование перед каждым fetch запросом
        //console.log("📤 Fetching:", url, init);
        signal: controller.signal,
      });

      if (!response) {
        // Fetch itself failed, before even getting headers
        throw new Error("Fetch failed: No response received.");
      }

      if (id) {
        clearTimeout(id);
        id = undefined;
      }

      // НЕ повторять попытку при ошибках клиента (4xx), так как они обычно не временные (например, 401 Unauthorized)
      if (!response.ok && response.status >= 400 && response.status < 500) {
        // Сначала получаем тело ответа, а потом логируем.
        // Это предотвращает "зависание" внутри console.warn, если .text() выполняется долго.
        const errorBody = await response
          .text()
          .catch(() => `{"error": "Could not read error body", "code": "${response.status}"}`);

        // --- Улучшенная обработка истекшей сессии ---
        // Если токен недействителен, отправляем событие, на которое отреагирует UI.
        if (
          response.status === 401 &&
          (errorBody.includes("Invalid JWT") || errorBody.includes("expired"))
        ) {
          // Используем флаг, чтобы избежать многократного вызова при одновременных сбоях API
          if (!window.isSessionExpired) {
            window.isSessionExpired = true;
            console.warn("☠️ Invalid or expired JWT detected. Dispatching session-expired event.");
            document.dispatchEvent(new CustomEvent("session-expired"));
          }
        }

        console.warn(`Client error: ${response.status} for ${url}`, errorBody);
        // Возвращаем новый Response, так как тело исходного уже прочитано.
        // Это гарантирует, что последующие обработчики (внутри supabase-js) смогут снова прочитать тело.
        const newResponse = new Response(errorBody, {
          status: response.status,
          headers: response.headers,
        });
        return newResponse;
      }

      // Повторяем попытку при серверных ошибках (5xx), которые могут быть временными
      if (!response.ok && response.status >= 500) {
        const body = await response.text();

        throw new Error(`Server error: ${response.status}: ${body}`);
      }

      return response;
    } catch (error: unknown) {
      // Log the full error for debugging purposes.
      console.error("Fetch with retries error:", error);

      if (id) {
        clearTimeout(id);
        id = undefined;
      }

      // Если запрос был отменен извне (пользователем), не делаем повторных попыток
      if (init?.signal?.aborted) {
        throw error;
      }

      if (i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(
          `[Retry ${i + 1}/${retries}] Request failed with "${(error as Error).message}". Retrying in ${delay}ms...`,
          error,
          init,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[Final Retry Failed] Request failed after ${retries} attempts.`);

        throw error; // Пробрасываем последнюю ошибку
      }
    }
  }
  throw new Error("Fetch with retries failed: Maximum retries exceeded.");
};

export const client: SupabaseClient =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
          fetch: fetchWithRetries,
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
        realtime: {
          // Увеличиваем таймаут подключения сокета до 20 секунд
          timeout: 20000,
          // Более агрессивный heartbeat для поддержания соединения
          heartbeatIntervalMs: 15000,
          // Кастомная логика переподключения с экспоненциальной задержкой
          reconnectAfterMs: (tries: number) => {
            const delay = [2000, 5000, 10000][tries - 1] || 10000;
            // eslint-disable-next-line no-console
            console.log(`[Realtime] Попытка переподключения #${tries} через ${delay}ms...`);
            return delay;
          },
        },
      })
    : ({
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: null }),
          update: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ data: null, error: null }),
          }),
          upsert: () => Promise.resolve({ data: null, error: null }),
        }),
        auth: {
          getUser: () =>
            Promise.resolve({
              data: {
                user: {
                  id: "mock-user-id",
                  app_metadata: {},
                  aud: "authenticated",
                  confirmation_sent_at: null,
                  created_at: "2024-05-05T00:00:00Z",
                  email: "mock@example.com",
                  email_confirmed_at: "2024-05-05T00:00:00Z",
                  identities: [],
                  last_sign_in_at: "2024-05-05T00:00:00Z",
                  phone: "",
                  role: "authenticated",
                  updated_at: "2024-05-05T00:00:00Z",
                  user_metadata: {},
                },
              },
              error: null,
            }),
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          signInWithPassword: () =>
            Promise.resolve({
              data: { user: null, session: null },
              error: { message: "Offline mode" },
            }),
          signOut: () => Promise.resolve({ error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          signInWithOAuth: () => Promise.resolve({ error: { message: "Offline mode" } }),

          resetPasswordForEmail: () => Promise.resolve({ error: { message: "Offline mode" } }),

          updateUser: () =>
            Promise.resolve({
              data: {
                user: {
                  id: "mock-user-id",
                  app_metadata: {},
                  aud: "authenticated",
                  confirmation_sent_at: null,
                  created_at: "2024-05-05T00:00:00Z",
                  email: "mock@example.com",
                  email_confirmed_at: "2024-05-05T00:00:00Z",
                  identities: [],
                  last_sign_in_at: "2024-05-05T00:00:00Z",
                  phone: "",
                  role: "authenticated",
                  updated_at: "2024-05-05T00:00:00Z",
                  user_metadata: {},
                },
              },
              error: null,
            }),
        },
        rpc: () => Promise.resolve({ data: null, error: null }),
        functions: {
          invoke: () =>
            Promise.resolve({
              data: null,
              error: { message: "Offline mode: Functions not available" },
            }),
        },
        storage: {
          from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
            remove: () => Promise.resolve({ data: null, error: null }),
            list: () => Promise.resolve({ data: [], error: null }),
          }),
        },
      } as unknown as SupabaseClient);
