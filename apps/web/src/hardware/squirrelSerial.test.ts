import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SQUIRREL_USB_FILTERS, SquirrelLink, type SerialLike, type SerialPortLike } from './squirrelSerial';

function fakePort() {
  const written: string[] = [];
  let closed = false;
  const port: SerialPortLike & { written: string[]; isClosed(): boolean } = {
    written,
    isClosed: () => closed,
    open: vi.fn(async () => undefined),
    close: vi.fn(async () => { closed = true; }),
    readable: new ReadableStream<Uint8Array>({ start() { /* the Arduino stays quiet in tests */ } }),
    writable: new WritableStream<Uint8Array>({ write(chunk) { written.push(new TextDecoder().decode(chunk)); } }),
  };
  return port;
}
function fakeSerial(ports: SerialPortLike[] = []) {
  const listeners = new Set<(event: Event) => void>();
  const serial: SerialLike & { unplug(): void } = {
    requestPort: vi.fn(async () => { const port = fakePort(); ports.push(port); return port; }),
    getPorts: vi.fn(async () => ports),
    addEventListener: (_type, listener) => { listeners.add(listener); },
    removeEventListener: (_type, listener) => { listeners.delete(listener); },
    unplug: () => { for (const listener of listeners) listener(new Event('disconnect')); },
  };
  return serial;
}
const flush = async () => { for (let index = 0; index < 10; index += 1) await Promise.resolve(); };

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => { vi.useRealTimers(); });

describe('SquirrelLink', () => {
  it('reports unsupported browsers', () => {
    expect(new SquirrelLink(null).status).toBe('unsupported');
  });

  it('opens the picked port at 9600 baud, waits for the Arduino to boot, then sends letters', async () => {
    const serial = fakeSerial();
    const link = new SquirrelLink(serial, 2200);
    const statuses: string[] = [];
    link.subscribe(status => statuses.push(status));
    expect(await link.connect()).toBe(true);
    expect(serial.requestPort).toHaveBeenCalledWith({ filters: SQUIRREL_USB_FILTERS });
    const port = (await serial.getPorts())[0] as ReturnType<typeof fakePort>;
    expect(port.open).toHaveBeenCalledWith({ baudRate: 9600 });
    expect(link.send('z')).toBe(false);           // still booting: held
    expect(link.send('p')).toBe(false);           // latest command wins
    vi.advanceTimersByTime(2200);
    await vi.runAllTimersAsync(); await flush();
    expect(statuses).toEqual(['connecting', 'connected']);
    expect(port.written).toEqual(['p']);
    expect(link.send('w')).toBe(true);
    await flush();
    expect(port.written).toEqual(['p', 'w']);
  });

  it('reconnects to an already-allowed squirrel without a click', async () => {
    const port = fakePort();
    const link = new SquirrelLink(fakeSerial([port]), 0);
    expect(await link.reconnect()).toBe(true);
    await vi.runAllTimersAsync();
    expect(link.status).toBe('connected');
  });

  it('puts the squirrel to sleep on disconnect and notices unplugging', async () => {
    const serial = fakeSerial();
    const link = new SquirrelLink(serial, 0);
    await link.connect(); await vi.runAllTimersAsync();
    const port = (await serial.getPorts())[0] as ReturnType<typeof fakePort>;
    await link.disconnect();
    expect(port.written).toEqual(['z']);
    expect(port.isClosed()).toBe(true);
    expect(link.status).toBe('disconnected');

    await link.connect(); await vi.runAllTimersAsync();
    serial.unplug(); await flush(); await flush();
    expect(link.status).toBe('disconnected');
    expect(link.send('p')).toBe(false);
  });

  it('stays disconnected when the picker is cancelled', async () => {
    const serial = fakeSerial();
    serial.requestPort = vi.fn(async () => { throw new DOMException('No port selected by the user.', 'NotFoundError'); });
    const link = new SquirrelLink(serial, 0);
    expect(await link.connect()).toBe(false);
    expect(link.status).toBe('disconnected');
  });
});
