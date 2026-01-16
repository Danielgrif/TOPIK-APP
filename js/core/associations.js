import { state } from './state.js';

/**
 * Finds pairs of words for the matching game.
 * Currently implements "Word <-> Translation" matching.
 * @returns {Array<{left: any, right: any}>}
 */
export function findAssociations() {
    // Filter valid words
    const pool = state.dataStore.filter(w => w.type === 'word' && w.word_kr && w.translation);
    
    if (pool.length < 5) return [];
    
    const selected = [];
    const used = new Set();
    
    // Pick 5 random unique words
    while (selected.length < 5) {
        const w = pool[Math.floor(Math.random() * pool.length)];
        if (!used.has(w.id)) {
            // We return the same word object for both sides.
            // The UI strategy will handle displaying Korean on left and Russian on right.
            selected.push({ left: w, right: w }); 
            used.add(w.id);
        }
    }
    
    return selected;
}

/**
 * Checks if two words are a valid pair.
 * @param {any} w1 
 * @param {any} w2 
 * @returns {boolean}
 */
export function checkAssociation(w1, w2) {
    if (!w1 || !w2 || !('id' in w1) || !('id' in w2)) return false;
    return String(w1.id) === String(w2.id); // Cast to string for robust comparison
}