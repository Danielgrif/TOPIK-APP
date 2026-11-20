// supabase/functions/get-feedback-reports/index.ts
// Только LIST отчётов. Изменение статуса вынесено в update-feedback-status.
import { serve } from "std/http/server.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { DB_TABLES } from "shared/constants.ts";

async function requireAdmin(userId: string) {
  const adminClient = getSupabaseAdmin();
  const { data: profile, error } = await adminClient
    .from(DB_TABLES.PROFILES)
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role !== "admin") {
    throw new HttpError("Forbidden: admin role required", 403);
  }
  return adminClient;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  // PUT/POST/PATCH здесь не используются: статус обновляет отдельная функция.
  if (req.method !== "GET") {
    return createErrorResponse("Method not allowed. Use GET.", 405);
  }

  try {
    // BUG FIX: для GET мы НИКОГДА не вызываем req.json() — тела нет.
    const { user } = await getAuthenticatedUser(req);
    const adminClient = await requireAdmin(user.id);

    const { data: reports, error } = await adminClient
      .from(DB_TABLES.FEEDBACK_REPORTS)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Профили читаем отдельно: не полагаемся на имя FK в PostgREST.
    const userIds = [...new Set((reports ?? []).map((r) => r.user_id).filter(Boolean))];
    const profiles = new Map<
      string,
      { email?: string; full_name?: string; display_name?: string }
    >();
    if (userIds.length > 0) {
      const { data: foundProfiles } = await adminClient
        .from(DB_TABLES.PROFILES)
        .select("*")
        .in("id", userIds);
      (foundProfiles ?? []).forEach((p) => profiles.set(p.id, p));
    }

    const enriched = (reports ?? []).map((report) => {
      const profile = profiles.get(report.user_id);
      return {
        ...report,
        user: {
          email: profile?.email ?? null,
          full_name: profile?.full_name ?? profile?.display_name ?? null,
        },
      };
    });

    return jsonResponse({ success: true, reports: enriched });
  } catch (error) {
    return createErrorResponse(error);
  }
});
