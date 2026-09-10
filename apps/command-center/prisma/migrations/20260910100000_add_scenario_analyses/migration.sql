CREATE TABLE "ScenarioAnalysis" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "selectedDomainIds" JSONB NOT NULL,
    "projectIds" JSONB,
    "teamIds" JSONB,
    "assumptions" JSONB NOT NULL,
    "estimate" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScenarioAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ScenarioAnalysis_createdById_createdAt_idx" ON "ScenarioAnalysis"("createdById", "createdAt");
CREATE INDEX "ScenarioAnalysis_createdAt_idx" ON "ScenarioAnalysis"("createdAt");

ALTER TABLE "ScenarioAnalysis" ADD CONSTRAINT "ScenarioAnalysis_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
