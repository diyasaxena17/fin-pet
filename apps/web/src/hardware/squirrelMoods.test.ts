import { describe, expect, it } from 'vitest';
import { addendumAppStateFixture, type AddendumAppState, type AddendumInitializedAppState } from '@mochi/contracts';
import { budgetLetter, budgetLine, reactionFor } from './squirrelMoods';

const base = () => structuredClone(addendumAppStateFixture) as AddendumInitializedAppState;
function withChanges(change: (state: AddendumInitializedAppState) => void): AddendumInitializedAppState {
  const state = base(); change(state); return state;
}

describe('budget moods', () => {
  it('matches the original Mochi rule: under → happy, ≤25% over → worried, more → sad', () => {
    expect(budgetLetter(20, 25)).toBe('p');
    expect(budgetLetter(25, 25)).toBe('p');
    expect(budgetLetter(30, 25)).toBe('w');
    expect(budgetLetter(31.26, 25)).toBe('d');
    expect(budgetLetter(5, null)).toBeNull();
  });
  it('describes the budget in words', () => {
    expect(budgetLine(10, 25)).toContain('Under budget');
    expect(budgetLine(30, 25)).toContain('Over budget by $5.00');
    expect(budgetLine(3, null)).toBe('No daily budget set yet.');
  });
});

describe('app events → squirrel reactions', () => {
  const daily = (state: AddendumInitializedAppState, spent: number, limit: number | null) => {
    state.budgetSummary.spentToday = spent; state.budgetSummary.dailyLimit = limit;
  };
  it('ignores missing or uninitialized states', () => {
    expect(reactionFor(null, base())).toBeNull();
    expect(reactionFor({ initialized: false } as AddendumAppState, base())).toBeNull();
  });
  it('reacts to completing the daily check-in with the budget mood', () => {
    const before = withChanges(s => { s.today.checkInCompleted = false; daily(s, 10, 25); });
    expect(reactionFor(before, withChanges(s => { s.today.checkInCompleted = true; daily(s, 10, 25); }))).toBe('p');
    expect(reactionFor(before, withChanges(s => { s.today.checkInCompleted = true; daily(s, 40, 25); }))).toBe('d');
    expect(reactionFor(before, withChanges(s => { s.today.checkInCompleted = true; daily(s, 0, null); }))).toBe('p');
  });
  it('saves tail wags for real wins: reaching the goal, not level ups or small savings', () => {
    const before = withChanges(s => { s.goal.progressPercent = 90; });
    expect(reactionFor(before, withChanges(s => { s.goal.progressPercent = 100; }))).toBe('p');
    expect(reactionFor(before, withChanges(s => { s.goal.progressPercent = 90; s.wallet.level = 3; }))).toBeNull();
    expect(reactionFor(before, withChanges(s => { s.goal.progressPercent = 90; s.goal.confirmedSaved += 5; }))).toBeNull();
  });
  it('worries when new spending goes over the daily budget, and stays quiet when it does not', () => {
    const before = withChanges(s => daily(s, 10, 25));
    expect(reactionFor(before, withChanges(s => daily(s, 28, 25)))).toBe('w');
    expect(reactionFor(before, withChanges(s => daily(s, 20, 25)))).toBeNull();
    expect(reactionFor(before, withChanges(s => daily(s, 10, 25)))).toBeNull();
  });
});
