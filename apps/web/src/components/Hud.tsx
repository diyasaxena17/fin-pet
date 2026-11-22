import { NutIcon } from './Sheet';
import { SPROUT_LABELS, useSignals } from '../signals/store';

const dollars = (value: number) => `$${Math.round(value / 100)}`;

/** Top HUD: status strip, level row with daily cap, and growth bar. Every value derives from the signals store. */
export function Hud() {
  const { derived: { hud } } = useSignals();
  const { state } = useSignals();
  const cap = hud.capCents; const within = cap === null ? null : hud.todaySpentCents <= cap;
  return <div className="wo-hud">
    <div className="wo-hud-strip">
      <span className="wo-status"><i aria-hidden="true" />Mock bank feed · Pip</span>
      <span className="wo-hud-right"><span className="wo-nuts" aria-label={`${state.nuts} Golden Nuts`}><NutIcon size={18} />{state.nuts}</span></span>
    </div>
    <div className="wo-hud-level">
      <span className="wo-lv" aria-label={`Level ${hud.level}`}>Lv.{hud.level}</span>
      <div className="wo-hud-title"><p>Pip’s Winter Oak</p><small>{hud.sproutedCount}/{SPROUT_LABELS.length} Behaviour Skills Sprouted</small></div>
      <div className={`wo-cap ${within === false ? 'wo-cap-over' : ''}`} aria-label={cap === null ? 'No daily cap set' : `Daily cap: ${dollars(hud.todaySpentCents)} of ${dollars(cap)}`}>
        <small>DAILY CAP</small><strong>{cap === null ? 'Not set' : <>{dollars(hud.todaySpentCents)} / {dollars(cap)} {within ? '✓' : '!'}</>}</strong></div>
    </div>
    <div className="wo-hud-grow"><span><span aria-hidden="true">✧</span> Open a signal, reflect, earn Nuts</span><strong>{hud.growthPercent}% Grown</strong></div>
    <div className="wo-grow-track" role="progressbar" aria-label="Forest growth" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.growthPercent}><span style={{ width: `${hud.growthPercent}%` }} /></div>
  </div>;
}
