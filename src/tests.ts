import { Scheduler } from './core/scheduler.ts';
import { levenshtein, parseBilingualString, generateDiffHtml } from './utils/utils.ts';
import { QuizStrategies } from './ui/quiz_strategies.ts';
import { state } from './core/state.ts';
// @ts-ignore
import { runCrossfadeTests } from './test_crossfade.js';
import { Word } from './types/index.ts';

/**
 * Comprehensive Test Runner for Scheduler Logic
 */
export async function runTests() {
    console.group('🧪 Запуск тестов');
    let passed = 0;
    let failed = 0;

    const assert = (desc: string, condition: boolean) => {
        if (condition) {
            console.log(`%c✅ PASS: ${desc}`, 'color: #00b894');
            passed++;
        } else {
            console.error(`❌ FAIL: ${desc}`);
            failed++;
        }
    };

    const assertRange = (desc: string, actual: number, min: number, max: number) => {
        if (actual >= min && actual <= max) {
             console.log(`%c✅ PASS: ${desc} (Got ${actual}, Expected [${min}-${max}])`, 'color: #00b894');
             passed++;
        } else {
             console.error(`❌ FAIL: ${desc} (Got ${actual}, Expected [${min}-${max}])`);
             failed++;
        }
    };

    try {
        console.log('📘 Core SM-2 Logic');

        // 1. Init
        Scheduler.init({ dataStore: [], wordHistory: {} });
        assert('Scheduler инициализируется пустыми данными', Scheduler._data.length === 0);

        // 2. New Item (Grade 5 - Easy)
        // Interval should be 1 day
        let item = { interval: 0, repetitions: 0, ef: 2.5 };
        let res = Scheduler.calculate(5, item);
        assert('New item (5): interval 1', res.interval === 1);
        assert('New item (5): reps 1', res.repetitions === 1);
        assert('New item (5): EF increases', res.ef > 2.5);

        // 3. Rep 1 -> 2 (Grade 4 - Good)
        // Interval should be 6 days
        item = { interval: 1, repetitions: 1, ef: 2.6 };
        res = Scheduler.calculate(4, item);
        // 6 +/- 5% fuzz -> 5.7 to 6.3 -> rounds to 6
        assert('Rep 1->2 (4): interval 6', res.interval === 6);
        
        // 4. Hard Item (Grade 3)
        // Interval = previous * 1.2. 10 * 1.2 = 12.
        // Fuzz: 12 +/- 5% -> [11.4, 12.6] -> [11, 13]
        item = { interval: 10, repetitions: 2, ef: 2.5 };
        res = Scheduler.calculate(3, item);
        assertRange('Hard item (3): interval ~12', res.interval, 11, 13);
        assert('Hard item (3): EF decreases', res.ef < 2.5);

        // 5. Fail (Grade 0) - Mature
        // Soft Reset: 20% of 100 = 20.
        // Fuzz: 20 +/- 5% -> [19, 21]
        item = { interval: 100, repetitions: 5, ef: 2.5 };
        res = Scheduler.calculate(0, item);
        assert('Fail mature (0): reps 0', res.repetitions === 0);
        assertRange('Fail mature (0): soft reset ~20', res.interval, 19, 21);

        // 6. Fail (Grade 0) - Young
        // Interval < 10 -> reset to 1
        item = { interval: 3, repetitions: 1, ef: 2.5 };
        res = Scheduler.calculate(0, item);
        assert('Fail young (0): interval 1', res.interval === 1);

        console.log('📘 Late Review Logic');
        
        // 7. Late Review
        // Interval 10 days, but reviewed after 20 days (10 days late)
        // Effective interval = 20.
        // Grade 4 (Good) -> New Interval = 20 * EF (2.5) = 50
        // Fuzz: 50 +/- 5% -> [47.5, 52.5] -> [47, 53]
        item = { interval: 10, repetitions: 3, ef: 2.5 };
        const lastReview = Date.now() - (20 * 24 * 60 * 60 * 1000); // 20 days ago
        res = Scheduler.calculate(4, item, lastReview);
        assertRange('Late review compensation', res.interval, 47, 53);

        console.log('📘 Queue Management');

        // 8. getQueue
        const now = Date.now();
        const mockData = [
            { id: 1, word_kr: 'Due', translation: 'Due' },
            { id: 2, word_kr: 'Future', translation: 'Future' }, 
            { id: 3, word_kr: 'New', translation: 'New' }
        ] as Word[];
        
        const mockHistory = {
            1: { attempts: 1, correct: 1, lastReview: now - 20000, sm2: { interval: 1, repetitions: 1, ef: 2.5, nextReview: now - 10000 } }, // Due
            3: { attempts: 1, correct: 0, lastReview: now - 5000 } // New (has history but no sm2)
        };
        Scheduler.init({ dataStore: mockData, wordHistory: mockHistory });
        const q = Scheduler.getQueue();
        
        assert('Queue contains due items', q.some((w: any) => w.id === 1));
        assert('Queue contains new items (no sm2)', q.some((w: any) => w.id === 3));
        assert('Queue excludes future items', !q.some((w: any) => w.id === 2));
        // New items (nextReview=0) should come before Due items (nextReview=timestamp)
        assert('Queue order (New first)', q[0].id === 3);

        console.log('📘 Utils Logic');
        
        // 9. Levenshtein
        assert('Levenshtein (same)', levenshtein('hello', 'hello') === 0);
        assert('Levenshtein (1 diff)', levenshtein('cat', 'cut') === 1);
        assert('Levenshtein (insert)', levenshtein('cat', 'cats') === 1);
        assert('Levenshtein (empty)', levenshtein('', 'abc') === 3);

        // 10. Parse Bilingual String
        const p1 = parseBilingualString('Семья (가족)');
        assert('Parse Bilingual (Standard)', p1.ru === 'Семья' && p1.kr === '가족');
        
        const p2 = parseBilingualString('Просто текст');
        assert('Parse Bilingual (Single)', p2.ru === 'Просто текст' && p2.kr === 'Просто текст');

        const p3 = parseBilingualString('Тема (Topic)');
        assert('Parse Bilingual (Parens)', p3.ru === 'Тема' && p3.kr === 'Topic');

        // 11. Generate Diff HTML
        const diff1 = generateDiffHtml('cat', 'car');
        assert('Diff HTML (Substitution)', diff1.includes('diff-del">t</span>') && diff1.includes('diff-ins">r</span>'));
        const diff2 = generateDiffHtml('cat', 'cats');
        assert('Diff HTML (Insertion)', diff2.includes('diff-ins">s</span>'));
    } catch (e) {
        console.error('💥 Exception:', e);
        failed++;
    }

    try {
        console.log('📘 Quiz Strategies');
        // Mock data for quiz tests
        state.dataStore = [{id:1, word_kr:'A', translation:'A'}, {id:2, word_kr:'B', translation:'B'}, {id:3, word_kr:'C', translation:'C'}, {id:4, word_kr:'D', translation:'D'}, {id:5, word_kr:'E', translation:'E'}] as Word[];
        
        const mockWord = { id: 1, word_kr: 'Test', translation: 'Тест' } as Word;
        const mockContainer = document.createElement('div');
        const mockQEl = document.createElement('div');
        
        // Test Multiple Choice
        QuizStrategies['multiple-choice'].render(mockWord, mockContainer, () => {}, mockQEl);
        assert('Multiple Choice renders options', mockContainer.children.length > 0);
        
        // Test Typing
        QuizStrategies['typing'].render(mockWord, mockContainer, () => {}, mockQEl);
        assert('Typing renders input', mockContainer.querySelector('input') !== null);
    } catch (e) {
        console.error('💥 Quiz Strategy Exception:', e);
        failed++;
    }

    if (runCrossfadeTests) await runCrossfadeTests(assert, assertRange);

    console.log(`\n🏁 Result: ${passed} Passed, ${failed} Failed`);
    console.groupEnd();
    
    return { passed, failed };
}