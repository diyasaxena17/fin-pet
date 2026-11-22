import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { preferencesInputSchema, type Preferences } from '@mochi/contracts';
import { PageShell } from '../components/PageShell';
import { api } from '../lib/api';
import { useAppState } from '../lib/appState';

const tones = {
  cute: { label: 'Cute', description: 'Bright and lively', pitch: 1.35, rate: 1.05 },
  calm: { label: 'Calm', description: 'Gentle and unhurried', pitch: 0.9, rate: 0.85 },
} as const;

export function Settings() {
  const { state } = useAppState();
  if (!state?.initialized) return <Navigate to="/onboarding" replace />;
  return <SettingsForm savedName={state.pet.name} savedVoice={state.preferences.voice} />;
}

function SettingsForm({ savedName, savedVoice }: { savedName: string; savedVoice: Preferences['voice'] }) {
  const { busy, mutate } = useAppState();
  const [petName, setPetName] = useState(savedName);
  const [voice, setVoice] = useState(savedVoice);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [previewStatus, setPreviewStatus] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const generation = useRef(0);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supported = typeof window.speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  const cancelPreview = useCallback(() => {
    generation.current++;
    if (previewTimer.current !== null) clearTimeout(previewTimer.current);
    previewTimer.current = null;
    if (typeof window.speechSynthesis !== 'undefined') window.speechSynthesis.cancel();
  }, []);
  useEffect(() => cancelPreview, [cancelPreview]);
  const stopPreview = () => {
    cancelPreview(); setPreviewing(false); setPreviewStatus('');
  };
  const preview = () => {
    stopPreview();
    if (!supported) return;
    const current = generation.current;
    const finish = (message: string) => {
      if (generation.current !== current) return;
      if (previewTimer.current !== null) clearTimeout(previewTimer.current);
      previewTimer.current = null;
      setPreviewing(false); setPreviewStatus(message);
    };
    try {
      const speech = new SpeechSynthesisUtterance('Hi! Small steps count. Let’s grow together.');
      speech.lang = 'en-CA'; speech.pitch = tones[voice].pitch; speech.rate = tones[voice].rate;
      const localVoice = window.speechSynthesis.getVoices().find((item) => item.localService && item.lang.startsWith('en'));
      if (localVoice) speech.voice = localVoice;
      speech.onstart = () => { if (generation.current === current) setPreviewStatus(`Playing the ${voice} voice preview.`); };
      speech.onend = () => finish('Preview finished.');
      speech.onerror = () => finish('The preview could not play. You can still save this voice.');
      setPreviewing(true); setPreviewStatus('Preparing voice preview…');
      previewTimer.current = setTimeout(() => {
        if (generation.current !== current) return;
        cancelPreview(); setPreviewing(false);
        setPreviewStatus('The preview is unavailable right now. You can still save this voice.');
      }, 15_000);
      window.speechSynthesis.speak(speech);
    } catch {
      cancelPreview(); setPreviewing(false);
      setPreviewStatus('The preview is unavailable right now. You can still save this voice.');
    }
  };

  return <PageShell title="Your squirrel, your style">
    <p className="mb-6">Choose a name for your companion and the kind of voice you’d like to hear.</p>
    <form className="space-y-6" onSubmit={async (event) => {
      event.preventDefault(); setSaved(false); setError(''); stopPreview();
      const parsed = preferencesInputSchema.safeParse({ petName, voice });
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check your name and voice choice.'); return; }
      if (await mutate(`preferences:${JSON.stringify(parsed.data)}`, async () => {
        const next = await api.updatePreferences(parsed.data);
        setPetName(next.pet.name); setVoice(next.preferences.voice);
        return next;
      })) setSaved(true);
    }}>
      <label>Squirrel name
        <input name="petName" required maxLength={200} autoComplete="off" value={petName} disabled={busy}
          aria-describedby="name-help" onChange={(event) => { setPetName(event.target.value); setSaved(false); setError(''); }} />
      </label>
      <p id="name-help" className="text-sm">Make it yours. You can change this any time.</p>
      <fieldset disabled={busy}>
        <legend className="mb-3 font-bold text-slate-900">Voice</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(tones) as Preferences['voice'][]).map((choice) => <label key={choice}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 ${voice === choice ? 'border-violet-500 bg-violet-50' : 'border-violet-100'}`}>
            <input className="m-0 h-4 w-4 shrink-0 p-0 accent-violet-600 shadow-none" type="radio" name="voice" value={choice}
              checked={voice === choice} onChange={() => { stopPreview(); setVoice(choice); setSaved(false); }} />
            <span><span className="block font-bold text-slate-900">{tones[choice].label}</span><span className="block text-sm font-normal">{tones[choice].description}</span></span>
          </label>)}
        </div>
      </fieldset>
      <div>
        {supported ? <button type="button" className="secondary-button" disabled={busy} onClick={previewing ? stopPreview : preview}>
          {previewing ? 'Stop preview' : `Preview ${voice} voice`}
        </button> : <p className="text-sm">Voice preview is unavailable in this browser. You can still choose and save a voice.</p>}
        {previewStatus ? <p role="status" className="mt-2 text-sm">{previewStatus}</p> : null}
        <p className="mt-2 text-sm">Previews use the voices available in your browser.</p>
      </div>
      {error ? <p role="alert" className="text-rose-800">{error}</p> : null}
      {saved ? <p role="status" className="font-semibold text-emerald-800">Your name and voice are saved.</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy}>{busy ? 'Saving preferences…' : 'Save preferences'}</button>
        <button type="button" className="secondary-button" disabled={busy} onClick={() => {
          stopPreview(); setPetName(savedName); setVoice(savedVoice); setError(''); setSaved(false);
        }}>Reset changes</button>
      </div>
    </form>
    <Link className="mt-6 inline-block font-semibold text-violet-700" to="/?legacy=1">Back to dashboard</Link>
  </PageShell>;
}
