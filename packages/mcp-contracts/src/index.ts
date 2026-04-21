import { z } from 'zod';

const personalitySliderSchema = z.number().int().min(0).max(10);

export const bankerPersonalityProfileSchema = z.object({
  kind: z.literal('banker'),
  warmth: personalitySliderSchema,
  salesAggression: personalitySliderSchema,
  riskDiscipline: personalitySliderSchema,
});

export const traderPersonalityProfileSchema = z.object({
  kind: z.literal('trader'),
  assertiveness: personalitySliderSchema,
  riskAppetite: personalitySliderSchema,
  convictionThreshold: personalitySliderSchema,
});

export const agentPersonalityProfileSchema = z.discriminatedUnion('kind', [
  bankerPersonalityProfileSchema,
  traderPersonalityProfileSchema,
]);

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

export const agentToolNameSchema = z.enum([
  'messaging.send_public',
  'messaging.send_private',
  'transfer.request_payment',
  'transfer.counter_payment_request',
  'transfer.accept_payment_request',
  'transfer.reject_payment_request',
  'treasury.place_with_banker',
  'treasury.redeem_from_banker',
  'market.open_position',
  'turn.finalize',
]);

export const sendPublicMessageArgumentsSchema = z
  .object({
    content: z.string().min(1),
  })
  .strict();

export const sendPrivateMessageArgumentsSchema = z
  .object({
    recipientAgentId: z.string().min(1),
    content: z.string().min(1),
  })
  .strict();

export const requestPaymentArgumentsSchema = z
  .object({
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const counterPaymentRequestArgumentsSchema = z
  .object({
    proposalActionId: z.string().min(1),
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const acceptPaymentRequestArgumentsSchema = z
  .object({
    proposalActionId: z.string().min(1),
  })
  .strict();

export const rejectPaymentRequestArgumentsSchema = z
  .object({
    proposalActionId: z.string().min(1),
    rationale: z.string().min(1),
  })
  .strict();

export const placeFundsWithBankerArgumentsSchema = z
  .object({
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
  })
  .strict();

export const redeemFundsFromBankerArgumentsSchema = z
  .object({
    recipientAgentId: z.string().min(1),
    amount: z.string().min(1),
  })
  .strict();

export const openMarketPositionArgumentsSchema = z
  .object({
    opportunityId: z.string().min(1),
    amount: z.string().min(1),
  })
  .strict();

export const finalizeTurnArgumentsSchema = z.object({}).strict();

export const agentToolInvocationSchema = z.discriminatedUnion('name', [
  z
    .object({
      name: z.literal('messaging.send_public'),
      arguments: sendPublicMessageArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('messaging.send_private'),
      arguments: sendPrivateMessageArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('transfer.request_payment'),
      arguments: requestPaymentArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('transfer.counter_payment_request'),
      arguments: counterPaymentRequestArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('transfer.accept_payment_request'),
      arguments: acceptPaymentRequestArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('transfer.reject_payment_request'),
      arguments: rejectPaymentRequestArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('treasury.place_with_banker'),
      arguments: placeFundsWithBankerArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('treasury.redeem_from_banker'),
      arguments: redeemFundsFromBankerArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('market.open_position'),
      arguments: openMarketPositionArgumentsSchema,
    })
    .strict(),
  z
    .object({
      name: z.literal('turn.finalize'),
      arguments: finalizeTurnArgumentsSchema,
    })
    .strict(),
]);

export const agentDecisionEnvelopeSchema = z
  .object({
    tool: agentToolInvocationSchema,
    reasoning: z.string().min(1).optional(),
  })
  .strict();

export function parseAgentToolInvocation(input: unknown) {
  return agentToolInvocationSchema.parse(input);
}

export function parseAgentDecisionEnvelope(input: unknown) {
  return agentDecisionEnvelopeSchema.parse(input);
}

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
    personalityProfile: agentPersonalityProfileSchema.nullable(),
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
        signalQuality: z.enum(['low', 'medium', 'high']),
        holdingPeriodRounds: z.number().int().positive(),
      }),
    ),
    selfOpenPositions: z.array(
      z.object({
        opportunityId: z.string().min(1),
        opportunityTitle: z.string().min(1),
        principal: z.string(),
        entryRound: z.number().int().nonnegative(),
        settlementRound: z.number().int().nonnegative(),
        entryFeeAmount: z.string(),
        entrySlippageBps: z.number().int().nonnegative(),
        effectiveResolutionReturnBps: z.number().int(),
      }),
    ),
    primaryCounterpartyOpenPositions: z.array(
      z.object({
        opportunityId: z.string().min(1),
        opportunityTitle: z.string().min(1),
        principal: z.string(),
        entryRound: z.number().int().nonnegative(),
        settlementRound: z.number().int().nonnegative(),
        entryFeeAmount: z.string(),
        entrySlippageBps: z.number().int().nonnegative(),
        effectiveResolutionReturnBps: z.number().int(),
      }),
    ),
    recentSettlements: z.array(
      z.object({
        opportunityId: z.string().min(1),
        opportunityTitle: z.string().min(1),
        ownerAgentId: z.string().min(1),
        ownerName: z.string().min(1),
        principal: z.string(),
        settledRound: z.number().int().nonnegative(),
        profitOrLoss: z.string(),
      }),
    ),
    exposureSummary: z.object({
      selfOpenPositionCount: z.number().int().nonnegative(),
      selfOpenPrincipal: z.string(),
      selfOpenWorstCaseDownside: z.string(),
      selfOpenBestCaseUpside: z.string(),
      selfLiquidBalance: z.string(),
      selfReservedBalance: z.string(),
      selfCustodiedBalance: z.string(),
      primaryCounterpartyAgentId: z.string().min(1).nullable(),
      primaryCounterpartyName: z.string().min(1).nullable(),
      primaryCounterpartyRole: z
        .enum(['banker', 'analyst', 'lawyer', 'influencer', 'trader'])
        .nullable(),
      primaryCounterpartyOpenPositionCount: z.number().int().nonnegative(),
      primaryCounterpartyOpenPrincipal: z.string(),
      primaryCounterpartyOpenWorstCaseDownside: z.string(),
      primaryCounterpartyOpenBestCaseUpside: z.string(),
      primaryCounterpartyLiquidBalance: z.string(),
      primaryCounterpartyReservedBalance: z.string(),
      primaryCounterpartyCustodiedBalance: z.string(),
    }),
    executionCostModel: z.object({
      entryFeeBps: z.number().int().nonnegative(),
      slippageRuleSummary: z.string().min(1),
    }),
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
export type AgentToolName = z.infer<typeof agentToolNameSchema>;
export type SendPublicMessageArguments = z.infer<
  typeof sendPublicMessageArgumentsSchema
>;
export type SendPrivateMessageArguments = z.infer<
  typeof sendPrivateMessageArgumentsSchema
>;
export type RequestPaymentArguments = z.infer<
  typeof requestPaymentArgumentsSchema
>;
export type CounterPaymentRequestArguments = z.infer<
  typeof counterPaymentRequestArgumentsSchema
>;
export type AcceptPaymentRequestArguments = z.infer<
  typeof acceptPaymentRequestArgumentsSchema
>;
export type RejectPaymentRequestArguments = z.infer<
  typeof rejectPaymentRequestArgumentsSchema
>;
export type PlaceFundsWithBankerArguments = z.infer<
  typeof placeFundsWithBankerArgumentsSchema
>;
export type RedeemFundsFromBankerArguments = z.infer<
  typeof redeemFundsFromBankerArgumentsSchema
>;
export type OpenMarketPositionArguments = z.infer<
  typeof openMarketPositionArgumentsSchema
>;
export type FinalizeTurnArguments = z.infer<typeof finalizeTurnArgumentsSchema>;
export type AgentToolInvocation = z.infer<typeof agentToolInvocationSchema>;
export type AgentDecisionEnvelope = z.infer<typeof agentDecisionEnvelopeSchema>;
export type AgentTurnContext = z.infer<typeof agentTurnContextSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type BankerPersonalityProfile = z.infer<
  typeof bankerPersonalityProfileSchema
>;
export type TraderPersonalityProfile = z.infer<
  typeof traderPersonalityProfileSchema
>;
export type AgentPersonalityProfile = z.infer<
  typeof agentPersonalityProfileSchema
>;
