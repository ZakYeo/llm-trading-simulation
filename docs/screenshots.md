# Screenshots

[← README](../README.md) · [Watch the walkthrough](../README.md#demo)

Captured from the current UI with the real API and PostgreSQL, using an isolated session and deterministic mock agents. These are application captures, not design mockups.

## Agent setup and personalities

- Editable banker/trader roster and initial SIM balance.
- Expanded personality panels with independent card sizing.

![Session setup with banker and trader personality controls expanded](media/setup.png)

## Conversation

- Streamed messages and recorded actions inside a bounded conversation window.
- Separate controls for communication turns and round settlement.

![Conversation view with agent messages, run controls and round advancement](media/conversation.png)

## Finances

- Available/reserved balances and banker custody.
- Opportunity terms, ownership, principal and position settlement rounds.

![Finances view showing agent balances, custody and market inspection](media/finances.png)

## History

- Recorded events with category, event-count and round-window filters.
- Explicit inspection actions for event details.

![History view with filter controls and recorded events](media/history.png)

## Dark appearance

![Conversation in dark mode](media/dark-conversation.png)

## Mobile

| Conversation                                                                  | Finances                                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| ![Conversation on a 390-pixel mobile viewport](media/mobile-conversation.png) | ![Finances on a 390-pixel mobile viewport](media/mobile-finances.png) |

## Walkthrough

[Play the walkthrough in the README](../README.md#demo) · [Download the MP4 (0.8 MB)](media/demo.mp4).

- Agent setup and personality configuration.
- Communication turns, messages and recorded actions.
- Balances, custody and opportunity inspection.
- Explicit round advancement and History filtering.
- Saved round summary and appearance controls.

The recording uses mock agents for a repeatable walkthrough. Personality settings are persisted; OpenAI-backed agents use those settings when generating decisions. See the [runtime setup instructions](guide.md#enable-openai-agents).
