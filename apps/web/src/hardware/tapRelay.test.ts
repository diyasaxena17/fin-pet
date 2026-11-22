import { afterEach, describe, expect, it, vi } from 'vitest';
import { TAP_CODE, isTapMessage, listenForTaps, sendToSquirrel, tapLink } from './tapRelay';

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

describe('squirrel relay', () => {
  it('uses one fixed tap code, so the NFC chip never needs reprogramming', () => {
    expect(TAP_CODE).toBe('mochi-tii645ranyxe');
    expect(tapLink()).toBe('https://ntfy.sh/mochi-tii645ranyxe/publish?message=wake');
  });

  it('tells phone taps apart from the app’s own mood messages', () => {
    for (const text of ['wake', 'tap', 'TAP ', '', undefined]) expect(isTapMessage(text)).toBe(true);
    for (const text of ['mood:p', 'mood!:w', 'sleep']) expect(isTapMessage(text)).toBe(false);
  });

  it('posts mood messages to the bridge', () => {
    const send = vi.fn(async () => undefined);
    sendToSquirrel('mood:p', 'mochi-test123', send);
    expect(send).toHaveBeenCalledWith('https://ntfy.sh/mochi-test123', { method: 'POST', body: 'mood:p' });
  });

  it('wakes once per tap, ignores keepalives, mood messages and double taps', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const onTap = vi.fn();
    const stop = listenForTaps(onTap, 'mochi-abc123', FakeSource as never);
    const source = FakeSource.last!;
    expect(source.url).toBe('https://ntfy.sh/mochi-abc123/sse');
    source.emit({ event: 'keepalive' });
    source.emit({ event: 'message', message: 'mood:p' });
    source.emit({ event: 'message', message: 'wake' });
    source.emit({ event: 'message', message: 'wake' });
    expect(onTap).toHaveBeenCalledTimes(1);
    vi.setSystemTime(Date.now() + 3000);
    source.emit({ event: 'message', message: 'tap' });
    expect(onTap).toHaveBeenCalledTimes(2);
    stop(); expect(source.closed).toBe(true);
  });

  it('does nothing without EventSource', () => {
    expect(() => listenForTaps(vi.fn(), 'mochi-abc123', undefined)()).not.toThrow();
  });
});
