import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { AppProvider } from './lib/appState';
import { api } from './lib/api';
import { createMockApi } from './lib/mockApi';
import { createRequestId } from './lib/requestId';

vi.mock('./lib/api', () => ({ api: {} }));
const onboarding = { petName: 'Mochi', goalTitle: 'Emergency fund', goalTarget: 200,
  letter: { vision: 'My future', why: 'My reasons', reminder: 'Small steps count.' } };
const mount = (path = '/') => render(<MemoryRouter initialEntries={[path]}><AppProvider><App /></AppProvider></MemoryRouter>);
beforeEach(() => { Object.assign(api, createMockApi()); });
afterEach(cleanup);

describe('standalone application journeys', () => {
  it('launches onboarding and saves a real goal and letter', async () => {
    const user = userEvent.setup();
    mount();
    await screen.findByRole('heading', { name: 'Meet your future companion' });
    await user.type(screen.getByLabelText('Goal title'), 'Emergency fund');
    await user.type(screen.getByLabelText('What future are you building?'), 'My future');
    await user.click(screen.getByRole('button', { name: 'Start with Mochi' }));
    await screen.findByRole('heading', { name: 'Little steps. A brighter future.' });
    expect(await api.getState()).toMatchObject({ initialized: true, goal: { targetAmount: 200 }, letter: { vision: 'My future' } });
  });
  it('reuses the pending UUID when a successful response is lost', async () => {
    const user = userEvent.setup();
    await api.onboard(onboarding);
    const submit = api.submitDecision;
    const spy = vi.spyOn(api, 'submitDecision').mockImplementation(submit).mockImplementationOnce(async (input) => {
      await submit(input);
      throw new Error('Connection interrupted. Retry the action.');
    });
    mount();
    await screen.findByRole('heading', { name: 'Little steps. A brighter future.' });
    await user.type(screen.getByLabelText('Item name'), 'Hoodie');
    await user.type(screen.getByLabelText('Price (CAD)'), '60');
    await user.click(screen.getByRole('button', { name: 'Skip purchase' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Connection interrupted');
    await user.click(screen.getByRole('button', { name: 'Skip purchase' }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1]![0].requestId).toBe(spy.mock.calls[0]![0].requestId);
    expect(await api.getState()).toMatchObject({ wallet: { coins: 60, xp: 20 } });
  });
  it('opens the normal feeding route without spending until explicitly confirmed', async () => {
    const user = userEvent.setup();
    await api.onboard(onboarding);
    await api.submitDecision({ requestId: createRequestId(), itemName: 'Hoodie', amount: 60, decision: 'skip' });
    const feed = vi.spyOn(api, 'feedPet');
    mount('/tap?petId=mochi-01');
    await screen.findByRole('heading', { name: 'A little care for Mochi' });
    expect(feed).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Confirm feed · 20 coins' }));
    await screen.findByText('Mochi enjoyed their meal!');
    expect(feed).toHaveBeenCalledTimes(1);
    expect(await api.getState()).toMatchObject({ wallet: { coins: 40 }, pet: { hunger: 80, mood: 'happy' } });
  });
  it('labels and edits the complete saved letter before milestone reveals', async () => {
    const user = userEvent.setup();
    await api.onboard(onboarding);
    mount('/future-me');
    await screen.findByRole('heading', { name: 'A letter to future you' });
    const vision = screen.getByLabelText('What future are you building?', { exact: true });
    expect((vision as HTMLTextAreaElement).value).toBe('My future');
    await user.clear(vision);
    await user.type(vision, '  Original words.\nKeep this line.');
    await user.click(screen.getByRole('button', { name: 'Save letter' }));
    expect(await api.getState()).toMatchObject({ letter: { vision: '  Original words.\nKeep this line.', revealedSections: 0 } });
  });
});
