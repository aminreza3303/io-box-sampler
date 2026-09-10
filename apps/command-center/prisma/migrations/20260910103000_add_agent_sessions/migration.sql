CREATE TABLE "AgentSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "runtime" TEXT NOT NULL DEFAULT 'hermes',
    "sessionName" TEXT NOT NULL,
    "externalSessionId" TEXT,
    "workspaceKey" TEXT NOT NULL,
    "workspacePath" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AgentRun" ADD COLUMN "agentSessionId" TEXT;

CREATE UNIQUE INDEX "AgentSession_ownerId_projectId_runtime_key" ON "AgentSession"("ownerId", "projectId", "runtime");
CREATE INDEX "AgentSession_projectId_updatedAt_idx" ON "AgentSession"("projectId", "updatedAt");

ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_agentSessionId_fkey" FOREIGN KEY ("agentSessionId") REFERENCES "AgentSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
