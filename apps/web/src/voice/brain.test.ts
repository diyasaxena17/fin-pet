import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MochiBrain, type BrainDeps, type BrainEvent } from './brain';
import type { Listener } from './listen';
import { PERSONAS } from './personas';

function setup(over: Partial<BrainDeps> = {}) {
  const said: string[] = [], sent: string[] = [], events: BrainEvent[] = [];
  const listener = { start: vi.fn(), stop: vi.fn() } as unknown as Listener;
  const brain = new MochiBrain({
    petName: () => 'Tiger',
    persona: () => PERSONAS[0]!,
    money: () => ({ budget: 45, spent: 53.44, items: [{ name: 'Uber Eats', amount: 26.4 }] }),
    goals: () => ({ saveGoal: 150, investGoal: 150 }),
    totals: () => ({ saved: 180, invested: 150, dayNum: 14 }),
    send: m => sent.push(m),
    show: e => events.push(e),
    speak: async text => { said.push(text); },
    listener,
    ...over,
  });
  return { brain, said, sent, events, listener };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline in tests'); }));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('Mochi talking brain', () => {
  it('on an NFC tap: greets, gives the daily report and two-week check with moods, asks about news, then listens', async () => {
    const { brain, said, sent, listener } = setup();
    await brain.tap();
    expect(sent[0]).toBe('app:here');
    expect(said[0]).toMatch(/Tiger is awake/);
    expect(said[1]).toMatch(/over your 45 dollars budget/);       // plain report when Gemini is unreachable
    expect(sent).toContain('mood:w');                              // 53.44 of 45: worried
    expect(said[2]).toMatch(/Two-week summary! You met your savings goal, saving 180 dollars of 150 dollars\. You met your investing goal/);
    expect(sent).toContain('mood:p');                              // goals met: tail-wag dance
    expect(sent).not.toContain('mood:t');                          // the tail stays still while talking
    expect(said[3]).toBe("Do you want to hear today's money news summary?");
    expect(listener.start).toHaveBeenCalled();
    expect(brain.awake).toBe(true);
  });

  it('only asks about the news on the first wake of the day', async () => {
    const { brain, said } = setup();
    await brain.tap(); await brain.sleep(false);
    said.length = 0;
    await brain.tap();
    expect(said.some(t => /news summary/.test(t))).toBe(false);
  });

  it('goes to sleep when you say good night', async () => {
    const { brain, said, sent, events } = setup();
    await brain.tap();
    await brain.hear('good night Tiger');
    expect(said.at(-1)).toMatch(/Bye bye!/);
    expect(sent.at(-1)).toBe('sleep');
    expect(brain.awake).toBe(false);
    expect(events).toContainEqual({ type: 'awake', awake: false });
  });

  it('answers report and goal questions while awake', async () => {
    const { brain, said } = setup({ money: () => ({ budget: 60, spent: 53.44, items: [] }) });
    await brain.tap();
    said.length = 0;
    await brain.hear('no thanks');
    expect(said[0]).toMatch(/No worries/);
    await brain.hear('how did I do today');
    expect(said.at(-1)).toMatch(/stayed 6 dollars and 56 cents under/);
    await brain.hear('give me my biweekly summary');
    expect(said.at(-1)).toMatch(/Two-week summary!/);
  });

  it('only wags for good news: no dance when no goal is met, and none for chat cheers', async () => {
    const { brain, sent } = setup({ money: () => ({ budget: 45, spent: 53.44, items: [] }), totals: () => ({ saved: 10, invested: 5, dayNum: 14 }) });
    await brain.tap();
    expect(sent.filter(m => m === 'mood:p')).toEqual([]);
    expect(sent).toContain('mood:w');
  });

  it('asks for a budget first when none is set', async () => {
    const { brain, said, sent } = setup({ money: () => ({ budget: null, spent: 0, items: [] }) });
    await brain.tap();
    expect(said[0]).toMatch(/Set your daily budget in the app/);
    expect(sent.some(m => m === 'mood:w' || m === 'mood:d')).toBe(false);
  });
});
