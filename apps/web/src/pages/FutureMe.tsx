import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';
import { projectSavings, simulateSavings } from '../lib/projection';

export function FutureMe() {
  const { state, busy, mutate } = useAppState();
  const [monthly, setMonthly] = useState(50);
  const [months, setMonths] = useState(12);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(0);
  const [saved, setSaved] = useState(false);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  const estimate = projectSavings(Math.round(state.goal.confirmedSaved * 100), Math.round(monthly * 100), months) / 100;
  const expanded = simulateSavings(state.goal.confirmedSaved, monthly, years, frequency, rate);
  return <div className="space-y-6"><PageShell title="A letter to future you">
    <p className="mb-5">Your original writing is always yours to view and edit. Milestone reveals use confirmed savings.</p>
    <form className="space-y-4" onInput={() => setSaved(false)} onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const letter = { vision: String(data.get('vision')), why: String(data.get('why')), reminder: String(data.get('reminder')) };
      if (await mutate(`letter:${JSON.stringify(letter)}`, () => api.updateLetter({ letter }))) setSaved(true);
    }}>
      <div><label htmlFor="letter-vision">What future are you building?</label><textarea id="letter-vision" name="vision" defaultValue={state.letter.vision} maxLength={4000} rows={3} /></div>
      <div><label htmlFor="letter-why">Why does it matter?</label><textarea id="letter-why" name="why" defaultValue={state.letter.why} maxLength={4000} rows={3} /></div>
      <div><label htmlFor="letter-reminder">What should future you remember?</label><textarea id="letter-reminder" name="reminder" defaultValue={state.letter.reminder} maxLength={4000} rows={3} /></div>
      <button disabled={busy}>Save letter</button>
      {saved ? <p role="status">Your original letter is saved.</p> : null}
    </form>
  </PageShell><PageShell title="Your Future Me preview">
    <label>Monthly contribution (CAD)<input type="number" min={0} max={1000000} step="0.01" value={monthly} onChange={(event) => setMonthly(Math.max(0, Math.min(1000000, Number(event.target.value))))} /></label>
    <label className="mt-4">Months<input type="number" min={0} max={600} step={1} value={months} onChange={(event) => setMonths(Math.max(0, Math.min(600, Math.floor(Number(event.target.value)))))} /></label>
    <p className="mt-5">Illustrative total: ${estimate.toFixed(2)} CAD, including current confirmed savings. Growth assumption: 0%.</p>
    <p>Educational illustration, not a guarantee or financial advice.</p>
    {state.unlockedFeatures.includes('expandedProjection') ? <div className="mt-6 space-y-4 rounded-xl bg-violet-50 p-4">
      <h2 className="text-lg font-semibold">Expanded simulator</h2>
      <p>Uses the contribution amount above for the frequency selected below.</p>
      <label>Contribution frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as 'weekly' | 'monthly')}><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label>
      <label>Years<input type="number" min={0} max={50} value={years} onChange={(event) => setYears(Math.max(0, Math.min(50, Number(event.target.value))))} /></label>
      <label>Illustrative annual growth (%)<input type="number" min={0} max={20} step="0.1" value={rate} onChange={(event) => setRate(Math.max(0, Math.min(20, Number(event.target.value))))} /></label>
      <p>Starting savings and contributions: ${expanded.contributions.toFixed(2)}. Hypothetical growth: ${expanded.growth.toFixed(2)}. Illustrative total: ${expanded.total.toFixed(2)} CAD.</p>
      <p>Assumes {frequency} contributions at the end of each period and a constant hypothetical annual rate of {rate}%, compounded {frequency}. Returns are not guaranteed.</p>
    </div> : <p className="mt-4">The expanded simulator unlocks at 250 XP.</p>}
  </PageShell></div>;
}
