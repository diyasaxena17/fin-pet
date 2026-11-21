import { z } from 'zod';

/** CAD on the wire, integer cents in the domain and persistence layers. */
export const moneySchema = z.number().finite().min(0.01).max(1_000_000_000)
  .refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'Use at most two decimal places');
