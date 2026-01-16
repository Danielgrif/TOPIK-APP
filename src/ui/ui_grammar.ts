import { openModal } from "./ui_modal.ts";
import { Word } from "../types/index.ts";

export function openGrammarModal(item: Word) {
  const container = document.getElementById("grammar-content");
  const title = document.getElementById("grammar-title");
  if (!container || !title) return;

  title.textContent = item.word_kr;

  let html = `<div class="grammar-meaning">${item.translation}</div>`;

  if (item.grammar_info) {
    // Преобразуем переносы строк в <br> для читаемости
    const formattedInfo = item.grammar_info.replace(/\n/g, "<br>");
    html += `<div class="grammar-rule-box"><h3>📋 Правила и нюансы</h3><div class="grammar-text">${formattedInfo}</div></div>`;
  }

  if (item.example_kr) {
    html += `<div class="grammar-examples"><h3>💬 Примеры</h3><div class="grammar-ex-item"><div class="ex-kr">${item.example_kr}</div><div class="ex-ru">${item.example_ru || ""}</div></div></div>`;
  }

  container.innerHTML = html;
  openModal("grammar-modal");
}
