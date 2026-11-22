import { describe, expect, it } from 'vitest';
import { transactionSchema } from '@mochi/contracts';
import { bankRequestId, todaysBankTransactions } from './bankFeed';

describe('sample bank feed (Plaid stand-in)', () => {
  it('gives valid transactions for today with stable per-day IDs', () => {
    const now = new Date(2026, 10, 22, 14, 30);
    const feed = todaysBankTransactions(now);
    expect(feed).toHaveLength(4);
    for (const { id, ...input } of feed) {
      expect(() => transactionSchema.parse(input)).not.toThrow();
      expect(id).toBe(`txn-${input.requestId}`);
      const at = new Date(input.occurredAt);
      expect(at.getDate()).toBe(22);
      expect(at.getTime()).toBeLessThan(now.getTime());
    }
    expect(todaysBankTransactions(new Date(2026, 10, 22, 18)).map(t => t.requestId)).toEqual(feed.map(t => t.requestId));
    expect(bankRequestId(new Date(2026, 10, 23), 0)).not.toBe(feed[0]!.requestId);
  });

  it('keeps early-morning purchases inside today', () => {
    const now = new Date(2026, 10, 22, 0, 30);
    for (const t of todaysBankTransactions(now)) {
      const at = new Date(t.occurredAt);
      expect(at.getDate()).toBe(22);
      expect(at.getTime()).toBeLessThan(now.getTime());
    }
  });
});
