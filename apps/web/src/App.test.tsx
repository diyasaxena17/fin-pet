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
const onboarding = { petName: 'Hazel', goalTitle: 'Emergency fund', goalTarget: 200, letter: { vision: 'My future', why: 'My reasons', reminder: 'Small steps count.' } };
const mount = (path = '/?legacy=1') => render(<MemoryRouter initialEntries={[path]}><AppProvider><App /></AppProvider></MemoryRouter>);
beforeEach(() => { Object.assign(api, createMockApi()); });
afterEach(cleanup);

describe('Squirrel & Tree journeys', () => {
  it('shows the supplied mobile companion UI at the app root without the NFC status badge', async () => {
    mount('/');
    expect(await screen.findByRole('img', { name: 'Interactive Financial Planning Skill Tree' })).toBeTruthy();
    expect(screen.getByText('Tap a branch to learn and collect acorns')).toBeTruthy();
    expect(screen.queryByText(/NFC Connected/)).toBeNull();
  });

  it('opens the clickable topic tree after an NFC tap and supports a short practice question', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); mount('/tap?petId=mochi-01');
    await screen.findByRole('heading', { name: 'Welcome to the forest, Hazel' });
    await user.click(screen.getByRole('button', { name: /Budgeting/ }));
    await screen.findByRole('heading', { name: /Budgeting/ });
    await user.click(screen.getByLabelText('A periodic expense to plan for over time'));
    await user.click(screen.getByRole('button', { name: 'Check my answer' }));
    expect(await screen.findByText(/Known costs that do not happen every month/)).toBeTruthy();
  });

  it('onboards into Forest with a goal and full letter', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: 'Let’s grow something that’s yours' });
    expect((screen.getByLabelText('Squirrel name') as HTMLInputElement).value).toBe('');
    await user.type(screen.getByLabelText('Squirrel name'), 'Biscuit');
    await user.type(screen.getByLabelText('Goal name'), 'Emergency fund');
    await user.type(screen.getByLabelText('What future are you building?'), 'My future');
    await user.click(screen.getByRole('button', { name: 'Start my forest' }));
    await screen.findByRole('heading', { name: 'A little progress, growing every day' });
    expect(await api.getState()).toMatchObject({ initialized: true, pet: { name: 'Biscuit' }, goal: { targetAmount: 200 }, letter: { vision: 'My future' }, forest: { growthPercent: 0, treeStage: 'seedling' } });
  });

  it('saves a simple daily plan from the welcome check-in using the current budget API', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); mount();
    await screen.findByRole('heading', { name: 'A quick money check-in' });
    await user.type(screen.getByRole('spinbutton', { name: 'Daily budget in CAD' }), '18.50');
    await user.click(screen.getByRole('button', { name: 'Save daily plan' }));
    await screen.findByText('Daily plan saved. You can change it any time in Budget.');
    const budgets = await api.getBudgets(new Date().toISOString().slice(0, 7));
    expect(budgets).toMatchObject({ dailyLimit: 18.5 });
  });

  it('uses stable request IDs when a purchase choice response is lost', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding);
    const submit = api.submitDecision; const spy = vi.spyOn(api, 'submitDecision').mockImplementation(submit).mockImplementationOnce(async input => { await submit(input); throw new Error('Connection interrupted. Retry the action.'); });
    mount(); await screen.findByRole('heading', { name: 'Mindful purchase choice' });
    await user.type(screen.getByLabelText('What are you considering?'), 'Hoodie'); await user.type(screen.getByLabelText('Price (CAD)'), '60');
    await user.click(screen.getByRole('button', { name: 'Save my choice' })); await screen.findByText(/Connection interrupted/);
    await user.click(screen.getByRole('button', { name: 'Save my choice' }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    expect(spy.mock.calls[1]![0].requestId).toBe(spy.mock.calls[0]![0].requestId);
    expect(await api.getState()).toMatchObject({ wallet: { coins: 60, xp: 20 }, goal: { confirmedSaved: 0, potentialSavings: 60 }, forest: { growthPercent: 0 } });
  });

  it('grows the tree and reveals the first letter section only after actual savings', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); mount('/future');
    await screen.findByRole('heading', { name: 'Future Me time capsule' });
    expect(screen.getByText(/Sealed until 25%/)).toBeTruthy();
    const savings = screen.getByLabelText('Amount moved (CAD)'); await user.type(savings, '50');
    await user.click(screen.getByRole('button', { name: 'I actually moved this money' }));
    await screen.findByText('Confirmed savings recorded. Your goal and tree are up to date.');
    expect(await api.getState()).toMatchObject({ goal: { confirmedSaved: 50, progressPercent: 25 }, forest: { growthPercent: 25, treeStage: 'sapling' }, letter: { revealedSections: 1 } });
  });

  it('keeps transactions separate from savings and labels the ledger source', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); mount('/budget');
    await screen.findByRole('heading', { name: 'Log a transaction' });
    await user.type(screen.getByLabelText('What was it?'), 'Lunch'); await user.type(screen.getByLabelText('Amount (CAD)'), '18');
    await user.click(screen.getByRole('button', { name: 'Record transaction' })); await screen.findByText('Transaction recorded.');
    expect(await api.getState()).toMatchObject({ goal: { confirmedSaved: 0 }, budgetSummary: { spentThisMonth: 18 } });
    expect(screen.getByText('manual')).toBeTruthy();
  });

  it('persists a due worth-it reflection without rewards', async () => {
    await api.onboard(onboarding); await api.recordTransaction({ requestId: createRequestId(), name: 'Coffee', amount: 5, category: 'food', occurredAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString() });
    const stateBefore = await api.getState(); if (!stateBefore.initialized) throw new Error('Expected setup'); mount('/insights'); await screen.findByRole('heading', { name: 'How did it feel later?' });
    await screen.findByRole('button', { name: 'Worth it' }); await userEvent.setup().click(screen.getByRole('button', { name: 'Worth it' }));
    await waitFor(async () => { const current = await api.getState(); if (!current.initialized) throw new Error('Expected setup'); expect(current.wallet).toEqual(stateBefore.wallet); });
    expect((await api.getTransactions(new Date().toISOString().slice(0, 7))).transactions[0]?.reflection?.verdict).toBe('worth_it');
  });

  it('rewards a lesson once with acorns and tree progress', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); const lessons = await api.getLessons(); const lesson = lessons.lessons[0]!; const correctId = 'save'; mount('/learn');
    await screen.findByRole('heading', { name: lesson.title }); await user.click(screen.getByLabelText('Record money actually set aside'));
    await user.click(screen.getAllByRole('button', { name: 'Submit answer' })[0]!); await screen.findByText(/Collected \+5 acorns/);
    expect((await api.getLessons()).lessons.find(l => l.id === lesson.id)?.completed).toBe(true);
    const duplicate = await api.answerLesson({ requestId: createRequestId(), lessonId: lesson.id, selectedOptionId: correctId });
    expect(duplicate.reward).toEqual({ coins: 0, xp: 0 });
    const after = await api.getState(); if (!after.initialized) throw new Error('Expected setup'); expect(after.wallet.xp).toBe(10); expect(after.wallet.coins).toBe(5);
  });

  it('opening /report is read-only and check-in rewards only after explicit confirmation', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); await api.demoSeed({ xp: 100 });
    const checkIn = vi.spyOn(api, 'checkIn'); mount('/report');
    await screen.findByRole('heading', { name: 'A small forest check-in' }); expect(checkIn).not.toHaveBeenCalled();
    expect(await api.getDailyReport()).toMatchObject({ completedToday: false });
    await user.click(await screen.findByRole('button', { name: 'Complete check-in · +10 acorns' }));
    await screen.findByText(/Check-in complete!/); expect(checkIn).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Refresh report' })); await waitFor(() => expect(checkIn).toHaveBeenCalledTimes(1));
  });

  it('shows and edits the full original letter independently of reveal status', async () => {
    const user = userEvent.setup(); await api.onboard(onboarding); mount('/future');
    await screen.findByRole('heading', { name: 'Future Me time capsule' }); await user.click(screen.getByText('View and edit my full original letter'));
    const vision = screen.getByLabelText('Your vision'); expect((vision as HTMLTextAreaElement).value).toBe('My future');
    await user.clear(vision); await user.type(vision, 'Original words.'); await user.click(screen.getByRole('button', { name: 'Save full letter' }));
    await waitFor(async () => expect(await api.getState()).toMatchObject({ letter: { vision: 'Original words.', revealedSections: 0 } }));
  });
});
