/** Mochi's money rules, ported from the original Mochi app's mochi-core.js. Pure functions only. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
export const fmt = (n: number) => '$' + round2(n).toFixed(2).replace(/\.00$/, '');
/** 12.5 → "12 dollars and 50 cents" (for speech). */
export function sayMoney(value: number): string {
  const n = round2(Math.abs(value)), d = Math.floor(n), c = Math.round((n - d) * 100);
  return c ? `${d} dollars and ${c} cents` : `${d} dollar${d === 1 ? '' : 's'}`;
}

export type Mood = 'happy' | 'worried' | 'sad';
export const MOOD_LETTER: Record<Mood, 'p' | 'w' | 'd'> = { happy: 'p', worried: 'w', sad: 'd' };

/** Under budget → happy, up to 25% over → worried, more → sad. */
export function dailyMood(spent: number, budget: number): Mood {
  return spent <= budget ? 'happy' : spent <= budget * 1.25 ? 'worried' : 'sad';
}

export interface DailyItem { name: string; amount: number }
export function dailyReport(spent: number, budget: number, items: DailyItem[]) {
  const mood = dailyMood(spent, budget), left = round2(budget - spent);
  const list = items.length ? items.map(i => `${sayMoney(i.amount)} on ${i.name}`).join(', ') : 'nothing from the bank yet';
  const facts = `Spent today: ${sayMoney(spent)} (${list}). Daily budget: ${sayMoney(budget)}. ${left >= 0 ? 'Under budget by ' + sayMoney(left) : 'Over budget by ' + sayMoney(-left)}.`;
  const text = mood === 'happy'
    ? `Daily report! You spent ${sayMoney(spent)} of your ${sayMoney(budget)} budget, so you stayed ${sayMoney(left)} under. Great job!`
    : `Daily report. You spent ${sayMoney(spent)}, which is ${sayMoney(-left)} over your ${sayMoney(budget)} budget. Let's try to spend a little less tomorrow.`;
  return { mood, facts, text };
}

export interface Goals { saveGoal: number; investGoal: number }
export interface PeriodTotals { saved: number; invested: number; dayNum: number }
/** Meeting either goal is good news (happy dance); meeting neither is a worried face. */
export function periodMood(t: PeriodTotals, g: Goals): Mood {
  return t.saved >= g.saveGoal || t.invested >= g.investGoal ? 'happy' : 'worried';
}
/** The two-week summary: says plainly whether each goal was met. */
export function periodReport(t: PeriodTotals, g: Goals) {
  const mood = periodMood(t, g);
  const hitS = t.saved >= g.saveGoal, hitI = t.invested >= g.investGoal;
  const saving = hitS
    ? `You met your savings goal, saving ${sayMoney(t.saved)} of ${sayMoney(g.saveGoal)}.`
    : `You haven't met your savings goal yet: ${sayMoney(t.saved)} of ${sayMoney(g.saveGoal)}, ${sayMoney(g.saveGoal - t.saved)} to go.`;
  const investing = hitI
    ? `You met your investing goal, investing ${sayMoney(t.invested)} of ${sayMoney(g.investGoal)}.`
    : `You haven't met your investing goal yet: ${sayMoney(t.invested)} of ${sayMoney(g.investGoal)}, ${sayMoney(g.investGoal - t.invested)} to go.`;
  const ending = hitS && hitI ? 'Both goals done, amazing work!' : hitS || hitI ? "That's a win! Let's get the other one next time." : "Let's push a little more next time!";
  const text = `Two-week summary! ${saving} ${investing} ${ending}`;
  const facts = `Two-week summary. Savings goal: ${hitS ? 'MET' : 'NOT met'} (saved ${sayMoney(t.saved)} of ${sayMoney(g.saveGoal)}). Investing goal: ${hitI ? 'MET' : 'NOT met'} (invested ${sayMoney(t.invested)} of ${sayMoney(g.investGoal)}). Clearly say for each goal whether it was met.`;
  return { mood, facts, text, hitSavings: hitS, hitInvesting: hitI };
}

/* ---------- "go to sleep" phrases ---------- */
const SLEEP_STRONG = /\b(good ?bye|bye ?bye|good ?night|goodnight|night night|nighty ?night|nite nite|go to (sleep|bed)|time (to|for) (sleep|bed)|sleep (now|time)|nap time|see (ya|you|u)( later| tomorrow| soon)?|talk (to you |to ya )?(later|tomorrow|soon)|ttyl|peace out|catch (you|ya) later|signing off|i'?m (heading|going) to (bed|sleep)|sweet dreams)\b/;
const SLEEP_SHORT = /^(bye|bye now|later|laters|gn|nighty|night|peace|cya|i'?m done|that'?s all|that'?s it|done|all done|ok bye|okay bye|bye for now)\b/;
export function isGoodbye(text: string, petName = ''): boolean {
  const t = String(text).toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (SLEEP_STRONG.test(t)) return true;
  const n = String(petName).toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const stripped = n ? t.replace(new RegExp('\\b' + n + '\\b', 'g'), '').trim() : t;
  return t.split(' ').length <= 4 && SLEEP_SHORT.test(stripped);
}

export const YES = /^(yes|yeah|yep|yup|sure|ok(ay)?|please|go ahead|absolutely|of course|bet|say less|why not|yes please|do it|let'?s (hear|go)|tell me)\b/i;
export const NO = /^(no|nope|nah|not (now|today|really)|skip|maybe later|later|no thanks|i'?m good)\b/i;
export const DAILY_INTENT = /how did i do|daily (budget )?report|budget (check|report|update)|how much (have i|did i) spen[dt]|how much (do i have|have i got|is) left|end of (the )?day report/i;
export const GOAL_INTENT = /(savings?|investing|investment) goals?|my goals|goals? (check|summary|report)|bi-?\s?weekly|two[- ]?weeks?|fortnight|how are my (savings|investments|goals)/i;
export const BRIEF_INTENT = /\b(daily|today'?s|morning|market|news)\s+(brief|briefing|summary|update|recap|report)\b|what'?s (happening|going on|new) (in|with) (the )?(market|markets|stocks|news|economy)|how (are|is) the (market|markets|stocks?) (doing|today)/i;
