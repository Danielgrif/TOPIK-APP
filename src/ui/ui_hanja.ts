import { state } from "../core/state.ts";
import { openModal } from "./ui_modal.ts";
import { Word } from "../types/index.ts";

export function openHanjaModal(char: string) {
  const container = document.getElementById("hanja-list");
  const title = document.getElementById("hanja-title");
  if (!container || !title) return;

  title.textContent = `Иероглиф "${char}"`;
  container.innerHTML = "";

  const relatedWords = state.dataStore.filter(
    (w: Word) => w.word_hanja && w.word_hanja.includes(char),
  );

  if (relatedWords.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:20px; color:var(--text-sub);">Нет других слов с этим иероглифом.</div>';
  } else {
    relatedWords.forEach((w: Word) => {
      const el = document.createElement("div");
      el.className = "hanja-word-item";
      el.innerHTML = `
                <div style="font-weight:bold; font-size:16px;">${w.word_kr}</div>
                <div style="color:var(--primary); font-weight:600;">${w.word_hanja}</div>
                <div style="color:var(--text-sub); font-size:13px;">${w.translation}</div>
            `;
      container.appendChild(el);
    });
  }

  openModal("hanja-modal");
}
