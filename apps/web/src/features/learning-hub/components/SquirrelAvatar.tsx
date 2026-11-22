/**
 * Self-contained squirrel mascot (inline colours, no external CSS or shared types).
 * Bare SVG: size and position it from the outside with className.
 */
export function SquirrelAvatar({ className = '', label = 'Pip the squirrel' }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 64 60" role="img" aria-label={label} className={className} overflow="visible">
      {/* bushy tail */}
      <path d="M38 48C58 50 62 22 47 9C45 19 37 22 35 32Z" fill="#c96f2d" stroke="#8a4b1f" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M47 41C55 36 55 26 48 19" fill="none" stroke="#efb27a" strokeWidth="3" strokeLinecap="round" />
      {/* ears */}
      <path d="M14 25Q10 10 15 8Q22 11 24 19Z" fill="#d98b4a" stroke="#8a4b1f" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M32 19Q35 11 41 8Q46 10 42 25Z" fill="#d98b4a" stroke="#8a4b1f" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 21Q14 14 16 12Q20 14 21 19Z" fill="#f4b6a6" />
      <path d="M35 19Q37 14 40 12Q43 15 40 21Z" fill="#f4b6a6" />
      {/* head */}
      <circle cx="28" cy="34" r="17" fill="#d98b4a" stroke="#8a4b1f" strokeWidth="1.8" />
      <ellipse cx="28" cy="40" rx="9.5" ry="7" fill="#fbe7cf" />
      <path d="M19 32q2.5-3 5 0M32 32q2.5-3 5 0" fill="none" stroke="#49352b" strokeWidth="2" strokeLinecap="round" />
      <circle cx="17" cy="38" r="2.2" fill="#e89196" opacity=".7" />
      <circle cx="39" cy="38" r="2.2" fill="#e89196" opacity=".7" />
      <ellipse cx="28" cy="37.5" rx="2.2" ry="1.6" fill="#5a3420" />
      <path d="M28 39v2M24.5 41.5q3.5 3.5 7 0" fill="none" stroke="#49352b" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="26.6" y="43" width="2.8" height="3" rx=".8" fill="#fff" stroke="#49352b" strokeWidth=".8" />
      {/* acorn: saving nuts for winter */}
      <ellipse cx="11" cy="51" rx="5" ry="5.8" fill="#b9783c" stroke="#7a4a22" strokeWidth="1.4" />
      <path d="M5.5 48.5Q11 42 16.5 48.5Z" fill="#7a4a22" />
      <path d="M11 43.5v-2.5" stroke="#7a4a22" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
