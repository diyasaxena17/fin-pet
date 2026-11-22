import type { Branch, LearningProgress, Quest } from '../types';
import { dailyNutsToday, displayStreak } from '../lib/progress';
import { branchState } from '../lib/tree';
import { BookIcon, CheckIcon } from './icons';
import { LessonPlayer } from './LessonPlayer';
import { Sheet, SheetHeader } from './Sheet';

interface Props {
  branch: Branch;
  lessons: Quest[];
  activeQuestId: string;
  progress: LearningProgress;
  today: string;
  onSelectLesson: (questId: string) => void;
  onComplete: (questId: string, nuts: number) => void;
  onClose: () => void;
}

export function BranchSheet({ branch, lessons, activeQuestId, progress, today, onSelectLesson, onComplete, onClose }: Props) {
  const quest = lessons.find((q) => q.id === activeQuestId) ?? lessons[0];
  if (!quest) return null;
  const activeIndex = lessons.findIndex((q) => q.id === quest.id);
  const nextLesson = lessons[activeIndex + 1];
  const stats = {
    streak: displayStreak(progress, today),
    totalNuts: progress.totalNuts,
    dailyNuts: dailyNutsToday(progress, today),
  };

  return (
    <Sheet label={`${branch.title} lessons`} onClose={onClose}>
      <SheetHeader tag={branch.tag} title={branch.title} onClose={onClose} />
      <div role="tablist" aria-label="Lessons" className="flex gap-2 overflow-x-auto border-t border-[#E4DBC8] px-5 py-3">
        {lessons.map((lesson, i) => {
          const active = lesson.id === quest.id;
          const done = progress.completedQuestIds.includes(lesson.id);
          return (
            <button
              key={lesson.id}
              role="tab"
              type="button"
              aria-selected={active}
              title={lesson.title}
              onClick={() => onSelectLesson(lesson.id)}
              className={`inline-flex flex-none items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-extrabold shadow-none transition hover:translate-y-0 ${
                active
                  ? 'border-[#234535] bg-[#234535] text-white hover:bg-[#1C392C]'
                  : 'border-[#E3D4B4] bg-[#FFFDF8] text-[#2F4A3B] hover:bg-[#F6EFDD]'
              }`}
            >
              {done ? <CheckIcon className={`h-3.5 w-3.5 ${active ? 'text-[#9BE0B0]' : 'text-[#2E7D4F]'}`} /> : <BookIcon className={`h-3.5 w-3.5 ${active ? '' : 'text-[#C77D2E]'}`} />}
              Lesson {i + 1}
            </button>
          );
        })}
      </div>
      <p className="px-5 pb-3 text-xs font-bold text-[#5F6E63]">{quest.title}</p>
      <LessonPlayer
        key={quest.id}
        quest={quest}
        branchTitle={branch.title}
        alreadyCompleted={progress.completedQuestIds.includes(quest.id)}
        stats={stats}
        branchSprouted={branchState(branch, progress) === 'sprouted'}
        hasNextLesson={Boolean(nextLesson)}
        onComplete={onComplete}
        onNextLesson={() => nextLesson && onSelectLesson(nextLesson.id)}
        onBackToTree={onClose}
      />
    </Sheet>
  );
}
