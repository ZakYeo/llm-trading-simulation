import { describe, expect, it } from 'vitest';

import { DepositAccount } from '../../../bank/domain/entities/deposit-account.js';
import { Money } from '../../../shared/domain/value-objects/money.js';
import { AccountBalance } from '../entities/account-balance.js';
import { LedgerService } from './ledger.service.js';

describe('LedgerService', () => {
  const ledger = new LedgerService();

  it('transfers funds between liquid balances', () => {
    const source = AccountBalance.open(Money.fromDecimal('100.0000'));
    const destination = AccountBalance.open(Money.fromDecimal('25.0000'));

    const result = ledger.transfer(
      source,
      destination,
      Money.fromDecimal('40.5000'),
    );

    expect(result.source.available.toDecimal()).toBe('59.5000');
    expect(result.destination.available.toDecimal()).toBe('65.5000');
  });

  it('moves funds from available balance into a deposit account', () => {
    const balance = AccountBalance.open(Money.fromDecimal('80.0000'));
    const depositAccount = DepositAccount.open();

    const result = ledger.deposit(
      balance,
      depositAccount,
      Money.fromDecimal('30.2500'),
    );

    expect(result.balance.available.toDecimal()).toBe('49.7500');
    expect(result.depositAccount.principal.toDecimal()).toBe('30.2500');
  });

  it('withdraws deposited funds back into liquid balance', () => {
    const balance = AccountBalance.open(Money.fromDecimal('10.0000'));
    const depositAccount = DepositAccount.open()
      .deposit(Money.fromDecimal('20.0000'))
      .accrue(500);

    const result = ledger.withdraw(
      balance,
      depositAccount,
      Money.fromDecimal('15.0000'),
    );

    expect(result.balance.available.toDecimal()).toBe('25.0000');
    expect(result.depositAccount.principal.toDecimal()).toBe('6.0000');
    expect(result.depositAccount.accruedInterest.toDecimal()).toBe('0.0000');
  });

  it('accrues interest against deposited principal only', () => {
    const depositAccount = DepositAccount.open().deposit(
      Money.fromDecimal('120.0000'),
    );

    const result = ledger.accrueInterest(depositAccount, 250);

    expect(result.principal.toDecimal()).toBe('120.0000');
    expect(result.accruedInterest.toDecimal()).toBe('3.0000');
    expect(result.totalBalance().toDecimal()).toBe('123.0000');
  });
});
