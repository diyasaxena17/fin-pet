import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../lib/appState';
import { api } from '../lib/api';
import { createMockApi } from '../lib/mockApi';
import { App, PET_NAME_KEY } from './App';

vi.mock('../lib/api', () => ({ api: {} }));
beforeEach(() => { Object.assign(api, createMockApi()); localStorage.clear(); localStorage.setItem(PET_NAME_KEY, 'Tiger'); });
afterEach(cleanup);

const mount = () => render(<MemoryRouter><AppProvider><App /></AppProvider></MemoryRouter>);
const month = () => new Date().toISOString().slice(0, 7);

describe('live daily budget', () => {
  it('has no preset budget, takes the one the user enters, and reads spending from the bank feed', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Close daily check-in' }));
    expect(screen.queryByText(/\$32/)).toBeNull();
    expect(screen.queryByText(/Log a purchase/)).toBeNull();
    const header = screen.getByTitle('Set or check today\'s daily budget');
    expect(within(header).getByText('Set budget')).toBeTruthy();

    await user.click(header);
    await user.type(screen.getByLabelText(/What’s your daily budget\?/), '40');
    await user.click(screen.getByRole('button', { name: 'Set budget' }));
    // The bank feed syncs once the account exists: 4.75 + 18.99 + 3.30 + 26.40 = 53.44 today.
    await waitFor(() => expect(within(header).getByText(/\$53\.44 \/ \$40/)).toBeTruthy());
    expect(screen.getByText(/\$13\.44 over today’s budget/)).toBeTruthy();
    expect(screen.getByText('Uber Eats')).toBeTruthy();

    // Syncing again never double counts.
    await user.click(screen.getByRole('button', { name: 'Synced ✓' }));
    await waitFor(() => expect(within(header).getByText(/\$53\.44 \/ \$40/)).toBeTruthy());
    expect((await api.getTransactions(month())).transactions).toHaveLength(4);

    await user.click(screen.getByRole('button', { name: 'Change budget' }));
    await user.clear(screen.getByLabelText('New daily budget (CAD)'));
    await user.type(screen.getByLabelText('New daily budget (CAD)'), '60');
    await user.click(screen.getByRole('button', { name: 'Set budget' }));
    await waitFor(() => expect(within(header).getByText(/\$53\.44 \/ \$60/)).toBeTruthy());
  });
});
