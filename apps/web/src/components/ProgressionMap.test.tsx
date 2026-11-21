import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createAppState } from '@mochi/contracts';
import { ProgressionMap } from './ProgressionMap';

describe('progression map', () => {
  it('reflects live API levels and labels later levels as future ideas', () => {
    const state = createAppState();
    render(<ProgressionMap state={state} />);

    expect(screen.getByRole('heading', { name: 'Level 1 · The Hatchling' })).toBeTruthy();
    expect(screen.getByText('Current level')).toBeTruthy();
    expect(screen.getByText('Unlocks at 100 XP')).toBeTruthy();
    expect(screen.getAllByText('Future idea')).toHaveLength(3);
    expect(screen.getByText(/current demo exposes its expanded simulator at Level 3/)).toBeTruthy();
  });

  it('uses the API streak state to reveal mountain pieces and sugar sprinkles', () => {
    const state = createAppState();
    state.wallet.level = 2;
    state.quest.streakDays = 2;
    state.quest.completedToday = true;
    render(<ProgressionMap state={state} />);

    expect(screen.getByText('2 days in a row')).toBeTruthy();
    expect(screen.getByText(/A little sugar sparkle for showing up today/)).toBeTruthy();
    const mountain = screen.getByRole('img', { name: /Mochi’s streak mountain/ });
    expect(mountain.querySelectorAll('.mountain-piece.is-revealed')).toHaveLength(2);
    expect(mountain.querySelectorAll('.icing-sugar circle')).toHaveLength(6);
  });
});
