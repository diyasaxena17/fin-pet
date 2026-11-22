import { useState, type FormEvent } from 'react';
import { categoryLabels, type TransactionCategory } from '@mochi/contracts';
import { Sheet, RewardBadge, type SheetTab } from '../components/Sheet';
import { Bar, Callout, Challenge, Empty, PulseButtons, TxnLine, VibeTagger, WhyPanel } from './widgets';
import type { WhyKey } from './insights';
import { REWARDS, skippedDecisions, useSignals } from './store';
import { cents, wishHoursLeft, wishStatus, type RegretRow, type TimeWindow } from './analytics';
import { fmtDay, fmtDuration, fmtHours, fmtTime, fmtWhen, pct } from './format';
import { geoEvents, intentEvents } from './overlay';
import { VIBES } from './types';

export type SheetId = 'velocity' | 'circadian' | 'payday' | 'leaks' | 'intent' | 'checkins';
const TAG = 'BEHAVIORAL SIGNAL';
const reflectTabs = (first: SheetTab): SheetTab[] => [first, { id: 'why', label: 'Why', icon: '🧩' }, { id: 'challenge', label: 'Reflect', icon: '🌱' }];

export function VelocitySheet({ onClose }: { onClose(): void }) {
  const { derived: { clusters } } = useSignals(); const [tab, setTab] = useState('main');
  return <Sheet tag={TAG} title="Transaction velocity" onClose={onClose} tabs={reflectTabs({ id: 'main', label: 'Sprees', icon: '⚡' })} tab={tab} onTab={setTab}>
    {tab === 'main' ? <>
      <Callout title={clusters.length ? `${clusters.length} spree${clusters.length > 1 ? 's' : ''} flagged` : 'No spree detected'} reward={REWARDS.insight.nuts}>
        {clusters.length ? 'Three or more non-essential purchases landed inside a 4-hour window. Bursts say more about momentum than monthly totals do.'
          : 'No 3+ non-essential purchases inside 4 hours. Use the test lab to trigger one.'}</Callout>
      {clusters.length ? clusters.map((c) => <div className="wo-panel" key={c.id}>
        <p className="wo-eyebrow">{fmtDay(c.start)} · {fmtTime(c.start)} → {fmtTime(c.end)} · {fmtDuration(c.spanMinutes)}</p>
        <p className="wo-big">{cents(c.totalCents)} <small>across {c.txns.length} purchases</small></p>
        {c.txns.map((t) => <TxnLine key={t.id} txn={t} />)}
      </div>) : <Empty>Clear. Nothing to flag in this period.</Empty>}
    </> : tab === 'why' ? <WhyPanel k="velocity" /> : <Challenge id="insight:velocity" question="When you catch yourself on a buying streak, which reset would you try first?" options={[
      { id: 'pause', label: 'Pause 10 minutes before the next checkout', tip: 'A short gap breaks the momentum that clusters feed on.' },
      { id: 'vault', label: 'Park it in the 72-hour vault', tip: 'The vault turns “now” into “still want it Thursday?”' },
      { id: 'close', label: 'Close the shopping apps for the day', tip: 'Removing the cue is often easier than resisting it.' }]} />}
  </Sheet>;
}

export function CircadianSheet({ onClose }: { onClose(): void }) {
  const { derived: { circadian: c } } = useSignals(); const [tab, setTab] = useState('main');
  const max = Math.max(c.daySpendCents, c.lateSpendCents, 1);
  return <Sheet tag={TAG} title="Late-night profile" onClose={onClose} tabs={reflectTabs({ id: 'main', label: 'Day vs night', icon: '🌙' })} tab={tab} onTab={setTab}>
    {tab === 'main' ? <>
      <Callout title={c.lateCount ? `${pct(c.lateShareCount)} of impulse buys are after 11 PM` : 'No late-night spending'} reward={REWARDS.insight.nuts}>
        {c.lateCount ? 'Late delivery and checkout orders tend to follow decision fatigue. Compare them with the same purchases in daylight.'
          : 'Everything in this period happened in daylight hours (11 PM – 3 AM window is empty).'}</Callout>
      <div className="wo-panel">
        <Bar label={`Daytime · ${c.dayCount} purchases`} value={c.daySpendCents} max={max} right={cents(c.daySpendCents)} />
        <Bar label={`Late night · ${c.lateCount} purchases`} value={c.lateSpendCents} max={max} tone="amber" right={cents(c.lateSpendCents)} />
        <p className="wo-note">Late-to-day spend ratio: <strong>{c.lateToDayRatio === null ? '—' : `${c.lateToDayRatio.toFixed(2)}×`}</strong> · late share of spend {pct(c.lateShareSpend)}</p>
      </div>
      {c.lateItems.length ? <><p className="wo-eyebrow wo-pad">LATE-NIGHT FOOD DELIVERY & E-COMMERCE</p>{c.lateItems.map((t) => <TxnLine key={t.id} txn={t} />)}</> : null}
    </> : tab === 'why' ? <WhyPanel k="circadian" /> : <Challenge id="insight:circadian" question="It's 11:40 PM and a delivery app is open. What's the kindest nudge for tomorrow-you?" options={[
      { id: 'snack', label: 'Keep a ready-to-eat snack at home', tip: 'Hunger plus fatigue is the usual late-night driver.' },
      { id: 'logout', label: 'Log out of delivery apps after 10 PM', tip: 'Friction at the right hour beats willpower at the wrong one.' },
      { id: 'sleep', label: 'Set a wind-down alarm', tip: 'Protecting sleep protects decisions.' }]} />}
  </Sheet>;
}

export function PaydaySheet({ onClose }: { onClose(): void }) {
  const { derived: { payday: p } } = useSignals(); const [tab, setTab] = useState('main');
  return <Sheet tag={TAG} title="Payday-to-splurge" onClose={onClose} tabs={reflectTabs({ id: 'main', label: '48h windows', icon: '💸' })} tab={tab} onTab={setTab}>
    {tab === 'main' ? <>
      <Callout title={p.windows.some((w) => w.flagged) ? 'Windfall spike spotted' : 'No windfall spike'} reward={REWARDS.insight.nuts}>
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
    </> : tab === 'why' ? <WhyPanel k="payday" /> : <Challenge id="insight:payday" question="Payroll just landed. Which move keeps the windfall from vanishing?" options={[
      { id: 'sweep', label: 'Auto-move a slice to savings first', tip: 'Paying your goal first leaves less to drift.' },
      { id: 'wait', label: 'Wait 48 hours before big purchases', tip: 'Windfall urges fade faster than most expect.' },
      { id: 'cap', label: 'Set a payday-weekend cap', tip: 'A named limit makes the decision once, not repeatedly.' }]} />}
  </Sheet>;
}

export function LeakSheet({ onClose }: { onClose(): void }) {
  const { derived: { leaks: l } } = useSignals(); const [tab, setTab] = useState('main');
  const max = Math.max(l.leakCents, l.plannedFoodCents, 1);
  return <Sheet tag={TAG} title="Micro-leaks vs planned spend" onClose={onClose} tabs={reflectTabs({ id: 'main', label: 'Habits', icon: '💧' })} tab={tab} onTab={setTab}>
    {tab === 'main' ? <>
      <Callout title={l.habits.length ? `${pct(l.autopilotShare)} of food spend is autopilot` : 'No micro-leaks'} reward={REWARDS.insight.nuts}>
        {l.habits.length ? `Small, repeated, unplanned buys add up to about ${cents(Math.round(l.monthlyRunRateCents))} a month at this pace. Planned grocery runs are the intentional baseline.`
          : 'No small habit repeated three or more times without a plan.'}</Callout>
      <div className="wo-panel">
        <Bar label="Autopilot micro-leaks" value={l.leakCents} max={max} tone="amber" right={cents(l.leakCents)} />
        <Bar label="Planned food & groceries" value={l.plannedFoodCents} max={max} right={cents(l.plannedFoodCents)} />
      </div>
      {l.habits.map((h) => <div className="wo-txn" key={h.label}><div><strong>{h.label}</strong>
        <small>{h.count}× · avg {cents(Math.round(h.avgCents))} · ~{cents(Math.round(h.weeklyCents))}/week</small></div><span className="wo-amount">−{cents(h.totalCents)}</span></div>)}
    </> : tab === 'why' ? <WhyPanel k="leaks" /> : <Challenge id="insight:leaks" question="Which swap would you trade your most frequent micro-leak for?" options={[
      { id: 'batch', label: 'One planned batch-cook instead', tip: 'Converting autopilot spend into planned spend is the whole game.' },
      { id: 'cap', label: 'A weekly treat budget', tip: 'You keep the treat; you lose the surprise.' },
      { id: 'skip', label: 'Skip it twice a week', tip: 'Small cuts compound without feeling like a diet.' }]} />}
  </Sheet>;
}

const eventLabel = { delivery_visit: 'Delivery app visit', shopping_visit: 'Store visit', checkout_entry: 'Checkout entered', cart_abandoned: 'Cart abandoned', product_linger: 'Product-page linger' } as const;
export function IntentSheet({ onClose }: { onClose(): void }) {
  const { state, derived, dispatch } = useSignals(); const [tab, setTab] = useState('restraint');
  const r = derived.restraint; const res = derived.resistance; const geo = derived.geo;
  const [title, setTitle] = useState(''); const [price, setPrice] = useState(''); const [category, setCategory] = useState<TransactionCategory>('shopping');
  const submit = (event: FormEvent) => { event.preventDefault();
    dispatch({ type: 'addWish', title, category, priceCents: Math.round(Number(price) * 100) }); setTitle(''); setPrice(''); };
  return <Sheet tag="INTENT SIGNAL" title="Before checkout" onClose={onClose} tab={tab} onTab={setTab} tabs={[
    { id: 'restraint', label: 'Restraint', icon: '🛑' }, { id: 'vault', label: '72h vault', icon: '🔒' }, { id: 'corridor', label: 'Corridors', icon: '📍' }]}>
    <p className="wo-sim">SIMULATED intent telemetry · no real app or location data is read</p>
    {tab === 'restraint' ? <>
      <Callout title={r.rate === null ? 'No intent events' : `${pct(r.rate)} restraint rate`} reward={REWARDS.insight.nuts}>
        {r.restraint} walk-aways vs {r.conversions} checkout{r.conversions === 1 ? '' : 's'} · {cents(r.avoidedCents)} not spent · {fmtDuration(Math.round(r.lingerSeconds / 60))} lingered before leaving.</Callout>
      <div className="wo-panel"><p className="wo-eyebrow">HESITATION LOG</p>
        {[...intentEvents].reverse().map((e) => <div className="wo-txn" key={e.id}><div><strong>{eventLabel[e.kind]} · {e.merchant}</strong>
          <small>{fmtWhen(e.at)} · {e.durationSec}s{e.valueCents ? ` · ${cents(e.valueCents)}` : ''}</small></div>
          <span className={`wo-chip ${e.outcome === 'purchased' ? 'wo-chip-amber' : 'wo-chip-mint'}`}>{e.outcome === 'purchased' ? 'BOUGHT' : 'RESISTED'}</span></div>)}
        {skippedDecisions.slice(-3).reverse().map((s) => <div className="wo-txn" key={s.id}><div><strong>Skipped purchase · {s.merchant}</strong><small>{fmtWhen(s.at)} · {cents(s.valueCents)} · from bank ledger</small></div>
          <span className="wo-chip wo-chip-mint">RESISTED</span></div>)}
      </div><WhyPanel k="restraint" /></> : null}
    {tab === 'vault' ? <>
      <Callout title={res.score === null ? 'Vault is warming up' : `Impulse Resistance ${res.score.toFixed(0)}%`} reward={REWARDS.insight.nuts}>
        {res.resolved} resolved · {res.waiting} still waiting · {res.impulsive} bought inside 72 hours. Waiting items count once the 72 hours are up.</Callout>
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
    </> : null}
    {tab === 'corridor' ? <>
      <Callout title={`${geo.walkAways} near-miss walk-away${geo.walkAways === 1 ? '' : 's'}`} reward={REWARDS.insight.nuts}>
        Opt-in corridor dwell events: {geo.walkAways} walked away vs {geo.walkIns} walked in and bought. Average dwell {geo.avgDwellAwayMin === null ? '—' : `${geo.avgDwellAwayMin.toFixed(0)} min`} when leaving empty-handed.</Callout>
      <div className="wo-panel">
        <Bar label="Walk-aways (near misses)" value={geo.walkAways} max={Math.max(geo.walkAways, geo.walkIns, 1)} right={String(geo.walkAways)} />
        <Bar label="Walk-in purchases" value={geo.walkIns} max={Math.max(geo.walkAways, geo.walkIns, 1)} tone="amber" right={String(geo.walkIns)} />
        {[...geoEvents].reverse().map((e) => <div className="wo-txn" key={e.id}><div><strong>{e.zone}</strong><small>{fmtWhen(e.at)} · {e.dwellMin} min dwell</small></div>
          <span className={`wo-chip ${e.outcome === 'walk_away' ? 'wo-chip-mint' : 'wo-chip-amber'}`}>{e.outcome === 'walk_away' ? 'WALKED AWAY' : 'BOUGHT'}</span></div>)}
      </div><WhyPanel k="corridor" /></> : null}
  </Sheet>;
}

const windowLabels: Record<TimeWindow, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', late_night: 'Late night' };
function RegretRows({ rows, label }: { rows: RegretRow[]; label?: (key: string) => string }) {
  return rows.length ? <>{rows.map((r) => <Bar key={r.key} label={label ? label(r.key) : r.key} value={r.rate} max={1} tone="rose" right={`${r.regret}/${r.total} · ${pct(r.rate)}`} />)}</> : <Empty>No answers yet.</Empty>;
}
export function CheckinSheet({ onClose }: { onClose(): void }) {
  const { derived } = useSignals(); const [tab, setTab] = useState('vibes'); const rg = derived.regret;
  const vibeLabel = (k: string) => k === 'untagged' ? 'No tag' : VIBES.find((v) => v.id === k) ? `${VIBES.find((v) => v.id === k)!.emoji} ${VIBES.find((v) => v.id === k)!.label}` : k;
  return <Sheet tag="ACTIVE CONTEXT" title="Vibes & regret" onClose={onClose} tab={tab} onTab={setTab}
    tabs={[{ id: 'vibes', label: 'Vibes', icon: '🧠' }, { id: 'regret', label: 'Regret profile', icon: '👍' }]}>
    {tab === 'vibes' ? <>
      <Callout title={`${derived.queue.length} purchase${derived.queue.length === 1 ? '' : 's'} to tag`} reward={REWARDS.vibe.nuts}>One tap per purchase. Tagging updates your breakdown instantly and earns +{REWARDS.vibe.nuts} Nuts the first time.</Callout>
      <div className="wo-panel"><p className="wo-eyebrow">WHY YOU BOUGHT</p>
        {([...VIBES.map((v) => v.id), 'untagged'] as const).map((k) => <Bar key={k} label={vibeLabel(k)} value={derived.vibeStats[k].cents}
          max={Math.max(...Object.values(derived.vibeStats).map((v) => v.cents), 1)} tone={k === 'untagged' ? 'amber' : 'green'} right={`${derived.vibeStats[k].count} · ${cents(derived.vibeStats[k].cents)}`} />)}</div>
      {derived.queue.slice(0, 4).map((t) => <div className="wo-panel" key={t.id}><TxnLine txn={t} /><VibeTagger txn={t} /></div>)}
      <WhyPanel k="vibes" />
    </> : <>
      <Callout title={rg.regretRate === null ? 'No answers yet' : `${pct(rg.regretRate)} regret rate`} reward={REWARDS.pulse.nuts}>
        {rg.answered} answered. 48 hours after an unplanned purchase, tell us if it was worth it. {derived.pulseQueue.length} waiting.</Callout>
      {derived.pulseQueue.slice(0, 3).map((t) => <div className="wo-panel" key={t.id}><TxnLine txn={t} /><PulseButtons txn={t} /></div>)}
      <div className="wo-panel"><p className="wo-eyebrow">BY MERCHANT</p><RegretRows rows={rg.byMerchant} />
        <p className="wo-eyebrow wo-pad">BY TIME WINDOW</p><RegretRows rows={rg.byWindow} label={(k) => windowLabels[k as TimeWindow] ?? k} />
        <p className="wo-eyebrow wo-pad">BY VIBE</p><RegretRows rows={rg.byVibe} label={vibeLabel} /></div>
      <WhyPanel k="regret" />
    </>}
  </Sheet>;
}
export { RewardBadge };
