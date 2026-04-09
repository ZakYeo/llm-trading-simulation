CREATE TABLE "BankerCustodyPosition" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "bankerAgentId" TEXT NOT NULL,
    "ownerAgentId" TEXT NOT NULL,
    "principal" DECIMAL(18,4) NOT NULL,
    "accrued" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankerCustodyPosition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BankerCustodyPosition_gameSessionId_bankerAgentId_ownerA_key"
ON "BankerCustodyPosition"("gameSessionId", "bankerAgentId", "ownerAgentId");

ALTER TABLE "BankerCustodyPosition"
ADD CONSTRAINT "BankerCustodyPosition_gameSessionId_fkey"
FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankerCustodyPosition"
ADD CONSTRAINT "BankerCustodyPosition_bankerAgentId_fkey"
FOREIGN KEY ("bankerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BankerCustodyPosition"
ADD CONSTRAINT "BankerCustodyPosition_ownerAgentId_fkey"
FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
