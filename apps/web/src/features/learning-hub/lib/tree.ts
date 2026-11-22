import type { Branch, BranchState, LearningProgress, Quest } from '../types';

export function branchProgress(branch: Branch, completedIds: string[]) {
  const done = branch.questIds.filter((id) => completedIds.includes(id)).length;
  return { done, total: branch.questIds.length };
}

export function branchState(branch: Branch, p: LearningProgress): BranchState {
  const { done, total } = branchProgress(branch, p.completedQuestIds);
  if (done === total) return 'sprouted';
  if (p.totalNuts < branch.unlockCost) return 'locked';
  return done > 0 ? 'growing' : 'available';
}

export function sproutedCount(branches: Branch[], p: LearningProgress): number {
  return branches.filter((b) => branchState(b, p) === 'sprouted').length;
}

export function grownPercent(branches: Branch[], p: LearningProgress): number {
  return branches.length === 0 ? 0 : Math.round((sproutedCount(branches, p) / branches.length) * 100);
}

/** First incomplete lesson in the lowest unlocked branch, or null when everything is done. */
export function nextLesson(
  branches: Branch[],
  questsById: Record<string, Quest>,
  p: LearningProgress,
): { branch: Branch; quest: Quest } | null {
  for (const branch of branches) {
    const state = branchState(branch, p);
    if (state === 'locked' || state === 'sprouted') continue;
    const questId = branch.questIds.find((id) => !p.completedQuestIds.includes(id));
    if (questId && questsById[questId]) return { branch, quest: questsById[questId] };
  }
  return null;
}
