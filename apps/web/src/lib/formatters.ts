import type { GameReplayRecord } from './api';

export function formatCurrency(value: string) {
  const amount = Number.parseFloat(value);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatSignedCurrency(value: string) {
  const amount = Number.parseFloat(value);
  const formatted = formatCurrency(value);

  return amount > 0 ? `+${formatted}` : formatted;
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

export function formatBasisPoints(value: number) {
  const sign = value > 0 ? '+' : '';

  return `${sign}${value} bps`;
}

export function getReplayEventLabel(event: GameReplayRecord['events'][number]) {
  if (event.type === 'transfer') {
    return `${event.sourceAgentName} -> ${event.destinationAgentName}`;
  }

  if (event.type === 'custody_placement') {
    return `${event.ownerAgentName} placed funds with ${event.bankerAgentName}`;
  }

  if (event.type === 'custody_redemption') {
    return `${event.ownerAgentName} redeemed from ${event.bankerAgentName}`;
  }

  if (event.type === 'custody_accrual') {
    return `${event.ownerAgentName} accrued custody interest`;
  }

  if (event.type === 'market_opportunity_listed') {
    return `${event.opportunityTitle} listed`;
  }

  if (event.type === 'market_position_opened') {
    return `${event.ownerAgentName} opened ${event.opportunityTitle}`;
  }

  if (event.type === 'market_position_settled') {
    return `${event.ownerAgentName} settled ${event.opportunityTitle}`;
  }

  if (event.type === 'market_opportunity_resolved') {
    return `${event.opportunityTitle} resolved`;
  }

  if (event.type === 'message') {
    return event.visibility === 'private'
      ? `${event.senderAgentName} -> ${event.recipientAgentName ?? 'Unknown'}`
      : `${event.senderAgentName} broadcast`;
  }

  if (event.type === 'action') {
    if (event.actionType === 'request_payment') {
      return `${event.agentName} / request payment`;
    }

    if (event.actionType === 'counter_payment_request') {
      return `${event.agentName} / counter payment request`;
    }

    if (event.actionType === 'accept_payment_request') {
      return `${event.agentName} / accept payment request`;
    }

    if (event.actionType === 'reject_payment_request') {
      return `${event.agentName} / reject payment request`;
    }

    if (event.actionType === 'place_funds_with_banker') {
      return `${event.agentName} / place funds with banker`;
    }

    if (event.actionType === 'redeem_funds_from_banker') {
      return `${event.agentName} / redeem funds from banker`;
    }

    if (event.actionType === 'open_market_position') {
      return `${event.agentName} / open market position`;
    }

    return `${event.agentName} / ${event.actionType}`;
  }

  return event.agentName ?? event.type;
}

export function getReplayEventDetail(
  event: GameReplayRecord['events'][number],
) {
  if (event.type === 'message') {
    return event.content ?? 'No content';
  }

  if (
    event.type === 'custody_placement' ||
    event.type === 'custody_redemption' ||
    event.type === 'custody_accrual'
  ) {
    return event.amount ? `Amount ${formatCurrency(event.amount)}` : null;
  }

  if (event.type === 'market_position_opened') {
    return event.amount ? `Principal ${formatCurrency(event.amount)}` : null;
  }

  if (event.type === 'market_position_settled') {
    return event.profitOrLoss
      ? `PnL ${formatSignedCurrency(event.profitOrLoss)}`
      : null;
  }

  if (event.type === 'market_opportunity_listed') {
    return event.opportunitySummary ?? null;
  }

  if (event.type === 'market_opportunity_resolved') {
    const participantCount = event.participantCount ?? 0;
    const totalPrincipal = event.totalPrincipal
      ? formatCurrency(event.totalPrincipal)
      : null;
    const totalProfitOrLoss = event.totalProfitOrLoss
      ? formatSignedCurrency(event.totalProfitOrLoss)
      : null;

    return [
      participantCount === 1
        ? '1 trader participated'
        : `${participantCount} traders participated`,
      totalPrincipal ? `Total principal ${totalPrincipal}` : null,
      totalProfitOrLoss ? `Net PnL ${totalProfitOrLoss}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }

  if (event.type === 'action') {
    if (
      event.actionType === 'send_private_message' ||
      event.actionType === 'send_public_message'
    ) {
      return null;
    }

    if (event.amount) {
      return `Amount ${formatCurrency(event.amount)}`;
    }

    return 'Action recorded';
  }

  if (event.amount) {
    return `Amount ${formatCurrency(event.amount)}`;
  }

  return 'No content';
}
