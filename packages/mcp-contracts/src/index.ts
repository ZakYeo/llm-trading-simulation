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

export const recentAgentActionSchema = z.object({
  actionId: z.string().min(1),
  agentId: z.string().min(1),
  agentName: z.string().min(1),
  recipientAgentId: z.string().min(1).nullable(),
  type: z.enum([
    'send_public_message',
    'send_private_message',
    'propose_direct_transfer',
    'counter_direct_transfer_proposal',
    'accept_direct_transfer_proposal',
    'reject_direct_transfer_proposal',
    'finalize_turn',
  ]),
  amount: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  relatedProposalActionId: z.string().min(1).optional(),
  roundNumber: z.number().int().nonnegative(),
  turnNumber: z.number().int().positive(),
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
  recentActions: z.array(recentAgentActionSchema),
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
    type: z.literal('counter_direct_transfer_proposal'),
    proposalActionId: z.string().min(1),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
  }),
  z.object({
    type: z.literal('accept_direct_transfer_proposal'),
    proposalActionId: z.string().min(1),
  }),
  z.object({
    type: z.literal('reject_direct_transfer_proposal'),
    proposalActionId: z.string().min(1),
    rationale: z.string().min(1),
  }),
  z.object({
    type: z.literal('finalize_turn'),
  }),
]);

export type GameState = z.infer<typeof gameStateSchema>;
export type RecentAgentMessage = z.infer<typeof recentAgentMessageSchema>;
export type RecentAgentAction = z.infer<typeof recentAgentActionSchema>;
export type AgentTurnContext = z.infer<typeof agentTurnContextSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
