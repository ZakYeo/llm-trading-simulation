import { z } from 'zod';

export const gameStateSchema = z.object({
  gameId: z.string().min(1),
  round: z.number().int().nonnegative(),
  publicSummary: z.string(),
});

export const recentAgentMessageSchema = z.object({
  senderAgentId: z.string().min(1),
  senderName: z.string().min(1),
  recipientAgentId: z.string().min(1).nullable(),
  visibility: z.enum(['public', 'private']),
  content: z.string().min(1),
});

export const agentTurnContextSchema = z.object({
  gameId: z.string().min(1),
  sessionName: z.string().min(1),
  round: z.number().int().nonnegative(),
  turnNumber: z.number().int().positive(),
  self: z.object({
    agentId: z.string().min(1),
    name: z.string().min(1),
    role: z.enum(['banker', 'analyst', 'lawyer', 'influencer', 'trader']),
    availableBalance: z.string(),
    depositPrincipal: z.string(),
  }),
  peers: z.array(
    z.object({
      agentId: z.string().min(1),
      name: z.string().min(1),
      role: z.enum(['banker', 'analyst', 'lawyer', 'influencer', 'trader']),
    }),
  ),
  recentMessages: z.array(recentAgentMessageSchema),
});

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_public_message'),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal('send_private_message'),
    recipientAgentId: z.string().min(1),
    content: z.string().min(1),
  }),
  z.object({
    type: z.literal('propose_direct_transfer'),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
  }),
  z.object({
    type: z.literal('finalize_turn'),
  }),
]);

export type GameState = z.infer<typeof gameStateSchema>;
export type RecentAgentMessage = z.infer<typeof recentAgentMessageSchema>;
export type AgentTurnContext = z.infer<typeof agentTurnContextSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
