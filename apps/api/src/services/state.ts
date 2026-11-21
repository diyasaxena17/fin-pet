import { applyAction, getAppState, type Action } from '@mochi/domain';
import type { StateRepository } from '../persistence/repository.js';

export function createStateService(repository: StateRepository, options: { clock?: () => Date; timeZone?: string } = {}) {
  const clock = options.clock ?? (() => new Date());
  return {
    async getState() { return getAppState(await repository.read(), clock(), options.timeZone); },
    async dispatch(action: Action) {
      const now = clock();
      const stored = await repository.transact((state) => applyAction(state, action, now, options.timeZone));
      return getAppState(stored, now, options.timeZone);
    },
  };
}
