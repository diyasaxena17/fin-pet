/** A simple savings estimate with no interest assumptions. All values are cents. */
export function projectSavings(currentCents: number, monthlyCents: number, months: number): number {
  if (![currentCents, monthlyCents, months].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('Projection inputs must be non-negative integers');
  }
  return currentCents + monthlyCents * months;
}
