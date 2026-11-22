import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { Insight } from '@mochi/contracts';
import { Feedback, LoadingState } from '../components/Feedback';
import { ForestTree } from '../components/ForestTree';
import { PageShell } from '../components/PageShell';
import { SquirrelAvatar } from '../components/SquirrelAvatar';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';
import { createRequestId } from '../lib/requestId';
import { ProgressionMap } from '../components/ProgressionMap';
import { QuickPlan } from '../components/QuickPlan';

const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

export function Dashboard() {
  const { state, busy, mutate } = useAppState();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightError, setInsightError] = useState('');
  const [insightLoading, setInsightLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getInsights().then(({ insights: value }) => { if (active) setInsights(value); }).catch((reason: unknown) => {
      if (active) setInsightError(reason instanceof Error ? reason.message : 'Could not load insights.');
    }).finally(() => { if (active) setInsightLoading(false); });
    return () => { active = false; };
  }, [state?.initialized]);

  if (state === null) return <LoadingState>Opening your forest…</LoadingState>;
  if (!state.initialized) return <Navigate to="/onboarding" replace />;
  const letterSections = [state.letter.vision, state.letter.why, state.letter.reminder];
  const currentInsight = insights[0];
  const budgetPercent = state.budgetSummary.monthlyLimit === null ? 0
    : Math.min(100, state.budgetSummary.spentThisMonth / state.budgetSummary.monthlyLimit * 100);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [decision, setDecision] = useState<'skip' | 'buy'>('skip');
  const decisionRequestId = useRef<string | null>(null);

  return <div className="page-stack">
    <QuickPlan />
    <PageShell eyebrow="YOUR FOREST" title="A little progress, growing every day">
      <div className="forest-welcome">
        <SquirrelAvatar name={state.pet.name} mood={state.pet.mood} level={state.wallet.level} />
        <div><strong>{state.pet.name} is here with you.</strong><p>Feeling {state.pet.mood} · energy {state.pet.hunger}/100</p></div>
        <Link className="text-link ml-auto" to="/report">Daily report ↗</Link>
      </div>
      <ForestTree stage={state.forest.treeStage} progress={state.forest.growthPercent} />
      <dl className="forest-stats">
        <div><dt>Acorns</dt><dd>{state.wallet.coins}</dd></div>
        <div><dt>Experience</dt><dd>{state.wallet.xp} XP</dd></div>
        <div><dt>Level</dt><dd>{state.wallet.level}</dd></div>
      </dl>
      <p className="supporting-copy">Confirmed savings: {cad(state.goal.confirmedSaved)} of {cad(state.goal.targetAmount)}. Potential savings from purchase choices: {cad(state.goal.potentialSavings)}.</p>
      <div className="action-row"><Link className="button" to="/budget#add-transaction">Log a purchase</Link><Link className="button button--quiet" to="/future#add-savings">Add confirmed savings</Link><Link className="text-link" to="/learn">Explore a short lesson</Link></div>
    </PageShell>

    <div className="preview-grid">
      <PageShell eyebrow="A GENTLE NEXT STEP" title={state.unlockedFeatures.includes('dailyQuest') ? 'Your daily quest' : 'Keep your own pace'}>
        {state.unlockedFeatures.includes('dailyQuest')
          ? <><p>{state.quest.completedToday ? 'Today’s check-in is done. Your streak is safe for today.' : 'A quick daily check-in is ready when you are.'}</p><p className="supporting-copy">Current streak: {state.quest.streakDays} {state.quest.streakDays === 1 ? 'day' : 'days'}.</p><Link className="text-link" to="/learn">See today’s learning and check-in →</Link></>
          : <><p>Small choices count. Daily quests unlock with the Explorer level.</p><p className="supporting-copy">Your current level is {state.wallet.level}. There’s no penalty for taking a day off.</p><Link className="text-link" to="/learn">Browse lessons →</Link></>}
      </PageShell>
      <PageShell eyebrow="THIS MONTH" title="Your budget at a glance">
        {state.budgetSummary.monthlyLimit === null
          ? <><p>No monthly plan yet. Set a limit that feels useful to you.</p><Link className="text-link" to="/budget">Set up a budget →</Link></>
          : <><p>{cad(state.budgetSummary.spentThisMonth)} recorded out of {cad(state.budgetSummary.monthlyLimit)}.</p><div className="mini-meter" role="img" aria-label={`${budgetPercent.toFixed(0)} percent of monthly limit used`}><span style={{ width: `${budgetPercent}%` }} /></div><Link className="text-link" to="/budget">See categories and transactions →</Link></>}
      </PageShell>
    </div>

    <div className="preview-grid">
      <PageShell eyebrow="RECORDED PATTERN" title="One gentle insight">
        {insightLoading ? <LoadingState>Checking recorded patterns…</LoadingState>
          : insightError ? <><Feedback kind="error">{insightError}</Feedback><button className="button--quiet mt-3" onClick={() => { setInsightLoading(true); setInsightError(''); void api.getInsights().then(({ insights: value }) => setInsights(value)).catch((reason: unknown) => setInsightError(reason instanceof Error ? reason.message : 'Could not load insights.')).finally(() => setInsightLoading(false)); }}>Retry insights</button></>
            : currentInsight ? <><span className={`source-badge source-badge--${currentInsight.source}`}>{currentInsight.source} record</span><h3 className="mt-2 font-bold">{currentInsight.title}</h3><p>{currentInsight.description}</p><p className="supporting-copy">Evidence: {currentInsight.evidence.count} recorded purchases in {currentInsight.evidence.windowDays} days, totalling {cad(currentInsight.evidence.totalAmount)}.</p><Link className="text-link" to="/insights">View insight →</Link></>
              : <><p>No pattern to show yet. Insights appear only when there are enough recorded purchases.</p><Link className="text-link" to="/insights">Open Insights →</Link></>}
      </PageShell>
      <PageShell eyebrow="FUTURE ME LETTER" title="A note from you">
        {state.letter.revealedSections === 0 ? <div className="letter-seal"><span aria-hidden="true">✉</span><div><strong>Your note is sealed</strong><p>First reveal opens at 25% confirmed savings.</p></div></div>
          : <div className="revealed-note"><span className="eyebrow">{['YOUR VISION', 'WHY IT MATTERS', 'A NOTE TO YOURSELF'][state.letter.revealedSections - 1]}</span><p className="whitespace-pre-wrap">{letterSections[state.letter.revealedSections - 1] || 'This section is waiting for your words.'}</p></div>}
        <Link className="text-link mt-3 inline-block" to="/future">Open your letter and projection →</Link>
      </PageShell>
    </div>
    <PageShell title="Mindful purchase choice" eyebrow="A PAUSE, WITHOUT PRESSURE">
      <p>A skipped purchase adds potential savings. It does not count toward your tree or goal until you actually set that money aside.</p>
      <form className="form-stack" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const fd = new FormData(form); const itemName = String(fd.get('itemName')); const amount = Number(fd.get('amount')); decisionRequestId.current ??= createRequestId(); const key = `decision:${decisionRequestId.current}`; const ok = await mutate(key, requestId => api.submitDecision({ requestId, itemName, amount, decision })); if (ok) { decisionRequestId.current = null; setDecisionMessage(decision === 'skip' ? `Choice saved. ${cad(amount)} is potential savings if you later move it into your goal.` : 'Choice saved. Your recorded spending and confirmed savings stay separate.'); form.reset(); } }}>
        <label>What are you considering?<input name="itemName" required maxLength={200} placeholder="A takeaway coffee" /></label><label>Price (CAD)<input name="amount" type="number" min="0.01" step="0.01" required /></label><fieldset className="choice-fieldset"><legend>What feels right today?</legend><label className="choice-row"><input type="radio" name="choice" checked={decision === 'skip'} onChange={() => setDecision('skip')} /><span>Skip</span></label><label className="choice-row"><input type="radio" name="choice" checked={decision === 'buy'} onChange={() => setDecision('buy')} /><span>Buy</span></label></fieldset><button type="submit" disabled={busy}>{busy ? 'Saving choice…' : 'Save my choice'}</button>
      </form>
      {decisionMessage && <Feedback kind="success">{decisionMessage}</Feedback>}
    </PageShell>
    <Feedback kind="info">The tree and milestone letter move only when you record money you actually set aside.</Feedback>
    <ProgressionMap state={state} />
    <PageShell eyebrow="DEMO CONTROLS" title="Preview progression"><p>These judging controls seed preview data. They are clearly marked and do not represent real saving activity.</p><div className="action-row">{([100, 250] as const).map(xp => <button className="button--quiet" key={xp} disabled={busy} onClick={() => void mutate(`demo-xp:${xp}`, () => api.demoSeed({ xp }))}>Preview {xp} XP</button>)}{([25, 50, 100] as const).map(percent => <button className="button--quiet" key={percent} disabled={busy} onClick={() => void mutate(`demo-progress:${percent}`, () => api.demoSeed({ confirmedSaved: Math.round(state.goal.targetAmount * percent) / 100 }))}>Preview {percent}% confirmed progress</button>)}<button className="button--quiet" disabled={busy} onClick={() => void mutate('demo-reset', () => api.demoReset()).then(ok => { if (ok) window.location.assign('/'); })}>Reset demo</button></div><p className="supporting-copy">The DEMO DATA banner appears when seeded state is active.</p></PageShell>
  </div>;
}
