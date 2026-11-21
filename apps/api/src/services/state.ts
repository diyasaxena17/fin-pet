import { createAppState, type AppState, type DeviceStateResponse } from '@mochi/contracts';

export function getState(): AppState {
  return createAppState();
}

export function getDeviceState(): DeviceStateResponse {
  const state = getState();
  return {
    schemaVersion: state.schemaVersion,
    petName: state.profile.petName,
    level: state.wallet.level,
    mood: state.pet.mood,
    reactionSeq: state.pet.reactionSeq,
  };
}
