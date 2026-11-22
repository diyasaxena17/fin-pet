import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AddendumAppState } from '@mochi/contracts';
import { api } from '../lib/api';
import { useAppState } from '../lib/appState';
import { budgetLetter, budgetLine, reactionFor } from './squirrelMoods';
import { MOOD_MS, SquirrelLink, type LinkStatus, type SquirrelLetter } from './squirrelSerial';
import { isTapCode, listenForTaps, loadTapCode, makeTapCode, saveTapCode } from './tapRelay';

export interface SquirrelContextValue {
  status: LinkStatus;
  awake: boolean;
  tapCode: string;
  tapStatus: 'off' | 'listening' | 'reconnecting';
  message: string;
  /** Goes up by one every time the squirrel is woken (NFC tap or Wake up). */
  wakeCount: number;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  wake(source?: string): void;
  sleep(): void;
  /** Plays a mood, waking the squirrel first if needed (test buttons). */
  play(letter: SquirrelLetter): void;
  /** Plays a mood only if the squirrel is awake (app events). */
  react(letter: SquirrelLetter): void;
  setTapCode(code: string): boolean;
  newTapCode(): void;
}

const SquirrelContext = createContext<SquirrelContextValue | null>(null);
const REPORT_DELAY_MS = MOOD_MS.p ?? 2800;
const TALK_TEST_MS = 4000;

interface ProviderProps {
  children: ReactNode;
  /** Test seams. The real app uses Web Serial and the browser's EventSource. */
  link?: SquirrelLink;
  eventSource?: Parameters<typeof listenForTaps>[3] | null;
}

/**
 * Runs the physical squirrel from inside the app: NFC taps wake it with a happy dance and today's
 * budget mood, app events (check-in, level up, savings, overspending) play moods while it is awake,
 * it sways its tail while the app speaks, and Goodbye (or closing the app) puts it to sleep.
 */
export function SquirrelProvider({ children, link: providedLink, eventSource }: ProviderProps) {
  const { state } = useAppState();
  const [link] = useState(() => providedLink ?? new SquirrelLink());
  const [status, setStatus] = useState<LinkStatus>(link.status);
  const [awake, setAwake] = useState(false);
  const [tapCode, setTapCodeState] = useState(loadTapCode);
  const [tapStatus, setTapStatus] = useState<SquirrelContextValue['tapStatus']>('off');
  const [message, setMessage] = useState('');
  const [wakeCount, setWakeCount] = useState(0);
  const awakeRef = useRef(false);
  const speaking = useRef(false);
  const moodUntil = useRef(0);
  const lastSent = useRef<SquirrelLetter | ''>('');
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const stateRef = useRef<AddendumAppState | null>(state);

  const later = useCallback((ms: number, run: () => void) => {
    const timer = setTimeout(() => { timers.current.delete(timer); run(); }, ms);
    timers.current.add(timer);
  }, []);

  /** Outside a mood, keep the squirrel asleep, talking, or idle to match the app. */
  const syncBase = useCallback(() => {
    if (Date.now() < moodUntil.current) return;
    const want: SquirrelLetter = !awakeRef.current ? 'z' : speaking.current ? 't' : 'i';
    if (want !== lastSent.current && link.send(want)) lastSent.current = want;
  }, [link]);

  const play = useCallback((letter: SquirrelLetter) => {
    const ms = MOOD_MS[letter] ?? (letter === 't' ? TALK_TEST_MS : 0);
    if (!ms) { lastSent.current = ''; syncBase(); return; }
    moodUntil.current = Date.now() + ms;
    link.send(letter);
    lastSent.current = letter;
    later(ms + 150, syncBase);
  }, [later, link, syncBase]);

  const wake = useCallback((source = 'Woken up') => {
    awakeRef.current = true;
    setAwake(true);
    setWakeCount(count => count + 1);
    play('p');
    setMessage(`${source}: happy dance!`);
    const current = stateRef.current;
    if (!current?.initialized) return;
    api.getDailyReport().then(report => {
      const letter = budgetLetter(report.spentToday, report.dailyLimit);
      setMessage(`${source}: ${budgetLine(report.spentToday, report.dailyLimit)}`);
      if (letter === 'w' || letter === 'd') later(REPORT_DELAY_MS, () => { if (awakeRef.current) play(letter); });
    }).catch(() => undefined);
  }, [later, play]);

  const sleep = useCallback(() => {
    awakeRef.current = false;
    setAwake(false);
    moodUntil.current = 0;
    lastSent.current = '';
    syncBase();
    setMessage('Goodnight! The squirrel is asleep until the next tap.');
  }, [syncBase]);

  useEffect(() => link.subscribe(next => {
    setStatus(next);
    if (next === 'connected') { lastSent.current = ''; syncBase(); }
  }), [link, syncBase]);

  useEffect(() => {
    void link.reconnect();
    const pending = timers.current;
    return () => { for (const timer of pending) clearTimeout(timer); pending.clear(); };
  }, [link]);

  // App events → moods (only while awake; the NFC tap is what wakes the squirrel).
  useEffect(() => {
    const letter = reactionFor(stateRef.current, state);
    stateRef.current = state;
    if (letter && awakeRef.current) play(letter);
  }, [state, play]);

  // Tail sways while the app is speaking (voice previews and any future voice features).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const poll = setInterval(() => {
      const now = window.speechSynthesis.speaking;
      if (now !== speaking.current) { speaking.current = now; syncBase(); }
    }, 400);
    return () => clearInterval(poll);
  }, [syncBase]);

  // Phone NFC taps arrive through the relay.
  useEffect(() => {
    if (eventSource === null) return;
    setTapStatus('off');
    return listenForTaps(tapCode, () => wake('NFC tap'), setTapStatus, eventSource);
  }, [tapCode, wake, eventSource]);

  const value = useMemo<SquirrelContextValue>(() => ({
    status, awake, tapCode, tapStatus, message, wakeCount,
    connect: async () => {
      const ok = await link.connect();
      setMessage(ok ? 'Squirrel connected. Tap the NFC chip (or press Wake up) to wake it.' : link.status === 'unsupported'
        ? 'This browser can’t reach USB devices. Open the app in Chrome or Edge on a computer.' : 'No squirrel selected.');
    },
    disconnect: async () => { await link.disconnect(); setMessage('Squirrel disconnected.'); },
    wake, sleep,
    play: letter => { if (!awakeRef.current) { awakeRef.current = true; setAwake(true); } play(letter); },
    react: letter => { if (awakeRef.current) play(letter); },
    setTapCode: code => {
      const trimmed = code.trim();
      if (!isTapCode(trimmed)) return false;
      saveTapCode(trimmed); setTapCodeState(trimmed); return true;
    },
    newTapCode: () => { const code = makeTapCode(); saveTapCode(code); setTapCodeState(code); },
  }), [status, awake, tapCode, tapStatus, message, wakeCount, link, wake, sleep, play]);

  return <SquirrelContext.Provider value={value}>{children}</SquirrelContext.Provider>;
}

/** Null outside SquirrelProvider, so screens can render without the hardware layer. */
export function useSquirrel(): SquirrelContextValue | null {
  return useContext(SquirrelContext);
}
