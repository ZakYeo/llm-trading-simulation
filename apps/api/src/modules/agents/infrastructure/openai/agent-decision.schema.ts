const text = { type: 'string', minLength: 1 } as const;
const optionalText = { type: ['string', 'null'] } as const;

function decision(type: string, fields: Record<string, unknown> = {}) {
  const properties = {
    type: { type: 'string', enum: [type] },
    decisionExplanation: { type: 'string', minLength: 1, maxLength: 800 },
    ...fields,
  };
  return {
    type: 'object',
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}

/** The nested union makes required payload fields depend on the selected action. */
export const agentDecisionJsonSchema = {
  name: 'agent_decision',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['decision'],
    properties: {
      decision: {
        anyOf: [
          decision('send_public_message', { content: text }),
          decision('send_private_message', {
            recipientAgentId: text,
            content: text,
            depositRequestAmount: optionalText,
            depositRequestId: optionalText,
            depositOfferAmount: optionalText,
            depositRateBps: { type: ['integer', 'null'] },
            declineOfferId: optionalText,
          }),
          decision('request_payment', {
            recipientAgentId: text,
            amount: text,
            rationale: text,
          }),
          decision('counter_payment_request', {
            proposalActionId: text,
            recipientAgentId: text,
            amount: text,
            rationale: text,
          }),
          decision('accept_payment_request', { proposalActionId: text }),
          decision('reject_payment_request', {
            proposalActionId: text,
            rationale: text,
          }),
          decision('place_funds_with_banker', {
            recipientAgentId: text,
            amount: text,
            offerId: text,
          }),
          decision('redeem_funds_from_banker', {
            recipientAgentId: text,
            amount: text,
          }),
          decision('open_market_position', {
            opportunityId: text,
            amount: text,
          }),
          decision('finalize_turn'),
        ],
      },
    },
  },
};
