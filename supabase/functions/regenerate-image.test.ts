// supabase/functions/regenerate-image.test.ts
// Unit-тесты для функции regenerate-image.

import { assert, assertEquals } from "std/testing/asserts.ts";

Deno.test("regenerate-image: константы доступны", async () => {
  const constants = await import("./_shared/constants.ts");
  assertEquals(constants.GEMINI_MODELS.FLASH, "gemini-2.5-flash");
  assert(constants.ALLOWED_IMAGE_HOSTS.has("cdn.pixabay.com"));
  assert(constants.ALLOWED_IMAGE_HOSTS.has("pixabay.com"));
  assert(constants.ALLOWED_IMAGE_HOSTS.has("images.pexels.com"));
});

Deno.test("regenerate-image: CORS заголовки содержат DELETE и OPTIONS", async () => {
  const constants = await import("./_shared/constants.ts");
  const methods = constants.corsHeaders["Access-Control-Allow-Methods"];
  assert(methods.includes("DELETE"));
  assert(methods.includes("OPTIONS"));
  assert(methods.includes("POST"));
  assert(methods.includes("GET"));
});
