export interface GameAgentRecord {
  id: string;
  name: string;
  role: string;
  availableBalance: string;
  reservedBalance: string;
  depositPrincipal: string;
  depositAccruedInterest: string;
}

export interface GameSessionRecord {
  id: string;
  name: string;
  status: string;
  currentRound: number;
  agents: GameAgentRecord[];
}

export interface ReplayEventRecord {
  id: string;
  type: 'transfer' | 'deposit' | 'withdrawal' | 'message' | 'action';
  createdAt: string;
  amount?: string;
  roundNumber?: number;
  turnNumber?: number;
  agentId?: string;
  agentName?: string;
  sourceAgentId?: string;
  sourceAgentName?: string;
  destinationAgentId?: string;
  destinationAgentName?: string;
  senderAgentId?: string;
  senderAgentName?: string;
  recipientAgentId?: string | null;
  recipientAgentName?: string;
  visibility?: 'public' | 'private';
  content?: string;
  actionType?:
    | 'send_public_message'
    | 'send_private_message'
    | 'propose_direct_transfer'
    | 'counter_direct_transfer_proposal'
    | 'accept_direct_transfer_proposal'
    | 'reject_direct_transfer_proposal'
    | 'finalize_turn';
  relatedProposalActionId?: string;
}

export interface GameReplayRecord {
  gameSession: {
    id: string;
    name: string;
    status: string;
    currentRound: number;
  };
  rounds: Array<{
    id: string;
    roundNumber: number;
    createdAt: string;
  }>;
  events: ReplayEventRecord[];
}

export interface OrchestratedRoundRecord {
  gameSessionId: string;
  roundNumber: number;
  turns: Array<{
    turnNumber: number;
    actions: Array<{
      agentId: string;
      agentName: string;
      action: {
        type: string;
      };
    }>;
    actionRecords: Array<{
      id?: string;
      actionType: string;
    }>;
    messages: Array<{
      id?: string;
      visibility: 'public' | 'private';
      content: string;
    }>;
  }>;
}

export interface AgentSessionEventRecord {
  type:
    | 'action_progressed'
    | 'transfer_settled'
    | 'turn_completed'
    | 'round_completed';
  gameSessionId: string;
  roundNumber: number;
  occurredAt: string;
  turnNumber?: number;
  turnCount?: number;
  actionCount?: number;
  messageCount?: number;
  agentId?: string;
  agentName?: string;
  actionType?:
    | 'send_public_message'
    | 'send_private_message'
    | 'propose_direct_transfer'
    | 'counter_direct_transfer_proposal'
    | 'accept_direct_transfer_proposal'
    | 'reject_direct_transfer_proposal';
  messageId?: string;
  messageVisibility?: 'public' | 'private';
  sourceAgentId?: string;
  destinationAgentId?: string;
  amount?: string;
}

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
