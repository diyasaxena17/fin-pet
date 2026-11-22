/** Mochi's voice: Gemini TTS with each persona's designed voice, browser voice as a fallback, cheer sounds. */
import { TTS_MODELS, gemCall, type GeminiPart } from './gemini';
import type { Persona, SoundName } from './personas';

let ctx: AudioContext | null = null;
export function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(f: number, t0: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, f2: number | null = null) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
const SOUNDS: Record<SoundName, () => void> = {
  squeak: () => { tone(900, 0, .12, 'sine', .2, 1500); tone(1100, .14, .12, 'sine', .2, 1800); tone(1300, .28, .18, 'sine', .2, 2200); },
  arpeggio: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * .08, .25, 'triangle', .16)),
  chime: () => { tone(660, 0, 1.2, 'sine', .15); tone(990, .25, 1.4, 'sine', .12); tone(1320, .5, 1.6, 'sine', .08); },
  boop: () => { tone(196, 0, .18, 'triangle', .25, 294); tone(294, .22, .2, 'triangle', .25, 392); tone(392, .45, .3, 'sine', .2); },
  horn: () => { [0, .22, .44].forEach(t => { tone(466, t, .18, 'square', .09); tone(470, t, .18, 'sawtooth', .06); }); tone(622, .7, .5, 'square', .09); },
  drip: () => { tone(1400, 0, .07, 'sine', .18, 2000); tone(1900, .08, .07, 'sine', .16, 2600); tone(70, .2, .5, 'sine', .4, 38); tone(110, .2, .35, 'triangle', .15, 55); },
};
export function playSound(name: SoundName) { try { SOUNDS[name](); } catch { /* audio blocked */ } }
export function wakeChirp() { tone(500, 0, .15, 'sine', .15, 900); tone(900, .16, .2, 'sine', .15, 1200); }
export function sleepChirp() { tone(800, 0, .3, 'sine', .12, 400); tone(400, .3, .4, 'sine', .1, 250); }
export function worryTone() { tone(520, 0, .25, 'triangle', .12, 380); tone(380, .28, .4, 'triangle', .1, 300); }

/* ---------- Gemini TTS ---------- */
function b64ToBytes(b64: string) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
/** WAV (gemini-3.8 TTS) or raw 16-bit PCM → floats. */
export function audioToFloat(part: GeminiPart): { pcm: Float32Array; rate: number } {
  const u = b64ToBytes(part.inlineData!.data), mime = part.inlineData!.mimeType ?? '', dv = new DataView(u.buffer);
  let rate = parseInt(mime.match(/rate=(\d+)/)?.[1] ?? '24000', 10), start = 0, len = u.length;
  if (/wav/i.test(mime) || String.fromCharCode(u[0]!, u[1]!, u[2]!, u[3]!) === 'RIFF') {
    let off = 12;
    while (off < u.length - 8) {
      const id = String.fromCharCode(u[off]!, u[off + 1]!, u[off + 2]!, u[off + 3]!), sz = dv.getUint32(off + 4, true);
      if (id === 'fmt ') rate = dv.getUint32(off + 12, true);
      if (id === 'data') { start = off + 8; len = Math.min(sz, u.length - start); break; }
      off += 8 + sz;
    }
  }
  const n = Math.floor(len / 2), f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = dv.getInt16(start + i * 2, true) / 32768;
  return { pcm: f, rate };
}

async function geminiTTS(text: string, persona: Persona) {
  const tries: [string, string][] = [];
  if (persona.voiceId) tries.push([TTS_MODELS[0]!, persona.voiceId], [TTS_MODELS[1]!, persona.voiceId]);
  tries.push([TTS_MODELS[0]!, persona.gv], [TTS_MODELS[2]!, persona.gv]);
  let last: unknown;
  for (const [model, voiceName] of tries) {
    try {
      const data = await gemCall(model, {
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
      }, 25000);
      const part = (data.candidates?.[0]?.content?.parts ?? []).find(p => p.inlineData);
      if (!part) throw new Error('no audio in reply');
      return audioToFloat(part);
    } catch (error) { last = error; }
  }
  throw last instanceof Error ? last : new Error('TTS failed');
}

/** First chunk stays short so Mochi starts talking sooner. */
export function splitSentences(text: string): string[] {
  const parts = (text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text]).map(s => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const s of parts) {
    const lastChunk = out[out.length - 1];
    if (lastChunk !== undefined && (lastChunk.length < 40 || s.length < 25) && lastChunk.length + s.length < 220) out[out.length - 1] = lastChunk + ' ' + s;
    else out.push(s);
  }
  if (out.length > 1 && out[0]!.length < 12) { out[1] = out[0] + ' ' + out[1]; out.shift(); }
  return out.length ? out : [text];
}

let current: AudioBufferSourceNode | null = null;
let generation = 0;
function playPCM({ pcm, rate }: { pcm: Float32Array; rate: number }): Promise<void> {
  const a = audio();
  if (!a) return Promise.resolve();
  const buf = a.createBuffer(1, pcm.length, rate);
  buf.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
  return new Promise(resolve => {
    const src = a.createBufferSource(); src.buffer = buf; src.connect(a.destination);
    let done = false;
    const finish = () => { if (done) return; done = true; if (current === src) current = null; resolve(); };
    src.onended = finish;
    setTimeout(finish, buf.duration * 1000 + 1500);   // safety net if audio is blocked
    current = src; src.start();
  });
}

function browserSay(text: string, persona: Persona): Promise<void> {
  if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve();
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    const want = persona.gender === 'female' ? /female|samantha|zira|aria|jenny|google us english/i : /male|david|guy|ryan|daniel|google uk english male/i;
    const v = voices.find(x => want.test(x.name)) ?? voices[0];
    if (v) u.voice = v;
    u.pitch = persona.pitch; u.rate = persona.rate;
    u.onend = () => resolve(); u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  generation += 1;
  try { current?.stop(); } catch { /* already stopped */ }
  current = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

const cache = new Map<string, Promise<{ pcm: Float32Array; rate: number }>>();
/** Speaks sentence by sentence: the next sentence is made while the current one plays. */
export async function speak(text: string, persona: Persona): Promise<void> {
  stopSpeaking();
  const mine = generation;
  const chunks = splitSentences(text);
  const get = (t: string) => {
    const key = persona.id + '|' + t;
    if (!cache.has(key)) cache.set(key, geminiTTS(t, persona).catch(error => { cache.delete(key); throw error; }));
    return cache.get(key)!;
  };
  let next = get(chunks[0]!);
  for (let i = 0; i < chunks.length; i++) {
    let clip: { pcm: Float32Array; rate: number } | null = null;
    try { clip = await next; } catch { /* fall back to the browser voice */ }
    if (i + 1 < chunks.length) next = get(chunks[i + 1]!);
    if (mine !== generation) return;
    if (clip) await playPCM(clip); else await browserSay(chunks[i]!, persona);
    if (mine !== generation) return;
  }
}
