import type { BankTxn, GeoEvent, IntentEvent, Pulse, Vibe, WishItem, WishStatus, LedgerReflection } from './types';

export const HOUR = 3_600_000;
export const ms = (iso: string) => Date.parse(iso);
/** Wall-clock parts are read from the ISO string, so analysis is independent of the viewer's timezone. */
export const localHour = (iso: string) => Number(iso.slice(11, 13));
export const localDate = (iso: string) => iso.slice(0, 10);
const byTime = (a: { at: string }, b: { at: string }) => ms(a.at) - ms(b.at) || (a.at < b.at ? -1 : 1);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const discretionaryCategories = new Set(['food', 'shopping', 'entertainment']);
/** Non-essential outflow in food, shopping or entertainment. Planned treats still count. */
export const isDiscretionary = (t: BankTxn) =>
  t.direction === 'debit' && t.kind === 'purchase' && !t.essential && discretionaryCategories.has(t.category);
export const discretionary = (txns: readonly BankTxn[]) => txns.filter(isDiscretionary).sort(byTime);

// ---------- 1a. Velocity & clustering ----------
export interface Cluster { id: string; start: string; end: string; spanMinutes: number; txns: BankTxn[]; totalCents: number }
/** Maximal windows of >= minCount discretionary purchases within windowHours; overlapping windows keep the larger one. */
export function findClusters(txns: readonly BankTxn[], opts: { minCount?: number; windowHours?: number } = {}): Cluster[] {
  const minCount = opts.minCount ?? 3; const windowMs = (opts.windowHours ?? 4) * HOUR;
  const d = discretionary(txns);
  const ranges: [number, number][] = [];
  for (let i = 0; i < d.length; i++) {
    let j = i; while (j + 1 < d.length && ms(d[j + 1]!.at) - ms(d[i]!.at) <= windowMs) j++;
    if (j - i + 1 >= minCount) ranges.push([i, j]);
  }
  const maximal = ranges.filter(([a, b], i) => !ranges.some(([c, e], k) => k !== i && c <= a && e >= b));
  const accepted: [number, number][] = [];
  for (const r of [...maximal].sort((x, y) => (y[1] - y[0]) - (x[1] - x[0]) || x[0] - y[0]))
    if (!accepted.some(([a, b]) => r[0] <= b && r[1] >= a)) accepted.push(r);
  return accepted.sort((x, y) => x[0] - y[0]).map(([a, b]) => {
    const group = d.slice(a, b + 1);
    return { id: `cluster-${group[0]!.id}`, start: group[0]!.at, end: group.at(-1)!.at,
      spanMinutes: Math.round((ms(group.at(-1)!.at) - ms(group[0]!.at)) / 60000), txns: group, totalCents: sum(group.map((t) => t.amountCents)) };
  });
}

// ---------- 1b. Circadian profile ----------
export const isLateNight = (iso: string, startHour = 23, endHour = 3) => { const h = localHour(iso); return h >= startHour || h < endHour; };
export interface CircadianProfile {
  lateCount: number; dayCount: number; lateSpendCents: number; daySpendCents: number;
  lateShareCount: number; lateShareSpend: number; lateToDayRatio: number | null;
  lateItems: BankTxn[]; delivery: BankTxn[];
}
export function circadianProfile(txns: readonly BankTxn[], opts: { startHour?: number; endHour?: number } = {}): CircadianProfile {
  const d = discretionary(txns);
  const late = d.filter((t) => isLateNight(t.at, opts.startHour, opts.endHour)); const day = d.filter((t) => !late.includes(t));
  const lateSpend = sum(late.map((t) => t.amountCents)); const daySpend = sum(day.map((t) => t.amountCents));
  return { lateCount: late.length, dayCount: day.length, lateSpendCents: lateSpend, daySpendCents: daySpend,
    lateShareCount: d.length ? late.length / d.length : 0, lateShareSpend: lateSpend + daySpend ? lateSpend / (lateSpend + daySpend) : 0,
    lateToDayRatio: daySpend ? lateSpend / daySpend : late.length ? null : 0, lateItems: late,
    delivery: late.filter((t) => t.category === 'food' || t.category === 'shopping') };
}

// ---------- 1c. Payday-to-splurge latency ----------
export interface PaydayWindow {
  payroll: BankTxn; spend: BankTxn[]; spendCents: number;
  /** Hours from the deposit to the first splurge-sized (>= splurgeMinCents) discretionary purchase; small habit buys don't count. */
  firstLatencyHours: number | null;
  /** window spend / (baseline daily discretionary spend x windowHours/24); null when no baseline exists. */
  spikeRatio: number | null; flagged: boolean;
}
export interface PaydayProfile { windows: PaydayWindow[]; baselineDailyCents: number; creepChangePct: number | null }
export function paydayProfile(txns: readonly BankTxn[], opts: { windowHours?: number; spikeAt?: number; splurgeMinCents?: number } = {}): PaydayProfile {
  const windowMs = (opts.windowHours ?? 48) * HOUR; const spikeAt = opts.spikeAt ?? 1.5; const splurgeMin = opts.splurgeMinCents ?? 3000;
  const d = discretionary(txns); const payrolls = txns.filter((t) => t.direction === 'payroll').sort(byTime);
  const inWindow = (t: BankTxn) => payrolls.some((p) => ms(t.at) >= ms(p.at) && ms(t.at) <= ms(p.at) + windowMs);
  const dates = txns.map((t) => ms(t.at)); const spanDays = dates.length ? Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / (24 * HOUR))) : 1;
  const outsideDays = Math.max(1, spanDays - payrolls.length * (windowMs / (24 * HOUR)));
  const baselineDailyCents = sum(d.filter((t) => !inWindow(t)).map((t) => t.amountCents)) / outsideDays;
  const windows = payrolls.map((payroll) => {
    const spend = d.filter((t) => ms(t.at) >= ms(payroll.at) && ms(t.at) <= ms(payroll.at) + windowMs);
    const spendCents = sum(spend.map((t) => t.amountCents)); const expected = baselineDailyCents * (windowMs / (24 * HOUR));
    const spikeRatio = expected > 0 ? spendCents / expected : null;
    return { payroll, spend, spendCents, firstLatencyHours: (() => { const first = spend.find((t) => t.amountCents >= splurgeMin); return first ? (ms(first.at) - ms(payroll.at)) / HOUR : null; })(),
      spikeRatio, flagged: spikeRatio !== null && spikeRatio >= spikeAt };
  });
  const first = windows.at(-2)?.spendCents; const last = windows.at(-1)?.spendCents;
  return { windows, baselineDailyCents, creepChangePct: first && last !== undefined ? ((last - first) / first) * 100 : null };
}

// ---------- 1d. Category drift & micro-leaks ----------
export interface Habit { label: string; count: number; totalCents: number; avgCents: number; weeklyCents: number }
export interface MicroLeakReport { habits: Habit[]; leakCents: number; plannedFoodCents: number; autopilotShare: number; monthlyRunRateCents: number }
export function microLeaks(txns: readonly BankTxn[], opts: { microMaxCents?: number; minCount?: number } = {}): MicroLeakReport {
  const microMax = opts.microMaxCents ?? 2500; const minCount = opts.minCount ?? 3;
  const food = txns.filter((t) => t.direction === 'debit' && t.kind === 'purchase' && t.category === 'food');
  const groups = new Map<string, BankTxn[]>();
  for (const t of food.filter((x) => !x.planned && !x.essential && x.amountCents <= microMax)) groups.set(t.name, [...(groups.get(t.name) ?? []), t]);
  const times = txns.map((t) => ms(t.at)); const weeks = times.length ? Math.max(1, (Math.max(...times) - Math.min(...times)) / (7 * 24 * HOUR)) : 1;
  const habits = [...groups.entries()].filter(([, g]) => g.length >= minCount).map(([label, g]) => {
    const totalCents = sum(g.map((t) => t.amountCents));
    return { label, count: g.length, totalCents, avgCents: totalCents / g.length, weeklyCents: totalCents / weeks };
  }).sort((a, b) => b.totalCents - a.totalCents);
  const leakCents = sum(habits.map((h) => h.totalCents)); const plannedFoodCents = sum(food.filter((t) => t.planned).map((t) => t.amountCents));
  return { habits, leakCents, plannedFoodCents, autopilotShare: leakCents + plannedFoodCents ? leakCents / (leakCents + plannedFoodCents) : 0,
    monthlyRunRateCents: (leakCents / weeks) * (30 / 7) };
}

// ---------- 2. Intent: restraint log, wishlist, geofence ----------
export interface RestraintSummary { restraint: number; conversions: number; rate: number | null; lingerSeconds: number; avoidedCents: number }
export function restraintSummary(events: readonly IntentEvent[], skipped: readonly { valueCents: number }[] = []): RestraintSummary {
  const abandoned = events.filter((e) => e.kind === 'cart_abandoned' || (e.kind === 'product_linger' && e.outcome === 'browsed'));
  const conversions = events.filter((e) => e.kind === 'checkout_entry' && e.outcome === 'purchased').length;
  const restraint = abandoned.length + skipped.length;
  return { restraint, conversions, rate: restraint + conversions ? restraint / (restraint + conversions) : null,
    lingerSeconds: sum(events.filter((e) => e.kind === 'product_linger').map((e) => e.durationSec)),
    avoidedCents: sum(abandoned.map((e) => e.valueCents)) + sum(skipped.map((s) => s.valueCents)) };
}
export const WISH_WINDOW_MS = 72 * HOUR;
export function wishStatus(item: WishItem, nowMs: number): WishStatus {
  if (item.purchasedAtMs !== null) return 'purchased';
  return nowMs - item.addedAtMs < WISH_WINDOW_MS ? 'waiting' : 'resisted';
}
export const wishHoursLeft = (item: WishItem, nowMs: number) => Math.max(0, (item.addedAtMs + WISH_WINDOW_MS - nowMs) / HOUR);
/** Impulse Resistance Score: of resolved items, the share NOT bought within 72h of being added. A purchase after 72h counts as resisted. */
export function impulseResistance(items: readonly WishItem[], nowMs: number): { score: number | null; resolved: number; waiting: number; impulsive: number } {
  let waiting = 0, resolved = 0, impulsive = 0;
  for (const item of items) {
    if (wishStatus(item, nowMs) === 'waiting') { waiting++; continue; }
    resolved++; if (item.purchasedAtMs !== null && item.purchasedAtMs - item.addedAtMs < WISH_WINDOW_MS) impulsive++;
  }
  return { score: resolved ? ((resolved - impulsive) / resolved) * 100 : null, resolved, waiting, impulsive };
}
export function geofenceSummary(events: readonly GeoEvent[]) {
  const walkAways = events.filter((e) => e.outcome === 'walk_away'); const walkIns = events.filter((e) => e.outcome === 'walk_in_purchase');
  return { walkAways: walkAways.length, walkIns: walkIns.length, nearMissRate: events.length ? walkAways.length / events.length : null,
    avgDwellAwayMin: walkAways.length ? sum(walkAways.map((e) => e.dwellMin)) / walkAways.length : null,
    avgDwellInMin: walkIns.length ? sum(walkIns.map((e) => e.dwellMin)) / walkIns.length : null };
}

// ---------- 3. Active context: vibes & regret ----------
export const PULSE_AFTER_HOURS = 48;
export const isUnplanned = (t: BankTxn, vibes: Readonly<Record<string, Vibe>>) => !t.planned && vibes[t.id] !== 'planned';
export const pendingVibes = (txns: readonly BankTxn[], vibes: Readonly<Record<string, Vibe>>, nowMs: number) =>
  discretionary(txns).filter((t) => !vibes[t.id] && ms(t.at) <= nowMs).reverse();
/** Unplanned discretionary purchases at least 48h old with no Worth-It/Regret answer yet, newest first. */
export const pendingPulses = (txns: readonly BankTxn[], vibes: Readonly<Record<string, Vibe>>, pulses: Readonly<Record<string, Pulse>>, nowMs: number) =>
  discretionary(txns).filter((t) => isUnplanned(t, vibes) && !pulses[t.id] && nowMs - ms(t.at) >= PULSE_AFTER_HOURS * HOUR).reverse();

export function vibeBreakdown(txns: readonly BankTxn[], vibes: Readonly<Record<string, Vibe>>) {
  const d = discretionary(txns); const out = {} as Record<Vibe | 'untagged', { count: number; cents: number }>;
  for (const key of ['planned', 'hungry_tired', 'stressed', 'treat_social', 'untagged'] as const) out[key] = { count: 0, cents: 0 };
  for (const t of d) { const bucket = out[vibes[t.id] ?? 'untagged']; bucket.count++; bucket.cents += t.amountCents; }
  return out;
}
export type TimeWindow = 'morning' | 'afternoon' | 'evening' | 'late_night';
export const timeWindowOf = (iso: string): TimeWindow => { const h = localHour(iso);
  return h >= 23 || h < 5 ? 'late_night' : h < 11 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
export interface RegretRow { key: string; total: number; regret: number; rate: number }
export interface RegretProfile { answered: number; regretRate: number | null; byMerchant: RegretRow[]; byWindow: RegretRow[]; byVibe: RegretRow[] }
export function regretProfile(txns: readonly BankTxn[], vibes: Readonly<Record<string, Vibe>>, pulses: Readonly<Record<string, Pulse>>): RegretProfile {
  const answered = txns.filter((t) => pulses[t.id]);
  const rows = (key: (t: BankTxn) => string): RegretRow[] => {
    const map = new Map<string, { total: number; regret: number }>();
    for (const t of answered) { const k = key(t); const cur = map.get(k) ?? { total: 0, regret: 0 };
      cur.total++; if (pulses[t.id] === 'regret') cur.regret++; map.set(k, cur); }
    return [...map.entries()].map(([k, v]) => ({ key: k, ...v, rate: v.regret / v.total })).sort((a, b) => b.rate - a.rate || b.total - a.total || (a.key < b.key ? -1 : 1));
  };
  const regrets = answered.filter((t) => pulses[t.id] === 'regret').length;
  return { answered: answered.length, regretRate: answered.length ? regrets / answered.length : null,
    byMerchant: rows((t) => t.name), byWindow: rows((t) => timeWindowOf(t.at)), byVibe: rows((t) => vibes[t.id] ?? 'untagged') };
}
/** Seed regret answers from reflections already recorded in the ledger (not_worth_it => regret). */
export function seedPulses(reflections: readonly LedgerReflection[]): Record<string, Pulse> {
  const out: Record<string, Pulse> = {};
  for (const r of reflections) if (r.verdict !== 'unsure') out[r.transactionId] = r.verdict === 'worth_it' ? 'worth' : 'regret';
  return out;
}

export const cents = (value: number) => `$${(value / 100).toLocaleString('en-CA', { minimumFractionDigits: value % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Cash on hand implied by a set of movements: payroll in, purchases and transfers out (investment gains are not cash). */
export const cashOf = (txns: readonly BankTxn[], openingCents: number) =>
  txns.reduce((cash, t) => (t.direction === 'payroll' ? cash + t.amountCents : t.direction === 'debit' ? cash - t.amountCents : cash), openingCents);
/** 0 = Sunday, from the wall-clock date in an ISO string. */
export const dayOfWeek = (iso: string) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))).getUTCDay();
export const isWeekendNight = (iso: string) => { const d = dayOfWeek(iso); const h = localHour(iso); return (d === 5 && h >= 17) || d === 6 || (d === 0 && h < 5); };
