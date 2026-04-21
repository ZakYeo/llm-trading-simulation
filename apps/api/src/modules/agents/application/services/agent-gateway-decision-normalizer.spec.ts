import { describe, expect, it } from 'vitest';

import type { AgentToolCallParams } from '@llm-sim/mcp-contracts';

import { AgentGatewayDecisionNormalizer } from './agent-gateway-decision-normalizer.js';

describe('AgentGatewayDecisionNormalizer', () => {
  it.each([
    [
      {
        name: 'messaging.send_public',
        arguments: { content: 'Public note' },
      },
      {
        type: 'send_public_message',
        content: 'Public note',
      },
    ],
    [
      {
        name: 'messaging.send_private',
        arguments: {
          recipientAgentId: 'agent-banker',
          content: 'Private note',
        },
      },
      {
        type: 'send_private_message',
        recipientAgentId: 'agent-banker',
        content: 'Private note',
      },
    ],
    [
      {
        name: 'transfer.request_payment',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '12.5000',
          rationale: 'Value exchange.',
        },
      },
      {
        type: 'request_payment',
        recipientAgentId: 'agent-banker',
        amount: '12.5000',
        rationale: 'Value exchange.',
      },
    ],
    [
      {
        name: 'transfer.counter_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
          recipientAgentId: 'agent-banker',
          amount: '10.0000',
          rationale: 'Counteroffer.',
        },
      },
      {
        type: 'counter_payment_request',
        proposalActionId: 'proposal-1',
        recipientAgentId: 'agent-banker',
        amount: '10.0000',
        rationale: 'Counteroffer.',
      },
    ],
    [
      {
        name: 'transfer.accept_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
        },
      },
      {
        type: 'accept_payment_request',
        proposalActionId: 'proposal-1',
      },
    ],
    [
      {
        name: 'transfer.reject_payment_request',
        arguments: {
          proposalActionId: 'proposal-1',
          rationale: 'Rejected.',
        },
      },
      {
        type: 'reject_payment_request',
        proposalActionId: 'proposal-1',
        rationale: 'Rejected.',
      },
    ],
    [
      {
        name: 'treasury.place_with_banker',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '25.0000',
        },
      },
      {
        type: 'place_funds_with_banker',
        recipientAgentId: 'agent-banker',
        amount: '25.0000',
      },
    ],
    [
      {
        name: 'treasury.redeem_from_banker',
        arguments: {
          recipientAgentId: 'agent-banker',
          amount: '5.0000',
        },
      },
      {
        type: 'redeem_funds_from_banker',
        recipientAgentId: 'agent-banker',
        amount: '5.0000',
      },
    ],
    [
      {
        name: 'market.open_position',
        arguments: {
          opportunityId: 'opp-1',
          amount: '15.0000',
        },
      },
      {
        type: 'open_market_position',
        opportunityId: 'opp-1',
        amount: '15.0000',
      },
    ],
    [
      {
        name: 'turn.finalize',
        arguments: {},
      },
      {
        type: 'finalize_turn',
      },
    ],
  ] satisfies Array<[AgentToolCallParams, object]>)(
    'normalizes %o into the internal AgentAction shape',
    (toolCall, expectedAction) => {
      const normalizer = new AgentGatewayDecisionNormalizer();

      expect(normalizer.normalize(toolCall)).toEqual(expectedAction);
    },
  );

  it('rejects malformed MCP-style tool calls', () => {
    const normalizer = new AgentGatewayDecisionNormalizer();

    expect(() =>
      normalizer.normalize({
        name: 'messaging.send_private',
        arguments: {
          content: 'Missing recipient',
        },
      } as unknown as AgentToolCallParams),
    ).toThrow();
  });
});
