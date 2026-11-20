// supabase/functions/update-feedback-status/index.ts
// Отдельная функция для изменения статуса отчёта (только администраторы).
import { serve } from "std/http/server.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { readJsonObject } from "shared/validation.ts";
import { DB_TABLES } from "shared/constants.ts";

const ALLOWED_STATUSES = ["open", "in_progress", "fixed", "closed"] as const;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }
  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const { user } = await getAuthenticatedUser(req);
    const adminClient = getSupabaseAdmin();

    const { data: profile, error: profileError } = await adminClient
      .from(DB_TABLES.PROFILES)
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== "admin") {
      throw new HttpError("Forbidden: admin role required", 403);
    }

    const body = await readJsonObject(req);
    const reportId = body.report_id;
    if (
      typeof reportId !== "string" && typeof reportId !== "number"
    ) {
      throw new HttpError("Missing or invalid 'report_id'", 400);
    }
    const newStatus = body.new_status;
    if (
      typeof newStatus !== "string" ||
      !ALLOWED_STATUSES.includes(newStatus as (typeof ALLOWED_STATUSES)[number])
    ) {
      throw new HttpError("Invalid 'new_status'", 400);
    }

    const { data: report, error } = await adminClient
      .from(DB_TABLES.FEEDBACK_REPORTS)
      .update({ status: newStatus })
      .eq("id", reportId)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!report) throw new HttpError("Report not found", 404);

    return jsonResponse({ success: true, report });
  } catch (error) {
    return createErrorResponse(error);
  }
});
