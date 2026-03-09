import { client } from "../core/supabaseClient.ts";
import { openModal } from "./ui_modal.ts";
import { showToast, escapeHtml } from "../utils/utils.ts";

let currentTask = "51";

const TASK_DESCRIPTIONS: Record<string, string> = {
  "51": "📝 <b>Задание 51 (Практическое):</b> Заполнение пропусков в объявлениях, письмах или сообщениях. Используйте официально-вежливый стиль (습니다/습니까).",
  "52": "🧠 <b>Задание 52 (Описательное):</b> Объяснение фактов или явлений. Логическое завершение предложений. Используйте письменный стиль (한다/인다).",
  "53": "📊 <b>Задание 53 (Анализ данных):</b> Описание графиков, таблиц и диаграмм. Сравнение данных. Объем: 200-300 знаков.",
  "54": "✍️ <b>Задание 54 (Эссе):</b> Аргументированное сочинение на заданную тему. Выражение собственного мнения. Объем: 600-700 знаков.",
};

const TASK_PLACEHOLDERS: Record<string, string> = {
  "51": "Например: Приглашение на вечеринку, объявление о потере вещи...",
  "52": "Например: О пользе чтения, почему важно спать...",
  "53": "Опишите данные графика: 'Рост экспорта Кореи за 2020-2023 годы'...",
  "54": "Тема: 'Преимущества и недостатки раннего образования'...",
};

export function openWritingModal() {
  openModal("writing-modal");
  setupWritingListeners();
}

function setupWritingListeners() {
  const taskBtns = document.querySelectorAll(
    "#writing-task-selector .segment-btn",
  );
  const checkBtn = document.getElementById("check-writing-btn");
  const answerInput = document.getElementById(
    "writing-answer",
  ) as HTMLTextAreaElement;
  const charCount = document.getElementById("char-count");

  taskBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      taskBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTask = (btn as HTMLElement).dataset.task || "51";

      // Update description
      const descEl = document.getElementById("writing-task-desc");
      if (descEl) descEl.innerHTML = TASK_DESCRIPTIONS[currentTask];

      // Update placeholder
      const qInput = document.getElementById(
        "writing-question",
      ) as HTMLTextAreaElement;
      if (qInput) qInput.placeholder = TASK_PLACEHOLDERS[currentTask];
    });
  });

  if (answerInput && charCount) {
    answerInput.addEventListener("input", () => {
      charCount.textContent = `${answerInput.value.length} знаков`;
    });
  }

  if (checkBtn) {
    checkBtn.onclick = checkEssay;
  }
}

async function checkEssay() {
  const question = (
    document.getElementById("writing-question") as HTMLTextAreaElement
  ).value;
  const answer = (
    document.getElementById("writing-answer") as HTMLTextAreaElement
  ).value;
  const resultDiv = document.getElementById("writing-result");
  const contentDiv = document.getElementById("writing-feedback-content");
  const scoreEl = document.getElementById("writing-score");
  const btn = document.getElementById("check-writing-btn") as HTMLButtonElement;

  if (!answer.trim()) {
    showToast("Напишите ответ перед проверкой");
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-tiny"></div> Проверка AI...';
  }

  try {
    const { data, error } = await client.functions.invoke("check-essay", {
      body: { taskType: currentTask, question, answer },
    });

    if (error) {
      // Пробрасываем ошибку с сервера, если она есть в теле ответа
      if (data && data.error) {
        throw new Error(data.error);
      }
      throw error;
    }

    if (resultDiv && contentDiv && scoreEl) {
      resultDiv.style.display = "block";
      scoreEl.textContent = `Оценка: ${data.score}`;

      let html = `<div style="margin-bottom: 15px; color: var(--text-main);">${escapeHtml(data.feedback)}</div>`;

      if (data.corrections && data.corrections.length > 0) {
        html += `<h5 style="margin: 10px 0;">Исправления:</h5>`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.corrections.forEach((c: any) => {
          html += `
            <div class="writing-correction-item">
              <div>
                <span class="writing-correction-original">${escapeHtml(c.original)}</span>
                ➡ <span class="writing-correction-fixed">${escapeHtml(c.corrected)}</span>
              </div>
              <span class="writing-correction-reason">${escapeHtml(c.reason)}</span>
            </div>
          `;
        });
      }

      if (data.improved_version) {
        html += `
          <h5 style="margin: 15px 0 5px 0;">Улучшенная версия:</h5>
          <div class="writing-improved-box">${escapeHtml(data.improved_version)}</div>
        `;
      }

      contentDiv.innerHTML = html;

      // Scroll to result
      resultDiv.scrollIntoView({ behavior: "smooth" });
    }
  } catch (e: unknown) {
    console.error("Writing check error:", e);
    const err = e as Error;
    showToast("Ошибка проверки: " + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "✨ Проверить с AI";
    }
  }
}
