import { describe, expect, it } from "vitest";
import { buildScenarioHermesContext } from "../../server/domain/scenario-hermes-context";

describe("buildScenarioHermesContext", () => {
  it("whitelists stored inputs, estimate, missing inputs, KPI/gate and evidence provenance", () => {
    const context = buildScenarioHermesContext({
      assumptions: {
        title: "Wallet growth", domainIds: ["wallet", "ledger"], projectIds: ["p1"], teamIds: ["t1"],
        horizonMonths: 12, currency: "TOMAN", impactDepth: "direct",
        catalogSnapshot: { id: "catalog-wallet", track: "wallet", lane: "personal-finance", title: "Wallet track", summary: "Catalog summary", valueHypothesis: "Growth", domainIds: ["wallet"], suggestedOwner: "Product", sourceReferences: [{ document: "strategy.pdf", locator: "p.9", label: "فرضیهٔ سند" }] },
        cases: [{ id: "base", name: "پایه", effortAdjustmentPercent: 10, riskReservePercent: 15, manualTeamCount: 2,
          weeklyCapacityPerTeam: 20, personDayRate: 3_000_000, oneTimeExternalCost: null, monthlyOperatingCost: 100_000,
          phaseShares: { product: 0.1, design: 0.2, development: 0.5, delivery: 0.2 },
          effortOverrides: [{ domainId: "wallet", personDays: 33, source: { kind: "internal-data", label: "دادهٔ داخلی", source: "EFFORT_SOURCE_EVIDENCE", recordedAt: "2026-09-01", owner: "Engineering", confidence: "high" } }],
          moneyConversions: [{ field: "personDayRate", originalCurrency: "USD", originalAmount: 100, convertedAmount: 3_000_000, rate: 30_000, rateDate: "2026-09-01", source: "RATE_SOURCE_LABEL" }],
          benefitDrivers: [{ name: "فعال‌سازی", monthlyUnits: 50, netContributionPerUnit: 200, startMonth: 3, probabilityPercent: 70,
            source: { kind: "document-hypothesis", label: "فرضیهٔ سند", source: { document: "strategy.pdf", locator: "p.4", label: "فرضیهٔ سند" }, confidence: "medium" } }],
          fieldEvidence: [{ field: "riskReservePercent", evidence: { kind: "owner-estimate", label: "برآورد مالک", source: "جلسه", owner: "مدیر", confidence: "low" } }],
        }],
        kpis: [{ name: "Conversion", baseline: 2, target: 4, actual: null, operator: "gte", unit: "%", measurementWindow: "ماهانه", owner: "CEO", guardrail: false,
          source: { kind: "internal-data", label: "دادهٔ داخلی", source: "analytics", recordedAt: "2026-09-01", owner: "Data", confidence: "high" } }],
        gateDecision: { decision: null, reason: "داده لازم است", evidence: "داشبورد", owner: "CEO", reviewDate: "2026-10-01" },
        priorityCriteria: [{ id: "impact", label: "اثر", score: 4, direction: "higher-is-better", source: null }],
        priorityWeights: [{ criterionId: "impact", weight: 100, source: null }],
        fieldEvidence: [{ field: "horizonMonths", evidence: { kind: "approved", label: "مصوب", source: "جلسهٔ هیئت‌مدیره", owner: "CEO", recordedAt: "2026-09-01", confidence: "high" } }],
        guardrails: ["No balance mutation"], risks: ["adoption"], milestones: [],
        secret: "must not leak",
      },
      estimate: {
        modelVersion: "scenario-business-case/v1", title: "Wallet growth",
        cases: [{ caseId: "base", name: "پایه", technical: { selectedDomainIds: ["wallet"], impactedDomains: [{ id: "wallet", title: "Wallet", selected: true, status: "active" }],
          metrics: { basePersonDays: 10, adjustedBasePersonDays: 11, reservePersonDays: 2, personDays: 13, calendarWeeks: null },
          changeVolume: { domainCount: 1, selectedDomainCount: 1, relationshipCount: 0, processCount: 2, apiSurfaceCount: 3, integrationCount: 1, dataMigrationCount: 0, uiSurfaceCount: 2, phaseCount: 4 },
          phases: [{ id: "product", title: "محصول", personDays: 1, share: 0.1 }], warnings: [] },
          financial: { currency: "TOMAN", initialInvestment: null, monthlyOperatingCost: 100_000, totalExpectedContribution: null,
            totalCosts: null, netValue: null, roiPercent: null, paybackMonths: null, missingInputs: ["benefit"], limitations: [] },
          inputs: { effortAdjustmentPercent: 10, riskReservePercent: 15, manualTeamCount: 2, weeklyCapacityPerTeam: 20,
            personDayRate: 3_000_000, oneTimeExternalCost: null, monthlyOperatingCost: 100_000,
            effortOverrides: [{ domainId: "wallet", personDays: 33, source: { kind: "internal-data", label: "دادهٔ داخلی", source: "ESTIMATE_EFFORT_SOURCE", recordedAt: "2026-09-01", owner: "Engineering", confidence: "high" } }],
            moneyConversions: [{ field: "personDayRate", originalCurrency: "USD", originalAmount: 100, convertedAmount: 3_000_000, rate: 30_000, rateDate: "2026-09-01", source: "ESTIMATE_RATE_SOURCE" }],
            benefitDrivers: [{ name: "فعال‌سازی", startMonth: 3, probabilityPercent: 70 }] },
        }],
        comparison: { metrics: [], differingInputs: [] },
        kpiEvaluations: [{ kpi: { name: "Conversion", actual: null, target: 4, operator: "gte", unit: "%" }, status: "unmeasured" }],
        gateDecision: { decision: null, reason: "داده لازم است", evidence: "داشبورد", owner: "CEO", reviewDate: null },
        priority: { weightedScore: null, criteria: [], weights: [] },
        evidenceCompleteness: { recorded: 1, missing: 2, missingFields: ["teamCount", "benefit"] }, warnings: [], limitations: [],
        privateToken: "must not leak",
      },
    });
    const parsed = JSON.parse(context) as Record<string, unknown>;
    expect(context.length).toBeLessThanOrEqual(12_000);
    expect(parsed.version).toBe("scenario-hermes-context/v1");
    expect(parsed.modelVersion).toBe("scenario-business-case/v1");
    expect(JSON.stringify(parsed)).toContain("teamCount");
    expect(JSON.stringify(parsed)).toContain("actual");
    expect(JSON.stringify(parsed)).toContain("riskReservePercent");
    expect(JSON.stringify(parsed)).toContain("document-hypothesis");
    expect(JSON.stringify(parsed)).toContain("فرضیهٔ سند");
    expect(JSON.stringify(parsed)).toContain("EFFORT_SOURCE_EVIDENCE");
    expect(JSON.stringify(parsed)).toContain("ESTIMATE_EFFORT_SOURCE");
    expect(JSON.stringify(parsed)).toContain("RATE_SOURCE_LABEL");
    expect(JSON.stringify(parsed)).toContain("ESTIMATE_RATE_SOURCE");
    expect(JSON.stringify(parsed)).toContain("catalog-wallet");
    expect(JSON.stringify(parsed)).toContain("strategy.pdf");
    expect(JSON.stringify(parsed)).not.toContain("must not leak");
    expect(JSON.stringify(parsed)).not.toContain("privateToken");
  });

  it("bounds pathological whitelisted strings and unknown collections while keeping valid JSON", () => {
    const context = buildScenarioHermesContext({
      assumptions: { title: "x".repeat(50_000), domainIds: Array.from({ length: 100 }, (_, i) => `domain-${i}`), cases: [] },
      estimate: { modelVersion: "scenario-business-case/v1", title: "y".repeat(50_000), cases: [], evidenceCompleteness: { recorded: 0, missing: 3, missingFields: ["a", "b", "c"] }, unexpected: "secret" },
    });
    expect(context.length).toBeLessThanOrEqual(12_000);
    expect(() => JSON.parse(context)).not.toThrow();
    expect(context).not.toContain("secret");
  });

  it("keeps missing-input names when a fully whitelisted context reaches the oversized fallback", () => {
    const source = { kind: "owner-estimate", label: "L".repeat(80), source: "S".repeat(500), owner: "O".repeat(100), confidence: "medium" };
    const assumptions = {
      title: "x".repeat(120), domainIds: Array.from({ length: 28 }, (_, i) => `domain-${i}-${"d".repeat(80)}`),
      catalogSnapshot: { id: "catalog-large", track: "wallet", lane: "personal-finance", title: "catalog".repeat(20), summary: "summary".repeat(30), valueHypothesis: "value".repeat(30), domainIds: [], sourceReferences: Array.from({ length: 8 }, (_, i) => ({ document: `doc${i}-${"d".repeat(100)}`, locator: "p".repeat(100), label: "source".repeat(10) })) },
      cases: Array.from({ length: 3 }, (_, caseIndex) => ({
        id: `case-${caseIndex}`, name: "scenario".repeat(10), effortAdjustmentPercent: 10, riskReservePercent: 20,
        effortOverrides: Array.from({ length: 28 }, (_, i) => ({ domainId: `domain-${i}`, personDays: i + 1, source })),
        moneyConversions: Array.from({ length: 12 }, (_, i) => ({ field: "personDayRate", originalCurrency: "USD", originalAmount: i, convertedAmount: i, rate: 1, rateDate: "2026-09-01", source: "conversion-source".repeat(10) })),
        benefitDrivers: [], fieldEvidence: [],
      })),
      kpis: Array.from({ length: 16 }, (_, i) => ({ name: `kpi-${i}-${"K".repeat(90)}`, source })),
      priorityCriteria: [], priorityWeights: [], milestones: [], guardrails: [], risks: [], fieldEvidence: [],
    };
    const estimate = {
      modelVersion: "scenario-business-case/v1", title: "huge", cases: Array.from({ length: 3 }, (_, caseIndex) => ({
        caseId: `case-${caseIndex}`, name: "scenario".repeat(10),
        technical: { selectedDomainIds: [], impactedDomains: Array.from({ length: 20 }, (_, i) => ({ id: `id-${i}`, title: "domain".repeat(20), selected: false, status: "active" })), metrics: {}, changeVolume: {}, phases: [], warnings: [] },
        financial: { currency: "TOMAN", missingInputs: ["financial-required-input"], limitations: [] },
        inputs: { effortOverrides: assumptions.cases[caseIndex].effortOverrides, moneyConversions: assumptions.cases[caseIndex].moneyConversions, benefitDrivers: [], fieldEvidence: [] },
      })),
      kpiEvaluations: assumptions.kpis.map((kpi) => ({ kpi: { ...kpi, actual: null, target: 1, operator: "gte" }, status: "unmeasured" })),
      comparison: { metrics: [], differingInputs: [] }, gateDecision: null, priority: null,
      evidenceCompleteness: { recorded: 0, missing: 2, missingFields: ["critical-missing-input", "secondary-missing-input"] },
    };
    const context = buildScenarioHermesContext({ assumptions, estimate });
    const parsed = JSON.parse(context) as { truncated?: boolean; estimate?: { missingInputs?: string[] } };
    expect(context.length).toBeLessThanOrEqual(12_000);
    expect(parsed.truncated).toBe(true);
    expect(parsed.estimate?.missingInputs).toContain("critical-missing-input");
    expect(parsed.estimate?.missingInputs).toContain("secondary-missing-input");
  });

  it("returns safe JSON when snapshot values are unknown", () => {
    const context = buildScenarioHermesContext({ assumptions: ["unknown"], estimate: null });
    const parsed = JSON.parse(context) as Record<string, unknown>;
    expect(parsed.missingInputs).toEqual({ assumptions: ["assumptions snapshot is unavailable or not an object"], estimate: ["estimate snapshot is unavailable or not an object"] });
  });

  it("unwraps a CEO-decision snapshot to retain the original saved inputs", () => {
    const context = buildScenarioHermesContext({
      assumptions: { sourceAnalysisId: "source-123", sourceAssumptions: { title: "Original plan", domainIds: ["wallet"], cases: [] }, decision: { decision: "continue" } },
      estimate: { modelVersion: "scenario-business-case/v1", title: "Original plan with decision", cases: [], gateDecision: { decision: "continue", reason: "approved", evidence: "minutes", owner: "CEO", reviewDate: null }, evidenceCompleteness: { recorded: 0, missing: 0, missingFields: [] } },
    });
    const parsed = JSON.parse(context) as Record<string, unknown>;
    expect(parsed.sourceAnalysisId).toBe("source-123");
    expect(recordOf(parsed.assumptions)?.title).toBe("Original plan");
  });
});

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
