import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export class AccountBalance {
  private constructor(
    private readonly availableValue: Money,
    private readonly reservedValue: Money,
  ) {}

  static open(initialAvailable: Money = Money.zero()): AccountBalance {
    if (initialAvailable.isNegative()) {
      throw new DomainInvariantError('Available balance cannot be negative.');
    }

    return new AccountBalance(initialAvailable, Money.zero());
  }

  get available(): Money {
    return this.availableValue;
  }

  get reserved(): Money {
    return this.reservedValue;
  }

  credit(amount: Money): AccountBalance {
    this.assertPositiveAmount(amount);
    return new AccountBalance(
      this.availableValue.add(amount),
      this.reservedValue,
    );
  }

  debit(amount: Money): AccountBalance {
    this.assertPositiveAmount(amount);

    if (!this.availableValue.greaterThanOrEqual(amount)) {
      throw new DomainInvariantError('Insufficient available balance.');
    }

    return new AccountBalance(
      this.availableValue.subtract(amount),
      this.reservedValue,
    );
  }

  reserve(amount: Money): AccountBalance {
    this.assertPositiveAmount(amount);

    if (!this.availableValue.greaterThanOrEqual(amount)) {
      throw new DomainInvariantError(
        'Insufficient available balance to reserve.',
      );
    }

    return new AccountBalance(
      this.availableValue.subtract(amount),
      this.reservedValue.add(amount),
    );
  }

  release(amount: Money): AccountBalance {
    this.assertPositiveAmount(amount);

    if (!this.reservedValue.greaterThanOrEqual(amount)) {
      throw new DomainInvariantError(
        'Insufficient reserved balance to release.',
      );
    }

    return new AccountBalance(
      this.availableValue.add(amount),
      this.reservedValue.subtract(amount),
    );
  }

  private assertPositiveAmount(amount: Money): void {
    if (amount.isNegative() || amount.isZero()) {
      throw new DomainInvariantError('Amount must be greater than zero.');
    }
  }
}
