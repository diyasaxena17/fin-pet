import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { baseTransactions, ledgerMeta, useSignals } from './store';
import { CircadianSheet, IntentSheet, LeakSheet, PaydaySheet, VelocitySheet, type SheetId } from './sheets';
import { PulseButtons, TxnLine, VibeTagger } from './widgets';
import { cents } from './analytics';
import { pct, simClockLabel } from './format';
import { scenarioLabels, type ScenarioKey } from './overlay';

export type Section = 'home' | 'lab';

function Row({ icon, title, metric, onOpen }: { icon: string; title: string; metric: string; onOpen(): void }) {
  return <button type="button" className="wo-module" onClick={onOpen} aria-label={`${title}: ${metric}. Open details`}>
    <span className="wo-module-icon" aria-hidden="true">{icon}</span>
    <span className="wo-module-text"><strong>{title}</strong><span className="wo-module-metric">{metric}</span></span></button>;
}

export function SignalsPage({ section }: { section: Section }) {
  const { state: s, derived: d } = useSignals();
  const [open, setOpen] = useState<SheetId | null>(null);
  const close = () => setOpen(null);
  const topVibe = d.queue[0]; const topPulse = d.pulseQueue[0];
  const spree = d.clusters.at(-1); const lastPayday = d.payday.windows.at(-1);
  const waiting = d.queue.length + d.pulseQueue.length;
  if (section === 'lab') return <div className="wo-page">
    <header className="wo-hero"><p className="wo-eyebrow">TEST LAB</p><h1>Simulation controls</h1><p>Stress-test the analytics. Simulated data is always labelled and never changes the base ledger.</p></header>
    <section className="wo-panel wo-feed" aria-label="Mock bank feed">
      <div className="wo-row"><p className="wo-eyebrow">MOCK BANK FEED · 14-DAY SIMULATED PERSONA</p><span className="wo-chip wo-chip-mint">{ledgerMeta.dataset}</span></div>
      <p className="wo-big">{cents(d.cashCents)} <small>cash · {d.txns.length} movements · {baseTransactions.length} from ledger</small></p>
      <p className="wo-note">Simulated clock: <strong>{simClockLabel(d.nowMs, s.clockHours)}</strong></p>
    </section>
    <TestLab />
    <p className="wo-footnote"><Link to="/">← Back to your patterns</Link></p>
  </div>;
  return <div className="wo-page">
    <header className="wo-hero"><h1>Spending patterns</h1><p>Zero-effort patterns from your bank feed. No scores, no shame.</p></header>
    <article className="wo-panel" aria-label="Micro check-in">
      <p className="wo-eyebrow">QUICK CHECK-IN{waiting > 1 ? ` · ${waiting - 1} more waiting` : ''}</p>
      {topVibe ? <><p className="wo-question">What was behind this one?</p><TxnLine txn={topVibe} /><VibeTagger txn={topVibe} /></>
        : topPulse ? <><p className="wo-question">Was this worth it?</p><TxnLine txn={topPulse} /><PulseButtons txn={topPulse} /></>
        : <p className="wo-empty">All caught up. Nothing to tag.</p>}
      {d.regret.regretRate !== null ? <p className="wo-note">Regret so far: {pct(d.regret.regretRate)} of {d.regret.answered} answered</p> : null}
    </article>
    <div className="wo-stack">
      <Row icon="⚡" title="Transaction velocity" onOpen={() => setOpen('velocity')} metric={spree ? `${d.clusters.length} sprees · latest ${spree.txns.length} buys` : 'No spree'} />
      <Row icon="🌙" title="Late-night profile" onOpen={() => setOpen('circadian')} metric={d.circadian.lateCount ? `${pct(d.circadian.lateShareCount)} after 11 PM` : '0 late-night buys'} />
      <Row icon="💸" title="Payday-to-splurge" onOpen={() => setOpen('payday')} metric={lastPayday ? `${cents(lastPayday.spendCents)} in 48h` : 'No payroll'} />
      <Row icon="💧" title="Micro-leaks" onOpen={() => setOpen('leaks')} metric={`${pct(d.leaks.autopilotShare)} autopilot`} />
      <Row icon="🔒" title="Before checkout" onOpen={() => setOpen('intent')} metric={d.resistance.score === null ? 'Warming up' : `${d.resistance.score.toFixed(0)}% resistance`} />
    </div>
    <p className="wo-footnote">Simulated 14-day persona · {ledgerMeta.dataset} · <Link to="/lab">Test lab</Link></p>
    {open === 'velocity' ? <VelocitySheet onClose={close} /> : null}{open === 'circadian' ? <CircadianSheet onClose={close} /> : null}
    {open === 'payday' ? <PaydaySheet onClose={close} /> : null}{open === 'leaks' ? <LeakSheet onClose={close} /> : null}
    {open === 'intent' ? <IntentSheet onClose={close} /> : null}
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
