import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { DailyReport } from '@mochi/contracts';
import { PageShell } from '../components/PageShell';
import { api } from '../lib/api';
import { useAppState } from '../lib/appState';

const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);

/** NFC/QR opens a read-only report. Only the explicit button grants a check-in. */
export function CheckIn() {
  const { state, busy, mutate } = useAppState();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    if (!state?.initialized) return;
    let active = true;
    setReport(null);
    setError('');
    api.getDailyReport().then((value) => { if (active) setReport(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your daily report.');
    });
    return () => { active = false; };
  }, [version, state?.initialized]);

  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  return <PageShell title="Your daily check-in">
    <p className="mb-4">Opening this report never spends acorns or claims a reward.</p>
    {success ? <p role="status" className="my-4 font-semibold text-emerald-800">You’re checked in for today.</p> : null}
    {error ? <div role="alert"><p>{error}</p><button className="mt-3" onClick={() => setVersion((value) => value + 1)}>Retry report</button></div>
      : report === null ? <p role="status">Loading your daily report…</p> : <>
        <p className="eyebrow">{report.date}</p>
        <p className="my-3">Recorded spending today: <strong>{cad(report.spentToday)}</strong></p>
        {report.dailyLimit === null ? <p>No daily target is configured yet.</p> : <p>Daily target: {cad(report.dailyLimit)}. {report.underDailyLimit ? 'Recorded spending is within your target.' : 'Recorded spending is above your target.'}</p>}
        <p className="my-3">{report.insight}</p>
        <p>Current streak: {report.streakDays} {report.streakDays === 1 ? 'day' : 'days'}.</p>
        {report.completedToday ? <p className="mt-4 font-semibold">Today’s reward has already been claimed.</p>
          : report.availableReward.xp === 0 ? <p className="mt-4">Daily check-ins unlock at 100 XP.</p>
            : <button className="mt-5" disabled={busy} onClick={async () => {
              if (await mutate('quest:daily-check-in', async (requestId) => (await api.checkIn({ requestId })).state)) {
                setSuccess(true);
                setVersion((value) => value + 1);
              }
            }}>{busy ? 'Checking in…' : `Complete check-in · +${report.availableReward.coins} acorns`}</button>}
        <button className="secondary-button mt-4" disabled={busy} onClick={() => { setSuccess(false); setVersion((value) => value + 1); }}>Refresh report</button>
      </>}
    <Link className="mt-5 block font-semibold text-violet-700" to="/">Back to dashboard</Link>
  </PageShell>;
}
