import type { Branch, Quest } from '../types';
import { DAILY_GOAL_NUTS } from '../lib/progress';
import { FlameIcon, NutIcon, TargetIcon } from './icons';
import { PrimaryButton } from './PrimaryButton';
import { Sheet, SheetHeader } from './Sheet';

interface Props {
  streak: number;
  dailyNuts: number;
  next: { branch: Branch; quest: Quest } | null;
  onStartNext: () => void;
  onClose: () => void;
}

export function DailyPulseSheet({ streak, dailyNuts, next, onStartNext, onClose }: Props) {
  const shown = Math.min(dailyNuts, DAILY_GOAL_NUTS);
  const pct = Math.round((shown / DAILY_GOAL_NUTS) * 100);
  return (
    <Sheet label="Daily Pulse" onClose={onClose}>
      <SheetHeader tag="Today" title="Daily Pulse" onClose={onClose} />
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-[#E4DBC8] px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#E4DBC8] bg-[#FFFDF8] p-3">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#6B7A6F]">
              <FlameIcon className="h-3.5 w-3.5 text-[#D2691E]" /> Streak
            </p>
            <p data-testid="pulse-streak" className="mt-1 text-xl font-extrabold text-[#1F3B2D]">
              {streak} <span className="text-xs font-bold text-[#6B7A6F]">{streak === 1 ? 'day' : 'days'}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[#E4DBC8] bg-[#FFFDF8] p-3">
            <p className="flex items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-[#6B7A6F]">
              <TargetIcon className="h-3.5 w-3.5 text-[#2E7D4F]" /> Daily goal
            </p>
            <p className="mt-1 flex items-center gap-1 text-xl font-extrabold text-[#1F3B2D]">
              {shown}/{DAILY_GOAL_NUTS} <NutIcon className="h-4 w-4" />
            </p>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Daily nut goal"
          aria-valuemin={0}
          aria-valuemax={DAILY_GOAL_NUTS}
          aria-valuenow={shown}
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#E4DBC8]"
        >
          <div className="h-full rounded-full bg-[#2E7D4F] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-[#5F6E63]">
          {dailyNuts >= DAILY_GOAL_NUTS
            ? 'Goal reached. Pip is happy, and your streak is safe for today.'
            : `Earn ${DAILY_GOAL_NUTS - shown} more nuts today to hit your goal and keep your streak growing.`}
        </p>
        <div className="mt-5 rounded-2xl bg-[#EFE9DC] p-4">
          <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#8A4B1F]">Up next</p>
          {next ? (
            <>
              <p className="mt-1 text-sm font-extrabold text-[#1F3B2D]">{next.quest.title}</p>
              <p className="text-xs text-[#5F6E63]">{next.branch.title} · {next.quest.minutes} min · +{next.quest.nuts} nuts</p>
            </>
          ) : (
            <p className="mt-1 text-sm font-bold text-[#1F3B2D]">Nothing left to unlock right now. Earn more nuts to reveal the next branch.</p>
          )}
        </div>
      </div>
      <div className="grid gap-3 border-t border-[#E4DBC8] px-5 py-4">
        {next ? <PrimaryButton onClick={onStartNext}>Start this lesson</PrimaryButton> : null}
        <PrimaryButton tone="soft" onClick={onClose}>Close</PrimaryButton>
      </div>
    </Sheet>
  );
}
