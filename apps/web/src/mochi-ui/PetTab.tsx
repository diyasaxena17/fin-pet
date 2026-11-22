// @ts-nocheck
import { useEffect, useState } from 'react';
import { HardwareSquirrel } from './HardwareSquirrel';

const setupKey = 'mochi.profile.setup.v2';
const logKey = 'mochi.profile.log.v1';
const pad = value => String(value).padStart(2, '0');
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const defaultSetup = (petName, voiceProfile, dailyLimit) => ({
  petName, voiceProfile, dailyBudget: String(dailyLimit), savingsGoal: '500', investingGoal: '50',
  payday: today(), reportTime: '19:00', emergencyGoal: '1000', emergencyNow: '200',
});
const loadSetup = fallback => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(setupKey) ?? '{}') }; }
  catch { return fallback; }
};
const loadLogs = () => {
  try { const value = JSON.parse(localStorage.getItem(logKey) ?? '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
};
const cad = amount => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount);

function periodFor(payday) {
  const start = new Date(`${payday}T12:00:00`);
  const now = new Date();
  while (start > now) start.setDate(start.getDate() - 14);
  while (true) {
    const next = new Date(start); next.setDate(next.getDate() + 14);
    if (now < next) return { start, end: new Date(next.getTime() - 86400000), day: Math.floor((now - start) / 86400000) + 1 };
    start.setDate(start.getDate() + 14);
  }
}

function ProgressRow({ label, current, target, color = '#ea765b' }) {
  const percent = target > 0 ? Math.min(100, current / target * 100) : 0;
  return <div className="space-y-1">
    <div className="flex justify-between gap-2 text-xs"><span>{label}</span><span>{cad(current)} / {cad(target)}</span></div>
    <div className="h-2 overflow-hidden rounded-full bg-[#f1e9e4]" role="progressbar" aria-label={`${label} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)}>
      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
    </div>
  </div>;
}

export function PetTab(props) {
  const { activeTab, petName, voiceProfile, dailySpent, dailyLimit, isUnderBudget, speechBubble, setPetName, setVoiceProfile, setDailyLimit, setDailySpent, playPetChime, setActiveTab, setSpeechBubble, showToast } = props;
  const fallback = defaultSetup(petName, voiceProfile, dailyLimit);
  const [setup, setSetup] = useState(() => loadSetup(fallback));
  const [logs, setLogs] = useState(loadLogs);
  const [view, setView] = useState(() => setup.petName?.trim() ? 'profile' : 'setup');
  const [sleeping, setSleeping] = useState(true);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [logKind, setLogKind] = useState('spent');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (setup.petName !== petName) setPetName(setup.petName);
    if (setup.voiceProfile !== voiceProfile) setVoiceProfile(setup.voiceProfile);
    const savedBudget = Number(setup.dailyBudget);
    if (Number.isFinite(savedBudget) && savedBudget !== dailyLimit) setDailyLimit(savedBudget);
  }, []);
  if (activeTab !== 'pet') return null;

  const period = periodFor(setup.payday || today());
  const periodLogs = logs.filter(item => item.date >= period.start.toISOString().slice(0, 10) && item.date <= today());
  const spentFromLogs = logs.filter(item => item.kind === 'spent' && item.date === today()).reduce((sum, item) => sum + item.amount, 0);
  const spentToday = Math.max(dailySpent, spentFromLogs);
  const budgetTarget = Number(setup.dailyBudget) || dailyLimit;
  const withinBudget = spentToday <= budgetTarget;
  const saved = periodLogs.filter(item => item.kind === 'saved').reduce((sum, item) => sum + item.amount, 0);
  const invested = periodLogs.filter(item => item.kind === 'invested').reduce((sum, item) => sum + item.amount, 0);
  const formatDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const periodStart = formatDate(period.start); const periodEnd = formatDate(period.end);
  const emergencyGoal = Number(setup.emergencyGoal) || 0;
  const emergencyNow = Number(setup.emergencyNow) || 0;
  const profileName = setup.petName || petName || 'Your companion';

  const saveLog = event => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) { showToast?.('Enter an amount greater than zero.'); return; }
    const item = { id: crypto.randomUUID(), kind: logKind, amount: value, description: description.trim(), date: today() };
    const next = [item, ...logs];
    setLogs(next);
    try { localStorage.setItem(logKey, JSON.stringify(next)); } catch { /* Keep this entry for the current session. */ }
    if (logKind === 'spent') setDailySpent(current => current + value);
    if (logKind === 'saved') setSetup(current => {
      const updated = { ...current, emergencyNow: String((Number(current.emergencyNow) || 0) + value) };
      try { localStorage.setItem(setupKey, JSON.stringify(updated)); } catch { /* Keep the profile in memory. */ }
      return updated;
    });
    setAmount(''); setDescription('');
  };

  const saveSetup = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = Object.fromEntries(Object.keys(fallback).map(key => [key, String(form.get(key) ?? '')]));
    next.petName = next.petName.trim();
    if (!next.petName) { showToast?.('Enter a name for your pet.'); return; }
    setSetup(next); setPetName(next.petName); setVoiceProfile(next.voiceProfile); setDailyLimit(Number(next.dailyBudget) || 0);
    try { localStorage.setItem(setupKey, JSON.stringify(next)); } catch { showToast?.('Setup saved for this visit.'); }
    setView('profile'); showToast?.('Profile updated.');
  };

  const sendMessage = event => {
    event.preventDefault();
    const clean = message.trim(); if (!clean) return;
    setSpeechBubble?.(`${profileName}: ${clean}`); setMessage(''); setSleeping(false);
  };

  if (view === 'setup') return <section className="mx-auto max-w-2xl px-4 py-5 text-[#473a35]" aria-labelledby="profile-setup-title">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 id="profile-setup-title" className="text-xl font-extrabold">🐿️ Set up your money squirrel</h2><p className="mt-1 text-sm text-[#8c7c74]">You can change this later.</p></div>
      <button type="button" onClick={() => setView('profile')} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Cancel</button>
    </div>
    <form onSubmit={saveSetup} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <label className="block text-sm font-bold">Name your pet<input name="petName" required defaultValue={setup.petName} placeholder="Choose a name" maxLength={14} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
      <label className="block text-sm font-bold">Choose a voice<select name="voiceProfile" defaultValue={setup.voiceProfile} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] bg-white px-3 py-3 text-base font-normal"><option value="cute">Cutie: tiny, squeaky cartoon pet</option><option value="warm">Warm and friendly</option><option value="calm">Calm and gentle</option></select></label>
      <div className="flex justify-end"><button type="button" onClick={() => playPetChime(setup.voiceProfile)} className="rounded-xl bg-[#fff8f4] px-4 py-2 text-sm font-bold text-[#473a35] shadow-sm">▶ Hear it</button></div>
      <label className="block text-sm font-bold">Daily spending budget<input name="dailyBudget" type="number" min="0" step="0.01" defaultValue={setup.dailyBudget} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">Biweekly savings goal<input name="savingsGoal" type="number" min="0" step="0.01" defaultValue={setup.savingsGoal} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">Biweekly investing goal<input name="investingGoal" type="number" min="0" step="0.01" defaultValue={setup.investingGoal} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">Payday<input name="payday" type="date" defaultValue={setup.payday} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">End-of-day report<input name="reportTime" type="time" defaultValue={setup.reportTime} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">Emergency fund goal (optional)<input name="emergencyGoal" type="number" min="0" step="0.01" defaultValue={setup.emergencyGoal} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
        <label className="text-sm font-bold">Emergency fund now<input name="emergencyNow" type="number" min="0" step="0.01" defaultValue={setup.emergencyNow} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
      </div>
      <p className="text-xs text-[#8c7c74]">Savings transfers count toward your emergency fund.</p>
      <button type="submit" className="w-full rounded-2xl bg-[#ff795f] px-4 py-3 font-extrabold text-white shadow-sm hover:bg-[#ed6b54]">{setup.petName ? `Save setup & meet ${setup.petName}` : 'Save setup & meet your pet'} 🐿️</button>
    </form>
  </section>;

  return <section className="mx-auto max-w-xl px-3 pb-5 pt-4 text-[#302b29] sm:px-5" aria-label="Pet profile">
    <div className="flex flex-col items-center text-center">
      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8d817a] shadow-sm">{sleeping ? '● Asleep' : '● Awake'}</span>
      <div className={`relative mt-2 rounded-full bg-gradient-to-b from-[#fffaf7] to-[#fff4ee] p-2 ${sleeping ? 'opacity-90' : ''}`}>
        <HardwareSquirrel mood={sleeping ? 'asleep' : withinBudget ? 'happy' : 'worried'} wagging={!sleeping} size="xl" onClick={() => setSleeping(value => !value)} />
        {sleeping && <span className="absolute right-3 top-1 text-xl font-black text-[#d9d0cb]">z</span>}
      </div>
      <h2 className="mt-1 text-2xl font-black text-[#342b28]">{profileName}</h2>
      <p className="text-xs text-[#a18d83]">{sleeping ? 'Tap to wake me up' : 'I’m here with you'}</p>
      <div className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_8px_30px_rgba(93,60,42,.08)]" aria-live="polite">{speechBubble || `Hi! I’m ${profileName}. Let’s take it one step at a time.`}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => { setSleeping(false); setSpeechBubble?.(`You’ve spent ${cad(spentToday)} of your ${cad(budgetTarget)} daily budget.`); }} className="rounded-xl bg-[#ff795f] px-3 py-2 text-xs font-bold text-white">Simulate NFC tap 🐿️</button>
        <button type="button" onClick={() => { setSleeping(false); setSpeechBubble?.(`Today: ${cad(spentToday)} spent. ${withinBudget ? 'Within budget.' : 'Over budget.'}`); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">📈 Daily brief</button>
        <button type="button" onClick={() => { setSleeping(true); setSpeechBubble?.(`${profileName} is resting.`); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Put to sleep</button>
      </div>
      <form onSubmit={sendMessage} className="mt-2 flex w-full gap-2">
        <input value={message} onChange={event => setMessage(event.target.value)} placeholder={`...or message ${profileName}`} aria-label="Message your pet" className="min-w-0 flex-1 rounded-xl border border-[#eadbd3] bg-white px-3 py-2 text-xs" />
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Send</button>
      </form>
    </div>

    <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(93,60,42,.08)]">
      <ProgressRow label="Spent today" current={spentToday} target={budgetTarget} color={withinBudget ? '#e8a18d' : '#d95043'} />
      <ProgressRow label="Saved this period" current={saved} target={Number(setup.savingsGoal) || 0} color="#ed927a" />
      <ProgressRow label="Invested this period" current={invested} target={Number(setup.investingGoal) || 0} color="#b99a79" />
      <p className="pt-1 text-[10px] text-[#887c76]">Period: {periodStart} → {periodEnd} (day {Math.max(1, period.day)} of 14) · Emergency fund {cad(emergencyNow)} / {cad(emergencyGoal)}</p>

      <form onSubmit={saveLog} className="grid grid-cols-[auto_1fr_1.2fr_auto] gap-1.5 pt-1">
        <label className="sr-only" htmlFor="profile-log-kind">Entry type</label><select id="profile-log-kind" value={logKind} onChange={event => setLogKind(event.target.value)} className="min-w-0 rounded-xl border border-[#eadbd3] bg-white px-2 py-2 text-xs"><option value="spent">Spent</option><option value="saved">Saved</option><option value="invested">Invested</option></select>
        <label className="sr-only" htmlFor="profile-log-amount">Amount</label><input id="profile-log-amount" required min="0.01" step="0.01" type="number" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Amount" className="min-w-0 rounded-xl border border-[#eadbd3] px-2 py-2 text-xs" />
        <label className="sr-only" htmlFor="profile-log-description">Description</label><input id="profile-log-description" value={description} onChange={event => setDescription(event.target.value)} placeholder="What on? (optional)" className="min-w-0 rounded-xl border border-[#eadbd3] px-2 py-2 text-xs" />
        <button type="submit" className="rounded-xl bg-white px-2.5 py-2 text-xs font-bold text-[#473a35] shadow-sm">Add</button>
      </form>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <button type="button" onClick={() => setActiveTab('reports')} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">🌙 Daily report</button>
        <button type="button" onClick={() => setGoalsOpen(value => !value)} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">🎯 Goals check</button>
        <button type="button" onClick={() => setView('setup')} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">⚙️ Edit setup</button>
      </div>
      {goalsOpen && <div className="rounded-xl bg-[#fff8f4] p-2.5 text-xs" role="status">Savings: {cad(Number(setup.savingsGoal) || 0)} · Investing: {cad(Number(setup.investingGoal) || 0)} · Emergency fund: {cad(emergencyNow)} / {cad(emergencyGoal)}</div>}
      <details className="pt-0.5 text-[10px] text-[#776b65]"><summary className="cursor-pointer">Today’s log ({logs.filter(item => item.date === today()).length})</summary>
        <div className="mt-2 space-y-1">{logs.filter(item => item.date === today()).length ? logs.filter(item => item.date === today()).map(item => <p key={item.id} className="flex justify-between gap-2"><span>{item.kind}{item.description ? ` · ${item.description}` : ''}</span><strong>{cad(item.amount)}</strong></p>) : <p>No entries yet.</p>}</div>
      </details>
      <details className="text-[10px] text-[#776b65]"><summary className="cursor-pointer">🏦 Bank transactions (Plaid sandbox)</summary><p className="mt-1">Bank feed connection is not set up in this preview.</p></details>
    </div>
  </section>;
}
