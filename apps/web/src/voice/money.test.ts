import { describe, expect, it } from 'vitest';
import { BRIEF_INTENT, DAILY_INTENT, GOAL_INTENT, NO, YES, dailyMood, dailyReport, isGoodbye, periodMood, periodReport, sayMoney } from './money';

describe('Mochi money rules (same as the original app)', () => {
  it('says money out loud', () => {
    expect(sayMoney(12.5)).toBe('12 dollars and 50 cents');
    expect(sayMoney(1)).toBe('1 dollar');
    expect(sayMoney(-40)).toBe('40 dollars');
  });
  it('picks the daily mood', () => {
    expect(dailyMood(53.44, 60)).toBe('happy');
    expect(dailyMood(53.44, 45)).toBe('worried');
    expect(dailyMood(53.44, 40)).toBe('sad');
    expect(dailyReport(53.44, 60, [{ name: 'Uber Eats', amount: 26.4 }]).text).toContain('6 dollars and 56 cents under');
  });
  it('judges the two-week goals', () => {
    const t = { saved: 180, invested: 150, dayNum: 14 };
    expect(periodMood(t, { saveGoal: 150, investGoal: 150 })).toBe('happy');
    expect(periodMood(t, { saveGoal: 200, investGoal: 150 })).toBe('happy');     // one goal met is still a win
    expect(periodMood(t, { saveGoal: 200, investGoal: 200 })).toBe('worried');
    const r = periodReport(t, { saveGoal: 200, investGoal: 150 });
    expect(r.text).toContain("You haven't met your savings goal yet: 180 dollars of 200 dollars, 20 dollars to go.");
    expect(r.text).toContain('You met your investing goal, investing 150 dollars of 150 dollars.');
    expect(r.facts).toContain('Savings goal: NOT met');
  });
  it('knows when you say goodbye', () => {
    for (const t of ['good night', 'bye bye', 'Goodbye Tiger!', 'ok bye', 'see you later', 'that\'s all']) expect(isGoodbye(t, 'Tiger')).toBe(true);
    for (const t of ['how did I do today', 'can I buy shoes', 'later this week I want to save']) expect(isGoodbye(t, 'Tiger')).toBe(false);
  });
  it('understands quick intents', () => {
    expect(YES.test('yes please')).toBe(true);
    expect(NO.test('nah')).toBe(true);
    expect(DAILY_INTENT.test('how did I do today')).toBe(true);
    expect(GOAL_INTENT.test('how are my savings')).toBe(true);
    for (const t of ['give me my biweekly summary', 'bi weekly summary', 'how did my two week goals go']) expect(GOAL_INTENT.test(t)).toBe(true);
    expect(BRIEF_INTENT.test("what's happening in the market")).toBe(true);
  });
});
