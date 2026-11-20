// Глобальные моки браузерных API для тестов в Node.js окружении
// state.ts, session.ts, stats.ts обращаются к window/document/localStorage при загрузке модуля
import { vi } from "vitest";

// В Node.js окружении vitest нет window/document/localStorage — создаём их на globalThis
if (typeof window === "undefined") {
  (globalThis as unknown as { window?: unknown }).window = globalThis;
}

// localStorage мок
const localStorageStore: Record<string, string> = {};
Object.defineProperty(window, "localStorage", {
  writable: true,
  value: {
    getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      localStorageStore[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete localStorageStore[key];
    }),
    clear: vi.fn(() => {
      Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    }),
  },
});

// document мок (минимум,必要 для stats.ts и session.ts)
Object.defineProperty(window, "document", {
  writable: true,
  value: {
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    body: {
      appendChild: vi.fn(),
      insertAdjacentHTML: vi.fn(),
    },
    createElement: vi.fn(() => ({
      className: "",
      classList: { add: vi.fn(), remove: vi.fn(), contains: vi.fn() },
      style: {},
      dataset: {},
      appendChild: vi.fn(),
      addEventListener: vi.fn(),
    })),
  } as unknown as Document,
});

// matchMedia мок
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn(() => ({ matches: false })),
});
