import { describe, expect, it } from 'vitest';
import { branches } from '../data/branches';
import { explainers, questsById, quests } from '../data/quests';
import { createInitialProgress } from './progress';
import { branchState, grownPercent, nextLesson, sproutedCount } from './tree';
import type { LearningProgress } from '../types';

const today = '2026-11-21';
const withNuts = (totalNuts: number, completedQuestIds: string[] = []): LearningProgress => ({
  ...createInitialProgress(today),
  totalNuts,
  completedQuestIds,
});
const byId = (id: string) => branches.find((b) => b.id === id)!;

describe('tree state', () => {
  it('starts with two open branches and the rest locked', () => {
    const p = withNuts(0);
    expect(branches.filter((b) => branchState(b, p) === 'available').map((b) => b.id)).toEqual(['budgeting', 'emergency-fund']);
    expect(branchState(byId('tfsa'), p)).toBe('locked');
  });

  it('unlocks a branch once total nuts reach its cost', () => {
    expect(branchState(byId('tfsa'), withNuts(39))).toBe('locked');
    expect(branchState(byId('tfsa'), withNuts(40))).toBe('available');
  });

  it('marks partial branches as growing and finished ones as sprouted', () => {
    expect(branchState(byId('tfsa'), withNuts(60, ['tfsa-contribution-room']))).toBe('growing');
    const done = withNuts(60, ['tfsa-contribution-room', 'tfsa-avoid-overcontributing']);
    expect(branchState(byId('tfsa'), done)).toBe('sprouted');
  });

  it('computes sprouted count and percent grown', () => {
    const p = withNuts(60, ['budget-like-a-boss', 'emergency-fund-basics', 'tfsa-contribution-room', 'tfsa-avoid-overcontributing']);
    expect(sproutedCount(branches, p)).toBe(3);
    expect(grownPercent(branches, p)).toBe(43);
  });

  it('suggests the first incomplete lesson in the lowest open branch', () => {
    expect(nextLesson(branches, questsById, withNuts(0))?.quest.id).toBe('budget-like-a-boss');
    const p = withNuts(30, ['budget-like-a-boss']);
    expect(nextLesson(branches, questsById, p)?.quest.id).toBe('emergency-fund-basics');
  });

  it('returns null when everything is complete', () => {
    expect(nextLesson(branches, questsById, withNuts(999, quests.map((q) => q.id)))).toBeNull();
  });
});

describe('content integrity', () => {
  it('uses every lesson in exactly one branch, with valid ids', () => {
    const used = branches.flatMap((b) => b.questIds);
    expect(new Set(used).size).toBe(used.length);
    expect([...used].sort()).toEqual(quests.map((q) => q.id).sort());
  });

  it('has valid answer indices and every lesson has concept, true/false and scenario steps', () => {
    expect(new Set(quests.map((q) => q.id)).size).toBe(quests.length);
    for (const q of quests) {
      expect(q.steps.some((s) => s.kind === 'concept')).toBe(true);
      expect(q.steps.some((s) => s.kind === 'truefalse')).toBe(true);
      expect(q.steps.some((s) => s.kind === 'scenario')).toBe(true);
      for (const s of q.steps) {
        if (s.kind === 'choice' || s.kind === 'scenario') {
          expect(s.correctIndex).toBeGreaterThanOrEqual(0);
          expect(s.correctIndex).toBeLessThan(s.options.length);
        }
      }
    }
  });

  it('can always reach the next unlock: nuts from cheaper branches cover each unlock cost', () => {
    for (const b of branches) {
      const earnable = branches
        .filter((o) => o.unlockCost < b.unlockCost)
        .flatMap((o) => o.questIds)
        .reduce((sum, id) => sum + (questsById[id]?.nuts ?? 0), 0);
      expect(earnable).toBeGreaterThanOrEqual(b.unlockCost);
    }
  });

  it('links every explainer to an existing lesson', () => {
    for (const e of explainers) {
      if (e.relatedQuestId) expect(questsById[e.relatedQuestId]).toBeDefined();
    }
  });
});
