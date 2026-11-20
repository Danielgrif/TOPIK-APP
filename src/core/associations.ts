import { state } from "./state.ts";
import { Word } from "../types/index.ts";

export function findAssociations(): { left: Word; right: Word }[] {
  const selected: { left: Word; right: Word }[] = [];
  const used = new Set<string | number>();
  const pool = state.dataStore.filter((w) => w.type === "word");

  // 1. Try to find synonyms/antonyms first
  for (const w of pool) {
    if (selected.length >= 5) break;
    if (used.has(w.id)) continue;

    // Check synonyms
    if (w.synonyms) {
      const syn = w.synonyms.split(",")[0].trim();
      const match = pool.find((p) => p.word_kr === syn && !used.has(p.id));
      if (match) {
        selected.push({ left: w, right: match });
        used.add(w.id);
        used.add(match.id);
        continue;
      }
    }

    // Check antonyms
    if (w.antonyms) {
      const ant = w.antonyms.split(",")[0].trim();
      const match = pool.find((p) => p.word_kr === ant && !used.has(p.id));
      if (match) {
        selected.push({ left: w, right: match });
        used.add(w.id);
        used.add(match.id);
        continue;
      }
    }
  }

  // 2. If not enough pairs, try to fill with words from the same topic
  if (selected.length < 5) {
    const wordsByTopic: Record<string, Word[]> = {};
    const availablePool = pool.filter((w) => !used.has(w.id));

    // Group available words by topic
    for (const w of availablePool) {
      const topic = w.topic || w.topic_ru || "unknown";
      if (topic !== "unknown") {
        if (!wordsByTopic[topic]) {
          wordsByTopic[topic] = [];
        }
        wordsByTopic[topic].push(w);
      }
    }

    const needed = 5 - selected.length;

    // Find topics that have at least 'needed' words
    const suitableTopics = Object.keys(wordsByTopic).filter(
      (topic) => wordsByTopic[topic].length >= needed,
    );

    if (suitableTopics.length > 0) {
      const topicKey = suitableTopics[Math.floor(Math.random() * suitableTopics.length)];
      const wordPool = wordsByTopic[topicKey].sort(() => 0.5 - Math.random());

      for (let i = 0; i < needed; i++) {
        const w = wordPool[i];
        // The user matches the word to its own translation, but in a challenging context of other same-topic words.
        selected.push({ left: w, right: w });
        used.add(w.id);
      }
    }
  }

  // 3. As a final fallback, fill with completely random words
  while (selected.length < 5) {
    const lastResortPool = pool.filter((w) => !used.has(w.id));
    if (lastResortPool.length === 0) break;
    const w = lastResortPool[Math.floor(Math.random() * lastResortPool.length)];
    selected.push({ left: w, right: w });
    used.add(w.id);
  }

  return selected;
}
