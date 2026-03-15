import { assertEquals } from "std/testing/asserts.ts";
import { stub } from "std/testing/mock.ts";
import * as clients from "shared/clients.ts";

Deno.test("process-word-request with mock DB", async () => {
  // 1. Create a mock Supabase client
  const mockSupabaseClient = {
    functions: {
      invoke: () => {
        return Promise.resolve({
          data: { success: true, data: [{ word_kr: "test", translation: "тест", level: "★★★" }] },
          error: null,
        });
      },
    },
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 123 }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  };

  const getSupabaseAdminStub = stub( 
    clients,
    "getSupabaseAdmin",
    // deno-lint-ignore no-explicit-any
    () => mockSupabaseClient as any,
  );

  // 2. Mock the request
  const mockRequest = {
    json: () =>
      Promise.resolve({
        record: { id: "test-id", word_kr: "테스트", user_id: "test-user" },
      }),
    method: "POST",
  } as Request;

  // 3. Call the edge function
  try {
    // Since index.ts uses serve(), we can't import the handler directly if it's not exported.
    // For testing purposes in Deno Edge Functions, we usually export the handler.
    // Assuming we want to test the logic, we'll use a dynamic import or mock the serve call.
    const module = await import("./index.ts") as { default: (req: Request) => Promise<Response> };
    const response = await module.default(mockRequest);
    
    // Check the response status
    assertEquals(response.status, 200);

    // Check the response body
    const body = await response.json();
    assertEquals(body.success, true);
    assertEquals(body.word.word_kr, "test");
  } catch (error) {
    console.error("Test failed:", error);
    throw error; // Re-throw to fail the test
  } finally {
    // Restore the original function
    getSupabaseAdminStub.restore();
  }
});

/* 
Deno.test("process-word-request with mock DB", async () => {
  // Mock the environment
  const originalEnvGet = Deno.env.get;
  Deno.env.get = (key: string) => {
    if (key === "SUPABASE_URL") return "test-url";
    if (key === "SUPABASE_SERVICE_ROLE_KEY") return "test-key";
    return originalEnvGet(key);
  };

  Deno.env.get = originalEnvGet;
});
*/