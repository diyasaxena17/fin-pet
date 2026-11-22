/**
 * NFC wake-up relay. The phone's NFC automation opens the tap link, which posts a message to a
 * private ntfy.sh topic (free, no account). The app listens on that topic and wakes the squirrel.
 */
export const TAP_SERVER = 'https://ntfy.sh';
const STORAGE_KEY = 'mochi.squirrel.tapCode';
const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function isTapCode(code: string): boolean {
  return /^[A-Za-z0-9_-]{6,64}$/.test(code);
}

export function makeTapCode(random: () => number = Math.random): string {
  let code = 'mochi-';
  for (let index = 0; index < 12; index += 1) code += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return code;
}

export function tapLink(code: string): string {
  return `${TAP_SERVER}/${code}/publish?message=wake`;
}

export function loadTapCode(storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeStorage()): string {
  const saved = storage?.getItem(STORAGE_KEY) ?? '';
  if (isTapCode(saved)) return saved;
  const code = makeTapCode();
  try { storage?.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
  return code;
}

export function saveTapCode(code: string, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try { storage?.setItem(STORAGE_KEY, code); } catch { /* private mode */ }
}

type EventSourceFactory = new (url: string) => Pick<EventSource, 'close' | 'onmessage' | 'onopen' | 'onerror'>;

/** Calls onTap for each phone tap (double taps within 2.5 s count once). Returns a stop function. */
export function listenForTaps(
  code: string,
  onTap: () => void,
  onStatus: (status: 'listening' | 'reconnecting') => void = () => undefined,
  Source: EventSourceFactory | undefined = typeof EventSource === 'undefined' ? undefined : EventSource,
): () => void {
  if (!Source || !isTapCode(code)) return () => undefined;
  const source = new Source(`${TAP_SERVER}/${code}/sse`);
  let lastTap = 0;
  source.onopen = () => onStatus('listening');
  source.onerror = () => onStatus('reconnecting');
  source.onmessage = (event: MessageEvent<string>) => {
    try {
      const message = JSON.parse(event.data) as { event?: string };
      if (message.event && message.event !== 'message') return;
    } catch { return; }
    const now = Date.now();
    if (now - lastTap < 2500) return;
    lastTap = now;
    onTap();
  };
  return () => source.close();
}

function safeStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
