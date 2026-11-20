export const VITE_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const VITE_SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!VITE_SUPABASE_URL || !VITE_SUPABASE_KEY) {
  console.warn(
    "Ensure VITE_SUPABASE_URL and VITE_SUPABASE_KEY are defined in your environment variables.",
  );
}
