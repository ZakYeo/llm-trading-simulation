import { DomainInvariantError } from '../../../shared/domain/errors/domain-invariant.error.js';

export type MarketOpportunityRiskLevel = 'low' | 'high';

export interface MarketOpportunityProps {
  id: string;
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

    this.id = props.id;
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
