import { z } from 'zod';

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
      }),
    )
    .min(1),
});

export type CreateGameSessionRequest = z.infer<
  typeof createGameSessionRequestSchema
>;
