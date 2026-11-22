import type { TransactionCategory } from '@mochi/contracts';
import type { LedgerCategory, BankTxn, SkippedDecision, LedgerReflection, Direction, Vibe } from './types';
import type { SandboxLedger } from './ledger';

const spendCategories: readonly string[] = ['food', 'shopping', 'transport', 'entertainment', 'bills', 'other'];
const isSpendCategory = (value: string): value is TransactionCategory => spendCategories.includes(value);
/** Rent, bills, transit and household staples are treated as essential, never as impulse spend. */
const essentialPattern = /market essentials|groceries/i;

export interface AdaptedLedger {
  transactions: BankTxn[];
  skippedDecisions: SkippedDecision[];
  reflections: LedgerReflection[];
  /** Vibe check-ins already answered in the feed, keyed by transaction id. */
  vibes: Record<string, Vibe>;
  /** Ledger event types with no bank movement (lessons, check-ins, budgets) are dropped here. */
  ignored: number;
}

/** Maps the ledger onto `BankTxn`. Expense ids use the API's `txn-<uuid>` format. */
export function adaptLedger(ledger: SandboxLedger): AdaptedLedger {
  const transactions: BankTxn[] = []; const skippedDecisions: SkippedDecision[] = []; const reflections: LedgerReflection[] = []; const vibes: Record<string, Vibe> = {};
  let ignored = 0;
  for (const e of ledger.entries) {
    const base = { at: e.occurredAt, merchant: e.merchant, name: e.name ?? e.merchant, amountCents: e.amountCents, source: 'demo' as const };
    if (e.type === 'expense') {
      if (!isSpendCategory(e.category)) throw new Error(`Unknown expense category: ${e.category}`);
      const essential = e.category === 'bills' || e.category === 'transport' || essentialPattern.test(e.merchant);
      transactions.push({ ...base, id: `txn-${e.id}`, category: e.category, direction: 'debit', kind: 'purchase', planned: e.planned ?? false, essential });
    } else if (e.type === 'income') {
      transactions.push({ ...base, id: e.id, category: 'salary', direction: 'payroll', kind: 'income', planned: true, essential: true });
    } else if (e.type === 'savings_contribution' || e.type === 'investment_contribution') {
      transactions.push({ ...base, id: e.id, category: (e.type === 'savings_contribution' ? 'savings' : 'investment') satisfies LedgerCategory,
        direction: 'debit' satisfies Direction, kind: 'transfer', planned: true, essential: true });
    } else if (e.type === 'investment_return') {
      transactions.push({ ...base, id: e.id, category: 'investment', direction: 'credit', kind: 'return', planned: true, essential: true });
    } else if (e.type === 'decision') {
      skippedDecisions.push({ id: e.id, at: e.occurredAt, merchant: e.merchant, valueCents: e.amountCents });
    } else if (e.type === 'reflection' && e.transactionId && (e.verdict === 'worth_it' || e.verdict === 'unsure' || e.verdict === 'not_worth_it')) {
      reflections.push({ transactionId: e.transactionId, verdict: e.verdict, at: e.occurredAt });
    } else if (e.type === 'vibe_tag' && e.transactionId && (e.vibe === 'planned' || e.vibe === 'hungry_tired' || e.vibe === 'stressed' || e.vibe === 'treat_social')) {
      vibes[e.transactionId] = e.vibe;
    } else ignored += 1;
  }
  return { transactions, skippedDecisions, reflections, vibes, ignored };
}
