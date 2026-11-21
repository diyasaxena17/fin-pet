import { describe, expect, it } from 'vitest';
import rawFixture from '../fixtures/app-state.json';
import { appStateFixture, createAppState } from './index';

describe('frozen shared fixture', () => {
  it('exports the JSON unchanged and recursively frozen', () => {
    expect(appStateFixture).toEqual(rawFixture);
    expect(Object.isFrozen(appStateFixture.wallet)).toBe(true);
    expect(Object.isFrozen(appStateFixture.letter.sections)).toBe(true);
    expect(appStateFixture.letter.sections).toHaveLength(3);
  });
  it('isolates consumers from each other and the fixture', () => {
    const state = createAppState();
    state.wallet.coins = 60;
    state.letter.sections[0] = 'Hello future me';
    expect(createAppState().wallet.coins).toBe(0);
    expect(appStateFixture.letter.sections[0]).toBe('');
  });
});
