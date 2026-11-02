import type { DetailContent } from '../../operator-dashboard/model/workspace';
import type { AuditTrailTimelineEvent } from './audit-trail';

export function createEventDetail(
  event: AuditTrailTimelineEvent,
): DetailContent {
  return {
    title: event.badgeLabel,
    subtitle: event.label,
    paragraphs: event.detail ? [event.detail] : [],
    rows: [
      { label: 'Round / turn', value: event.roundLabel },
      { label: 'Recorded', value: event.createdAt },
      ...(event.type === 'message'
        ? [
            { label: 'Visibility', value: event.visibility ?? 'Not recorded' },
            {
              label: 'Recipient',
              value:
                event.recipientAgentName ??
                (event.visibility === 'public' ? 'Everyone' : 'Not recorded'),
            },
          ]
        : []),
      ...event.listedMeta,
      ...event.resolvedMeta,
      ...event.participantRows.flatMap((participant) => [
        {
          label: `${participant.ownerAgentName} principal`,
          value: participant.principalLabel,
        },
        {
          label: `${participant.ownerAgentName} PnL`,
          value: participant.profitOrLossLabel,
        },
      ]),
      { label: 'Event ID', value: event.id },
    ],
  };
}
