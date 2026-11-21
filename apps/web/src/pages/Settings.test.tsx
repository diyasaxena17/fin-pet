import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { AppProvider } from '../lib/appState';
import { api } from '../lib/api';
import { createMockApi } from '../lib/mockApi';

vi.mock('../lib/api', () => ({ api: {} }));
const onboard = { petName: 'Mochi', goalTitle: 'Fund', goalTarget: 200,
  letter: { vision: '  Original words.\n', why: 'Choices', reminder: 'Small steps' } };
const mount = () => render(<MemoryRouter initialEntries={['/settings']}><AppProvider><App /></AppProvider></MemoryRouter>);
beforeEach(async () => { Object.assign(api, createMockApi()); await api.onboard(onboard); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('name and voice settings', () => {
  it('retains edits after a lost save response and retries without touching progress', async () => {
    const user = userEvent.setup();
    const before = await api.getState();
    const update = api.updatePreferences;
    const save = vi.spyOn(api, 'updatePreferences').mockImplementation(update).mockImplementationOnce(async (input) => {
      await update(input); throw new Error('Connection interrupted. Try saving again.');
    });
    mount();
    const name = await screen.findByLabelText('Squirrel name');
    expect((name as HTMLInputElement).value).toBe('Mochi');
    expect(screen.getByText(/Voice preview is unavailable/)).toBeTruthy();
    await user.clear(name); await user.type(name, '  Clover  ');
    await user.click(screen.getByRole('radio', { name: /Calm/ }));
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await screen.findByText('Connection interrupted. Try saving again.');
    expect((name as HTMLInputElement).value).toBe('  Clover  ');
    expect((screen.getByRole('radio', { name: /Calm/ }) as HTMLInputElement).checked).toBe(true);
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await screen.findByText('Your name and voice are saved.');
    expect(save.mock.calls[0]![0]).toEqual({ petName: 'Clover', voice: 'calm' });
    expect(save.mock.calls[1]![0]).toEqual(save.mock.calls[0]![0]);
    expect(await api.getState()).toEqual(before.initialized ? { ...before,
      pet: { ...before.pet, name: 'Clover' }, preferences: { voice: 'calm' } } : before);
    await user.click(screen.getByRole('link', { name: 'Back to dashboard' }));
    await screen.findByText('Clover is feeling neutral today');
    await user.click(screen.getByRole('link', { name: 'Settings' }));
    expect(((await screen.findByLabelText('Squirrel name')) as HTMLInputElement).value).toBe('Clover');
    expect((screen.getByRole('radio', { name: /Calm/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('rejects a whitespace-only name and resets the draft without saving', async () => {
    const user = userEvent.setup(); const save = vi.spyOn(api, 'updatePreferences');
    mount(); const name = await screen.findByLabelText('Squirrel name');
    await user.clear(name); await user.type(name, '  ');
    await user.click(screen.getByRole('radio', { name: /Calm/ }));
    await user.click(screen.getByRole('button', { name: 'Save preferences' }));
    await screen.findByText('Give your squirrel a name.');
    expect(save).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Reset changes' }));
    expect((name as HTMLInputElement).value).toBe('Mochi');
    expect((screen.getByRole('radio', { name: /Cute/ }) as HTMLInputElement).checked).toBe(true);
  });

  it('previews distinct tones without saving and handles unavailable audio', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('SpeechSynthesisUtterance', class { constructor(public text: string) {} });
    const speak = vi.fn((speech: SpeechSynthesisUtterance) => speech.onstart?.call(speech, {} as SpeechSynthesisEvent));
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', { speak, cancel, getVoices: () => [] });
    const save = vi.spyOn(api, 'updatePreferences');
    const view = mount();
    await screen.findByLabelText('Squirrel name');
    await user.click(screen.getByRole('button', { name: 'Preview cute voice' }));
    await screen.findByText('Playing the cute voice preview.');
    const cute = speak.mock.calls[0]![0];
    await user.click(screen.getByRole('radio', { name: /Calm/ }));
    await user.click(screen.getByRole('button', { name: 'Preview calm voice' }));
    const calm = speak.mock.calls[1]![0];
    expect(cute.pitch).toBeGreaterThan(calm.pitch);
    expect(cute.rate).toBeGreaterThan(calm.rate);
    act(() => cute.onend?.call(cute, {} as SpeechSynthesisEvent));
    expect(screen.getByText('Playing the calm voice preview.')).toBeTruthy();
    act(() => calm.onerror?.call(calm, {} as SpeechSynthesisErrorEvent));
    await screen.findByText('The preview could not play. You can still save this voice.');
    expect(save).not.toHaveBeenCalled();
    view.unmount();
    await waitFor(() => expect(cancel).toHaveBeenCalled());
  });
});
