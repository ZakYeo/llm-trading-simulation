-- CreateEnum
CREATE TYPE "AgentTurnActionType" AS ENUM (
    'SEND_PUBLIC_MESSAGE',
    'SEND_PRIVATE_MESSAGE',
    'PROPOSE_DIRECT_TRANSFER',
    'FINALIZE_TURN'
);

-- AlterTable
ALTER TABLE "AgentMessage"
ADD COLUMN "turnNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "AgentTurnAction" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "agentId" TEXT NOT NULL,
    "recipientAgentId" TEXT,
    "actionType" "AgentTurnActionType" NOT NULL,
    "amount" DECIMAL(18,4),
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTurnAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentTurnAction" ADD CONSTRAINT "AgentTurnAction_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTurnAction" ADD CONSTRAINT "AgentTurnAction_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
