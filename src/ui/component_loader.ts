import statsHtml from "../html/modals/stats.html?raw";
import quizHtml from "../html/modals/quiz.html?raw";
import authHtml from "../html/modals/auth.html?raw";
import collectionsHtml from "../html/modals/collections.html?raw";
import studyHtml from "../html/modals/study.html?raw";
import wordActionsHtml from "../html/modals/word_actions.html?raw";
import shopHtml from "../html/modals/shop.html?raw";
import commonHtml from "../html/modals/common.html?raw";
import filterPanelHtml from "../html/partials/filter_panel.html?raw";
import bottomNavHtml from "../html/partials/bottom_nav.html?raw";
import headerHtml from "../html/partials/header.html?raw";
import toolbarHtml from "../html/partials/toolbar.html?raw";
import overlaysHtml from "../html/partials/overlays.html?raw";
import grammarHtml from "../html/modals/grammar.html?raw";
import hanjaHtml from "../html/modals/hanja.html?raw";
import trashHtml from "../html/modals/trash.html?raw";
import quotesHtml from "../html/modals/quotes.html?raw";
import achievementsHtml from "../html/modals/achievements.html?raw";
import selectionModalsHtml from "../html/modals/selection_modals.html?raw";

/**
 * Загружает HTML-компоненты (модальные окна) и вставляет их в DOM.
 * Вызывается в app.ts перед инициализацией UI.
 */
export function injectComponents(): void {
  // eslint-disable-next-line no-console
  console.log("🧩 Injecting UI components...");

  // 1. Инъекция Хедера и Тулбара (в поток документа)
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.insertAdjacentHTML("beforebegin", headerHtml);
    mainContent.insertAdjacentHTML("afterbegin", toolbarHtml);
  } else {
    console.error("❌ #main-content not found, header injection failed.");
  }

  // 2. Инъекция Модальных окон и Оверлеев (в конец body)
  const container = document.createElement("div");
  container.id = "injected-components";

  // Собираем HTML в одну строку. Порядок не критичен для функционала,
  // но важен для CSS (z-index), если окна перекрываются.
  container.innerHTML = [
    statsHtml,
    quizHtml,
    authHtml,
    collectionsHtml,
    studyHtml,
    wordActionsHtml,
    shopHtml,
    commonHtml,
    filterPanelHtml,
    bottomNavHtml,
    overlaysHtml,
    grammarHtml,
    hanjaHtml,
    trashHtml,
    quotesHtml,
    achievementsHtml,
    selectionModalsHtml,
  ].join("\n");

  // Вставляем в конец body
  document.body.appendChild(container);
}
