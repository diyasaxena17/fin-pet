import type { BankTxn, GeoEvent, IntentEvent, WishItem } from './types';
import { OPENING_CASH_CENTS } from './ledger';

/**
 * Everything here is SIMULATED and labelled as such in the UI. The adapted bank ledger is never
 * modified: scenario transactions are layered on top only while their toggle is on.
 * Dates are anchored to the sandbox period (2026-11-08 .. 2026-11-21, Toronto, -05:00).
 */
export const BASE_NOW = '2026-11-21T23:59:00-05:00';
export const BASE_NOW_MS = Date.parse(BASE_NOW);
const O = '-05:00';
const sim = (id: string, date: string, time: string, merchant: string, category: 'food' | 'shopping' | 'entertainment', amountCents: number, name = merchant): BankTxn =>
  ({ id: `sim-${id}`, at: `${date}T${time}:00${O}`, merchant, name, category, amountCents, direction: 'debit', kind: 'purchase', planned: false, essential: false, source: 'simulated' });

export type ScenarioKey = 'spree' | 'lateNight' | 'paydaySplurge';
export const scenarioLabels: Record<ScenarioKey, { title: string; blurb: string }> = {
  spree: { title: 'Trigger 4-hour spree', blurb: '4 shopping/entertainment buys in under 3 hours on Nov 20.' },
  lateNight: { title: 'Add late-night orders', blurb: 'Delivery + e-commerce between 11 PM and 2 AM (4 purchases).' },
  paydaySplurge: { title: 'Payday windfall splurge', blurb: '3 big discretionary buys within 48h of the Nov 15 payroll.' },
};
export const scenarioTxns: Record<ScenarioKey, BankTxn[]> = {
  spree: [
    sim('spree-1', '2026-11-20', '14:05', 'Pop-up sneaker drop', 'shopping', 5400),
    sim('spree-2', '2026-11-20', '14:50', 'Arcade token bundle', 'entertainment', 2200),
    sim('spree-3', '2026-11-20', '15:35', 'Vinyl corner record shop', 'shopping', 3600),
    sim('spree-4', '2026-11-20', '16:40', 'Gadget kiosk accessories', 'shopping', 1900),
  ],
  lateNight: [
    sim('late-1', '2026-11-15', '23:40', 'UberEats late order', 'food', 2650, 'Late delivery'),
    sim('late-2', '2026-11-16', '00:35', 'Amazon.ca impulse order', 'shopping', 3899),
    sim('late-3', '2026-11-17', '01:20', 'Domino’s late delivery', 'food', 2250, 'Late delivery'),
    sim('late-4', '2026-11-19', '23:15', 'Shein checkout', 'shopping', 4200),
  ],
  paydaySplurge: [
    sim('pay-1', '2026-11-15', '13:00', 'Sephora haul', 'shopping', 8800),
    sim('pay-2', '2026-11-16', '12:00', 'Concert tickets', 'entertainment', 12000),
    sim('pay-3', '2026-11-16', '19:00', 'Omakase dinner', 'food', 9800),
  ],
};
/** Overlay purchases debit the account too; exposed so tests can assert the cash trail stays non-negative. */
export const openingCashCents = OPENING_CASH_CENTS;

const at = (date: string, time: string) => `${date}T${time}:00${O}`;
export const intentEvents: readonly IntentEvent[] = [
  { id: 'int-1', at: at('2026-11-12', '12:10'), kind: 'delivery_visit', merchant: 'Pita Kitchen app', category: 'food', durationSec: 95, valueCents: 1950, outcome: 'purchased' },
  { id: 'int-2', at: at('2026-11-12', '12:14'), kind: 'checkout_entry', merchant: 'Pita Kitchen app', category: 'food', durationSec: 40, valueCents: 1950, outcome: 'purchased' },
  { id: 'int-3', at: at('2026-11-14', '17:05'), kind: 'product_linger', merchant: 'QuickCart', category: 'shopping', durationSec: 210, valueCents: 4000, outcome: 'browsed' },
  { id: 'int-4', at: at('2026-11-14', '17:09'), kind: 'cart_abandoned', merchant: 'QuickCart', category: 'shopping', durationSec: 60, valueCents: 4000, outcome: 'abandoned' },
  { id: 'int-5', at: at('2026-11-16', '19:20'), kind: 'delivery_visit', merchant: 'Bento Sushi app', category: 'food', durationSec: 150, valueCents: 2400, outcome: 'abandoned' },
  { id: 'int-6', at: at('2026-11-17', '21:45'), kind: 'product_linger', merchant: 'Game shop', category: 'entertainment', durationSec: 340, valueCents: 6900, outcome: 'browsed' },
  { id: 'int-7', at: at('2026-11-18', '13:00'), kind: 'shopping_visit', merchant: 'Indigo', category: 'shopping', durationSec: 420, valueCents: 0, outcome: 'browsed' },
  { id: 'int-8', at: at('2026-11-19', '20:30'), kind: 'cart_abandoned', merchant: 'Nike.ca', category: 'shopping', durationSec: 95, valueCents: 12000, outcome: 'abandoned' },
  { id: 'int-9', at: at('2026-11-20', '14:02'), kind: 'checkout_entry', merchant: 'Pop-up sneaker drop', category: 'shopping', durationSec: 70, valueCents: 5400, outcome: 'purchased' },
  { id: 'int-10', at: at('2026-11-21', '18:40'), kind: 'product_linger', merchant: 'Amazon.ca', category: 'shopping', durationSec: 185, valueCents: 8900, outcome: 'browsed' },
];
const h = (iso: string) => Date.parse(iso);
export const seedWishlist: readonly WishItem[] = [
  { id: 'wish-1', title: 'Noise-cancelling headphones', category: 'shopping', priceCents: 19900, addedAtMs: h(at('2026-11-15', '10:00')), purchasedAtMs: null },
  { id: 'wish-2', title: 'Late-night ramen delivery', category: 'food', priceCents: 3200, addedAtMs: h(at('2026-11-12', '23:10')), purchasedAtMs: h(at('2026-11-12', '23:55')) },
  { id: 'wish-3', title: 'Board game', category: 'entertainment', priceCents: 4500, addedAtMs: h(at('2026-11-14', '12:00')), purchasedAtMs: h(at('2026-11-18', '12:00')) },
  { id: 'wish-4', title: 'Running sneakers', category: 'shopping', priceCents: 12000, addedAtMs: h(at('2026-11-19', '20:00')), purchasedAtMs: null },
  { id: 'wish-5', title: 'Winter jacket', category: 'shopping', priceCents: 8900, addedAtMs: h(at('2026-11-21', '09:00')), purchasedAtMs: null },
];
export const geoEvents: readonly GeoEvent[] = [
  { id: 'geo-1', at: at('2026-11-10', '12:20'), zone: 'Queen St food corridor', dwellMin: 14, outcome: 'walk_in_purchase' },
  { id: 'geo-2', at: at('2026-11-11', '12:25'), zone: 'Queen St food corridor', dwellMin: 6, outcome: 'walk_away' },
  { id: 'geo-3', at: at('2026-11-12', '17:10'), zone: 'Eaton Centre retail', dwellMin: 22, outcome: 'walk_in_purchase' },
  { id: 'geo-4', at: at('2026-11-14', '17:00'), zone: 'Eaton Centre retail', dwellMin: 9, outcome: 'walk_away' },
  { id: 'geo-5', at: at('2026-11-16', '12:35'), zone: 'Queen St food corridor', dwellMin: 11, outcome: 'walk_away' },
  { id: 'geo-6', at: at('2026-11-18', '13:05'), zone: 'Indigo bookstore', dwellMin: 18, outcome: 'walk_away' },
  { id: 'geo-7', at: at('2026-11-19', '18:15'), zone: 'Dundas Square retail', dwellMin: 7, outcome: 'walk_away' },
  { id: 'geo-8', at: at('2026-11-20', '14:10'), zone: 'Dundas Square retail', dwellMin: 25, outcome: 'walk_in_purchase' },
];
