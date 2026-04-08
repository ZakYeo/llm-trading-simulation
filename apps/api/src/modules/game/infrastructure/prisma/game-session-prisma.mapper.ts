import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../../domain/entities/account-balance.js';
import { GameAgent } from '../../domain/entities/game-agent.js';
import { GameSession } from '../../domain/entities/game-session.js';

export interface PersistedGameSessionRecord {
  id: string;
  name: string;
  status: 'SETUP' | 'ACTIVE' | 'SETTLEMENT' | 'COMPLETED' | 'FAILED';
  currentRound: number;
  agents: Array<{
    id: string;
    name: string;
    role: 'BANKER' | 'ANALYST' | 'LAWYER' | 'INFLUENCER' | 'TRADER';
    balance: {
      available: string;
      reserved: string;
    } | null;
    depositAccount: {
      principal: string;
      accrued: string;
    } | null;
  }>;
}

const statusToPersistence = {
  setup: 'SETUP',
  active: 'ACTIVE',
  settlement: 'SETTLEMENT',
  completed: 'COMPLETED',
  failed: 'FAILED',
} as const;

const roleToPersistence = {
  banker: 'BANKER',
  analyst: 'ANALYST',
  lawyer: 'LAWYER',
  influencer: 'INFLUENCER',
  trader: 'TRADER',
} as const;

const statusFromPersistence = {
  SETUP: 'setup',
  ACTIVE: 'active',
  SETTLEMENT: 'settlement',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

const roleFromPersistence = {
  BANKER: 'banker',
  ANALYST: 'analyst',
  LAWYER: 'lawyer',
  INFLUENCER: 'influencer',
  TRADER: 'trader',
} as const;

export class GameSessionPrismaMapper {
  static toCreateInput(session: GameSession) {
    return {
      id: session.id,
      name: session.name,
      status: statusToPersistence[session.status],
      currentRound: session.currentRound,
      agents: {
        create: session.agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          role: roleToPersistence[agent.role],
          balance: {
            create: {
              available: agent.balance.available.toDecimal(),
              reserved: agent.balance.reserved.toDecimal(),
            },
          },
          depositAccount: {
            create: {
              principal: agent.depositAccount.principal.toDecimal(),
              accrued: agent.depositAccount.accruedInterest.toDecimal(),
            },
          },
        })),
      },
    };
  }

  static toDomain(record: PersistedGameSessionRecord): GameSession {
    return new GameSession({
      id: record.id,
      name: record.name,
      status: statusFromPersistence[record.status],
      currentRound: record.currentRound,
      agents: record.agents.map((agent) => {
        const balance = agent.balance;
        const depositAccount = agent.depositAccount;

        return new GameAgent({
          id: agent.id,
          name: agent.name,
          role: roleFromPersistence[agent.role],
          balance: AccountBalance.restore(
            Money.fromDecimal(balance?.available ?? '0.0000'),
            Money.fromDecimal(balance?.reserved ?? '0.0000'),
          ),
          depositAccount: DepositAccount.restore(
            Money.fromDecimal(depositAccount?.principal ?? '0.0000'),
            Money.fromDecimal(depositAccount?.accrued ?? '0.0000'),
          ),
        });
      }),
    });
  }
}
