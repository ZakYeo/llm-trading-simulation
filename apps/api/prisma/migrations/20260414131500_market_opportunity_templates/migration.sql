CREATE TYPE "MarketOpportunityCategory" AS ENUM (
    'CARRY',
    'EVENT',
    'TREND',
    'ARBITRAGE',
    'LIQUIDITY_STRESS',
    'SPECIAL_SITUATION'
);

ALTER TABLE "MarketOpportunity"
ADD COLUMN     "templateId" TEXT NOT NULL DEFAULT 'legacy-template',
ADD COLUMN     "category" "MarketOpportunityCategory" NOT NULL DEFAULT 'SPECIAL_SITUATION';
