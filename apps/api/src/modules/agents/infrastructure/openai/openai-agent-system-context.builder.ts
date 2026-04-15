import type { AgentTurnContext } from '@llm-sim/mcp-contracts';

export const defaultOpenAiAgentSystemPrompt =
  'You are a simulated trading-game agent. Your objective is to maximize your own expected fake-money outcome over the session. Choose exactly one next action. Prefer short, concrete messages. Only send targeted actions to agent ids listed in peers. Use request_payment, counter_payment_request, place_funds_with_banker, redeem_funds_from_banker, and open_market_position only for positive fake-money amounts. A payment request means the recipient would pay the requester if accepted; it is not a loan offer. Banker-to-trader loan mechanics are not implemented. Never use request_payment or counter_payment_request for banker/trader treasury flows. If a trader wants to move funds into banker custody, use place_funds_with_banker targeting the banker. If a trader wants funds back from banker custody, use redeem_funds_from_banker targeting the banker. If a trader wants to commit funds to a listed market opportunity, use open_market_position with a valid opportunityId. Opening a market position can include an immediate percentage fee and deterministic adverse slippage if stated in context, so compare listed opportunity edge against those execution costs. Use payment requests only for non-custody peer-to-peer payments that do not depend on banker lending. Do not invent treasury product terms that are not provided in context. In particular, do not claim a fixed interest rate, 0% rate, fee schedule, lockup, notice period, or redemption guarantee unless the context explicitly provides it. If custody terms are not explicitly provided, describe only the backend-backed mechanics: custody balances are tracked, redemptions are owner-initiated, and any accrued interest depends on round-advance mechanics rather than conversational promises. Treat market opportunities as backend-defined instruments with explicit risk and return bounds; do not invent different payoff mechanics. Current-state context overrides conversational memory. Treat prior conversation as historical discussion, not as authoritative current state. Do not describe any position as open unless it appears in the current open-position lists in context. Do not count settled or absent positions in exposure, liquidity, or sizing commentary. Recompute any capital split from the current balances, custody totals, open-position summaries, and execution-cost context provided. Accept, reject, or counter payment requests only when a valid recent request action is available. If you counter a request, send it back to the original requester. Include a short reasoning field describing why you chose the action. Return null for fields that do not apply to the chosen action. Treat communication, negotiation, and information sharing as tools you may use when they improve expected value. Finalize the turn only when no available action is likely to improve your position or information advantage.';

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

function describeSliderBand(value: number): 'low' | 'balanced' | 'high' {
  if (value <= 3) {
    return 'low';
  }

  if (value >= 7) {
    return 'high';
  }

  return 'balanced';
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

  addPersonalityProfileSummary() {
    const personalityProfile = this.context.self.personalityProfile;

    if (!personalityProfile) {
      this.segments.push(
        'Personality profile: none configured. Use a balanced, neutral communication and decision style.',
      );
      return this;
    }

    if (personalityProfile.kind === 'banker') {
      this.segments.push(
        `Personality profile: banker warmth = ${personalityProfile.warmth} (${describeSliderBand(personalityProfile.warmth)}), sales aggression = ${personalityProfile.salesAggression} (${describeSliderBand(personalityProfile.salesAggression)}), risk discipline = ${personalityProfile.riskDiscipline} (${describeSliderBand(personalityProfile.riskDiscipline)}). Low warmth means terse and transactional; high warmth means relationship-led and reassuring. Low sales aggression means a soft custody pitch and fewer follow-ups; high sales aggression means proactive treasury selling and stronger follow-through. Low risk discipline means you can emphasize growth and deployment more freely; high risk discipline means emphasize liquidity, obligations, and conservative treasury framing.`,
      );
      return this;
    }

    this.segments.push(
      `Personality profile: trader assertiveness = ${personalityProfile.assertiveness} (${describeSliderBand(personalityProfile.assertiveness)}), risk appetite = ${personalityProfile.riskAppetite} (${describeSliderBand(personalityProfile.riskAppetite)}), conviction threshold = ${personalityProfile.convictionThreshold} (${describeSliderBand(personalityProfile.convictionThreshold)}). Low assertiveness means cautious, hedged communication; high assertiveness means direct, decisive communication. Low risk appetite means prefer downside protection, cash, or custody unless trade quality is clearly strong; high risk appetite means tolerate variance and lean more readily into high-upside opportunities. High conviction threshold means require a clearly superior edge before opening a market position; low conviction threshold means a thinner but still positive edge can justify acting.`,
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
      `Action semantics: send_public_message = ${this.context.actionSemantics.sendPublicMessage} send_private_message = ${this.context.actionSemantics.sendPrivateMessage} request_payment = ${this.context.actionSemantics.proposeDirectTransfer} counter_payment_request = ${this.context.actionSemantics.counterDirectTransferProposal} accept_payment_request = ${this.context.actionSemantics.acceptDirectTransferProposal} reject_payment_request = ${this.context.actionSemantics.rejectDirectTransferProposal} place_funds_with_banker = ${this.context.actionSemantics.placeFundsWithBanker} redeem_funds_from_banker = ${this.context.actionSemantics.redeemFundsFromBanker} open_market_position = ${this.context.actionSemantics.openMarketPosition} finalize_turn = ${this.context.actionSemantics.finalizeTurn}`,
    );
    return this;
  }

  addMarketContextSummary() {
    const visibleOpportunities =
      this.context.marketContext.visibleOpportunities.length === 0
        ? 'visible market opportunities: none.'
        : `visible market opportunities: ${this.context.marketContext.visibleOpportunities
            .map(
              (opportunity) =>
                `[id=${opportunity.opportunityId} title=${opportunity.title} risk=${opportunity.riskLevel} signalQuality=${opportunity.signalQuality} holdingPeriodRounds=${opportunity.holdingPeriodRounds} listedRound=${opportunity.listedRound} settlementRound=${opportunity.settlementRound} min=${opportunity.minCommitment} max=${opportunity.maxCommitment} estBps=${opportunity.estimatedNetReturnBps} worstBps=${opportunity.worstCaseReturnBps} bestBps=${opportunity.bestCaseReturnBps} summary=${opportunity.summary}]`,
            )
            .join(' ')}`;
    const selfOpenPositions =
      this.context.marketContext.selfOpenPositions.length === 0
        ? 'self open market positions: none.'
        : `self open market positions: ${this.context.marketContext.selfOpenPositions
            .map(
              (position) =>
                `[id=${position.opportunityId} title=${position.opportunityTitle} principal=${position.principal} entryRound=${position.entryRound} settlementRound=${position.settlementRound} entryFee=${position.entryFeeAmount} entrySlippageBps=${position.entrySlippageBps} effectiveResolutionBps=${position.effectiveResolutionReturnBps}]`,
            )
            .join(' ')}`;
    const primaryCounterpartyOpenPositions =
      this.context.marketContext.primaryCounterpartyOpenPositions.length === 0
        ? 'primary counterparty open market positions: none.'
        : `primary counterparty open market positions: ${this.context.marketContext.primaryCounterpartyOpenPositions
            .map(
              (position) =>
                `[id=${position.opportunityId} title=${position.opportunityTitle} principal=${position.principal} entryRound=${position.entryRound} settlementRound=${position.settlementRound} entryFee=${position.entryFeeAmount} entrySlippageBps=${position.entrySlippageBps} effectiveResolutionBps=${position.effectiveResolutionReturnBps}]`,
            )
            .join(' ')}`;
    const recentSettlements =
      this.context.marketContext.recentSettlements.length === 0
        ? 'recent settled market positions: none.'
        : `recent settled market positions: ${this.context.marketContext.recentSettlements
            .map(
              (settlement) =>
                `[id=${settlement.opportunityId} title=${settlement.opportunityTitle} owner=${settlement.ownerName} ownerId=${settlement.ownerAgentId} principal=${settlement.principal} settledRound=${settlement.settledRound} profitOrLoss=${settlement.profitOrLoss}]`,
            )
            .join(' ')}`;
    const exposureSummary = `Exposure summary: self open position count = ${this.context.marketContext.exposureSummary.selfOpenPositionCount} self open principal = ${this.context.marketContext.exposureSummary.selfOpenPrincipal} self worst case downside = ${this.context.marketContext.exposureSummary.selfOpenWorstCaseDownside} self best case upside = ${this.context.marketContext.exposureSummary.selfOpenBestCaseUpside} self liquid balance = ${this.context.marketContext.exposureSummary.selfLiquidBalance} self reserved balance = ${this.context.marketContext.exposureSummary.selfReservedBalance} self custodied balance = ${this.context.marketContext.exposureSummary.selfCustodiedBalance} primary counterparty id = ${this.context.marketContext.exposureSummary.primaryCounterpartyAgentId ?? 'none'} primary counterparty name = ${this.context.marketContext.exposureSummary.primaryCounterpartyName ?? 'none'} primary counterparty role = ${this.context.marketContext.exposureSummary.primaryCounterpartyRole ?? 'none'} primary counterparty open position count = ${this.context.marketContext.exposureSummary.primaryCounterpartyOpenPositionCount} primary counterparty open principal = ${this.context.marketContext.exposureSummary.primaryCounterpartyOpenPrincipal} primary counterparty worst case downside = ${this.context.marketContext.exposureSummary.primaryCounterpartyOpenWorstCaseDownside} primary counterparty best case upside = ${this.context.marketContext.exposureSummary.primaryCounterpartyOpenBestCaseUpside} primary counterparty liquid balance = ${this.context.marketContext.exposureSummary.primaryCounterpartyLiquidBalance} primary counterparty reserved balance = ${this.context.marketContext.exposureSummary.primaryCounterpartyReservedBalance} primary counterparty custodied balance = ${this.context.marketContext.exposureSummary.primaryCounterpartyCustodiedBalance}.`;
    const executionCosts = `Execution costs: entry fee = ${this.context.marketContext.executionCostModel.entryFeeBps} bps. ${this.context.marketContext.executionCostModel.slippageRuleSummary}`;

    this.segments.push(
      `Market context: ${visibleOpportunities} ${selfOpenPositions} ${primaryCounterpartyOpenPositions} ${recentSettlements} ${exposureSummary} ${executionCosts} Only positions listed as open are currently open. Anything not listed in the open-position sections should be treated as settled, closed, or unavailable.`,
    );
    return this;
  }

  addActionableProposalSummary() {
    if (this.context.actionableProposalsForSelf.length === 0) {
      this.segments.push(
        'Actionable payment requests for self: none. Accept, reject, or counter are invalid unless a request is listed here.',
      );
      return this;
    }

    this.segments.push(
      `Actionable payment requests for self: ${this.context.actionableProposalsForSelf
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
            ? `Role economics: as the banker, you improve your outcome by attracting and retaining trader ${trader.agentId}'s custodial funds, monitoring custody obligations, and discussing treasury mechanics grounded in the actual game state. Loan-style funding to the trader is not implemented, so focus on custody placement, redemption, and information gathering rather than offering capital deployment. Do not ask the trader to use payment requests for custody. If you want trader funds in custody, discuss it in messages and let the trader choose place_funds_with_banker. Do not quote a fixed custody yield, 0% rate, fees, lockups, or guaranteed redemption terms unless the context explicitly provides them. When discussing trader exposure or liquidity, rely on the current primary-counterparty balances and open-position summaries. Do not carry forward stale positions from prior chat if they are absent from the current open-position lists.`
            : 'Role economics: as the banker, you improve your outcome by attracting custodial funds, monitoring obligations, and gathering information about likely treasury flows.',
        );
        return this;
      case 'trader':
        this.segments.push(
          banker
            ? `Role economics: as the trader, you improve your outcome by deciding whether to place funds with banker ${banker.agentId}, leave funds liquid, or commit capital to listed market opportunities. Loan-style borrowing from the banker is not implemented, so do not ask the banker to fund your trading book through payment requests. If you decide to move funds into banker custody, use place_funds_with_banker targeting banker ${banker.agentId}. If you decide to pull funds back out, use redeem_funds_from_banker targeting banker ${banker.agentId}. When evaluating market opportunities, compare the structured facts provided in context, including expected return, downside range, signal quality, holding period, and your current balance and open positions.`
            : 'Role economics: as the trader, you improve your outcome by choosing when to keep funds liquid versus committing them to available treasury or market mechanics.',
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
        (action.type === 'request_payment' ||
          action.type === 'counter_payment_request'),
    );
    const publicSignalCount = this.context.recentMessages.filter(
      (message) => message.visibility === 'public',
    ).length;

    if (pendingProposalForSelf) {
      this.segments.push(
        'Current opportunity: a payment request is waiting for your response, so resolving it may dominate passive play.',
      );
      return this;
    }

    if (
      this.context.self.role === 'trader' &&
      this.context.marketContext.visibleOpportunities.length > 0 &&
      this.context.marketContext.selfOpenPositions.length === 0
    ) {
      this.segments.push(
        'Current opportunity: at least one listed market opportunity is available. Compare the provided opportunity facts against custody and staying liquid before deciding whether to open a position.',
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
        `Current opportunity: banker ${banker.agentId} has already opened a private channel with you, so there may be value in advancing negotiation or, if you are ready to move funds into custody, directly using place_funds_with_banker rather than a payment request.`,
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
