import type {
  GameReplayRecord,
  GameSessionRecord,
  OrchestratedRoundRecord,
} from '@llm-sim/shared-types';

export type {
  AgentSessionEventRecord,
  GameReplayRecord,
  GameSessionRecord,
  OrchestratedRoundRecord,
} from '@llm-sim/shared-types';

const defaultApiBaseUrl = 'http://localhost:3000/api';
const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/u, '') ?? defaultApiBaseUrl;

interface CreateSessionInput {
  name: string;
  initialBalance: string;
  agents: Array<{
    name: string;
    role: string;
  }>;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createGameSession(input: CreateSessionInput) {
  return request<GameSessionRecord>('/game/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function getGameSession(gameSessionId: string) {
  return request<GameSessionRecord>(`/game/sessions/${gameSessionId}`);
}

export function getGameReplay(gameSessionId: string) {
  return request<GameReplayRecord>(`/replay/sessions/${gameSessionId}`);
}

export function advanceGameRound(
  gameSessionId: string,
  interestRateBps?: number,
) {
  return request<GameSessionRecord>(
    `/game/sessions/${gameSessionId}/rounds/advance`,
    {
      method: 'PATCH',
      body: JSON.stringify(
        interestRateBps === undefined ? {} : { interestRateBps },
      ),
    },
  );
}

export function orchestrateAgentRound(
  gameSessionId: string,
  turnCount: number,
) {
  return request<OrchestratedRoundRecord>(
    `/agents/sessions/${gameSessionId}/rounds/orchestrate`,
    {
      method: 'POST',
      body: JSON.stringify({ turnCount }),
    },
  );
}

export function createAgentSessionEventSource(gameSessionId: string) {
  return new EventSource(
    `${apiBaseUrl}/agents/sessions/${gameSessionId}/events`,
  );
}
