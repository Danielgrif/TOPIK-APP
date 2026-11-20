import { state } from "../core/state.ts";
import { escapeHtml } from "../utils/utils.ts";
import { BaseComponent } from "./BaseComponent.ts";
import { openModal } from "./ui_modal.ts";

class QuotesComponent extends BaseComponent {
  constructor() {
    // Используем ID модального окна для базового компонента
    super("quotes-modal");
  }

  public show() {
    if (!this.element.id || !document.body.contains(this.element)) {
      const el = document.getElementById("quotes-modal");
      if (el) this.element = el;
    }
    openModal("quotes-modal");
    this.render();
  }

  public render(): void {
    // Ищем контейнер внутри элемента компонента или в документе (для надежности)
    const container =
      this.element.querySelector("#favorite-quotes-list") ||
      document.getElementById("favorite-quotes-list") ||
      document.getElementById("quotes-list");
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
}

const quotesView = new QuotesComponent();

export function renderFavoriteQuotes() {
  quotesView.render();
}
