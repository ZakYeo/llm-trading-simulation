-- CreateEnum
CREATE TYPE "AgentMessageVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateTable
CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "senderAgentId" TEXT NOT NULL,
    "recipientAgentId" TEXT,
    "visibility" "AgentMessageVisibility" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_senderAgentId_fkey" FOREIGN KEY ("senderAgentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_recipientAgentId_fkey" FOREIGN KEY ("recipientAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
