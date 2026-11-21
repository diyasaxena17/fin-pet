import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';
import { projectSavings, simulateSavings } from '../lib/projection';

export function FutureMe() {
  const { state, busy, mutate } = useAppState();
  const [contribution, setContribution] = useState(25);
  const [weeks, setWeeks] = useState(52);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  const [years, setYears] = useState(5);
  const [rate, setRate] = useState(0);
  const [saved, setSaved] = useState(false);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  const estimate = projectSavings(Math.round(state.goal.confirmedSaved * 100), Math.round(contribution * 100), weeks) / 100;
  const expanded = simulateSavings(state.goal.confirmedSaved, contribution, years, frequency, rate);
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
    <p className="mb-5">A simple view of what small, steady contributions could add up to.</p>
    <label>Weekly contribution (CAD)<input type="number" min={0} max={1000000} step="0.01" value={contribution} onChange={(event) => setContribution(Math.max(0, Math.min(1000000, Number(event.target.value))))} /></label>
    <label className="mt-4">Number of weeks<input type="number" min={0} max={2600} step={1} value={weeks} onChange={(event) => setWeeks(Math.max(0, Math.min(2600, Math.floor(Number(event.target.value)))))} /></label>
    <p className="mt-5 rounded-2xl bg-violet-50 p-4 font-semibold text-violet-900">Illustrative total: ${estimate.toFixed(2)} CAD <span className="font-normal">including current confirmed savings</span></p>
    <p className="text-sm">Assumes the same weekly contribution and 0% growth. This is an educational illustration, not a guarantee or financial advice.</p>
    {state.unlockedFeatures.includes('expandedProjection') ? <div className="mt-6 space-y-4 rounded-xl bg-violet-50 p-4">
      <h2 className="text-lg font-semibold">Expanded simulator</h2>
      <p>Try a longer horizon, a different contribution rhythm, or a hypothetical growth rate.</p>
      <label>Contribution frequency<select value={frequency} onChange={(event) => setFrequency(event.target.value as 'weekly' | 'monthly')}><option value="monthly">Monthly</option><option value="weekly">Weekly</option></select></label>
      <label>{frequency === 'weekly' ? 'Weekly' : 'Monthly'} contribution (CAD)<input type="number" min={0} max={1000000} step="0.01" value={contribution} onChange={(event) => setContribution(Math.max(0, Math.min(1000000, Number(event.target.value))))} /></label>
      <label>Years<input type="number" min={0} max={50} value={years} onChange={(event) => setYears(Math.max(0, Math.min(50, Number(event.target.value))))} /></label>
      <label>Illustrative annual growth (%)<input type="number" min={0} max={20} step="0.1" value={rate} onChange={(event) => setRate(Math.max(0, Math.min(20, Number(event.target.value))))} /></label>
      <div className="grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-white p-3">Contributions<strong className="mt-1 block text-lg text-slate-900">${expanded.contributions.toFixed(2)}</strong></p><p className="rounded-xl bg-white p-3">Hypothetical growth<strong className="mt-1 block text-lg text-slate-900">${expanded.growth.toFixed(2)}</strong></p><p className="rounded-xl bg-white p-3">Illustrative total<strong className="mt-1 block text-lg text-violet-800">${expanded.total.toFixed(2)}</strong></p></div>
      <p>Assumes {frequency} contributions at the end of each period and a constant hypothetical annual rate of {rate}%, compounded {frequency}. Growth is not guaranteed.</p>
    </div> : <p className="mt-4">The expanded simulator unlocks at 250 XP.</p>}
  </PageShell></div>;
}
