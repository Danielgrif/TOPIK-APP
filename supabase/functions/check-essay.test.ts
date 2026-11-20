// supabase/functions/check-essay.test.ts
// Unit-тесты для функции check-essay (проверка эссе).
// Запуск: deno test --allow-net --allow-env

import { assert, assertEquals } from "std/testing/asserts.ts";

// Импортируем константы для проверки доступности
Deno.test("check-essay: GEMINI_MODELS.FLASH доступен", async () => {
  const constantsModule = await import("./_shared/constants.ts");
  assertEquals(constantsModule.GEMINI_MODELS.FLASH, "gemini-2.5-flash");
  assertEquals(constantsModule.GEMINI_MODELS.PRO, "gemini-2.5-pro");
});

Deno.test("check-essay: LIMITS содержит ожидаемые значения", async () => {
  const constantsModule = await import("./_shared/constants.ts");
  assert(constantsModule.LIMITS.MAX_WORDS_PER_REQUEST > 0);
  assert(constantsModule.LIMITS.MAX_IMAGE_BYTES > 0);
  assert(constantsModule.LIMITS.AI_TIMEOUT_MS > 0);
});
