ALTER TABLE "GameSession" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "depositNegotiations" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "BankerCustodyPosition" ADD COLUMN "lots" JSONB NOT NULL DEFAULT '[]';
UPDATE "BankerCustodyPosition" SET "lots" = jsonb_build_array(jsonb_build_object('principal', "principal"::text, 'rateBps', 250));
ALTER TABLE "AgentTurnAction" ADD COLUMN "decisionExplanation" TEXT, ADD COLUMN "personalitySnapshot" JSONB, ADD COLUMN "depositTerms" JSONB;
ALTER TABLE "CustodyAccrual" ADD COLUMN "bankerIncome" DECIMAL(18,4) NOT NULL DEFAULT 0;
