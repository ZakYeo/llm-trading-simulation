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
    'request_payment',
    'counter_payment_request',
    'accept_payment_request',
    'reject_payment_request',
    'place_funds_with_banker',
    'redeem_funds_from_banker',
    'open_market_position',
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
  actionableProposalsForSelf: z.array(
    z.object({
      proposalActionId: z.string().min(1),
      proposerAgentId: z.string().min(1),
      proposerName: z.string().min(1),
      amount: z.string().min(1),
      rationale: z.string().min(1),
    }),
  ),
  negotiationState: z.object({
    primaryCounterpartyAgentId: z.string().min(1).nullable(),
    primaryCounterpartyName: z.string().min(1).nullable(),
    privateMessageExchangeCountWithPrimaryCounterparty: z
      .number()
      .int()
      .nonnegative(),
    unresolvedProposalExistsWithPrimaryCounterparty: z.boolean(),
    conversationLikelyReadyForProposal: z.boolean(),
    guidance: z.string().min(1),
  }),
  treasuryContext: z.object({
    bankerAgentId: z.string().min(1).nullable(),
    bankerName: z.string().min(1).nullable(),
    totalCustodiedPrincipal: z.string(),
    totalCustodiedAccruedInterest: z.string(),
    totalCustodiedBalance: z.string(),
    selfCustodyPosition: z
      .object({
        bankerAgentId: z.string().min(1),
        principal: z.string(),
        accruedInterest: z.string(),
        totalBalance: z.string(),
      })
      .nullable(),
    obligationsForBanker: z.array(
      z.object({
        ownerAgentId: z.string().min(1),
        ownerName: z.string().min(1),
        principal: z.string(),
        accruedInterest: z.string(),
        totalBalance: z.string(),
      }),
    ),
  }),
  marketContext: z.object({
    visibleOpportunities: z.array(
      z.object({
        opportunityId: z.string().min(1),
        title: z.string().min(1),
        summary: z.string().min(1),
        riskLevel: z.enum(['low', 'high']),
        listedRound: z.number().int().nonnegative(),
        settlementRound: z.number().int().nonnegative(),
        minCommitment: z.string(),
        maxCommitment: z.string(),
        estimatedNetReturnBps: z.number().int(),
        worstCaseReturnBps: z.number().int(),
        bestCaseReturnBps: z.number().int(),
      }),
    ),
    selfOpenPositions: z.array(
      z.object({
        opportunityId: z.string().min(1),
        opportunityTitle: z.string().min(1),
        principal: z.string(),
        entryRound: z.number().int().nonnegative(),
        settlementRound: z.number().int().nonnegative(),
      }),
    ),
  }),
  economicContext: z.object({
    objective: z.string().min(1),
    messagesDoNotMoveMoney: z.boolean(),
    proposalsCanMoveMoney: z.boolean(),
    acceptedProposalChangesBalances: z.boolean(),
    finalizeDoesNotChangeState: z.boolean(),
    unresolvedIncomingProposalCount: z.number().int().nonnegative(),
    unresolvedOutgoingProposalCount: z.number().int().nonnegative(),
  }),
  actionSemantics: z.object({
    sendPublicMessage: z.string().min(1),
    sendPrivateMessage: z.string().min(1),
    proposeDirectTransfer: z.string().min(1),
    counterDirectTransferProposal: z.string().min(1),
    acceptDirectTransferProposal: z.string().min(1),
    rejectDirectTransferProposal: z.string().min(1),
    placeFundsWithBanker: z.string().min(1),
    redeemFundsFromBanker: z.string().min(1),
    openMarketPosition: z.string().min(1),
    finalizeTurn: z.string().min(1),
  }),
});

export const agentActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('send_public_message'),
    content: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('send_private_message'),
    recipientAgentId: z.string().min(1),
    content: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('request_payment'),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('counter_payment_request'),
    proposalActionId: z.string().min(1),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('accept_payment_request'),
    proposalActionId: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('reject_payment_request'),
    proposalActionId: z.string().min(1),
    rationale: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('place_funds_with_banker'),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('redeem_funds_from_banker'),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('open_market_position'),
    opportunityId: z.string().min(1),
    amount: z.string().min(1),
    reasoning: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('finalize_turn'),
    reasoning: z.string().min(1).optional(),
  }),
]);

export type GameState = z.infer<typeof gameStateSchema>;
export type RecentAgentMessage = z.infer<typeof recentAgentMessageSchema>;
export type RecentAgentAction = z.infer<typeof recentAgentActionSchema>;
export type AgentTurnContext = z.infer<typeof agentTurnContextSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
