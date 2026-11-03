import { AgentProviderError } from '../ports/agent-provider.error.js';
import { describe, expect, it, vi } from 'vitest';
import type { AgentTurnContext } from '@llm-sim/mcp-contracts';
import { decideAgentAction } from './decide-agent-action.js';
const context = {
  self: { role: 'trader', name: 'Trader' },
} as AgentTurnContext;
const callbacks = {
  onMessageStreamStarted: vi.fn(),
  onMessageStreamDelta: vi.fn(),
  onMessageStreamCompleted: vi.fn(),
  onMessageStreamAborted: vi.fn(),
};
describe('Trader decision explanations', () => {
  it('retries the actual validation failure and preserves its cause if repair fails', async () => {
    const decideNextAction = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'send_private_message requires recipientAgentId and content from the model.',
        ),
      );
    await expect(
      decideAgentAction({ decideNextAction }, context, callbacks),
    ).rejects.toThrow('requires recipientAgentId and content');
    expect(decideNextAction.mock.calls[1][0].depositPolicy).toContain(
      'requires recipientAgentId and content',
    );
    expect(decideNextAction).toHaveBeenCalledTimes(2);
  });

  it('preserves provider billing errors without retrying them as invalid Thoughts', async () => {
    const decideNextAction = vi
      .fn()
      .mockRejectedValue(
        new AgentProviderError({ message: 'You have no credits remaining.' }),
      );
    await expect(
      decideAgentAction({ decideNextAction }, context, callbacks),
    ).rejects.toThrow('no API credits remaining');
    expect(decideNextAction).toHaveBeenCalledTimes(1);
  });

  it('retries a missing explanation before returning any actionable decision', async () => {
    const decideNextAction = vi
      .fn()
      .mockResolvedValueOnce({ type: 'finalize_turn' })
      .mockResolvedValueOnce({
        type: 'finalize_turn',
        decisionExplanation:
          'My high conviction threshold calls for more evidence.',
      });
    const result = await decideAgentAction(
      { decideNextAction },
      context,
      callbacks,
    );
    expect(result.decisionExplanation).toContain('conviction');
    expect(decideNextAction).toHaveBeenCalledTimes(2);
    expect(decideNextAction.mock.calls.every((call) => call.length === 1)).toBe(
      true,
    );
  });
  it('fails after exactly two invalid explanations without streaming', async () => {
    const decideNextAction = vi.fn().mockResolvedValue({
      type: 'send_public_message',
      content: 'Do not publish',
      decisionExplanation: ' ',
    });
    await expect(
      decideAgentAction({ decideNextAction }, context, callbacks),
    ).rejects.toThrow();
    expect(decideNextAction).toHaveBeenCalledTimes(2);
    expect(callbacks.onMessageStreamStarted).not.toHaveBeenCalled();
  });
});
