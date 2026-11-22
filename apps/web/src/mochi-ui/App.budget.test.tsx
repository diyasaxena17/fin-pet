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

describe('live daily budget', () => {
  it('has no preset budget and lets the user enter one, then log purchases against it', async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole('button', { name: 'Close daily check-in' }));
    expect(screen.queryByText(/\$32/)).toBeNull();
    expect(screen.queryByText(/\$45/)).toBeNull();
    const header = screen.getByTitle('Set or check today\'s daily budget');
    expect(within(header).getByText('Set budget')).toBeTruthy();

    await user.click(header);
    await user.type(screen.getByLabelText(/What’s your daily budget\?/), '40');
    await user.click(screen.getByRole('button', { name: 'Set budget' }));
    await waitFor(() => expect(within(header).getByText(/\$0 \/ \$40/)).toBeTruthy());
    expect((await api.getState()).initialized).toBe(true);

    await user.type(screen.getByLabelText('Purchase name'), 'Concert tickets');
    await user.type(screen.getByLabelText('Purchase amount'), '55.5');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(within(header).getByText(/\$55\.50 \/ \$40/)).toBeTruthy());
    expect(screen.getByText(/\$15\.50 over today’s budget/)).toBeTruthy();
  });
});
