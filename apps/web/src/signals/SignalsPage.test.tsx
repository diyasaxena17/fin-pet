import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App'; 
import { signalsStorageKey } from './store';

const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
beforeEach(() => localStorage.clear());
afterEach(cleanup);
const openVault = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('button', { name: /Before checkout/ })); return screen.findByRole('dialog', { name: 'Before checkout' });
};

describe('simplified behavioural app', () => {
  it('is one screen: no tab bar, one check-in card and five pattern rows', () => {
    mount();
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
    expect(screen.getByText('Pip’s Winter Oak')).toBeTruthy();
    expect(screen.getByLabelText('Level 1')).toBeTruthy();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByLabelText('Micro check-in')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Open details/ })).toHaveLength(5);
    expect(screen.getByText(/behaviour-sandbox-14-v2/)).toBeTruthy();
    expect(screen.queryByText(/Feed|Future Me|Settings/)).toBeNull();
  });

  it('HUD daily cap uses the ledger target and reacts to a simulated spree in the lab', async () => {
    const user = userEvent.setup(); mount();
    expect(screen.getByLabelText(/Daily cap: \$\d+ of \$45/)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Test lab' }));
    await user.click(screen.getByRole('switch', { name: /Trigger another 4-hour spree/ }));
    await user.click(screen.getByRole('button', { name: '+24h' }));
    expect(screen.getByLabelText(/Daily cap: \$0 of \$45/)).toBeTruthy();
    await user.click(screen.getByRole('link', { name: /Back to your patterns/ }));
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
  });

  it('opens a single-page sheet with the data and the named psychology together, and closes with Escape', async () => {
    const user = userEvent.setup(); mount();
    await user.click(screen.getByRole('button', { name: /Transaction velocity/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Transaction velocity' });
    expect(within(dialog).getByText('3 sprees flagged')).toBeTruthy();
    expect(within(dialog).queryByRole('tab')).toBeNull();
    expect(within(dialog).getByText('The “what-the-hell” effect')).toBeTruthy();
    expect(within(dialog).getByText(/not a diagnosis/)).toBeTruthy();
    expect(within(dialog).getByText(/3 sprees in 14 days/)).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('1-tap vibe tagging awards nuts once and moves to the next purchase', async () => {
    const user = userEvent.setup(); mount();
    const card = screen.getByLabelText('Micro check-in');
    expect(within(card).getAllByRole('button')).toHaveLength(4);
    const before = Number(/(\d+) more waiting/.exec(card.textContent ?? '')![1]);
    await user.click(within(card).getByRole('button', { name: /Stressed/ }));
    expect(screen.getByLabelText('3 Golden Nuts')).toBeTruthy();
    expect(Number(/(\d+) more waiting/.exec(screen.getByLabelText('Micro check-in').textContent ?? '')![1])).toBe(before - 1);
  });

  it('answers the 48-hour pulse once vibes are done', async () => {
    const user = userEvent.setup(); mount();
    for (let i = 0; i < 40 && screen.queryByRole('button', { name: /^Stressed/ }); i += 1) {
      await user.click(within(screen.getByLabelText('Micro check-in')).getByRole('button', { name: /Stressed/ }));
    }
    const card = screen.getByLabelText('Micro check-in');
    expect(within(card).getByText('Was this worth it?')).toBeTruthy();
    await user.click(within(card).getByRole('button', { name: /Regret/ }));
    expect(screen.getByLabelText('Micro check-in').textContent).toMatch(/Regret so far/);
  });

  it('test lab: late-night orders and the 72h vault boundary', async () => {
    const user = userEvent.setup(); mount('/lab');
    await user.click(screen.getByRole('switch', { name: /Add more late-night orders/ }));
    await user.click(screen.getByRole('link', { name: /Back to your patterns/ }));
    expect(screen.getByRole('button', { name: /Late-night profile: .* after 11 PM/ })).toBeTruthy();
    await user.click(screen.getByRole('link', { name: 'Test lab' }));
    await user.click(screen.getByRole('switch', { name: /Add more late-night orders/ }));
    await user.click(screen.getByRole('link', { name: /Back to your patterns/ }));
    let dialog = await openVault(user);
    expect(within(dialog).getByText('Impulse Resistance 60%')).toBeTruthy();
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('link', { name: 'Test lab' }));
    await user.click(screen.getByRole('button', { name: '+72h' }));
    await user.click(screen.getByRole('link', { name: /Back to your patterns/ }));
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

  it('legacy section URLs land on the single screen, and corrupt state is survived', () => {
    mount('/intent');
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
    cleanup(); localStorage.setItem(signalsStorageKey, '{not json'); mount();
    expect(screen.getByRole('heading', { name: 'Spending patterns' })).toBeTruthy();
  });
});
