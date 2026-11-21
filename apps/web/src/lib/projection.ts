/** A simple savings estimate with no interest assumptions. All values are cents. */
export function projectSavings(currentCents: number, monthlyCents: number, months: number): number {
  if (![currentCents, monthlyCents, months].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Projection inputs must be non-negative integers');
  }
  return currentCents + monthlyCents * months;
}

/** An educational scenario with end-of-period contributions and illustrative growth. */
export function simulateSavings(currentCad: number, contributionCad: number, years: number, frequency: 'weekly' | 'monthly', annualRatePercent: number) {
  if (![currentCad, contributionCad, years, annualRatePercent].every(Number.isFinite)
    || currentCad < 0 || contributionCad < 0 || years < 0 || years > 50 || annualRatePercent < 0 || annualRatePercent > 20) {
    throw new Error('Use non-negative amounts, up to 50 years, and an illustrative rate from 0% to 20%.');
  }
  const periodsPerYear = frequency === 'weekly' ? 52 : 12;
  const periods = Math.floor(years * periodsPerYear);
  const rate = annualRatePercent / 100 / periodsPerYear;
  const contributions = currentCad + contributionCad * periods;
  const total = rate === 0 ? contributions
    : currentCad * (1 + rate) ** periods + contributionCad * (((1 + rate) ** periods - 1) / rate);
  return { contributions, growth: total - contributions, total };
}
