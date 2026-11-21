import { createAppState, type AppState, type MochiApi, type MutationResponse } from '@mochi/contracts';

function positiveCents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Amount must be a positive integer in cents');
}

function refreshProgress(state: AppState) {
  state.wallet.level = state.wallet.xp >= 300 ? 3 : state.wallet.xp >= 100 ? 2 : 1;
  state.features = { quests: state.wallet.level >= 2, projection: state.wallet.level >= 3 };
  const fraction = state.goal.savedCents / state.goal.targetCents;
  state.letter.revealedSections = [0.25, 0.5, 1].filter((threshold) => fraction >= threshold).length;
}

/** Session-only, independent mutable state for isolated frontend development. */
export function createMockApi(): MochiApi {
  let state = createAppState();
  const response = (): MutationResponse => {
    refreshProgress(state);
    return { state: structuredClone(state) };
  };
  return {
    async getState() { return structuredClone(state); },
    async onboard(body) {
      positiveCents(body.goal.targetCents);
      if (!body.name.trim() || !body.petName.trim() || !body.goal.name.trim() || body.letter.sections.length !== 3) throw new Error('Complete the profile, goal, and three letter sections');
      state = createAppState();
      state.onboarded = true;
      state.profile = { name: body.name, petName: body.petName };
      state.goal = { ...body.goal, savedCents: 0 };
      state.letter.sections = structuredClone(body.letter.sections);
      return response();
    },
    async updateLetter(body) {
      if (body.sections.length !== 3) throw new Error('Exactly three letter sections are required');
      state.letter.sections = structuredClone(body.sections);
      return response();
    },
    async submitDecision(body) {
      positiveCents(body.amountCents);
      if (body.choice === 'skip') {
        state.wallet.coins += Math.floor(body.amountCents / 100);
        state.wallet.xp += 20;
        state.savings.potentialCents += body.amountCents;
      }
      return response();
    },
    async recordSavings(body) {
      positiveCents(body.amountCents);
      state.savings.confirmedCents += body.amountCents;
      state.goal.savedCents += body.amountCents;
      return response();
    },
    async feedPet() {
      if (state.wallet.coins < 20) throw new Error('Feeding requires 20 coins');
      state.wallet.coins -= 20;
      state.pet.mood = 'happy';
      state.pet.reactionSeq += 1;
      return response();
    },
    async completeQuest(body) {
      const quest = state.quests.find((entry) => entry.id === body.questId);
      if (!state.features.quests || !quest || (quest.id === 'first-save' && state.savings.confirmedCents === 0)) throw new Error('Quest is not available');
      if (!quest.completed) {
        quest.completed = true;
        state.wallet.coins += 10;
        state.wallet.xp += 20;
      }
      return response();
    },
    async demoSeed(body) {
      if (![1, 2, 3].includes(body.level)) throw new Error('Invalid demo level');
      // Preserve progress and the reaction counter; seeds only adjust level/XP.
      state.wallet.xp = body.level === 3 ? 300 : body.level === 2 ? 100 : 0;
      return response();
    },
  };
}

export const mockApi = createMockApi();
