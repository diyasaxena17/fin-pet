/**
 * Mochi's talking brain, ported from the original Mochi app: wake greeting, spoken daily budget report,
 * two-week goal check, "want today's news?", daily brief, conversation, and sleep on "goodbye".
 * Framework-free: React only feeds it data and shows what it says.
 */
import { gemText } from './gemini';
import { dailyBrief } from './brief';
import { Listener } from './listen';
import {
  BRIEF_INTENT, DAILY_INTENT, GOAL_INTENT, MOOD_LETTER, NO, YES,
  dailyReport, isGoodbye, periodReport, sayMoney, type DailyItem, type Goals, type Mood, type PeriodTotals,
} from './money';
import type { Persona } from './personas';
import { playSound, sleepChirp, speak, stopSpeaking, wakeChirp, worryTone } from './speech';

export interface BrainDeps {
  petName(): string;
  persona(): Persona;
  /** null until the account exists. budget is null until the user sets one. */
  money(): { budget: number | null; spent: number; items: DailyItem[] } | null;
  goals(): Goals | null;
  totals(): PeriodTotals;
  /** Message to the squirrel bridge (mood:x, sleep, app:here). */
  send(message: string): void;
  show(event: BrainEvent): void;
  speak?: (text: string, persona: Persona) => Promise<void>;
  listener?: Listener;
}
export type BrainEvent =
  | { type: 'say'; text: string }
  | { type: 'heard'; text: string }
  | { type: 'mood'; mood: Mood }
  | { type: 'awake'; awake: boolean }
  | { type: 'mic'; blocked: boolean };

const MOOD_MS: Record<Mood, number> = { happy: 2800, worried: 5200, sad: 5200 };
const IDLE_SLEEP_MS = 2 * 60 * 1000;
const today = () => new Date().toLocaleDateString('en-CA');
const store = {
  get: (k: string) => { try { return localStorage.getItem('mochi.' + k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem('mochi.' + k, v); } catch { /* storage unavailable */ } },
};

export class MochiBrain {
  awake = false;
  private busy = false;
  private pending: 'news' | null = null;
  private history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
  private moodUntil = 0;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listener: Listener;
  private readonly speakFn: (text: string, persona: Persona) => Promise<void>;

  constructor(private readonly deps: BrainDeps) {
    this.listener = deps.listener ?? new Listener(text => void this.hear(text), () => deps.show({ type: 'mic', blocked: true }));
    this.speakFn = deps.speak ?? speak;
  }

  /** An NFC tap: wake up, or give the report again if already awake. */
  async tap(): Promise<void> {
    this.deps.send('app:here');          // the app is open: it does the reports, not the bridge
    if (this.awake) { await this.dailyCheck(); return; }
    await this.wake();
  }

  async wake(): Promise<void> {
    if (this.awake) return;
    this.awake = true; this.history = []; this.pending = null;
    this.deps.show({ type: 'awake', awake: true });
    this.moodUntil = Date.now() + MOOD_MS.happy;     // the bridge is doing its wake-up happy dance
    wakeChirp();
    this.deps.show({ type: 'mood', mood: 'happy' });
    this.touch();
    const name = this.deps.petName(), money = this.deps.money();
    const firstToday = store.get('lastWake') !== today();
    store.set('lastWake', today());
    const hour = new Date().getHours();
    const hi = hour < 12 ? 'Good morning' : hour < 17 ? 'Hey' : 'Good evening';
    if (!money || money.budget === null) {
      await this.say(`${hi}! ${name} is awake! Set your daily budget in the app, then tap me again and I'll tell you how you did.`);
    } else {
      await this.say(firstToday ? `${hi}! ${name} is awake! Let's see how today went.` : `${hi}! Report time!`);
      await this.dailyCheck();
      await this.goalCheck(true);
    }
    if (firstToday && !store.get('newsAsked.' + today())) {
      store.set('newsAsked.' + today(), '1');
      this.pending = 'news';
      await this.say("Do you want to hear today's money news summary?");
    }
    this.listen();
  }

  async sleep(withGoodbye = true): Promise<void> {
    if (!this.awake) return;
    if (withGoodbye) await this.say('Okay, good night!', false);   // short and sweet
    this.awake = false; this.pending = null;
    this.listener.stop(); stopSpeaking();
    if (this.idleTimer) clearTimeout(this.idleTimer);
    sleepChirp();
    this.deps.send('sleep');          // the bridge does a goodbye tail wag, then sleeps
    this.deps.show({ type: 'awake', awake: false });
  }

  /** Something the user said (or typed). */
  async hear(text: string): Promise<void> {
    if (!this.awake || this.busy || !text.trim()) return;
    this.touch();
    this.deps.show({ type: 'heard', text });
    if (isGoodbye(text, this.deps.petName())) { await this.sleep(true); return; }
    if (this.pending === 'news') {
      this.pending = null;
      if (YES.test(text.trim())) { await this.brief(); return; }
      if (NO.test(text.trim())) { await this.say('No worries! Just say daily brief anytime.'); return; }
    }
    if (DAILY_INTENT.test(text)) { await this.dailyCheck(); return; }
    if (GOAL_INTENT.test(text)) { await this.goalCheck(false); return; }
    if (BRIEF_INTENT.test(text)) { await this.brief(); return; }
    this.busy = true; this.listener.stop();
    let reply: string;
    try { reply = await this.chat(text); } catch { reply = "Hmm, my brain is a bit sleepy right now. Can you ask me again in a moment?"; }
    this.busy = false;
    if (!this.awake) return;
    if (reply.startsWith('[CHEER]')) {
      reply = reply.replace('[CHEER]', '').trim();
      this.mood('happy', false);     // cheer on screen and in sound; the tail saves its wags for real goals
      const cheers = this.deps.persona().cheers;
      reply = cheers[Math.floor(Math.random() * cheers.length)] + ' ' + reply;
    }
    await this.say(reply);
  }

  async dailyCheck(): Promise<void> {
    const money = this.deps.money();
    if (!money || money.budget === null) { await this.say('Set your daily budget in the app first, then I can tell you how you did!'); return; }
    const r = dailyReport(money.spent, money.budget, money.items);
    this.mood(r.mood);
    await this.say(await this.phrase(r.facts, r.mood, r.text));
  }

  /** The two-week savings and investing check. */
  async goalCheck(onWake: boolean): Promise<void> {
    const goals = this.deps.goals();
    if (!goals) { if (!onWake) await this.say('Add your two-week savings and investing goals in the app, and I will keep track!'); return; }
    const r = periodReport(this.deps.totals(), goals);
    this.mood(r.mood);              // a happy tail-wag dance only when a goal is met
    await this.say(await this.phrase(r.facts, r.mood, r.text));
  }

  async brief(): Promise<void> {
    this.busy = true; this.listener.stop();
    this.deps.show({ type: 'say', text: "📰 Reading today's markets and news…" });
    try {
      const b = await dailyBrief(this.deps.petName(), this.deps.persona());
      this.history.push({ role: 'user', parts: [{ text: 'Give me my daily brief. Data: ' + JSON.stringify(b.data).slice(0, 6000) }] },
        { role: 'model', parts: [{ text: b.text }] });
      this.busy = false;
      await this.say(b.text);
    } catch {
      this.busy = false;
      await this.say("Hmm, I couldn't get today's market news right now. Try again in a minute?");
    }
  }

  /**
   * Happy dance / worried / sad on the screen and the squirrel. The tail only wags for the happy dance,
   * which is kept for real wins (under budget, a goal met); worried and sad only change the eyes.
   */
  mood(mood: Mood, onSquirrel = true): void {
    this.moodUntil = Date.now() + MOOD_MS[mood];
    if (onSquirrel) this.deps.send(`mood:${MOOD_LETTER[mood]}`);
    this.deps.show({ type: 'mood', mood });
    if (mood === 'happy') playSound(this.deps.persona().sound); else worryTone();
  }

  private async say(text: string, resume = true): Promise<void> {
    this.listener.stop();
    this.deps.show({ type: 'say', text });
    // The tail stays still while talking: it only wags at wake-up, goodbye and for good news.
    await this.speakFn(text, this.deps.persona());
    if (this.awake) this.touch();
    if (resume) this.listen();
  }

  private listen() { if (this.awake && !this.busy) this.listener.start(); }

  private touch() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { if (this.awake && !this.busy) void this.sleep(true); }, IDLE_SLEEP_MS);
  }

  private moneyContext(): string {
    const m = this.deps.money(), g = this.deps.goals(), t = this.deps.totals();
    const parts: string[] = [];
    if (m?.budget != null) parts.push(`daily budget ${sayMoney(m.budget)}, spent today ${sayMoney(m.spent)}, left ${sayMoney(m.budget - m.spent)}`);
    if (g) parts.push(`this two-week period saved ${sayMoney(t.saved)} of ${sayMoney(g.saveGoal)}, invested ${sayMoney(t.invested)} of ${sayMoney(g.investGoal)}`);
    return parts.length ? `\nUser's numbers: ${parts.join('; ')}. Use these when relevant.` : '';
  }

  private async chat(text: string): Promise<string> {
    const persona = this.deps.persona();
    const system = `You are ${this.deps.petName()}, a tiny, cute money pet that gives friendly financial guidance to a Canadian university student out loud.
Rules: be concise: reply in 1 or 2 short spoken sentences (under 30 words), no lists, no markdown, no emojis, no symbols like % or $ (say "percent", "dollars"). Be warm and playful but practical.
Use Canadian context when relevant (TFSA, RRSP, FHSA, OSAP, CAD). Gently push back on impulse buys. Only ask a question when you really need to.
Favour long-term, diversified, low-cost investing; never tell them to buy or sell a specific stock or to time the market.
If the user did something financially good (saved money, skipped an impulse buy, paid off debt, made a budget, invested), begin your reply with the exact token [CHEER].
Never claim to be a licensed advisor; for big decisions suggest checking with a professional.${persona.lingo ? '\n' + persona.lingo : ''}${this.moneyContext()}`;
    this.history.push({ role: 'user', parts: [{ text }] });
    try {
      const out = await gemText({ systemInstruction: { parts: [{ text: system }] }, contents: this.history.slice(-14),
        generationConfig: { maxOutputTokens: 600, temperature: 0.8 } });
      this.history.push({ role: 'model', parts: [{ text: out }] });
      return out;
    } catch (error) { this.history.pop(); throw error; }
  }

  /** Says the report's facts in the pet's own voice, with a plain fallback. */
  private async phrase(facts: string, mood: Mood, fallback: string): Promise<string> {
    const feel = mood === 'happy' ? 'celebrate and be proud' : mood === 'worried' ? 'be gently worried but encouraging' : 'be sad but kind and supportive, give one tip';
    try {
      const out = await gemText({
        systemInstruction: { parts: [{ text: `You are ${this.deps.petName()}, a cute money squirrel talking out loud. ${this.deps.persona().lingo ?? ''}` }] },
        contents: [{ role: 'user', parts: [{ text: `Say this report in 1 or 2 short spoken sentences (under 35 words), in character. Mood: ${feel}. Keep every number exactly as given, say amounts in words like "12 dollars". No lists, no emojis, no symbols.\nFacts: ${facts}` }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 } }, undefined, 10000);
      return out.replace(/\[CHEER\]/g, '').trim() || fallback;
    } catch { return fallback; }
  }
}
