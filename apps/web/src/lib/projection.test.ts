import { describe, expect, it } from 'vitest';
import { projectSavings, simulateSavings } from './projection';

describe('illustrative projections', () => {
  it('keeps basic projections in cents without mutating state', () => {
    expect(projectSavings(5000, 1000, 12)).toBe(17000);
    expect(() => projectSavings(0, -1, 12)).toThrow();
  });
  it('separates contributions from hypothetical growth', () => {
    expect(simulateSavings(50, 10, 1, 'weekly', 0)).toEqual({ contributions: 570, growth: 0, total: 570 });
    const result = simulateSavings(100, 10, 1, 'monthly', 12);
    expect(result.contributions).toBe(220);
    expect(result.total).toBeCloseTo(239.507533, 4);
    expect(result.growth).toBeCloseTo(result.total - 220, 8);
    expect(() => simulateSavings(0, 10, 1, 'monthly', Infinity)).toThrow();
  });
});
