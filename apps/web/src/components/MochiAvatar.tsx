import type { Level, PetMood } from '@mochi/contracts';

export function MochiAvatar({ mood, level }: { mood: PetMood; level: Level }) {
  return <span className={`mochi-avatar mochi-avatar--${mood}`} role="img" aria-label={`${mood} Mochi, level ${level}`}>
    <svg viewBox="0 0 60 60" aria-hidden="true">
      <path d="M12 22C5 11 15 5 23 15M37 15C45 5 55 11 48 22" className="mochi-ear" />
      <circle cx="30" cy="32" r="22" className="mochi-face" />
      <path d={mood === 'happy' ? 'M20 30q2-3 4 0m12 0q2-3 4 0' : 'M22 29v2m16-2v2'} className="mochi-eyes" />
      <ellipse cx="30" cy="36" rx="8" ry="6" className="mochi-muzzle" />
      <path d="M28 34q2-2 4 0m-2 1v2" className="mochi-mouth" />
      <path d={mood === 'happy' ? 'M25 37q5 6 10 0' : 'M26 39h8'} className="mochi-mouth" />
      {mood === 'happy' ? <><circle cx="17" cy="36" r="2" className="mochi-cheek" /><circle cx="43" cy="36" r="2" className="mochi-cheek" /></> : null}
      {level >= 2 ? <g className="mochi-cap"><path d="M14 21q16-12 32 0l-2 5q-15-5-29 1Z" /><path d="M24 17q0-5 6-5t6 5" /></g> : null}
      {level >= 3 ? <g className="mochi-glasses"><circle cx="22" cy="30" r="6" /><circle cx="38" cy="30" r="6" /><path d="M28 30h4M16 29l-3-1m31 1 3-1" /></g> : null}
    </svg>
  </span>;
}
