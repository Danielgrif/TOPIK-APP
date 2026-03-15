import { state } from "../core/state.ts";
import { escapeHtml } from "../utils/utils.ts";

export function renderFavoriteQuotes() {
  const container = document.getElementById("favorite-quotes-list");
  if (!container) return;

  if (state.favoriteQuotes.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 40px 20px; color: var(--text-sub);">
            <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;">📜</div>
            <div style="font-size: 16px; font-weight: 700;">Здесь пока пусто</div>
            <div style="font-size: 13px;">Вы можете добавлять цитаты в избранное на экране приветствия.</div>
        </div>`;
    return;
  }

  container.innerHTML = state.favoriteQuotes
    .map(
      (quote) => `
        <div class="quote-item">
            <div class="quote-kr">"${escapeHtml(quote.quote_kr)}"</div>
            <div class="quote-ru">${escapeHtml(quote.quote_ru)}</div>
        </div>
    `,
    )
    .join("");
}
