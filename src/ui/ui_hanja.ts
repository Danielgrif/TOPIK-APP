import { state } from "../core/state.ts";
import { openModal } from "./ui_modal.ts";
import { Word } from "../types/index.ts";
import { escapeHtml } from "../utils/utils.ts";

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
      '<div style="grid-column: 1/-1; text-align:center; padding:20px; color:var(--text-sub);">Нет других слов с этим иероглифом.</div>';
  } else {
    relatedWords.forEach((w: Word) => {
      const el = document.createElement("div");
      el.className = "hanja-word-card";

      // Подсветка текущего иероглифа в слове
      const hanjaHtml = w.word_hanja
        ? w.word_hanja
            .split("")
            .map((c) =>
              c === char
                ? `<span class="highlight">${escapeHtml(c)}</span>`
                : escapeHtml(c),
            )
            .join("")
        : "";

      el.innerHTML = `
                <div class="hanja-card-word">${escapeHtml(w.word_kr)}</div>
                <div class="hanja-card-hanja">${hanjaHtml}</div>
                <div class="hanja-card-trans">${escapeHtml(w.translation)}</div>
            `;
      container.appendChild(el);
    });
  }

  openModal("hanja-modal");
}
