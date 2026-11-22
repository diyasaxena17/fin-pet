import type { Branch, BranchState, LearningProgress } from '../types';
import { branchProgress, branchState } from '../lib/tree';
import { CheckIcon, LockIcon, NutIcon, TopicIcon } from './icons';
import { SquirrelAvatar } from './SquirrelAvatar';

interface Props {
  branches: Branch[];
  progress: LearningProgress;
  /** Locked branch whose "Unlock: N nuts" tooltip is showing. */
  tooltipBranchId: string | null;
  onSelect: (branch: Branch, state: BranchState) => void;
  onDismissTooltip: () => void;
}

const nodeStyles: Record<BranchState, string> = {
  available: 'border-[#E9B24E] bg-[#FFF3CF] text-[#234535] shadow-[0_0_0_6px_rgba(250,204,90,0.28),0_0_26px_rgba(250,204,90,0.85)]',
  growing: 'border-[#E9B24E] bg-[#FFF3CF] text-[#234535] shadow-[0_0_0_6px_rgba(250,204,90,0.28),0_0_26px_rgba(250,204,90,0.85)]',
  sprouted: 'border-[#A9D8B8] bg-[#2E7D4F] text-white shadow-[0_4px_10px_rgba(20,60,35,0.35)]',
  locked: 'border-[#7C8B80] bg-[#46564C] text-[#D8DDD2] shadow-[0_4px_10px_rgba(20,40,30,0.3)]',
};

function describe(branch: Branch, state: BranchState, done: number, total: number): string {
  if (state === 'locked') return `${branch.title}, locked, unlocks at ${branch.unlockCost} Golden Nuts`;
  if (state === 'sprouted') return `${branch.title}, sprouted, all ${total} lessons complete`;
  return `${branch.title}, ${done} of ${total} lessons complete`;
}

export function TreeScene({ branches, progress, tooltipBranchId, onSelect, onDismissTooltip }: Props) {
  const tooltipBranch = branches.find((b) => b.id === tooltipBranchId) ?? null;

  return (
    <div className="px-4 pb-2">
      <div
        className="relative aspect-[360/430] w-full overflow-hidden rounded-[1.75rem] border border-[#DCD3BE] bg-[radial-gradient(ellipse_at_50%_22%,#FFF1C9_0%,#F4ECD7_46%,#E8E2CF_100%)]"
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') onDismissTooltip();
        }}
      >
        <svg viewBox="0 0 360 430" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <radialGradient id="lh-glow" cx="50%" cy="38%" r="60%">
              <stop offset="0" stopColor="#FFE9A8" stopOpacity=".95" />
              <stop offset="1" stopColor="#FFE9A8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="lh-canopy" cx="50%" cy="35%" r="70%">
              <stop offset="0" stopColor="#3F7B59" />
              <stop offset="1" stopColor="#24513A" />
            </radialGradient>
          </defs>
          <ellipse cx="180" cy="150" rx="196" ry="176" fill="url(#lh-glow)" />
          {/* ground + snow */}
          <ellipse cx="180" cy="421" rx="160" ry="15" fill="#DDD6C0" />
          <ellipse cx="180" cy="415" rx="128" ry="10" fill="#F8F6EE" />
          {/* trunk */}
          <path d="M156 426C165 386 170 346 167 296L193 296C190 346 195 386 204 426Z" fill="#6B4A32" />
          <path d="M175 420C178 380 177 340 176 300" stroke="#8A6240" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".6" />
          {/* canopy */}
          <circle cx="92" cy="218" r="72" fill="url(#lh-canopy)" />
          <circle cx="268" cy="218" r="72" fill="url(#lh-canopy)" />
          <circle cx="180" cy="195" r="118" fill="url(#lh-canopy)" />
          <circle cx="130" cy="120" r="66" fill="url(#lh-canopy)" />
          <circle cx="230" cy="120" r="66" fill="url(#lh-canopy)" />
          <circle cx="180" cy="80" r="58" fill="url(#lh-canopy)" />
          <circle cx="150" cy="170" r="38" fill="#6FAE86" opacity=".18" />
          <circle cx="215" cy="215" r="44" fill="#6FAE86" opacity=".14" />
          <circle cx="120" cy="250" r="30" fill="#6FAE86" opacity=".14" />
          {/* snow caps */}
          <ellipse cx="180" cy="27" rx="36" ry="9" fill="#FBFAF4" opacity=".95" />
          <ellipse cx="128" cy="62" rx="26" ry="7" fill="#FBFAF4" opacity=".9" />
          <ellipse cx="232" cy="62" rx="26" ry="7" fill="#FBFAF4" opacity=".9" />
          {/* stems */}
          {branches.map((b) => {
            const state = branchState(b, progress);
            const [fx, fy] = b.stem.from;
            const [cx, cy] = b.stem.ctrl;
            const nx = (b.pos.x / 100) * 360;
            const ny = (b.pos.y / 100) * 430;
            return (
              <path
                key={b.id}
                d={`M${fx} ${fy} Q${cx} ${cy} ${nx} ${ny}`}
                fill="none"
                stroke={state === 'locked' ? '#B5A68C' : '#8A6240'}
                strokeWidth={state === 'locked' ? 3 : 5}
                strokeLinecap="round"
                strokeDasharray={state === 'locked' ? '2 7' : undefined}
              />
            );
          })}
          {/* fireflies */}
          <g fill="#F2B84B">
            <circle cx="40" cy="120" r="2.2" className="animate-pulse" />
            <circle cx="322" cy="150" r="2" className="animate-pulse" />
            <circle cx="30" cy="260" r="1.8" className="animate-pulse" />
            <circle cx="334" cy="270" r="2.2" className="animate-pulse" />
            <circle cx="215" cy="30" r="1.8" className="animate-pulse" />
          </g>
        </svg>

        <SquirrelAvatar className="pointer-events-none absolute bottom-[2.5%] left-[34%] w-[15%]" />

        {branches.map((branch) => {
          const state = branchState(branch, progress);
          const { done, total } = branchProgress(branch, progress.completedQuestIds);
          const active = state === 'available' || state === 'growing';
          return (
            <div
              key={branch.id}
              className="absolute z-10 flex w-[5.4rem] -translate-x-1/2 -translate-y-7 flex-col items-center"
              style={{ left: `${branch.pos.x}%`, top: `${branch.pos.y}%` }}
            >
              <button
                type="button"
                data-testid={`node-${branch.id}`}
                data-state={state}
                aria-label={describe(branch, state, done, total)}
                onClick={() => onSelect(branch, state)}
                className={`relative grid h-14 w-14 place-items-center rounded-full border-4 p-0 transition hover:scale-105 active:scale-95 ${nodeStyles[state]}`}
              >
                {active ? (
                  <span aria-hidden="true" className="absolute inset-0 rounded-full border-2 border-[#F2C25B] motion-safe:animate-ping" />
                ) : null}
                {state === 'locked' ? (
                  <LockIcon className="h-6 w-6" />
                ) : state === 'sprouted' ? (
                  <CheckIcon className="h-6 w-6" />
                ) : (
                  <TopicIcon name={branch.icon} className="h-6 w-6" />
                )}
                {state === 'growing' ? (
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-[#C77D2E] px-1.5 text-[0.6rem] font-extrabold leading-4 text-white">
                    {done}/{total}
                  </span>
                ) : null}
              </button>
              <span
                aria-hidden="true"
                className="mt-1.5 rounded-full bg-[#F7F2E8]/90 px-2 py-0.5 text-center text-[0.6rem] font-extrabold leading-tight text-[#1F3B2D] shadow-sm"
              >
                {branch.title}
              </span>
            </div>
          );
        })}

        {tooltipBranch ? (
          <div
            role="status"
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+2.6rem)] rounded-2xl border border-[#D8CFBA] bg-[#F7F2E8]/95 px-3 py-2 shadow-lg"
            style={{ left: `${Math.min(Math.max(tooltipBranch.pos.x, 26), 74)}%`, top: `${tooltipBranch.pos.y}%` }}
          >
            <p className="max-w-[10.5rem] truncate text-xs font-extrabold text-[#1F3B2D]">{tooltipBranch.title}</p>
            <p className="flex items-center gap-1 text-[0.7rem] font-bold text-[#6B3F12]">
              Unlock: {tooltipBranch.unlockCost} <NutIcon className="h-3.5 w-3.5" />
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
