import { describe, expect, it } from "vitest";
import { getStrategicScenario } from "../../lib/scenario-catalog";
import { buildScenarioEstimate } from "../../server/domain/scenario-analysis";
import type { ScenarioEvidence, ScenarioRequest } from "../../lib/scenario-types";

const evidence: ScenarioEvidence = {
  kind: "owner-estimate",
  label: "برآورد مالک",
  source: "جلسهٔ برنامه‌ریزی",
  owner: "تیم محصول",
  confidence: "medium",
};

const request = (): ScenarioRequest => ({
  catalogScenarioId: "wallet-round-up",
  title: "پس‌انداز گردشی",
  domainIds: ["wallet", "transactions"],
  projectIds: ["newcash"],
  teamIds: ["product", "backend"],
  impactDepth: "selected",
  currency: "TOMAN",
  horizonMonths: 12,
  cases: (["conservative", "base", "optimistic"] as const).map((id) => ({
    id,
    name: id,
    effortAdjustmentPercent: 0,
    riskReservePercent: 0,
    manualTeamCount: null,
    weeklyCapacityPerTeam: 5,
    phaseShares: { product: 0.15, design: 0.2, development: 0.45, delivery: 0.2 },
    effortOverrides: [],
    fieldEvidence: ([
      "effortAdjustmentPercent", "riskReservePercent", "teamCount", "weeklyCapacityPerTeam",
      "phaseShares", "personDayRate", "oneTimeExternalCost", "monthlyOperatingCost",
    ] as const).map((field) => ({ field, evidence })),
    personDayRate: null,
    oneTimeExternalCost: null,
    monthlyOperatingCost: 0,
    benefitDrivers: [{
      id: "round-up",
      name: "پس‌انداز ماهانه",
      monthlyUnits: 10,
      netContributionPerUnit: 2,
      startMonth: 2,
      probabilityPercent: 50,
      source: evidence,
    }],
    moneyConversions: [],
  })),
  kpis: [{
    id: "activation",
    name: "فعال‌سازی",
    baseline: null,
    target: 10,
    unit: "%",
    operator: "gte",
    measurementWindow: "ماهانه",
    actual: 10,
    actualAt: "2026-09-12",
    actualSource: "داشبورد آزمون",
    owner: "محصول",
    guardrail: false,
    source: evidence,
  }],
  gateDecision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
  milestones: [],
  guardrails: [],
  risks: [],
  priorityCriteria: [{ id: "value", label: "ارزش", score: 4, direction: "higher-is-better", source: evidence }],
  priorityWeights: [{ criterionId: "value", weight: 100, source: evidence }],
  fieldEvidence: ([
    "catalogScenarioId", "domainIds", "impactDepth", "currency", "horizonMonths", "teamIds",
    "kpis", "milestones", "guardrails", "risks", "priorityCriteria", "priorityWeights",
  ] as const).map((field) => ({ field, evidence })),
});

describe("scenario analysis snapshot builder", () => {
  it("combines the exact catalog snapshot with server-calculated cases and KPI/priority results", () => {
    const input = request();
    const catalog = getStrategicScenario(input.catalogScenarioId!);
    expect(catalog).toBeDefined();
    const result = buildScenarioEstimate(input, catalog!);

    expect(result.modelVersion).toBe("scenario-business-case/v1");
    expect(result.catalogSnapshot).toBe(catalog);
    expect(result.title).toBe(input.title);
    expect(result.cases).toHaveLength(3);
    expect(result.cases.map((item) => item.caseId)).toEqual(["conservative", "base", "optimistic"]);
    expect(result.cases.map((item) => item.financial.totalExpectedContribution)).toEqual([110, 110, 110]);
    expect(result.cases.map((item) => item.financial.initialInvestment)).toEqual([null, null, null]);
    expect(result.comparison.differingInputs).toEqual([]);
    expect(result.kpiEvaluations).toEqual([{ kpi: input.kpis[0], status: "met" }]);
    expect(result.gateDecision).toEqual(input.gateDecision);
    expect(result.priority?.weightedScore).toBe(4);
    expect(result.evidenceCompleteness.missing).toBe(0);
    expect(result.evidenceCompleteness.recorded).toBeGreaterThan(0);
    expect(result.limitations.join(" ")).toContain("تورم");
  });

  it("supports manual analysis without a catalog and returns a null snapshot", () => {
    const input = { ...request(), catalogScenarioId: undefined };
    input.fieldEvidence = input.fieldEvidence.filter((item) => item.field !== "catalogScenarioId");
    expect(buildScenarioEstimate(input, null).catalogSnapshot).toBeNull();
  });
});
