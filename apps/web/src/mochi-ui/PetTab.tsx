// @ts-nocheck
import { useEffect, useState } from 'react';
import { HardwareSquirrel } from './HardwareSquirrel';
import { PERSONAS, getPersona, setPersona } from '../voice/personas';
import { getGoals, setGoals } from '../voice/goals';
import { mochiBrain } from '../voice/MochiVoice';
import { twoWeekTotals } from './bankFeed';

const setupKey = 'mochi.profile.setup.v2';
const pad = value => String(value).padStart(2, '0');
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
// Nothing is preset: the budget comes from the backend and the goals from the voice goals store.
const defaultSetup = (petName, dailyLimit) => {
  const goals = getGoals();
  return {
    petName: petName ?? '', voiceProfile: getPersona().id, dailyBudget: dailyLimit ? String(dailyLimit) : '',
    savingsGoal: goals ? String(goals.saveGoal) : '', investingGoal: goals ? String(goals.investGoal) : '',
    payday: today(), reportTime: '19:00', emergencyGoal: '', emergencyNow: '',
  };
};
const LIVE_KEYS = ['petName', 'voiceProfile', 'dailyBudget', 'savingsGoal', 'investingGoal'];
const loadSetup = fallback => {
  try {
    const saved = JSON.parse(localStorage.getItem(setupKey) ?? '{}');
    for (const key of LIVE_KEYS) delete saved[key];
    return { ...fallback, ...saved };
  }
  catch { return fallback; }
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
  const { activeTab, petName, dailySpent, dailyLimit, hasBudget, speechBubble, setPetName, saveDailyBudget, previewVoice, useGoals, bankFeed, squirrel, setActiveTab, setSpeechBubble, showToast } = props;
  const savedName = petName && petName !== 'your squirrel' ? petName : '';
  const fallback = defaultSetup(savedName, dailyLimit);
  const [setup, setSetup] = useState(() => loadSetup(fallback));
  const [view, setView] = useState(() => setup.petName?.trim() ? 'profile' : 'setup');
  const [sleeping, setSleeping] = useState(() => !mochiBrain()?.awake);
  const [voiceChoice, setVoiceChoice] = useState(fallback.voiceProfile);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [message, setMessage] = useState('');
  // Follow the real squirrel: it wakes on an NFC tap and sleeps on "goodbye".
  useEffect(() => {
    const onBrain = event => { if (event.detail?.type === 'awake') setSleeping(!event.detail.awake); };
    window.addEventListener('mochi:brain', onBrain);
    return () => window.removeEventListener('mochi:brain', onBrain);
  }, []);
  if (activeTab !== 'pet') return null;

  const period = periodFor(setup.payday || today());
  // Spending, savings and investing come from the bank feed (Plaid later), never typed in.
  const spentToday = dailySpent;
  const budgetTarget = dailyLimit ?? 0;
  const withinBudget = !hasBudget || spentToday <= budgetTarget;
  const goals = useGoals?.[0] ?? getGoals();
  const { saved, invested } = twoWeekTotals();
  const formatDate = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const periodStart = formatDate(period.start); const periodEnd = formatDate(period.end);
  const emergencyGoal = Number(setup.emergencyGoal) || 0;
  const emergencyNow = Number(setup.emergencyNow) || 0;
  const profileName = setup.petName || petName || 'Your companion';

  const saveSetup = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = Object.fromEntries(Object.keys(fallback).map(key => [key, String(form.get(key) ?? '')]));
    next.petName = next.petName.trim();
    if (!next.petName) { showToast?.('Enter a name for your pet.'); return; }
    setSetup(next); setPetName(next.petName); setPersona(next.voiceProfile);
    const budget = Math.round(Number(next.dailyBudget) * 100) / 100;
    if (budget > 0 && budget !== dailyLimit) void saveDailyBudget?.(budget);
    const saveGoal = Math.round(Number(next.savingsGoal) * 100) / 100, investGoal = Math.round(Number(next.investingGoal) * 100) / 100;
    if (saveGoal > 0 && investGoal > 0) { setGoals({ saveGoal, investGoal }); useGoals?.[1]?.(); }
    const extras = Object.fromEntries(Object.entries(next).filter(([key]) => !LIVE_KEYS.includes(key)));
    try { localStorage.setItem(setupKey, JSON.stringify(extras)); } catch { showToast?.('Setup saved for this visit.'); }
    setView('profile'); showToast?.('Profile updated.');
  };

  const sendMessage = event => {
    event.preventDefault();
    const clean = message.trim(); if (!clean) return;
    setMessage('');
    const brain = mochiBrain();
    if (brain?.awake) void brain.hear(clean);
    else showToast?.(`Tap the NFC chip to wake ${profileName} first.`);
  };

  if (view === 'setup') return <section className="mx-auto max-w-2xl px-4 py-5 text-[#473a35]" aria-labelledby="profile-setup-title">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div><h2 id="profile-setup-title" className="text-xl font-extrabold">🐿️ Set up your money squirrel</h2><p className="mt-1 text-sm text-[#8c7c74]">You can change this later.</p></div>
      <button type="button" onClick={() => setView('profile')} className="rounded-full bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Cancel</button>
    </div>
    <form onSubmit={saveSetup} className="space-y-3 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <label className="block text-sm font-bold">Name your pet<input name="petName" required defaultValue={setup.petName} placeholder="Choose a name" maxLength={14} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
      <label className="block text-sm font-bold">Choose a voice<select name="voiceProfile" value={voiceChoice} onChange={event => setVoiceChoice(event.target.value)} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] bg-white px-3 py-3 text-base font-normal">{PERSONAS.map(v => <option key={v.id} value={v.id}>{v.emoji} {v.name}: {v.desc}</option>)}</select></label>
      <div className="flex justify-end"><button type="button" onClick={() => previewVoice?.(voiceChoice)} className="rounded-xl bg-[#fff8f4] px-4 py-2 text-sm font-bold text-[#473a35] shadow-sm">▶ Hear it</button></div>
      <label className="block text-sm font-bold">Daily spending budget<input name="dailyBudget" type="number" min="0" step="0.01" placeholder="e.g. 45" defaultValue={setup.dailyBudget} className="mt-1 block w-full rounded-2xl border border-[#eadbd3] px-3 py-3 text-base font-normal" /></label>
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
        <HardwareSquirrel mood={sleeping ? 'asleep' : withinBudget ? 'happy' : 'worried'} wagging={!sleeping} size="xl" onClick={() => { if (sleeping) squirrel?.testTap(); }} />
        {sleeping && <span className="absolute right-3 top-1 text-xl font-black text-[#d9d0cb]">z</span>}
      </div>
      <h2 className="mt-1 text-2xl font-black text-[#342b28]">{profileName}</h2>
      <p className="text-xs text-[#a18d83]">{sleeping ? 'Tap to wake me up' : 'I’m here with you'}</p>
      <div className="mt-3 w-full rounded-2xl bg-white px-4 py-3 text-sm shadow-[0_8px_30px_rgba(93,60,42,.08)]" aria-live="polite">{speechBubble || `Hi! I’m ${profileName}. Let’s take it one step at a time.`}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => squirrel?.testTap()} className="rounded-xl bg-[#ff795f] px-3 py-2 text-xs font-bold text-white">Simulate NFC tap 🐿️</button>
        <button type="button" onClick={() => { const brain = mochiBrain(); if (brain?.awake) void brain.dailyCheck(); else setSpeechBubble?.(hasBudget ? `Today: ${cad(spentToday)} spent of ${cad(budgetTarget)}. ${withinBudget ? 'Within budget.' : 'Over budget.'}` : 'Set a daily budget first.'); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">📈 Daily brief</button>
        <button type="button" onClick={() => { const brain = mochiBrain(); if (brain?.awake) void brain.sleep(); else setSpeechBubble?.(`${profileName} is resting.`); }} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Put to sleep</button>
      </div>
      <form onSubmit={sendMessage} className="mt-2 flex w-full gap-2">
        <input value={message} onChange={event => setMessage(event.target.value)} placeholder={`...or message ${profileName}`} aria-label="Message your pet" className="min-w-0 flex-1 rounded-xl border border-[#eadbd3] bg-white px-3 py-2 text-xs" />
        <button type="submit" className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-[#473a35] shadow-sm">Send</button>
      </form>
    </div>

    <div className="mt-3 space-y-2 rounded-2xl bg-white p-3 shadow-[0_8px_30px_rgba(93,60,42,.08)]">
      <ProgressRow label="Spent today" current={spentToday} target={budgetTarget} color={withinBudget ? '#e8a18d' : '#d95043'} />
      <ProgressRow label="Saved this period" current={saved} target={goals?.saveGoal ?? 0} color="#ed927a" />
      <ProgressRow label="Invested this period" current={invested} target={goals?.investGoal ?? 0} color="#b99a79" />
      <p className="pt-1 text-[10px] text-[#887c76]">Period: {periodStart} → {periodEnd} (day {Math.max(1, period.day)} of 14) {emergencyGoal > 0 ? ` · Emergency fund ${cad(emergencyNow)} / ${cad(emergencyGoal)}` : ''}</p>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <button type="button" onClick={() => setActiveTab('reports')} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">🌙 Daily report</button>
        <button type="button" onClick={() => setGoalsOpen(value => !value)} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">🎯 Goals check</button>
        <button type="button" onClick={() => setView('setup')} className="rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-[#473a35] shadow-sm">⚙️ Edit setup</button>
      </div>
      {goalsOpen && <div className="rounded-xl bg-[#fff8f4] p-2.5 text-xs" role="status">Savings: {cad(saved)} / {cad(goals?.saveGoal ?? 0)} · Investing: {cad(invested)} / {cad(goals?.investGoal ?? 0)} · Emergency fund: {cad(emergencyNow)} / {cad(emergencyGoal)}</div>}
      <details className="pt-0.5 text-[10px] text-[#776b65]"><summary className="cursor-pointer">🏦 Today from your bank ({bankFeed?.length ?? 0})</summary>
        <div className="mt-2 space-y-1">{bankFeed?.length ? bankFeed.map(item => <p key={item.id} className="flex justify-between gap-2"><span>{item.name}</span><strong>{cad(item.amount)}</strong></p>) : <p>No purchases yet today.</p>}</div>
        <p className="mt-1 text-[#9a8f88]">Sample bank feed. Plaid will read real transactions once it is approved.</p>
      </details>
    </div>
  </section>;
}
