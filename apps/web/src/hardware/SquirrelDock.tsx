import { useState } from 'react';
import { SquirrelControls, squirrelStatusText } from './SquirrelControls';
import { useSquirrel } from './SquirrelProvider';

/** Floating control for the physical squirrel, available on every screen. */
export function SquirrelDock() {
  const squirrel = useSquirrel();
  const [open, setOpen] = useState(false);
  if (!squirrel) return null;
  const { status, awake } = squirrel;
  const connected = status === 'connected';
  const dot = connected ? (awake ? 'squirrel-dot--awake' : 'squirrel-dot--asleep') : status === 'connecting' ? 'squirrel-dot--busy' : 'squirrel-dot--off';
  const summary = connected ? (awake ? 'Awake' : 'Asleep') : squirrelStatusText[status];

  return <aside className="squirrel-dock" aria-label="Squirrel hardware">
    {open && <section className="squirrel-panel" id="squirrel-panel">
      <div className="squirrel-panel__head">
        <SquirrelControlsTitle />
        <button type="button" className="button--quiet squirrel-close" aria-label="Close squirrel controls" onClick={() => setOpen(false)}>✕</button>
      </div>
      <SquirrelControls showTitle={false} />
    </section>}
    <button type="button" className="squirrel-pill" aria-expanded={open} aria-controls="squirrel-panel" onClick={() => setOpen(value => !value)}>
      <span className={`squirrel-dot ${dot}`} aria-hidden="true" />
      <span aria-hidden="true">🐿️</span> Squirrel · {summary}
    </button>
  </aside>;
}

function SquirrelControlsTitle() {
  const squirrel = useSquirrel();
  if (!squirrel) return null;
  const connected = squirrel.status === 'connected';
  return <div><p className="eyebrow">PHYSICAL SQUIRREL</p><strong className="squirrel-title">{squirrelStatusText[squirrel.status]}{connected ? ` · ${squirrel.awake ? 'awake' : 'asleep'}` : ''}</strong></div>;
}
