import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { AppProvider } from '../lib/appState';
import { api } from '../lib/api';
import { createMockApi } from '../lib/mockApi';
import { signalsStorageKey } from './store';

vi.mock('../lib/api', () => ({ api: {} }));
const onboarding = { petName: 'Mochi', goalTitle: 'Emergency fund', goalTarget: 200, letter: { vision: 'v', why: 'w', reminder: 'r' } };
const mount = () => render(<MemoryRouter initialEntries={['/signals']}><AppProvider><App /></AppProvider></MemoryRouter>);
beforeEach(async () => { localStorage.clear(); Object.assign(api, createMockApi()); await api.onboard(onboarding); });
afterEach(cleanup);

const openTestLab = async (user: ReturnType<typeof userEvent.setup>) => { await user.click(screen.getByText(/Test lab/)); };

describe('Signals screen', () => {
  it('renders the HUD from app state and the mock bank feed from the ledger', async () => {
    mount();
    await screen.findByRole('heading', { name: 'Behavioral signals' });
    expect(screen.getByLabelText('Level 1')).toBeTruthy();
    expect(screen.getByText('Mochi’s Winter Oak')).toBeTruthy();
    expect(screen.getByLabelText('Mock bank feed').textContent).toContain('mochi-sandbox-14-v1');
  });

  it('falls back to the ledger daily target in the HUD and reacts to simulated spend', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: 'Behavioral signals' });
    expect(screen.getByLabelText('Daily cap: $3 of $25')).toBeTruthy();
    await user.click(screen.getByText(/Test lab/));
    await user.click(screen.getByRole('switch', { name: /Trigger 4-hour spree/ }));
    await user.click(screen.getByRole('button', { name: '+24h' }));
    expect(screen.getByLabelText(/Daily cap: \$0 of \$25/)).toBeTruthy();
  });

  it('opens a bottom sheet, switches tabs, collects a reward once, and closes with Escape', async () => {
    const user = userEvent.setup(); mount();
    await user.click(await screen.findByRole('button', { name: /Transaction velocity/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Transaction velocity' });
    expect(within(dialog).getByText('1 spree flagged')).toBeTruthy();
    await user.click(within(dialog).getByRole('tab', { name: /Reflect/ }));
    const cta = within(dialog).getByRole('button', { name: /Submit & Collect/ });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    await user.click(within(dialog).getByRole('radio', { name: /Pause 10 minutes/ }));
    await user.click(cta);
    expect(within(dialog).getByRole('button', { name: /Collected/ })).toBeTruthy();
    expect(screen.getByText(/Mock rewards earned here/).textContent).toMatch(/here: 10 /);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('1-tap vibe tagging updates analytics and awards nuts once', async () => {
    const user = userEvent.setup(); mount();
    await user.click(await screen.findByRole('tab', { name: /Check-ins/ }));
    const card = screen.getByLabelText('Micro check-in');
    const before = within(card).getAllByRole('button').length;
    expect(before).toBe(4);
    await user.click(within(card).getByRole('button', { name: /Stressed/ }));
    expect(screen.getByText(/Mock rewards earned here/).textContent).toMatch(/here: 3 /);
    expect(within(screen.getByLabelText('Micro check-in')).getByText(/more waiting/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Regret profile/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Vibes & regret' });
    expect(dialog.textContent).toMatch(/\d+ purchases to tag/);
    expect(within(dialog).getByText(/😩 Stressed/)).toBeTruthy();
  });

  it('answers the 48-hour pulse and builds a regret profile', async () => {
    const user = userEvent.setup(); mount();
    await user.click(await screen.findByRole('tab', { name: /Check-ins/ }));
    const pulse = screen.getByLabelText('48-hour pulse');
    await user.click(within(pulse).getByRole('button', { name: /Regret/ }));
    await user.click(screen.getByRole('button', { name: /Regret profile/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /Regret profile/ }));
    expect(within(dialog).getByText(/2 answered/)).toBeTruthy();
    expect(within(dialog).getByText('100% regret rate')).toBeTruthy();
  });

  it('test lab triggers a spree, late-night mix, and the 72h vault boundary without touching the base ledger', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: 'Behavioral signals' });
    await openTestLab(user);
    await user.click(screen.getByRole('switch', { name: /Trigger 4-hour spree/ }));
    expect(screen.getByRole('button', { name: /Transaction velocity: 4 buys in 2\.6h/ })).toBeTruthy();
    await user.click(screen.getByRole('switch', { name: /Add late-night orders/ }));
    expect(screen.getByRole('button', { name: /Late-night profile: .* after 11 PM/ })).toBeTruthy();
    await user.click(screen.getByRole('switch', { name: /Trigger 4-hour spree/ }));
    await user.click(screen.getByRole('switch', { name: /Add late-night orders/ }));
    expect(screen.getByRole('button', { name: /Transaction velocity: 4 buys in 3\.8h/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /0 late-night buys/ })).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: /Intent/ }));
    await user.click(screen.getByRole('button', { name: /72-hour vault/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /72h vault/ }));
    expect(within(dialog).getByText('Impulse Resistance 67%')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: '+72h' }));
    await user.click(screen.getByRole('button', { name: /72-hour vault/ }));
    const later = await screen.findByRole('dialog');
    await user.click(within(later).getByRole('tab', { name: /72h vault/ }));
    expect(within(later).getByText('Impulse Resistance 80%')).toBeTruthy();
  });

  it('adds and toggles vault items and persists state across remounts', async () => {
    const user = userEvent.setup(); mount();
    await user.click(await screen.findByRole('tab', { name: /Intent/ }));
    await user.click(screen.getByRole('button', { name: /72-hour vault/ }));
    let dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /72h vault/ }));
    await user.type(within(dialog).getByLabelText('Item'), 'Espresso machine');
    await user.type(within(dialog).getByLabelText('Price (CAD)'), '249.99');
    await user.click(within(dialog).getByRole('button', { name: 'Add to the 72-hour vault' }));
    expect(within(dialog).getByText('Espresso machine')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'I bought Espresso machine' }));
    expect(within(dialog).getByRole('button', { name: 'Undo Espresso machine' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(signalsStorageKey)!).wishlist[0].purchasedAtMs).not.toBeNull();
    cleanup(); mount();
    await user.click(await screen.findByRole('tab', { name: /Intent/ }));
    await user.click(screen.getByRole('button', { name: /72-hour vault/ }));
    dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /72h vault/ }));
    expect(within(dialog).getByText('Espresso machine')).toBeTruthy();
  });

  it('survives corrupt persisted state', async () => {
    localStorage.setItem(signalsStorageKey, '{not json'); mount();
    expect(await screen.findByRole('heading', { name: 'Behavioral signals' })).toBeTruthy();
  });
});
