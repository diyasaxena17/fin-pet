import { Navigate, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

export function Onboarding() {
  const { state, busy, mutate } = useAppState();
  const navigate = useNavigate();
  if (state?.initialized) return <Navigate to="/" replace />;
  return <PageShell title="Meet your future companion">
    <p className="mb-6">Give your pet a name, choose one goal, and leave a few words for your future self. You can update your letter any time.</p>
    <form className="space-y-4" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const goalDate = String(data.get('goalDate'));
      const input = {
        petName: String(data.get('petName')), goalTitle: String(data.get('goalTitle')), goalTarget: Number(data.get('goalTarget')),
        ...(goalDate ? { goalDate } : {}),
        letter: { vision: String(data.get('vision')), why: String(data.get('why')), reminder: String(data.get('reminder')) },
      };
      if (await mutate(`onboard:${JSON.stringify(input)}`, () => api.onboard(input))) navigate('/');
    }}>
      <div className="form-section"><p className="eyebrow">01 · YOUR COMPANION</p><label>Pet name<input name="petName" required maxLength={200} defaultValue="Mochi" /></label></div>
      <div className="form-section space-y-4"><p className="eyebrow">02 · ONE THING YOU’RE SAVING TOWARD</p><label>Goal title<input name="goalTitle" required maxLength={200} placeholder="A little breathing room" /></label>
      <label>Target amount (CAD)<input name="goalTarget" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue="200" /></label></div>
      <label>Target date (optional)<input name="goalDate" type="date" /></label>
      <div className="form-section space-y-4"><p className="eyebrow">03 · YOUR FUTURE ME LETTER</p><div><label htmlFor="onboarding-vision">What future are you building?</label><textarea id="onboarding-vision" name="vision" maxLength={4000} rows={2} /></div>
      <div><label htmlFor="onboarding-why">Why does it matter?</label><textarea id="onboarding-why" name="why" maxLength={4000} rows={2} /></div>
      <div><label htmlFor="onboarding-reminder">What should future you remember?</label><textarea id="onboarding-reminder" name="reminder" maxLength={4000} rows={2} /></div></div>
      <button className="w-full sm:w-auto" disabled={busy} type="submit">{busy ? 'Saving your start…' : 'Start with Mochi'}</button>
    </form>
  </PageShell>;
}
