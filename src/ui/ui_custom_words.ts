import { client } from "../core/supabaseClient.ts";
import { showToast } from "../utils/utils.ts";
import { closeModal } from "./ui_modal.ts";
import { state } from "../core/state.ts";
import { immediateSaveState } from "../core/db.ts";
import { render } from "./ui_card.ts";

export async function submitWordRequest() {
  const input = document.getElementById("new-word-input") as HTMLInputElement;
  if (!input) return;

  const word = input.value.trim();
  if (!word) {
    showToast("Введите слово");
    return;
  }

  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    showToast("Войдите в профиль, чтобы предлагать слова");
    return;
  }

  const { error } = await client
    .from("word_requests")
    .insert([{ user_id: user.id, word_kr: word }]);

  if (error) showToast("Ошибка отправки: " + error.message);
  else {
    showToast("✅ Заявка отправлена! AI обработает её скоро.");
    input.value = "";
    closeModal("add-word-modal");
  }
}

export async function deleteCustomWord(id: string | number) {
  // Удаляем из локального состояния
  state.customWords = state.customWords.filter((w) => w.id !== id);
  state.dataStore = state.dataStore.filter((w) => w.id !== id);

  // Если это была заявка в БД, пробуем удалить (если есть права)
  await client.from("word_requests").delete().eq("id", id);

  immediateSaveState();
  render();
  showToast("Заявка удалена");
}
