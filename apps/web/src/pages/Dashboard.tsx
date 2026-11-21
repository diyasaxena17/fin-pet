import { Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';
import { ProgressionMap } from '../components/ProgressionMap';
import { MochiAvatar } from '../components/MochiAvatar';

const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

export function Dashboard() {
  const { state, busy, mutate } = useAppState();
  const [pendingDecision, setPendingDecision] = useState<'buy' | 'skip' | null>(null);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  const letterSections = [state.letter.vision, state.letter.why, state.letter.reminder];
  return <div className="space-y-5 sm:space-y-6">
    <PageShell title="Little steps. A brighter future.">
      <div className="pet-welcome mb-6 flex items-center gap-4 rounded-2xl p-4 sm:p-5">
        <MochiAvatar mood={state.pet.mood} level={state.wallet.level} />
        <div><p className="font-bold text-slate-900">{state.pet.name} is feeling {state.pet.mood} today</p><p className="text-sm">Fullness · {state.pet.hunger} / 100</p></div>
        <span className="ml-auto hidden text-2xl sm:block" aria-hidden="true">✦</span>
      </div>
      <dl className="my-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="stat-chip"><dt>Level</dt><dd>{state.wallet.level}<span> / 3</span></dd></div>
        <div className="stat-chip"><dt>Coins</dt><dd>{state.wallet.coins}<span> ✦</span></dd></div>
        <div className="stat-chip"><dt>Experience</dt><dd>{state.wallet.xp}<span> XP</span></dd></div>
      </dl>
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2"><div><p className="eyebrow">YOUR GOAL</p><h2 className="text-xl font-bold text-slate-900">{state.goal.title}</h2></div><strong className="text-xl text-violet-700">{state.goal.progressPercent.toFixed(0)}%</strong></div>
      <p>Confirmed savings · {cad(state.goal.confirmedSaved)} of {cad(state.goal.targetAmount)}</p>
      <progress className="my-3 w-full accent-violet-600" aria-label="Goal progress" max={100} value={state.goal.progressPercent} />
      <p className="text-sm">Potential savings · {cad(state.goal.potentialSavings)} <span className="text-slate-500">(separate from money you’ve moved)</span></p>
      <div className="mt-5 flex flex-wrap gap-3"><Link className="button" to="/tap?petId=mochi-01">Feed {state.pet.name} · 20 coins</Link><Link className="secondary-button" to="/future-me">View your Future Me</Link></div>
    </PageShell>
    <PageShell title="A mindful purchase">
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'buy' ? 'buy' : 'skip';
        const input = { itemName: String(data.get('itemName')), amount: Number(data.get('amount')), decision } as const;
        setPendingDecision(input.decision);
        if (await mutate(`decision:${JSON.stringify(input)}`, (requestId) => api.submitDecision({ ...input, requestId }))) form.reset();
        setPendingDecision(null);
      }}>
        <label>Item name<input name="itemName" maxLength={200} required placeholder="Hoodie" /></label>
        <label>Price (CAD)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" value="skip" disabled={busy}>{busy && pendingDecision === 'skip' ? 'Saving choice…' : 'Skip purchase'}</button><button className="secondary-button" type="submit" value="buy" disabled={busy}>{busy && pendingDecision === 'buy' ? 'Saving choice…' : 'Buy it'}</button></div>
        <p>Choosing to buy is okay. Mochi never loses progress because you spend money.</p>
      </form>
    </PageShell>
    <PageShell title="I moved money toward my goal">
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const amount = Number(new FormData(form).get('savedAmount'));
        if (await mutate(`savings:${amount}`, (requestId) => api.recordSavings({ requestId, amount }))) form.reset();
      }}>
        <p>Record money you actually saved. This is self-reported; Mochi does not move money.</p>
        <label>Amount saved (CAD)<input name="savedAmount" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
        <button disabled={busy} type="submit">{busy ? 'Recording…' : 'I actually moved this money'}</button>
      </form>
    </PageShell>
    <PageShell title="Your Future Me letter">
      {state.letter.revealedSections === 0 ? <div className="letter-seal"><span aria-hidden="true">✉</span><div><strong>Your words are waiting</strong><p>First message opens when confirmed savings reach 25%.</p></div></div> : <>
        {letterSections.slice(0, state.letter.revealedSections).map((section, index) => <div className="revealed-note mb-3" key={index}><span className="eyebrow">{['YOUR VISION', 'WHY IT MATTERS', 'A NOTE TO YOURSELF'][index]}</span><p className="whitespace-pre-wrap">{section || 'This section is waiting for your words.'}</p></div>)}
        {state.letter.revealedSections < 3 ? <p className="text-sm">The next note unlocks as you make progress toward your goal.</p> : null}
      </>}
      <ol aria-label="Letter reveal milestones" className="milestone-row mt-5 grid grid-cols-3 gap-2">
        {[25, 50, 100].map((milestone, index) => <li className={state.letter.revealedSections > index ? 'milestone-unlocked' : ''} key={milestone}><span aria-hidden="true">{state.letter.revealedSections > index ? '✓' : '•'}</span> {milestone}%</li>)}
      </ol>
      <Link className="mt-3 inline-block font-semibold text-violet-700" to="/future-me">View or edit your full letter and projection</Link>
    </PageShell>
    <PageShell title={state.unlockedFeatures.includes('dailyQuest') ? 'Your daily quest' : 'Next unlock: daily quests'}>
      {state.unlockedFeatures.includes('dailyQuest') ? <>
        <p>Streak: {state.quest.streakDays} days. {state.quest.completedToday ? 'Today’s check-in is complete.' : 'One small habit, once a day: +10 coins and +20 XP.'}</p>
        <button className="mt-3" disabled={busy || !state.quest.available} onClick={() => void mutate('quest:daily-check-in', (requestId) => api.completeQuest({ requestId, questId: 'daily-check-in' }))}>Complete daily check-in</button>
      </> : <p>Daily quests and streaks unlock at 100 XP.</p>}
    </PageShell>
    <ProgressionMap state={state} />
    {import.meta.env.DEV ? <details className="rounded-2xl border border-violet-200 bg-white p-5"><summary className="cursor-pointer font-bold text-violet-800">DEMO controls · preview seeded progress</summary>
      <p className="my-3">These controls are for judging the app flow. They set preview state and don’t represent earned activity.</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => void mutate('seed:100', () => api.demoSeed({ xp: 100 }))}>Seed level 2 · 100 XP</button>
        <button disabled={busy} onClick={() => void mutate('seed:250', () => api.demoSeed({ xp: 250 }))}>Seed level 3 · 250 XP</button>
        <button className="secondary-button" disabled={busy} onClick={() => void mutate('seed:25pct', () => api.demoSeed({ confirmedSaved: Math.round(state.goal.targetAmount * 0.25 * 100) / 100 }))}>Seed 25% milestone</button>
        <button disabled={busy} onClick={() => { if (window.confirm('Reset all demo progress and start again?')) void mutate('reset', () => api.demoReset()); }}>Reset demo</button>
      </div>
    </details> : null}
  </div>;
}
