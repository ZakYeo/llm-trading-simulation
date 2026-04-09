import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export interface BankerCustodyPositionProps {
  bankerAgentId: string;
  ownerAgentId: string;
  principal: Money;
  accruedInterest: Money;
}

export class BankerCustodyPosition {
  readonly bankerAgentId: string;
  readonly ownerAgentId: string;
  readonly principal: Money;
  readonly accruedInterest: Money;

  constructor(props: BankerCustodyPositionProps) {
    if (props.bankerAgentId.trim().length === 0) {
      throw new DomainInvariantError(
        'Custody position bankerAgentId is required.',
      );
    }

    if (props.ownerAgentId.trim().length === 0) {
      throw new DomainInvariantError(
        'Custody position ownerAgentId is required.',
      );
    }

    if (props.principal.isNegative() || props.accruedInterest.isNegative()) {
      throw new DomainInvariantError(
        'Custody position balances cannot be negative.',
      );
    }

    this.bankerAgentId = props.bankerAgentId;
    this.ownerAgentId = props.ownerAgentId;
    this.principal = props.principal;
    this.accruedInterest = props.accruedInterest;
  }

  totalBalance(): Money {
    return this.principal.add(this.accruedInterest);
  }

  placeFunds(amount: Money): BankerCustodyPosition {
    this.assertPositiveAmount(amount);

    return new BankerCustodyPosition({
      bankerAgentId: this.bankerAgentId,
      ownerAgentId: this.ownerAgentId,
      principal: this.principal.add(amount),
      accruedInterest: this.accruedInterest,
    });
  }

  redeemFunds(amount: Money): BankerCustodyPosition {
    this.assertPositiveAmount(amount);

    if (!this.totalBalance().greaterThanOrEqual(amount)) {
      throw new DomainInvariantError(
        'Cannot redeem more than the custody position balance.',
      );
    }

    if (this.accruedInterest.greaterThanOrEqual(amount)) {
      return new BankerCustodyPosition({
        bankerAgentId: this.bankerAgentId,
        ownerAgentId: this.ownerAgentId,
        principal: this.principal,
        accruedInterest: this.accruedInterest.subtract(amount),
      });
    }

    const remainingPrincipal = amount.subtract(this.accruedInterest);

    return new BankerCustodyPosition({
      bankerAgentId: this.bankerAgentId,
      ownerAgentId: this.ownerAgentId,
      principal: this.principal.subtract(remainingPrincipal),
      accruedInterest: Money.zero(),
    });
  }

  accrue(rateBps: number): BankerCustodyPosition {
    return new BankerCustodyPosition({
      bankerAgentId: this.bankerAgentId,
      ownerAgentId: this.ownerAgentId,
      principal: this.principal,
      accruedInterest: this.accruedInterest.add(
        this.principal.multiplyBps(rateBps),
      ),
    });
  }

  private assertPositiveAmount(amount: Money): void {
    if (amount.isNegative() || amount.isZero()) {
      throw new DomainInvariantError('Amount must be greater than zero.');
    }
  }
}
