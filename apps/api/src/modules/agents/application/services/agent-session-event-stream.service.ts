import type { Observable } from 'rxjs';
import { Subject, filter } from 'rxjs';

export type AgentSessionEvent =
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
