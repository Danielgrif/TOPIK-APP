import { playTone } from "../utils/utils.ts";
import confetti from "canvas-confetti";

export function showLevelUpAnimation(level: number) {
  const overlay = document.getElementById("level-up-overlay");
  const valEl = document.getElementById("level-up-val");
  if (!overlay || !valEl) return;

  valEl.textContent = String(level);
  overlay.classList.add("active");
  playTone("success", 300);
  const isMobile = window.innerWidth < 768;
  confetti({
    particleCount: isMobile ? 100 : 200,
    spread: isMobile ? 60 : 100,
    origin: { y: 0.6 },
    disableForReducedMotion: true,
    zIndex: 20020,
  });
}

export function showAchievementUnlocked(
  title: string,
  icon: string,
  progress?: number,
  max?: number,
) {
  let overlay = document.getElementById("achievement-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "achievement-overlay";
    overlay.innerHTML = `
        <div class="achievement-popup">
            <div class="ach-icon-wrapper">
                <div class="ach-icon"></div>
            </div>
            <div class="ach-text">
                <div class="ach-label">ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО</div>
                <div class="ach-title"></div>
                <div class="ach-progress-display" style="display: none;">
                    <div class="ach-progress-bar-popup">
                        <div class="ach-progress-fill-popup"></div>
                    </div>
                    <div class="ach-progress-text-popup"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
  }

  const iconEl = overlay.querySelector(".ach-icon");
  const titleEl = overlay.querySelector(".ach-title");
  const progressDisplay = overlay.querySelector(".ach-progress-display") as HTMLElement;
  const progressFill = overlay.querySelector(".ach-progress-fill-popup") as HTMLElement;
  const progressText = overlay.querySelector(".ach-progress-text-popup");

  if (iconEl) iconEl.textContent = icon;
  if (titleEl) titleEl.textContent = title;

  // Логика для отображения прогресса
  if (
    progressDisplay &&
    progressFill &&
    progressText &&
    typeof progress === "number" &&
    typeof max === "number" &&
    max > 1
  ) {
    progressDisplay.style.display = "block";
    progressText.textContent = `${progress}/${max}`;
    // Анимация заполнения полосы
    requestAnimationFrame(() => {
      progressFill.style.width = `${(progress / max) * 100}%`;
    });
  } else if (progressDisplay) {
    progressDisplay.style.display = "none";
  }

  overlay.classList.remove("active");
  void overlay.offsetWidth; // Force reflow
  overlay.classList.add("active");

  playTone("achievement-unlock");

  setTimeout(() => {
    overlay?.classList.remove("active");
  }, 4000);
}
