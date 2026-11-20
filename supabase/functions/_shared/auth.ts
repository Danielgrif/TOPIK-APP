// supabase/functions/_shared/auth.ts
// Единая проверка пользователя по заголовку Authorization для Edge Functions.
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseClientForUser } from "./clients.ts";
import { HttpError } from "./utils.ts";

export interface AuthenticatedContext {
  /** Пользователь, подтверждённый Supabase Auth по JWT. */
  user: User;
  /** Первичный Bearer-токен (можно передать во вложенные вызовы функций). */
  token: string;
  /** Клиент с JWT пользователя — использует RLS. */
  supabase: SupabaseClient;
}

/**
 * Проверяет `Authorization: Bearer <jwt>` и возвращает пользователя.
 * ID пользователя всегда берётся из токена, никогда из тела запроса.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedContext> {
  const header = req.headers.get("Authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HttpError("Missing or invalid Authorization header", 401);
  }

  const token = match[1].trim();
  if (!token) {
    throw new HttpError("Missing or invalid Authorization header", 401);
  }

  const supabase = getSupabaseClientForUser(`Bearer ${token}`);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new HttpError("Unauthorized", 401);
  }

  return { user, token, supabase };
}

/** Заголовок для вложенных вызовов Edge Functions от имени того же пользователя. */
export function bearerHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}
