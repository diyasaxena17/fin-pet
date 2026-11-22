import type { TransactionInput } from '@mochi/contracts';

/**
 * Stand-in for the Plaid bank feed (Plaid is planned, not connected). Gives today's card
 * purchases as if the bank had sent them, so the app reads spending instead of asking the
 * user to log it. IDs are fixed per day, so syncing twice never double counts.
 */
const SAMPLE = [
  { name: 'Tim Hortons', category: 'food', amount: 4.75, minutesAgo: 300 },
  { name: 'Campus Bookstore', category: 'shopping', amount: 18.99, minutesAgo: 200 },
  { name: 'Presto transit', category: 'transport', amount: 3.3, minutesAgo: 120 },
  { name: 'Uber Eats', category: 'food', amount: 26.4, minutesAgo: 25 },
] as const;

export interface BankTransaction extends TransactionInput { id: string }

const pad = (value: number, size = 2) => String(value).padStart(size, '0');

/** UUID shaped like v4 so the API accepts it; the same day and index always give the same ID. */
export function bankRequestId(day: Date, index: number): string {
  return `d0d0${pad(day.getMonth() + 1)}${pad(day.getDate())}-${day.getFullYear()}-4000-8000-${pad(index + 1, 12)}`;
}

export function todaysBankTransactions(now: Date = new Date()): BankTransaction[] {
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return SAMPLE.map((item, index) => {
    // Keep every purchase inside today and never in the future.
    const at = Math.min(now.getTime() - 1000, Math.max(startOfDay + (index + 1) * 60_000, now.getTime() - item.minutesAgo * 60_000));
    const requestId = bankRequestId(now, index);
    return {
      id: `txn-${requestId}`, requestId, name: item.name, amount: item.amount, category: item.category,
      occurredAt: new Date(at).toISOString(),
    };
  });
}

/**
 * Savings and investing transfers for the current two-week period (the 14 days ending today), standing in
 * for what Plaid would read from the bank. Not stored in the backend, whose transactions are purchases only.
 */
export interface BankTransfer { date: string; kind: 'save' | 'invest'; name: string; amount: number }
const TRANSFERS = [
  { daysAgo: 12, kind: 'save', name: 'Transfer to Savings', amount: 45 },
  { daysAgo: 11, kind: 'invest', name: 'Wealthsimple TFSA', amount: 75 },
  { daysAgo: 8, kind: 'save', name: 'Transfer to Savings', amount: 45 },
  { daysAgo: 4, kind: 'save', name: 'Transfer to Savings', amount: 45 },
  { daysAgo: 3, kind: 'invest', name: 'Wealthsimple TFSA', amount: 75 },
  { daysAgo: 1, kind: 'save', name: 'Transfer to Savings', amount: 45 },
] as const;

export function twoWeekTransfers(now: Date = new Date()): BankTransfer[] {
  return TRANSFERS.map(t => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - t.daysAgo);
    return { date: d.toLocaleDateString('en-CA'), kind: t.kind, name: t.name, amount: t.amount };
  });
}

export function twoWeekTotals(now: Date = new Date()) {
  const items = twoWeekTransfers(now);
  const sum = (kind: BankTransfer['kind']) => Math.round(items.filter(t => t.kind === kind).reduce((s, t) => s + t.amount, 0) * 100) / 100;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
  return { saved: sum('save'), invested: sum('invest'), dayNum: 14, start: start.toLocaleDateString('en-CA'), end: now.toLocaleDateString('en-CA') };
}
