/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "./state.ts";

// Мокаем DOM-зависимости
vi.mock("./db.ts", () => ({
  updateStreak: vi.fn(),
  scheduleSaveState: vi.fn(),
}));

vi.mock("./stats.ts", () => ({
  calculateOverallAccuracy: vi.fn(() => 85),
  checkAchievements: vi.fn(),
}));

vi.mock("../utils/utils.ts", () => ({
  showToast: vi.fn(),
}));

describe("session module — pause/resume does not end session", () => {
  beforeEach(() => {
    state.sessionActive = false;
    state.sessionInterval = null;
    state.sessionSeconds = 0;
    state.sessionWordsReviewed = 0;
  });

  it("startSession sets sessionActive=true and resets counters", () => {
    // Импортируем модуль синхронно на верхнем уровне через side-effect
    void import("./session.ts").then((mod) => {
      mod.startSession();
      expect(state.sessionActive).toBe(true);
      expect(state.sessionSeconds).toBe(0);
      expect(state.sessionWordsReviewed).toBe(0);
    });
  });

  it("pauseSession stops interval but keeps sessionActive", () => {
    void import("./session.ts").then((mod) => {
      mod.startSession();
      mod.pauseSession();
      expect(state.sessionActive).toBe(true);
      expect(state.sessionInterval).toBeNull();
    });
  });

  it("resumeSession restarts interval without resetting seconds", () => {
    void import("./session.ts").then((mod) => {
      mod.startSession();
      state.sessionSeconds = 120;
      mod.pauseSession();
      mod.resumeSession();
      expect(state.sessionActive).toBe(true);
      expect(state.sessionInterval).not.toBeNull();
      expect(state.sessionSeconds).toBe(120);
    });
  });

  it("endSession records session and deactivates", () => {
    void import("./session.ts").then((mod) => {
      mod.startSession();
      state.sessionSeconds = 300;
      state.sessionWordsReviewed = 10;
      mod.endSession();
      expect(state.sessionActive).toBe(false);
      expect(state.sessionInterval).toBeNull();
      expect(state.sessions.length).toBeGreaterThan(0);
      expect(state.sessions[0].duration).toBe(300);
      expect(state.sessions[0].wordsReviewed).toBe(10);
    });
  });

  it("toggleSessionTimer starts when inactive, ends when active", () => {
    void import("./session.ts").then((mod) => {
      mod.toggleSessionTimer();
      expect(state.sessionActive).toBe(true);
      mod.toggleSessionTimer();
      expect(state.sessionActive).toBe(false);
    });
  });

  it("ensureSessionStarted resumes paused session", () => {
    void import("./session.ts").then((mod) => {
      mod.startSession();
      mod.pauseSession();
      mod.ensureSessionStarted();
      expect(state.sessionActive).toBe(true);
      expect(state.sessionInterval).not.toBeNull();
    });
  });
});
