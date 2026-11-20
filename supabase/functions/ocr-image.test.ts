// supabase/functions/ocr-image.test.ts
// Проверка доступности констант и CORS-заголовков функции ocr-image.

import { assert, assertEquals } from "std/testing/asserts.ts";

Deno.test("ocr-image: константы доступны", async () => {
  const constants = await import("./_shared/constants.ts");
  assertEquals(constants.GEMINI_MODELS.FLASH, "gemini-2.5-flash");
  assert(constants.ALLOWED_IMAGE_HOSTS.has("cdn.pixabay.com"));
});

Deno.test("ocr-image: CORS заголовки содержат POST и OPTIONS", async () => {
  const constants = await import("./_shared/constants.ts");
  const methods = constants.corsHeaders["Access-Control-Allow-Methods"];
  assert(methods.includes("POST"));
  assert(methods.includes("OPTIONS"));
});
