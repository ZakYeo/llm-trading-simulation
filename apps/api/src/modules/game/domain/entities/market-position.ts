import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';
import { Money } from '../../../shared/domain/value-objects/money.js';

export interface MarketPositionProps {
  opportunityId: string;
  ownerAgentId: string;
  opportunityTitle: string;
  principal: Money;
  entryRound: number;
  settlementRound: number;
}

export class MarketPosition {
  readonly opportunityId: string;
  readonly ownerAgentId: string;
  readonly opportunityTitle: string;
  readonly principal: Money;
  readonly entryRound: number;
  readonly settlementRound: number;

  constructor(props: MarketPositionProps) {
    if (props.opportunityId.trim().length === 0) {
      throw new DomainInvariantError(
        'Market position opportunity id is required.',
      );
    }

    if (props.ownerAgentId.trim().length === 0) {
      throw new DomainInvariantError(
        'Market position owner agent id is required.',
      );
    }

    if (props.opportunityTitle.trim().length === 0) {
      throw new DomainInvariantError('Market position title is required.');
    }

    if (!props.principal.greaterThan(Money.zero())) {
      throw new DomainInvariantError(
        'Market position principal must be greater than zero.',
      );
    }

    if (props.settlementRound <= props.entryRound) {
      throw new DomainInvariantError(
        'Market position settlement round must be after entry round.',
      );
    }

    this.opportunityId = props.opportunityId;
    this.ownerAgentId = props.ownerAgentId;
    this.opportunityTitle = props.opportunityTitle;
    this.principal = props.principal;
    this.entryRound = props.entryRound;
    this.settlementRound = props.settlementRound;
  }
}
