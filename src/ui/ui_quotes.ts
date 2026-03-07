import { state } from "../core/state.ts";
import { showToast, speak, escapeHtml } from "../utils/utils.ts";
import { immediateSaveState } from "../core/db.ts";

export function renderFavoriteQuotes() {
  const container = document.getElementById("quotes-list");
  if (!container) return;

  container.scrollTop = 0;
  container.innerHTML = "";

  if (!state.favoriteQuotes || state.favoriteQuotes.length === 0) {
    container.innerHTML =
      '<div style="text-align:center; padding:40px; color:var(--text-sub);">У вас пока нет избранных цитат.<br>Добавляйте их с экрана приветствия!</div>';
    return;
  }

  // Отображаем новые сверху
  const quotes = [...state.favoriteQuotes].reverse();

  quotes.forEach((quote, index) => {
    const el = document.createElement("div");
    el.className = "quote-card";
    el.style.animation = `fadeInUpList 0.3s ease-out ${index * 0.05}s backwards`;
    el.innerHTML = `
      <div class="quote-content">
        <div class="quote-kr">${escapeHtml(quote.quote_kr)}</div>
        <div class="quote-ru">${escapeHtml(quote.quote_ru)}</div>
        ${quote.literal_translation ? `<div class="quote-literal">(${escapeHtml(quote.literal_translation)})</div>` : ""}
      </div>
      <div class="quote-actions">
        <button class="btn-icon speak-quote-btn" aria-label="Прослушать">🔊</button>
        <button class="btn-icon delete-quote-btn" aria-label="Удалить">🗑</button>
      </div>
    `;

    const speakBtn = el.querySelector(".speak-quote-btn") as HTMLElement;
    speakBtn.onclick = () => {
      speakBtn.classList.add("playing");
      speak(quote.quote_kr, quote.audio_url).then(() => {
        speakBtn.classList.remove("playing");
      });
    };

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
