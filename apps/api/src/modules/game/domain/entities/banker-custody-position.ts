import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import type { Money } from '../../../shared/domain/value-objects/money.js';

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
}
