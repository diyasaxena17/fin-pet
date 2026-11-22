import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AddendumAppState } from '@mochi/contracts';
import { api } from './api';
import { createRequestId } from './requestId';

interface AppContextValue {
  state: AddendumAppState | null;
  error: string;
  busy: boolean;
  reload(): void;
  mutate(key: string, operation: (requestId: string) => Promise<AddendumAppState>): Promise<boolean>;
}
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AddendumAppState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const running = useRef(false);
  const pendingIds = useRef(new Map<string, string>());
  useEffect(() => {
    let active = true;
    setError('');
    api.getState().then((value) => { if (active) setState(value); }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your forest.');
    });
    return () => { active = false; };
  }, [loadVersion]);

  async function mutate(key: string, operation: (requestId: string) => Promise<AddendumAppState>): Promise<boolean> {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError('');
    const requestId = pendingIds.current.get(key) ?? createRequestId();
    pendingIds.current.set(key, requestId);
    try {
      const next = await operation(requestId);
      setState(next);
      if (!next.initialized) pendingIds.current.clear();
      else pendingIds.current.delete(key);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to complete the action. Please retry.');
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return <AppContext.Provider value={{ state, error, busy, reload: () => setLoadVersion((value) => value + 1), mutate }}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error('AppProvider is required');
  return context;
}
