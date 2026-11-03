import type { CustodyDepositLot } from '@llm-sim/shared-types';
import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export const MAX_DEPOSIT_RATE_BPS = 250;
export function assertDepositRate(rate: number) {
  if (!Number.isInteger(rate) || rate < 0 || rate > MAX_DEPOSIT_RATE_BPS)
    throw new DomainInvariantError(
      'Deposit rate must be between 0 and 250 basis points.',
    );
}
export interface BankerCustodyPositionProps {
  bankerAgentId: string;
  ownerAgentId: string;
  principal: Money;
  accruedInterest: Money;
  lots?: CustodyDepositLot[];
}
export class BankerCustodyPosition {
  readonly bankerAgentId: string;
  readonly ownerAgentId: string;
  readonly principal: Money;
  readonly accruedInterest: Money;
  readonly lots: CustodyDepositLot[];
  constructor(props: BankerCustodyPositionProps) {
    if (!props.bankerAgentId.trim() || !props.ownerAgentId.trim())
      throw new DomainInvariantError('Custody participants are required.');
    if (props.principal.isNegative() || props.accruedInterest.isNegative())
      throw new DomainInvariantError(
        'Custody position balances cannot be negative.',
      );
    this.bankerAgentId = props.bankerAgentId;
    this.ownerAgentId = props.ownerAgentId;
    this.principal = props.principal;
    this.accruedInterest = props.accruedInterest;
    this.lots = props.lots?.length
      ? props.lots
      : props.principal.isZero()
        ? []
        : [{ principal: props.principal.toDecimal(), rateBps: 250 }];
    for (const lot of this.lots) {
      assertDepositRate(lot.rateBps);
      if (Money.fromDecimal(lot.principal).isNegative())
        throw new DomainInvariantError('Negative deposit principal.');
    }
    const total = this.lots.reduce(
      (sum, lot) => sum.add(Money.fromDecimal(lot.principal)),
      Money.zero(),
    );
    if (total.toDecimal() !== this.principal.toDecimal())
      throw new DomainInvariantError(
        'Deposit lots must equal custody principal.',
      );
  }
  totalBalance(): Money {
    return this.principal.add(this.accruedInterest);
  }
  placeFunds(
    amount: Money,
    rateBps = 250,
    offerId?: string,
  ): BankerCustodyPosition {
    this.assertPositiveAmount(amount);
    assertDepositRate(rateBps);
    return new BankerCustodyPosition({
      ...this,
      principal: this.principal.add(amount),
      lots: [
        ...this.lots,
        {
          principal: amount.toDecimal(),
          rateBps,
          ...(offerId ? { offerId } : {}),
        },
      ],
    });
  }
  redeemFunds(amount: Money): BankerCustodyPosition {
    this.assertPositiveAmount(amount);
    if (!this.totalBalance().greaterThanOrEqual(amount))
      throw new DomainInvariantError(
        'Cannot redeem more than the custody position balance.',
      );
    if (this.accruedInterest.greaterThanOrEqual(amount))
      return new BankerCustodyPosition({
        ...this,
        accruedInterest: this.accruedInterest.subtract(amount),
      });
    let remaining = amount.subtract(this.accruedInterest);
    const principal = this.principal.subtract(remaining);
    const lots = this.lots
      .map((lot) => {
        const balance = Money.fromDecimal(lot.principal);
        const take = balance.greaterThanOrEqual(remaining)
          ? remaining
          : balance;
        remaining = remaining.subtract(take);
        return { ...lot, principal: balance.subtract(take).toDecimal() };
      })
      .filter((lot) => !Money.fromDecimal(lot.principal).isZero());
    return new BankerCustodyPosition({
      ...this,
      principal,
      accruedInterest: Money.zero(),
      lots,
    });
  }
  interestForNextRound(): Money {
    return this.lots.reduce(
      (sum, lot) =>
        sum.add(Money.fromDecimal(lot.principal).multiplyBps(lot.rateBps)),
      Money.zero(),
    );
  }
  grossYieldForNextRound(): Money {
    return this.lots.reduce(
      (sum, lot) =>
        sum.add(
          Money.fromDecimal(lot.principal).multiplyBps(MAX_DEPOSIT_RATE_BPS),
        ),
      Money.zero(),
    );
  }
  accrue(): BankerCustodyPosition {
    return new BankerCustodyPosition({
      ...this,
      accruedInterest: this.accruedInterest.add(this.interestForNextRound()),
    });
  }
  private assertPositiveAmount(amount: Money): void {
    if (amount.isNegative() || amount.isZero())
      throw new DomainInvariantError('Amount must be greater than zero.');
  }
}
