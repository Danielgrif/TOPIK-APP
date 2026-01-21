import { client } from "./supabaseClient.ts";
import { showToast } from "../utils/utils.ts";

export async function regenerateImage(wordId: number, word: string, translation: string) {
  showToast("🎨 Генерирую новое изображение...");
  
  const { data, error } = await client.functions.invoke('regenerate-image', {
    body: { id: wordId, word, translation }
  });

  if (error) {
    console.error("Image generation failed:", error);
    showToast("❌ Ошибка генерации: " + error.message);
    return null;
  }

  showToast("✅ Изображение обновлено!");
  return data.imageUrl;
}