import { state } from "./state.ts";
import { Word } from "../types/index.ts";

export function findAssociations(): { left: Word; right: Word }[] {
  const pool = state.dataStore.filter(
    (w) => w.type === "word" && w.word_kr && w.translation,
  );

  if (pool.length < 5) return [];

  const selected: { left: Word; right: Word }[] = [];
  const used = new Set<string | number>();

  while (selected.length < 5) {
    const w = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(w.id)) {
      selected.push({ left: w, right: w });
      used.add(w.id);
    }
  }

  return selected;
}

export function checkAssociation(
  w1: Word | undefined,
  w2: Word | undefined,
): boolean {
  if (!w1 || !w2 || !w1.id || !w2.id) return false;
  return String(w1.id) === String(w2.id);
}
