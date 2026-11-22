import type { TransactionCategory } from '@mochi/contracts';

export type Direction = 'debit' | 'credit' | 'payroll';
export type LedgerCategory = TransactionCategory | 'salary' | 'savings' | 'investment';
export type TxnSource = 'demo' | 'simulated';

/** Behavioural-analysis view of one bank movement. Amounts are integer cents (CAD). */
export interface BankTxn {
  id: string;
  /** ISO-8601 with local offset; wall-clock fields are read from the string itself. */
  at: string;
  merchant: string;
  /** Habit label: the ledger `name` when present (e.g. "Takeout"), else the merchant. */
  name: string;
  category: LedgerCategory;
  amountCents: number;
  direction: Direction;
  /** purchase = spend; transfer = savings/investing moves; income = payroll; return = investment gain. */
  kind: 'purchase' | 'transfer' | 'income' | 'return';
  planned: boolean;
  essential: boolean;
  source: TxnSource;
}

export interface SkippedDecision { id: string; at: string; merchant: string; valueCents: number }
export interface LedgerReflection { transactionId: string; verdict: 'worth_it' | 'unsure' | 'not_worth_it'; at: string }

export type Vibe = 'planned' | 'hungry_tired' | 'stressed' | 'treat_social';
export const VIBES: readonly { id: Vibe; emoji: string; label: string }[] = [
  { id: 'planned', emoji: '🧠', label: 'Planned' },
  { id: 'hungry_tired', emoji: '🍔', label: 'Hungry/Tired' },
  { id: 'stressed', emoji: '😩', label: 'Stressed' },
  { id: 'treat_social', emoji: '🔥', label: 'Treat/Social' },
];
export type Pulse = 'worth' | 'regret';

export type IntentKind = 'delivery_visit' | 'shopping_visit' | 'checkout_entry' | 'cart_abandoned' | 'product_linger';
export interface IntentEvent {
  id: string; at: string; kind: IntentKind; merchant: string; category: TransactionCategory;
  durationSec: number; valueCents: number; outcome: 'purchased' | 'abandoned' | 'browsed';
}
export interface WishItem {
  id: string; title: string; category: TransactionCategory; priceCents: number;
  addedAtMs: number; purchasedAtMs: number | null;
}
export type WishStatus = 'waiting' | 'resisted' | 'purchased';
export interface GeoEvent {
  id: string; at: string; zone: string; dwellMin: number; outcome: 'walk_away' | 'walk_in_purchase';
}
