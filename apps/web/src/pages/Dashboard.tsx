import { Link, Navigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

export function Dashboard() {
  const { state, busy, mutate } = useAppState();
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  const letterSections = [state.letter.vision, state.letter.why, state.letter.reminder];
  return <div className="space-y-6">
    <PageShell title="Little steps. A brighter future.">
      <p>{state.pet.name} is {state.pet.mood}. Fullness: {state.pet.hunger}/100.</p>
      <dl className="my-5 grid grid-cols-3 gap-3 rounded-2xl bg-violet-50 p-4 text-center">
        <div><dt>Level</dt><dd className="text-2xl font-semibold text-violet-700">{state.wallet.level}</dd></div>
        <div><dt>Coins</dt><dd className="text-2xl font-semibold text-violet-700">{state.wallet.coins}</dd></div>
        <div><dt>XP</dt><dd className="text-2xl font-semibold text-violet-700">{state.wallet.xp}</dd></div>
      </dl>
      <h2 className="text-lg font-semibold">{state.goal.title}</h2>
      <p>Confirmed savings (self-reported): {cad(state.goal.confirmedSaved)} of {cad(state.goal.targetAmount)} · {state.goal.progressPercent.toFixed(0)}%</p>
      <progress className="my-3 w-full accent-violet-600" aria-label="Goal progress" max={100} value={state.goal.progressPercent} />
      <p>Potential savings: {cad(state.goal.potentialSavings)}. Skipping a purchase does not move money into savings.</p>
      <Link className="button mt-5" to="/tap?petId=mochi-01">Feed {state.pet.name}</Link>
    </PageShell>
    <PageShell title="A mindful purchase">
      <form className="space-y-4" onSubmit={async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const decision = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'buy' ? 'buy' : 'skip';
        const input = { itemName: String(data.get('itemName')), amount: Number(data.get('amount')), decision } as const;
        if (await mutate(`decision:${JSON.stringify(input)}`, (requestId) => api.submitDecision({ ...input, requestId }))) form.reset();
      }}>
        <label>Item name<input name="itemName" maxLength={200} required placeholder="Hoodie" /></label>
        <label>Price (CAD)<input name="amount" type="number" min="0.01" max="1000000000" step="0.01" required /></label>
        <div className="flex flex-wrap gap-3"><button type="submit" value="skip" disabled={busy}>Skip purchase</button><button type="submit" value="buy" disabled={busy}>Log purchase</button></div>
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
        <button disabled={busy} type="submit">Record savings</button>
      </form>
    </PageShell>
    <PageShell title="Your Future Me letter">
      {state.letter.revealedSections === 0 ? <p>Your milestone reveal is sealed until 25% of your goal.</p> : letterSections.slice(0, state.letter.revealedSections).map((section, index) => <p className="mb-3 whitespace-pre-wrap" key={index}>{section || 'This section is waiting for your words.'}</p>)}
      <Link className="mt-3 inline-block font-semibold text-violet-700" to="/future-me">View or edit your full letter and projection</Link>
    </PageShell>
    <PageShell title="Daily check-in">
      {state.unlockedFeatures.includes('dailyQuest') ? <>
        <p>Streak: {state.quest.streakDays} days. {state.quest.completedToday ? 'Today’s check-in is complete.' : 'One small habit, once a day: +10 coins and +20 XP.'}</p>
        <button className="mt-3" disabled={busy || !state.quest.available} onClick={() => void mutate('quest:daily-check-in', (requestId) => api.completeQuest({ requestId, questId: 'daily-check-in' }))}>Complete daily check-in</button>
      </> : <p>Daily quests and streaks unlock at 100 XP.</p>}
    </PageShell>
    {import.meta.env.DEV ? <details className="rounded-2xl border border-violet-200 p-5"><summary>Local demo tools</summary>
      <p className="my-3">Preview feature unlocks with clearly labeled seeded progress.</p>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy} onClick={() => void mutate('seed:100', () => api.demoSeed({ xp: 100 }))}>Preview level 2</button>
        <button disabled={busy} onClick={() => void mutate('seed:250', () => api.demoSeed({ xp: 250 }))}>Preview level 3</button>
        <button disabled={busy} onClick={() => { if (window.confirm('Reset all demo progress and start again?')) void mutate('reset', () => api.demoReset()); }}>Reset demo</button>
      </div>
    </details> : null}
  </div>;
}
