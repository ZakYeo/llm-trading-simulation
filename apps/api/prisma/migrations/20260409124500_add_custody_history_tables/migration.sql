CREATE TABLE "CustodyPlacement" (
  "id" TEXT NOT NULL,
  "gameSessionId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "bankerAgentId" TEXT NOT NULL,
  "ownerAgentId" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustodyPlacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustodyRedemption" (
  "id" TEXT NOT NULL,
  "gameSessionId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "bankerAgentId" TEXT NOT NULL,
  "ownerAgentId" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustodyRedemption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustodyAccrual" (
  "id" TEXT NOT NULL,
  "gameSessionId" TEXT NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "bankerAgentId" TEXT NOT NULL,
  "ownerAgentId" TEXT NOT NULL,
  "amount" DECIMAL(18,4) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustodyAccrual_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CustodyPlacement"
  ADD CONSTRAINT "CustodyPlacement_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyPlacement"
  ADD CONSTRAINT "CustodyPlacement_bankerAgentId_fkey"
  FOREIGN KEY ("bankerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyPlacement"
  ADD CONSTRAINT "CustodyPlacement_ownerAgentId_fkey"
  FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustodyRedemption"
  ADD CONSTRAINT "CustodyRedemption_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyRedemption"
  ADD CONSTRAINT "CustodyRedemption_bankerAgentId_fkey"
  FOREIGN KEY ("bankerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyRedemption"
  ADD CONSTRAINT "CustodyRedemption_ownerAgentId_fkey"
  FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustodyAccrual"
  ADD CONSTRAINT "CustodyAccrual_gameSessionId_fkey"
  FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyAccrual"
  ADD CONSTRAINT "CustodyAccrual_bankerAgentId_fkey"
  FOREIGN KEY ("bankerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustodyAccrual"
  ADD CONSTRAINT "CustodyAccrual_ownerAgentId_fkey"
  FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
