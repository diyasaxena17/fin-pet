import type { BankTxn, GeoEvent, IntentEvent, WishItem } from './types';

/**
 * SIMULATED telemetry and test scenarios, labelled as such in the UI. None of it comes from a bank feed.
 * The realistic habits live in the ledger itself; scenarios here only stress-test the analytics.
 * Dates are anchored to the ledger period (2026-11-08 .. 2026-11-21, Toronto, -05:00).
 */
export const BASE_NOW = '2026-11-21T23:59:00-05:00';
export const BASE_NOW_MS = Date.parse(BASE_NOW);
const O = '-05:00';
const at = (date: string, time: string) => `${date}T${time}:00${O}`;
const ms = (date: string, time: string) => Date.parse(at(date, time));
const sim = (id: string, date: string, time: string, merchant: string, category: 'food' | 'shopping' | 'entertainment', amountCents: number, name = merchant): BankTxn =>
  ({ id: `sim-${id}`, at: at(date, time), merchant, name, category, amountCents, direction: 'debit', kind: 'purchase', planned: false, essential: false, source: 'simulated' });

export type ScenarioKey = 'spree' | 'lateNight' | 'paydaySplurge' | 'daytimeOnly';
export const scenarioLabels: Record<ScenarioKey, { title: string; blurb: string }> = {
  spree: { title: 'Trigger another 4-hour spree', blurb: 'Adds 4 shopping/entertainment buys in under 3 hours on Wed Nov 18.' },
  lateNight: { title: 'Add more late-night orders', blurb: 'Adds 4 delivery/e-commerce buys between 11 PM and 1 AM on nights with none.' },
  paydaySplurge: { title: 'Add a bigger payday splurge', blurb: 'Adds 3 large buys within 48h of the Nov 12 payroll.' },
  daytimeOnly: { title: 'Daytime only view', blurb: 'Hides every purchase between 11 PM and 3 AM to compare day vs night.' },
};
/** Scenarios that add purchases. `daytimeOnly` is a filter, not an add-on. */
export const scenarioTxns: Record<Exclude<ScenarioKey, 'daytimeOnly'>, BankTxn[]> = {
  spree: [
    sim('spree-1', '2026-11-18', '14:05', 'Pop-up sneaker drop', 'shopping', 5400),
    sim('spree-2', '2026-11-18', '14:50', 'Arcade token bundle', 'entertainment', 2200),
    sim('spree-3', '2026-11-18', '15:35', 'Vinyl corner record shop', 'shopping', 3600),
    sim('spree-4', '2026-11-18', '16:40', 'Gadget kiosk accessories', 'shopping', 1900),
  ],
  lateNight: [
    sim('late-1', '2026-11-09', '23:40', 'UberEats late order', 'food', 2650, 'Late delivery'),
    sim('late-2', '2026-11-11', '23:30', 'Amazon.ca impulse order', 'shopping', 3899),
    sim('late-3', '2026-11-15', '00:50', 'Domino’s late delivery', 'food', 2250, 'Late delivery'),
    sim('late-4', '2026-11-20', '23:20', 'Shein checkout', 'shopping', 4200),
  ],
  paydaySplurge: [
    sim('pay-1', '2026-11-12', '13:00', 'Holt Renfrew', 'shopping', 8800),
    sim('pay-2', '2026-11-13', '12:00', 'Concert tickets', 'entertainment', 12000),
    sim('pay-3', '2026-11-13', '20:00', 'Omakase dinner', 'food', 9800),
  ],
};

/** Simulated pre-purchase telemetry, written to line up with real ledger purchases. */
export const intentEvents: readonly IntentEvent[] = [
  { id: 'int-01', at: at('2026-11-09', '12:20'), kind: 'delivery_visit', merchant: 'Burrito Boyz app', category: 'food', durationSec: 80, valueCents: 1650, outcome: 'purchased' },
  { id: 'int-02', at: at('2026-11-10', '21:02'), kind: 'product_linger', merchant: 'QuickCart', category: 'shopping', durationSec: 240, valueCents: 3290, outcome: 'purchased' },
  { id: 'int-03', at: at('2026-11-10', '21:12'), kind: 'checkout_entry', merchant: 'QuickCart', category: 'shopping', durationSec: 60, valueCents: 3290, outcome: 'purchased' },
  { id: 'int-04', at: at('2026-11-12', '21:00'), kind: 'checkout_entry', merchant: 'Sephora.ca', category: 'shopping', durationSec: 95, valueCents: 5480, outcome: 'purchased' },
  { id: 'int-05', at: at('2026-11-13', '23:20'), kind: 'checkout_entry', merchant: 'Domino’s app', category: 'food', durationSec: 150, valueCents: 2460, outcome: 'purchased' },
  { id: 'int-06', at: at('2026-11-14', '13:40'), kind: 'shopping_visit', merchant: 'Indigo', category: 'shopping', durationSec: 600, valueCents: 0, outcome: 'browsed' },
  { id: 'int-07', at: at('2026-11-16', '21:45'), kind: 'product_linger', merchant: 'Game shop', category: 'entertainment', durationSec: 340, valueCents: 6900, outcome: 'browsed' },
  { id: 'int-08', at: at('2026-11-17', '17:05'), kind: 'product_linger', merchant: 'Best Buy', category: 'shopping', durationSec: 410, valueCents: 12999, outcome: 'browsed' },
  { id: 'int-09', at: at('2026-11-18', '20:25'), kind: 'cart_abandoned', merchant: 'Nike.ca', category: 'shopping', durationSec: 95, valueCents: 12000, outcome: 'abandoned' },
  { id: 'int-10', at: at('2026-11-19', '17:25'), kind: 'product_linger', merchant: 'Best Buy', category: 'shopping', durationSec: 480, valueCents: 12999, outcome: 'purchased' },
  { id: 'int-11', at: at('2026-11-19', '17:30'), kind: 'checkout_entry', merchant: 'Best Buy', category: 'shopping', durationSec: 45, valueCents: 12999, outcome: 'purchased' },
  { id: 'int-12', at: at('2026-11-20', '12:20'), kind: 'cart_abandoned', merchant: 'Uber Eats', category: 'food', durationSec: 70, valueCents: 2600, outcome: 'abandoned' },
  { id: 'int-13', at: at('2026-11-21', '18:40'), kind: 'product_linger', merchant: 'Amazon.ca', category: 'shopping', durationSec: 185, valueCents: 8900, outcome: 'browsed' },
];
export const seedWishlist: readonly WishItem[] = [
  { id: 'wish-1', title: 'Noise-cancelling headphones', category: 'shopping', priceCents: 19900, addedAtMs: ms('2026-11-14', '10:00'), purchasedAtMs: null },
  { id: 'wish-2', title: 'Sephora skincare set', category: 'shopping', priceCents: 5480, addedAtMs: ms('2026-11-12', '20:35'), purchasedAtMs: ms('2026-11-12', '21:10') },
  { id: 'wish-3', title: 'Wireless earbuds (Best Buy)', category: 'shopping', priceCents: 12999, addedAtMs: ms('2026-11-17', '17:10'), purchasedAtMs: ms('2026-11-19', '17:30') },
  { id: 'wish-4', title: 'Books from Indigo', category: 'shopping', priceCents: 3500, addedAtMs: ms('2026-11-10', '14:00'), purchasedAtMs: ms('2026-11-14', '14:10') },
  { id: 'wish-5', title: 'Game console bundle', category: 'entertainment', priceCents: 34900, addedAtMs: ms('2026-11-13', '22:00'), purchasedAtMs: null },
  { id: 'wish-6', title: 'Running sneakers', category: 'shopping', priceCents: 12000, addedAtMs: ms('2026-11-19', '20:00'), purchasedAtMs: null },
  { id: 'wish-7', title: 'Winter jacket', category: 'shopping', priceCents: 8900, addedAtMs: ms('2026-11-21', '09:00'), purchasedAtMs: null },
];
export const geoEvents: readonly GeoEvent[] = [
  { id: 'geo-1', at: at('2026-11-09', '12:15'), zone: 'Queen St food corridor', dwellMin: 11, outcome: 'walk_in_purchase' },
  { id: 'geo-2', at: at('2026-11-12', '12:20'), zone: 'Queen St food corridor', dwellMin: 12, outcome: 'walk_in_purchase' },
  { id: 'geo-3', at: at('2026-11-14', '14:00'), zone: 'Eaton Centre retail', dwellMin: 24, outcome: 'walk_in_purchase' },
  { id: 'geo-4', at: at('2026-11-14', '16:30'), zone: 'Dundas Square retail', dwellMin: 7, outcome: 'walk_away' },
  { id: 'geo-5', at: at('2026-11-16', '12:30'), zone: 'Queen St food corridor', dwellMin: 13, outcome: 'walk_away' },
  { id: 'geo-6', at: at('2026-11-18', '13:05'), zone: 'Indigo bookstore', dwellMin: 18, outcome: 'walk_away' },
  { id: 'geo-7', at: at('2026-11-19', '17:20'), zone: 'Eaton Centre retail', dwellMin: 35, outcome: 'walk_in_purchase' },
  { id: 'geo-8', at: at('2026-11-20', '18:50'), zone: 'Queen St food corridor', dwellMin: 70, outcome: 'walk_in_purchase' },
  { id: 'geo-9', at: at('2026-11-21', '13:00'), zone: 'Queen St food corridor', dwellMin: 8, outcome: 'walk_away' },
];
