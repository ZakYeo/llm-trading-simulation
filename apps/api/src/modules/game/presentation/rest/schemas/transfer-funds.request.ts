import { z } from 'zod';

export const transferFundsRequestSchema = z.object({
  sourceAgentId: z.string().trim().min(1),
  destinationAgentId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
});

export type TransferFundsRequest = z.infer<typeof transferFundsRequestSchema>;
