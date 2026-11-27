/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "./state.ts";

// Мокаем зависимости, которые требуют DOM / UI
vi.mock("./db.ts", () => ({
  scheduleSaveState: vi.fn(),
}));

vi.mock("../ui/ui_animations.ts", () => ({
  showLevelUpAnimation: vi.fn(),
  showAchievementUnlocked: vi.fn(),
}));

vi.mock("../utils/utils.ts", () => ({
  showToast: vi.fn(),
  playTone: vi.fn(),
  showComboEffect: vi.fn(),
}));

vi.mock("canvas-confetti", () => ({
  default: vi.fn(),
}));

describe("getXPForNextLevel", () => {
  it("возвращает минимум для level=0 (защита от деления на ноль)", () => {
    expect(getXPForNextLevel(0)).toBeGreaterThan(0);
    expect(getXPForNextLevel(0)).toBe(getXPForNextLevel(1));
  });

  it("растёт с уровнем", () => {
    expect(getXPForNextLevel(2)).toBeGreaterThan(getXPForNextLevel(1));
    expect(getXPForNextLevel(10)).toBeGreaterThan(getXPForNextLevel(5));
  });
});

import { addXP, checkWeeklyReset, LEAGUES } from "./stats.ts";
import { getXPForNextLevel, getTotalXP } from "./xp.ts";
describe("getTotalXP", () => {
  it("возвращает текущий XP для level=1", () => {
    expect(getTotalXP(1, 50)).toBe(50);
  });

  it("суммирует пороги всех предыдущих уровней", () => {
    const total = getTotalXP(3, 100);
    expect(total).toBe(100 + getXPForNextLevel(1) + getXPForNextLevel(2));
  });
});

describe("addXP — защита от бесконечного цикла", () => {
  beforeEach(() => {
    // Сбрасываем состояние перед каждым тестом
    state.userStats.level = 1;
    state.userStats.xp = 0;
    state.userStats.weeklyXp = 0;
    state.userStats.coins = 0;
    state.userStats.lastWeekId = undefined;
  });

  it("не зацикливается при level=0 и xp>=0", () => {
    state.userStats.level = 0 as unknown as number;
    state.userStats.xp = 1000;
    // addXP должен отработать за разумное время (guard=1000)
    addXP(0);
    expect(state.userStats.level).toBeGreaterThanOrEqual(1);
  });

  it("повышает уровень при достаточном XP", () => {
    const required = getXPForNextLevel(1);
    state.userStats.level = 1;
    state.userStats.xp = 0;
    addXP(required);
    expect(state.userStats.level).toBeGreaterThan(1);
  });

  it("не снижает уровень ниже 1 при отрицательном XP", () => {
    state.userStats.level = 5;
    state.userStats.xp = 100;
    addXP(-1000);
    expect(state.userStats.level).toBeGreaterThanOrEqual(1);
  });
});

describe("checkWeeklyReset", () => {
  beforeEach(() => {
    state.userStats.lastWeekId = undefined;
    state.userStats.weeklyXp = 0;
    state.userStats.league = "Bronze";
  });

  it("инициализирует lastWeekId при первом запуске", () => {
    const result = checkWeeklyReset();
    expect(result).toBeNull();
    expect(state.userStats.lastWeekId).toBeDefined();
  });
});

describe("LEAGUES", () => {
  it("содержит все ожидаемые лиги в порядке возрастания", () => {
    expect(LEAGUES[0]).toBe("Bronze");
    expect(LEAGUES[LEAGUES.length - 1]).toBe("Challenger");
    expect(LEAGUES.length).toBeGreaterThan(5);
  });
});
