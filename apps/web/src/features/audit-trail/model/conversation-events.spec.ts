import { describe, it, expect } from 'vitest';
import type { AuditTrailTimelineEvent } from './audit-trail';
import { toConversationEvents } from './conversation-events';
const common = {
  roundNumber: 1,
  turnNumber: 1,
  recipientAgentId: 'banker',
  content: 'Please quote 20 SIM.',
};
const action = {
  ...common,
  id: 'action',
  type: 'action',
  agentId: 'trader',
  actionType: 'send_private_message',
  depositTerms: { requestAmount: '20' },
} as AuditTrailTimelineEvent;
const message = {
  ...common,
  id: 'message',
  type: 'message',
  senderAgentId: 'trader',
  visibility: 'private',
} as AuditTrailTimelineEvent;
describe('Conversation message projection', () => {
  it('attaches the deposit request to its message without changing audit records', () => {
    const events = [action, message];
    expect(toConversationEvents(events)).toEqual([
      { ...message, depositTerms: action.depositTerms },
    ]);
    expect(events).toEqual([action, message]);
  });
  it('preserves unmatched actions and separates counterparties and turns', () => {
    expect(toConversationEvents([action])).toEqual([action]);
    expect(
      toConversationEvents([action, { ...message, turnNumber: 2 }]),
    ).toHaveLength(2);
    expect(
      toConversationEvents([action, { ...message, recipientAgentId: 'other' }]),
    ).toHaveLength(2);
  });
  it('keeps Thoughts before messages and actual financial actions visible', () => {
    const thought = {
      id: 'thought',
      type: 'thought',
    } as AuditTrailTimelineEvent;
    const deposit = {
      id: 'deposit',
      type: 'action',
      actionType: 'place_funds_with_banker',
    } as AuditTrailTimelineEvent;
    expect(
      toConversationEvents([thought, action, message, deposit]).map(
        (e) => e.id,
      ),
    ).toEqual(['thought', 'message', 'deposit']);
  });
});
