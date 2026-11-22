import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import type { DailyReport } from '@mochi/contracts';
import { Feedback, LoadingState } from '../components/Feedback';
import { PageShell } from '../components/PageShell';
import { api } from '../lib/api';
import { useAppState } from '../lib/appState';

const cad = (value: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(value);
/** NFC/QR report is read-only until the visitor explicitly completes check-in. */
export function CheckIn() {
  const { state, busy, mutate } = useAppState(); const [report, setReport] = useState<DailyReport | null>(null); const [error, setError] = useState(''); const [version, setVersion] = useState(0); const [success, setSuccess] = useState(false);
  const load = useCallback(() => { let active = true; setReport(null); setError(''); api.getDailyReport().then(v => { if (active) setReport(v); }).catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : 'Unable to load the daily report.'); }); return () => { active = false; }; }, [version]); useEffect(() => { if (state?.initialized) return load(); }, [state?.initialized, load]);
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  return <PageShell eyebrow="NFC / QR DAILY REPORT" title="A small forest check-in"><p>Opening this page is read-only. It does not record spending, claim a reward, or trigger a device reaction.</p>
    {success && <Feedback kind="success">Check-in complete! Your daily reward has been added. A little icing sugar for your progress.</Feedback>}
    {error ? <><Feedback kind="error">{error}</Feedback><button className="button--quiet" onClick={() => setVersion(v => v + 1)}>Retry report</button></> : report === null ? <LoadingState>Loading your report…</LoadingState> : <>
      <p className="eyebrow">{report.date}</p><p className="my-3">Recorded spending today: <strong>{cad(report.spentToday)}</strong></p>
      {report.dailyLimit === null ? <p>No daily plan is set. You can add one in Budget.</p> : <p>Daily plan: {cad(report.dailyLimit)}. {report.underDailyLimit ? 'Recorded spending is within your plan.' : 'Recorded spending is above your plan.'}</p>}
      {report.achievement && <p className="form-section mt-4"><strong>Today’s achievement</strong><br />{report.achievement}</p>}<p className="feedback feedback--info">A note for today: {report.insight}</p><p>Current streak: {report.streakDays} days.</p>
      {report.completedToday ? <Feedback kind="info">Today’s check-in is already complete.</Feedback> : report.availableReward.xp === 0 ? <Feedback kind="info">Daily check-ins open as your forest grows.</Feedback> : <button className="mt-4" disabled={busy} onClick={async () => { const ok = await mutate('checkin:daily', async requestId => { const result = await api.checkIn({ requestId }); const latest = await api.getDailyReport(); setReport(latest); return result.state; }); if (ok) { setSuccess(true); setVersion(v => v + 1); } }}>{busy ? 'Completing check-in…' : `Complete check-in · +${report.availableReward.coins} acorns`}</button>}
      <button className="button--quiet ml-2 mt-4" disabled={busy} onClick={() => { setSuccess(false); setVersion(v => v + 1); }}>Refresh report</button>
    </>}
    <div className="action-row"><Link className="text-link" to="/">Back to Forest</Link><Link className="text-link" to="/feed">Feed your squirrel</Link></div>
  </PageShell>;
}
