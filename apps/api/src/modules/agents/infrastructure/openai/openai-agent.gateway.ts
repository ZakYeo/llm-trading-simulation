import type { AgentAction, AgentTurnContext } from '@llm-sim/mcp-contracts';
import { agentActionSchema } from '@llm-sim/mcp-contracts';
import { zodTextFormat } from 'openai/helpers/zod';
import type OpenAI from 'openai';

import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentGatewayPort } from '../../application/ports/agent-gateway.port.js';

const defaultSystemPrompt =
  'You are a simulated trading-game agent. Choose exactly one next action. Prefer short, concrete messages. Only send private messages or transfer proposals to agent ids listed in peers. Use propose_direct_transfer and counter_direct_transfer_proposal only for positive fake-money amounts. Accept, reject, or counter transfer proposals only when a valid recent proposal action is available. If you counter a proposal, send it back to the original proposer. If no useful communication is available, finalize the turn.';

export class OpenAiAgentGateway implements AgentGatewayPort {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string,
    private readonly systemPrompt: string = defaultSystemPrompt,
    private readonly strictMode = false,
  ) {}

  async decideNextAction(context: AgentTurnContext): Promise<AgentAction> {
    try {
      const response = await this.client.responses.parse({
        model: this.model,
        input: [
          {
            role: 'system',
            content: this.systemPrompt,
          },
          {
            role: 'user',
            content: JSON.stringify(context),
          },
        ],
        text: {
          format: zodTextFormat(agentActionSchema, 'agent_action'),
        },
      });

      if (!response.output_parsed) {
        throw new DomainInvariantError(
          'OpenAI agent gateway returned no structured action.',
        );
      }

      return response.output_parsed;
    } catch (error) {
      if (this.strictMode) {
        throw error;
      }

      return {
        type: 'finalize_turn',
      };
    }
  }
}
