import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../lib/appState';
import { api } from '../lib/api';
import { createMockApi } from '../lib/mockApi';
import { SquirrelDock } from './SquirrelDock';
import { SquirrelProvider } from './SquirrelProvider';
import type { LinkStatus, SquirrelLetter, SquirrelLink } from './squirrelSerial';

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

function fakeLink() {
  const sent: SquirrelLetter[] = [];
  const listeners = new Set<(status: LinkStatus) => void>();
  const link = {
    status: 'disconnected' as LinkStatus,
    sent,
    subscribe(listener: (status: LinkStatus) => void) { listeners.add(listener); return () => listeners.delete(listener); },
    async reconnect() { return false; },
    async connect() { link.status = 'connected'; for (const listener of listeners) listener('connected'); return true; },
    async disconnect() { sent.push('z'); },
    send(letter: SquirrelLetter) { if (link.status !== 'connected') return false; sent.push(letter); return true; },
  };
  return link;
}

const onboarding = { petName: 'Hazel', goalTitle: 'Emergency fund', goalTarget: 200, letter: { vision: 'v', why: 'w', reminder: 'r' } };
beforeEach(() => { Object.assign(api, createMockApi()); localStorage.clear(); });
afterEach(cleanup);

describe('Squirrel dock', () => {
  it('connects the squirrel asleep, wakes it with an NFC tap and puts it to sleep on goodbye', async () => {
    await api.onboard(onboarding);
    const user = userEvent.setup();
    const link = fakeLink();
    render(<MemoryRouter><AppProvider><SquirrelProvider link={link as unknown as SquirrelLink} eventSource={FakeSource as never}><SquirrelDock /></SquirrelProvider></AppProvider></MemoryRouter>);

    await user.click(screen.getByRole('button', { name: /Squirrel · Not connected/ }));
    expect((screen.getByLabelText('NFC tap link') as HTMLInputElement).value).toMatch(/^https:\/\/ntfy\.sh\/mochi-[a-z0-9]{12}\/publish\?message=wake$/);
    await user.click(screen.getByRole('button', { name: 'Connect squirrel (USB)' }));
    await screen.findByText('Connected · asleep');
    expect(link.sent).toEqual(['z']);

    FakeSource.last!.tap();
    await screen.findByText('Connected · awake');
    expect(link.sent).toEqual(['z', 'p']);
    expect(await screen.findByText('NFC tap: No daily budget set yet.')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Worried' }));
    expect(link.sent.at(-1)).toBe('w');
    await user.click(screen.getByRole('button', { name: 'Goodbye (sleep)' }));
    await waitFor(() => expect(link.sent.at(-1)).toBe('z'));
    expect(screen.getByText('Connected · asleep')).toBeTruthy();
  });

  it('accepts an existing tap code and rejects a bad one', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><AppProvider><SquirrelProvider link={fakeLink() as unknown as SquirrelLink} eventSource={null}><SquirrelDock /></SquirrelProvider></AppProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /Squirrel ·/ }));
    await user.click(screen.getByText(/Already set up a tap link/));
    await user.type(screen.getByLabelText('Tap code'), 'bad code');
    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect(screen.getByText(/Use the part after ntfy.sh/)).toBeTruthy();
    await user.clear(screen.getByLabelText('Tap code'));
    await user.type(screen.getByLabelText('Tap code'), 'mochi-tii645ranyxe');
    await user.click(screen.getByRole('button', { name: 'Use' }));
    expect((screen.getByLabelText('NFC tap link') as HTMLInputElement).value).toBe('https://ntfy.sh/mochi-tii645ranyxe/publish?message=wake');
  });

  it('renders nothing outside the provider', () => {
    const { container } = render(<SquirrelDock />);
    expect(container.innerHTML).toBe('');
  });
});

describe('Squirrel in the companion app', () => {
  it('opens the daily check-in on a real NFC tap and drives the squirrel from the Pet tab', async () => {
    const { App: CompanionApp, PET_NAME_KEY } = await import('../mochi-ui/App');
    localStorage.setItem(PET_NAME_KEY, 'Tiger');
    await api.onboard(onboarding);
    const user = userEvent.setup();
    const link = fakeLink();
    render(<MemoryRouter><AppProvider><SquirrelProvider link={link as unknown as SquirrelLink} eventSource={FakeSource as never}><CompanionApp /></SquirrelProvider></AppProvider></MemoryRouter>);
    await user.click(screen.getByRole('button', { name: /Tiger Pet/ }));
    await user.click(screen.getByRole('button', { name: 'Connect squirrel (USB)' }));
    await screen.findByText(/Squirrel connected by USB • Asleep/);
    expect(link.sent).toEqual(['z']);

    FakeSource.last!.tap();
    await screen.findByText('NFC Tap Activated');
    expect(link.sent).toEqual(['z', 'p']);
    expect(screen.getByText(/Squirrel connected by USB • Awake/)).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /Over-Limit Worried Eyes/ }));
    expect(link.sent.at(-1)).toBe('w');
  });
});
