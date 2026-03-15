import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient;
let geminiClient: GoogleGenerativeAI;

/**
 * Returns a memoized Supabase admin client.
 * This client is intended for server-side use and requires the service_role key.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    // --- 1. Get Supabase URL ---
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/["']/g, "") ??
      Deno.env.get("VITE_SUPABASE_URL")?.replace(/["']/g, "");
    if (!supabaseUrl) {
      throw new Error("Supabase URL is missing. Please set SUPABASE_URL or VITE_SUPABASE_URL in your .env file.");
    }

    // --- 2. Get Publishable Key (formerly Anon Key) ---
    // This key is safe to expose in the browser and is sent as the `apikey` header.
    // It identifies your project and enforces Row Level Security (RLS).
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.replace(/["']/g, "") ??
      Deno.env.get("VITE_SUPABASE_KEY")?.replace(/["']/g, "");
    if (!anonKey) {
      throw new Error(
        "Supabase public anon key is missing. Please set VITE_SUPABASE_KEY or SUPABASE_ANON_KEY in your .env file."
      );
    }

    // --- 3. Get Secret Key (formerly Service Role Key) ---
    // This key has admin privileges and can bypass RLS. It must be kept secret.
    // It is sent as the `Authorization: Bearer <key>` header for elevated access.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.replace(/["']/g, "") ??
      Deno.env.get("SUPABASE_SERVICE_KEY")?.replace(/["']/g, "") ??
      Deno.env.get("SUPABASE_KEY")?.replace(/["']/g, "");
    if (!serviceRoleKey) {
      throw new Error(
        "Supabase service role key is missing. Please set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) in your .env file. " +
          "This key is required for admin access in tests."
      );
    }

    // --- 4. Create Admin Client (for server-side use) ---
    // The `createClient` function uses the publishable/anon key for the `apikey` header.
    // The secret/service_role key is passed in the `Authorization` header to bypass RLS.
    supabaseAdminClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${serviceRoleKey}` },
      },
    });
  }
  return supabaseAdminClient;
}

/**
 * Returns a memoized GoogleGenerativeAI client.
 * Throws an error if the API key is not found.
 */
export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in Supabase environment variables");
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}