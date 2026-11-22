/** The user's bi-weekly savings and investing goals, entered live in the app (no presets). */
import type { Goals } from './money';
const KEY = 'mochi.goals';

export function getGoals(): Goals | null {
  try {
    const g = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Goals | null;
    return g && g.saveGoal > 0 && g.investGoal > 0 ? g : null;
  } catch { return null; }
}

export function setGoals(goals: Goals): void {
  try { localStorage.setItem(KEY, JSON.stringify(goals)); } catch { /* storage unavailable */ }
  try { window.dispatchEvent(new CustomEvent('mochi:goals', { detail: goals })); } catch { /* no window */ }
}
