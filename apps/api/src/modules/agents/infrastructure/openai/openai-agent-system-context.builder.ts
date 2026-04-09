import type { AgentTurnContext } from '@llm-sim/mcp-contracts';

export const defaultOpenAiAgentSystemPrompt =
  'You are a simulated trading-game agent. Your objective is to maximize your own expected fake-money outcome over the session. Choose exactly one next action. Prefer short, concrete messages. Only send targeted actions to agent ids listed in peers. Use propose_direct_transfer, counter_direct_transfer_proposal, place_funds_with_banker, and redeem_funds_from_banker only for positive fake-money amounts. A direct transfer proposal means the recipient would pay the proposer if accepted; it is not a loan offer. Banker-to-trader loan mechanics are not implemented, so banker/trader treasury flows should use custody actions rather than direct transfer proposals. Do not invent treasury product terms that are not provided in context. In particular, do not claim a fixed interest rate, 0% rate, fee schedule, lockup, notice period, or redemption guarantee unless the context explicitly provides it. If custody terms are not explicitly provided, describe only the backend-backed mechanics: custody balances are tracked, redemptions are owner-initiated, and any accrued interest depends on round-advance mechanics rather than conversational promises. Accept, reject, or counter transfer proposals only when a valid recent proposal action is available. If you counter a proposal, send it back to the original proposer. Include a short reasoning field describing why you chose the action. Return null for fields that do not apply to the chosen action. Treat communication, negotiation, and information sharing as tools you may use when they improve expected value. Finalize the turn only when no available action is likely to improve your position or information advantage.';

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

export class OpenAiAgentSystemContextBuilder {
  private readonly segments: string[] = [];

  constructor(
    private readonly context: AgentTurnContext,
    private readonly systemPrompt = defaultOpenAiAgentSystemPrompt,
  ) {}

  addBaseSystemPrompt() {
    this.segments.push(this.systemPrompt);
    return this;
  }

  addPeerSummary() {
    this.segments.push(
      `Valid peer targets: ${this.context.peers
        .map(
          (peer) => `[id=${peer.agentId} name=${peer.name} role=${peer.role}]`,
        )
        .join(
          ' ',
        )}. Never target yourself. If you choose a targeted action, recipientAgentId must exactly equal one of the listed peer ids.`,
    );
    return this;
  }

  addEconomicContextSummary() {
    this.segments.push(
      `Economic context: objective = ${this.context.economicContext.objective} self available balance = ${this.context.self.availableBalance} self deposited principal = ${this.context.self.depositPrincipal} unresolved incoming proposals = ${this.context.economicContext.unresolvedIncomingProposalCount} unresolved outgoing proposals = ${this.context.economicContext.unresolvedOutgoingProposalCount} messages do not move money = ${String(this.context.economicContext.messagesDoNotMoveMoney)} proposals can move money = ${String(this.context.economicContext.proposalsCanMoveMoney)} accepted proposal changes balances = ${String(this.context.economicContext.acceptedProposalChangesBalances)} finalize does not change state = ${String(this.context.economicContext.finalizeDoesNotChangeState)}.`,
    );
    return this;
  }

  addTreasuryContextSummary() {
    const selfPosition = this.context.treasuryContext.selfCustodyPosition
      ? `self custody with banker ${this.context.treasuryContext.selfCustodyPosition.bankerAgentId}: principal = ${this.context.treasuryContext.selfCustodyPosition.principal} accrued interest = ${this.context.treasuryContext.selfCustodyPosition.accruedInterest} total balance = ${this.context.treasuryContext.selfCustodyPosition.totalBalance}.`
      : 'self custody position: none.';
    const bankerObligations =
      this.context.treasuryContext.obligationsForBanker.length === 0
        ? 'banker obligations visible to you: none.'
        : `banker obligations visible to you: ${this.context.treasuryContext.obligationsForBanker
            .map(
              (position) =>
                `[owner=${position.ownerName} ownerId=${position.ownerAgentId} principal=${position.principal} accrued=${position.accruedInterest} total=${position.totalBalance}]`,
            )
            .join(' ')}`;

    this.segments.push(
      `Treasury context: banker id = ${this.context.treasuryContext.bankerAgentId ?? 'none'} banker name = ${this.context.treasuryContext.bankerName ?? 'none'} total custodied principal = ${this.context.treasuryContext.totalCustodiedPrincipal} total custodied accrued interest = ${this.context.treasuryContext.totalCustodiedAccruedInterest} total custodied balance = ${this.context.treasuryContext.totalCustodiedBalance}. Custody balances are backend-tracked. Do not infer a fixed rate, fee schedule, lockup, or notice period unless it is explicitly stated elsewhere in context. Any accrued interest comes from round-advance mechanics, not from free-form promises in chat. ${selfPosition} ${bankerObligations}`,
    );
    return this;
  }

  addActionSemanticsSummary() {
    this.segments.push(
      `Action semantics: send_public_message = ${this.context.actionSemantics.sendPublicMessage} send_private_message = ${this.context.actionSemantics.sendPrivateMessage} propose_direct_transfer = ${this.context.actionSemantics.proposeDirectTransfer} counter_direct_transfer_proposal = ${this.context.actionSemantics.counterDirectTransferProposal} accept_direct_transfer_proposal = ${this.context.actionSemantics.acceptDirectTransferProposal} reject_direct_transfer_proposal = ${this.context.actionSemantics.rejectDirectTransferProposal} place_funds_with_banker = ${this.context.actionSemantics.placeFundsWithBanker} redeem_funds_from_banker = ${this.context.actionSemantics.redeemFundsFromBanker} finalize_turn = ${this.context.actionSemantics.finalizeTurn}`,
    );
    return this;
  }

  addActionableProposalSummary() {
    if (this.context.actionableProposalsForSelf.length === 0) {
      this.segments.push(
        'Actionable proposals for self: none. Accept, reject, or counter are invalid unless a proposal is listed here.',
      );
      return this;
    }

    this.segments.push(
      `Actionable proposals for self: ${this.context.actionableProposalsForSelf
        .map(
          (proposal) =>
            `[id=${proposal.proposalActionId} from=${proposal.proposerName} amount=${proposal.amount} rationale=${proposal.rationale}]`,
        )
        .join(' ')}`,
    );
    return this;
  }

  addNegotiationStateSummary() {
    this.segments.push(
      `Negotiation state: primary counterparty id = ${this.context.negotiationState.primaryCounterpartyAgentId ?? 'none'} primary counterparty name = ${this.context.negotiationState.primaryCounterpartyName ?? 'none'} private exchange count with primary counterparty = ${this.context.negotiationState.privateMessageExchangeCountWithPrimaryCounterparty} unresolved proposal exists with primary counterparty = ${String(this.context.negotiationState.unresolvedProposalExistsWithPrimaryCounterparty)} conversation likely ready for proposal = ${String(this.context.negotiationState.conversationLikelyReadyForProposal)} guidance = ${this.context.negotiationState.guidance}`,
    );
    return this;
  }

  addRoleDirective() {
    const trader = this.context.peers.find((peer) => peer.role === 'trader');
    const banker = this.context.peers.find((peer) => peer.role === 'banker');

    switch (this.context.self.role) {
      case 'banker':
        this.segments.push(
          trader
            ? `Role economics: as the banker, you improve your outcome by attracting and retaining trader ${trader.agentId}'s custodial funds, monitoring custody obligations, and discussing treasury mechanics grounded in the actual game state. Loan-style funding to the trader is not implemented, so focus on custody placement, redemption, and information gathering rather than offering capital deployment. Do not quote a fixed custody yield, 0% rate, fees, lockups, or guaranteed redemption terms unless the context explicitly provides them.`
            : 'Role economics: as the banker, you improve your outcome by attracting custodial funds, monitoring obligations, and gathering information about likely treasury flows.',
        );
        return this;
      case 'trader':
        this.segments.push(
          banker
            ? `Role economics: as the trader, you improve your outcome by deciding whether to place funds with banker ${banker.agentId}, leave funds liquid, or redeem custody when useful. Loan-style borrowing from the banker is not implemented, so do not ask the banker to fund your trading book through direct transfer proposals. Do not assume a quoted custody rate, fee schedule, lockup, or redemption guarantee unless the context explicitly provides it.`
            : 'Role economics: as the trader, you improve your outcome by choosing when to keep funds liquid versus committing them to available treasury mechanics.',
        );
        return this;
      case 'analyst':
        this.segments.push(
          'Role economics: as the analyst, your edge comes from information. Useful public observations can create influence, shape counterparties, and improve future deal terms. Your default advantage is usually public signaling, not bilateral capital negotiation, unless you have a specific concrete edge to offer one counterparty.',
        );
        return this;
      case 'lawyer':
        this.segments.push(
          'Role economics: as the lawyer, your edge comes from identifying risk, enforceability, and constraints that can improve negotiating leverage and future terms. Your default advantage is usually public or deal-supporting guidance, not initiating unrelated private capital negotiation, unless a concrete legal intervention is necessary for a specific deal.',
        );
        return this;
      case 'influencer':
        this.segments.push(
          'Role economics: as the influencer, your edge comes from shaping sentiment and narrative. Strategic public messaging can influence counterparties and deal momentum. Your default advantage is usually broad public signaling rather than direct bilateral capital negotiation unless you have a concrete high-value private angle.',
        );
        return this;
    }
  }

  addTurnSignal() {
    const trader = this.context.peers.find((peer) => peer.role === 'trader');
    const banker = this.context.peers.find((peer) => peer.role === 'banker');
    const pendingProposalForSelf = this.context.recentActions.some(
      (action) =>
        action.recipientAgentId === this.context.self.agentId &&
        (action.type === 'propose_direct_transfer' ||
          action.type === 'counter_direct_transfer_proposal'),
    );
    const publicSignalCount = this.context.recentMessages.filter(
      (message) => message.visibility === 'public',
    ).length;

    if (pendingProposalForSelf) {
      this.segments.push(
        'Current opportunity: a transfer proposal is waiting for your response, so resolving it may dominate passive play.',
      );
      return this;
    }

    if (
      banker &&
      this.context.self.role === 'trader' &&
      hasPriorPrivateMessage(
        this.context,
        banker.agentId,
        this.context.self.agentId,
      )
    ) {
      this.segments.push(
        `Current opportunity: banker ${banker.agentId} has already opened a private channel with you, so there may be value in advancing negotiation rather than waiting.`,
      );
      return this;
    }

    if (
      trader &&
      this.context.self.role === 'banker' &&
      !hasPriorPrivateMessage(
        this.context,
        this.context.self.agentId,
        trader.agentId,
      ) &&
      this.context.turnNumber <= 2
    ) {
      this.segments.push(
        `Current opportunity: trader ${trader.agentId} is a plausible funding counterparty and no direct negotiation channel has been opened yet.`,
      );
      return this;
    }

    if (
      (this.context.self.role === 'analyst' ||
        this.context.self.role === 'lawyer' ||
        this.context.self.role === 'influencer') &&
      publicSignalCount === 0 &&
      this.context.turnNumber <= 2
    ) {
      this.segments.push(
        'Current opportunity: the table has little public information so far, so one useful observation may create informational leverage.',
      );
      return this;
    }

    if (
      (this.context.self.role === 'analyst' ||
        this.context.self.role === 'lawyer' ||
        this.context.self.role === 'influencer') &&
      this.context.turnNumber <= 3
    ) {
      this.segments.push(
        'Decision rule: unless you have a specific counterpart-specific edge to monetize right now, prefer public signaling or waiting over opening a new private bilateral negotiation.',
      );
      return this;
    }

    this.segments.push(
      'Decision rule: compare the expected value of communicating, proposing, or responding against the value of waiting. Finalize only if waiting is truly best.',
    );
    return this;
  }

  build() {
    return this.segments.join(' ');
  }
}
