-- AlterEnum
ALTER TYPE "AgentTurnActionType" ADD VALUE 'ACCEPT_DIRECT_TRANSFER_PROPOSAL';

-- AlterEnum
ALTER TYPE "AgentTurnActionType" ADD VALUE 'REJECT_DIRECT_TRANSFER_PROPOSAL';

-- AlterTable
ALTER TABLE "AgentTurnAction"
ADD COLUMN "relatedProposalActionId" TEXT;
