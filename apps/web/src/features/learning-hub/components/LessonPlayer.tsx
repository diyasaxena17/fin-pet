import { useState } from 'react';
import type { LessonStep, Quest, QuestionStep } from '../types';
import { DAILY_GOAL_NUTS, levelInfo } from '../lib/progress';
import { CheckIcon, FlameIcon, NutIcon, TargetIcon } from './icons';
import { PrimaryButton } from './PrimaryButton';

interface Props {
  quest: Quest;
  branchTitle: string;
  alreadyCompleted: boolean;
  /** Live stats from the parent; they update the moment the lesson is completed. */
  stats: { streak: number; totalNuts: number; dailyNuts: number };
  /** Live: true once every lesson in this branch is complete. */
  branchSprouted: boolean;
  hasNextLesson: boolean;
  onComplete: (questId: string, nuts: number) => void;
  onNextLesson: () => void;
  onBackToTree: () => void;
}

interface NormalizedQuestion {
  situation?: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function normalize(step: QuestionStep): NormalizedQuestion {
  if (step.kind === 'truefalse') {
    return {
      prompt: step.prompt,
      options: ['True', 'False'],
      correctIndex: step.answer ? 0 : 1,
      explanation: step.explanation,
    };
  }
  if (step.kind === 'scenario') {
    return { situation: step.situation, prompt: step.prompt, options: step.options, correctIndex: step.correctIndex, explanation: step.explanation };
  }
  return { prompt: step.prompt, options: step.options, correctIndex: step.correctIndex, explanation: step.explanation };
}

const isQuestion = (s: LessonStep): s is QuestionStep => s.kind !== 'concept';

export function LessonPlayer({ quest, branchTitle, alreadyCompleted, stats, branchSprouted, hasNextLesson, onComplete, onNextLesson, onBackToTree }: Props) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wasCompleted] = useState(alreadyCompleted);

  const total = quest.steps.length;
  const questionTotal = quest.steps.filter(isQuestion).length;
  const step = quest.steps[index];
  const isLast = index === total - 1;
  const collectLabel = wasCompleted ? 'Finish practice' : `Collect +${quest.nuts} Golden Nuts`;
  const pct = finished ? 100 : Math.round((index / total) * 100);

  function next() {
    if (isLast) {
      onComplete(quest.id, quest.nuts);
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  }

  if (finished) {
    const accuracy = questionTotal === 0 ? 100 : Math.round((correctCount / questionTotal) * 100);
    const { level } = levelInfo(stats.totalNuts);
    const earned = wasCompleted ? 0 : quest.nuts;
    const justSprouted = branchSprouted && !wasCompleted;
    return (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#FBEBC4] ring-4 ring-[#F3D78E]/50">
            <NutIcon className="h-9 w-9" />
          </span>
          <h3 className="mt-3 text-xl font-extrabold text-[#1F3B2D]">Lesson complete!</h3>
          <p className="text-sm text-[#5F6E63]">{quest.title}</p>
          {wasCompleted ? (
            <p role="status" className="mt-3 rounded-2xl bg-[#EFE9DC] p-3 text-sm text-[#4B5A4F]">
              You already finished this lesson, so this run was free practice. No new nuts this time.
            </p>
          ) : null}
          {justSprouted ? (
            <p role="status" className="mt-3 rounded-2xl bg-[#DCEBD9] p-3 text-sm font-bold text-[#1F3B2D]">
              {branchTitle} just sprouted on the oak!
            </p>
          ) : null}
          <dl className="mt-5 grid grid-cols-3 gap-2 text-left">
            <div className="rounded-2xl bg-[#FBEBC4] p-3">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#8A5416]">Nuts earned</dt>
              <dd data-testid="nuts-earned" className="text-lg font-extrabold text-[#6B3F12]">+{earned}</dd>
            </div>
            <div className="rounded-2xl bg-[#EFE9DC] p-3">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#6B7A6F]">Accuracy</dt>
              <dd className="text-lg font-extrabold text-[#1F3B2D]">{accuracy}%</dd>
            </div>
            <div className="rounded-2xl bg-[#EFE9DC] p-3">
              <dt className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-[#6B7A6F]">Level</dt>
              <dd className="text-lg font-extrabold text-[#1F3B2D]">{level}</dd>
            </div>
          </dl>
          <ul className="m-0 mt-4 grid list-none gap-2 p-0 text-left text-sm font-bold text-[#33463A]">
            <li className="flex items-center gap-2 rounded-2xl border border-[#E4DBC8] bg-[#FFFDF8] p-3">
              <FlameIcon className="h-4 w-4 text-[#D2691E]" />
              {stats.streak}-day streak
            </li>
            <li className="flex items-center gap-2 rounded-2xl border border-[#E4DBC8] bg-[#FFFDF8] p-3">
              <TargetIcon className="h-4 w-4 text-[#2E7D4F]" />
              Daily goal: {Math.min(stats.dailyNuts, DAILY_GOAL_NUTS)}/{DAILY_GOAL_NUTS}
              {stats.dailyNuts >= DAILY_GOAL_NUTS ? ' (reached!)' : ''}
            </li>
          </ul>
        </div>
        <div className="grid gap-3 border-t border-[#E4DBC8] px-5 py-4">
          {hasNextLesson ? (
            <>
              <PrimaryButton onClick={onNextLesson}>Next lesson</PrimaryButton>
              <PrimaryButton tone="soft" onClick={onBackToTree}>Back to the tree</PrimaryButton>
            </>
          ) : (
            <PrimaryButton onClick={onBackToTree}>Back to the tree</PrimaryButton>
          )}
        </div>
      </>
    );
  }

  if (!step) return null;
  const q = isQuestion(step) ? normalize(step) : null;
  const isCorrect = q !== null && selected === q.correctIndex;

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="mb-4 h-1.5 overflow-hidden rounded-full bg-[#E4DBC8]"
        >
          <div className="h-full rounded-full bg-[#234535] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>

        {step.kind === 'concept' ? (
          <div className="rounded-2xl border border-[#E4DBC8] bg-[#FFFDF8] p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[0.95rem] font-extrabold leading-snug text-[#1F3B2D]">{step.title}</h3>
              <span className="flex flex-none items-center gap-1 rounded-full bg-[#FBEBC4] px-2.5 py-1 text-xs font-extrabold text-[#6B3F12]">
                +{quest.nuts} <NutIcon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#4B5A4F]">{step.body}</p>
            {step.bullets ? (
              <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                {step.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 rounded-xl bg-[#F3EEE1] p-2.5 text-[0.8rem] leading-relaxed text-[#33463A]">
                    <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-full bg-[#DDE6D9] text-[#2F4A3B]">
                      <CheckIcon className="h-2.5 w-2.5" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : q ? (
          <div className="rounded-2xl border border-[#E4DBC8] bg-[#EFE9DC] p-4">
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-[#8A4B1F]">Interactive practice challenge</p>
            {q.situation ? (
              <p className="mt-2 rounded-xl bg-[#FFFDF8] p-3 text-[0.8rem] leading-relaxed text-[#4B5A4F]">{q.situation}</p>
            ) : null}
            <h3 className="mt-2 text-[0.9rem] font-extrabold leading-snug text-[#1F3B2D]">{q.prompt}</h3>
            <div role="group" aria-label="Answer choices" className="mt-3 grid gap-2.5">
              {q.options.map((option, i) => {
                const isSelected = selected === i;
                const showCorrect = checked && i === q.correctIndex;
                const showWrong = checked && isSelected && i !== q.correctIndex;
                const tone = showCorrect
                  ? 'border-[#2E7D4F] bg-[#E3F1E4] text-[#17432A]'
                  : showWrong
                    ? 'border-[#C4543F] bg-[#FBE6E1] text-[#7A2A1B]'
                    : isSelected
                      ? 'border-[#234535] bg-[#F1F5EC] text-[#1F3B2D]'
                      : 'border-[#E0D7C2] bg-[#FFFDF8] text-[#33463A] hover:border-[#C77D2E]';
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={checked}
                    onClick={() => setSelected(i)}
                    className={`w-full justify-start rounded-2xl border-2 px-3.5 py-3 text-left text-[0.8rem] font-bold leading-snug shadow-none transition hover:translate-y-0 disabled:cursor-default disabled:opacity-100 ${tone}`}
                  >
                    {option}
                    {showCorrect ? <span className="sr-only"> (correct answer)</span> : null}
                    {showWrong ? <span className="sr-only"> (your answer, incorrect)</span> : null}
                  </button>
                );
              })}
            </div>
            <div aria-live="polite">
              {checked ? (
                <div className={`mt-3 rounded-xl p-3 text-[0.8rem] leading-relaxed ${isCorrect ? 'bg-[#E3F1E4] text-[#17432A]' : 'bg-[#FBE6E1] text-[#7A2A1B]'}`}>
                  <p className="font-extrabold">{isCorrect ? 'Nice, that is right!' : 'Not quite.'}</p>
                  <p className="mt-0.5">{q.explanation}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
      <div className="border-t border-[#E4DBC8] px-5 py-4">
        {step.kind === 'concept' ? (
          <PrimaryButton onClick={next}>{isLast ? collectLabel : 'Next'}</PrimaryButton>
        ) : !checked ? (
          <PrimaryButton
            disabled={selected === null}
            onClick={() => {
              if (selected === null || !q) return;
              setChecked(true);
              if (selected === q.correctIndex) setCorrectCount((c) => c + 1);
            }}
          >
            Check answer
          </PrimaryButton>
        ) : (
          <PrimaryButton onClick={next}>{isLast ? collectLabel : 'Continue'}</PrimaryButton>
        )}
      </div>
    </>
  );
}
