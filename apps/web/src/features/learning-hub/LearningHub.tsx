import { useState } from 'react';
import { BranchSheet } from './components/BranchSheet';
import { DailyPulseSheet } from './components/DailyPulseSheet';
import { QuickReads, ExplainerSheet } from './components/QuickReads';
import { TreeScene } from './components/TreeScene';
import { TreeTopBar } from './components/TreeTopBar';
import { branches } from './data/branches';
import { explainers, questsById } from './data/quests';
import { dailyNutsToday, displayStreak } from './lib/progress';
import { grownPercent, nextLesson, sproutedCount } from './lib/tree';
import { useLearningProgress } from './lib/useLearningProgress';
import type { Branch, BranchState, Explainer } from './types';

interface Props {
  /** The pet's name, chosen by the user in the app. */
  petName?: string;
  /** Show the green "NFC Connected" status. Pass true when the user arrived by tapping the chip. */
  nfcConnected?: boolean;
}

type Open =
  | { kind: 'branch'; branchId: string; questId: string }
  | { kind: 'explainer'; explainerId: string }
  | { kind: 'pulse' }
  | null;

/**
 * Fills its parent (h-full) and scrolls internally; sheets slide over this root. Give the parent a
 * definite height, e.g. a phone-sized container.
 */
export function LearningHub({ petName = 'Pip', nfcConnected = true }: Props) {
  const { progress, completeQuest, today } = useLearningProgress();
  const [open, setOpen] = useState<Open>(null);
  const [tooltipBranchId, setTooltipBranchId] = useState<string | null>(null);

  const dailyNuts = dailyNutsToday(progress, today);
  const streak = displayStreak(progress, today);
  const upNext = nextLesson(branches, questsById, progress);

  function openBranch(branch: Branch, questId?: string) {
    const first = questId ?? branch.questIds.find((id) => !progress.completedQuestIds.includes(id)) ?? branch.questIds[0] ?? '';
    setTooltipBranchId(null);
    setOpen({ kind: 'branch', branchId: branch.id, questId: first });
  }

  function onSelect(branch: Branch, state: BranchState) {
    if (state === 'locked') {
      setTooltipBranchId((current) => (current === branch.id ? null : branch.id));
      return;
    }
    openBranch(branch);
  }

  const openBranchData = open?.kind === 'branch' ? branches.find((b) => b.id === open.branchId) : undefined;
  const openExplainer: Explainer | undefined = open?.kind === 'explainer' ? explainers.find((e) => e.id === open.explainerId) : undefined;
  const related = openExplainer?.relatedQuestId
    ? branches.find((b) => b.questIds.includes(openExplainer.relatedQuestId as string))
    : undefined;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#F7F2E8] text-[#1F3B2D]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TreeTopBar
          petName={petName}
          nfcConnected={nfcConnected}
          totalNuts={progress.totalNuts}
          dailyNuts={dailyNuts}
          sproutedCount={sproutedCount(branches, progress)}
          branchCount={branches.length}
          grownPercent={grownPercent(branches, progress)}
          onOpenPulse={() => setOpen({ kind: 'pulse' })}
        />
        <TreeScene
          branches={branches}
          progress={progress}
          tooltipBranchId={tooltipBranchId}
          onSelect={onSelect}
          onDismissTooltip={() => setTooltipBranchId(null)}
        />
        <QuickReads explainers={explainers} onOpen={(e) => setOpen({ kind: 'explainer', explainerId: e.id })} />
      </div>

      {openBranchData && open?.kind === 'branch' ? (
        <BranchSheet
          branch={openBranchData}
          lessons={openBranchData.questIds.flatMap((id) => (questsById[id] ? [questsById[id]] : []))}
          activeQuestId={open.questId}
          progress={progress}
          today={today}
          onSelectLesson={(questId) => setOpen({ kind: 'branch', branchId: openBranchData.id, questId })}
          onComplete={completeQuest}
          onClose={() => setOpen(null)}
        />
      ) : null}

      {openExplainer ? (
        <ExplainerSheet
          explainer={openExplainer}
          relatedQuestTitle={openExplainer.relatedQuestId ? questsById[openExplainer.relatedQuestId]?.title : undefined}
          onClose={() => setOpen(null)}
          onStartRelated={
            related && openExplainer.relatedQuestId
              ? () => openBranch(related, openExplainer.relatedQuestId)
              : undefined
          }
        />
      ) : null}

      {open?.kind === 'pulse' ? (
        <DailyPulseSheet
          streak={streak}
          dailyNuts={dailyNuts}
          next={upNext}
          onStartNext={() => upNext && openBranch(upNext.branch, upNext.quest.id)}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}
