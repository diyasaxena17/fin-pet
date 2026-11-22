import { describe, expect, it } from 'vitest';
import { templateBrief } from './brief';

describe('daily brief', () => {
  it('names specific articles and their sources, without trailing questions', () => {
    const text = templateBrief({
      quotes: [{ symbol: 'SPY', price: 689.81, changePct: -3.64 }],
      financeNews: [{ title: 'Bahrain says Iranian attack hits industrial facility - Reuters', source: 'Reuters' }],
      businessNews: [{ title: 'Bank of Canada holds rates steady', source: 'CBC' }],
      generalNews: [],
    });
    expect(text).toContain('SPY, the 500 biggest US companies, is down 3.64 percent.');
    expect(text).toContain('Reuters reports: Bahrain says Iranian attack hits industrial facility.');
    expect(text).toContain('CBC reports: Bank of Canada holds rates steady.');
    expect(text.trim().endsWith('?')).toBe(false);
  });
});
