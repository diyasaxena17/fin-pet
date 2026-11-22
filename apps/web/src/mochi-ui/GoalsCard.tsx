// @ts-nocheck
import { useState } from 'react';
import { getGoals, setGoals } from '../voice/goals';
import { twoWeekTotals, twoWeekTransfers } from './bankFeed';

/** Live bi-weekly savings & investing goals: entered by the user, progress read from the bank feed. */
export function GoalsCard({ money, petName, useGoals }) {
  const [goals, refresh] = useGoals;
  const [editing, setEditing] = useState(false);
  const [save, setSave] = useState('');
  const [invest, setInvest] = useState('');
  const t = twoWeekTotals();
  const showForm = !goals || editing;
  const bar = (got, goal) => Math.min(100, goal > 0 ? (got / goal) * 100 : 0);

  const submit = (event) => {
    event.preventDefault();
    const s = Math.round(Number(save) * 100) / 100, i = Math.round(Number(invest) * 100) / 100;
    if (!(s > 0) || !(i > 0)) return;
    setGoals({ saveGoal: s, investGoal: i }); refresh(); setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#E6DEC8] shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#2D6A4F]">Two-week check-in</span>
          <h3 className="text-base font-extrabold text-[#1B4332]">Bi-Weekly Savings & Investing</h3>
        </div>
        {goals && !editing && (
          <button type="button" onClick={() => { setSave(String(goals.saveGoal)); setInvest(String(goals.investGoal)); setEditing(true); }}
            className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-[#FAF6EE] border border-[#D6CFC2] text-[#5C4033] hover:bg-[#F3ECE0] transition">
            Change goals
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={submit} className="rounded-xl bg-[#FAF6EE] border border-[#E2D7C1] p-3 space-y-2">
          <p className="text-xs font-extrabold text-[#1B4332]">Every two weeks, how much do you want to put away? {petName} dances when you hit both.</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-[#5C4033]">Savings goal (CAD)
              <input aria-label="Savings goal" type="number" min="0.01" step="0.01" required value={save} onChange={(e) => setSave(e.target.value)} placeholder="e.g. 200"
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-[#D6CFC2] bg-white" /></label>
            <label className="text-[11px] font-bold text-[#5C4033]">Investing goal (CAD)
              <input aria-label="Investing goal" type="number" min="0.01" step="0.01" required value={invest} onChange={(e) => setInvest(e.target.value)} placeholder="e.g. 150"
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-[#D6CFC2] bg-white" /></label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-xs font-extrabold">Set goals</button>
            {goals && <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-[#5C4033] bg-white border border-[#D6CFC2]">Cancel</button>}
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {[['📈 Investing (TFSA)', t.invested, goals.investGoal], ['🐷 Savings', t.saved, goals.saveGoal]].map(([label, got, goal]) => (
            <div key={label} className={`p-3 rounded-xl border ${got >= goal ? 'bg-[#ECFDF5] border-[#A7F3D0]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
              <div className="flex justify-between text-xs font-extrabold mb-1.5">
                <span>{label}</span><span>{money(got)} / {money(goal)}{got >= goal ? ' ✓' : ''}</span>
              </div>
              <div className="w-full h-2.5 bg-white/70 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${got >= goal ? 'bg-[#2D6A4F]' : 'bg-[#D97706]'}`} style={{ width: `${bar(got, goal)}%` }} />
              </div>
              <p className="text-[11px] text-[#57534E] mt-1.5">{got >= goal ? 'Goal met this period!' : `${money(goal - got)} to go this period.`}</p>
            </div>
          ))}
        </div>
      )}

      <div className="text-[11px] text-[#78716C]">
        Period {t.start} → {t.end} · {twoWeekTransfers().length} transfers read from your bank (sample data; Plaid once approved)
      </div>
    </div>
  );
}
