import { state } from './js/core/state.js';

// Это "заглушка" для функции crossfade, скопированная из ui_settings.js
// В реальном тестовом окружении мы бы импортировали ее, но здесь для простоты дублируем.
/**
 * @param {any} fadeInPlayer
 * @param {any} fadeOutPlayer
 * @param {number} finalVolume
 * @param {number} startVolume
 * @param {() => void} [onComplete]
 */
function crossfade(fadeInPlayer, fadeOutPlayer, finalVolume, startVolume, onComplete) {
    let currentFadeInVol = fadeInPlayer.volume;
    let currentFadeOutVol = fadeOutPlayer ? fadeOutPlayer.volume : 0;
    const steps = 20;
    const fadeInStep = (finalVolume - currentFadeInVol) / steps;
    const fadeOutStep = fadeOutPlayer ? (startVolume - currentFadeOutVol) / steps : 0;

    let stepCount = 0;
    const intervalId = setInterval(() => {
        stepCount++;
        currentFadeInVol += fadeInStep;
        if (fadeOutPlayer) currentFadeOutVol += fadeOutStep;

        fadeInPlayer.volume = Math.max(0, Math.min(finalVolume, currentFadeInVol));
        if (fadeOutPlayer) fadeOutPlayer.volume = Math.max(0, Math.min(1, currentFadeOutVol));

        if (stepCount >= steps) {
            fadeInPlayer.volume = finalVolume;
            if (fadeOutPlayer) {
                fadeOutPlayer.volume = 0;
                fadeOutPlayer.pause();
            }
            clearInterval(intervalId);
            if (onComplete) onComplete();
        }
    }, 1); // Используем 1мс для быстрого теста
}


/**
 * @param {(desc: string, condition: boolean) => void} assert
 * @param {(desc: string, actual: number, min: number, max: number) => void} assertRange
 */
export function runCrossfadeTests(assert, assertRange) {
    console.group('🎧 Тесты Crossfade');

    // Mock Audio Players
    const playerA = { volume: 0, paused: true, play: () => {}, pause: () => {} };
    const playerB = { volume: 1, paused: false, play: () => {}, pause: () => {} };

    // --- Test 1: Standard Crossfade ---
    /** @type {Promise<void>} */
    const test1Promise = new Promise(resolve => {
        playerA.volume = 0;
        playerB.volume = 1;
        crossfade(playerA, playerB, 0.5, 0, () => {
            assert('Crossfade: fadeIn volume is correct', playerA.volume === 0.5);
            assert('Crossfade: fadeOut volume is correct', playerB.volume === 0);
            assert('Crossfade: fadeOut player is paused', playerB.paused === true);
            resolve();
        });
    });

    // --- Test 2: Fade In Only ---
    /** @type {Promise<void>} */
    const test2Promise = new Promise(resolve => {
        playerA.volume = 0;
        crossfade(playerA, null, 0.8, 0, () => {
            assert('FadeIn Only: volume is correct', playerA.volume === 0.8);
            resolve();
        });
    });
    
    // --- Test 3: Fade Out Only ---
    /** @type {Promise<void>} */
    const test3Promise = new Promise(resolve => {
        playerB.volume = 1;
        playerB.paused = false;
        // Мы "обманываем" функцию, передавая тот же плеер на затухание, но с целевой громкостью 0
        crossfade(playerB, playerB, 0, 1, () => {
            assert('FadeOut Only: volume is zero', playerB.volume === 0);
            assert('FadeOut Only: player is paused', playerB.paused === true);
            resolve();
        });
    });

    return Promise.all([test1Promise, test2Promise, test3Promise]).then(() => {
        console.groupEnd();
    });
}