import { z } from 'zod';

export const placeFundsWithBankerRequestSchema = z.object({
  ownerAgentId: z.string().trim().min(1),
  bankerAgentId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
});
