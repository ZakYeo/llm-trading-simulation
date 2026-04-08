import { z } from 'zod';

export const depositToBankRequestSchema = z.object({
  agentId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
});

export type DepositToBankRequest = z.infer<typeof depositToBankRequestSchema>;
