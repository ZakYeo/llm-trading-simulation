CREATE TABLE "MarketOpportunityListed" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "opportunityTitle" TEXT NOT NULL,
    "opportunityCategory" "MarketOpportunityCategory" NOT NULL,
    "opportunitySummary" TEXT NOT NULL,
    "opportunityRiskLevel" "MarketOpportunityRiskLevel" NOT NULL,
    "listedRound" INTEGER NOT NULL,
    "settlementRound" INTEGER NOT NULL,
    "minCommitment" DECIMAL(18,4) NOT NULL,
    "maxCommitment" DECIMAL(18,4) NOT NULL,
    "estimatedNetReturnBps" INTEGER NOT NULL,
    "worstCaseReturnBps" INTEGER NOT NULL,
    "bestCaseReturnBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketOpportunityListed_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketOpportunityResolved" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "opportunityTitle" TEXT NOT NULL,
    "opportunityCategory" "MarketOpportunityCategory" NOT NULL,
    "opportunitySummary" TEXT NOT NULL,
    "opportunityRiskLevel" "MarketOpportunityRiskLevel" NOT NULL,
    "listedRound" INTEGER NOT NULL,
    "settlementRound" INTEGER NOT NULL,
    "minCommitment" DECIMAL(18,4) NOT NULL,
    "maxCommitment" DECIMAL(18,4) NOT NULL,
    "estimatedNetReturnBps" INTEGER NOT NULL,
    "worstCaseReturnBps" INTEGER NOT NULL,
    "bestCaseReturnBps" INTEGER NOT NULL,
    "participantCount" INTEGER NOT NULL,
    "totalPrincipal" DECIMAL(18,4) NOT NULL,
    "totalProfitOrLoss" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketOpportunityResolved_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketOpportunityResolutionParticipant" (
    "id" TEXT NOT NULL,
    "marketOpportunityResolvedId" TEXT NOT NULL,
    "marketPositionSettlementId" TEXT NOT NULL,
    "ownerAgentId" TEXT NOT NULL,
    "principal" DECIMAL(18,4) NOT NULL,
    "profitOrLoss" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketOpportunityResolutionParticipant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketOppResolutionParticipant_resolved_settlement_key" ON "MarketOpportunityResolutionParticipant"("marketOpportunityResolvedId", "marketPositionSettlementId");

ALTER TABLE "MarketOpportunityListed" ADD CONSTRAINT "MarketOpportunityListed_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketOpportunityResolved" ADD CONSTRAINT "MarketOpportunityResolved_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketOpportunityResolutionParticipant" ADD CONSTRAINT "MarketOpportunityResolutionParticipant_marketOpportunityResolvedId_fkey" FOREIGN KEY ("marketOpportunityResolvedId") REFERENCES "MarketOpportunityResolved"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketOpportunityResolutionParticipant" ADD CONSTRAINT "MarketOpportunityResolutionParticipant_marketPositionSettlementId_fkey" FOREIGN KEY ("marketPositionSettlementId") REFERENCES "MarketPositionSettlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketOpportunityResolutionParticipant" ADD CONSTRAINT "MarketOpportunityResolutionParticipant_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
