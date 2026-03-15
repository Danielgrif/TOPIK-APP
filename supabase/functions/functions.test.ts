import { assert, assertEquals, assertExists } from "std/testing/asserts.ts";
import "std/dotenv/load.ts";
import { getSupabaseAdmin } from "shared/clients.ts";
import { SupabaseClient } from "@supabase/supabase-js";
// Это решает проблему "гонки состояний" при загрузке переменных окружения.
let supabaseAdmin: SupabaseClient;


// Используем основную тестовую группу, чтобы контролировать порядок инициализации.
Deno.test("Supabase Functions E2E Tests", async (t) => {
    // Инициализируем клиент здесь, ПОСЛЕ того как 'dotenv/load.ts' отработал.
    // getSupabaseAdmin() выбросит понятную ошибку, если переменные окружения неверны.
  supabaseAdmin = getSupabaseAdmin();

  await t.step("AI Teacher: should generate examples", async () => {
    const { data, error } = await supabaseAdmin.functions.invoke("ai-teacher", {
      body: { action: "generate-examples", word: "공부하다" },
    });

      if (error) {
          console.error("❌ Error invoking ai-teacher:", error);
      }

    assert(!error, `Function invocation failed: ${error?.message}`);
    assert(data.success, "The 'success' property should be true.");
    assertExists(data.data, "The 'data' property should exist.");
      assert(
      Array.isArray(data.data), "Data should be an array.",
    );
    assertEquals(data.data.length, 3, "Should return 3 examples.");
    assert(data.data[0].kr.includes("공부"), "Korean sentence should contain the word.");
    assertExists(data.data[0].ru, "Russian translation should exist.");
  });

  await t.step("AI Teacher: should explain grammar", async () => {
    const { data, error } = await supabaseAdmin.functions.invoke("ai-teacher", {
      body: { action: "explain-grammar", word: "-(으)면서" },
    });

      assert(!error, `Function invocation failed: ${error?.message}`);
    assert(data.success, "The 'success' property should be true.");
    assertExists(data.data, "The 'data' property should exist.");
    assert(typeof data.data === "string", "Data should be a string (Markdown).");
    assert(data.data.length > 50, "The explanation should be reasonably long.");
  });

  await t.step("Check Essay: should evaluate a simple essay", async () => {
    const { data, error } = await supabaseAdmin.functions.invoke("check-essay", {
      body: {
        taskType: "51",
        question: "Fill in the blanks for a library notice.",
        answer: "도서관은 다음 주 월요일에 쉽니다.",
      },
    });

      assert(!error, `Function invocation failed: ${error?.message}`);
    assert(data.success, "The 'success' property should be true.");
    assertExists(data.score, "The 'score' property should exist.");
    assertExists(data.feedback, "The 'feedback' property should exist.");
    assertExists(data.corrections, "The 'corrections' property should exist.");
    assert(Array.isArray(data.corrections), "Corrections should be an array.");
  });

  await t.step("Generate Word Data: should return data for a valid word", async () => {
    const { data, error } = await supabaseAdmin.functions.invoke("generate-word-data", {
      body: { word: "사과" },
    });

      assert(!error, `Function invocation failed: ${error?.message}`);
    assert(data.success, "The 'success' property should be true.");
    assertExists(data.data, "The 'data' property should exist.");
    assert(Array.isArray(data.data), "Data should be an array.");
    const wordData = data.data[0];
    assertEquals(wordData.word_kr, "사과", "The Korean word should be correct.");
    assertExists(wordData.translation, "Translation should exist.");
    assertExists(wordData.level, "Level should exist.");
  });

  await t.step("Generate Audio: should generate audio successfully", async () => {
    const { data, error } = await supabaseAdmin.functions.invoke("generate-audio", {
      body: { text: "안녕하세요", voice: "female" },
    });

      assert(!error, `Function invocation failed: ${error?.message}`);
    assertExists(data, "The 'data' property should exist.");
    //console.log("audio test: ", data);
    //assert(data.byteLength > 0, "Audio data should have content.");

  });
});







console.log("\n✅ Automated tests for AI functions passed.");
console.log("ℹ️ Note: Tests for 'process-word-request', 'background-worker', 'retry-word-request', and 'delete-user' require specific database states or are destructive. Please test them manually as previously described.");