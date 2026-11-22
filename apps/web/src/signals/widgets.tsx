import { useState, type ReactNode } from 'react';
import { RewardBadge } from '../components/Sheet';
import { useSignals } from './store';
import { VIBES, type BankTxn, type Pulse, type Vibe } from './types';
import { cents } from './analytics';
import { fmtWhen } from './format';
import { WHY_CAUTION, buildWhy, type WhyKey } from './insights';

export function Callout({ title, children, reward }: { title: string; children: ReactNode; reward?: number }) {
  return <div className="wo-callout"><div className="wo-callout-top"><h3>{title}</h3>{reward ? <RewardBadge nuts={reward} /> : null}</div><div className="wo-callout-body">{children}</div></div>;
}
export function Bar({ label, value, max, tone = 'green', right }: { label: string; value: number; max: number; tone?: 'green' | 'amber' | 'rose'; right?: ReactNode }) {
  const width = max > 0 ? Math.max(value > 0 ? 3 : 0, Math.min(100, (value / max) * 100)) : 0;
  return <div className="wo-bar-row"><div className="wo-bar-label"><span>{label}</span><strong>{right}</strong></div>
    <div className="wo-bar" role="img" aria-label={`${label}: ${right ?? value}`}><span className={`wo-bar-fill wo-${tone}`} style={{ width: `${width}%` }} /></div></div>;
}
export function Empty({ children }: { children: ReactNode }) { return <p className="wo-empty">{children}</p>; }

/** Reflection prompt in the style of the practice challenge. Not graded: any answer is valid. */
export function VibeTagger({ txn }: { txn: BankTxn }) {
  const { state, dispatch } = useSignals();
  const current = state.vibes[txn.id];
  return <div className="wo-vibes" role="group" aria-label={`How did ${txn.merchant} feel?`}>
    {VIBES.map((v) => <button key={v.id} type="button" className="wo-vibe" aria-pressed={current === v.id}
      aria-label={`${v.label} — ${txn.merchant}`} onClick={() => dispatch({ type: 'tagVibe', id: txn.id, vibe: v.id as Vibe })}>
      <span aria-hidden="true">{v.emoji}</span><small>{v.label}</small></button>)}
  </div>;
}
export function TxnLine({ txn, children }: { txn: BankTxn; children?: ReactNode }) {
  return <div className="wo-txn"><div><strong>{txn.name === txn.merchant ? txn.merchant : `${txn.name} · ${txn.merchant}`}</strong>
    <small>{fmtWhen(txn.at)} · {txn.category}{txn.source === 'simulated' ? ' · SIMULATED' : ''}</small></div><span className="wo-amount">−{cents(txn.amountCents)}</span>{children}</div>;
}
export function PulseButtons({ txn }: { txn: BankTxn }) {
  const { state, dispatch } = useSignals();
  const current: Pulse | undefined = state.pulses[txn.id];
  return <div className="wo-pulse" role="group" aria-label={`Was ${txn.merchant} worth it?`}>
    <button type="button" aria-pressed={current === 'worth'} onClick={() => dispatch({ type: 'answerPulse', id: txn.id, pulse: 'worth' })}>👍 Worth It</button>
    <button type="button" aria-pressed={current === 'regret'} onClick={() => dispatch({ type: 'answerPulse', id: txn.id, pulse: 'regret' })}>👎 Regret</button>
  </div>;
}

/** Named psychology concept plus one sentence computed from the current feed. Non-diagnostic by design. */
export function WhyPanel({ k }: { k: WhyKey }) {
  const { state, derived } = useSignals();
  const why = buildWhy(derived, state)[k];
  return <section className="wo-panel wo-why" aria-label={`Why this happens: ${why.concept}`}>
    <p className="wo-eyebrow">WHY THIS HAPPENS</p><h3>{why.concept}</h3><p>{why.summary}</p>
    <p className="wo-yours"><strong>In your feed:</strong> {why.yourData}</p><p className="wo-note">{WHY_CAUTION}</p></section>;
}
