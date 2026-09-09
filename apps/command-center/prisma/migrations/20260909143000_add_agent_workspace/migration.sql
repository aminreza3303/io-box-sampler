-- Add persistent, auditable storage for Hermes/OMP conversations.
CREATE TYPE "AgentRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'BLOCKED', 'FAILED');

CREATE TYPE "AgentMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "runtime" TEXT NOT NULL DEFAULT 'hermes',
    "prompt" TEXT NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'QUEUED',
    "resultKind" TEXT,
    "output" TEXT,
    "error" TEXT,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentMessage" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "role" "AgentMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentRun_actorId_createdAt_idx" ON "AgentRun"("actorId", "createdAt");
CREATE INDEX "AgentRun_status_createdAt_idx" ON "AgentRun"("status", "createdAt");
CREATE INDEX "AgentMessage_runId_createdAt_idx" ON "AgentMessage"("runId", "createdAt");

ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentMessage" ADD CONSTRAINT "AgentMessage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
