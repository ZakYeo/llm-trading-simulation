import { z } from 'zod';

export const gameStateSchema = z.object({
  gameId: z.string().uuid(),
  round: z.number().int().nonnegative(),
  publicSummary: z.string(),
});

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_public_message'),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal('deposit_to_bank'),
    amount: z.string(),
  }),
  z.object({
    type: z.literal('finalize_turn'),
  }),
]);

export type GameState = z.infer<typeof gameStateSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
