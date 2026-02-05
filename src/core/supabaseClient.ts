/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import type { SupabaseClient } from "@supabase/supabase-js";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

console.log("🔍 Env Check - URL:", SUPABASE_URL);
console.log(
  "🔍 Env Check - Key Length:",
  SUPABASE_KEY ? SUPABASE_KEY.length : "MISSING",
);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!SUPABASE_URL) console.warn("⚠️ VITE_SUPABASE_URL не найден в .env");
  if (!SUPABASE_KEY) console.warn("⚠️ VITE_SUPABASE_KEY не найден в .env");
  console.warn(
    "⚠️ Supabase credentials not found in .env. Using offline mock mode.",
  );
}

// Обертка для fetch с таймаутом
const fetchWithTimeout = (resource: RequestInfo, options: RequestInit = {}) => {
  let timeout = 20000; // Таймаут по умолчанию: 20 секунд
  const url = typeof resource === "string" ? resource : resource.url;

  // Устанавливаем разные таймауты в зависимости от типа запроса
  if (url.includes("/storage/v1/object/")) {
    // Для загрузки файлов (Storage) — 2 минуты
    timeout = 120000;
  } else if (url.includes("/functions/v1/")) {
    // Для Edge Functions — 1 минута
    timeout = 60000;
  }
  // Для остальных запросов (БД, Auth) остается 20 секунд

  const controller = new AbortController();
  const id = setTimeout(() => {
    console.warn(
      `Supabase request timed out after ${timeout / 1000}s for`,
      resource,
    );
    controller.abort();
  }, timeout);

  return window
    .fetch(resource, {
      ...options,
      signal: controller.signal,
    })
    .finally(() => {
      clearTimeout(id);
    });
};

type SupabaseCreateClient = (url: string, key: string, options?: object) => any;

// @ts-ignore - window.supabase загружается через CDN в index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const client: SupabaseClient =
  SUPABASE_URL &&
  SUPABASE_KEY &&
  window.supabase &&
  window.supabase.createClient
    ? (window.supabase.createClient as SupabaseCreateClient)(
        SUPABASE_URL,
        SUPABASE_KEY,
        {
          global: {
            fetch: fetchWithTimeout,
          },
        },
      )
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
      } as any);
