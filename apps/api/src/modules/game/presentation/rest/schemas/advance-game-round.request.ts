import { z } from 'zod';

export const advanceGameRoundRequestSchema = z.object({
  interestRateBps: z.number().int().min(0).max(10000).optional(),
});

export type AdvanceGameRoundRequest = z.infer<
  typeof advanceGameRoundRequestSchema
>;
