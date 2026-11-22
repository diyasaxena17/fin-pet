// @ts-nocheck
// --- ANIMATED HARDWARE SQUIRREL AVATAR COMPONENT ---
export const HardwareSquirrel = ({ mood = 'happy', wagging = false, size = 'md', onClick }) => {
  // mood: 'happy' | 'alert' | 'worried'
  const scaleClass = size === 'lg' ? 'w-28 h-28' : size === 'sm' ? 'w-14 h-14' : 'w-20 h-20';
  return (
    <button
      onClick={onClick}
      type="button"
      aria-label="Interact with hardware squirrel companion"
      className={`relative select-none transition-transform duration-300 active:scale-95 focus:outline-none ${scaleClass}`}
    >
      <svg viewBox="0 0 140 140" className="w-full h-full overflow-visible drop-shadow-md">
        <defs>
          <linearGradient id="furGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="bellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF3C7" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
          <linearGradient id="tailGrad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="60%" stopColor="#B45309" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Servo-Powered Bushy Tail */}
        <g
          style={{
            transformOrigin: '48px 98px',
            animation: wagging
              ? 'tailWagFast 0.35s ease-in-out infinite alternate'
              : 'tailBreathe 3.2s ease-in-out infinite alternate'
          }}
        >
          <path
            d="M48 102 C12 96, 6 54, 28 34 C44 20, 66 32, 60 54 C56 68, 42 74, 54 90 Z"
            fill="url(#tailGrad)"
          />
          <path
            d="M28 42 C38 34, 50 40, 46 54"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.55"
          />
        </g>

        {/* Body */}
        <ellipse cx="74" cy="92" rx="26" ry="28" fill="url(#furGrad)" />
        {/* Warm Cream Belly */}
        <ellipse cx="81" cy="95" rx="16" ry="20" fill="url(#bellyGrad)" />

        {/* Ears */}
        <ellipse cx="62" cy="34" rx="7" ry="11" transform="rotate(-14 62 34)" fill="#92400E" />
        <ellipse cx="62" cy="35" rx="4" ry="7" transform="rotate(-14 62 35)" fill="#FBBF24" />
        <ellipse cx="88" cy="33" rx="7" ry="11" transform="rotate(14 88 33)" fill="#B45309" />
        <ellipse cx="88" cy="34" rx="4" ry="7" transform="rotate(14 88 34)" fill="#FDE68A" />

        {/* Head */}
        <circle cx="76" cy="56" r="24" fill="url(#furGrad)" />
        {/* Cheeks */}
        <circle cx="62" cy="63" r="6" fill="#F59E0B" opacity="0.45" />
        <circle cx="92" cy="63" r="6" fill="#F59E0B" opacity="0.45" />

        {/* HARDWARE OLED EYE DISPLAY VISOR */}
        <rect
          x="56"
          y="45"
          width="42"
          height="19"
          rx="9.5"
          fill="#1C1917"
          stroke="#44403C"
          strokeWidth="1.5"
        />

        {/* Dynamic Hardware LED Eyes based on Spending State */}
        {mood === 'happy' && (
          <g>
            {/* Happy Celebration Arches (^ ^) */}
            <path
              d="M62 56 Q67 49 72 56"
              fill="none"
              stroke="#34D399"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M82 56 Q87 49 92 56"
              fill="none"
              stroke="#34D399"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </g>
        )}

        {mood === 'alert' && (
          <g>
            {/* NFC Sync Curious Glowing Eyes */}
            <circle cx="67" cy="54.5" r="4.5" fill="#FBBF24" />
            <circle cx="68.5" cy="53" r="1.5" fill="#FFFBEB" />
            <circle cx="87" cy="54.5" r="4.5" fill="#FBBF24" />
            <circle cx="88.5" cy="53" r="1.5" fill="#FFFBEB" />
          </g>
        )}

        {mood === 'worried' && (
          <g>
            {/* Over-Budget Worried Eyes */}
            <path
              d="M61 52 L72 55"
              stroke="#F87171"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="67" cy="57.5" r="2.5" fill="#FCA5A5" />
            <path
              d="M93 52 L82 55"
              stroke="#F87171"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <circle cx="87" cy="57.5" r="2.5" fill="#FCA5A5" />
          </g>
        )}

        {/* Cute Nose & Mouth */}
        <ellipse cx="77" cy="67" rx="3.2" ry="2.2" fill="#451A03" />
        {mood === 'worried' ? (
          <path
            d="M72 73 Q77 69 82 73"
            fill="none"
            stroke="#451A03"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M72 70 Q77 75 82 70"
            fill="none"
            stroke="#451A03"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {/* Paws holding a Golden Acorn */}
        <g
          style={{
            transformOrigin: '80px 92px',
            animation: wagging ? 'acornBounce 0.4s ease-in-out infinite alternate' : 'none'
          }}
        >
          <ellipse cx="82" cy="93" rx="8" ry="10" fill="#F59E0B" stroke="#92400E" strokeWidth="1.5" />
          <path d="M74 88 Q82 82 90 88 Z" fill="#78350F" />
          <line x1="82" y1="84" x2="82" y2="80" stroke="#78350F" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Little Paws */}
        <circle cx="71" cy="92" r="5" fill="#B45309" />
        <circle cx="92" cy="92" r="5" fill="#B45309" />

        {/* Feet */}
        <ellipse cx="66" cy="119" rx="8" ry="4.5" fill="#92400E" />
        <ellipse cx="86" cy="119" rx="8" ry="4.5" fill="#92400E" />
      </svg>
    </button>
  );
};
