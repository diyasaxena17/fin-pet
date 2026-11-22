// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LearningHub } from './LearningHub';
import { questsById } from './content/quests';
import { branches } from './content/branches';

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

const CTA = /^(Next|Continue|Collect|Finish practice)/;

function playLesson(questId: string) {
  const quest = questsById[questId]!;
  for (const step of quest.steps) {
    if (step.kind === 'concept') {
      fireEvent.click(screen.getByRole('button', { name: CTA }));
      continue;
    }
    const correct = step.kind === 'truefalse' ? (step.answer ? 'True' : 'False') : step.options[step.correctIndex]!;
    fireEvent.click(within(screen.getByRole('group', { name: 'Answer choices' })).getByText(correct));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    fireEvent.click(screen.getByRole('button', { name: CTA }));
  }
}

describe('LearningHub tree', () => {
  it('renders seven branches, two open and five locked, with a 0% grown tree', () => {
    render(<LearningHub />);
    expect(branches).toHaveLength(7);
    expect(screen.getByTestId('node-budgeting').getAttribute('data-state')).toBe('available');
    expect(screen.getByTestId('node-tfsa').getAttribute('data-state')).toBe('locked');
    expect(screen.getByTestId('grown').textContent).toBe('0% Grown');
    expect(screen.getByTestId('sprouted').textContent).toBe('0/7');
    expect(screen.getByText('NFC Connected')).toBeTruthy();
  });

  it('shows the unlock cost when a locked branch is tapped, without opening a lesson', () => {
    render(<LearningHub />);
    fireEvent.click(screen.getByTestId('node-investing-basics'));
    expect(screen.getByRole('status').textContent).toContain('Unlock: 150');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('completes a lesson: nuts, streak, daily goal, sprouted branch and persistence', () => {
    render(<LearningHub />);
    fireEvent.click(screen.getByTestId('node-budgeting'));
    expect(within(screen.getByRole('dialog')).getByText('DAILY MONEY')).toBeTruthy();
    playLesson('budget-like-a-boss');

    expect(screen.getByText('Lesson complete!')).toBeTruthy();
    expect(screen.getByTestId('nuts-earned').textContent).toBe('+30');
    expect(screen.getByText('Budgeting just sprouted on the oak!')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));

    expect(screen.getByTestId('nuts-balance').textContent).toBe('30');
    expect(screen.getByTestId('daily-nuts').textContent).toContain('30 / 50');
    expect(screen.getByTestId('sprouted').textContent).toBe('1/7');
    expect(screen.getByTestId('grown').textContent).toBe('14% Grown');
    expect(screen.getByTestId('node-budgeting').getAttribute('data-state')).toBe('sprouted');
    expect(window.localStorage.getItem('mochi.learning-hub.v2')).toContain('budget-like-a-boss');
  });

  it('unlocks the TFSA branch after 40 nuts and walks through its two lessons', () => {
    render(<LearningHub />);
    for (const [node, id] of [['budgeting', 'budget-like-a-boss'], ['emergency-fund', 'emergency-fund-basics']] as const) {
      fireEvent.click(screen.getByTestId(`node-${node}`));
      playLesson(id);
      fireEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));
    }
    expect(screen.getByTestId('node-tfsa').getAttribute('data-state')).toBe('available');

    fireEvent.click(screen.getByTestId('node-tfsa'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('WEALTH BUILDING')).toBeTruthy();
    expect(within(dialog).getAllByRole('tab')).toHaveLength(2);
    playLesson('tfsa-contribution-room');
    expect(screen.queryByText(/just sprouted/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Next lesson' }));
    playLesson('tfsa-avoid-overcontributing');
    expect(screen.getByText('TFSA & Tax-Free Growth just sprouted on the oak!')).toBeTruthy();
  });

  it('gives no nuts when a finished lesson is replayed, and shows wrong-answer feedback', () => {
    render(<LearningHub />);
    fireEvent.click(screen.getByTestId('node-emergency-fund'));
    playLesson('emergency-fund-basics');
    fireEvent.click(screen.getByRole('button', { name: 'Back to the tree' }));

    fireEvent.click(screen.getByTestId('node-emergency-fund'));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByText('Your everyday chequing account'));
    fireEvent.click(screen.getByRole('button', { name: 'Check answer' }));
    expect(screen.getByText('Not quite.')).toBeTruthy();
    expect(screen.getByTestId('nuts-balance').textContent).toBe('30');
  });

  it('opens Daily Pulse and a quick read, and closes them with Escape', () => {
    render(<LearningHub />);
    fireEvent.click(screen.getByRole('button', { name: /Daily Pulse/ }));
    expect(within(screen.getByRole('dialog')).getByText('Up next')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /What Is a TFSA\?/ }));
    expect(within(screen.getByRole('dialog')).getByText('Key takeaways')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try the lesson' }));
    expect(within(screen.getByRole('dialog')).getByText('WEALTH BUILDING')).toBeTruthy();
  });
});
