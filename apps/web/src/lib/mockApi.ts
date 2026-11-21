import {
  onboardingSchema, letterInputSchema, decisionSchema, savingsSchema,
  feedSchema, questSchema, demoSeedSchema, type MochiApi,
} from '@mochi/contracts';
import { applyAction, emptyStoredState, getAppState, requireInitialized, type Action } from '@mochi/domain';

/** Each mock session uses the server's domain rules without network or disk access. */
export function createMockApi(options: { clock?: () => Date; timeZone?: string } = {}): MochiApi {
  let stored = emptyStoredState();
  const clock = options.clock ?? (() => new Date());
  const dispatch = (action: Action) => {
    const now = clock();
    stored = applyAction(stored, action, now, options.timeZone);
    return getAppState(stored, now, options.timeZone);
  };
  return {
    async getState() { return getAppState(stored, clock(), options.timeZone); },
    async onboard(input) { return requireInitialized(dispatch({ type: 'onboard', input: onboardingSchema.parse(input) })); },
    async updateLetter(input) { return requireInitialized(dispatch({ type: 'letter', input: letterInputSchema.parse(input) })); },
    async submitDecision(input) { return requireInitialized(dispatch({ type: 'decision', input: decisionSchema.parse(input) })); },
    async recordSavings(input) { return requireInitialized(dispatch({ type: 'savings', input: savingsSchema.parse(input) })); },
    async feedPet(input) { return requireInitialized(dispatch({ type: 'feed', input: feedSchema.parse(input) })); },
    async completeQuest(input) { return requireInitialized(dispatch({ type: 'quest', input: questSchema.parse(input) })); },
    async demoSeed(input) { return requireInitialized(dispatch({ type: 'seed', input: demoSeedSchema.parse(input) })); },
    async demoReset() { return dispatch({ type: 'reset' }); },
  };
}
export const mockApi = createMockApi();
