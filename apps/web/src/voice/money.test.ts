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
    expect(periodMood(t, { saveGoal: 150, investGoal: 150 }, true)).toBe('happy');
    expect(periodMood(t, { saveGoal: 200, investGoal: 150 }, true)).toBe('worried');
    expect(periodMood(t, { saveGoal: 200, investGoal: 200 }, true)).toBe('sad');
    expect(periodReport(t, { saveGoal: 200, investGoal: 150 }, true).facts).toContain('short by 20 dollars');
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
    expect(BRIEF_INTENT.test("what's happening in the market")).toBe(true);
  });
});
