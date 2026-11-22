import { useEffect, useRef } from 'react';
import { useSquirrel } from '../hardware/SquirrelProvider';
import { sendToSquirrel } from '../hardware/tapRelay';
import { useOptionalAppState } from '../lib/appState';
import { todaysBankTransactions, twoWeekTotals } from '../mochi-ui/bankFeed';
import { MochiBrain, type BrainDeps, type BrainEvent } from './brain';
import { getGoals } from './goals';
import { getPersona } from './personas';
import { audio } from './speech';

const PET_NAME_KEY = 'mochi.petName';
const readName = () => { try { return localStorage.getItem(PET_NAME_KEY)?.trim() || 'Mochi'; } catch { return 'Mochi'; } };

/** Screens listen for this to show what Mochi says and its mood. */
export function emitBrain(event: BrainEvent) {
  try { window.dispatchEvent(new CustomEvent<BrainEvent>('mochi:brain', { detail: event })); } catch { /* no window */ }
}

let shared: MochiBrain | null = null;
/** The running brain (for a typed message or a test). */
export function mochiBrain(): MochiBrain | null { return shared; }

/**
 * Runs Mochi's voice in the background (no screen of its own). An NFC tap wakes it; it talks through the
 * laptop speakers and listens until you say goodbye.
 */
export function MochiVoice({ deps: overrides }: { deps?: Partial<BrainDeps> } = {}) {
  const squirrel = useSquirrel();
  const app = useOptionalAppState();
  const stateRef = useRef(app?.state ?? null);
  stateRef.current = app?.state ?? null;
  const brainRef = useRef<MochiBrain | null>(null);

  if (!brainRef.current) {
    brainRef.current = new MochiBrain({
      petName: readName,
      persona: getPersona,
      money: () => {
        const s = stateRef.current;
        if (!s?.initialized) return null;
        const items = todaysBankTransactions().map(t => ({ name: t.name, amount: t.amount }));
        return { budget: s.budgetSummary.dailyLimit, spent: s.budgetSummary.spentToday, items };
      },
      goals: getGoals,
      totals: () => twoWeekTotals(),
      send: message => sendToSquirrel(message),
      show: emitBrain,
      ...overrides,
    });
    shared = brainRef.current;
  }

  // Browsers only play sound after the page has been clicked once.
  useEffect(() => {
    const unlock = () => { audio(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Only one open tab talks (otherwise every tab would answer the same tap).
  const leader = useRef(false);
  useEffect(() => {
    const locks = (navigator as Navigator & { locks?: { request(name: string, cb: () => Promise<void>): Promise<void> } }).locks;
    if (!locks) { leader.current = true; return; }
    let release: () => void = () => undefined;
    void locks.request('mochi-voice-leader', () => { leader.current = true; return new Promise<void>(resolve => { release = resolve; }); }).catch(() => undefined);
    return () => { leader.current = false; release(); };
  }, []);

  const wakeCount = squirrel?.wakeCount ?? 0;
  useEffect(() => {
    if (wakeCount > 0 && leader.current) void brainRef.current?.tap();
  }, [wakeCount]);

  return null;
}
