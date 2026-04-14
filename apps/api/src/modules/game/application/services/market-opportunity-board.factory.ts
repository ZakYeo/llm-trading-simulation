import { Injectable } from '@nestjs/common';

import { MarketOpportunity } from '../../domain/entities/market-opportunity.js';
import {
  marketOpportunityTemplateCatalog,
  type MarketOpportunityTemplate,
} from './market-opportunity-template.catalog.js';

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createDeterministicRandom(seed: string) {
  let state = hashSeed(seed) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function compareTemplates(
  left: MarketOpportunityTemplate,
  right: MarketOpportunityTemplate,
) {
  return left.id.localeCompare(right.id);
}

@Injectable()
export class MarketOpportunityBoardFactory {
  private readonly maxActiveOpportunities = 4;

  createInitialBoard(
    gameSessionId: string,
    listedRound: number,
  ): MarketOpportunity[] {
    const opportunities: MarketOpportunity[] = [];

    while (opportunities.length < 2) {
      opportunities.push(
        this.createOpportunity(gameSessionId, listedRound, opportunities),
      );
    }

    return opportunities;
  }

  createRoundAdvanceAdditions(
    gameSessionId: string,
    listedRound: number,
    activeOpportunities: MarketOpportunity[],
  ): MarketOpportunity[] {
    const additions: MarketOpportunity[] = [];

    while (
      activeOpportunities.length + additions.length <
      this.maxActiveOpportunities
    ) {
      const boardBeforeGeneration = [...activeOpportunities, ...additions];

      if (
        !this.shouldCreateOpportunity(
          gameSessionId,
          listedRound,
          boardBeforeGeneration,
        )
      ) {
        break;
      }

      additions.push(
        this.createOpportunity(
          gameSessionId,
          listedRound,
          boardBeforeGeneration,
        ),
      );
    }

    return additions;
  }

  private shouldCreateOpportunity(
    gameSessionId: string,
    listedRound: number,
    activeOpportunities: MarketOpportunity[],
  ) {
    const activeCount = activeOpportunities.length;

    if (activeCount <= 1) {
      return true;
    }

    if (activeCount >= this.maxActiveOpportunities) {
      return false;
    }

    const probabilityByCount: Record<number, number> = {
      2: 0.7,
      3: 0.3,
    };
    const probability = probabilityByCount[activeCount] ?? 0;
    const random = createDeterministicRandom(
      `${gameSessionId}:${listedRound}:${activeCount}:create`,
    );

    return random() < probability;
  }

  private createOpportunity(
    gameSessionId: string,
    listedRound: number,
    activeOpportunities: MarketOpportunity[],
  ): MarketOpportunity {
    const generationIndex =
      activeOpportunities.filter(
        (opportunity) => opportunity.listedRound === listedRound,
      ).length + 1;
    const activeCount = activeOpportunities.length;
    const random = createDeterministicRandom(
      `${gameSessionId}:${listedRound}:${activeCount}:${generationIndex}:template`,
    );
    const template = this.selectTemplate(activeOpportunities, random);
    const settlementHorizon =
      template.settlementHorizons[
        Math.floor(random() * template.settlementHorizons.length)
      ] ?? template.settlementHorizons[0];
    const resolutionIndex = Math.floor(
      random() * template.resolutionReturnBpsOptions.length,
    );
    const resolutionReturnBps =
      template.resolutionReturnBpsOptions[resolutionIndex] ??
      template.resolutionReturnBpsOptions[0];

    return new MarketOpportunity({
      id: `${gameSessionId}-${template.id}-r${listedRound}-n${generationIndex}`,
      templateId: template.id,
      category: template.category,
      title: template.title,
      summary: template.summary,
      riskLevel: template.riskLevel,
      listedRound,
      settlementRound: listedRound + settlementHorizon,
      minCommitment: template.minCommitment,
      maxCommitment: template.maxCommitment,
      estimatedNetReturnBps: template.estimatedNetReturnBps,
      worstCaseReturnBps: template.worstCaseReturnBps,
      bestCaseReturnBps: template.bestCaseReturnBps,
      resolutionReturnBps,
    });
  }

  private selectTemplate(
    activeOpportunities: MarketOpportunity[],
    random: () => number,
  ): MarketOpportunityTemplate {
    const activeTemplateIds = new Set(
      activeOpportunities.map((opportunity) => opportunity.templateId),
    );
    const activeCategories = new Set(
      activeOpportunities.map((opportunity) => opportunity.category),
    );
    const hasLowRisk = activeOpportunities.some(
      (opportunity) => opportunity.riskLevel === 'low',
    );
    const hasHighRisk = activeOpportunities.some(
      (opportunity) => opportunity.riskLevel === 'high',
    );
    const extremeRiskCount = activeOpportunities.filter((opportunity) =>
      this.isExtremeRiskOpportunity(opportunity.templateId),
    ).length;

    let candidates = marketOpportunityTemplateCatalog.filter(
      (template) => !activeTemplateIds.has(template.id),
    );

    if (!hasLowRisk) {
      candidates = this.filterOrKeep(
        candidates,
        (template) => template.riskLevel === 'low',
      );
    } else if (!hasHighRisk) {
      candidates = this.filterOrKeep(
        candidates,
        (template) => template.riskLevel === 'high',
      );
    }

    if (extremeRiskCount >= 2) {
      candidates = this.filterOrKeep(
        candidates,
        (template) => !template.isExtremeRisk,
      );
    }

    candidates = this.filterOrKeep(
      candidates,
      (template) => !activeCategories.has(template.category),
    );

    const sortedCandidates = [...candidates].sort(compareTemplates);
    const index = Math.floor(random() * sortedCandidates.length);

    return (
      sortedCandidates[index] ??
      sortedCandidates[0] ??
      marketOpportunityTemplateCatalog[0]
    );
  }

  private filterOrKeep(
    templates: readonly MarketOpportunityTemplate[],
    predicate: (template: MarketOpportunityTemplate) => boolean,
  ) {
    const filtered = templates.filter(predicate);

    return filtered.length > 0 ? filtered : [...templates];
  }

  private isExtremeRiskOpportunity(templateId: string) {
    return marketOpportunityTemplateCatalog.some(
      (template) => template.id === templateId && template.isExtremeRisk,
    );
  }
}
