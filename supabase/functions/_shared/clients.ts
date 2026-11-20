// supabase/functions/_shared/clients.ts
// Shared Supabase client factories for Edge Functions
import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "npm:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.22.0";

declare const Deno: unknown & {
  env: {
    get(key: string): string | undefined;
  };
};

let geminiClient: GoogleGenerativeAI;

/**
 * Read environment var with fallback aliases.
 * - prefer primary name
 * - then try common aliases
 * - finally, use default value if provided
 */
function getEnv(primary: string, aliases: string[], defaultValue: string): string;
function getEnv(primary: string, aliases?: string[]): string | undefined;
function getEnv(
  primary: string,
  aliases: string[] = [],
  defaultValue?: string,
): string | undefined {
  for (const k of [primary, ...aliases]) {
    const v = Deno.env.get(k);
    if (v) return v;
  }
  return defaultValue;
}

const SUPABASE_URL = getEnv("SUPABASE_URL", ["VITE_SUPABASE_URL"]);
const SUPABASE_PUBLISHABLE_KEY = getEnv("SUPABASE_PUBLISHABLE_KEY", [
  "VITE_SUPABASE_KEY",
  "SUPABASE_ANON_KEY",
  "ANON_KEY",
]);

/**
 * NOTE:
 * Add common server secret aliases here — include SUPABASE_SERVICE_ROLE_KEY which
 * is the canonical name used by Supabase dashboard/CLI for the service role.
 */
const SUPABASE_SECRET_KEY = getEnv("SUPABASE_SECRET_KEY", [
  "SUPABASE_SERVICE_KEY",
  "SB_SECRET_KEY",
  "SERVICE_ROLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", // <-- added alias
]);

/**
 * Returns a Supabase client for end-user-scoped requests.
 * - Uses publishable key (safe for client)
 * - Optionally sets Authorization header to pass the user JWT
 */
export function getSupabaseClientForUser(authorizationBearer?: string): SupabaseClient {
  if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL in environment");
  if (!SUPABASE_PUBLISHABLE_KEY)
    throw new Error(
      "Missing SUPABASE_PUBLISHABLE_KEY / VITE_SUPABASE_KEY / SUPABASE_ANON_KEY in environment",
    );

  const opts: SupabaseClientOptions<"public"> = {};
  if (authorizationBearer) {
    opts.global = { headers: { Authorization: authorizationBearer } };
  }

  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, opts);
}

/**
 * Returns a Supabase admin client using the server-only secret key.
 * This client bypasses RLS and can perform admin actions.
 * Only use this in secure server / function environment variables (do NOT expose to client).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL in environment");

  // More descriptive error message listing the names we try
  if (!SUPABASE_SECRET_KEY) {
    throw new Error(
      "Missing server secret in environment. Expected one of: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, SUPABASE_SERVICE_KEY, SB_SECRET_KEY, SERVICE_ROLE_KEY",
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = Deno.env.get("GEMINI_API_KEY") || "";
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// Optional: safe runtime check helper (do not log secrets themselves)
// Use only during debugging; remove in production.
export function debugEnvPresence(): void {
  try {
    // eslint-disable-next-line no-console
    console.info(
      "env presence:",
      "SUPABASE_SERVICE_ROLE_KEY=" + (!!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")).toString(),
      "SUPABASE_SECRET_KEY=" + (!!Deno.env.get("SUPABASE_SECRET_KEY")).toString(),
      "SUPABASE_SERVICE_KEY=" + (!!Deno.env.get("SUPABASE_SERVICE_KEY")).toString(),
    );
  } catch (_e) {
    // ignore in environments without Deno.env access
  }
}
