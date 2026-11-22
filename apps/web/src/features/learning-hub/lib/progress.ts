import type { LearningProgress } from '../types';

export const DAILY_GOAL_NUTS = 50;
export const NUTS_PER_LEVEL = 100;
export const STORAGE_KEY = 'mochi.learning-hub.v2';

export function createInitialProgress(today: string): LearningProgress {
  return { completedQuestIds: [], totalNuts: 0, streak: 0, lastActiveDate: null, daily: { date: today, nuts: 0 } };
}

export function toDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function previousDateKey(key: string): string {
  const [y = 1970, m = 1, d = 1] = key.split('-').map(Number);
  return toDateKey(new Date(y, m - 1, d - 1));
}

export function levelInfo(totalNuts: number) {
  const level = Math.floor(totalNuts / NUTS_PER_LEVEL) + 1;
  const intoLevel = totalNuts % NUTS_PER_LEVEL;
  return { level, intoLevel, perLevel: NUTS_PER_LEVEL, toNext: NUTS_PER_LEVEL - intoLevel };
}

/** Streak shown to the user: it reads 0 once a full day has been missed. */
export function displayStreak(p: LearningProgress, today: string): number {
  if (!p.lastActiveDate) return 0;
  return p.lastActiveDate === today || p.lastActiveDate === previousDateKey(today) ? p.streak : 0;
}

export function dailyNutsToday(p: LearningProgress, today: string): number {
  return p.daily.date === today ? p.daily.nuts : 0;
}

/**
 * Marks a lesson complete. Nuts, daily goal and streak only move the first time
 * a lesson is finished; replaying a lesson is free practice.
 */
export function applyQuestCompletion(p: LearningProgress, questId: string, nuts: number, today: string): LearningProgress {
  if (p.completedQuestIds.includes(questId)) return p;
  let streak: number;
  if (p.lastActiveDate === today) streak = Math.max(p.streak, 1);
  else if (p.lastActiveDate === previousDateKey(today)) streak = p.streak + 1;
  else streak = 1;
  return {
    completedQuestIds: [...p.completedQuestIds, questId],
    totalNuts: p.totalNuts + nuts,
    streak,
    lastActiveDate: today,
    daily: { date: today, nuts: dailyNutsToday(p, today) + nuts },
  };
}

export function parseProgress(raw: string | null, today: string): LearningProgress {
  const fallback = createInitialProgress(today);
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw) as Partial<LearningProgress>;
    const ok =
      Array.isArray(v.completedQuestIds) &&
      v.completedQuestIds.every((id) => typeof id === 'string') &&
      typeof v.totalNuts === 'number' &&
      typeof v.streak === 'number' &&
      (v.lastActiveDate === null || typeof v.lastActiveDate === 'string') &&
      typeof v.daily?.date === 'string' &&
      typeof v.daily?.nuts === 'number';
    return ok ? (v as LearningProgress) : fallback;
  } catch {
    return fallback;
  }
}
