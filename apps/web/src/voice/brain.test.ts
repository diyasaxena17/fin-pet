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
  it('on an NFC tap: only says hello, then listens (no reports until asked)', async () => {
    const { brain, said, sent, listener } = setup();
    await brain.tap();
    expect(sent).toEqual(['app:here']);
    expect(said).toEqual(['Hey, how are you?']);
    expect(listener.start).toHaveBeenCalled();
    expect(brain.awake).toBe(true);
    await brain.tap();                                   // tapping again while awake adds nothing
    expect(said).toEqual(['Hey, how are you?']);
  });

  it('gives the daily report when asked: worried eyes when over budget', async () => {
    const { brain, said, sent } = setup();
    await brain.tap();
    await brain.hear('how did I do today');
    expect(said.at(-1)).toMatch(/over your 45 dollars budget/);
    expect(sent).toContain('mood:w');
  });

  it('answers a report question with the under-budget wag', async () => {
    const { brain, said, sent } = setup({ money: () => ({ budget: 60, spent: 53.44, items: [] }) });
    await brain.tap();
    await brain.hear('how much do I have left');
    expect(said.at(-1)).toMatch(/stayed 6 dollars and 56 cents under/);
    expect(sent).toContain('mood:p');
  });

  it('gives the bi-weekly summary when asked, naming both goals, with a tail wag when met', async () => {
    const { brain, said, sent } = setup();
    await brain.tap();
    await brain.hear('give me my biweekly report');
    expect(said.at(-1)).toMatch(/Two-week summary! You met your savings goal, saving 180 dollars of 150 dollars\. You met your investing goal/);
    expect(sent).toContain('mood:p');
  });

  it('only wags for good news: no dance when no goal is met', async () => {
    const { brain, sent } = setup({ totals: () => ({ saved: 10, invested: 5, dayNum: 14 }) });
    await brain.tap();
    await brain.hear('how are my goals');
    expect(sent.filter(m => m === 'mood:p')).toEqual([]);
    expect(sent).toContain('mood:w');
  });

  it('goes to sleep when you say good night', async () => {
    const { brain, said, sent, events } = setup();
    await brain.tap();
    await brain.hear('good night Tiger');
    expect(said.at(-1)).toBe('Okay, good night!');
    expect(sent.at(-1)).toBe('sleep');
    expect(brain.awake).toBe(false);
    expect(events).toContainEqual({ type: 'awake', awake: false });
  });

  it('asks for a budget first when none is set', async () => {
    const { brain, said, sent } = setup({ money: () => ({ budget: null, spent: 0, items: [] }) });
    await brain.tap();
    await brain.hear('how did I do today');
    expect(said.at(-1)).toMatch(/Set your daily budget in the app/);
    expect(sent.some(m => m === 'mood:w' || m === 'mood:d')).toBe(false);
  });
});
