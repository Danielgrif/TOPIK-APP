import { state } from './state.js';
import { levenshtein } from '../utils/utils.js';

/**
 * Finds groups of confusing words based on Levenshtein distance.
 * @returns {Array<Array<any>>} Array of word groups (pairs or triplets).
 */
export function findConfusingWords() {
    const words = state.dataStore.filter(w => w.type === 'word' && w.word_kr.length > 1);
    const groups = [];
    const used = new Set();

    // Sort by length to optimize comparisons (only compare similar lengths)
    words.sort((a, b) => a.word_kr.length - b.word_kr.length);

    for (let i = 0; i < words.length; i++) {
        if (used.has(words[i].id)) continue;

        const currentGroup = [words[i]];
        const w1 = words[i].word_kr;

        // Look ahead in the sorted array
        for (let j = i + 1; j < words.length; j++) {
            const w2 = words[j].word_kr;
            
            // Optimization: If length difference is > 1, Levenshtein distance must be > 1
            if (Math.abs(w2.length - w1.length) > 1) {
                // Since array is sorted by length, we can stop checking further if length diff grows
                if (w2.length > w1.length + 1) break; 
                continue;
            }

            const dist = levenshtein(w1, w2);
            
            // Threshold: Distance 1 (very similar)
            if (dist === 1) {
                currentGroup.push(words[j]);
                used.add(words[j].id);
            }
        }

        if (currentGroup.length > 1) {
            groups.push(currentGroup);
            used.add(words[i].id);
        }
        
        // Limit to prevent freezing on huge datasets, though 50 groups is plenty for a quiz
        if (groups.length >= 50) break;
    }

    return groups;
}