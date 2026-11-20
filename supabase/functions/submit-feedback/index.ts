import { serve } from "std/http/server.ts";
import { getSupabaseClientForUser } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { DB_BUCKETS, DB_TABLES, LIMITS } from "shared/constants.ts";
import {
  corsPreflightResponse,
  createErrorResponse,
  HttpError,
  jsonResponse,
} from "shared/utils.ts";
import { readJsonObject, requireOneOf, requireString } from "shared/validation.ts";

const FEEDBACK_TYPES = ["bug", "feature", "question"] as const;
const FEEDBACK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const ALLOWED_ATTACHMENT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

interface AttachmentInput {
  name: string;
  type: string;
  base64: string;
}

/** Валидация всех вложений ДО загрузки в Storage. */
function validateAttachments(value: unknown): AttachmentInput[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError("Invalid 'attachments'", 400);
  if (value.length > LIMITS.MAX_FEEDBACK_ATTACHMENTS) {
    throw new HttpError("Too many attachments", 413);
  }

  return value.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new HttpError("Invalid attachment", 400);
    }
    const a = raw as Record<string, unknown>;
    const name = requireString(a.name, "attachment.name", 100);
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      throw new HttpError("Invalid attachment file name", 400);
    }
    const type = requireString(a.type, "attachment.type", 100);
    if (!ALLOWED_ATTACHMENT_MIME.has(type)) {
      throw new HttpError("Unsupported attachment type", 415);
    }
    if (typeof a.base64 !== "string" || !/^[A-Za-z0-9+/=\r\n]+$/.test(a.base64)) {
      throw new HttpError("Invalid attachment data (base64 expected)", 400);
    }
    if (a.base64.length > Math.ceil((LIMITS.MAX_FEEDBACK_ATTACHMENT_BYTES * 4) / 3)) {
      throw new HttpError("Attachment is too large", 413);
    }
    return { name, type, base64: a.base64.replace(/\r\n/g, "") };
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return corsPreflightResponse();
  }

  try {
    const { user, token } = await getAuthenticatedUser(req);
    const body = await readJsonObject(req);

    const type = requireOneOf(body.type, FEEDBACK_TYPES, "type");
    const title = requireString(body.title, "title", LIMITS.MAX_FEEDBACK_TITLE_LENGTH);
    const description = requireString(
      body.description,
      "description",
      LIMITS.MAX_FEEDBACK_DESCRIPTION_LENGTH,
    );
    const priority = requireOneOf(body.priority, FEEDBACK_PRIORITIES, "priority");
    // Сначала валидируем всё, и только потом загружаем файлы.
    const attachments = validateAttachments(body.attachments);

    // Используем клиент с JWT пользователя: RLS ограничивает его строками.
    const supabaseClient = getSupabaseClientForUser(`Bearer ${token}`);

    // 1. Rate Limiting (max 3 reports per minute)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { count, error: countError } = await supabaseClient
      .from(DB_TABLES.FEEDBACK_REPORTS)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if (countError) throw countError;
    if (count && count >= 3) {
      throw new HttpError("Rate limit exceeded. Try again later.", 429);
    }

    // 2. Загружаем вложения в папку user.id — это совпадает с RLS-политикой storage.
    const uploadedAttachments: { path: string; name: string; type: string }[] = [];

    for (const file of attachments) {
      const ext = ALLOWED_EXTENSIONS[file.type];
      const fileName = `${user.id}/${Date.now()}_${crypto.randomUUID()}.${ext}`;

      const binaryStr = atob(file.base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from(DB_BUCKETS.FEEDBACK_ATTACHMENTS)
        .upload(fileName, bytes, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Attachment upload failed:", uploadError.message);
        continue;
      }

      uploadedAttachments.push({
        path: uploadData.path,
        name: file.name,
        type: file.type,
      });
    }

    // 3. Create feedback report
    const { data: report, error: insertError } = await supabaseClient
      .from(DB_TABLES.FEEDBACK_REPORTS)
      .insert({
        user_id: user.id,
        type,
        title,
        description,
        priority,
        attachments: uploadedAttachments,
      })
      .select()
      .maybeSingle();

    if (insertError) throw insertError;

    return jsonResponse(report);
  } catch (error) {
    return createErrorResponse(error);
  }
});
