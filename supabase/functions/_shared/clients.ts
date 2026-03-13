import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseAdminClient: SupabaseClient;
let geminiClient: GoogleGenerativeAI;

/**
 * Returns a memoized Supabase admin client.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
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