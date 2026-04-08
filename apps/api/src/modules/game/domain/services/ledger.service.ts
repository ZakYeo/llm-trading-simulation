import type { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import type { Money } from '../../../shared/domain/value-objects/money.js';
import type { AccountBalance } from '../entities/account-balance.js';

export interface TransferResult {
  source: AccountBalance;
  destination: AccountBalance;
}

export interface DepositResult {
  balance: AccountBalance;
  depositAccount: DepositAccount;
}

export class LedgerService {
  transfer(
    source: AccountBalance,
    destination: AccountBalance,
    amount: Money,
  ): TransferResult {
    return {
      source: source.debit(amount),
      destination: destination.credit(amount),
    };
  }

  deposit(
    balance: AccountBalance,
    depositAccount: DepositAccount,
    amount: Money,
  ): DepositResult {
    return {
      balance: balance.debit(amount),
      depositAccount: depositAccount.deposit(amount),
    };
  }

  withdraw(
    balance: AccountBalance,
    depositAccount: DepositAccount,
    amount: Money,
  ): DepositResult {
    return {
      balance: balance.credit(amount),
      depositAccount: depositAccount.withdraw(amount),
    };
  }

  accrueInterest(
    depositAccount: DepositAccount,
    rateBps: number,
  ): DepositAccount {
    return depositAccount.accrue(rateBps);
  }
}
