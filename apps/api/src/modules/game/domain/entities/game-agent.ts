import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { AgentRole } from '@llm-sim/shared-types';

import type { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import type { AccountBalance } from './account-balance.js';

export interface GameAgentProps {
  id: string;
  name: string;
  role: AgentRole;
  balance: AccountBalance;
  depositAccount: DepositAccount;
}

export class GameAgent {
  readonly id: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly balance: AccountBalance;
  readonly depositAccount: DepositAccount;

  constructor(props: GameAgentProps) {
    if (props.name.trim().length === 0) {
      throw new DomainInvariantError('Agent name is required.');
    }

    this.id = props.id;
    this.name = props.name;
    this.role = props.role;
    this.balance = props.balance;
    this.depositAccount = props.depositAccount;
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
    });
  }
}
