import { useCallback, useEffect, useState } from 'react';
import type { LearningProgress } from '../types';
import { STORAGE_KEY, applyQuestCompletion, parseProgress, toDateKey } from './progress';

function read(today: string): LearningProgress {
  try {
    return parseProgress(window.localStorage.getItem(STORAGE_KEY), today);
  } catch {
    return parseProgress(null, today);
  }
}

/** Local learning progress, persisted to localStorage (silently in-memory if storage is blocked). */
export function useLearningProgress() {
  const [progress, setProgress] = useState<LearningProgress>(() => read(toDateKey()));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      /* storage unavailable: keep in-memory state */
    }
  }, [progress]);

  const completeQuest = useCallback((questId: string, nuts: number) => {
    setProgress((p) => applyQuestCompletion(p, questId, nuts, toDateKey()));
  }, []);

  return { progress, completeQuest, today: toDateKey() };
}
