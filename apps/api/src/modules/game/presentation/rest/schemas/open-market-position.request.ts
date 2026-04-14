import { z } from 'zod';

export const openMarketPositionRequestSchema = z.object({
  ownerAgentId: z.string().trim().min(1),
  opportunityId: z.string().trim().min(1),
  amount: z.string().regex(/^\d+(\.\d{1,4})?$/u),
});
