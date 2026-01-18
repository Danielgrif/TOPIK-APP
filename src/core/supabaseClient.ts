const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  if (!SUPABASE_URL) console.warn("⚠️ VITE_SUPABASE_URL не найден в .env");
  if (!SUPABASE_KEY) console.warn("⚠️ VITE_SUPABASE_KEY не найден в .env");
  console.warn(
    "⚠️ Supabase credentials not found in .env. Using offline mock mode.",
  );
}

// @ts-ignore - window.supabase загружается через CDN в index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const client = (SUPABASE_URL && SUPABASE_KEY && window.supabase && window.supabase.createClient) 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
  : { 
      from: () => ({ 
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        upsert: () => Promise.resolve({ data: null, error: null })
      }), 
      auth: { 
        getUser: () => Promise.resolve({ data: { user: null }, error: null }), 
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Offline mode" } }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithOAuth: () => Promise.resolve({ error: { message: "Offline mode" } }),
        resetPasswordForEmail: () => Promise.resolve({ error: { message: "Offline mode" } }),
        updateUser: () => Promise.resolve({ error: { message: "Offline mode" } })
      },
      rpc: () => Promise.resolve({ data: null, error: null }),
      storage: {
        from: () => ({
            upload: () => Promise.resolve({ data: null, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
            remove: () => Promise.resolve({ data: null, error: null }),
            list: () => Promise.resolve({ data: [], error: null })
        })
      }
    } as any;
