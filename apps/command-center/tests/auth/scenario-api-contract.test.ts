import { beforeEach, describe, expect, it, vi } from "vitest";
import { canViewScenarioAnalysis, parseScenarioRequest } from "../../server/domain/scenario-analysis";
import type { ScenarioEvidence, ScenarioRequest } from "../../lib/scenario-types";

const routeMocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createAnalysis: vi.fn(),
  findAnalyses: vi.fn(),
  updateAnalysis: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("../../lib/auth", () => ({ requireUser: routeMocks.requireUser }));
vi.mock("../../lib/db", () => ({
  prisma: {
    scenarioAnalysis: {
      create: routeMocks.createAnalysis,
      findMany: routeMocks.findAnalyses,
      update: routeMocks.updateAnalysis,
    },
  },
}));
vi.mock("../../server/domain/audit-service", () => ({ recordAuditEvent: routeMocks.recordAuditEvent }));

import { POST as analyzeScenario } from "../../app/api/scenarios/analyze/route";
import { GET as getScenarioHistory } from "../../app/api/scenarios/route";

const modelEvidence: ScenarioEvidence = {
  kind: "model-default",
  label: "فرض اولیهٔ مدل",
  source: "scenario API contract tests",
  confidence: null,
};

const caseInput = (id: "conservative" | "base" | "optimistic") => ({
  id,
  name: id,
  effortAdjustmentPercent: 0,
  riskReservePercent: 10,
  manualTeamCount: null,
  weeklyCapacityPerTeam: 5,
  phaseShares: { product: 0.15, design: 0.2, development: 0.45, delivery: 0.2 },
  effortOverrides: [{ domainId: "wallet", personDays: 9, source: modelEvidence }],
  fieldEvidence: ([
    "effortAdjustmentPercent", "riskReservePercent", "teamCount", "weeklyCapacityPerTeam",
    "phaseShares", "personDayRate", "oneTimeExternalCost", "monthlyOperatingCost",
  ] as const).map((field) => ({ field, evidence: modelEvidence })),
  personDayRate: null,
  oneTimeExternalCost: null,
  monthlyOperatingCost: 0,
  benefitDrivers: [{
    id: "activation",
    name: "فعال‌سازی",
    monthlyUnits: null,
    netContributionPerUnit: null,
    startMonth: null,
    probabilityPercent: null,
    source: null,
  }],
  moneyConversions: [],
});

const scenarioRequest = (): ScenarioRequest => ({
  catalogScenarioId: "wallet-round-up",
  title: "پس‌انداز گردشی",
  description: "فرض آزمایشی",
  domainIds: ["wallet", "transactions"],
  projectIds: ["newcash"],
  teamIds: ["product"],
  impactDepth: "direct",
  currency: "TOMAN",
  horizonMonths: 12,
  cases: [caseInput("conservative"), caseInput("base"), caseInput("optimistic")],
  kpis: [{
    id: "activation",
    name: "فعال‌سازی",
    baseline: null,
    target: 10,
    unit: "%",
    operator: "gte",
    measurementWindow: "ماهانه",
    actual: null,
    actualAt: null,
    actualSource: null,
    owner: "محصول",
    guardrail: false,
    source: null,
  }],
  gateDecision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null },
  milestones: [],
  guardrails: [],
  risks: [],
  priorityCriteria: [{ id: "value", label: "ارزش", score: 5, direction: "higher-is-better", source: modelEvidence }],
  priorityWeights: [{ criterionId: "value", weight: 0, source: modelEvidence }],
  fieldEvidence: ([
    "catalogScenarioId", "domainIds", "impactDepth", "currency", "horizonMonths", "teamIds",
    "kpis", "milestones", "guardrails", "risks", "priorityCriteria", "priorityWeights",
  ] as const).map((field) => ({ field, evidence: modelEvidence })),
});

describe("scenario API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireUser.mockResolvedValue({
      userId: "member-1", role: "MEMBER", projectIds: ["newcash"], teamIds: ["product"],
    });
    routeMocks.createAnalysis.mockResolvedValue({ id: "analysis-1" });
    routeMocks.findAnalyses.mockResolvedValue([]);
    routeMocks.recordAuditEvent.mockResolvedValue({ id: "audit-1" });
  });

  it("accepts a complete version-one request and preserves null instead of coercing it to zero", () => {
    const parsed = parseScenarioRequest(scenarioRequest());
    expect(parsed.cases[1].personDayRate).toBeNull();
    expect(parsed.cases[1].benefitDrivers[0].monthlyUnits).toBeNull();
    expect(parsed.priorityWeights[0].weight).toBe(0);
  });

  it("requires the exact three distinct comparison cases and unique identifiers", () => {
    const request = scenarioRequest();
    expect(() => parseScenarioRequest({ ...request, cases: request.cases.slice(0, 2) })).toThrow();
    expect(() => parseScenarioRequest({ ...request, cases: [request.cases[0], request.cases[0], request.cases[2]] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, domainIds: ["wallet", "wallet"] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, teamIds: ["team-1", "team-1"] })).toThrow();
  });

  it.each([
    ["effort above maximum", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, effortAdjustmentPercent: 501 })) })],
    ["effort below minimum", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, effortAdjustmentPercent: -101 })) })],
    ["risk below minimum", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, riskReservePercent: -1 })) })],
    ["risk above maximum", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, riskReservePercent: 101 })) })],
    ["horizon above maximum", (request: ScenarioRequest) => ({ ...request, horizonMonths: 61 })],
    ["invalid currency", (request: ScenarioRequest) => ({ ...request, currency: "EUR" })],
    ["negative one-time cost", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, oneTimeExternalCost: -1 })) })],
    ["negative operating cost", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, monthlyOperatingCost: -1 })) })],
    ["negative effort override", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, effortOverrides: [{ domainId: "wallet", personDays: -1, source: modelEvidence }] })) })],
    ["unnormalized phases", (request: ScenarioRequest) => ({ ...request, cases: request.cases.map((item) => ({ ...item, phaseShares: { product: 0.2, design: 0.2, development: 0.2, delivery: 0.2 } })) })],
    ["invalid priority weight", (request: ScenarioRequest) => ({ ...request, priorityWeights: [{ criterionId: "value", weight: 101, source: modelEvidence }] })],
    ["priority score outside 1..5", (request: ScenarioRequest) => ({ ...request, priorityCriteria: [{ id: "value", label: "ارزش", score: 6, direction: "higher-is-better", source: modelEvidence }] })],
  ])("rejects %s", (_label, mutate) => {
    expect(() => parseScenarioRequest(mutate(scenarioRequest()))).toThrow();
  });

  it("accepts documented inclusive boundaries for percentages, horizon and priority", () => {
    const request = scenarioRequest();
    const boundary = {
      ...request,
      horizonMonths: 1,
      cases: request.cases.map((item) => ({
        ...item,
        effortAdjustmentPercent: -100,
        riskReservePercent: 100,
        benefitDrivers: [{ ...item.benefitDrivers[0], monthlyUnits: 0, netContributionPerUnit: -1, startMonth: 1, probabilityPercent: 100 }],
      })),
      priorityCriteria: [{ ...request.priorityCriteria[0], score: 1 }],
      priorityWeights: [{ ...request.priorityWeights[0], weight: 0 }],
    };
    expect(parseScenarioRequest(boundary).horizonMonths).toBe(1);
    expect(() => parseScenarioRequest({ ...boundary, horizonMonths: 60 })).not.toThrow();
  });

  it("bounds probability and requires driver start month inside the selected horizon", () => {
    const request = scenarioRequest();
    expect(() => parseScenarioRequest({
      ...request,
      cases: request.cases.map((item) => ({ ...item, benefitDrivers: [{ ...item.benefitDrivers[0], probabilityPercent: 101 }] })),
    })).toThrow();
    expect(() => parseScenarioRequest({
      ...request,
      horizonMonths: 3,
      cases: request.cases.map((item) => ({ ...item, benefitDrivers: [{ ...item.benefitDrivers[0], startMonth: 4 }] })),
    })).toThrow();
  });

  it("requires KPI timestamps and sources exactly when an actual measurement exists", () => {
    const request = scenarioRequest();
    const measuredKpi = { ...request.kpis[0], actual: 10, actualAt: "2026-09-12", actualSource: "داشبورد" };
    expect(() => parseScenarioRequest({ ...request, kpis: [measuredKpi] })).not.toThrow();
    expect(() => parseScenarioRequest({ ...request, kpis: [{ ...measuredKpi, actualSource: null }] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, kpis: [{ ...request.kpis[0], actualAt: "2026-09-12" }] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, kpis: [{ ...request.kpis[0], actualAt: "yesterday" }] })).toThrow();
  });

  it("rejects a recorded gate decision from an analysis request while still validating milestone dates", () => {
    const request = scenarioRequest();
    const decided = {
      ...request,
      gateDecision: {
        decision: "continue",
        reason: "پایلوت محدود ادامه یابد",
        evidence: "نتیجهٔ پایلوت ثبت شد",
        owner: "مدیرعامل",
        reviewDate: "2026-10-01",
      },
      milestones: [{
        id: "pilot",
        title: "پایلوت محدود",
        stage: "آزمون",
        owner: "تیم محصول",
        targetDay: 30,
        targetDate: null,
        entryCriteria: "آمادگی تیم",
        exitCriteria: "شواهد استفاده ثبت شود",
        reviewDate: "2026-10-01",
      }],
    };
    expect(() => parseScenarioRequest(decided)).toThrow();
    expect(() => parseScenarioRequest({
      ...decided,
      gateDecision: { ...decided.gateDecision, evidence: " " },
    })).toThrow();
    expect(() => parseScenarioRequest({
      ...decided,
      milestones: [{ ...decided.milestones[0], reviewDate: "2026-02-30" }],
    })).toThrow();
    expect(() => parseScenarioRequest({
      ...decided,
      milestones: [decided.milestones[0], decided.milestones[0]],
    })).toThrow();
  });

  it("validates manual conversion values against the exact target field", () => {
    const request = scenarioRequest();
    const conversion = {
      field: "personDayRate" as const,
      originalCurrency: "USD",
      originalAmount: 1,
      convertedAmount: 8,
      rate: 8,
      rateDate: "2026-09-12",
      source: "نرخ مصوب آزمون",
    };
    const valid = {
      ...request,
      cases: request.cases.map((item) => ({ ...item, personDayRate: 8, moneyConversions: [conversion] })),
    };
    expect(() => parseScenarioRequest(valid)).not.toThrow();
    expect(() => parseScenarioRequest({ ...valid, cases: valid.cases.map((item) => ({ ...item, personDayRate: 9 })) })).toThrow();
    expect(() => parseScenarioRequest({
      ...valid,
      cases: valid.cases.map((item) => ({ ...item, moneyConversions: [{ ...conversion, benefitDriverId: "activation" }] })),
    })).toThrow();
  });

  it("links benefit-margin conversions to an existing driver and checks the converted amount", () => {
    const request = scenarioRequest();
    const driver = { ...request.cases[0].benefitDrivers[0], netContributionPerUnit: 12 };
    const conversion = {
      field: "benefitNetContribution" as const,
      benefitDriverId: driver.id,
      originalCurrency: "USD",
      originalAmount: 1.5,
      convertedAmount: 12,
      rate: 8,
      rateDate: "2026-09-12",
      source: "نرخ مصوب آزمون",
    };
    const valid = {
      ...request,
      cases: request.cases.map((item) => ({ ...item, benefitDrivers: [driver], moneyConversions: [conversion] })),
    };
    expect(() => parseScenarioRequest(valid)).not.toThrow();
    expect(() => parseScenarioRequest({ ...valid, cases: valid.cases.map((item) => ({ ...item, moneyConversions: [{ ...conversion, benefitDriverId: "missing" }] })) })).toThrow();
    expect(() => parseScenarioRequest({ ...valid, cases: valid.cases.map((item) => ({ ...item, moneyConversions: [{ ...conversion, convertedAmount: 13 }] })) })).toThrow();
    expect(() => parseScenarioRequest({ ...valid, cases: valid.cases.map((item) => ({ ...item, moneyConversions: [{ ...conversion, benefitDriverId: undefined }] })) })).toThrow();
  });

  it("rejects unknown keys at request, case and evidence boundaries", () => {
    const request = scenarioRequest();
    expect(() => parseScenarioRequest({ ...request, unknown: true })).toThrow();
    expect(() => parseScenarioRequest({ ...request, cases: request.cases.map((item) => ({ ...item, secret: true })) })).toThrow();
    expect(() => parseScenarioRequest({
      ...request,
      fieldEvidence: request.fieldEvidence.map((item, index) => index === 0 ? { ...item, evidence: { ...modelEvidence, secret: true } } : item),
    })).toThrow();
  });

  it("rejects duplicate field-evidence, KPI, criterion, and conversion IDs", () => {
    const request = scenarioRequest();
    expect(() => parseScenarioRequest({ ...request, fieldEvidence: [...request.fieldEvidence, request.fieldEvidence[0]] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, kpis: [request.kpis[0], request.kpis[0]] })).toThrow();
    expect(() => parseScenarioRequest({ ...request, priorityCriteria: [request.priorityCriteria[0], request.priorityCriteria[0]] })).toThrow();
    const conversion = {
      field: "personDayRate" as const, originalCurrency: "USD", originalAmount: 1, convertedAmount: 8,
      rate: 8, rateDate: "2026-09-12", source: "نرخ آزمون",
    };
    expect(() => parseScenarioRequest({
      ...request,
      cases: request.cases.map((item) => ({ ...item, personDayRate: 8, moneyConversions: [conversion, conversion] })),
    })).toThrow();
  });

  it("rejects blank titles and retains CEO/creator-only history access", () => {
    expect(() => parseScenarioRequest({ ...scenarioRequest(), title: " " })).toThrow();
    expect(canViewScenarioAnalysis({ role: "CEO", userId: "ceo" }, "member")).toBe(true);
    expect(canViewScenarioAnalysis({ role: "MANAGER", userId: "manager" }, "member")).toBe(false);
    expect(canViewScenarioAnalysis({ role: "MEMBER", userId: "member" }, "member")).toBe(true);
  });

  it("resolves and snapshots catalog data server-side with a versioned calculation and audit event", async () => {
    const response = await analyzeScenario(new Request("http://localhost/api/scenarios/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scenarioRequest()),
    }));
    const body = await response.json();
    const createArg = routeMocks.createAnalysis.mock.calls[0][0];

    expect(response.status).toBe(201);
    expect(body.estimate.modelVersion).toBe("scenario-business-case/v1");
    expect(createArg.data.assumptions.catalogSnapshot.id).toBe("wallet-round-up");
    expect(createArg.data.estimate.modelVersion).toBe("scenario-business-case/v1");
    expect(routeMocks.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "SCENARIO_ANALYZED",
      targetId: "analysis-1",
      metadata: expect.objectContaining({ modelVersion: "scenario-business-case/v1", caseCount: 3 }),
    }));
  });

  it("rejects a recorded gate decision before creating an analysis or audit event", async () => {
    const request = {
      ...scenarioRequest(),
      gateDecision: {
        decision: "continue" as const,
        reason: "پایلوت محدود ادامه یابد",
        evidence: "نتیجهٔ پایلوت ثبت شد",
        owner: "مدیرعامل",
        reviewDate: "2026-10-01",
      },
    };
    const response = await analyzeScenario(new Request("http://localhost/api/scenarios/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }));

    expect(response.status).toBe(400);
    expect(routeMocks.createAnalysis).not.toHaveBeenCalled();
    expect(routeMocks.recordAuditEvent).not.toHaveBeenCalled();
  });

  it("rejects unknown catalog cards and project/team IDs outside the actor's scope", async () => {
    const badCatalog = { ...scenarioRequest(), catalogScenarioId: "unknown-catalog-id" };
    const badCatalogResponse = await analyzeScenario(new Request("http://localhost/api/scenarios/analyze", {
      method: "POST", body: JSON.stringify(badCatalog), headers: { "content-type": "application/json" },
    }));
    expect(badCatalogResponse.status).toBe(400);
    expect(routeMocks.createAnalysis).not.toHaveBeenCalled();

    for (const field of ["projectIds", "teamIds"] as const) {
      const request = { ...scenarioRequest(), [field]: ["outside-scope"] };
      const response = await analyzeScenario(new Request("http://localhost/api/scenarios/analyze", {
        method: "POST", body: JSON.stringify(request), headers: { "content-type": "application/json" },
      }));
      expect(response.status).toBe(403);
    }
  });

  it("returns legacy history as stored without recalculating or rewriting it", async () => {
    const legacy = {
      id: "legacy-1", title: "تحلیل قدیمی", createdById: "member-1",
      assumptions: { teamCount: 2 }, estimate: { metrics: { personDays: 10, calendarWeeks: 2 } },
    };
    routeMocks.findAnalyses.mockResolvedValue([legacy]);
    const response = await getScenarioHistory(new Request("http://localhost/api/scenarios"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([legacy]);
    expect(routeMocks.findAnalyses).toHaveBeenCalledOnce();
    expect(routeMocks.updateAnalysis).not.toHaveBeenCalled();
  });
});
