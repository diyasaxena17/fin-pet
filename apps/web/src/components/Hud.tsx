import { NutIcon } from './Sheet';
import { useSignals } from '../signals/store';

const dollars = (value: number) => `$${Math.round(value / 100)}`;

/** Compact HUD: level, title, nuts and the daily cap. Every value derives from the signals store. */
export function Hud() {
  const { state, derived: { hud } } = useSignals();
  const cap = hud.capCents; const within = cap === null ? null : hud.todaySpentCents <= cap;
  return <div className="wo-hud">
    <div className="wo-hud-level">
      <span className="wo-lv" aria-label={`Level ${hud.level}`}>Lv.{hud.level}</span>
      <div className="wo-hud-title"><p>Pip’s Winter Oak</p>
        <small className="wo-nuts" aria-label={`${state.nuts} Golden Nuts`}><NutIcon size={14} />{state.nuts}</small></div>
      <div className={`wo-cap ${within === false ? 'wo-cap-over' : ''}`} aria-label={cap === null ? 'No daily cap set' : `Daily cap: ${dollars(hud.todaySpentCents)} of ${dollars(cap)}`}>
        <small>DAILY CAP</small><strong>{cap === null ? 'Not set' : <>{dollars(hud.todaySpentCents)} / {dollars(cap)} {within ? '✓' : '!'}</>}</strong></div>
    </div>
  </div>;
}
