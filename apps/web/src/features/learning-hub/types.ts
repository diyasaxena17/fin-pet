export interface ConceptStep {
  kind: 'concept';
  title: string;
  body: string;
  bullets?: string[];
}

export interface ChoiceStep {
  kind: 'choice';
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TrueFalseStep {
  kind: 'truefalse';
  prompt: string;
  answer: boolean;
  explanation: string;
}

/** A real-world money situation followed by a multiple-choice decision. */
export interface ScenarioStep {
  kind: 'scenario';
  situation: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type QuestionStep = ChoiceStep | TrueFalseStep | ScenarioStep;
export type LessonStep = ConceptStep | QuestionStep;

/** One lesson (a "Lesson N" tab inside a branch). Completing it earns Golden Nuts once. */
export interface Quest {
  id: string;
  title: string;
  summary: string;
  nuts: number;
  minutes: number;
  steps: LessonStep[];
}

export type TopicIconKey = 'wallet' | 'shield' | 'leaf' | 'cap' | 'trend' | 'layers' | 'compass';

/** One tappable branch of the tree. Holds one or more lessons. */
export interface Branch {
  id: string;
  title: string;
  /** Uppercase pill shown at the top of the lesson sheet, e.g. "WEALTH BUILDING". */
  tag: string;
  icon: TopicIconKey;
  /** Total Golden Nuts earned before this branch unlocks (0 = open from the start). */
  unlockCost: number;
  questIds: string[];
  /** Node position as a percentage of the tree scene (0-100). */
  pos: { x: number; y: number };
  /** Stem drawn from the trunk to the node, in the scene's 360x430 viewBox units. */
  stem: { from: [number, number]; ctrl: [number, number] };
}

export type BranchState = 'locked' | 'available' | 'growing' | 'sprouted';

export interface Explainer {
  id: string;
  title: string;
  summary: string;
  takeaways: string[];
  example: string;
  relatedQuestId?: string;
}

export interface DailyNuts {
  date: string; // local YYYY-MM-DD
  nuts: number;
}

export interface LearningProgress {
  completedQuestIds: string[];
  totalNuts: number;
  streak: number;
  lastActiveDate: string | null;
  daily: DailyNuts;
}
