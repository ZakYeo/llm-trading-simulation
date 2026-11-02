CREATE TYPE "RoundSummaryStatus" AS ENUM ('READY', 'UNAVAILABLE');
CREATE TYPE "RoundSummaryProvider" AS ENUM ('OPENAI', 'MOCK');
CREATE TABLE "RoundSummary" (
    "gameSessionId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "status" "RoundSummaryStatus" NOT NULL,
    "provider" "RoundSummaryProvider" NOT NULL,
    "text" TEXT,
    "eventCount" INTEGER NOT NULL,
    "includedEventCount" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RoundSummary_pkey" PRIMARY KEY ("gameSessionId", "roundNumber"),
    CONSTRAINT "RoundSummary_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
