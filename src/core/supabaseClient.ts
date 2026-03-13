import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!SUPABASE_URL) console.warn("⚠️ VITE_SUPABASE_URL не найден в .env");
  if (!SUPABASE_KEY) console.warn("⚠️ VITE_SUPABASE_KEY не найден в .env");
  console.warn(
    "⚠️ Supabase credentials not found in .env. Using offline mock mode.",
  );
}

// Обертка для fetch с таймаутом
const fetchWithRetries = async (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  const defaultRetries = 4;
  const initialDelay = 1500;

  // Безопасное получение URL из строки, Request или URL объекта
  const url =
    typeof input === "string"
      ? input
      : "url" in input
        ? input.url
        : input.toString();

  let timeout = 10000; // Оптимизация: 10 сек (было 20), чтобы успеть сделать больше попыток при сбоях
  let retries = defaultRetries;

  // Устанавливаем разные таймауты и количество повторов в зависимости от типа запроса
  if (url.includes("/storage/v1/object/")) {
    timeout = 120000; // Для загрузки файлов (Storage) — 2 минуты
    retries = 2; // Меньше повторов для файлов, чтобы не забивать канал
  } else if (url.includes("/functions/v1/")) {
    timeout = 60000; // Для Edge Functions — 1 минута
  }

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

      const id = setTimeout(() => {
        console.warn(
          `Supabase request timed out after ${timeout / 1000}s for`,
          url,
        );
        controller.abort();
      }, timeout);

      const response = await window.fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(id);

      // НЕ повторять попытку при ошибках клиента (4xx), так как они обычно не временные (например, 401 Unauthorized)
      if (!response.ok && response.status >= 400 && response.status < 500) {
        return response; // Сразу возвращаем ошибочный ответ
      }

      // Повторяем попытку при серверных ошибках (5xx), которые могут быть временными
      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    } catch (error: unknown) {
      // Если запрос был отменен извне (пользователем), не делаем повторных попыток
      if (init?.signal?.aborted) {
        throw error;
      }

      if (i < retries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(
          `[Retry ${i + 1}/${retries}] Request failed. Retrying in ${delay}ms...`,
          error,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(
          `[Final Retry Failed] Request failed after ${retries} attempts.`,
        );
        throw error; // Пробрасываем последнюю ошибку
      }
    }
  }
  // Этот код не должен быть достижим, но нужен для TypeScript
  throw new Error("Fetch with retries failed unexpectedly.");
};

export const client: SupabaseClient =
  SUPABASE_URL && SUPABASE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: {
          fetch: fetchWithRetries,
        },
        realtime: {
          worker: true,
          heartbeatIntervalMs: 15000,
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
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          getSession: () =>
            Promise.resolve({ data: { session: null }, error: null }),
          signInWithPassword: () =>
            Promise.resolve({
              data: { user: null, session: null },
              error: { message: "Offline mode" },
            }),
          signOut: () => Promise.resolve({ error: null }),
          onAuthStateChange: () => ({
            data: { subscription: { unsubscribe: () => {} } },
          }),
          signInWithOAuth: () =>
            Promise.resolve({ error: { message: "Offline mode" } }),
          resetPasswordForEmail: () =>
            Promise.resolve({ error: { message: "Offline mode" } }),
          updateUser: () =>
            Promise.resolve({ error: { message: "Offline mode" } }),
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
