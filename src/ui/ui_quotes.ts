import { state } from "../core/state.ts";
import { showToast, speak, escapeHtml } from "../utils/utils.ts";
import { immediateSaveState } from "../core/db.ts";

export function renderFavoriteQuotes() {
  const container = document.getElementById("quotes-list");
  if (!container) return;

  container.innerHTML = "";

  if (!state.favoriteQuotes || state.favoriteQuotes.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:40px; color:var(--text-sub);">У вас пока нет избранных цитат.<br>Добавляйте их с экрана приветствия!</div>';
    return;
  }

  // Отображаем новые сверху
  const quotes = [...state.favoriteQuotes].reverse();

  quotes.forEach((quote) => {
    const el = document.createElement("div");
    el.className = "quote-card";
    el.innerHTML = `
      <div class="quote-content">
        <div class="quote-kr">${escapeHtml(quote.quote_kr)}</div>
        <div class="quote-ru">${escapeHtml(quote.quote_ru)}</div>
        ${quote.literal_translation ? `<div class="quote-literal">(${escapeHtml(quote.literal_translation)})</div>` : ""}
      </div>
      <div class="quote-actions">
        <button class="btn-icon speak-quote-btn">🔊</button>
        <button class="btn-icon delete-quote-btn">🗑</button>
      </div>
    `;

    const speakBtn = el.querySelector(".speak-quote-btn") as HTMLElement;
    speakBtn.onclick = () => speak(quote.quote_kr, quote.audio_url);

    const delBtn = el.querySelector(".delete-quote-btn") as HTMLElement;
    delBtn.onclick = () => removeQuote(quote.id);

    container.appendChild(el);
  });
}

function removeQuote(id: number | string) {
  state.favoriteQuotes = state.favoriteQuotes.filter((q) => q.id !== id);
  immediateSaveState();
  renderFavoriteQuotes();
  showToast("Цитата удалена");
}
