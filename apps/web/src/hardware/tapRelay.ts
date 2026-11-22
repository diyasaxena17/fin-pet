/**
 * Message relay between the phone, the app and the squirrel bridge (hardware-connection/windows-bridge.ps1),
 * using one fixed private ntfy.sh topic (free, no account).
 *   phone NFC tap  → "wake" (or "tap")  → bridge wakes the squirrel; the app opens the daily check-in
 *   app            → "mood:<letter>"    → bridge plays that mood if the squirrel is awake
 *   app            → "mood!:<letter>"   → bridge wakes it and plays that mood (test buttons)
 * Letters: i idle · p happy dance · w worried · d sad · t talking · z sleep
 */
export const TAP_SERVER = 'https://ntfy.sh';
export const TAP_CODE: string = import.meta.env.VITE_MOCHI_TAP_CODE || 'mochi-tii645ranyxe';
export const tapLink = (code: string = TAP_CODE) => `${TAP_SERVER}/${code}/publish?message=wake`;

export type SquirrelLetter = 'i' | 'p' | 'w' | 'd' | 't' | 'z';

/** True for a phone tap (or a test tap), false for the app's own mood messages. */
export function isTapMessage(message: string | undefined): boolean {
  const text = (message ?? '').trim().toLowerCase();
  return text === '' || text === 'wake' || text === 'tap' || text === 'triggered';
}

type Send = (url: string, init: RequestInit) => Promise<unknown>;

/** Fire-and-forget message to the bridge. */
export function sendToSquirrel(message: string, code: string = TAP_CODE, send: Send = (url, init) => fetch(url, init)): void {
  void send(`${TAP_SERVER}/${code}`, { method: 'POST', body: message }).catch(() => undefined);
}

type EventSourceFactory = new (url: string) => Pick<EventSource, 'close' | 'onmessage' | 'onopen' | 'onerror'>;

/** Calls onTap for each phone tap (double taps within 2.5 s count once). Returns a stop function. */
export function listenForTaps(
  onTap: () => void,
  code: string = TAP_CODE,
  Source: EventSourceFactory | undefined = typeof EventSource === 'undefined' ? undefined : EventSource,
): () => void {
  if (!Source) return () => undefined;
  const source = new Source(`${TAP_SERVER}/${code}/sse`);
  let lastTap = 0;
  source.onmessage = (event: MessageEvent<string>) => {
    try {
      const data = JSON.parse(event.data) as { event?: string; message?: string };
      if ((data.event && data.event !== 'message') || !isTapMessage(data.message)) return;
    } catch { return; }
    const now = Date.now();
    if (now - lastTap < 2500) return;
    lastTap = now;
    onTap();
  };
  return () => source.close();
}
