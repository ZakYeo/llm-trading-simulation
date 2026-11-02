import { useEffect, useState } from 'react';
import type { GameSessionRecord } from '@llm-sim/shared-types';
import {
  createDefaultPersonality,
  defaultAgentSetup,
  toAgentDrafts,
  type AgentDraft,
} from '../model/agent-drafts';

export function useAgentDrafts(session?: GameSessionRecord) {
  const [agentDrafts, setAgentDrafts] =
    useState<AgentDraft[]>(defaultAgentSetup);
  const [nextAgentDraftId, setNextAgentDraftId] = useState(
    defaultAgentSetup.length + 1,
  );
  useEffect(() => {
    if (!session) return;
    setAgentDrafts(toAgentDrafts(session));
    setNextAgentDraftId(session.agents.length + 1);
  }, [session]);
  function updateAgentDraft(
    draftId: string,
    updater: (draft: AgentDraft) => AgentDraft,
  ) {
    setAgentDrafts((current) =>
      current.map((draft) => (draft.id === draftId ? updater(draft) : draft)),
    );
  }

  function updateAgentDraftName(draftId: string, name: string) {
    updateAgentDraft(draftId, (draft) => ({
      ...draft,
      name,
    }));
  }

  function updateAgentDraftRole(draftId: string, role: AgentDraft['role']) {
    updateAgentDraft(draftId, (draft) => ({
      ...draft,
      role,
      personality: createDefaultPersonality(role),
    }));
  }

  function updateAgentDraftPersonalityValue(
    draftId: string,
    key: string,
    value: number,
  ) {
    updateAgentDraft(draftId, (draft) => {
      if (!(key in draft.personality)) {
        return draft;
      }

      return {
        ...draft,
        personality: {
          ...draft.personality,
          [key]: value,
        },
      } as AgentDraft;
    });
  }

  function addAgentDraft() {
    const nextIndex = nextAgentDraftId;

    setAgentDrafts((current) => [
      ...current,
      {
        id: `agent-draft-${nextIndex}`,
        name: `New Bot ${nextIndex}`,
        role: 'trader',
        personality: createDefaultPersonality('trader'),
      },
    ]);
    setNextAgentDraftId(nextIndex + 1);
  }

  function removeAgentDraft(draftId: string) {
    setAgentDrafts((current) =>
      current.length === 1
        ? current
        : current.filter((draft) => draft.id !== draftId),
    );
  }

  return {
    agentDrafts,
    canRemoveAgent: agentDrafts.length > 1,
    updateAgentDraftName,
    updateAgentDraftRole,
    updateAgentDraftPersonalityValue,
    addAgentDraft,
    removeAgentDraft,
  };
}
