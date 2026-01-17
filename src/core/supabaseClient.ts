const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://gscnfituczfkrdeanzsw.supabase.co";
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_KEY ||
  "sb_publishable_HAU_-kPId3UdTvdy9rh5VQ_NGCg9ExI";

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn(
    "⚠️ Supabase URL не найден в переменных окружения (.env). Используется значение по умолчанию.",
  );
}

// @ts-ignore - window.supabase загружается через CDN в index.html
export const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
