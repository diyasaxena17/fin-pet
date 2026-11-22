import { useState } from 'react';
import { useSquirrel } from './SquirrelProvider';
import { tapLink } from './tapRelay';

export const squirrelStatusText = { unsupported: 'Needs Chrome or Edge', disconnected: 'Not connected', connecting: 'Connecting…', connected: 'Connected' } as const;

/** Connect / wake / sleep / mood tests / NFC tap link for the physical squirrel. Used by the dock and the Pet tab. */
export function SquirrelControls({ showTitle = true }: { showTitle?: boolean }) {
  const squirrel = useSquirrel();
  const [copied, setCopied] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [codeError, setCodeError] = useState('');
  if (!squirrel) return null;
  const { status, awake, tapCode, tapStatus, message } = squirrel;
  const connected = status === 'connected';
  const link = tapLink(tapCode);

  return <div className="squirrel-controls">
    {showTitle && <div><p className="eyebrow">PHYSICAL SQUIRREL</p><strong className="squirrel-title">{squirrelStatusText[status]}{connected ? ` · ${awake ? 'awake' : 'asleep'}` : ''}</strong></div>}

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
  </div>;
}
