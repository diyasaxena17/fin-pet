import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SignalsApp as App } from './SignalsApp';
import { signalsStorageKey } from './store';

const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(() => localStorage.clear());
afterEach(cleanup);
type User = ReturnType<typeof userEvent.setup>;
const go = async (user: User, name: RegExp) => { await user.click(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name })); };
const openVault = async (user: User) => {
  await go(user, /Intent/); await user.click(screen.getByRole('button', { name: /72-hour vault/ }));
  const dialog = await screen.findByRole('dialog'); await user.click(within(dialog).getByRole('tab', { name: /72h vault/ })); return dialog;
};

describe('behavioural shell', () => {
  it('shows only behavioural sections, with a HUD derived from signals and the persona ledger', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
    expect(screen.getByText('Your Winter Oak')).toBeTruthy();
    expect(screen.getByLabelText('Level 1')).toBeTruthy();
    expect(screen.getByText(/0\/7 Behaviour Skills Sprouted/)).toBeTruthy();
    expect(screen.getByLabelText('Mock bank feed').textContent).toContain('behaviour-sandbox-14-v2');
    const links = within(screen.getByRole('navigation', { name: 'Main navigation' })).getAllByRole('link').map((l) => l.textContent);
    expect(links).toEqual(['📡Passive', '🛑Intent', '🧠Check-ins', '🧪Test lab']);
    expect(screen.queryByText(/Feed|Future Me|Settings/)).toBeNull();
  });

  it('HUD daily cap uses the ledger target and reacts to a simulated spree', async () => {
    const user = userEvent.setup(); mount();
    expect(screen.getByLabelText(/Daily cap: \$\d+ of \$45/)).toBeTruthy();
    await go(user, /Test lab/);
    await user.click(screen.getByRole('switch', { name: /Trigger another 4-hour spree/ }));
    await user.click(screen.getByRole('button', { name: '+24h' }));
    expect(screen.getByLabelText(/Daily cap: \$0 of \$45/)).toBeTruthy();
  });

  it('opens a sheet, shows the named psychology, collects a reward once, and closes with Escape', async () => {
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole('button', { name: /Transaction velocity/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Transaction velocity' });
    expect(within(dialog).getByText('3 sprees flagged')).toBeTruthy();
    await user.click(within(dialog).getByRole('tab', { name: /Why/ }));
    expect(within(dialog).getByText('The “what-the-hell” effect')).toBeTruthy();
    expect(within(dialog).getByText(/not a diagnosis/)).toBeTruthy();
    expect(within(dialog).getByText(/3 sprees in 14 days/)).toBeTruthy();
    await user.click(within(dialog).getByRole('tab', { name: /Reflect/ }));
    const cta = within(dialog).getByRole('button', { name: /Submit & Collect/ });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
    await user.click(within(dialog).getByRole('radio', { name: /Pause 10 minutes/ }));
    await user.click(cta);
    expect(within(dialog).getByRole('button', { name: /Collected/ })).toBeTruthy();
    expect(screen.getByLabelText('10 Golden Nuts')).toBeTruthy();
    expect(screen.getByText(/1\/7 Behaviour Skills Sprouted/)).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('1-tap vibe tagging updates the queue and awards nuts once', async () => {
    const user = userEvent.setup(); mount('/check-ins');
    const card = screen.getByLabelText('Micro check-in');
    expect(within(card).getAllByRole('button')).toHaveLength(4);
    const before = Number(/(\d+) more waiting/.exec(card.textContent ?? '')![1]);
    await user.click(within(card).getByRole('button', { name: /Stressed/ }));
    expect(screen.getByLabelText('3 Golden Nuts')).toBeTruthy();
    expect(Number(/(\d+) more waiting/.exec(screen.getByLabelText('Micro check-in').textContent ?? '')![1])).toBe(before - 1);
    expect(screen.getByText(/5\/7|1\/7 Behaviour Skills Sprouted/)).toBeTruthy();
  });

  it('answers the 48-hour pulse and updates the regret profile', async () => {
    const user = userEvent.setup(); mount('/check-ins');
    await user.click(within(screen.getByLabelText('48-hour pulse')).getByRole('button', { name: /Regret/ }));
    await user.click(screen.getByRole('button', { name: /Regret profile/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: /Regret profile/ }));
    expect(within(dialog).getByText(/6 answered/)).toBeTruthy();
    expect(within(dialog).getByText(/Affective forecasting/)).toBeTruthy();
  });

  it('test lab: late-night orders, daytime-only filter, and the 72h vault boundary', async () => {
    const user = userEvent.setup(); mount('/lab');
    await user.click(screen.getByRole('switch', { name: /Add more late-night orders/ }));
    await go(user, /Passive/);
    expect(screen.getByRole('button', { name: /Late-night profile: .* after 11 PM/ })).toBeTruthy();
    await go(user, /Test lab/);
    await user.click(screen.getByRole('switch', { name: /Daytime only view/ }));
    await go(user, /Passive/);
    expect(screen.getByRole('button', { name: /0 late-night buys/ })).toBeTruthy();
    await go(user, /Test lab/);
    await user.click(screen.getByRole('switch', { name: /Daytime only view/ }));
    await user.click(screen.getByRole('switch', { name: /Add more late-night orders/ }));
    let dialog = await openVault(user);
    expect(within(dialog).getByText('Impulse Resistance 60%')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await go(user, /Test lab/);
    await user.click(screen.getByRole('button', { name: '+72h' }));
    dialog = await openVault(user);
    expect(within(dialog).getByText('Impulse Resistance 71%')).toBeTruthy();
  });

  it('adds and toggles vault items and persists state across remounts', async () => {
    const user = userEvent.setup(); mount();
    let dialog = await openVault(user);
    await user.type(within(dialog).getByLabelText('Item'), 'Espresso machine');
    await user.type(within(dialog).getByLabelText('Price (CAD)'), '249.99');
    await user.click(within(dialog).getByRole('button', { name: 'Add to the 72-hour vault' }));
    await user.click(within(dialog).getByRole('button', { name: 'I bought Espresso machine' }));
    expect(within(dialog).getByRole('button', { name: 'Undo Espresso machine' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(signalsStorageKey)!).wishlist[0].purchasedAtMs).not.toBeNull();
    cleanup(); mount();
    dialog = await openVault(user);
    expect(within(dialog).getByText('Espresso machine')).toBeTruthy();
  });

  it('survives corrupt persisted state', () => {
    localStorage.setItem(signalsStorageKey, '{not json'); mount();
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
  });
});
