ALTER TYPE "AgentTurnActionType" ADD VALUE 'OPEN_MARKET_POSITION';

CREATE TYPE "MarketOpportunityRiskLevel" AS ENUM ('LOW', 'HIGH');

CREATE TABLE "MarketOpportunity" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "riskLevel" "MarketOpportunityRiskLevel" NOT NULL,
    "listedRound" INTEGER NOT NULL,
    "settlementRound" INTEGER NOT NULL,
    "minCommitment" DECIMAL(18,4) NOT NULL,
    "maxCommitment" DECIMAL(18,4) NOT NULL,
    "estimatedNetReturnBps" INTEGER NOT NULL,
    "worstCaseReturnBps" INTEGER NOT NULL,
    "bestCaseReturnBps" INTEGER NOT NULL,
    "resolutionReturnBps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketOpportunity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketPosition" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "ownerAgentId" TEXT NOT NULL,
    "opportunityTitle" TEXT NOT NULL,
    "principal" DECIMAL(18,4) NOT NULL,
    "entryRound" INTEGER NOT NULL,
    "settlementRound" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketPositionOpen" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "opportunityTitle" TEXT NOT NULL,
    "ownerAgentId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPositionOpen_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketPositionSettlement" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "opportunityTitle" TEXT NOT NULL,
    "ownerAgentId" TEXT NOT NULL,
    "principal" DECIMAL(18,4) NOT NULL,
    "profitOrLoss" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketPositionSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketPosition_gameSessionId_opportunityId_ownerAgentId_key" ON "MarketPosition"("gameSessionId", "opportunityId", "ownerAgentId");

ALTER TABLE "MarketOpportunity" ADD CONSTRAINT "MarketOpportunity_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPosition" ADD CONSTRAINT "MarketPosition_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPosition" ADD CONSTRAINT "MarketPosition_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "MarketOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPosition" ADD CONSTRAINT "MarketPosition_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPositionOpen" ADD CONSTRAINT "MarketPositionOpen_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPositionOpen" ADD CONSTRAINT "MarketPositionOpen_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPositionSettlement" ADD CONSTRAINT "MarketPositionSettlement_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketPositionSettlement" ADD CONSTRAINT "MarketPositionSettlement_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
