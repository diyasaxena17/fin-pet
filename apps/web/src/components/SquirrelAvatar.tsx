import type { PetMood } from '@mochi/contracts';

export function SquirrelAvatar({ name, mood }: { name: string; mood: PetMood }) {
  return <span className={`squirrel-avatar squirrel-avatar--${mood}`} role="img" aria-label={`${name}, feeling ${mood}`}>
    <svg viewBox="0 0 72 72" aria-hidden="true">
      <path d="M51 47c10 0 16-7 13-16-2-7-10-9-15-4 7-13-1-24-11-22-8 2-10 10-5 16-12-4-23 4-22 16 0 13 11 23 25 22 7 0 12-4 15-10Z" className="squirrel-tail" />
      <path d="M22 30 18 17q9 1 13 10m13 1 4-12q8 5 8 15" className="squirrel-ears" />
      <ellipse cx="37" cy="43" rx="20" ry="19" className="squirrel-face" />
      <ellipse cx="38" cy="50" rx="12" ry="9" className="squirrel-muzzle" />
      <path d={mood === 'happy' ? 'M29 39q2-3 4 0m9 0q2-3 4 0' : 'M30 38v2m14-2v2'} className="squirrel-eyes" />
      <path d="M36 47q2-2 4 0m-2 1v2" className="squirrel-mouth" />
      <path d={mood === 'happy' ? 'M33 52q5 5 10 0' : 'M34 54h8'} className="squirrel-mouth" />
    </svg>
  </span>;
}
