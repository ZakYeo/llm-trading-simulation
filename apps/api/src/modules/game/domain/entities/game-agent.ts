import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentPersonalityProfile, AgentRole } from '@llm-sim/shared-types';

import type { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import type { AccountBalance } from './account-balance.js';

export interface GameAgentProps {
  id: string;
  name: string;
  role: AgentRole;
  balance: AccountBalance;
  depositAccount: DepositAccount;
  personalityProfile?: AgentPersonalityProfile | null;
}

function clampSliderValue(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

function defaultPersonalityProfileForRole(
  role: AgentRole,
): AgentPersonalityProfile | null {
  switch (role) {
    case 'banker':
      return {
        kind: 'banker',
        warmth: 5,
        salesAggression: 5,
        riskDiscipline: 5,
      };
    case 'trader':
      return {
        kind: 'trader',
        assertiveness: 5,
        riskAppetite: 5,
        convictionThreshold: 5,
      };
    default:
      return null;
  }
}

function normalizePersonalityProfile(
  role: AgentRole,
  personalityProfile?: AgentPersonalityProfile | null,
): AgentPersonalityProfile | null {
  const profile = personalityProfile ?? defaultPersonalityProfileForRole(role);

  if (profile === null) {
    return null;
  }

  if (role === 'banker') {
    if (profile.kind !== 'banker') {
      throw new DomainInvariantError(
        'Banker agents must use a banker personality profile.',
      );
    }

    return {
      kind: 'banker',
      warmth: clampSliderValue(profile.warmth),
      salesAggression: clampSliderValue(profile.salesAggression),
      riskDiscipline: clampSliderValue(profile.riskDiscipline),
    };
  }

  if (role === 'trader') {
    if (profile.kind !== 'trader') {
      throw new DomainInvariantError(
        'Trader agents must use a trader personality profile.',
      );
    }

    return {
      kind: 'trader',
      assertiveness: clampSliderValue(profile.assertiveness),
      riskAppetite: clampSliderValue(profile.riskAppetite),
      convictionThreshold: clampSliderValue(profile.convictionThreshold),
    };
  }

  return null;
}

export class GameAgent {
  readonly id: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly balance: AccountBalance;
  readonly depositAccount: DepositAccount;
  readonly personalityProfile: AgentPersonalityProfile | null;

  constructor(props: GameAgentProps) {
    if (props.name.trim().length === 0) {
      throw new DomainInvariantError('Agent name is required.');
    }

    this.id = props.id;
    this.name = props.name;
    this.role = props.role;
    this.balance = props.balance;
    this.depositAccount = props.depositAccount;
    this.personalityProfile = normalizePersonalityProfile(
      props.role,
      props.personalityProfile,
    );
  }

  withAccounts(
    balance: AccountBalance,
    depositAccount: DepositAccount,
  ): GameAgent {
    return new GameAgent({
      id: this.id,
      name: this.name,
      role: this.role,
      balance,
      depositAccount,
      personalityProfile: this.personalityProfile,
    });
  }
}
