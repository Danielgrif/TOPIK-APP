// supabase/functions/delete-user/index.ts
import { serve } from "std/http/server.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, jsonResponse } from "shared/utils.ts";

/**
 * Удаление auth-пользователя. Клиент вызывает функцию с method: "DELETE",
 * но POST тоже принимается для обратной совместимости со старыми сборками.
 * Идентификатор всегда берётся из JWT, а не из тела запроса.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (req.method !== "DELETE" && req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use DELETE or POST.", 405);
  }

  try {
    const { user } = await getAuthenticatedUser(req);
    const adminSupabaseClient = getSupabaseAdmin();

    // Логируем только ID, никогда не логируем токены.
    console.log(`Attempting to delete user with ID: ${user.id}`);

    const { error: deleteError } = await adminSupabaseClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw deleteError;
    }

    console.log(`User with ID: ${user.id} was successfully deleted.`);
    return jsonResponse({ message: "User deleted successfully" });
  } catch (err: unknown) {
    return createErrorResponse(err);
  }
});
