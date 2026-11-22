import type { AddendumAppState } from '@mochi/contracts';
import type { SquirrelLetter } from './squirrelSerial';

/** Same rule as the original Mochi: under budget → happy, up to 25% over → worried, more → sad. */
export function budgetLetter(spentToday: number, dailyLimit: number | null): 'p' | 'w' | 'd' | null {
  if (dailyLimit === null) return null;
  if (spentToday <= dailyLimit) return 'p';
  return spentToday <= dailyLimit * 1.25 ? 'w' : 'd';
}

export function budgetLine(spentToday: number, dailyLimit: number | null): string {
  const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
  if (dailyLimit === null) return 'No daily budget set yet.';
  const left = dailyLimit - spentToday;
  return left >= 0
    ? `Under budget: ${cad(spentToday)} of ${cad(dailyLimit)} today.`
    : `Over budget by ${cad(-left)} (${cad(spentToday)} of ${cad(dailyLimit)}).`;
}

/** Which mood the squirrel should play when the app's state changes, if any. */
export function reactionFor(previous: AddendumAppState | null, next: AddendumAppState | null): SquirrelLetter | null {
  if (!previous?.initialized || !next?.initialized) return null;
  const budget = next.budgetSummary;
  if (!previous.today.checkInCompleted && next.today.checkInCompleted) return budgetLetter(budget.spentToday, budget.dailyLimit) ?? 'p';
  if (next.wallet.level > previous.wallet.level) return 'p';
  if (next.goal.progressPercent >= 100 && previous.goal.progressPercent < 100) return 'p';
  if (next.goal.confirmedSaved > previous.goal.confirmedSaved) return 'p';
  if (budget.spentToday > previous.budgetSummary.spentToday) {
    const letter = budgetLetter(budget.spentToday, budget.dailyLimit);
    if (letter === 'w' || letter === 'd') return letter;
  }
  return null;
}
