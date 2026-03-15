// supabase/functions/delete-user/index.ts
import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { corsHeaders } from "shared/constants.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Create a Supabase client with the user's JWT to verify their identity
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("VITE_SUPABASE_KEY") ?? "";

    const userSupabaseClient: SupabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      anonKey,
      { global: { headers: { Authorization: authHeader } } }
    );

    // 2. Get the user from the JWT
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError) {
      const message = `Authentication failed: ${userError.message}`;
      console.error("User auth error:", message);
      return createErrorResponse(message, 401);
    }
    
    if (!user) {
      return createErrorResponse("User not found", 401);
    }

    const userIdToDelete = user.id

    // 3. Create a Supabase client with the SERVICE_ROLE key to perform admin actions
    const adminSupabaseClient = getSupabaseAdmin();

    // Log the deletion attempt
    console.log(`Attempting to delete user with ID: ${userIdToDelete}`);

    // 4. Perform any data cleanup required (example: deleting related data)
    // const { error: dataError } = await adminSupabaseClient
    //   .from('your_table')
    //   .delete()
    //   .eq('user_id', userIdToDelete);
    // if (dataError) {
    //   console.error("Error deleting related data:", dataError.message);
    //   throw new Error("Failed to delete related data: " + dataError.message);
    // }

    // 5. Delete the user from auth.users
    const { error: deleteError } = await adminSupabaseClient.auth.admin.deleteUser(
      userIdToDelete
    );
    if (deleteError) throw deleteError;

    // 6. Audit log
    console.log(`User with ID: ${userIdToDelete} was successfully deleted.`);

    // 7. Respond to the client
    console.log(`Responding to the client with success message.`);

    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: unknown) {
    return createErrorResponse(err);
  }
});