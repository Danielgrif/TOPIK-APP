const SUPABASE_URL = "https://gscnfituczfkrdeanzsw.supabase.co";
const SUPABASE_KEY = "sb_publishable_HAU_-kPId3UdTvdy9rh5VQ_NGCg9ExI";

export const client = (window as any).supabase.createClient(SUPABASE_URL, SUPABASE_KEY);