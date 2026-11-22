import { NutIcon } from './Sheet';
import { SPROUT_LABELS, useSignals } from '../signals/store';

const dollars = (value: number) => `$${Math.round(value / 100)}`;

function savedPetName() {
  try {
    const setup = JSON.parse(window.localStorage.getItem('mochi.profile.setup.v2') ?? '{}');
    return typeof setup.petName === 'string' ? setup.petName.trim() : '';
  } catch { return ''; }
}

/** Top HUD: acorn collection, daily cap, and tree growth. */
export function Hud() {
  const { derived: { hud } } = useSignals();
  const { state } = useSignals();
  const petName = savedPetName();
  const cap = hud.capCents; const within = cap === null ? null : hud.todaySpentCents <= cap;
  return <div className="wo-hud">
    <div className="wo-hud-strip">
      <span className="wo-status"><i aria-hidden="true" />Mock bank feed{petName ? ` · ${petName}` : ''}</span>
      <span className="wo-hud-right"><span className="wo-nuts" aria-label={`${state.nuts} acorns collected`}><NutIcon size={18} />{state.nuts} acorns</span></span>
    </div>
    <div className="wo-hud-progress">
      <div className="wo-hud-title"><p>Learning tree</p><small>{hud.sproutedCount}/{SPROUT_LABELS.length} Behaviour Skills Sprouted</small></div>
      <div className={`wo-cap ${within === false ? 'wo-cap-over' : ''}`} aria-label={cap === null ? 'No daily cap set' : `Daily cap: ${dollars(hud.todaySpentCents)} of ${dollars(cap)}`}>
        <small>DAILY CAP</small><strong>{cap === null ? 'Not set' : <>{dollars(hud.todaySpentCents)} / {dollars(cap)} {within ? '✓' : '!'}</>}</strong></div>
    </div>
    <div className="wo-hud-grow"><span><span aria-hidden="true">✧</span> Collect acorns and grow your tree</span><strong>{hud.growthPercent}% Grown</strong></div>
    <div className="wo-grow-track" role="progressbar" aria-label="Forest growth" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.growthPercent}><span style={{ width: `${hud.growthPercent}%` }} /></div>
  </div>;
}
