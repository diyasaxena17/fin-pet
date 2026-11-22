/**
 * TypeScript port of the 14-day synthetic bank ledger that the C++ API generates in
 * `apps/api/src/sandbox.cpp` (`schedule()` + the running-cash loop in `sandbox_snapshot()`).
 * Same event order, ordinals/UUIDs, merchants, categories, amounts and cash arithmetic.
 * Parity with apps/api/SANDBOX.md totals is enforced by `signals.test.ts`.
 *
 * Assumption: timestamps are America/Toronto wall-clock times. The default start (2026-11-08)
 * falls after DST ends (2026-11-01), so the fixed offset is -05:00 for the whole period.
 */
export type LedgerEventType = 'budget' | 'income' | 'expense' | 'savings_contribution' | 'investment_contribution'
  | 'investment_return' | 'lesson' | 'reflection' | 'decision' | 'check_in';

export interface LedgerEvent {
  id: string; day: number; date: string; occurredAt: string; type: LedgerEventType;
  merchant: string; category: string; amountCents: number; source: 'demo';
  name?: string; planned?: boolean; transactionId?: string; verdict?: string;
  lessonId?: string; selectedOptionId?: string; dailyLimitCents?: number; monthlyLimitCents?: number;
}
export interface LedgerEntry extends LedgerEvent { cashAfterCents: number }
export interface SandboxLedger {
  dataset: 'mochi-sandbox-14-v1'; startDate: string; utcOffset: string; entries: LedgerEntry[];
  balancesCents: { openingCash: number; income: number; expenses: number; cash: number; savingsContributions: number; investmentContributions: number; simulatedInvestmentReturn: number };
}

export const SANDBOX_START = '2026-11-08';
export const OPENING_CASH_CENTS = 25000;

function dateOffset(start: string, days: number): string {
  const [y, m, d] = start.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
const pad = (value: number) => String(value).padStart(2, '0');
const uuid = (ordinal: number) => `14000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`;

function schedule(start: string, utcOffset: string): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  let ordinal = 0; let firstTakeout = '';
  const add = (day: number, hour: number, minute: number, type: LedgerEventType, merchant: string,
    category: string, amountCents: number, extra: Partial<LedgerEvent> = {}): string => {
    const date = dateOffset(start, day);
    const id = uuid(++ordinal);
    events.push({ ...extra, id, day: day + 1, date, occurredAt: `${date}T${pad(hour)}:${pad(minute)}:00${utcOffset}`,
      type, merchant, category, amountCents, source: 'demo' });
    return id;
  };
  const savings = [1500, 2500, 2500, 2500, 3000, 3000, 4000];
  const investing = [1000, 1000, 1500, 1500, 2000, 2000, 2500];
  for (let d = 0; d < 14; ++d) {
    if (d === 0 || d === 7 || dateOffset(start, d).slice(0, 7) !== dateOffset(start, d - 1).slice(0, 7))
      add(d, 7, 0, 'budget', 'Mochi spending plan', 'planning', 0, { dailyLimitCents: d < 7 ? 7500 : 2500, monthlyLimitCents: d < 7 ? 200000 : 175000 });
    if (d === 0 || d === 7) {
      add(d, 9, 0, 'income', 'Maple Studio payroll (simulated)', 'salary', 125000);
      add(d, 10, 0, 'expense', 'Shared apartment rent', 'bills', 32500, { planned: true });
      add(d, 10, 15, 'expense', 'Transit weekly pass', 'transport', 2500, { planned: true });
    }
    add(d, 8, 0, 'expense', 'Corner market essentials', 'food', 275, { planned: true });
    if (d < 7) {
      if (d < 5) add(d, 8, 30, 'expense', 'Neighbourhood coffee', 'food', 525);
      if (d < 6) {
        const id = add(d, 12, 30, 'expense', d % 2 ? 'Bento Sushi takeout' : 'Pita Kitchen takeout', 'food', 1800 + d * 75, { name: 'Takeout' });
        if (!firstTakeout) firstTakeout = `txn-${id}`;
      }
      if (d === 1 || d === 4 || d === 6) add(d, 17, 15, 'expense', 'QuickCart impulse order', 'shopping', 2200 + d * 300);
      if (d === 2) {
        add(d, 15, 0, 'expense', 'Indigo unplanned books', 'shopping', 3500);
        add(d, 15, 40, 'expense', 'Game shop impulse buy', 'entertainment', 2400);
        add(d, 16, 15, 'expense', 'Accessories pop-up', 'shopping', 1800);
        add(d, 18, 0, 'expense', 'Mobile phone bill', 'bills', 4500, { planned: true });
      }
      if (d === 5) add(d, 20, 0, 'expense', 'Cinema and snacks', 'entertainment', 4500);
      if (d === 5) add(d, 7, 30, 'expense', 'Music subscription', 'bills', 1099, { planned: true });
      if (d === 1 || d === 5) add(d, 19, 0, 'savings_contribution', 'Emergency fund transfer', 'savings', 500);
      if (d === 5) add(d, 19, 15, 'investment_contribution', 'Simulated index fund contribution', 'investment', 500);
      if (d === 2 || d === 4) add(d, 19, 30, 'lesson', 'Mochi savings lesson', 'education', 0, { lessonId: 'potential-vs-confirmed', selectedOptionId: d === 2 ? 'skip' : 'save' });
      if (d === 3) add(d, 20, 0, 'reflection', 'Worth-It: early takeout', 'reflection', 0, { transactionId: firstTakeout, verdict: 'not_worth_it' });
      if (d === 6) add(d, 20, 0, 'decision', 'Skipped another delivery order', 'positive_decision', 3000);
    } else {
      if (d === 7 || d === 10) add(d, 11, 0, 'expense', 'No Frills meal-prep groceries', 'food', d === 7 ? 4800 : 3200, { planned: true });
      if (d === 8 || d === 12) add(d, 8, 30, 'expense', 'Planned coffee treat', 'food', 325, { planned: true });
      if (d === 9) add(d, 12, 30, 'expense', 'Pita Kitchen planned takeout', 'food', 1600, { name: 'Takeout', planned: true });
      add(d, 18, 0, 'savings_contribution', 'Emergency fund transfer', 'savings', savings[d - 7] ?? 0);
      add(d, 18, 15, 'investment_contribution', 'Simulated index fund contribution', 'investment', investing[d - 7] ?? 0);
      add(d, 19, 0, 'decision', 'Skipped an impulse purchase', 'positive_decision', 2000 + (d - 7) * 500);
      if (d === 8) add(d, 19, 15, 'lesson', 'Mochi budget lesson', 'education', 0, { lessonId: 'budget-target', selectedOptionId: 'limit' });
      add(d, 20, 0, 'check_in', 'Explicit financial check-in', 'check_in', 0);
      if (d === 9 || d === 13) add(d, 21, 0, 'investment_return', 'SIMULATED illustrative gain (not a forecast)', 'investment', d === 9 ? 7 : 12);
    }
  }
  // Same ordering as the API: instant, then id. Same-offset ISO strings sort chronologically.
  return events.sort((a, b) => (a.occurredAt !== b.occurredAt ? (a.occurredAt < b.occurredAt ? -1 : 1) : a.id < b.id ? -1 : 1));
}

export function buildSandboxLedger(start = SANDBOX_START, utcOffset = '-05:00'): SandboxLedger {
  let cash = OPENING_CASH_CENTS, income = 0, expenses = 0, saved = 0, invested = 0, returns = 0;
  const entries: LedgerEntry[] = schedule(start, utcOffset).map((event) => {
    const c = event.amountCents;
    if (event.type === 'income') { cash += c; income += c; }
    else if (event.type === 'expense') { cash -= c; expenses += c; }
    else if (event.type === 'savings_contribution') { cash -= c; saved += c; }
    else if (event.type === 'investment_contribution') { cash -= c; invested += c; }
    else if (event.type === 'investment_return') returns += c;
    if (cash < 0) throw new Error('Sandbox schedule overdraws cash');
    return { ...event, cashAfterCents: cash };
  });
  return { dataset: 'mochi-sandbox-14-v1', startDate: start, utcOffset, entries,
    balancesCents: { openingCash: OPENING_CASH_CENTS, income, expenses, cash, savingsContributions: saved,
      investmentContributions: invested, simulatedInvestmentReturn: returns } };
}
