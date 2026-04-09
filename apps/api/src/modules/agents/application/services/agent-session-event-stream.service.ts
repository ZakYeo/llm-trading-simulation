import type { Observable } from 'rxjs';
import { Subject, filter } from 'rxjs';

export type AgentSessionEvent =
  | {
      type: 'action_progressed';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      agentId: string;
      agentName: string;
      actionType:
        | 'send_public_message'
        | 'send_private_message'
        | 'propose_direct_transfer'
        | 'counter_direct_transfer_proposal'
        | 'accept_direct_transfer_proposal'
        | 'reject_direct_transfer_proposal'
        | 'place_funds_with_banker'
        | 'redeem_funds_from_banker';
      messageId?: string;
      messageVisibility?: 'public' | 'private';
      occurredAt: string;
    }
  | {
      type: 'transfer_settled';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      sourceAgentId: string;
      destinationAgentId: string;
      amount: string;
      occurredAt: string;
    }
  | {
      type: 'turn_completed';
      gameSessionId: string;
      roundNumber: number;
      turnNumber: number;
      actionCount: number;
      messageCount: number;
      occurredAt: string;
    }
  | {
      type: 'round_completed';
      gameSessionId: string;
      roundNumber: number;
      turnCount: number;
      occurredAt: string;
    };

export class AgentSessionEventStreamService {
  private readonly events$ = new Subject<AgentSessionEvent>();

  publish(event: AgentSessionEvent): void {
    this.events$.next(event);
  }

  streamForGameSession(gameSessionId: string): Observable<AgentSessionEvent> {
    return this.events$.pipe(
      filter((event) => event.gameSessionId === gameSessionId),
    );
  }
}
