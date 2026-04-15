ALTER TABLE "MarketPosition"
ADD COLUMN "entryFeeBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "entryFeeAmount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
ADD COLUMN "entrySlippageBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "effectiveResolutionReturnBps" INTEGER;

UPDATE "MarketPosition" AS "position"
SET "effectiveResolutionReturnBps" = "opportunity"."resolutionReturnBps"
FROM "MarketOpportunity" AS "opportunity"
WHERE "opportunity"."id" = "position"."opportunityId";

ALTER TABLE "MarketPosition"
ALTER COLUMN "effectiveResolutionReturnBps" SET NOT NULL;

ALTER TABLE "MarketPositionOpen"
ADD COLUMN "entryFeeBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "entryFeeAmount" DECIMAL(18, 4) NOT NULL DEFAULT 0,
ADD COLUMN "entrySlippageBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "effectiveResolutionReturnBps" INTEGER NOT NULL DEFAULT 0;
