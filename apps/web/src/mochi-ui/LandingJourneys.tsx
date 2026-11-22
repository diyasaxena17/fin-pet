import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

type GoalKind = 'daily-budget' | 'saving-goal' | 'investing';
type PersonalGoal = { id: string; kind: GoalKind; title: string; amount: number | null };

const goalsStorageKey = 'mochi.landing-goals.v1';
const goalKinds: Record<GoalKind, { label: string; prompt: string; placeholder: string; amountLabel: string }> = {
  'daily-budget': { label: 'Daily budget', prompt: 'What would feel like a workable daily limit?', placeholder: 'A calmer weekday spending plan', amountLabel: 'Daily amount (CAD)' },
  'saving-goal': { label: 'Saving goal', prompt: 'What would you love to make room for?', placeholder: 'A weekend away, a cushion, or something yours', amountLabel: 'Target amount (CAD)' },
  investing: { label: 'Investing', prompt: 'What would you like to understand or work toward?', placeholder: 'Learn the basics before I decide', amountLabel: 'Starting amount (CAD)' },
};

const isGoalKind = (value: unknown): value is GoalKind => typeof value === 'string' && Object.hasOwn(goalKinds, value);

function readGoals(): PersonalGoal[] {
  try {
    const saved = window.localStorage.getItem(goalsStorageKey);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed.filter((goal: unknown): goal is PersonalGoal => {
      if (!goal || typeof goal !== 'object') return false;
      const item = goal as Record<string, unknown>;
      return typeof item.id === 'string' && typeof item.title === 'string' && isGoalKind(item.kind) &&
        (item.amount === null || (typeof item.amount === 'number' && Number.isFinite(item.amount)));
    }) : [];
  } catch {
    return [];
  }
}

const cad = (amount: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(amount);

export function LandingJourneys() {
  const [goals, setGoals] = useState<PersonalGoal[]>(readGoals);
  const [kind, setKind] = useState<GoalKind>('saving-goal');
  const [message, setMessage] = useState('');
  const selectedKind = goalKinds[kind];

  const addGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('goalTitle') ?? '').trim();
    const rawAmount = String(form.get('goalAmount') ?? '').trim();
    const amount = rawAmount ? Number(rawAmount) : null;
    if (!title || (rawAmount && (!Number.isFinite(amount) || amount! <= 0))) return;
    const next = [...goals, { id: crypto.randomUUID(), kind, title, amount }];
    try { window.localStorage.setItem(goalsStorageKey, JSON.stringify(next)); }
    catch { setMessage('This browser could not save your goal. Check your local storage settings and try again.'); return; }
    setGoals(next);
    setMessage(`Added “${title}” to your goals.`);
    event.currentTarget.reset();
  };

  const removeGoal = (id: string) => {
    const next = goals.filter(goal => goal.id !== id);
    try { window.localStorage.setItem(goalsStorageKey, JSON.stringify(next)); }
    catch { setMessage('This browser could not update your saved goals.'); return; }
    setGoals(next);
    setMessage('Goal removed.');
  };

  return <section className="landing-paths" aria-labelledby="landing-paths-title">
    <div className="landing-goal-builder">
      <p className="landing-paths-eyebrow">A GOAL THAT MATTERS TO YOU</p>
      <h2>What would you like to make room for?</h2>
      <p className="landing-goal-prompt">Pick a starting point, then name something you care about. You can add more than one.</p>
      <form className="landing-goal-form" onSubmit={addGoal}>
        <label>What are you working on?
          <select value={kind} onChange={event => setKind(event.target.value as GoalKind)}>
            {Object.entries(goalKinds).map(([value, option]) => <option key={value} value={value}>{option.label}</option>)}
          </select>
        </label>
        <label>{selectedKind.prompt}
          <input name="goalTitle" required maxLength={120} placeholder={selectedKind.placeholder} onChange={() => setMessage('')} />
        </label>
        <label>{selectedKind.amountLabel} <span className="landing-goal-optional">(optional)</span>
          <input name="goalAmount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="e.g. 500" onChange={() => setMessage('')} />
        </label>
        <button type="submit" className="landing-goal-submit">Add a goal <span aria-hidden="true">+</span></button>
      </form>
      <p className="landing-goal-storage">Your goal ideas are saved on this device.</p>
      {message && <p className="landing-goal-status" role="status">{message}</p>}
      {goals.length > 0 && <ul className="landing-goal-list" aria-label="Your goals">
        {goals.map(goal => <li key={goal.id}>
          <span className="landing-goal-kind">{goalKinds[goal.kind].label}</span>
          <strong>{goal.title}</strong>
          {goal.amount !== null && <small>{cad(goal.amount)} {goal.kind === 'daily-budget' ? 'per day' : goal.kind === 'investing' ? 'starting amount' : 'target'}</small>}
          <button type="button" aria-label={`Remove ${goal.title}`} onClick={() => removeGoal(goal.id)}>Remove</button>
        </li>)}
      </ul>}
    </div>
    <div className="landing-paths-intro">
      <p className="landing-paths-eyebrow">YOUR NEXT BRANCH</p>
      <h2 id="landing-paths-title">Choose what to grow today</h2>
      <p>Small choices make patterns clearer and your goals feel closer.</p>
    </div>
    <div className="landing-paths-grid">
      <Link className="landing-path-link landing-path-link--behaviour" to="/signals">
        <span className="landing-path-icon" aria-hidden="true">🍃</span>
        <strong>Behavioural tools</strong>
        <small>Notice spending patterns with curiosity, not scores or shame.</small>
        <span className="landing-path-action">Explore signals <span aria-hidden="true">→</span></span>
      </Link>
      <Link className="landing-path-link landing-path-link--learning" to="/oak">
        <span className="landing-path-icon" aria-hidden="true">🌳</span>
        <strong>Learning tree</strong>
        <small>Learn with short stories, lessons and forest activities.</small>
        <span className="landing-path-action">Explore learning <span aria-hidden="true">→</span></span>
      </Link>
    </div>
  </section>;
}
