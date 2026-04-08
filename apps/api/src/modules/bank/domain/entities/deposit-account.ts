import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export class DepositAccount {
  private constructor(
    private readonly principalValue: Money,
    private readonly accruedInterestValue: Money,
  ) {}

  static open(): DepositAccount {
    return new DepositAccount(Money.zero(), Money.zero());
  }

  get principal(): Money {
    return this.principalValue;
  }

  get accruedInterest(): Money {
    return this.accruedInterestValue;
  }

  totalBalance(): Money {
    return this.principalValue.add(this.accruedInterestValue);
  }

  deposit(amount: Money): DepositAccount {
    this.assertPositiveAmount(amount);
    return new DepositAccount(
      this.principalValue.add(amount),
      this.accruedInterestValue,
    );
  }

  withdraw(amount: Money): DepositAccount {
    this.assertPositiveAmount(amount);

    if (!this.totalBalance().greaterThanOrEqual(amount)) {
      throw new DomainInvariantError('Insufficient deposited funds.');
    }

    if (this.accruedInterestValue.greaterThanOrEqual(amount)) {
      return new DepositAccount(
        this.principalValue,
        this.accruedInterestValue.subtract(amount),
      );
    }

    const remainingPrincipal = amount.subtract(this.accruedInterestValue);

    return new DepositAccount(
      this.principalValue.subtract(remainingPrincipal),
      Money.zero(),
    );
  }

  accrue(rateBps: number): DepositAccount {
    const interest = this.principalValue.multiplyBps(rateBps);

    return new DepositAccount(
      this.principalValue,
      this.accruedInterestValue.add(interest),
    );
  }

  private assertPositiveAmount(amount: Money): void {
    if (amount.isNegative() || amount.isZero()) {
      throw new DomainInvariantError('Amount must be greater than zero.');
    }
  }
}
