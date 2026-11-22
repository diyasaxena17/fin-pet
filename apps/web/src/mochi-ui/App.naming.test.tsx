import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App, PET_NAME_KEY } from './App';

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('choosing the squirrel name', () => {
  it('asks for a name on first launch instead of using a preset one', async () => {
    render(<MemoryRouter><App /></MemoryRouter>);
    const dialog = screen.getByRole('dialog', { name: 'Name your squirrel' });
    const input = within(dialog).getByLabelText('Squirrel name') as HTMLInputElement;
    expect(input.value).toBe('');
    expect((within(dialog).getByRole('button', { name: 'Start with this name' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/Pip/)).toBeNull();
  });

  it('uses and saves the name the user types, and does not ask again after a remount', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);
    await user.type(screen.getByLabelText('Squirrel name'), '  Biscuit  ');
    await user.click(screen.getByRole('button', { name: 'Start with this name' }));
    expect(screen.queryByRole('dialog', { name: 'Name your squirrel' })).toBeNull();
    expect(localStorage.getItem(PET_NAME_KEY)).toBe('Biscuit');
    expect(screen.getAllByText(/Biscuit/).length).toBeGreaterThan(0);
    cleanup(); render(<MemoryRouter><App /></MemoryRouter>);
    expect(screen.queryByRole('dialog', { name: 'Name your squirrel' })).toBeNull();
    expect(screen.getAllByText(/Biscuit/).length).toBeGreaterThan(0);
  });

  it('rejects a blank name', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><App /></MemoryRouter>);
    await user.type(screen.getByLabelText('Squirrel name'), '   ');
    expect((screen.getByRole('button', { name: 'Start with this name' }) as HTMLButtonElement).disabled).toBe(true);
    expect(localStorage.getItem(PET_NAME_KEY)).toBeNull();
  });
});
