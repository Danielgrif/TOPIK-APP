/// <reference types="vitest/globals" />
import { levenshtein, parseBilingualString, generateDiffHtml } from "./utils";

describe("Utils", () => {
  describe("levenshtein", () => {
    it("should return 0 for identical strings", () => {
      expect(levenshtein("hello", "hello")).toBe(0);
    });
    it("should return 1 for single char difference", () => {
      expect(levenshtein("cat", "cut")).toBe(1);
    });
    it("should return 1 for insertion", () => {
      expect(levenshtein("cat", "cats")).toBe(1);
    });
    it("should return length for empty string comparison", () => {
      expect(levenshtein("", "abc")).toBe(3);
    });
  });

  describe("parseBilingualString", () => {
    it("should parse standard format", () => {
      const p = parseBilingualString("Семья (가족)");
      expect(p.ru).toBe("Семья");
      expect(p.kr).toBe("가족");
    });
    it("should parse single string", () => {
      const p = parseBilingualString("Просто текст");
      expect(p.ru).toBe("Просто текст");
      expect(p.kr).toBe("Просто текст");
    });
    it("should parse string with parens inside", () => {
      const p = parseBilingualString("Тема (Topic)");
      expect(p.ru).toBe("Тема");
      expect(p.kr).toBe("Topic");
    });
  });

  describe("generateDiffHtml", () => {
    it("should generate substitution diff", () => {
      const diff = generateDiffHtml("cat", "car");
      expect(diff).toContain('diff-del">t</span>');
      expect(diff).toContain('diff-ins">r</span>');
    });
    it("should generate insertion diff", () => {
      const diff = generateDiffHtml("cat", "cats");
      expect(diff).toContain('diff-ins">s</span>');
    });
  });
});
