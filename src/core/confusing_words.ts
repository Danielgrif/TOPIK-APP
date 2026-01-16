import { state } from './state.ts';
import { levenshtein } from '../utils/utils.ts';
import { Word } from '../types/index.ts';

export function findConfusingWords(): Word[][] {
    const words = state.dataStore.filter(w => w.type === 'word' && w.word_kr.length > 1);
    const groups: Word[][] = [];
    const used = new Set<string | number>();

    words.sort((a, b) => a.word_kr.length - b.word_kr.length);

    for (let i = 0; i < words.length; i++) {
        if (used.has(words[i].id)) continue;

        const currentGroup = [words[i]];
        const w1 = words[i].word_kr;

        for (let j = i + 1; j < words.length; j++) {
            const w2 = words[j].word_kr;
            
            if (Math.abs(w2.length - w1.length) > 1) {
                if (w2.length > w1.length + 1) break; 
                continue;
            }

            const dist = levenshtein(w1, w2);
            
            if (dist === 1) {
                currentGroup.push(words[j]);
                used.add(words[j].id);
            }
        }

        if (currentGroup.length > 1) {
            groups.push(currentGroup);
            used.add(words[i].id);
        }
        
        if (groups.length >= 50) break;
    }

    return groups;
}