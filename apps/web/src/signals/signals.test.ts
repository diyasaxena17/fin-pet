import { describe, expect, it } from 'vitest';
import { buildSandboxLedger } from './ledger';
import { adaptLedger } from './adapters';
import { circadianProfile, findClusters, impulseResistance, isDiscretionary, microLeaks, paydayProfile,
  pendingPulses, pendingVibes, regretProfile, restraintSummary, seedPulses, vibeBreakdown, wishStatus, geofenceSummary, timeWindowOf } from './analytics';
import { BASE_NOW_MS, geoEvents, intentEvents, scenarioTxns, seedWishlist } from './overlay';
import type { Pulse, Vibe, WishItem } from './types';

const ledger = buildSandboxLedger();
const adapted = adaptLedger(ledger);
const base = adapted.transactions;
const week = (n: 1 | 2) => ledger.entries.filter((e) => e.day >= (n === 1 ? 1 : 8) && e.day <= (n === 1 ? 7 : 14));
const sumType = (n: 1 | 2, type: string) => week(n).filter((e) => e.type === type).reduce((s, e) => s + e.amountCents, 0);

describe('ported sandbox ledger parity with apps/api/SANDBOX.md', () => {
  it('matches the documented weekly totals', () => {
    expect(sumType(1, 'income')).toBe(125000); expect(sumType(2, 'income')).toBe(125000);
    expect(sumType(1, 'expense')).toBe(79174); expect(sumType(2, 'expense')).toBe(47175);
    expect(sumType(1, 'savings_contribution')).toBe(1000); expect(sumType(2, 'savings_contribution')).toBe(19000);
    expect(sumType(1, 'investment_contribution')).toBe(500); expect(sumType(2, 'investment_contribution')).toBe(11500);
    expect(week(1).filter((e) => e.name === 'Takeout')).toHaveLength(6); expect(week(2).filter((e) => e.name === 'Takeout')).toHaveLength(1);
  });
  it('is deterministic, never overdraws, and uses the API id format', () => {
    expect(buildSandboxLedger()).toEqual(ledger);
    expect(Math.min(...ledger.entries.map((e) => e.cashAfterCents))).toBeGreaterThanOrEqual(0);
    expect(ledger.entries[0]!.id).toMatch(/^14000000-0000-4000-8000-\d{12}$/);
  });
  it('adapts every bank movement with direction and ISO timestamps', () => {
    expect(base.filter((t) => t.direction === 'payroll')).toHaveLength(2);
    expect(base.every((t) => !Number.isNaN(Date.parse(t.at)))).toBe(true);
    expect(adapted.skippedDecisions).toHaveLength(8); expect(adapted.reflections).toEqual([expect.objectContaining({ verdict: 'not_worth_it' })]);
    expect(base.find((t) => t.name === 'Takeout')!.id).toMatch(/^txn-/);
  });
});

describe('passive signals', () => {
  it('finds the day-3 shopping cluster in the default ledger and nothing else', () => {
    const clusters = findClusters(base);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]!.txns.map((t) => t.merchant)).toEqual(expect.arrayContaining(['Indigo unplanned books', 'Game shop impulse buy', 'Accessories pop-up']));
    expect(clusters[0]!.spanMinutes).toBeLessThanOrEqual(240);
  });
  it('flags an injected spree and respects thresholds', () => {
    const clusters = findClusters([...base, ...scenarioTxns.spree]);
    expect(clusters).toHaveLength(2); expect(clusters[1]!.txns).toHaveLength(4);
    expect(findClusters([...base, ...scenarioTxns.spree], { minCount: 5 })).toHaveLength(0);
    expect(findClusters(base, { windowHours: 1 })).toHaveLength(0);
  });
  it('has no late-night spend by default and profiles it when injected', () => {
    expect(circadianProfile(base)).toMatchObject({ lateCount: 0, lateToDayRatio: 0 });
    const p = circadianProfile([...base, ...scenarioTxns.lateNight]);
    expect(p.lateCount).toBe(4); expect(p.delivery).toHaveLength(4); expect(p.lateShareCount).toBeGreaterThan(0.1);
    expect(timeWindowOf('2026-11-15T23:40:00-05:00')).toBe('late_night'); expect(timeWindowOf('2026-11-15T02:59:00-05:00')).toBe('late_night');
    expect(timeWindowOf('2026-11-15T03:00:00-05:00')).toBe('late_night'); expect(timeWindowOf('2026-11-15T05:00:00-05:00')).toBe('morning');
  });
  it('treats 11 PM as late and 3 AM as day for the 23:00-03:00 window', () => {
    const mk = (time: string) => ({ ...scenarioTxns.lateNight[0]!, id: time, at: `2026-11-15T${time}:00-05:00` });
    expect(circadianProfile([mk('23:00')]).lateCount).toBe(1); expect(circadianProfile([mk('02:59')]).lateCount).toBe(1);
    expect(circadianProfile([mk('03:00')]).lateCount).toBe(0); expect(circadianProfile([mk('22:59')]).lateCount).toBe(0);
  });
  it('measures payday windows and shows spend easing after the second payday', () => {
    const p = paydayProfile(base);
    expect(p.windows).toHaveLength(2); expect(p.windows[0]!.spendCents).toBe(7225); expect(p.windows[0]!.spikeRatio).toBeCloseTo(1.15, 1);
    expect(p.windows.map((w) => w.flagged)).toEqual([false, false]);
    expect(p.creepChangePct).toBeLessThan(-90); expect(p.windows[0]!.firstLatencyHours).toBe(3.5);
    const spiked = paydayProfile([...base, ...scenarioTxns.paydaySplurge]);
    expect(spiked.windows[1]!.flagged).toBe(true); expect(spiked.windows[1]!.spendCents).toBeGreaterThan(30000);
  });
  it('separates autopilot micro-leaks from planned food spend', () => {
    const r = microLeaks(base);
    expect(r.habits.map((h) => h.label)).toEqual(expect.arrayContaining(['Takeout', 'Neighbourhood coffee']));
    expect(r.autopilotShare).toBeGreaterThan(0.4); expect(r.plannedFoodCents).toBeGreaterThan(0);
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
    expect(r.conversions).toBe(2); expect(r.restraint).toBe(5 + 8); expect(r.rate).toBeCloseTo(13 / 15);
    expect(restraintSummary([]).rate).toBeNull();
  });
  it('computes wishlist status and impulse resistance across the 72h boundary', () => {
    const sneakers = seedWishlist.find((w) => w.id === 'wish-4')!;
    expect(wishStatus(sneakers, BASE_NOW_MS)).toBe('waiting');
    expect(wishStatus(sneakers, sneakers.addedAtMs + 72 * 3_600_000 - 1)).toBe('waiting');
    expect(wishStatus(sneakers, sneakers.addedAtMs + 72 * 3_600_000)).toBe('resisted');
    expect(impulseResistance(seedWishlist, BASE_NOW_MS)).toMatchObject({ resolved: 3, waiting: 2, impulsive: 1 });
    expect(impulseResistance(seedWishlist, BASE_NOW_MS).score).toBeCloseTo(66.67, 1);
    const later = impulseResistance(seedWishlist, BASE_NOW_MS + 72 * 3_600_000);
    expect(later.waiting).toBe(0); expect(later.score).toBeCloseTo(80, 5);
    expect(impulseResistance([], BASE_NOW_MS).score).toBeNull();
    const bought: WishItem = { ...sneakers, purchasedAtMs: sneakers.addedAtMs + 3_600_000 };
    expect(wishStatus(bought, BASE_NOW_MS)).toBe('purchased');
  });
  it('splits geofence near-misses from walk-in purchases', () => {
    expect(geofenceSummary(geoEvents)).toMatchObject({ walkAways: 5, walkIns: 3 });
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
    expect(profile.answered).toBe(2); expect(profile.regretRate).toBe(0.5);
    expect(profile.byVibe.map((r) => r.key)).toEqual(expect.arrayContaining(['treat_social', 'untagged']));
    expect(regretProfile(base, {}, {}).regretRate).toBeNull();
  });
  it('does not offer a pulse for purchases tagged as planned', () => {
    const t = pendingPulses(base, {}, {}, BASE_NOW_MS)[0]!;
    expect(pendingPulses(base, { [t.id]: 'planned' }, {}, BASE_NOW_MS).some((x) => x.id === t.id)).toBe(false);
  });
});
