import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AddendumAppState } from '@mochi/contracts';
import { useAppState } from '../lib/appState';
import { reactionFor } from './squirrelMoods';
import { listenForTaps, sendToSquirrel, type SquirrelLetter } from './tapRelay';

export interface SquirrelContextValue {
  /** Goes up by one on every NFC tap, so screens can open the daily check-in. */
  wakeCount: number;
  /** Plays a mood on the squirrel if it is awake (app events). */
  react(letter: SquirrelLetter): void;
  /** Wakes the squirrel if needed and plays a mood (test buttons). */
  play(letter: SquirrelLetter): void;
  /** Same as tapping the NFC chip: the bridge wakes the squirrel and the app opens the check-in. */
  testTap(): void;
}

const SquirrelContext = createContext<SquirrelContextValue | null>(null);

interface ProviderProps {
  children: ReactNode;
  /** Test seams. */
  send?: (message: string) => void;
  eventSource?: Parameters<typeof listenForTaps>[2] | null;
}

/**
 * The squirrel itself is driven by the bridge (hardware-connection/windows-bridge.ps1), which owns the USB
 * port. The app only sends moods for its own events and listens for NFC taps; there is no hardware UI.
 */
export function SquirrelProvider({ children, send = message => sendToSquirrel(message), eventSource }: ProviderProps) {
  const { state } = useAppState();
  const [wakeCount, setWakeCount] = useState(0);
  const previous = useRef<AddendumAppState | null>(state);
  const sendRef = useRef(send);
  sendRef.current = send;

  useEffect(() => {
    const letter = reactionFor(previous.current, state);
    previous.current = state;
    if (letter) sendRef.current(`mood:${letter}`);
  }, [state]);

  useEffect(() => {
    if (eventSource === null) return;
    return listenForTaps(() => setWakeCount(count => count + 1), undefined, eventSource);
  }, [eventSource]);

  const value = useMemo<SquirrelContextValue>(() => ({
    wakeCount,
    react: letter => sendRef.current(`mood:${letter}`),
    play: letter => sendRef.current(`mood!:${letter}`),
    testTap: () => sendRef.current('wake'),
  }), [wakeCount]);

  return <SquirrelContext.Provider value={value}>{children}</SquirrelContext.Provider>;
}

/** Null outside SquirrelProvider, so screens can render without it. */
export function useSquirrel(): SquirrelContextValue | null {
  return useContext(SquirrelContext);
}
