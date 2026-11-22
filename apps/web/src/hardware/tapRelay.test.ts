import { afterEach, describe, expect, it, vi } from 'vitest';
import { isTapCode, listenForTaps, loadTapCode, makeTapCode, tapLink } from './tapRelay';

class FakeSource {
  static last: FakeSource | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  constructor(public url: string) { FakeSource.last = this; }
  close() { this.closed = true; }
  emit(data: unknown) { this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>); }
}
afterEach(() => { vi.useRealTimers(); });

describe('NFC tap relay', () => {
  it('makes private, valid tap codes and phone links', () => {
    const code = makeTapCode(() => 0);
    expect(code).toBe('mochi-aaaaaaaaaaaa');
    expect(isTapCode(code)).toBe(true);
    expect(isTapCode('bad code!')).toBe(false);
    expect(tapLink('mochi-abc123')).toBe('https://ntfy.sh/mochi-abc123/publish?message=wake');
  });

  it('remembers the tap code per install', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    const first = loadTapCode(storage);
    expect(loadTapCode(storage)).toBe(first);
  });

  it('wakes once per tap, ignores keepalives and double taps, and stops cleanly', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const onTap = vi.fn(); const onStatus = vi.fn();
    const stop = listenForTaps('mochi-abc123', onTap, onStatus, FakeSource as never);
    const source = FakeSource.last!;
    expect(source.url).toBe('https://ntfy.sh/mochi-abc123/sse');
    source.onopen?.(); expect(onStatus).toHaveBeenCalledWith('listening');
    source.emit({ event: 'keepalive' });
    source.emit({ event: 'message', message: 'wake' });
    source.emit({ event: 'message', message: 'wake' });
    expect(onTap).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 3000);
    source.emit({ event: 'message', message: 'tap' });
    expect(onTap).toHaveBeenCalledTimes(2);
    stop(); expect(source.closed).toBe(true);
  });

  it('does nothing without EventSource or with a bad code', () => {
    expect(() => listenForTaps('mochi-abc123', vi.fn(), undefined, undefined)()).not.toThrow();
    FakeSource.last = null;
    listenForTaps('no', vi.fn(), undefined, FakeSource as never);
    expect(FakeSource.last).toBeNull();
  });
});
