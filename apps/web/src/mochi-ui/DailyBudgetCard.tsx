// @ts-nocheck
import { useState } from 'react';

const time = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Live daily budget: entered by the user (no preset). Spending comes from the bank feed, never typed in. */
export function DailyBudgetCard({ petName, dailySpent, dailyLimit, hasBudget, isUnderBudget, money, saveDailyBudget, bankFeed, bankSynced, syncBank, budgetBusy, budgetError, canSave }) {
  const [editing, setEditing] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState('');
  const showBudgetForm = !hasBudget || editing;
  const percent = hasBudget && dailyLimit > 0 ? Math.min(100, (dailySpent / dailyLimit) * 100) : 0;

  const submitBudget = async (event) => {
    event.preventDefault();
    const amount = Math.round(Number(budgetDraft) * 100) / 100;
    if (!(amount > 0)) return;
    if (await saveDailyBudget(amount)) { setEditing(false); setBudgetDraft(''); }
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D6A4F]">Daily Budget & Hardware Reaction</span>
          <h2 className="text-base font-extrabold text-[#1B4332]">Today’s Spending Pulse</h2>
        </div>
        {hasBudget && !editing && (
          <button type="button" onClick={() => { setBudgetDraft(String(dailyLimit)); setEditing(true); }}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D6CFC2] text-[#5C4033] hover:bg-[#F3ECE0] transition">
            Change budget
          </button>
        )}
      </div>

      {showBudgetForm ? (
        <form onSubmit={submitBudget} className="rounded-xl bg-[#FAF6EE] border border-[#E2D7C1] p-3 space-y-2">
          <label htmlFor="mochi-daily-budget" className="text-xs font-extrabold text-[#1B4332]">
            {hasBudget ? 'New daily budget (CAD)' : `What’s your daily budget? ${petName} will cheer when you stay under it.`}
          </label>
          <div className="flex gap-2">
            <input id="mochi-daily-budget" type="number" min="0.01" step="0.01" inputMode="decimal" required placeholder="e.g. 40"
              value={budgetDraft} onChange={(e) => setBudgetDraft(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border border-[#D6CFC2] bg-white" />
            <button type="submit" disabled={budgetBusy || !canSave}
              className="px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-extrabold disabled:opacity-50">
              {budgetBusy ? 'Saving…' : 'Set budget'}
            </button>
            {hasBudget && <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-[#5C4033] bg-white border border-[#D6CFC2]">Cancel</button>}
          </div>
        </form>
      ) : (
        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>Spent today: {money(dailySpent)}</span>
            <span className="text-[#6B5E51]">Daily budget: {money(dailyLimit)}</span>
          </div>
          <div className="w-full h-3 bg-[#EFE6D5] rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${isUnderBudget ? 'bg-[#2D6A4F]' : 'bg-[#DC2626]'}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-[#57534E] mt-2">
            {isUnderBudget
              ? `✨ ${money(dailyLimit - dailySpent)} left today. ${petName} will do a happy dance on the next NFC tap.`
              : `😟 ${money(dailySpent - dailyLimit)} over today’s budget. ${petName} will look worried on the next NFC tap.`}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-[#E6DEC8] p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-extrabold text-[#1B4332]">Today from your bank</div>
            <div className="text-[11px] text-[#78716C]">Sample transactions · Plaid will send these once it’s approved</div>
          </div>
          <button type="button" onClick={() => void syncBank()} disabled={budgetBusy || !canSave}
            className="shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D6CFC2] text-[#5C4033] hover:bg-[#F3ECE0] transition disabled:opacity-50">
            {bankSynced ? 'Synced ✓' : 'Sync'}
          </button>
        </div>
        <ul className="divide-y divide-[#F0E8DA]">
          {bankFeed.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-1.5 text-xs">
              <span><strong className="text-[#292524]">{t.name}</strong> <span className="text-[#78716C]">· {time(t.occurredAt)}</span></span>
              <span className="font-bold tabular-nums text-[#292524]">{money(t.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
      {budgetError && <p className="text-xs font-semibold text-[#991B1B]">{budgetError}</p>}
    </div>
  );
}
