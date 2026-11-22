// @ts-nocheck
const cad = (amount) => new Intl.NumberFormat('en-CA', {
  style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(amount);

function getGoals() {
  try {
    const goals = JSON.parse(window.localStorage.getItem('mochi.landing-goals.v1') ?? '[]');
    return Array.isArray(goals) ? goals.filter(goal => goal && typeof goal.title === 'string' &&
      ['saving-goal', 'investing'].includes(goal.kind) && (goal.amount === null || typeof goal.amount === 'number')) : [];
  } catch { return null; }
}

export function ReportsTab({ activeTab, dailySpent, dailyLimit, isUnderBudget, regretVoted, handleRegretPulse }) {
  if (activeTab !== 'reports') return null;
  const progress = dailyLimit > 0 ? Math.min(100, (dailySpent / dailyLimit) * 100) : 0;
  const statusColor = isUnderBudget ? '#286840' : '#a54434';
  const goals = getGoals() ?? [];
  const exampleSavings = 180;
  const exampleSavingsTarget = 200;
  const savingsProgress = Math.round(exampleSavings / exampleSavingsTarget * 100);

  return <section className="p-4" aria-labelledby="daily-spending-title">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><p className="text-[11px] font-bold uppercase tracking-wider text-[#2D6A4F]">Reports</p><h2 id="daily-spending-title" className="text-xl font-extrabold text-[#1B4332]">Your money</h2></div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      <section className="col-span-2 rounded-2xl border border-[#E6DEC8] bg-white p-3.5 shadow-xs" aria-label="Daily spending report">
        <div className="mb-2 flex items-center justify-between gap-2 text-xs">
          <strong className="text-[#1B4332]">Daily budget</strong>
          <span className="font-bold text-[#34483B]">{cad(dailySpent)} <span className="font-normal text-[#8A8174]">of</span> {cad(dailyLimit)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#EFE6D5]" role="progressbar" aria-label="Daily budget used" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: statusColor }} />
        </div>
        <p className="mt-1.5 text-[11px] font-semibold" style={{ color: statusColor }}>{isUnderBudget ? 'Within limit' : 'Over limit'}</p>
      </section>
      <section className="rounded-2xl border border-[#E6DEC8] bg-white p-3" aria-label="Impulse purchase check-in">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#95602B]">Impulse buy</p>
        <h3 className="mt-1 text-sm font-extrabold text-[#1B4332]">Campus Bookstore</h3>
        <p className="text-xs text-[#536357]">{cad(22.5)} · still glad?</p>
        {regretVoted ? <p className="mt-2 text-[11px] font-semibold text-[#286840]">Saved</p> : <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => handleRegretPulse('worth_it')} className="rounded-lg bg-[#2D6A4F] px-2 py-1.5 text-[10px] font-bold text-white">Worth it</button>
          <button type="button" onClick={() => handleRegretPulse('regret')} className="rounded-lg border border-[#D6CFC2] bg-[#FAF6EE] px-2 py-1.5 text-[10px] font-bold text-[#5C4033]">Not worth it</button>
        </div>}
      </section>
      <section className="rounded-2xl border border-[#E6DEC8] bg-white p-3" aria-label="Payday savings example">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#95602B]">Payday</p>
        <h3 className="mt-1 text-sm font-extrabold text-[#1B4332]">{cad(150)} saved</h3>
        <p className="text-xs text-[#536357]">Within 4 hours</p>
      </section>
      <section className="rounded-2xl border border-[#E6DEC8] bg-white p-3" aria-label="Savings goal progress example">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#95602B]">Savings goal</p>
        <div className="mt-1 flex items-center justify-between gap-2"><h3 className="text-sm font-extrabold text-[#1B4332]">{cad(exampleSavings)} / {cad(exampleSavingsTarget)}</h3><span className="text-[10px] font-bold text-[#536357]">{savingsProgress}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#EFE6D5]" role="progressbar" aria-label="Savings goal progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={savingsProgress}><div className="h-full rounded-full bg-[#D97706]" style={{ width: `${savingsProgress}%` }} /></div>
        <p className="mt-1 text-[10px] text-[#536357]">{cad(exampleSavingsTarget - exampleSavings)} to go</p>
      </section>
      <section className="rounded-2xl border border-[#E6DEC8] bg-white p-3" aria-label="Impulse pauses example">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#95602B]">Impulse pauses</p>
        <h3 className="mt-1 text-sm font-extrabold text-[#1B4332]">3 buys paused</h3>
        <p className="text-xs text-[#536357]">A little time to decide.</p>
      </section>
      {goals.map(goal => <section key={goal.id} className="rounded-2xl border border-[#DCE7D5] bg-[#F4F9F5] p-3" aria-label={goal.kind === 'investing' && /\btfsa\b/i.test(goal.title) ? 'TFSA goal' : 'Personal goal'}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D6A4F]">{goal.kind === 'investing' && /\btfsa\b/i.test(goal.title) ? 'TFSA goal' : goal.kind === 'investing' ? 'Investing goal' : 'Saving goal'}</p>
        <h3 className="mt-1 text-sm font-extrabold text-[#1B4332]">{goal.title}</h3>
        {typeof goal.amount === 'number' && <p className="text-xs text-[#536357]">Target {cad(goal.amount)}</p>}
      </section>)}
    </div>
  </section>;
}
