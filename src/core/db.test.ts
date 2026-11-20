/// <reference types="vitest/globals" />
import { describe, it, expect, beforeEach, vi } from "vitest";
import { state } from "./state.ts";

// Мокаем localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

vi.mock("./supabaseClient.ts", () => ({
  client: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        gt: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
        is: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        })),
      })),
    })),
  },
}));

vi.mock("../utils/utils.ts", () => ({
  showToast: vi.fn(),
  isConnectionSlow: vi.fn(() => false),
  parseBilingualString: vi.fn((s: string) => s),
}));

vi.mock("./scheduler.ts", () => ({
  Scheduler: { calculate: vi.fn(() => ({ interval: 1, repetitions: 1, ef: 2.5 })) },
}));

vi.mock("./storage_idb.ts", () => ({
  getIdbItem: vi.fn(() => Promise.resolve(null)),
  setIdbItem: vi.fn(() => Promise.resolve()),
}));

describe("db module — dirty word tracking", () => {
  beforeEach(() => {
    state.dirtyWordIds = new Set();
    vi.clearAllMocks();
  });

  it("state.dirtyWordIds is a Set", () => {
    expect(state.dirtyWordIds).toBeInstanceOf(Set);
  });

  it("dirtyWordIds can add and check ids", () => {
    state.dirtyWordIds.add("word-1");
    expect(state.dirtyWordIds.has("word-1")).toBe(true);
    expect(state.dirtyWordIds.has("word-2")).toBe(false);
  });
});
