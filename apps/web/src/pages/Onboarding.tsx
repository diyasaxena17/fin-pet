import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

export function Onboarding() {
  const { state, busy, mutate } = useAppState();
  const navigate = useNavigate();
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  if (state?.initialized) return <Navigate to="/" replace />;

  return <PageShell eyebrow="START YOUR FOREST" title="Let’s grow something that’s yours">
    <p className="mb-5">Choose a squirrel name, set one savings goal, and write a few words for your future self. You can keep things simple and add a budget later.</p>
    <form className="form-stack" onSubmit={async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const goalDate = String(data.get('goalDate'));
      const input = {
        petName: String(data.get('squirrelName')), goalTitle: String(data.get('goalTitle')),
        goalTarget: Number(data.get('goalTarget')),
        ...(goalDate ? { goalDate } : {}),
        letter: { vision: String(data.get('vision')), why: String(data.get('why')), reminder: String(data.get('reminder')) },
      };
      if (!await mutate(`onboard:${JSON.stringify(input)}`, () => api.onboard(input))) return;

      const voice = String(data.get('voice')) as 'cute' | 'calm';
      if (voice !== 'cute' || budgetEnabled) {
        await mutate(`onboarding-settings:${voice}:${budgetEnabled}`, async () => {
          await api.updatePreferences({ voice });
          if (budgetEnabled) {
            const daily = String(data.get('dailyLimit'));
            await api.updateBudgets({
              month: new Date().toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }).slice(0, 7),
              monthlyLimit: Number(data.get('monthlyLimit')),
              ...(daily ? { dailyLimit: Number(daily) } : {}),
            });
          }
          const updated = await api.getState();
          if (!updated.initialized) throw new Error('Your setup is saved, but the latest forest state could not be loaded.');
          return updated;
        });
      }
      navigate('/');
    }}>
      <div className="form-section"><p className="eyebrow">01 · YOUR COMPANION</p><label>Squirrel name<input name="squirrelName" required maxLength={200} placeholder="Name your squirrel" /></label></div>
      <fieldset className="choice-fieldset"><legend className="eyebrow">HOW SHOULD YOUR COMPANION SPEAK?</legend>
        <label className="choice-row"><input type="radio" name="voice" value="cute" defaultChecked /><span><strong>Warm & playful</strong><small>Friendly, light encouragement.</small></span></label>
        <label className="choice-row"><input type="radio" name="voice" value="calm" /><span><strong>Calm & simple</strong><small>Quiet, straightforward guidance.</small></span></label>
      </fieldset>
      <div className="form-section space-y-4"><p className="eyebrow">02 · A GOAL YOU CARE ABOUT</p><label>Goal name<input name="goalTitle" required maxLength={200} placeholder="A little breathing room" /></label>
        <label>Target amount (CAD)<input name="goalTarget" type="number" min="0.01" max="1000000000" step="0.01" required defaultValue="200" /></label>
        <label>Target date (optional)<input name="goalDate" type="date" /></label></div>
      <div className="form-section space-y-4"><p className="eyebrow">03 · A LETTER FOR FUTURE YOU</p>
        <label htmlFor="onboarding-vision">What future are you building?<textarea id="onboarding-vision" name="vision" maxLength={4000} rows={2} /></label>
        <label htmlFor="onboarding-why">Why does it matter to you?<textarea id="onboarding-why" name="why" maxLength={4000} rows={2} /></label>
        <label htmlFor="onboarding-reminder">What do you want to remember?<textarea id="onboarding-reminder" name="reminder" maxLength={4000} rows={2} /></label>
      </div>
      <details className="optional-settings"><summary>Optional · start with a spending plan</summary>
        <label className="choice-row"><input type="checkbox" name="budgetEnabled" checked={budgetEnabled} onChange={event => setBudgetEnabled(event.target.checked)} /><span><strong>Set a monthly limit</strong><small>You can change it any time. This is a personal target, not a grade.</small></span></label>
        <div className="grid gap-4 sm:grid-cols-2"><label>Monthly plan (CAD)<input name="monthlyLimit" type="number" min="0.01" max="1000000000" step="0.01" required={budgetEnabled} disabled={!budgetEnabled} placeholder="500" /></label><label>Daily plan (optional, CAD)<input name="dailyLimit" type="number" min="0.01" max="1000000000" step="0.01" disabled={!budgetEnabled} placeholder="25" /></label></div>
      </details>
      <button className="w-full sm:w-auto" disabled={busy} type="submit">{busy ? 'Planting your first seed…' : 'Start my forest'}</button>
    </form>
  </PageShell>;
}
