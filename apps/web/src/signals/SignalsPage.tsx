import { useState, type ReactNode } from 'react';
import { NutIcon } from '../components/Sheet';
import { REWARDS, baseTransactions, ledgerMeta, useSignals } from './store';
import { CheckinSheet, CircadianSheet, IntentSheet, LeakSheet, PaydaySheet, VelocitySheet, type SheetId } from './sheets';
import { PulseButtons, TxnLine, VibeTagger } from './widgets';
import { cents } from './analytics';
import { fmtHours, pct, simClockLabel } from './format';
import { scenarioLabels, type ScenarioKey } from './overlay';

export type Section = 'passive' | 'intent' | 'checkins' | 'lab';

function ModuleCard({ icon, title, metric, detail, status, tone, onOpen }: { icon: string; title: string; metric: string; detail: string; status: string; tone: 'mint' | 'amber' | 'ochre'; onOpen(): void }) {
  return <button type="button" className="wo-module" onClick={onOpen} aria-label={`${title}: ${metric}. Open details`}>
    <span className="wo-module-icon" aria-hidden="true">{icon}</span>
    <span className="wo-module-text"><strong>{title}</strong><span className="wo-module-metric">{metric}</span><small>{detail}</small></span>
    <span className={`wo-chip wo-chip-${tone}`}>{status}</span></button>;
}

const heads: Record<Section, [string, string, string]> = {
  passive: ['PASSIVE SIGNALS', 'Spending patterns', 'Zero-effort patterns from the bank feed, with the psychology behind each. No scores, no shame.'],
  intent: ['BEFORE CHECKOUT', 'Intent & restraint', 'The moments before a purchase: hesitation, the 72-hour vault, and the places that pull you in.'],
  checkins: ['ACTIVE CONTEXT', 'Micro check-ins', 'One tap on the why, one tap two days later on whether it was worth it.'],
  lab: ['TEST LAB', 'Simulation controls', 'Stress-test the analytics. Simulated data is always labelled and never changes the base ledger.'],
};
export function SignalsPage({ section }: { section: Section }) {
  const { state: s, derived: d, dispatch } = useSignals();
  const [open, setOpen] = useState<SheetId | null>(null);
  const close = () => setOpen(null);
  const recent = [...d.txns].filter((t) => t.kind !== 'transfer').slice(-4).reverse();
  const topVibe = d.queue[0]; const topPulse = d.pulseQueue[0];
  const spree = d.clusters.at(-1);
  const flaggedPayday = d.payday.windows.some((w) => w.flagged); const lastPayday = d.payday.windows.at(-1);
  return <div className="wo-page">
    <header className="wo-hero"><p className="wo-eyebrow">{heads[section][0]}</p><h1>{heads[section][1]}</h1><p>{heads[section][2]}</p></header>
    {section === 'passive' || section === 'lab' ? <section className="wo-panel wo-feed" aria-label="Mock bank feed">
      <div className="wo-row"><p className="wo-eyebrow">MOCK BANK FEED · 14-DAY SIMULATED PERSONA</p><span className="wo-chip wo-chip-mint">{ledgerMeta.dataset}</span></div>
      <p className="wo-big">{cents(d.cashCents)} <small>cash · {d.txns.length} movements · {baseTransactions.length} from ledger</small></p>
      <p className="wo-note">Simulated clock: <strong>{simClockLabel(d.nowMs, s.clockHours)}</strong></p>
      {recent.map((t) => <div className="wo-txn" key={t.id}><div><strong>{t.merchant}</strong><small>{t.direction} · {t.category}{t.source === 'simulated' ? ' · SIMULATED' : ''}</small></div>
        <span className={`wo-amount ${t.direction === 'debit' ? '' : 'wo-credit'}`}>{t.direction === 'debit' ? '−' : '+'}{cents(t.amountCents)}</span></div>)}
    </section> : null}
    <div className="wo-stack">
      {section === 'passive' ? <>
        <ModuleCard icon="⚡" title="Transaction velocity" onOpen={() => setOpen('velocity')} tone={d.clusters.length ? 'amber' : 'mint'} status={d.clusters.length ? 'FLAGGED' : 'CLEAR'}
          metric={spree ? `${spree.txns.length} buys in ${Math.max(1, Math.round(spree.spanMinutes / 60 * 10) / 10)}h` : 'No spree'} detail={spree ? `${cents(spree.totalCents)} cluster · ${d.clusters.length} total` : '3+ non-essential buys in 4 hours'} />
        <ModuleCard icon="🌙" title="Late-night profile" onOpen={() => setOpen('circadian')} tone={d.circadian.lateCount ? 'amber' : 'mint'} status={d.circadian.lateCount ? 'WATCH' : 'CLEAR'}
          metric={d.circadian.lateCount ? `${pct(d.circadian.lateShareCount)} after 11 PM` : '0 late-night buys'} detail={`${d.circadian.dayCount} daytime vs ${d.circadian.lateCount} late (11 PM – 3 AM)`} />
        <ModuleCard icon="💸" title="Payday-to-splurge" onOpen={() => setOpen('payday')} tone={flaggedPayday ? 'amber' : 'mint'} status={flaggedPayday ? 'SPIKE' : 'IN RANGE'}
          metric={lastPayday ? `${cents(lastPayday.spendCents)} in 48h` : 'No payroll'} detail={lastPayday?.firstLatencyHours == null ? 'Latest window: no splurge' : `First splurge after ${fmtHours(lastPayday.firstLatencyHours)}`} />
        <ModuleCard icon="💧" title="Micro-leaks" onOpen={() => setOpen('leaks')} tone={d.leaks.habits.length ? 'ochre' : 'mint'} status={d.leaks.habits.length ? `${d.leaks.habits.length} HABITS` : 'CLEAR'}
          metric={`${pct(d.leaks.autopilotShare)} autopilot`} detail={`${cents(d.leaks.leakCents)} vs ${cents(d.leaks.plannedFoodCents)} planned food`} />
      </> : null}
      {section === 'intent' ? <>
        <ModuleCard icon="🛑" title="Restraint log" onOpen={() => setOpen('intent')} tone="mint" status="SIMULATED"
          metric={`${pct(d.restraint.rate)} restraint`} detail={`${d.restraint.restraint} walk-aways · ${cents(d.restraint.avoidedCents)} not spent`} />
        <ModuleCard icon="🔒" title="72-hour vault" onOpen={() => setOpen('intent')} tone="ochre" status={`${d.resistance.waiting} WAITING`}
          metric={d.resistance.score === null ? 'Warming up' : `${d.resistance.score.toFixed(0)}% resistance`} detail={`${d.resistance.resolved} resolved · ${d.resistance.impulsive} impulsive`} />
        <ModuleCard icon="📍" title="Corridor triggers" onOpen={() => setOpen('intent')} tone="mint" status="OPT-IN"
          metric={`${d.geo.walkAways} near misses`} detail={`${d.geo.walkIns} walk-in purchases`} />
      </> : null}
      {section === 'checkins' ? <>
        <article className="wo-panel" aria-label="Micro check-in"><div className="wo-row"><p className="wo-eyebrow">1-TAP VIBE CHECK</p><span className="wo-reward">+{REWARDS.vibe.nuts} <NutIcon size={14} /></span></div>
          {topVibe ? <><TxnLine txn={topVibe} /><VibeTagger txn={topVibe} /><p className="wo-note">{d.queue.length - 1} more waiting</p></> : <p className="wo-empty">All caught up. Nothing to tag.</p>}</article>
        <article className="wo-panel" aria-label="48-hour pulse"><div className="wo-row"><p className="wo-eyebrow">48-HOUR PULSE</p><span className="wo-reward">+{REWARDS.pulse.nuts} <NutIcon size={14} /></span></div>
          {topPulse ? <><TxnLine txn={topPulse} /><PulseButtons txn={topPulse} /><p className="wo-note">{d.pulseQueue.length - 1} more waiting</p></> : <p className="wo-empty">No unplanned purchase is 48 hours old yet.</p>}</article>
        <ModuleCard icon="👍" title="Regret profile" onOpen={() => setOpen('checkins')} tone={d.regret.regretRate && d.regret.regretRate > 0.5 ? 'amber' : 'mint'} status={`${d.regret.answered} ANSWERED`}
          metric={d.regret.regretRate === null ? 'No answers yet' : `${pct(d.regret.regretRate)} regret`} detail="By merchant, time window and vibe" />
      </> : null}
    </div>
    <p className="wo-bonus" aria-live="polite">Acorns collected: <strong>{s.nuts}</strong> <NutIcon size={13} /> <small>Example rewards are not saved to your account</small></p>
    {section === 'lab' ? <TestLab /> : null}
    {open === 'velocity' ? <VelocitySheet onClose={close} /> : null}{open === 'circadian' ? <CircadianSheet onClose={close} /> : null}
    {open === 'payday' ? <PaydaySheet onClose={close} /> : null}{open === 'leaks' ? <LeakSheet onClose={close} /> : null}
    {open === 'intent' ? <IntentSheet onClose={close} /> : null}{open === 'checkins' ? <CheckinSheet onClose={close} /> : null}
  </div>;
}

function TestLab(): ReactNode {
  const { state: s, derived: d, dispatch } = useSignals();
  return <details className="wo-lab" open><summary>Test lab · simulation controls</summary>
    <p className="wo-note">Scenarios layer labelled SIMULATED purchases on top of the unchanged ledger. Turn them off to return to the default contract data.</p>
    {(Object.keys(scenarioLabels) as ScenarioKey[]).map((k) => <label className="wo-switch" key={k}>
      <input type="checkbox" role="switch" checked={s.overlays[k]} onChange={() => dispatch({ type: 'toggleScenario', key: k })} />
      <span><strong>{scenarioLabels[k].title}</strong><small>{scenarioLabels[k].blurb}</small></span></label>)}
    <p className="wo-eyebrow wo-pad">SIMULATED CLOCK · {simClockLabel(d.nowMs, s.clockHours)}</p>
    <div className="wo-btn-row">
      {[24, 48, 72].map((h) => <button key={h} type="button" className="wo-mini" onClick={() => dispatch({ type: 'advance', hours: h })}>+{h}h</button>)}
      <button type="button" className="wo-mini" onClick={() => dispatch({ type: 'resetClock' })}>Reset clock</button>
      <button type="button" className="wo-mini wo-mini-warn" onClick={() => dispatch({ type: 'reset' })}>Reset all signals</button></div>
  </details>;
}
