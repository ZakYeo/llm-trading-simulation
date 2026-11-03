import { z } from 'zod';

export const placeFundsWithBankerRequestSchema = z.object({
  offerId: z.string().min(1),
  ownerAgentId: z.string().trim().min(1),
  bankerAgentId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/),
});
