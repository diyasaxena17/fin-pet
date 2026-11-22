import { useState, type FormEvent } from 'react';
import { categoryLabels, type TransactionCategory } from '@mochi/contracts';
import { Sheet } from '../components/Sheet';
import { Bar, Callout, Empty, TxnLine, WhyPanel } from './widgets';
import { useSignals } from './store';
import { cents, wishHoursLeft, wishStatus } from './analytics';
import { fmtDay, fmtDuration, fmtHours, fmtTime, pct } from './format';

export type SheetId = 'velocity' | 'circadian' | 'payday' | 'leaks' | 'intent';
const TAG = 'BEHAVIORAL SIGNAL';

export function VelocitySheet({ onClose }: { onClose(): void }) {
  const { derived: { clusters } } = useSignals(); 
  return <Sheet tag={TAG} title="Transaction velocity" onClose={onClose}>
    <>
      <Callout title={clusters.length ? `${clusters.length} spree${clusters.length > 1 ? 's' : ''} flagged` : 'No spree detected'}>
        {clusters.length ? 'Three or more non-essential purchases landed inside a 4-hour window. Bursts say more about momentum than monthly totals do.'
          : 'No 3+ non-essential purchases inside 4 hours. Use the test lab to trigger one.'}</Callout>
      {clusters.length ? clusters.map((c) => <div className="wo-panel" key={c.id}>
        <p className="wo-eyebrow">{fmtDay(c.start)} · {fmtTime(c.start)} → {fmtTime(c.end)} · {fmtDuration(c.spanMinutes)}</p>
        <p className="wo-big">{cents(c.totalCents)} <small>across {c.txns.length} purchases</small></p>
        {c.txns.map((t) => <TxnLine key={t.id} txn={t} />)}
      </div>) : <Empty>Clear. Nothing to flag in this period.</Empty>}
      <WhyPanel k="velocity" />
    </>
  </Sheet>;
}

export function CircadianSheet({ onClose }: { onClose(): void }) {
  const { derived: { circadian: c } } = useSignals(); 
  const max = Math.max(c.daySpendCents, c.lateSpendCents, 1);
  return <Sheet tag={TAG} title="Late-night profile" onClose={onClose}>
    <>
      <Callout title={c.lateCount ? `${pct(c.lateShareCount)} of impulse buys are after 11 PM` : 'No late-night spending'}>
        {c.lateCount ? 'Late delivery and checkout orders tend to follow decision fatigue. Compare them with the same purchases in daylight.'
          : 'Everything in this period happened in daylight hours (11 PM – 3 AM window is empty).'}</Callout>
      <div className="wo-panel">
        <Bar label={`Daytime · ${c.dayCount} purchases`} value={c.daySpendCents} max={max} right={cents(c.daySpendCents)} />
        <Bar label={`Late night · ${c.lateCount} purchases`} value={c.lateSpendCents} max={max} tone="amber" right={cents(c.lateSpendCents)} />
        <p className="wo-note">Late-to-day spend ratio: <strong>{c.lateToDayRatio === null ? '—' : `${c.lateToDayRatio.toFixed(2)}×`}</strong> · late share of spend {pct(c.lateShareSpend)}</p>
      </div>
      {c.lateItems.length ? <><p className="wo-eyebrow wo-pad">LATE-NIGHT FOOD DELIVERY & E-COMMERCE</p>{c.lateItems.map((t) => <TxnLine key={t.id} txn={t} />)}</> : null}
      <WhyPanel k="circadian" />
    </>
  </Sheet>;
}

export function PaydaySheet({ onClose }: { onClose(): void }) {
  const { derived: { payday: p } } = useSignals(); 
  return <Sheet tag={TAG} title="Payday-to-splurge" onClose={onClose}>
    <>
      <Callout title={p.windows.some((w) => w.flagged) ? 'Windfall spike spotted' : 'No windfall spike'}>
        {p.windows.some((w) => w.flagged) ? 'Discretionary spend in the 48 hours after payroll ran well above your usual pace.'
          : 'Spend in the 48 hours after each payroll stayed near your usual daily pace.'}
        {p.creepChangePct !== null ? ` Latest window vs the previous one: ${p.creepChangePct > 0 ? '+' : ''}${p.creepChangePct.toFixed(0)}%.` : ''}</Callout>
      {p.windows.length ? p.windows.map((w) => <div className="wo-panel" key={w.payroll.id}>
        <div className="wo-row"><p className="wo-eyebrow">PAYROLL {fmtDay(w.payroll.at)} · {fmtTime(w.payroll.at)} · +{cents(w.payroll.amountCents)}</p>
          <span className={`wo-chip ${w.flagged ? 'wo-chip-amber' : 'wo-chip-mint'}`}>{w.flagged ? 'SPIKE' : 'IN RANGE'}</span></div>
        <p className="wo-big">{cents(w.spendCents)} <small>in 48h · {w.spend.length} purchase{w.spend.length === 1 ? '' : 's'}</small></p>
        <p className="wo-note">{w.firstLatencyHours === null ? 'No discretionary spend in the window.' : `First splurge ${fmtHours(w.firstLatencyHours)} after the deposit.`}
          {w.spikeRatio === null ? '' : ` ${w.spikeRatio.toFixed(2)}× your baseline pace.`}</p>
        {w.spend.map((t) => <TxnLine key={t.id} txn={t} />)}
      </div>) : <Empty>No payroll deposits in this period.</Empty>}
      <WhyPanel k="payday" />
    </>
  </Sheet>;
}

export function LeakSheet({ onClose }: { onClose(): void }) {
  const { derived: { leaks: l } } = useSignals(); 
  const max = Math.max(l.leakCents, l.plannedFoodCents, 1);
  return <Sheet tag={TAG} title="Micro-leaks vs planned spend" onClose={onClose}>
    <>
      <Callout title={l.habits.length ? `${pct(l.autopilotShare)} of food spend is autopilot` : 'No micro-leaks'}>
        {l.habits.length ? `Small, repeated, unplanned buys add up to about ${cents(Math.round(l.monthlyRunRateCents))} a month at this pace. Planned grocery runs are the intentional baseline.`
          : 'No small habit repeated three or more times without a plan.'}</Callout>
      <div className="wo-panel">
        <Bar label="Autopilot micro-leaks" value={l.leakCents} max={max} tone="amber" right={cents(l.leakCents)} />
        <Bar label="Planned food & groceries" value={l.plannedFoodCents} max={max} right={cents(l.plannedFoodCents)} />
      </div>
      {l.habits.map((h) => <div className="wo-txn" key={h.label}><div><strong>{h.label}</strong>
        <small>{h.count}× · avg {cents(Math.round(h.avgCents))} · ~{cents(Math.round(h.weeklyCents))}/week</small></div><span className="wo-amount">−{cents(h.totalCents)}</span></div>)}
      <WhyPanel k="leaks" />
    </>
  </Sheet>;
}


export function IntentSheet({ onClose }: { onClose(): void }) {
  const { state, derived, dispatch } = useSignals();
  const r = derived.restraint; const res = derived.resistance;
  const [title, setTitle] = useState(''); const [price, setPrice] = useState(''); const [category, setCategory] = useState<TransactionCategory>('shopping');
  const submit = (event: FormEvent) => { event.preventDefault();
    dispatch({ type: 'addWish', title, category, priceCents: Math.round(Number(price) * 100) }); setTitle(''); setPrice(''); };
  return <Sheet tag="INTENT SIGNAL" title="Before checkout" onClose={onClose}>
    <p className="wo-sim">SIMULATED intent telemetry · no real app or location data is read</p>
    <Callout title={res.score === null ? 'Vault is warming up' : `Impulse Resistance ${res.score.toFixed(0)}%`}>
      {r.restraint} walk-aways · {cents(r.avoidedCents)} not spent · {res.waiting} waiting in the 72-hour vault · {res.impulsive} bought inside 72 hours.</Callout>
    <form className="wo-panel wo-form" onSubmit={submit} aria-label="Add temptation">
      <label>Item<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Wireless earbuds" maxLength={80} required /></label>
      <div className="wo-form-row"><label>Price (CAD)<input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0.01" step="0.01" required /></label>
        <label>Category<select value={category} onChange={(e) => setCategory(e.target.value as TransactionCategory)}>
          {(['shopping', 'food', 'entertainment', 'other'] as const).map((c) => <option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label></div>
      <button type="submit" className="wo-cta">Add to the 72-hour vault</button>
    </form>
    {state.wishlist.map((w) => { const status = wishStatus(w, derived.nowMs);
      return <div className="wo-txn" key={w.id}><div><strong>{w.title}</strong><small>{cents(w.priceCents)} · {categoryLabels[w.category]} · added {fmtDay(new Date(w.addedAtMs - 5 * 3_600_000).toISOString())}</small></div>
        <span className={`wo-chip ${status === 'waiting' ? 'wo-chip-ochre' : status === 'resisted' ? 'wo-chip-mint' : 'wo-chip-amber'}`}>
          {status === 'waiting' ? `Waiting · ${fmtHours(wishHoursLeft(w, derived.nowMs))} left` : status === 'resisted' ? 'Resisted / Expired' : 'Purchased'}</span>
        <button type="button" className="wo-mini" onClick={() => dispatch({ type: 'setWishPurchased', id: w.id, purchased: status !== 'purchased' })}>
          {status === 'purchased' ? `Undo ${w.title}` : `I bought ${w.title}`}</button></div>; })}
    <WhyPanel k="vault" />
  </Sheet>;
}
