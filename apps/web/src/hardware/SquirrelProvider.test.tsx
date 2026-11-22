import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../lib/appState';
import { api } from '../lib/api';
import { createMockApi } from '../lib/mockApi';
import { SquirrelProvider } from './SquirrelProvider';

vi.mock('../lib/api', () => ({ api: {} }));

class FakeSource {
  static last: FakeSource | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) { FakeSource.last = this; }
  close() { /* nothing to close */ }
  tap() { this.onmessage?.({ data: JSON.stringify({ event: 'message', message: 'wake' }) } as MessageEvent<string>); }
}

const onboarding = { petName: 'Hazel', goalTitle: 'Emergency fund', goalTarget: 200, letter: { vision: 'v', why: 'w', reminder: 'r' } };
beforeEach(() => { Object.assign(api, createMockApi()); localStorage.clear(); });
afterEach(cleanup);

describe('Squirrel in the companion app (no hardware UI)', () => {
  it('opens the daily check-in on an NFC tap and sends the Pet tab’s moods to the bridge', async () => {
    const { App: CompanionApp, PET_NAME_KEY } = await import('../mochi-ui/App');
    localStorage.setItem(PET_NAME_KEY, 'Tiger');
    await api.onboard(onboarding);
    const user = userEvent.setup();
    const sent: string[] = [];
    render(<MemoryRouter><AppProvider><SquirrelProvider send={message => sent.push(message)} eventSource={FakeSource as never}><CompanionApp /></SquirrelProvider></AppProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Close daily check-in' }));
    await user.click(screen.getByRole('button', { name: /Tiger Pet/ }));
    expect(screen.queryByText(/Connect squirrel/)).toBeNull();
    expect(screen.queryByText(/New link/)).toBeNull();

    act(() => FakeSource.last!.tap());
    await screen.findByText('NFC Tap Activated');
    await user.click(screen.getByRole('button', { name: 'Close daily check-in' }));

    sent.length = 0;
    await user.click(screen.getByRole('button', { name: /Over-Limit Worried Eyes/ }));
    expect(sent).toEqual(['mood!:w']);
    await user.click(screen.getByRole('button', { name: /NFC Tap Check-In Eyes/ }));
    expect(sent.at(-1)).toBe('wake');
  });

  it('sends a mood when the app’s state changes (budget set and spending synced over it)', async () => {
    const { App: CompanionApp, PET_NAME_KEY } = await import('../mochi-ui/App');
    localStorage.setItem(PET_NAME_KEY, 'Tiger');
    const user = userEvent.setup();
    const sent: string[] = [];
    render(<MemoryRouter><AppProvider><SquirrelProvider send={message => sent.push(message)} eventSource={null}><CompanionApp /></SquirrelProvider></AppProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: 'Close daily check-in' }));
    await user.click(screen.getByTitle('Set or check today\'s daily budget'));
    await user.type(screen.getByLabelText(/What’s your daily budget\?/), '40');
    await user.click(screen.getByRole('button', { name: 'Set budget' }));
    // $53.44 of sample bank spending against $40 is more than 25% over: sad.
    await waitFor(() => expect(sent).toContain('mood:d'));
  });
});
