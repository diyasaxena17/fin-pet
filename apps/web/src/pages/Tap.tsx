import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Feedback } from '../components/Feedback';
import { PageShell } from '../components/PageShell';
import { useAppState } from '../lib/appState';
import { api } from '../lib/api';

/** Manual feeding fallback. NFC /tap is reserved as a read-only daily report alias. */
export function Tap() {
  const { state, busy, mutate } = useAppState(); const [params] = useSearchParams(); const navigate = useNavigate(); const [fed, setFed] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!fed) return; const timer = window.setTimeout(() => navigate('/'), 1400); return () => window.clearTimeout(timer); }, [fed, navigate]);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  if (params.has('petId') && params.get('petId') !== state.pet.id) return <PageShell title="Companion not found"><Link className="text-link" to="/">Return to Forest</Link></PageShell>;
  return <PageShell eyebrow="A LITTLE CARE" title={`Feed ${state.pet.name}`}><p>Use 20 acorns to give {state.pet.name} a snack. You have {state.wallet.coins} acorns.</p><p className="my-3">Energy: {state.pet.hunger}/100. Feeding restores up to 30 energy without affecting your acorn collection.</p>
    {fed && <Feedback kind="success">{state.pet.name} enjoyed a snack! Heading back to Forest…</Feedback>}{error && <Feedback kind="error">{error}</Feedback>}
    <p className="mb-5">You can feed in the app. This manual route is a fallback for a tag or QR code.</p><button disabled={busy || fed || state.wallet.coins < 20} onClick={async () => { const ok = await mutate('feed:mochi-01', requestId => api.feedPet({ requestId, petId: 'mochi-01' })); if (ok) setFed(true); else setError('Feeding could not be completed. Please try again.'); }}>{busy ? 'Preparing snack…' : 'Confirm feed · 20 acorns'}</button>{state.wallet.coins < 20 && <p className="mt-3">You need 20 acorns to feed.</p>}<Link className="text-link ml-4" to="/">Back to Forest</Link>
  </PageShell>;
}
