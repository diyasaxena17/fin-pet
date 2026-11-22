/** Continuous speech recognition (Chrome / Edge), paused while Mochi talks. */
interface RecognitionResult { isFinal: boolean; 0: { transcript: string } }
interface RecognitionEvent { resultIndex: number; results: ArrayLike<RecognitionResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null; onresult: ((e: RecognitionEvent) => void) | null;
  start(): void; abort(): void;
}
type RecognitionCtor = new () => Recognition;

export class Listener {
  private rec: Recognition | null = null;
  private running = false;
  private wanted = false;
  blocked = false;

  constructor(private readonly onFinal: (text: string) => void, private readonly onBlocked: () => void = () => undefined) {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = 'en-US'; rec.continuous = true; rec.interimResults = false;
    rec.onstart = () => { this.running = true; };
    rec.onend = () => { this.running = false; if (this.wanted) setTimeout(() => this.start(), 250); };
    rec.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { this.blocked = true; this.wanted = false; this.onBlocked(); } };
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]!;
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) this.onFinal(t); }
      }
    };
    this.rec = rec;
  }

  get supported() { return this.rec !== null; }

  start() {
    this.wanted = true;
    if (this.rec && !this.running && !this.blocked) { try { this.rec.start(); } catch { /* already starting */ } }
  }

  stop() {
    this.wanted = false;
    if (this.rec && this.running) { try { this.rec.abort(); } catch { /* already stopped */ } }
  }
}
