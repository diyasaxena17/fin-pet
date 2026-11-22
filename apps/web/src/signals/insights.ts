import { cents, dayOfWeek, isWeekendNight, timeWindowOf, HOUR, ms, WISH_WINDOW_MS, type TimeWindow } from './analytics';
import { intentEvents } from './overlay';
import type { Derived, SignalsState } from './store';
import { VIBES } from './types';

export type WhyKey = 'velocity' | 'circadian' | 'payday' | 'leaks' | 'restraint' | 'vault' | 'corridor' | 'vibes' | 'regret';
export interface Why { concept: string; summary: string; yourData: string }
export const WHY_CAUTION = 'These describe patterns in this feed, not you. They are not a diagnosis or clinical advice.';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const windowNames: Record<TimeWindow, string> = { morning: 'morning', afternoon: 'afternoon', evening: 'evening', late_night: 'late night' };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Named, non-diagnostic psychology for each signal, plus one sentence computed from the current feed. */
export function buildWhy(d: Derived, s: SignalsState): Record<WhyKey, Why> {
  const paydayStarts = d.payday.windows.map((w) => ms(w.payroll.at));
  const clusterLabels = d.clusters.map((c) => {
    const inPayday = paydayStarts.some((p) => ms(c.start) >= p && ms(c.start) <= p + 48 * HOUR);
    return `${days[dayOfWeek(c.start)]} ${windowNames[timeWindowOf(c.start)]}${isWeekendNight(c.start) && timeWindowOf(c.start) !== 'afternoon' ? ' (weekend night)' : ''}${inPayday ? ', inside a payday window' : ''}`;
  });
  const lateTagged = d.circadian.lateItems.filter((t) => s.vibes[t.id] === 'hungry_tired' || s.vibes[t.id] === 'stressed').length;
  const lastWin = d.payday.windows.at(-1); const prevWin = d.payday.windows.at(-2);
  const top = d.leaks.habits[0];
  const groceries = d.txns.filter((t) => t.planned && /groceries/i.test(t.merchant));
  const lingers = intentEvents.filter((e) => e.kind === 'product_linger');
  const lingerBought = lingers.filter((e) => e.outcome === 'purchased').length;
  const impulsive = s.wishlist.find((w) => w.purchasedAtMs !== null && w.purchasedAtMs - w.addedAtMs < WISH_WINDOW_MS);
  const tagged = (['planned', 'hungry_tired', 'stressed', 'treat_social'] as const).map((k) => ({ k, ...d.vibeStats[k] })).sort((a, b) => b.cents - a.cents)[0];
  const tagMeta = tagged ? VIBES.find((v) => v.id === tagged.k) : undefined;
  const worstWindow = d.regret.byWindow[0]; const worstMerchant = d.regret.byMerchant[0];
  return {
    velocity: { concept: 'The “what-the-hell” effect',
      summary: 'After one indulgence, self-control often slips for the rest of the episode, so the second and third buys feel cheaper. Bursts of small buys are commonly tied to boredom or mood rather than need.',
      yourData: d.clusters.length ? `${plural(d.clusters.length, 'spree')} in 14 days: ${clusterLabels.join('; ')}.` : 'No spree in view, so there is no burst pattern to explain.' },
    circadian: { concept: 'Decision fatigue and tired self-control',
      summary: 'Late at night you are more tired and hungrier, and delivery apps remove friction. The research on mental “depletion” is debated, but late timing and impulse buying are commonly seen together.',
      yourData: d.circadian.lateCount ? `${plural(d.circadian.lateCount, 'late-night buy', 'late-night buys')}${lateTagged ? `; ${lateTagged} tagged Hungry/Tired or Stressed` : '; tag them to see what drives them'}. Late share of spend: ${Math.round(d.circadian.lateShareSpend * 100)}%.` : 'No late-night buys in this view.' },
    payday: { concept: 'The windfall effect and mental accounting',
      summary: 'New money gets filed as “extra”, so it feels easier to spend than money already in the account. Present bias also makes today’s reward loom larger than a goal weeks away.',
      yourData: lastWin ? `Latest 48h window: ${cents(lastWin.spendCents)}${prevWin ? ` vs ${cents(prevWin.spendCents)} before (${d.payday.creepChangePct === null ? '—' : `${d.payday.creepChangePct > 0 ? '+' : ''}${d.payday.creepChangePct.toFixed(0)}%`})` : ''}${lastWin.firstLatencyHours === null ? '' : `; first big buy ${lastWin.firstLatencyHours.toFixed(1)}h after the deposit`}.` : 'No payroll deposits in view.' },
    leaks: { concept: 'Habit loops and the pain of paying',
      summary: 'Small tickets barely register as a decision, so they run on autopilot. Frequency, not size, is what adds up.',
      yourData: top ? `${top.count} “${top.label}” buys averaging ${cents(Math.round(top.avgCents))} (${cents(top.totalCents)}) vs ${plural(groceries.length, 'planned grocery trip')} totalling ${cents(groceries.reduce((sum, t) => sum + t.amountCents, 0))}.` : 'No repeated small habit in view.' },
    restraint: { concept: 'Friction and hesitation',
      summary: 'Lingering on a page or abandoning a cart is the moment self-control is working. Counting those moments makes restraint visible instead of only counting purchases.',
      yourData: `${lingerBought} of ${lingers.length} product-page lingers ended in a purchase; ${d.restraint.restraint} walk-aways kept ${cents(d.restraint.avoidedCents)} in your account (simulated telemetry).` },
    vault: { concept: 'The hot–cold empathy gap',
      summary: 'In the moment (“hot”) it is hard to imagine wanting something less. After a few days (“cold”) the urge usually fades. A 72-hour wait lets the cold you decide.',
      yourData: impulsive ? `${plural(d.resistance.impulsive, 'item')} bought inside 72h, for example “${impulsive.title}” after ${Math.round(((impulsive.purchasedAtMs ?? 0) - impulsive.addedAtMs) / HOUR)}h. ${d.resistance.resolved - d.resistance.impulsive} of ${d.resistance.resolved} resolved items passed the wait.` : `${d.resistance.resolved} resolved items; none bought inside 72h.` },
    corridor: { concept: 'Cue-triggered cravings',
      summary: 'Places you associate with a treat prompt the urge before you have decided anything. Walking away is a skill that gets easier with practice.',
      yourData: d.geo.avgDwellInMin !== null && d.geo.avgDwellAwayMin !== null ? `Walk-ins averaged ${d.geo.avgDwellInMin.toFixed(0)} min of dwell; walk-aways ${d.geo.avgDwellAwayMin.toFixed(0)} min (simulated, opt-in).` : 'Not enough corridor events yet.' },
    vibes: { concept: 'Affect labelling',
      summary: 'Naming a feeling tends to take some of its pull away, and it shows what you were really buying: fuel, relief, reward or connection.',
      yourData: tagged && tagged.count && tagMeta ? `${tagMeta.emoji} ${tagMeta.label} leads tagged spend at ${cents(tagged.cents)} over ${plural(tagged.count, 'buy')}; ${d.vibeStats.untagged.count} still untagged.` : 'Nothing tagged yet.' },
    regret: { concept: 'Affective forecasting',
      summary: 'We are often poor at predicting how we will feel later. A 48-hour check closes that loop with your own data.',
      yourData: worstWindow ? `${windowNames[worstWindow.key as TimeWindow] ?? worstWindow.key}: ${worstWindow.regret} of ${worstWindow.total} regretted${worstMerchant ? `; top merchant pattern “${worstMerchant.key}” (${worstMerchant.regret}/${worstMerchant.total})` : ''}.` : 'No answers yet.' },
  };
}
