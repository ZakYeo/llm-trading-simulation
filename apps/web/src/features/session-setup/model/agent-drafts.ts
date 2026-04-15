import type {
  AgentPersonalityProfile,
  GameSessionRecord,
} from '@llm-sim/shared-types';

export type AgentRole = 'banker' | 'trader';

export interface AgentDraft {
  id: string;
  name: string;
  role: AgentRole;
  personality: AgentPersonalityProfile;
}

export const defaultAgentSetup: AgentDraft[] = [
  {
    id: 'agent-draft-1',
    name: 'Banker Bot',
    role: 'banker',
    personality: {
      kind: 'banker',
      warmth: 5,
      salesAggression: 5,
      riskDiscipline: 5,
    },
  },
  {
    id: 'agent-draft-2',
    name: 'Trader Bot',
    role: 'trader',
    personality: {
      kind: 'trader',
      assertiveness: 5,
      riskAppetite: 5,
      convictionThreshold: 5,
    },
  },
];

export function createDefaultPersonality(
  role: AgentRole,
): AgentPersonalityProfile {
  if (role === 'banker') {
    return {
      kind: 'banker',
      warmth: 5,
      salesAggression: 5,
      riskDiscipline: 5,
    };
  }

  return {
    kind: 'trader',
    assertiveness: 5,
    riskAppetite: 5,
    convictionThreshold: 5,
  };
}

export function toAgentDrafts(session: GameSessionRecord): AgentDraft[] {
  return session.agents
    .filter(
      (
        agent,
      ): agent is GameSessionRecord['agents'][number] & {
        role: AgentRole;
      } => agent.role === 'banker' || agent.role === 'trader',
    )
    .map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      personality:
        agent.personalityProfile ?? createDefaultPersonality(agent.role),
    }));
}
