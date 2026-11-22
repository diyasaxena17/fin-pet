import { Link } from 'react-router-dom';
import type { AddendumInitializedAppState } from '@mochi/contracts';
import { NutIcon } from './Sheet';
import { ledgerDailyLimitCents, useSignals } from '../signals/store';
import { simDate } from '../signals/format';

const TOTAL_SKILLS = 8; // Feature union size in @mochi/contracts
const dollars = (value: number) => `$${Math.round(value)}`;

/** Top HUD: status strip, level row with daily cap, and growth bar. All values come from the app state contract. */
export function Hud({ state }: { state: AddendumInitializedAppState }) {
  const { state: signals, derived } = useSignals();
  // The contract's budget summary wins when a cap is configured. The mock contract starts with none, so the HUD
  // falls back to the bank ledger's own daily target and that day's ledger spending (including simulated purchases).
  const today = simDate(derived.nowMs);
  const ledgerSpent = derived.txns.filter((t) => t.kind === 'purchase' && t.at.slice(0, 10) === today).reduce((sum, t) => sum + t.amountCents, 0) / 100;
  const useContract = state.budgetSummary.dailyLimit !== null;
  const cap = useContract ? state.budgetSummary.dailyLimit : ledgerDailyLimitCents === null ? null : ledgerDailyLimitCents / 100;
  const spent = useContract ? state.budgetSummary.spentToday : ledgerSpent;
  const within = cap === null ? null : spent <= cap;
  const growth = Math.round(state.forest.growthPercent);
  return <div className="wo-hud">
    <div className="wo-hud-strip">
      <span className="wo-status"><i aria-hidden="true" />Mock bank feed · {state.pet.name}</span>
      <span className="wo-hud-right">
        <Link className="wo-util" to="/check-in">Daily Pulse</Link>
        <span className="wo-nuts" aria-label={`${state.wallet.coins + signals.nuts} Golden Nuts`}><NutIcon size={18} />{state.wallet.coins + signals.nuts}</span>
      </span>
    </div>
    <div className="wo-hud-level">
      <span className="wo-lv" aria-label={`Level ${state.wallet.level}`}>Lv.{state.wallet.level}</span>
      <div className="wo-hud-title"><p>{state.pet.name}’s Winter Oak</p><small>{state.unlockedFeatures.length}/{TOTAL_SKILLS} Financial Skills Sprouted</small></div>
      <div className={`wo-cap ${within === false ? 'wo-cap-over' : ''}`} aria-label={cap === null ? 'No daily cap set' : `Daily cap: ${dollars(spent)} of ${dollars(cap)}`}>
        <small>DAILY CAP</small><strong>{cap === null ? 'Not set' : <>{dollars(spent)} / {dollars(cap)} {within ? '✓' : '!'}</>}</strong></div>
    </div>
    <div className="wo-hud-grow"><span><span aria-hidden="true">✧</span> Tap any glowing branch to learn & earn Nuts</span><strong>{growth}% Grown</strong></div>
    <div className="wo-grow-track" role="progressbar" aria-label="Forest growth" aria-valuemin={0} aria-valuemax={100} aria-valuenow={growth}><span style={{ width: `${Math.min(100, growth)}%` }} /></div>
  </div>;
}
