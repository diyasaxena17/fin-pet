import { DAILY_GOAL_NUTS } from '../lib/progress';
import { CheckIcon, NutIcon, PulseIcon } from './icons';

interface Props {
  petName: string;
  nfcConnected: boolean;
  totalNuts: number;
  dailyNuts: number;
  sproutedCount: number;
  branchCount: number;
  grownPercent: number;
  onOpenPulse: () => void;
}

export function TreeTopBar({ petName, nfcConnected, totalNuts, dailyNuts, sproutedCount, branchCount, grownPercent, onOpenPulse }: Props) {
  const goalMet = dailyNuts >= DAILY_GOAL_NUTS;

  return (
    <header className="px-4 pb-3 pt-4">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#234535] px-3 py-1.5 text-[0.7rem] font-bold text-white">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${nfcConnected ? 'bg-[#6FE08F]' : 'bg-[#9AA79E]'}`} />
          {nfcConnected ? petName ? `NFC Connected • ${petName}` : 'NFC Connected' : petName || 'Your companion'}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenPulse}
            aria-haspopup="dialog"
            className="inline-flex items-center gap-1.5 rounded-full border-0 bg-[#E9E2D2] px-3 py-1.5 text-[0.7rem] font-bold text-[#4B5A4F] shadow-none hover:bg-[#DFD6C2]"
          >
            <PulseIcon className="h-3.5 w-3.5" />
            Daily Pulse
          </button>
          <span
            data-testid="nuts-balance"
            aria-label={`${totalNuts} acorns collected`}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7C777] bg-[#FBEBC4] px-3 py-1.5 text-sm font-extrabold text-[#6B3F12]"
          >
            <NutIcon className="h-4 w-4" />
            {totalNuts}
          </span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.05rem] font-extrabold leading-tight text-[#1F3B2D]">Learning tree</h1>
          <p className="text-xs text-[#5F6E63]">
            <span data-testid="sprouted">{sproutedCount}/{branchCount}</span> Financial Skills Sprouted
          </p>
        </div>
        <div
          className={`flex-none rounded-2xl border px-3 py-1.5 text-center ${
            goalMet ? 'border-[#9CC7A3] bg-[#DCEBD9]' : 'border-[#C9D9C6] bg-[#E6EFE2]'
          }`}
        >
          <p className="text-[0.58rem] font-extrabold uppercase tracking-[0.14em] text-[#4B5A4F]">Daily goal</p>
          <p data-testid="daily-nuts" className="flex items-center justify-center gap-1 text-sm font-extrabold text-[#1F3B2D]">
            {Math.min(dailyNuts, DAILY_GOAL_NUTS)} / {DAILY_GOAL_NUTS}
            <NutIcon className="h-3.5 w-3.5" />
            {goalMet ? <CheckIcon className="h-3.5 w-3.5 text-[#2E7D4F]" aria-label="Goal reached" /> : null}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <p className="flex items-center gap-1.5 text-[#4B5A4F]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#C77D2E]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.2 2.2M15.5 15.5l2.2 2.2M17.7 6.3l-2.2 2.2M8.5 15.5l-2.2 2.2" />
          </svg>
          Tap any glowing branch to learn &amp; collect acorns
        </p>
        <p data-testid="grown" className="font-extrabold text-[#1F3B2D]">{grownPercent}% Grown</p>
      </div>
    </header>
  );
}
