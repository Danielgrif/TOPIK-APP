/// <reference types="vitest/globals" />
import { Scheduler } from "./scheduler";
import { Word } from "../types/index";

describe("Scheduler (SM-2)", () => {
  beforeEach(() => {
    Scheduler.init({ dataStore: [], wordHistory: {} });
  });

  it("should initialize with empty data", () => {
    expect(Scheduler._data.length).toBe(0);
  });

  it("should calculate correct interval for new item (Grade 5)", () => {
    const item = { interval: 0, repetitions: 0, ef: 2.5 };
    const res = Scheduler.calculate(5, item);
    expect(res.interval).toBe(1);
    expect(res.repetitions).toBe(1);
    expect(res.ef).toBeGreaterThan(2.5);
  });

  it("should calculate correct interval for Rep 1->2 (Grade 4)", () => {
    const item = { interval: 1, repetitions: 1, ef: 2.6 };
    const res = Scheduler.calculate(4, item);
    // 6 +/- 5% fuzz -> 5.7 to 6.3 -> rounds to 6
    expect(res.interval).toBe(6);
  });

  it("should calculate correct interval for Hard Item (Grade 3)", () => {
    const item = { interval: 10, repetitions: 2, ef: 2.5 };
    const res = Scheduler.calculate(3, item);
    // Interval = previous * 1.2. 10 * 1.2 = 12.
    // Fuzz: 12 +/- 5% -> [11.4, 12.6] -> [11, 13]
    expect(res.interval).toBeGreaterThanOrEqual(11);
    expect(res.interval).toBeLessThanOrEqual(13);
    expect(res.ef).toBeLessThan(2.5);
  });

  it("should handle Fail (Grade 0) - Mature", () => {
    const item = { interval: 100, repetitions: 5, ef: 2.5 };
    const res = Scheduler.calculate(0, item);
    expect(res.repetitions).toBe(0);
    // Soft Reset: 20% of 100 = 20.
    // Fuzz: 20 +/- 5% -> [19, 21]
    expect(res.interval).toBeGreaterThanOrEqual(19);
    expect(res.interval).toBeLessThanOrEqual(21);
  });

  it("should handle Fail (Grade 0) - Young", () => {
    const item = { interval: 3, repetitions: 1, ef: 2.5 };
    const res = Scheduler.calculate(0, item);
    expect(res.interval).toBe(1);
  });

  it("should compensate for Late Review", () => {
    const item = { interval: 10, repetitions: 3, ef: 2.5 };
    const lastReview = Date.now() - 20 * 24 * 60 * 60 * 1000; // 20 days ago
    const res = Scheduler.calculate(4, item, lastReview);
    // Effective interval = 20.
    // Grade 4 (Good) -> New Interval = 20 * EF (2.5) = 50
    // Fuzz: 50 +/- 5% -> [47.5, 52.5] -> [47, 53]
    expect(res.interval).toBeGreaterThanOrEqual(47);
    expect(res.interval).toBeLessThanOrEqual(53);
  });

  it("should enforce EF Lower Bound", () => {
    const item = { interval: 10, repetitions: 5, ef: 1.3 };
    const res = Scheduler.calculate(3, item);
    expect(Math.abs(res.ef - 1.3)).toBeLessThan(0.001);
  });

  it("should clamp Grade > 5", () => {
    const item = { interval: 10, repetitions: 5, ef: 2.5 };
    const res = Scheduler.calculate(100, item);
    // Grade 5 logic: interval * ef * 1.3. 10 * 2.5 * 1.3 = 32.5 -> 33
    // EF change for grade 5: 2.5 -> 2.6
    expect(Math.abs(res.ef - 2.6)).toBeLessThan(0.001);
  });

  it("should handle Soft Lapse Boundary (10 -> 1)", () => {
    const item = { interval: 10, repetitions: 5, ef: 2.5 };
    const res = Scheduler.calculate(0, item);
    expect(res.interval).toBe(1);
  });

  it("should handle Soft Lapse Boundary (11 -> 2)", () => {
    const item = { interval: 11, repetitions: 5, ef: 2.5 };
    const res = Scheduler.calculate(0, item);
    // max(1, 11*0.2) = 2.2 -> 2
    expect(res.interval).toBe(2);
  });

  it("should correctly prioritize queue", () => {
    const now = Date.now();
    const mockData = [
      { id: 1, word_kr: "Due", translation: "Due" },
      { id: 2, word_kr: "Future", translation: "Future" },
      { id: 3, word_kr: "New", translation: "New" },
    ] as Word[];

    const mockHistory = {
      1: {
        attempts: 1,
        correct: 1,
        lastReview: now - 20000,
        sm2: { interval: 1, repetitions: 1, ef: 2.5, nextReview: now - 10000 },
      }, // Due
      3: { attempts: 1, correct: 0, lastReview: now - 5000 }, // New (has history but no sm2)
    };
    Scheduler.init({ dataStore: mockData, wordHistory: mockHistory });
    const q = Scheduler.getQueue();

    expect(q.some((w) => w.id === 1)).toBe(true);
    expect(q.some((w) => w.id === 3)).toBe(true);
    expect(q.some((w) => w.id === 2)).toBe(false);
    // New items (nextReview=0) should come before Due items (nextReview=timestamp)
    expect(q[0].id).toBe(3);
  });
});
