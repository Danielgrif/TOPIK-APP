import { client } from "../core/supabaseClient.ts";
import { openModal } from "./ui_modal.ts";
import { escapeHtml } from "../utils/utils.ts";
import { DB_TABLES } from "../core/constants.ts";
import { Article } from "../types/index.ts";

export async function openReadingModal() {
  openModal("reading-modal");
  await loadArticles();
}

async function loadArticles() {
  const container = document.getElementById("reading-list");
  const view = document.getElementById("reading-view");
  if (!container || !view) return;

  // Reset view
  container.style.display = "grid";
  view.style.display = "none";
  container.innerHTML =
    '<div style="grid-column:1/-1; text-align:center; padding:40px;"><div class="spinner-tiny"></div> Загрузка статей...</div>';

  const { data, error } = await client
    .from(DB_TABLES.ARTICLES)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading articles:", error);
    container.innerHTML = `<div style="text-align:center; color:var(--danger);">Ошибка загрузки: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-sub);">Нет доступных статей.</div>`;
    return;
  }

  renderArticleList(data as Article[]);
}

function renderArticleList(articles: Article[]) {
  const container = document.getElementById("reading-list");
  if (!container) return;

  container.innerHTML = articles
    .map((article) => {
      const image =
        article.image_url ||
        "https://via.placeholder.com/300x150?text=TOPIK+Reading";
      return `
      <div class="article-card" data-id="${article.id}">
        <img src="${escapeHtml(image)}" class="article-card-img" alt="Cover" loading="lazy">
        <div class="article-card-body">
          <div class="article-card-title">${escapeHtml(article.title)}</div>
          <div class="article-card-meta">
            <span class="article-level-badge">${escapeHtml(article.level)}</span>
            <span>${escapeHtml(article.topic)}</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  // Add click listeners
  container.querySelectorAll(".article-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = (card as HTMLElement).dataset.id;
      const article = articles.find((a) => a.id === id);
      if (article) openArticle(article);
    });
  });
}

function openArticle(article: Article) {
  const list = document.getElementById("reading-list");
  const view = document.getElementById("reading-view");
  const container = document.getElementById("article-container");
  const backBtn = document.getElementById("back-to-articles");

  if (!list || !view || !container || !backBtn) return;

  list.style.display = "none";
  view.style.display = "block";

  // Scroll to top
  const modalBody = view.closest(".modal-body");
  if (modalBody) modalBody.scrollTop = 0;

  const imageHtml = article.image_url
    ? `<img src="${escapeHtml(article.image_url)}" style="width:100%; max-height:300px; object-fit:cover; border-radius:12px; margin-bottom:20px;">`
    : "";

  const translationHtml = article.translation
    ? `<div id="article-trans-content" class="article-translation-box" style="display:none;">
         <strong>Перевод:</strong><br>${escapeHtml(article.translation).replace(/\n/g, "<br>")}
       </div>
       <button class="btn btn-quiz" id="toggle-trans-btn" style="width:100%; margin-top:20px;">Показать перевод</button>`
    : "";

  container.innerHTML = `
    <div class="article-content-wrapper">
      ${imageHtml}
      <div class="article-header">
        <div class="article-title-large">${escapeHtml(article.title)}</div>
        <div style="display:flex; gap:10px; font-size:13px; color:var(--text-sub);">
            <span class="article-level-badge">${escapeHtml(article.level)}</span>
            <span>${escapeHtml(article.topic)}</span>
            <span>${new Date(article.created_at).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="article-text">${escapeHtml(article.content).replace(/\n/g, "<br>")}</div>
      ${translationHtml}
    </div>
  `;

  // Setup translation toggle
  const toggleBtn = document.getElementById("toggle-trans-btn");
  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const box = document.getElementById("article-trans-content");
      if (box) {
        const isHidden = box.style.display === "none";
        box.style.display = isHidden ? "block" : "none";
        toggleBtn.textContent = isHidden
          ? "Скрыть перевод"
          : "Показать перевод";
      }
    };
  }

  backBtn.onclick = () => {
    view.style.display = "none";
    list.style.display = "grid";
  };
}
