import type { AuditTrailTimelineEvent } from './audit-trail';

/** Messages and their send-action audit rows represent one conversation entry. */
export function toConversationEvents(
  events: AuditTrailTimelineEvent[],
): AuditTrailTimelineEvent[] {
  const pairedActions = new Set<string>();
  const messages = new Map<string, AuditTrailTimelineEvent>();
  for (const message of events) {
    if (message.type !== 'message') continue;
    const action = events.find(
      (candidate) =>
        candidate.type === 'action' &&
        !pairedActions.has(candidate.id) &&
        candidate.actionType ===
          (message.visibility === 'private'
            ? 'send_private_message'
            : 'send_public_message') &&
        candidate.agentId === message.senderAgentId &&
        candidate.recipientAgentId === message.recipientAgentId &&
        candidate.roundNumber === message.roundNumber &&
        candidate.turnNumber === message.turnNumber &&
        (message.isStreaming || candidate.content === message.content),
    );
    if (!action) continue;
    pairedActions.add(action.id);
    messages.set(message.id, {
      ...message,
      depositTerms: action.depositTerms ?? message.depositTerms,
    });
  }
  return events
    .filter((event) => !pairedActions.has(event.id))
    .map((event) => messages.get(event.id) ?? event);
}
