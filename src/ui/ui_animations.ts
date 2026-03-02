import { playTone } from "../utils/utils.ts";

export function showLevelUpAnimation(level: number) {
  const overlay = document.getElementById("level-up-overlay");
  const valEl = document.getElementById("level-up-val");
  if (!overlay || !valEl) return;

  valEl.textContent = String(level);
  overlay.classList.add("active");
  playTone("success", 300);

  if (typeof window.confetti === "function") {
    window.confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.6 },
      zIndex: 20020,
    });
  }
}
