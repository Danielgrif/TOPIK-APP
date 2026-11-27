/**
 * Расчёт опыта (XP) и уровней.
 * Выделен из stats.ts для отделения логики расчёта XP от рендеринга UI.
 */

/**
 * Возвращает количество XP, необходимое для перехода на следующий уровень.
 * level = 0 клампится к 1, чтобы избежать деления на ноль и бесконечного цикла.
 */
export function getXPForNextLevel(lvl: number): number {
  // Было: 100 + lvl * 50 (Линейная)
  // Стало: 100 * (lvl ^ 1.2) (Слегка экспоненциальная, сложнее на высоких уровнях)
  return Math.floor(100 * Math.pow(Math.max(1, lvl), 1.2));
}

/**
 * Возвращает общий XP, необходимый для достижения указанного уровня (без учёта текущего XP).
 * level = 1 возвращает 0 (уже на этом уровне).
 */
export function getTotalXP(level: number, currentXP: number): number {
  let total = currentXP;
  for (let i = 1; i < level; i++) {
    total += getXPForNextLevel(i);
  }
  return total;
}
