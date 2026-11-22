/**
 * 14-day synthetic bank ledger for the behavioural-signals demo (Nov 8 to Nov 21, 2026, America/Toronto).
 *
 * Origin: the shape (ids, event types, cents, running cash, "Maple Studio payroll (simulated)") follows the C++
 * sandbox ledger in `apps/api/src/sandbox.cpp`. The *content* is rewritten here, on purpose, to carry realistic
 * habits the original scripted story lacked: weekday coffee/takeout autopilot, Thursday paydays, Friday-night
 * social spending, late-night orders, and a relapse in week two. It therefore no longer matches the C++ ledger.
 *
 * Everything is simulated. Timestamps are fixed -05:00 (DST ended 2026-11-01).
 */
export type LedgerEventType = 'budget' | 'income' | 'expense' | 'savings_contribution' | 'investment_contribution'
  | 'investment_return' | 'reflection' | 'decision' | 'vibe_tag';

export interface LedgerEvent {
  id: string; day: number; date: string; occurredAt: string; type: LedgerEventType;
  merchant: string; category: string; amountCents: number; source: 'demo';
  name?: string; planned?: boolean; transactionId?: string; verdict?: string; vibe?: string;
  dailyLimitCents?: number; monthlyLimitCents?: number;
}
export interface LedgerEntry extends LedgerEvent { cashAfterCents: number }
export interface SandboxLedger {
  dataset: 'behaviour-sandbox-14-v2'; startDate: string; utcOffset: string; entries: LedgerEntry[];
  balancesCents: { openingCash: number; income: number; expenses: number; cash: number; savingsContributions: number; investmentContributions: number; simulatedInvestmentReturn: number };
}

export const SANDBOX_START = '2026-11-08';
export const OPENING_CASH_CENTS = 90000;

function dateOffset(start: string, days: number): string {
  const [y, m, d] = start.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
const uuid = (ordinal: number) => `14000000-0000-4000-8000-${String(ordinal).padStart(12, '0')}`;

function schedule(start: string, utcOffset: string): LedgerEvent[] {
  const events: LedgerEvent[] = []; let ordinal = 0;
  const add = (day: number, hm: string, type: LedgerEventType, merchant: string, category: string, amountCents: number, extra: Partial<LedgerEvent> = {}): string => {
    const date = dateOffset(start, day); const id = uuid(++ordinal);
    events.push({ ...extra, id, day: day + 1, date, occurredAt: `${date}T${hm}:00${utcOffset}`, type, merchant, category, amountCents, source: 'demo' });
    return id;
  };
  /** Records an expense and returns its API-style transaction id (`txn-<uuid>`). */
  const spend = (day: number, hm: string, merchant: string, category: string, cents: number, extra: Partial<LedgerEvent> = {}) =>
    `txn-${add(day, hm, 'expense', merchant, category, cents, extra)}`;
  const vibe = (day: number, hm: string, txn: string, tag: 'planned' | 'hungry_tired' | 'stressed' | 'treat_social') =>
    add(day, hm, 'vibe_tag', 'Vibe check-in', 'check_in', 0, { transactionId: txn, vibe: tag });
  const reflect = (day: number, hm: string, txn: string, verdict: 'worth_it' | 'unsure' | 'not_worth_it') =>
    add(day, hm, 'reflection', 'Worth-it check', 'reflection', 0, { transactionId: txn, verdict });
  const market = (day: number) => spend(day, '08:00', 'Corner market essentials', 'food', 275, { planned: true });
  const coffee = (day: number, hm = '08:35') => spend(day, hm, 'Neighbourhood coffee', 'food', 525);
  const takeout = (day: number, hm: string, merchant: string, cents: number) => spend(day, hm, merchant, 'food', cents, { name: 'Takeout' });
  const late = (day: number, hm: string, merchant: string, cents: number) => spend(day, hm, merchant, 'food', cents, { name: 'Late delivery' });

  add(0, '07:00', 'budget', 'Spending plan', 'planning', 0, { dailyLimitCents: 4500, monthlyLimitCents: 180000 });

  // Sun Nov 8: meal-prep groceries, then takeout anyway.
  market(0); spend(0, '11:00', 'No Frills meal-prep groceries', 'food', 6420, { planned: true });
  const sunTakeout = takeout(0, '19:30', 'Pita Kitchen takeout', 1850); vibe(0, '19:50', sunTakeout, 'hungry_tired');
  // Mon Nov 9
  market(1); coffee(1); spend(1, '10:15', 'Transit weekly pass', 'transport', 2500, { planned: true }); takeout(1, '12:30', 'Burrito Boyz takeout', 1650);
  // Tue Nov 10: long day, evening shopping, late-night delivery.
  market(2); coffee(2); takeout(2, '12:35', 'Bento Sushi takeout', 1925);
  spend(2, '18:00', 'Mobile phone bill', 'bills', 4500, { planned: true });
  const qc1 = spend(2, '21:15', 'QuickCart impulse order', 'shopping', 3290); vibe(2, '21:30', qc1, 'stressed');
  const lateTue = late(2, '23:42', 'UberEats late order', 2740); vibe(2, '23:58', lateTue, 'hungry_tired');
  reflect(2, '19:40', sunTakeout, 'not_worth_it');
  // Wed Nov 11
  spend(3, '07:30', 'Music subscription', 'bills', 1099, { planned: true }); market(3); coffee(3, '08:40'); takeout(3, '12:30', 'Pita Kitchen takeout', 1800);
  // Thu Nov 12: payday.
  market(4); add(4, '09:00', 'income', 'Maple Studio payroll (simulated)', 'salary', 125000);
  coffee(4, '09:20'); spend(4, '10:00', 'Shared apartment rent', 'bills', 32500, { planned: true }); takeout(4, '12:40', 'Bento Sushi takeout', 2100);
  const sephora = spend(4, '21:10', 'Sephora online haul', 'shopping', 5480); vibe(4, '21:25', sephora, 'treat_social');
  // Fri Nov 13: Friday-night social spending runs into the small hours.
  market(5); coffee(5); takeout(5, '12:30', 'Burrito Boyz takeout', 1950);
  reflect(5, '08:20', lateTue, 'not_worth_it');
  const beer = spend(5, '18:45', 'Craft beer bar', 'food', 4250); vibe(5, '19:05', beer, 'treat_social');
  const cinema = spend(5, '21:20', 'Cineplex tickets', 'entertainment', 3600); vibe(5, '21:40', cinema, 'treat_social');
  const domFri = late(5, '23:25', 'Domino’s late delivery', 2460); vibe(5, '23:40', domFri, 'treat_social');
  // Sat Nov 14: 00:40 online order, brunch, then an afternoon shopping cluster.
  const amazon = spend(6, '00:40', 'Amazon.ca impulse order', 'shopping', 3899); vibe(6, '00:55', amazon, 'stressed');
  market(6); const brunch = spend(6, '11:00', 'Brunch with friends', 'food', 3850); vibe(6, '11:20', brunch, 'treat_social');
  const books = spend(6, '14:10', 'Indigo unplanned books', 'shopping', 3500);
  spend(6, '14:55', 'Game shop impulse buy', 'entertainment', 2400); spend(6, '15:40', 'Accessories pop-up', 'shopping', 1800); spend(6, '16:20', 'Boba tea', 'food', 750);
  reflect(6, '21:30', sephora, 'unsure');
  // Sun Nov 15: resolve to do better.
  market(7); spend(7, '10:30', 'No Frills meal-prep groceries', 'food', 5875, { planned: true });
  add(7, '19:00', 'savings_contribution', 'Emergency fund transfer', 'savings', 2000);
  add(7, '19:30', 'decision', 'Skipped a delivery order', 'positive_decision', 3100);
  // Mon Nov 16: a better day.
  market(8); spend(8, '08:35', 'Planned coffee treat', 'food', 325, { planned: true }); spend(8, '10:15', 'Transit weekly pass', 'transport', 2500, { planned: true });
  reflect(8, '08:15', domFri, 'not_worth_it'); add(8, '12:35', 'decision', 'Skipped a delivery order', 'positive_decision', 2800); reflect(8, '14:30', books, 'worth_it');
  // Tue Nov 17: stress relapse.
  market(9); coffee(9, '08:40'); takeout(9, '12:35', 'Pita Kitchen takeout', 2050);
  const qc2 = spend(9, '17:20', 'QuickCart impulse order', 'shopping', 4190); vibe(9, '17:35', qc2, 'stressed');
  const shein = spend(9, '23:55', 'Shein checkout', 'shopping', 4200); vibe(9, '23:58', shein, 'stressed');
  // Wed Nov 18: save first, then the Thursday windfall.
  spend(10, '07:30', 'Gym membership', 'bills', 3999, { planned: true }); market(10); coffee(10); takeout(10, '12:30', 'Bento Sushi takeout', 1875);
  add(10, '18:00', 'savings_contribution', 'Emergency fund transfer', 'savings', 4000); add(10, '18:15', 'investment_contribution', 'Simulated index fund contribution', 'investment', 2000);
  // Thu Nov 19: payday windfall.
  market(11); add(11, '09:00', 'income', 'Maple Studio payroll (simulated)', 'salary', 125000);
  coffee(11, '09:25'); spend(11, '10:00', 'Shared apartment rent', 'bills', 32500, { planned: true }); takeout(11, '12:35', 'Pita Kitchen takeout', 2100);
  const bestBuy = spend(11, '17:30', 'Best Buy', 'shopping', 12999); vibe(11, '17:45', bestBuy, 'treat_social');
  const zara = spend(11, '18:05', 'Zara', 'shopping', 8800); vibe(11, '18:20', zara, 'treat_social');
  spend(11, '18:40', 'Starbucks treat', 'food', 925); spend(11, '19:50', 'Uber Eats', 'food', 3180);
  const lateThu = late(11, '23:12', 'UberEats late order', 2890); vibe(11, '23:30', lateThu, 'hungry_tired');
  // Fri Nov 20
  market(12); coffee(12); takeout(12, '12:30', 'Burrito Boyz takeout', 1950); reflect(12, '08:20', shein, 'not_worth_it');
  const dinner = spend(12, '19:00', 'Dinner out with friends', 'food', 6200); vibe(12, '19:20', dinner, 'treat_social');
  spend(12, '21:30', 'Concert merch and drinks', 'entertainment', 5400);
  // Sat Nov 21
  late(13, '00:35', 'Domino’s late delivery', 2640); market(13); coffee(13, '11:40'); takeout(13, '13:15', 'Pita Kitchen takeout', 1850);
  add(13, '21:00', 'investment_return', 'SIMULATED illustrative gain (not a forecast)', 'investment', 12);
  void [qc1, qc2, bestBuy, zara, brunch];

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
  return { dataset: 'behaviour-sandbox-14-v2', startDate: start, utcOffset, entries,
    balancesCents: { openingCash: OPENING_CASH_CENTS, income, expenses, cash, savingsContributions: saved,
      investmentContributions: invested, simulatedInvestmentReturn: returns } };
}
