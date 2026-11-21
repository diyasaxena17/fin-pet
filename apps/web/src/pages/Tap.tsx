import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

export function Tap() {
  const { state, busy, mutate } = useAppState();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [fed, setFed] = useState(false);
  useEffect(() => {
    if (!fed) return;
    const timeoutId = window.setTimeout(() => navigate('/'), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [fed, navigate]);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  if (params.has('petId') && params.get('petId') !== state.pet.id) return <PageShell title="Pet not found"><Link to="/">Return to your dashboard</Link></PageShell>;
  return <PageShell title={`A little care for ${state.pet.name}`}>
    <p>Feed {state.pet.name} for 20 coins? You have {state.wallet.coins} coins.</p>
    <p className="my-3">Fullness: {state.pet.hunger}/100. Feeding adds up to 30 fullness and keeps your XP.</p>
    {fed ? <div role="status" className="my-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800"><p>{state.pet.name} enjoyed their meal!</p><p className="text-sm font-normal">Taking you back to your dashboard…</p></div> : null}
    <p className="mb-5">You can feed directly in the app. An NFC tag or QR code can optionally open this same screen.</p>
    <button disabled={busy || fed || state.wallet.coins < 20} onClick={async () => {
      if (await mutate('feed:mochi-01', (requestId) => api.feedPet({ requestId, petId: 'mochi-01' }))) {
        setFed(true);
      }
    }}>{busy ? 'Feeding…' : 'Confirm feed · 20 coins'}</button>
    {state.wallet.coins < 20 ? <p className="mt-3">You need 20 coins to feed. Try a mindful purchase decision first.</p> : null}
    <Link className="mt-5 block font-semibold text-violet-700" to="/">Back to dashboard</Link>
  </PageShell>;
}
