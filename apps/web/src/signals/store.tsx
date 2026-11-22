import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import type { TransactionCategory } from '@mochi/contracts';
import { buildSandboxLedger } from './ledger';
import { adaptLedger } from './adapters';
import { circadianProfile, findClusters, geofenceSummary, impulseResistance, microLeaks, paydayProfile, pendingPulses, pendingVibes,
  regretProfile, restraintSummary, seedPulses, vibeBreakdown, HOUR, ms } from './analytics';
import { BASE_NOW_MS, geoEvents, intentEvents, scenarioTxns, seedWishlist, type ScenarioKey } from './overlay';
import type { BankTxn, Pulse, Vibe, WishItem } from './types';

/** Mock rewards for the demo. They live only in this UI layer; the frozen contract wallet is untouched. */
export const REWARDS = { vibe: { nuts: 3, xp: 5 }, pulse: { nuts: 5, xp: 8 }, insight: { nuts: 10, xp: 15 } } as const;

const ledger = buildSandboxLedger();
const adapted = adaptLedger(ledger);
export const baseTransactions: readonly BankTxn[] = adapted.transactions;
export const skippedDecisions = adapted.skippedDecisions;
export const baseCashCents = ledger.entries.at(-1)!.cashAfterCents;
/** Latest daily spending target recorded in the bank ledger's budget events (cents). */
export const ledgerDailyLimitCents = ledger.entries.filter((e) => e.type === 'budget' && e.dailyLimitCents !== undefined).at(-1)?.dailyLimitCents ?? null;
export const ledgerMeta = { dataset: ledger.dataset, startDate: ledger.startDate, entries: ledger.entries.length };

export interface SignalsState {
  overlays: Record<ScenarioKey, boolean>; clockHours: number;
  vibes: Record<string, Vibe>; pulses: Record<string, Pulse>; wishlist: WishItem[];
  collected: Record<string, true>; nuts: number; xp: number;
}
export const initialSignalsState = (): SignalsState => ({
  overlays: { spree: false, lateNight: false, paydaySplurge: false }, clockHours: 0,
  vibes: {}, pulses: seedPulses(adapted.reflections), wishlist: structuredClone(seedWishlist) as WishItem[],
  collected: {}, nuts: 0, xp: 0,
});

export type SignalsAction =
  | { type: 'toggleScenario'; key: ScenarioKey } | { type: 'advance'; hours: number } | { type: 'resetClock' }
  | { type: 'tagVibe'; id: string; vibe: Vibe } | { type: 'answerPulse'; id: string; pulse: Pulse }
  | { type: 'addWish'; title: string; category: TransactionCategory; priceCents: number }
  | { type: 'setWishPurchased'; id: string; purchased: boolean }
  | { type: 'collect'; id: string } | { type: 'reset' };

export function signalsReducer(state: SignalsState, action: SignalsAction): SignalsState {
  const nowMs = BASE_NOW_MS + state.clockHours * HOUR;
  switch (action.type) {
    case 'toggleScenario': return { ...state, overlays: { ...state.overlays, [action.key]: !state.overlays[action.key] } };
    case 'advance': return { ...state, clockHours: Math.max(0, state.clockHours + action.hours) };
    case 'resetClock': return { ...state, clockHours: 0 };
    case 'tagVibe': {
      const first = !state.vibes[action.id];
      return { ...state, vibes: { ...state.vibes, [action.id]: action.vibe },
        nuts: state.nuts + (first ? REWARDS.vibe.nuts : 0), xp: state.xp + (first ? REWARDS.vibe.xp : 0) };
    }
    case 'answerPulse': {
      const first = !state.pulses[action.id];
      return { ...state, pulses: { ...state.pulses, [action.id]: action.pulse },
        nuts: state.nuts + (first ? REWARDS.pulse.nuts : 0), xp: state.xp + (first ? REWARDS.pulse.xp : 0) };
    }
    case 'addWish': {
      const title = action.title.trim();
      if (!title || !(action.priceCents > 0)) return state;
      return { ...state, wishlist: [{ id: `wish-user-${state.wishlist.length + 1}-${nowMs}`, title, category: action.category,
        priceCents: Math.round(action.priceCents), addedAtMs: nowMs, purchasedAtMs: null }, ...state.wishlist] };
    }
    case 'setWishPurchased': return { ...state, wishlist: state.wishlist.map((w) =>
      w.id === action.id ? { ...w, purchasedAtMs: action.purchased ? nowMs : null } : w) };
    case 'collect': return state.collected[action.id] ? state
      : { ...state, collected: { ...state.collected, [action.id]: true }, nuts: state.nuts + REWARDS.insight.nuts, xp: state.xp + REWARDS.insight.xp };
    case 'reset': return initialSignalsState();
  }
}

const STORAGE_KEY = 'mochi.signals.v1';
function hydrate(): SignalsState {
  const fresh = initialSignalsState();
  try {
    const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh;
    const saved = JSON.parse(raw) as Partial<SignalsState>;
    if (typeof saved !== 'object' || saved === null || !saved.overlays || typeof saved.clockHours !== 'number' || !Array.isArray(saved.wishlist)) return fresh;
    return { ...fresh, ...saved, overlays: { ...fresh.overlays, ...saved.overlays } };
  } catch { return fresh; }
}

export function deriveSignals(state: SignalsState) {
  const nowMs = BASE_NOW_MS + state.clockHours * HOUR;
  const txns = [...baseTransactions, ...(Object.keys(state.overlays) as ScenarioKey[]).filter((k) => state.overlays[k]).flatMap((k) => scenarioTxns[k])]
    .sort((a, b) => ms(a.at) - ms(b.at) || (a.id < b.id ? -1 : 1));
  const simulatedSpend = txns.filter((t) => t.source === 'simulated').reduce((s, t) => s + t.amountCents, 0);
  return {
    nowMs, txns, cashCents: baseCashCents - simulatedSpend,
    clusters: findClusters(txns), circadian: circadianProfile(txns), payday: paydayProfile(txns), leaks: microLeaks(txns),
    restraint: restraintSummary(intentEvents, skippedDecisions), resistance: impulseResistance(state.wishlist, nowMs), geo: geofenceSummary(geoEvents),
    vibeStats: vibeBreakdown(txns, state.vibes), regret: regretProfile(txns, state.vibes, state.pulses),
    queue: pendingVibes(txns, state.vibes, nowMs), pulseQueue: pendingPulses(txns, state.vibes, state.pulses, nowMs),
  };
}

type Derived = ReturnType<typeof deriveSignals>;
interface Ctx { state: SignalsState; derived: Derived; dispatch: (action: SignalsAction) => void }
const SignalsContext = createContext<Ctx | null>(null);

export function SignalsProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(signalsReducer, undefined, hydrate);
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable: keep in memory */ } }, [state]);
  const derived = useMemo(() => deriveSignals(state), [state]);
  const value = useMemo(() => ({ state, derived, dispatch }), [state, derived]);
  return <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>;
}
export function useSignals() {
  const ctx = useContext(SignalsContext);
  if (!ctx) throw new Error('SignalsProvider is required');
  return ctx;
}
export const signalsStorageKey = STORAGE_KEY;
