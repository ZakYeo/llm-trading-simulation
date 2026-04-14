import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';

export type MarketOpportunityRiskLevel = 'low' | 'high';
export type MarketOpportunityCategory =
  | 'carry'
  | 'event'
  | 'trend'
  | 'arbitrage'
  | 'liquidity_stress'
  | 'special_situation';

export interface MarketOpportunityProps {
  id: string;
  templateId: string;
  category: MarketOpportunityCategory;
  title: string;
  summary: string;
  riskLevel: MarketOpportunityRiskLevel;
  listedRound: number;
  settlementRound: number;
  minCommitment: string;
  maxCommitment: string;
  estimatedNetReturnBps: number;
  worstCaseReturnBps: number;
  bestCaseReturnBps: number;
  resolutionReturnBps: number;
}

export class MarketOpportunity {
  readonly id: string;
  readonly templateId: string;
  readonly category: MarketOpportunityCategory;
  readonly title: string;
  readonly summary: string;
  readonly riskLevel: MarketOpportunityRiskLevel;
  readonly listedRound: number;
  readonly settlementRound: number;
  readonly minCommitment: string;
  readonly maxCommitment: string;
  readonly estimatedNetReturnBps: number;
  readonly worstCaseReturnBps: number;
  readonly bestCaseReturnBps: number;
  readonly resolutionReturnBps: number;

  constructor(props: MarketOpportunityProps) {
    if (props.id.trim().length === 0) {
      throw new DomainInvariantError('Market opportunity id is required.');
    }

    if (props.templateId.trim().length === 0) {
      throw new DomainInvariantError(
        'Market opportunity template id is required.',
      );
    }

    if (props.title.trim().length === 0) {
      throw new DomainInvariantError('Market opportunity title is required.');
    }

    if (props.summary.trim().length === 0) {
      throw new DomainInvariantError('Market opportunity summary is required.');
    }

    if (props.settlementRound <= props.listedRound) {
      throw new DomainInvariantError(
        'Market opportunity settlement round must be after listed round.',
      );
    }

    if (
      Number.parseFloat(props.maxCommitment) <
      Number.parseFloat(props.minCommitment)
    ) {
      throw new DomainInvariantError(
        'Market opportunity max commitment must be greater than or equal to the minimum commitment.',
      );
    }

    this.id = props.id;
    this.templateId = props.templateId;
    this.category = props.category;
    this.title = props.title;
    this.summary = props.summary;
    this.riskLevel = props.riskLevel;
    this.listedRound = props.listedRound;
    this.settlementRound = props.settlementRound;
    this.minCommitment = props.minCommitment;
    this.maxCommitment = props.maxCommitment;
    this.estimatedNetReturnBps = props.estimatedNetReturnBps;
    this.worstCaseReturnBps = props.worstCaseReturnBps;
    this.bestCaseReturnBps = props.bestCaseReturnBps;
    this.resolutionReturnBps = props.resolutionReturnBps;
  }
}
