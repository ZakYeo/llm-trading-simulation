import { z } from 'zod';

import { agentPersonalityProfileSchema } from '@llm-sim/mcp-contracts';

const agentRoleSchema = z.enum([
  'banker',
  'analyst',
  'lawyer',
  'influencer',
  'trader',
]);

export const createGameSessionRequestSchema = z.object({
  name: z.string().trim().min(1),
  initialBalance: z.string().regex(/^\d+(\.\d{1,4})?$/),
  agents: z
    .array(
      z.object({
        name: z.string().trim().min(1),
        role: agentRoleSchema,
        personality: agentPersonalityProfileSchema.optional(),
      }),
    )
    .min(1),
});

export type CreateGameSessionRequest = z.infer<
  typeof createGameSessionRequestSchema
>;
