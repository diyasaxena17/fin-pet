import { describe, expect, it } from 'vitest';
import { applyQuestCompletion, createInitialProgress, displayStreak, levelInfo, parseProgress } from './progress';

const D1 = '2026-11-20';
const D2 = '2026-11-21';
const D4 = '2026-11-24';

describe('learning progress', () => {
  it('awards nuts, daily nuts and starts a streak on first completion', () => {
    const p = applyQuestCompletion(createInitialProgress(D1), 'a', 30, D1);
    expect(p).toMatchObject({ totalNuts: 30, streak: 1, lastActiveDate: D1, completedQuestIds: ['a'] });
    expect(p.daily).toEqual({ date: D1, nuts: 30 });
  });

  it('does not award nuts twice for the same lesson', () => {
    const once = applyQuestCompletion(createInitialProgress(D1), 'a', 30, D1);
    expect(applyQuestCompletion(once, 'a', 30, D1)).toBe(once);
  });

  it('extends the streak on consecutive days and keeps it within one day', () => {
    let p = applyQuestCompletion(createInitialProgress(D1), 'a', 30, D1);
    p = applyQuestCompletion(p, 'b', 20, D1);
    expect(p.streak).toBe(1);
    expect(p.daily.nuts).toBe(50);
    p = applyQuestCompletion(p, 'c', 20, D2);
    expect(p.streak).toBe(2);
    expect(p.daily).toEqual({ date: D2, nuts: 20 });
  });

  it('resets the streak after a missed day and displays 0 once it has lapsed', () => {
    const p = applyQuestCompletion(createInitialProgress(D1), 'a', 30, D1);
    expect(displayStreak(p, D2)).toBe(1);
    expect(displayStreak(p, D4)).toBe(0);
    expect(applyQuestCompletion(p, 'b', 20, D4).streak).toBe(1);
  });

  it('handles month and year boundaries when finding yesterday', () => {
    const p = applyQuestCompletion(createInitialProgress('2026-12-31'), 'a', 10, '2026-12-31');
    expect(applyQuestCompletion(p, 'b', 10, '2027-01-01').streak).toBe(2);
  });

  it('computes levels', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, intoLevel: 0 });
    expect(levelInfo(250)).toMatchObject({ level: 3, intoLevel: 50, toNext: 50 });
  });

  it('falls back safely on corrupt or old-format stored data', () => {
    expect(parseProgress('not json', D1).totalNuts).toBe(0);
    expect(parseProgress('{"totalXp":30}', D1).totalNuts).toBe(0);
    const saved = applyQuestCompletion(createInitialProgress(D1), 'a', 30, D1);
    expect(parseProgress(JSON.stringify(saved), D1)).toEqual(saved);
  });
});
