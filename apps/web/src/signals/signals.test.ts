import { describe, expect, it } from 'vitest';
import { buildSandboxLedger } from './ledger';
import { adaptLedger } from './adapters';
import { cashOf, circadianProfile, findClusters, impulseResistance, isDiscretionary, microLeaks, paydayProfile,
  pendingPulses, pendingVibes, regretProfile, restraintSummary, seedPulses, vibeBreakdown, wishStatus, geofenceSummary, timeWindowOf } from './analytics';
import { BASE_NOW_MS, geoEvents, intentEvents, scenarioTxns, seedWishlist } from './overlay';
import type { Pulse, Vibe, WishItem } from './types';

const ledger = buildSandboxLedger();
const adapted = adaptLedger(ledger);
const base = adapted.transactions;
describe('behaviour ledger fixture', () => {
  it('is deterministic, hand-authored, and never overdraws', () => {
    expect(buildSandboxLedger()).toEqual(ledger);
    expect(ledger.dataset).toBe('behaviour-sandbox-14-v2');
    expect(ledger.entries[0]!.id).toMatch(/^14000000-0000-4000-8000-\d{12}$/);
    expect(Math.min(...ledger.entries.map((e) => e.cashAfterCents))).toBeGreaterThanOrEqual(0);
    const b = ledger.balancesCents;
    expect(b.openingCash + b.income - b.expenses - b.savingsContributions - b.investmentContributions).toBe(b.cash);
    expect(cashOf(base, b.openingCash)).toBe(b.cash);
  });
  it('adapts every bank movement, seeded vibes and reflections', () => {
    expect(base.filter((t) => t.direction === 'payroll')).toHaveLength(2);
    expect(base.every((t) => !Number.isNaN(Date.parse(t.at)))).toBe(true);
    expect(adapted.skippedDecisions).toHaveLength(2);
    expect(adapted.reflections).toHaveLength(6);
    expect(Object.keys(adapted.vibes)).toHaveLength(15);
    expect(Object.keys(adapted.vibes).every((id) => base.some((t) => t.id === id))).toBe(true);
    expect(base.find((t) => t.name === 'Takeout')!.id).toMatch(/^txn-/);
  });
});


describe('passive signals', () => {
  it('finds the three sprees in the default ledger: Fri night, Sat afternoon, payday Thursday', () => {
    const clusters = findClusters(base);
    expect(clusters).toHaveLength(3);
    expect(clusters.map((c) => c.start.slice(0, 10))).toEqual(['2026-11-13', '2026-11-14', '2026-11-19']);
    expect(clusters.every((c) => c.spanMinutes <= 240 && c.txns.length >= 3)).toBe(true);
    expect(clusters[1]!.txns.map((t) => t.merchant)).toEqual(expect.arrayContaining(['Indigo unplanned books', 'Game shop impulse buy']));
  });
  it('flags an injected spree and respects thresholds', () => {
    const clusters = findClusters([...base, ...scenarioTxns.spree]);
    expect(clusters).toHaveLength(4); expect(clusters.find((c) => c.start.startsWith('2026-11-18'))!.txns).toHaveLength(4);
    expect(findClusters([...base, ...scenarioTxns.spree], { minCount: 5 })).toHaveLength(0);
    expect(findClusters(base, { windowHours: 1 })).toHaveLength(0);
  });
  it('profiles six late-night orders by default and more when injected', () => {
    const p = circadianProfile(base);
    expect(p.lateCount).toBe(6); expect(p.lateShareCount).toBeGreaterThan(0.1); expect(p.lateToDayRatio).toBeGreaterThan(0);
    const more = circadianProfile([...base, ...scenarioTxns.lateNight]);
    expect(more.lateCount).toBe(10); expect(more.delivery.length).toBeGreaterThan(p.delivery.length);
    expect(timeWindowOf('2026-11-15T23:40:00-05:00')).toBe('late_night'); expect(timeWindowOf('2026-11-15T02:59:00-05:00')).toBe('late_night');
    expect(timeWindowOf('2026-11-15T03:00:00-05:00')).toBe('late_night'); expect(timeWindowOf('2026-11-15T05:00:00-05:00')).toBe('morning');
  });
  it('treats 11 PM as late and 3 AM as day for the 23:00-03:00 window', () => {
    const mk = (time: string) => ({ ...scenarioTxns.lateNight[0]!, id: time, at: `2026-11-15T${time}:00-05:00` });
    expect(circadianProfile([mk('23:00')]).lateCount).toBe(1); expect(circadianProfile([mk('02:59')]).lateCount).toBe(1);
    expect(circadianProfile([mk('03:00')]).lateCount).toBe(0); expect(circadianProfile([mk('22:59')]).lateCount).toBe(0);
  });
  it('flags both payday windows, with creep and splurge latency measured from big buys only', () => {
    const p = paydayProfile(base);
    expect(p.windows).toHaveLength(2); expect(p.windows.map((w) => w.flagged)).toEqual([true, true]);
    expect(p.windows[1]!.spendCents).toBeGreaterThan(p.windows[0]!.spendCents * 1.5);
    expect(p.creepChangePct).toBeGreaterThan(50);
    expect(p.windows[0]!.firstLatencyHours).toBeGreaterThan(10); expect(p.windows[1]!.firstLatencyHours).toBeCloseTo(8.5, 1);
    expect(paydayProfile([...base, ...scenarioTxns.paydaySplurge]).windows[0]!.spendCents).toBeGreaterThan(p.windows[0]!.spendCents + 25000);
  });
  it('separates autopilot micro-leaks from planned food spend', () => {
    const r = microLeaks(base);
    expect(r.habits.map((h) => h.label)).toEqual(expect.arrayContaining(['Takeout', 'Neighbourhood coffee']));
    expect(r.habits.find((h) => h.label === 'Neighbourhood coffee')!.count).toBe(10);
    expect(r.autopilotShare).toBeGreaterThan(0.5); expect(r.plannedFoodCents).toBeGreaterThan(0);
    expect(r.habits.every((h) => h.avgCents <= 2500)).toBe(true);
  });
  it('excludes essentials, transfers and credits from discretionary spend', () => {
    expect(base.filter(isDiscretionary).every((t) => !t.essential && t.direction === 'debit' && t.kind === 'purchase')).toBe(true);
    expect(base.some((t) => t.merchant === 'Shared apartment rent' && isDiscretionary(t))).toBe(false);
  });
});

describe('intent signals', () => {
  it('summarises restraint including skipped decisions', () => {
    const r = restraintSummary(intentEvents, adapted.skippedDecisions);
    expect(r.conversions).toBe(4); expect(r.restraint).toBe(7); expect(r.rate).toBeCloseTo(7 / 11); expect(r.avoidedCents).toBe(49299);
    expect(restraintSummary([]).rate).toBeNull();
  });
  it('computes wishlist status and impulse resistance across the 72h boundary', () => {
    const sneakers = seedWishlist.find((w) => w.id === 'wish-6')!;
    expect(wishStatus(sneakers, BASE_NOW_MS)).toBe('waiting');
    expect(wishStatus(sneakers, sneakers.addedAtMs + 72 * 3_600_000 - 1)).toBe('waiting');
    expect(wishStatus(sneakers, sneakers.addedAtMs + 72 * 3_600_000)).toBe('resisted');
    expect(impulseResistance(seedWishlist, BASE_NOW_MS)).toMatchObject({ resolved: 5, waiting: 2, impulsive: 2 });
    expect(impulseResistance(seedWishlist, BASE_NOW_MS).score).toBe(60);
    const later = impulseResistance(seedWishlist, BASE_NOW_MS + 72 * 3_600_000);
    expect(later.waiting).toBe(0); expect(later.score).toBeCloseTo(71.43, 1);
    expect(impulseResistance([], BASE_NOW_MS).score).toBeNull();
    const bought: WishItem = { ...sneakers, purchasedAtMs: sneakers.addedAtMs + 3_600_000 };
    expect(wishStatus(bought, BASE_NOW_MS)).toBe('purchased');
  });
  it('splits geofence near-misses from walk-in purchases', () => {
    expect(geofenceSummary(geoEvents)).toMatchObject({ walkAways: 4, walkIns: 5 });
  });
});

describe('active context', () => {
  it('queues vibes and updates the breakdown immediately', () => {
    const queue = pendingVibes(base, {}, BASE_NOW_MS);
    const first = queue[0]!; const vibes: Record<string, Vibe> = { [first.id]: 'stressed' };
    expect(pendingVibes(base, vibes, BASE_NOW_MS)).toHaveLength(queue.length - 1);
    expect(vibeBreakdown(base, vibes).stressed).toEqual({ count: 1, cents: first.amountCents });
  });
  it('gates the regret pulse at 48h and builds the profile', () => {
    const pulses = seedPulses(adapted.reflections);
    const eligible = pendingPulses(base, {}, pulses, BASE_NOW_MS);
    expect(eligible.every((t) => !t.planned && BASE_NOW_MS - Date.parse(t.at) >= 48 * 3_600_000)).toBe(true);
    const fresh = { ...scenarioTxns.spree[0]!, at: '2026-11-21T20:00:00-05:00' };
    expect(pendingPulses([fresh], {}, {}, BASE_NOW_MS)).toHaveLength(0);
    expect(pendingPulses([fresh], {}, {}, Date.parse(fresh.at) + 48 * 3_600_000)).toHaveLength(1);
    const target = eligible[0]!; const answers: Record<string, Pulse> = { ...pulses, [target.id]: 'worth' };
    const profile = regretProfile(base, { [target.id]: 'treat_social' }, answers);
    expect(profile.answered).toBe(6); expect(profile.regretRate).toBeCloseTo(4 / 6);
    expect(profile.byVibe.map((r) => r.key)).toEqual(expect.arrayContaining(['treat_social', 'untagged']));
    expect(regretProfile(base, {}, {}).regretRate).toBeNull();
  });
  it('does not offer a pulse for purchases tagged as planned', () => {
    const t = pendingPulses(base, {}, {}, BASE_NOW_MS)[0]!;
    expect(pendingPulses(base, { [t.id]: 'planned' }, {}, BASE_NOW_MS).some((x) => x.id === t.id)).toBe(false);
  });
});
