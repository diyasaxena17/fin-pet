import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { categoryLabels, type BudgetSummary, type Transaction, type TransactionCategory } from '@mochi/contracts';
import { EmptyState, Feedback, LoadingState } from '../components/Feedback';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';
import { createRequestId } from '../lib/requestId';
import { sharedDemoTransaction } from '../lib/forestFixtures';

const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const cad = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
const categories: TransactionCategory[] = ['food', 'shopping', 'transport', 'entertainment', 'bills', 'other'];

export function Budget() {
  const { state, busy, mutate, reload } = useAppState();
  const [month, setMonth] = useState(monthNow()); const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [saved, setSaved] = useState(false); const [added, setAdded] = useState(false); const [version, setVersion] = useState(0);
  const load = useCallback(() => { let active = true; setLoading(true); setError('');
    Promise.all([api.getBudgets(month), api.getTransactions(month)]).then(([b, t]) => { if (active) { setBudget(b); setTransactions(t.transactions); } })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Could not load this month.'); })
      .finally(() => { if (active) setLoading(false); }); return () => { active = false; };
  }, [month, version]);
  useEffect(() => load(), [load]);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  return <div className="page-stack">
    <PageShell eyebrow="A PLAN THAT CAN FLEX" title="Budget">
      <p>See spending you chose to record. Purchases and skipped-purchase intentions are separate.</p>
      <label>Month<input aria-label="Month" type="month" value={month} onChange={e => setMonth(e.target.value)} /></label>
      {loading ? <LoadingState>Loading your plan…</LoadingState> : error ? <><Feedback kind="error">{error}</Feedback><button className="button--quiet" onClick={() => setVersion(v => v + 1)}>Retry</button></> : budget && <>
        <div className="forest-stats"><div><dt>Recorded this month</dt><dd>{cad(budget.spentThisMonth)}</dd></div><div><dt>Monthly plan</dt><dd>{budget.monthlyLimit === null ? '—' : cad(budget.monthlyLimit)}</dd></div><div><dt>Today</dt><dd>{cad(budget.spentToday)}</dd></div></div>
        <form className="form-section form-stack" onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const ok = await mutate(`budget:${month}`, async () => { await api.updateBudgets({ month, monthlyLimit: Number(fd.get('monthlyLimit')), ...(String(fd.get('dailyLimit')) ? { dailyLimit: Number(fd.get('dailyLimit')) } : {}) }); const next = await api.getState(); if (!next.initialized) throw new Error('Could not refresh your plan.'); return next; }); if (ok) { setSaved(true); setVersion(v => v + 1); } }}>
          <h2 className="font-bold">Monthly and daily plan</h2><label>Monthly limit (CAD)<input name="monthlyLimit" type="number" min="0.01" step="0.01" required defaultValue={budget.monthlyLimit ?? ''} /></label><label>Daily limit (CAD, optional)<input name="dailyLimit" type="number" min="0.01" step="0.01" defaultValue={budget.dailyLimit ?? ''} /></label><button disabled={busy}>Save plan</button>{saved && <Feedback kind="success">Your plan is updated.</Feedback>}
        </form>
        <h2 className="mt-6 font-bold">Category view</h2><div className="space-y-3">{budget.categories.map(c => <div key={c.id}><div className="flex justify-between"><strong>{c.label}</strong><span>{cad(c.spent)}{c.limit !== null ? ` / ${cad(c.limit)}` : ''}</span></div>{c.limit !== null && <progress max={100} value={Math.min(100, c.spent / c.limit * 100)} aria-label={`${c.label} budget used`} />}</div>)}</div>
      </>}
    </PageShell>
    <PageShell title="Log a transaction" eyebrow="YOUR RECORD, YOUR CHOICE">
      <p>A transaction updates your spending view. It does not count as savings.</p>
      {added && <Feedback kind="success">Transaction recorded.</Feedback>}
      <form id="add-transaction" className="form-stack" onSubmit={async e => { e.preventDefault(); const form = e.currentTarget; const fd = new FormData(form); const input = { requestId: createRequestId(), name: String(fd.get('name')), amount: Number(fd.get('amount')), category: String(fd.get('category')) as TransactionCategory, occurredAt: new Date(String(fd.get('occurredAt'))).toISOString() }; const ok = await mutate(`transaction:${input.requestId}`, async () => { await api.recordTransaction(input); const next = await api.getState(); if (!next.initialized) throw new Error('Could not refresh your forest.'); return next; }); if (ok) { form.reset(); setAdded(true); setVersion(v => v + 1); } }}>
        <label>What was it?<input name="name" maxLength={200} required placeholder="Lunch" /></label><label>Amount (CAD)<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Category<select name="category">{categories.map(c => <option key={c} value={c}>{categoryLabels[c]}</option>)}</select></label><label>Date and time<input name="occurredAt" type="datetime-local" required defaultValue={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} /></label><button disabled={busy}>{busy ? 'Saving…' : 'Record transaction'}</button>
      </form>
    </PageShell>
    <PageShell title="Transactions" eyebrow={month}>
      {loading ? <LoadingState>Loading transactions…</LoadingState> : error ? <button className="button--quiet" onClick={() => setVersion(v => v + 1)}>Retry transaction list</button> : transactions.length === 0 ? <EmptyState title="Nothing recorded for this month">Transactions you add will appear here.</EmptyState> : <ul className="divide-y divide-stone-100">{transactions.map(t => <li key={t.id} className="flex flex-wrap justify-between gap-2 py-3"><span><strong>{t.name}</strong><small className="block text-stone-500">{categoryLabels[t.category]} · {new Date(t.occurredAt).toLocaleDateString()}</small></span><span className="text-right">{cad(t.amount)}<span className={`source-badge source-badge--${t.source} ml-2`}>{t.source}</span></span></li>)}</ul>}
      {import.meta.env.VITE_USE_MOCK === 'true' && <aside className="form-section mt-4"><span className="source-badge source-badge--demo">DEMO FIXTURE</span><p><strong>{sharedDemoTransaction.name}</strong> · {cad(sharedDemoTransaction.amount)} · {categoryLabels[sharedDemoTransaction.category]}</p><p className="supporting-copy">Illustrative shared sample only. It is not part of your transaction list or budget totals.</p></aside>}
    </PageShell>
  </div>;
}
