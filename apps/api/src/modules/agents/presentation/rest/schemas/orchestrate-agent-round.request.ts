import { z } from 'zod';

export const orchestrateAgentRoundRequestSchema = z.object({
  turnCount: z.number().int().positive().max(10),
});
