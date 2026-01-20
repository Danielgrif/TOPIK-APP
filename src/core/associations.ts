import { state } from "./state.ts";
import { Word } from "../types/index.ts";

export function findAssociations(): { left: Word; right: Word }[] {
  const selected: { left: Word; right: Word }[] = [];
  const used = new Set<string | number>();
  const pool = state.dataStore.filter(w => w.type === "word");

  // 1. Try to find synonyms/antonyms first
  for (const w of pool) {
    if (selected.length >= 5) break;
    if (used.has(w.id)) continue;

    // Check synonyms
    if (w.synonyms) {
      const syn = w.synonyms.split(',')[0].trim();
      const match = pool.find(p => p.word_kr === syn && !used.has(p.id));
      if (match) {
        selected.push({ left: w, right: match });
        used.add(w.id);
        used.add(match.id);
        continue;
      }
    }
    
    // Check antonyms
    if (w.antonyms) {
      const ant = w.antonyms.split(',')[0].trim();
      const match = pool.find(p => p.word_kr === ant && !used.has(p.id));
      if (match) {
        selected.push({ left: w, right: match });
        used.add(w.id);
        used.add(match.id);
        continue;
      }
    }
  }

  // 2. Fill remaining with random pairs (same word for now, or random logic)
  // Ideally we should find words with same topic
  while (selected.length < 5) {
    const available = pool.filter(w => !used.has(w.id));
    if (available.length === 0) break;
    const w = available[Math.floor(Math.random() * available.length)];
    if (!used.has(w.id)) {
      selected.push({ left: w, right: w });
      used.add(w.id);
    }
  }

  return selected;
}
