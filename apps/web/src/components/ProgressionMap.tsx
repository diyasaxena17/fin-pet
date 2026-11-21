import type { InitializedAppState } from '@mochi/contracts';
import { PageShell } from './PageShell';

interface LevelCard {
  level: number;
  name: string;
  summary: string;
  activeFeature: string;
  note?: string;
}

const levels: LevelCard[] = [
  {
    level: 1,
    name: 'The Hatchling',
    summary: 'Start with mindful choices, your first savings goal, and caring for Mochi.',
    activeFeature: 'Goal tracker · purchase choices · in-app feeding',
  },
  {
    level: 2,
    name: 'The Explorer',
    summary: 'Build a gentle routine with one daily financial quest and a streak tracker.',
    activeFeature: 'Unlocks at 100 XP · daily quests and streaks',
  },
  {
    level: 3,
    name: 'The Planner',
    summary: 'Explore weekly or monthly contributions across a longer horizon.',
    activeFeature: 'Unlocks at 250 XP · expanded Future Me simulator',
    note: 'Budget building and spending insights are planned for a later release.',
  },
  {
    level: 4,
    name: 'The Dreamer',
    summary: 'A richer Future Me Time Machine for exploring different paths over time.',
    activeFeature: 'Roadmap idea · no additional unlock in this demo',
    note: 'The current demo exposes its expanded simulator at Level 3 to match the API.',
  },
  {
    level: 5,
    name: 'The Investor',
    summary: 'Short, optional lessons on growth, risk, registered accounts, and retirement.',
    activeFeature: 'Roadmap idea · bite-sized lessons and quizzes',
  },
  {
    level: 6,
    name: 'The Future Guardian',
    summary: 'Break longer-term goals into manageable milestones and review them over time.',
    activeFeature: 'Roadmap idea · long-term financial roadmap',
  },
];

function StreakMountain({ days, completedToday }: { days: number; completedToday: boolean }) {
  const revealedPieces = Math.min(6, Math.max(0, days));
  return <div className="mountain-panel">
    <div className="mb-3 flex items-end justify-between gap-3">
      <div><p className="eyebrow">YOUR STREAK PUZZLE</p><p className="font-semibold text-slate-900">{days} {days === 1 ? 'day' : 'days'} in a row</p></div>
      <p className="text-right text-xs">{completedToday ? 'A little sugar sparkle for showing up today ✦' : 'Keep a daily quest streak to reveal pieces'}</p>
    </div>
    <svg className={`streak-mountain${completedToday ? ' streak-mountain--sparkle' : ''}`} viewBox="0 0 360 200" role="img" aria-labelledby="mountain-title mountain-description">
      <title id="mountain-title">Mochi’s streak mountain</title>
      <desc id="mountain-description">{revealedPieces} of 6 mountain puzzle pieces revealed from a {days}-day streak. Pieces follow the current streak and may close when the streak ends.</desc>
      <defs><clipPath id="mountain-shape"><path d="M16 184 106 84l54 54L246 30l98 154Z" /></clipPath></defs>
      <g clipPath="url(#mountain-shape)">
        <rect width="360" height="200" fill="#eee8f5" />
        <path d="M0 150h100v50H0z" className={revealedPieces >= 1 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M100 100h100v50H100z" className={revealedPieces >= 2 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M200 100h100v50H200z" className={revealedPieces >= 3 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M0 100h100v50H0z" className={revealedPieces >= 4 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M100 50h100v50H100z" className={revealedPieces >= 5 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M200 0h100v100H200z" className={revealedPieces >= 6 ? 'mountain-piece is-revealed' : 'mountain-piece'} />
        <path d="M0 100h360M0 150h360M100 0v200M200 0v200M300 0v200" className="mountain-seams" />
        <path d="m220 60 26-30 28 42-22-11-15 10Z" fill="#fff" opacity=".92" />
        {completedToday ? <g className="icing-sugar" aria-hidden="true"><circle cx="225" cy="43" r="3" /><circle cx="277" cy="70" r="2.5" /><circle cx="198" cy="79" r="2" /><circle cx="304" cy="120" r="3" /><circle cx="148" cy="123" r="2.5" /><circle cx="75" cy="145" r="2" /></g> : null}
      </g>
      <path d="M16 184 106 84l54 54L246 30l98 154Z" className="mountain-outline" />
    </svg>
    <p className="mt-2 text-xs text-slate-500">Your streak is based on daily quests. If a day is missed, the current streak resets and the puzzle starts again.</p>
  </div>;
}

export function ProgressionMap({ state }: { state: InitializedAppState }) {
  const activeLevel = state.wallet.level;
  return <PageShell title="Mochi’s adventure map">
    <p className="mb-5">Each level adds a small tool as you build habits. Only Levels 1–3 are connected to this demo’s live progress.</p>
    {activeLevel >= 2
      ? <StreakMountain days={state.quest.streakDays} completedToday={state.quest.completedToday} />
      : <div className="mountain-locked mb-5"><span aria-hidden="true">⛰</span><p><strong>Your first mountain piece is waiting.</strong><br />Reach Explorer at 100 XP to start a daily quest streak.</p></div>}
    <ol className="level-map" aria-label="Mochi level roadmap">
      {levels.map(({ level, name, summary, activeFeature, note }) => {
        const live = level <= 3;
        const current = level === activeLevel;
        const unlocked = live && level < activeLevel;
        const status = unlocked ? 'Complete' : current ? 'Current level' : live ? `Unlocks at ${level === 2 ? 100 : 250} XP` : 'Future idea';
        return <li className={`level-card${current ? ' level-card--current' : ''}${unlocked ? ' level-card--complete' : ''}${!live ? ' level-card--future' : ''}`} key={level}>
          <span className="level-marker" aria-hidden="true">{unlocked ? '✓' : level}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3>Level {level} · {name}</h3><span className="level-status">{status}</span></div>
            <p>{summary}</p>
            <p className="level-feature">{activeFeature}</p>
            {note ? <p className="level-note">{note}</p> : null}
          </div>
        </li>;
      })}
    </ol>
  </PageShell>;
}
