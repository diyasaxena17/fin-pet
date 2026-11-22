/**
 * USB link to the physical squirrel (hardware-connection/squirrel.ino) using Web Serial.
 * Works in Chrome or Edge on a computer. One letter per command at 9600 baud:
 *   i idle · p happy dance · w worried · d sad · t talking · z sleep (screen off, servo released)
 */
export type SquirrelLetter = 'i' | 'p' | 'w' | 'd' | 't' | 'z';
export type LinkStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

/** How long the Arduino plays each mood before going back to idle by itself. */
export const MOOD_MS: Readonly<Partial<Record<SquirrelLetter, number>>> = { p: 2800, w: 5200, d: 5200 };

/** Arduino 101, Arduino, Arduino (.org), CH340, FTDI and CP210x USB serial chips. */
export const SQUIRREL_USB_FILTERS = [0x8087, 0x2341, 0x2a03, 0x1a86, 0x0403, 0x10c4].map(usbVendorId => ({ usbVendorId }));

export interface SerialPortLike {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
}
export interface SerialLike {
  requestPort(options?: { filters?: { usbVendorId?: number }[] }): Promise<SerialPortLike>;
  getPorts(): Promise<SerialPortLike[]>;
  addEventListener(type: 'disconnect', listener: (event: Event) => void): void;
  removeEventListener(type: 'disconnect', listener: (event: Event) => void): void;
}

export function browserSerial(): SerialLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { serial?: SerialLike }).serial ?? null;
}

export class SquirrelLink {
  status: LinkStatus;
  private port: SerialPortLike | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private pending: SquirrelLetter | null = null;
  private readyTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<(status: LinkStatus) => void>();
  private readonly onUnplug = () => { void this.drop(); };

  /** wakeDelayMs: the Arduino restarts when the port opens, so commands wait this long. */
  constructor(private readonly serial: SerialLike | null = browserSerial(), private readonly wakeDelayMs = 2200) {
    this.status = serial ? 'disconnected' : 'unsupported';
    serial?.addEventListener('disconnect', this.onUnplug);
  }

  subscribe(listener: (status: LinkStatus) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** Reopens a squirrel the browser already has permission for (no click needed). */
  async reconnect(): Promise<boolean> {
    if (!this.serial || this.port) return Boolean(this.port);
    const [port] = await this.serial.getPorts().catch(() => []);
    if (!port) return false;
    return this.open(port);
  }

  /** Shows the browser's port picker. Must run from a click. */
  async connect(): Promise<boolean> {
    if (!this.serial) return false;
    if (this.port) return true;
    try {
      return await this.open(await this.serial.requestPort({ filters: SQUIRREL_USB_FILTERS }));
    } catch {
      this.setStatus('disconnected');
      return false;
    }
  }

  /** Sends one command. Commands sent while the Arduino is still starting are held (latest wins). */
  send(letter: SquirrelLetter): boolean {
    if (!this.writer || this.status !== 'connected') {
      if (this.port) this.pending = letter;
      return false;
    }
    this.writer.write(new TextEncoder().encode(letter)).catch(() => { void this.drop(); });
    return true;
  }

  async disconnect(): Promise<void> {
    if (this.writer) await this.writer.write(new TextEncoder().encode('z')).catch(() => undefined);
    await this.drop();
  }

  dispose(): void {
    this.serial?.removeEventListener('disconnect', this.onUnplug);
    void this.drop();
  }

  private async open(port: SerialPortLike): Promise<boolean> {
    this.setStatus('connecting');
    try {
      await port.open({ baudRate: 9600 });
      if (!port.writable) throw new Error('Port is not writable');
      this.port = port;
      this.writer = port.writable.getWriter();
      this.drainReplies(port);
      this.readyTimer = setTimeout(() => {
        this.readyTimer = null;
        this.setStatus('connected');
        const queued = this.pending;
        this.pending = null;
        if (queued) this.send(queued);
      }, this.wakeDelayMs);
      return true;
    } catch {
      this.port = null;
      this.writer = null;
      this.setStatus('disconnected');
      return false;
    }
  }

  /** The Arduino answers READY / OK <letter>; reading keeps its buffer empty and spots unplugging. */
  private drainReplies(port: SerialPortLike): void {
    if (!port.readable) return;
    const reader = port.readable.getReader();
    this.reader = reader;
    void (async () => {
      try {
        for (;;) { const { done } = await reader.read(); if (done) break; }
      } catch { /* unplugged or closed */ }
      if (this.port === port) await this.drop();
    })();
  }

  private async drop(): Promise<void> {
    const { port, writer, reader } = this;
    this.port = null; this.writer = null; this.reader = null; this.pending = null;
    if (this.readyTimer) { clearTimeout(this.readyTimer); this.readyTimer = null; }
    try { await reader?.cancel(); } catch { /* already closed */ }
    try { reader?.releaseLock(); } catch { /* already released */ }
    try { writer?.releaseLock(); } catch { /* already released */ }
    try { await port?.close(); } catch { /* already closed */ }
    if (this.serial) this.setStatus('disconnected');
  }

  private setStatus(status: LinkStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}
