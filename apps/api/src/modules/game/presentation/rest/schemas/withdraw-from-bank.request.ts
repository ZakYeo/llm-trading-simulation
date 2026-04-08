import { z } from 'zod';

export const withdrawFromBankRequestSchema = z.object({
  agentId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
});

export type WithdrawFromBankRequest = z.infer<
  typeof withdrawFromBankRequestSchema
>;
