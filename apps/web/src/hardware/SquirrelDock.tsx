import { useState } from 'react';
import { useSquirrel } from './SquirrelProvider';
import { tapLink } from './tapRelay';

const statusText = { unsupported: 'Needs Chrome or Edge', disconnected: 'Not connected', connecting: 'Connecting…', connected: 'Connected' } as const;

/** Floating control for the physical squirrel: connect over USB, NFC tap link, wake/sleep, mood tests. */
export function SquirrelDock() {
  const squirrel = useSquirrel();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [codeError, setCodeError] = useState('');
  if (!squirrel) return null;
  const { status, awake, tapCode, tapStatus, message } = squirrel;
  const connected = status === 'connected';
  const dot = connected ? (awake ? 'squirrel-dot--awake' : 'squirrel-dot--asleep') : status === 'connecting' ? 'squirrel-dot--busy' : 'squirrel-dot--off';
  const summary = connected ? (awake ? 'Awake' : 'Asleep') : statusText[status];
  const link = tapLink(tapCode);

  return <aside className="squirrel-dock" aria-label="Squirrel hardware">
    {open && <section className="squirrel-panel" id="squirrel-panel">
      <div className="squirrel-panel__head">
        <div><p className="eyebrow">PHYSICAL SQUIRREL</p><strong>{statusText[status]}{connected ? ` · ${awake ? 'awake' : 'asleep'}` : ''}</strong></div>
        <button type="button" className="button--quiet squirrel-close" aria-label="Close squirrel controls" onClick={() => setOpen(false)}>✕</button>
      </div>

      {status === 'unsupported'
        ? <p className="supporting-copy">Open this app in <strong>Chrome or Edge on a computer</strong> with the squirrel plugged in by USB.</p>
        : connected
          ? <div className="squirrel-row">
              {awake
                ? <button type="button" onClick={squirrel.sleep}>Goodbye (sleep)</button>
                : <button type="button" onClick={() => squirrel.wake('Woken from the app')}>Wake up</button>}
              <button type="button" className="button--quiet" onClick={() => void squirrel.disconnect()}>Disconnect</button>
            </div>
          : <button type="button" className="squirrel-wide" disabled={status === 'connecting'} onClick={() => void squirrel.connect()}>
              {status === 'connecting' ? 'Connecting…' : 'Connect squirrel (USB)'}
            </button>}

      {connected && <div className="squirrel-moods" role="group" aria-label="Test squirrel moods">
        <button type="button" className="button--quiet" onClick={() => squirrel.play('p')}>Happy</button>
        <button type="button" className="button--quiet" onClick={() => squirrel.play('w')}>Worried</button>
        <button type="button" className="button--quiet" onClick={() => squirrel.play('d')}>Sad</button>
        <button type="button" className="button--quiet" onClick={() => squirrel.play('t')}>Talk</button>
      </div>}

      {message && <p className="squirrel-message" role="status">{message}</p>}

      <div className="squirrel-nfc">
        <p className="eyebrow">NFC WAKE-UP · {tapStatus === 'listening' ? 'READY' : tapStatus === 'reconnecting' ? 'RECONNECTING' : 'STARTING'}</p>
        <p className="supporting-copy">In your phone’s NFC automation (iPhone Shortcuts: “Get Contents of URL”), use this link. Tapping the chip wakes the squirrel.</p>
        <div className="squirrel-row">
          <input readOnly aria-label="NFC tap link" value={link} onFocus={event => event.currentTarget.select()} />
          <button type="button" className="button--quiet" onClick={() => { void navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <div className="squirrel-row">
          <button type="button" className="button--quiet" onClick={() => { void fetch(link).catch(() => undefined); }}>Send a test tap</button>
          <button type="button" className="button--quiet" onClick={squirrel.newTapCode}>New link</button>
        </div>
        <details className="squirrel-code">
          <summary>Already set up a tap link? Use its code</summary>
          <form className="squirrel-row" onSubmit={event => { event.preventDefault(); const ok = squirrel.setTapCode(codeDraft); setCodeError(ok ? '' : 'Use the part after ntfy.sh/ (6–64 letters, numbers, - or _).'); if (ok) setCodeDraft(''); }}>
            <input aria-label="Tap code" placeholder="mochi-xxxxxxxxxxxx" value={codeDraft} onChange={event => setCodeDraft(event.target.value)} />
            <button type="submit" className="button--quiet">Use</button>
          </form>
          {codeError && <p className="squirrel-error">{codeError}</p>}
        </details>
      </div>
    </section>}

    <button type="button" className="squirrel-pill" aria-expanded={open} aria-controls="squirrel-panel" onClick={() => setOpen(value => !value)}>
      <span className={`squirrel-dot ${dot}`} aria-hidden="true" />
      <span aria-hidden="true">🐿️</span> Squirrel · {summary}
    </button>
  </aside>;
}
