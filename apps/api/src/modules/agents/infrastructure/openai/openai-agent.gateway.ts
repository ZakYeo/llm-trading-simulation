import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';
import { agentActionSchema } from '@llm-sim/mcp-contracts';
import type OpenAI from 'openai';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';

const defaultSystemPrompt =
  'You are a simulated trading-game agent. Your objective is to maximize your own expected fake-money outcome over the session. Choose exactly one next action. Prefer short, concrete messages. Only send targeted actions to agent ids listed in peers. Use propose_direct_transfer, counter_direct_transfer_proposal, place_funds_with_banker, and redeem_funds_from_banker only for positive fake-money amounts. A direct transfer proposal means the recipient would pay the proposer if accepted; it is not a loan offer. Banker-to-trader loan mechanics are not implemented, so banker/trader treasury flows should use custody actions rather than direct transfer proposals. Do not invent treasury product terms that are not provided in context. In particular, do not claim a fixed interest rate, 0% rate, fee schedule, lockup, notice period, or redemption guarantee unless the context explicitly provides it. If custody terms are not explicitly provided, describe only the backend-backed mechanics: custody balances are tracked, redemptions are owner-initiated, and any accrued interest depends on round-advance mechanics rather than conversational promises. Accept, reject, or counter transfer proposals only when a valid recent proposal action is available. If you counter a proposal, send it back to the original proposer. Include a short reasoning field describing why you chose the action. Return null for fields that do not apply to the chosen action. Treat communication, negotiation, and information sharing as tools you may use when they improve expected value. Finalize the turn only when no available action is likely to improve your position or information advantage.';
const agentDecisionJsonSchema = {
  name: 'agent_decision',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: [
      'type',
      'recipientAgentId',
      'content',
      'amount',
      'rationale',
      'proposalActionId',
      'reasoning',
    ],
    properties: {
      type: {
        type: 'string',
        enum: [
          'send_public_message',
          'send_private_message',
          'propose_direct_transfer',
          'counter_direct_transfer_proposal',
          'accept_direct_transfer_proposal',
          'reject_direct_transfer_proposal',
          'place_funds_with_banker',
          'redeem_funds_from_banker',
          'finalize_turn',
        ],
      },
      recipientAgentId: {
        type: ['string', 'null'],
      },
      content: {
        type: ['string', 'null'],
      },
      amount: {
        type: ['string', 'null'],
      },
      rationale: {
        type: ['string', 'null'],
      },
      proposalActionId: {
        type: ['string', 'null'],
      },
      reasoning: {
        type: ['string', 'null'],
      },
    },
  },
} as const;

interface RawAgentDecision {
  type: AgentAction['type'];
  recipientAgentId: string | null;
  content: string | null;
  amount: string | null;
  rationale: string | null;
  proposalActionId: string | null;
  reasoning: string | null;
}

function normalizeAgentDecision(rawDecision: RawAgentDecision): AgentAction {
  switch (rawDecision.type) {
    case 'send_public_message':
      if (!rawDecision.content) {
        throw new DomainInvariantError(
          'send_public_message requires content from the model.',
        );
      }

      return {
        type: rawDecision.type,
        content: rawDecision.content,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'send_private_message':
      if (!rawDecision.recipientAgentId || !rawDecision.content) {
        throw new DomainInvariantError(
          'send_private_message requires recipientAgentId and content from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId: rawDecision.recipientAgentId,
        content: rawDecision.content,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'propose_direct_transfer':
      if (
        !rawDecision.recipientAgentId ||
        !rawDecision.amount ||
        !rawDecision.rationale
      ) {
        throw new DomainInvariantError(
          'propose_direct_transfer requires recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId: rawDecision.recipientAgentId,
        amount: rawDecision.amount,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'counter_direct_transfer_proposal':
      if (
        !rawDecision.proposalActionId ||
        !rawDecision.recipientAgentId ||
        !rawDecision.amount ||
        !rawDecision.rationale
      ) {
        throw new DomainInvariantError(
          'counter_direct_transfer_proposal requires proposalActionId, recipientAgentId, amount, and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        recipientAgentId: rawDecision.recipientAgentId,
        amount: rawDecision.amount,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'accept_direct_transfer_proposal':
      if (!rawDecision.proposalActionId) {
        throw new DomainInvariantError(
          'accept_direct_transfer_proposal requires proposalActionId from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'reject_direct_transfer_proposal':
      if (!rawDecision.proposalActionId || !rawDecision.rationale) {
        throw new DomainInvariantError(
          'reject_direct_transfer_proposal requires proposalActionId and rationale from the model.',
        );
      }

      return {
        type: rawDecision.type,
        proposalActionId: rawDecision.proposalActionId,
        rationale: rawDecision.rationale,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'place_funds_with_banker':
      if (!rawDecision.recipientAgentId || !rawDecision.amount) {
        throw new DomainInvariantError(
          'place_funds_with_banker requires recipientAgentId and amount from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId: rawDecision.recipientAgentId,
        amount: rawDecision.amount,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'redeem_funds_from_banker':
      if (!rawDecision.recipientAgentId || !rawDecision.amount) {
        throw new DomainInvariantError(
          'redeem_funds_from_banker requires recipientAgentId and amount from the model.',
        );
      }

      return {
        type: rawDecision.type,
        recipientAgentId: rawDecision.recipientAgentId,
        amount: rawDecision.amount,
        reasoning: rawDecision.reasoning ?? undefined,
      };
    case 'finalize_turn':
      return {
        type: rawDecision.type,
        reasoning: rawDecision.reasoning ?? undefined,
      };
  }
}

function hasPriorPrivateMessage(
  context: AgentTurnContext,
  senderAgentId: string,
  recipientAgentId: string,
): boolean {
  return context.recentMessages.some(
    (message) =>
      message.senderAgentId === senderAgentId &&
      message.recipientAgentId === recipientAgentId &&
      message.visibility === 'private',
  );
}

function buildRoleDirective(context: AgentTurnContext): string {
  const trader = context.peers.find((peer) => peer.role === 'trader');
  const banker = context.peers.find((peer) => peer.role === 'banker');

  switch (context.self.role) {
    case 'banker':
      return trader
        ? `Role economics: as the banker, you improve your outcome by attracting and retaining trader ${trader.agentId}'s custodial funds, monitoring custody obligations, and discussing treasury mechanics grounded in the actual game state. Loan-style funding to the trader is not implemented, so focus on custody placement, redemption, and information gathering rather than offering capital deployment. Do not quote a fixed custody yield, 0% rate, fees, lockups, or guaranteed redemption terms unless the context explicitly provides them.`
        : 'Role economics: as the banker, you improve your outcome by attracting custodial funds, monitoring obligations, and gathering information about likely treasury flows.';
    case 'trader':
      return banker
        ? `Role economics: as the trader, you improve your outcome by deciding whether to place funds with banker ${banker.agentId}, leave funds liquid, or redeem custody when useful. Loan-style borrowing from the banker is not implemented, so do not ask the banker to fund your trading book through direct transfer proposals. Do not assume a quoted custody rate, fee schedule, lockup, or redemption guarantee unless the context explicitly provides it.`
        : 'Role economics: as the trader, you improve your outcome by choosing when to keep funds liquid versus committing them to available treasury mechanics.';
    case 'analyst':
      return 'Role economics: as the analyst, your edge comes from information. Useful public observations can create influence, shape counterparties, and improve future deal terms. Your default advantage is usually public signaling, not bilateral capital negotiation, unless you have a specific concrete edge to offer one counterparty.';
    case 'lawyer':
      return 'Role economics: as the lawyer, your edge comes from identifying risk, enforceability, and constraints that can improve negotiating leverage and future terms. Your default advantage is usually public or deal-supporting guidance, not initiating unrelated private capital negotiation, unless a concrete legal intervention is necessary for a specific deal.';
    case 'influencer':
      return 'Role economics: as the influencer, your edge comes from shaping sentiment and narrative. Strategic public messaging can influence counterparties and deal momentum. Your default advantage is usually broad public signaling rather than direct bilateral capital negotiation unless you have a concrete high-value private angle.';
  }
}

function buildTurnSignal(context: AgentTurnContext): string {
  const trader = context.peers.find((peer) => peer.role === 'trader');
  const banker = context.peers.find((peer) => peer.role === 'banker');
  const pendingProposalForSelf = context.recentActions.some(
    (action) =>
      action.recipientAgentId === context.self.agentId &&
      (action.type === 'propose_direct_transfer' ||
        action.type === 'counter_direct_transfer_proposal'),
  );
  const publicSignalCount = context.recentMessages.filter(
    (message) => message.visibility === 'public',
  ).length;

  if (pendingProposalForSelf) {
    return 'Current opportunity: a transfer proposal is waiting for your response, so resolving it may dominate passive play.';
  }

  if (
    banker &&
    context.self.role === 'trader' &&
    hasPriorPrivateMessage(context, banker.agentId, context.self.agentId)
  ) {
    return `Current opportunity: banker ${banker.agentId} has already opened a private channel with you, so there may be value in advancing negotiation rather than waiting.`;
  }

  if (
    trader &&
    context.self.role === 'banker' &&
    !hasPriorPrivateMessage(context, context.self.agentId, trader.agentId) &&
    context.turnNumber <= 2
  ) {
    return `Current opportunity: trader ${trader.agentId} is a plausible funding counterparty and no direct negotiation channel has been opened yet.`;
  }

  if (
    (context.self.role === 'analyst' ||
      context.self.role === 'lawyer' ||
      context.self.role === 'influencer') &&
    publicSignalCount === 0 &&
    context.turnNumber <= 2
  ) {
    return 'Current opportunity: the table has little public information so far, so one useful observation may create informational leverage.';
  }

  if (
    (context.self.role === 'analyst' ||
      context.self.role === 'lawyer' ||
      context.self.role === 'influencer') &&
    context.turnNumber <= 3
  ) {
    return 'Decision rule: unless you have a specific counterpart-specific edge to monetize right now, prefer public signaling or waiting over opening a new private bilateral negotiation.';
  }

  return 'Decision rule: compare the expected value of communicating, proposing, or responding against the value of waiting. Finalize only if waiting is truly best.';
}

function buildActionSemanticsSummary(context: AgentTurnContext): string {
  return `Action semantics: send_public_message = ${context.actionSemantics.sendPublicMessage} send_private_message = ${context.actionSemantics.sendPrivateMessage} propose_direct_transfer = ${context.actionSemantics.proposeDirectTransfer} counter_direct_transfer_proposal = ${context.actionSemantics.counterDirectTransferProposal} accept_direct_transfer_proposal = ${context.actionSemantics.acceptDirectTransferProposal} reject_direct_transfer_proposal = ${context.actionSemantics.rejectDirectTransferProposal} place_funds_with_banker = ${context.actionSemantics.placeFundsWithBanker} redeem_funds_from_banker = ${context.actionSemantics.redeemFundsFromBanker} finalize_turn = ${context.actionSemantics.finalizeTurn}`;
}

function buildEconomicContextSummary(context: AgentTurnContext): string {
  return `Economic context: objective = ${context.economicContext.objective} self available balance = ${context.self.availableBalance} self deposited principal = ${context.self.depositPrincipal} unresolved incoming proposals = ${context.economicContext.unresolvedIncomingProposalCount} unresolved outgoing proposals = ${context.economicContext.unresolvedOutgoingProposalCount} messages do not move money = ${String(context.economicContext.messagesDoNotMoveMoney)} proposals can move money = ${String(context.economicContext.proposalsCanMoveMoney)} accepted proposal changes balances = ${String(context.economicContext.acceptedProposalChangesBalances)} finalize does not change state = ${String(context.economicContext.finalizeDoesNotChangeState)}.`;
}

function buildTreasuryContextSummary(context: AgentTurnContext): string {
  const selfPosition = context.treasuryContext.selfCustodyPosition
    ? `self custody with banker ${context.treasuryContext.selfCustodyPosition.bankerAgentId}: principal = ${context.treasuryContext.selfCustodyPosition.principal} accrued interest = ${context.treasuryContext.selfCustodyPosition.accruedInterest} total balance = ${context.treasuryContext.selfCustodyPosition.totalBalance}.`
    : 'self custody position: none.';
  const bankerObligations =
    context.treasuryContext.obligationsForBanker.length === 0
      ? 'banker obligations visible to you: none.'
      : `banker obligations visible to you: ${context.treasuryContext.obligationsForBanker
          .map(
            (position) =>
              `[owner=${position.ownerName} ownerId=${position.ownerAgentId} principal=${position.principal} accrued=${position.accruedInterest} total=${position.totalBalance}]`,
          )
          .join(' ')}`;

  return `Treasury context: banker id = ${context.treasuryContext.bankerAgentId ?? 'none'} banker name = ${context.treasuryContext.bankerName ?? 'none'} total custodied principal = ${context.treasuryContext.totalCustodiedPrincipal} total custodied accrued interest = ${context.treasuryContext.totalCustodiedAccruedInterest} total custodied balance = ${context.treasuryContext.totalCustodiedBalance}. Custody balances are backend-tracked. Do not infer a fixed rate, fee schedule, lockup, or notice period unless it is explicitly stated elsewhere in context. Any accrued interest comes from round-advance mechanics, not from free-form promises in chat. ${selfPosition} ${bankerObligations}`;
}

function buildActionableProposalSummary(context: AgentTurnContext): string {
  if (context.actionableProposalsForSelf.length === 0) {
    return 'Actionable proposals for self: none. Accept, reject, or counter are invalid unless a proposal is listed here.';
  }

  return `Actionable proposals for self: ${context.actionableProposalsForSelf
    .map(
      (proposal) =>
        `[id=${proposal.proposalActionId} from=${proposal.proposerName} amount=${proposal.amount} rationale=${proposal.rationale}]`,
    )
    .join(' ')}`;
}

function buildPeerSummary(context: AgentTurnContext): string {
  return `Valid peer targets: ${context.peers
    .map((peer) => `[id=${peer.agentId} name=${peer.name} role=${peer.role}]`)
    .join(
      ' ',
    )}. Never target yourself. If you choose a targeted action, recipientAgentId must exactly equal one of the listed peer ids.`;
}

function buildNegotiationStateSummary(context: AgentTurnContext): string {
  return `Negotiation state: primary counterparty id = ${context.negotiationState.primaryCounterpartyAgentId ?? 'none'} primary counterparty name = ${context.negotiationState.primaryCounterpartyName ?? 'none'} private exchange count with primary counterparty = ${context.negotiationState.privateMessageExchangeCountWithPrimaryCounterparty} unresolved proposal exists with primary counterparty = ${String(context.negotiationState.unresolvedProposalExistsWithPrimaryCounterparty)} conversation likely ready for proposal = ${String(context.negotiationState.conversationLikelyReadyForProposal)} guidance = ${context.negotiationState.guidance}`;
}

export class OpenAiAgentGateway implements AgentGatewayPort {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
    private readonly systemPrompt: string = defaultSystemPrompt,
    private readonly strictMode = false,
  ) {}

  private buildPrompt(context: AgentTurnContext): string {
    return [
      this.systemPrompt,
      buildPeerSummary(context),
      buildEconomicContextSummary(context),
      buildTreasuryContextSummary(context),
      buildActionSemanticsSummary(context),
      buildActionableProposalSummary(context),
      buildNegotiationStateSummary(context),
      buildRoleDirective(context),
      buildTurnSignal(context),
    ].join(' ');
  }

  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: [
          {
            role: 'system',
            content: this.buildPrompt(context),
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            ...agentDecisionJsonSchema,
          },
        },
      });

      if (!response.output_text) {
        throw new DomainInvariantError(
          'OpenAI agent gateway returned no structured action.',
        );
      }

      const parsedAction = agentActionSchema.parse(
        normalizeAgentDecision(
          JSON.parse(response.output_text) as RawAgentDecision,
        ),
      );

      console.info(
        JSON.stringify({
          type: 'agent_decision',
          gameSessionId: context.gameId,
          turnNumber: context.turnNumber,
          agentId: context.self.agentId,
          agentName: context.self.name,
          role: context.self.role,
          actionType: parsedAction.type,
          recipientAgentId:
            'recipientAgentId' in parsedAction
              ? parsedAction.recipientAgentId
              : null,
          proposalActionId:
            'proposalActionId' in parsedAction
              ? parsedAction.proposalActionId
              : null,
          reasoning: parsedAction.reasoning ?? null,
        }),
      );

      return parsedAction;
    } catch (error) {
      console.error(
        JSON.stringify({
          type: 'agent_decision_error',
          gameSessionId: context.gameId,
          turnNumber: context.turnNumber,
          agentId: context.self.agentId,
          agentName: context.self.name,
          role: context.self.role,
          error: error instanceof Error ? error.message : String(error),
        }),
      );

      if (this.strictMode) {
        throw error;
      }

      return {
        type: 'finalize_turn',
      };
    }
  }
}
