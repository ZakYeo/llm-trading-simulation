import type { AgentSessionEventRecord } from '@llm-sim/shared-types';
import type { Observable } from 'rxjs';
import { Subject, filter } from 'rxjs';

export type AgentSessionEvent = AgentSessionEventRecord;

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
