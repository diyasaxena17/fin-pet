import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Feedback } from './Feedback';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

const monthNow = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
const sessionKey = 'forest-quick-plan-dismissed';

export function QuickPlan() {
  const { state, busy, mutate } = useAppState();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(() => window.sessionStorage.getItem(sessionKey) !== 'true');
  const [dailyLimit, setDailyLimit] = useState(() => state?.initialized && state.budgetSummary.dailyLimit !== null
    ? String(state.budgetSummary.dailyLimit) : '');
  const [learningFocus, setLearningFocus] = useState('');
  const [saved, setSaved] = useState(false);

  if (!visible || !state?.initialized) return null;
  const daysThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dailyAmount = Number(dailyLimit);
  const monthlyPlan = state.budgetSummary.monthlyLimit ?? (Number.isFinite(dailyAmount) ? dailyAmount * daysThisMonth : 0);

  function closeForNow() {
    window.sessionStorage.setItem(sessionKey, 'true');
    setVisible(false);
  }

  async function saveDailyPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isFinite(dailyAmount) || dailyAmount <= 0) return;
    const month = monthNow();
    const ok = await mutate('quick-daily-plan', async () => {
      await api.updateBudgets({ month, monthlyLimit: monthlyPlan, dailyLimit: dailyAmount });
      const next = await api.getState();
      if (!next.initialized) throw new Error('Your plan was saved, but the latest forest state could not be loaded.');
      return next;
    });
    if (ok) {
      window.sessionStorage.setItem(sessionKey, 'true');
      setSaved(true);
    }
  }

  return <section className="quick-plan page-card" aria-labelledby="quick-plan-title">
    <div className="quick-plan-heading"><div><p className="eyebrow">A SIMPLE START</p><h2 id="quick-plan-title">A quick money check-in</h2><p className="supporting-copy">One small plan for today. Change it whenever you need.</p></div><button className="button--quiet quick-plan-close" type="button" onClick={closeForNow}>{saved ? 'Done for now' : 'Maybe later'}</button></div>

    <div className="quick-plan-goal"><span aria-hidden="true">🌰</span><div><strong>Your savings goal</strong><p>{state.goal.title} · {cad(state.goal.targetAmount)}</p></div><Link className="text-link" to="/future">View progress</Link></div>

    <form className="quick-plan-budget" onSubmit={event => void saveDailyPlan(event)}>
      <label htmlFor="quick-daily-limit">What daily budget feels workable? <span>(CAD)</span></label>
      <div className="quick-plan-budget-row"><input id="quick-daily-limit" aria-label="Daily budget in CAD" type="number" min="0.01" max="1000000000" step="0.01" required value={dailyLimit} onChange={event => { setDailyLimit(event.target.value); setSaved(false); }} placeholder="25.00" /><button type="submit" disabled={busy || !dailyLimit}>{busy ? 'Saving…' : 'Save daily plan'}</button></div>
      {state.budgetSummary.monthlyLimit === null
        ? <p className="supporting-copy">The current budget setup also needs a monthly plan. We’ll use {cad(dailyAmount > 0 ? dailyAmount * daysThisMonth : 0)} for this month (daily amount × {daysThisMonth} days); you can adjust it in Budget.</p>
        : <p className="supporting-copy">Your existing monthly plan of {cad(state.budgetSummary.monthlyLimit)} will stay the same.</p>}
      {saved && <Feedback kind="success">Daily plan saved. You can change it any time in Budget.</Feedback>}
    </form>

    <div className="quick-plan-learning"><div><strong>What would you like to learn about investing?</strong><p className="supporting-copy">Choose a learning direction. This isn’t saved as a financial plan.</p></div>
      <div className="quick-plan-options" role="group" aria-label="Investing learning focus">
        <button type="button" className={learningFocus === 'investing' ? 'quick-plan-option is-selected' : 'quick-plan-option'} aria-pressed={learningFocus === 'investing'} onClick={() => setLearningFocus('investing')}>Investing basics</button>
        <button type="button" className={learningFocus === 'tfsa' ? 'quick-plan-option is-selected' : 'quick-plan-option'} aria-pressed={learningFocus === 'tfsa'} onClick={() => setLearningFocus('tfsa')}>TFSAs</button>
      </div>
      {learningFocus && <button className="button--quiet quick-plan-explore" type="button" onClick={() => navigate(`/topics?topic=${learningFocus}`)}>Explore this branch →</button>}
    </div>
  </section>;
}
