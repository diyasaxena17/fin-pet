import { useEffect, useState } from 'react';
import type { AppState } from '@mochi/contracts';
import { getState } from '../lib/api';
import { PageShell } from '../components/PageShell';

export function Dashboard() {
  const [state, setState] = useState<AppState | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getState().then((data) => { if (active) setState(data); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load Mochi');
    });
    return () => { active = false; };
  }, []);
  return <PageShell title="Little steps. A brighter future.">
    {error ? <p role="alert">{error}</p> : state ? <>
      <p>{state.profile.petName} is ready to grow with you.</p>
      <dl className="mt-6 grid grid-cols-3 gap-4 rounded-2xl bg-violet-50 p-5 text-center">
        <div><dt className="text-sm">Level</dt><dd className="mt-1 text-2xl font-semibold text-violet-700">{state.wallet.level}</dd></div>
        <div><dt className="text-sm">Coins</dt><dd className="mt-1 text-2xl font-semibold text-violet-700">{state.wallet.coins}</dd></div>
        <div><dt className="text-sm">Saved</dt><dd className="mt-1 text-2xl font-semibold text-violet-700">${(state.savings.confirmedCents / 100).toFixed(2)}</dd></div>
      </dl>
    </> : <p role="status">Loading Mochi…</p>}
  </PageShell>;
}
