import type { GameReplayRecord } from './api';

export function formatCurrency(value: string) {
  const amount = Number.parseFloat(value);

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
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
