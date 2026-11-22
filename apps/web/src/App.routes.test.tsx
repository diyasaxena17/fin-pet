import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
vi.mock('./mochi-ui/App', () => ({ App: () => <h1>Forest companion preview</h1> }));
vi.mock('./LegacyApp', () => ({ App: () => <h1>Live account routes</h1> }));
vi.mock('./signals/SignalsApp', () => ({ SignalsApp: () => <h1>Behavioural tools</h1> }));
afterEach(cleanup);
describe('merged experience routing', () => {
  it.each([
    ['/', 'Forest companion preview'], ['/?legacy=1', 'Live account routes'],
    ['/settings', 'Live account routes'], ['/report', 'Live account routes'],
    ['/signals', 'Behavioural tools'], ['/intent', 'Behavioural tools'],
    ['/check-ins', 'Behavioural tools'], ['/lab', 'Behavioural tools'],
  ])('keeps %s reachable', async (path, heading) => {
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: heading })).toBeTruthy();
  });
});
