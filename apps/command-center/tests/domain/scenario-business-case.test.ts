import { describe, expect, it } from "vitest";
import { calculateScenarioEstimate } from "../../lib/scenario-planner";
import {
  calculateFinancialCase,
  calculateScenarioCases,
  compareScenarioCases,
  evaluateKpi,
  scorePriority,
} from "../../lib/scenario-business-case";
import type {
  FinancialCaseInput,
  PriorityCriterion,
  PriorityWeight,
  ScenarioCaseInput,
  ScenarioCasesInput,
  ScenarioEvidence,
  ScenarioKpi,
  ScenarioPlannerInput,
} from "../../lib/scenario-types";

const modelEvidence: ScenarioEvidence = {
  kind: "model-default",
  label: "فرض اولیهٔ مدل",
  source: "scenario business case tests",
  confidence: null,
};

const financialInput = (overrides: Partial<FinancialCaseInput> = {}): FinancialCaseInput => ({
  plannedPersonDays: 10,
  personDayRate: 8,
  oneTimeExternalCost: 20,
  monthlyOperatingCost: 5,
  horizonMonths: 12,
  currency: "TOMAN",
  benefitDrivers: [{
    id: "conversion",
    name: "تبدیل",
    monthlyUnits: 10,
    netContributionPerUnit: 2,
    startMonth: 2,
    probabilityPercent: 50,
    source: null,
  }],
  ...overrides,
});

const caseInput = (overrides: Partial<ScenarioCaseInput> = {}): ScenarioCaseInput => ({
  id: "base",
  name: "حالت پایه",
  effortAdjustmentPercent: 0,
  riskReservePercent: 0,
  manualTeamCount: null,
  weeklyCapacityPerTeam: null,
  phaseShares: { product: 0.15, design: 0.2, development: 0.45, delivery: 0.2 },
  effortOverrides: [],
  fieldEvidence: [],
  personDayRate: 8,
  oneTimeExternalCost: 20,
  monthlyOperatingCost: 5,
  benefitDrivers: financialInput().benefitDrivers,
  moneyConversions: [],
  ...overrides,
});

const scenarioCasesInput = (cases: ScenarioCaseInput[], overrides: Partial<ScenarioCasesInput> = {}): ScenarioCasesInput => ({
  title: "آزمون پروندهٔ مالی",
  domainIds: ["wallet"],
  impactDepth: "selected",
  teamIds: [],
  horizonMonths: 12,
  currency: "TOMAN",
  cases,
  fieldEvidence: [],
  ...overrides,
});

const plannerInput = (overrides: Partial<ScenarioPlannerInput> = {}): ScenarioPlannerInput => ({
  title: "سناریوی آزمون",
  domainIds: ["wallet"],
  impactDepth: "selected",
  teamCount: null,
  weeklyCapacityPerTeam: null,
  effortAdjustmentPercent: 0,
  riskReservePercent: 0,
  phaseShares: { product: 0.15, design: 0.2, development: 0.45, delivery: 0.2 },
  effortOverrides: [],
  phaseEvidence: modelEvidence,
  ...overrides,
});

describe("scenario financial case", () => {
  it("calculates the approved explicit example without rounding or hidden multipliers", () => {
    const result = calculateFinancialCase(financialInput());

    expect(result).toMatchObject({
      currency: "TOMAN",
      initialInvestment: 100,
      monthlyOperatingCost: 5,
      totalExpectedContribution: 110,
      totalCosts: 160,
      netValue: -50,
      roiPercent: -31.25,
    });
    expect(result.paybackMonths).toBe(20);
    expect(result.missingInputs).toEqual([]);
    expect(result.limitations).toEqual(expect.arrayContaining([
      expect.stringContaining("مالیات"),
      expect.stringContaining("تورم"),
      expect.stringContaining("DCF"),
      expect.stringContaining("رَمپ‌آپ"),
      expect.stringContaining("زمان شروع درآمد"),
    ]));
  });

  it.each([
    ["plannedPersonDays", { plannedPersonDays: null }, "plannedPersonDays"],
    ["personDayRate", { personDayRate: null }, "personDayRate"],
    ["oneTimeExternalCost", { oneTimeExternalCost: null }, "oneTimeExternalCost"],
    ["monthlyOperatingCost", { monthlyOperatingCost: null }, "monthlyOperatingCost"],
  ] as const)("keeps the investment and dependent totals unknown when %s is missing", (_label, override, missing) => {
    const result = calculateFinancialCase(financialInput(override));

    expect(result.missingInputs).toContain(missing);
    expect(result.initialInvestment).toBe(missing === "monthlyOperatingCost" ? 100 : null);
    expect(result.totalCosts).toBeNull();
    expect(result.netValue).toBeNull();
    expect(result.roiPercent).toBeNull();
    expect(result.paybackMonths).toBeNull();
  });

  it("does not publish a partial contribution total when any driver is incomplete", () => {
    const result = calculateFinancialCase(financialInput({
      benefitDrivers: [
        ...financialInput().benefitDrivers,
        { id: "retention", name: "ماندگاری", monthlyUnits: 2, netContributionPerUnit: null, startMonth: 1, probabilityPercent: 80, source: null },
      ],
    }));

    expect(result.totalExpectedContribution).toBeNull();
    expect(result.netValue).toBeNull();
    expect(result.roiPercent).toBeNull();
    expect(result.paybackMonths).toBeNull();
    expect(result.missingInputs).toContain("benefitDrivers.retention.netContributionPerUnit");
  });

  it("treats an empty driver list as unknown, but respects explicit zero assumptions", () => {
    const noDrivers = calculateFinancialCase(financialInput({ benefitDrivers: [] }));
    expect(noDrivers.totalExpectedContribution).toBeNull();
    expect(noDrivers.missingInputs).toContain("benefitDrivers");

    const explicitZeros = calculateFinancialCase(financialInput({
      plannedPersonDays: 0,
      personDayRate: 0,
      oneTimeExternalCost: 0,
      monthlyOperatingCost: 0,
      benefitDrivers: [{ id: "zero", name: "بدون درآمد", monthlyUnits: 0, netContributionPerUnit: 0, startMonth: 1, probabilityPercent: 0, source: null }],
    }));
    expect(explicitZeros.initialInvestment).toBe(0);
    expect(explicitZeros.totalCosts).toBe(0);
    expect(explicitZeros.totalExpectedContribution).toBe(0);
    expect(explicitZeros.netValue).toBe(0);
    expect(explicitZeros.roiPercent).toBeNull();
    expect(explicitZeros.paybackMonths).toBeNull();
    expect(explicitZeros.missingInputs).toEqual([]);
  });

  it("counts each driver from its inclusive start month and permits negative contribution", () => {
    const result = calculateFinancialCase(financialInput({
      plannedPersonDays: 0,
      personDayRate: 0,
      oneTimeExternalCost: 0,
      monthlyOperatingCost: 0,
      benefitDrivers: [
        { id: "late", name: "دیرهنگام", monthlyUnits: 1, netContributionPerUnit: 3, startMonth: 11, probabilityPercent: 100, source: null },
        { id: "loss", name: "زیان", monthlyUnits: 2, netContributionPerUnit: -1, startMonth: 1, probabilityPercent: 50, source: null },
      ],
    }));
    expect(result.totalExpectedContribution).toBe(-6);
    expect(result.netValue).toBe(-6);
  });

  it.each([
    ["negative units", { monthlyUnits: -1 }],
    ["out-of-range probability", { probabilityPercent: 101 }],
    ["non-finite margin", { netContributionPerUnit: Number.NaN }],
    ["start month after horizon", { startMonth: 13 }],
    ["fractional start month", { startMonth: 1.5 }],
  ])("rejects invalid driver input: %s", (_label, driverOverride) => {
    const driver = { ...financialInput().benefitDrivers[0], ...driverOverride };
    expect(() => calculateFinancialCase(financialInput({ benefitDrivers: [driver] }))).toThrow();
  });

  it("rejects negative costs and invalid horizons rather than manufacturing results", () => {
    expect(() => calculateFinancialCase(financialInput({ oneTimeExternalCost: -1 }))).toThrow();
    expect(() => calculateFinancialCase(financialInput({ monthlyOperatingCost: -1 }))).toThrow();
    expect(() => calculateFinancialCase(financialInput({ personDayRate: -1 }))).toThrow();
    expect(() => calculateFinancialCase(financialInput({ horizonMonths: 0 }))).toThrow();
    expect(() => calculateFinancialCase(financialInput({ horizonMonths: 61 }))).toThrow();
  });
});

describe("scenario cases and comparison", () => {
  it("keeps identical assumptions identical across conservative, base, and optimistic cases", () => {
    const cases = [
      caseInput({ id: "conservative", name: "محتاطانه" }),
      caseInput({ id: "base", name: "پایه" }),
      caseInput({ id: "optimistic", name: "خوش‌بینانه" }),
    ];
    const results = calculateScenarioCases(scenarioCasesInput(cases));

    expect(results.map((result) => result.financial.totalExpectedContribution)).toEqual([110, 110, 110]);
    expect(results.map((result) => result.financial.netValue)).toEqual([
      results[0].financial.netValue,
      results[0].financial.netValue,
      results[0].financial.netValue,
    ]);
    expect(results.map((result) => result.technical.metrics.personDays)).toEqual([
      results[0].technical.metrics.personDays,
      results[0].technical.metrics.personDays,
      results[0].technical.metrics.personDays,
    ]);
    expect(results.map((result, index) => result.inputs === cases[index])).toEqual([true, true, true]);
    expect(compareScenarioCases(results).differingInputs).toEqual([]);
  });

  it("compares assumptions rather than evidence provenance", () => {
    const approvedEvidence: ScenarioEvidence = {
      kind: "approved",
      label: "مصوب",
      source: "صورت‌جلسه",
      owner: "مدیر محصول",
      recordedAt: "2026-09-12",
      confidence: "high",
    };
    const driver = financialInput().benefitDrivers[0];
    const results = calculateScenarioCases(scenarioCasesInput([
      caseInput({
        id: "base",
        fieldEvidence: [{ field: "phaseShares", evidence: modelEvidence }],
        effortOverrides: [{ domainId: "wallet", personDays: 10, source: modelEvidence }],
        benefitDrivers: [{ ...driver, source: modelEvidence }],
      }),
      caseInput({
        id: "optimistic",
        fieldEvidence: [{ field: "phaseShares", evidence: approvedEvidence }],
        effortOverrides: [{ domainId: "wallet", personDays: 10, source: approvedEvidence }],
        benefitDrivers: [{ ...driver, source: approvedEvidence }],
      }),
    ]));

    expect(compareScenarioCases(results).differingInputs).toEqual([]);
  });

  it("uses selected teams for calendar capacity and each case's own effort and financial inputs", () => {
    const input = scenarioCasesInput([
      caseInput({ id: "base", effortAdjustmentPercent: 0 }),
      caseInput({ id: "optimistic", effortAdjustmentPercent: -20, personDayRate: 12, monthlyOperatingCost: 0 }),
    ], { teamIds: ["product", "engineering"] });
    const results = calculateScenarioCases(input);
    const standalone = calculateScenarioEstimate(plannerInput({ teamCount: 2 }));

    expect(results[0].technical.metrics.calendarWeeks).toBe(standalone.metrics.calendarWeeks);
    expect(results[0].financial.initialInvestment).toBe(results[0].technical.metrics.personDays * 8 + 20);
    expect(results[1].financial.initialInvestment).toBe(results[1].technical.metrics.personDays * 12 + 20);
    expect(results[0].technical.metrics.personDays).not.toBe(results[1].technical.metrics.personDays);
  });

  it("compares effort, weeks, costs, net value, and ROI while preserving unknown values", () => {
    const results = calculateScenarioCases(scenarioCasesInput([
      caseInput({ id: "base", manualTeamCount: 1, weeklyCapacityPerTeam: 5 }),
      caseInput({ id: "optimistic", manualTeamCount: 2, weeklyCapacityPerTeam: 10, effortAdjustmentPercent: -20, personDayRate: null }),
    ]));
    const comparison = compareScenarioCases(results);

    expect(comparison.metrics.map((metric) => metric.metric)).toEqual([
      "effortPersonDays", "calendarWeeks", "totalCosts", "netValue", "roiPercent",
    ]);
    expect(comparison.metrics.find((metric) => metric.metric === "totalCosts")?.values[1].value).toBeNull();
    expect(comparison.metrics.find((metric) => metric.metric === "roiPercent")?.values[1].value).toBeNull();
    expect(comparison.differingInputs.map(({ field }) => field)).toEqual(expect.arrayContaining([
      "effortAdjustmentPercent", "manualTeamCount", "weeklyCapacityPerTeam", "personDayRate",
    ]));
    expect(comparison.differingInputs.every(({ caseIds }) => caseIds.length === 2)).toBe(true);
  });

  it("uses manual team count only when no team IDs are selected", () => {
    const manual = calculateScenarioCases(scenarioCasesInput([
      caseInput({ manualTeamCount: 1, weeklyCapacityPerTeam: 4 }),
    ]))[0];
    const selected = calculateScenarioCases(scenarioCasesInput([
      caseInput({ manualTeamCount: 1, weeklyCapacityPerTeam: 4 }),
    ], { teamIds: ["a", "b"] }))[0];

    expect(manual.technical.metrics.calendarWeeks).toBe(Math.ceil(manual.technical.metrics.personDays / 4));
    expect(selected.technical.metrics.calendarWeeks).toBe(Math.ceil(selected.technical.metrics.personDays / 8));
  });
});

describe("KPI and priority helpers", () => {
  const kpi = (overrides: Partial<ScenarioKpi> = {}): ScenarioKpi => ({
    id: "activation",
    name: "فعال‌سازی",
    baseline: 10,
    target: 20,
    unit: "%",
    operator: "gte",
    measurementWindow: "ماهانه",
    actual: 20,
    actualAt: "2026-09-12",
    actualSource: "آزمون",
    owner: "محصول",
    guardrail: false,
    source: null,
    ...overrides,
  });

  it("evaluates inclusive KPI operators and leaves missing or non-finite measurements unmeasured", () => {
    expect(evaluateKpi(kpi())).toBe("met");
    expect(evaluateKpi(kpi({ operator: "lte", target: 5, actual: 5 }))).toBe("met");
    expect(evaluateKpi(kpi({ actual: 19.9 }))).toBe("not_met");
    expect(evaluateKpi(kpi({ actual: null }))).toBe("unmeasured");
    expect(evaluateKpi(kpi({ actual: Number.POSITIVE_INFINITY }))).toBe("unmeasured");
    expect(evaluateKpi(kpi({ target: Number.NaN }))).toBe("unmeasured");
  });

  it("calculates weighted priority and treats a larger lower-risk score as better", () => {
    const criteria: PriorityCriterion[] = [
      { id: "value", label: "ارزش", score: 5, direction: "higher-is-better", source: null },
      { id: "safety", label: "ایمنی", score: 2, direction: "risk-lower-is-better", source: null },
    ];
    const weights: PriorityWeight[] = [
      { criterionId: "value", weight: 60, source: null },
      { criterionId: "safety", weight: 40, source: null },
    ];
    expect(scorePriority(criteria, weights).weightedScore).toBe(3.8);
    expect(scorePriority(criteria, [{ ...weights[0], weight: 0 }, { ...weights[1], weight: 100 }]).weightedScore).toBe(2);
  });

  it("does not turn an unscored positive-weight criterion into zero", () => {
    const criteria: PriorityCriterion[] = [
      { id: "value", label: "ارزش", score: 5, direction: "higher-is-better", source: null },
      { id: "risk", label: "ریسک", score: null, direction: "risk-lower-is-better", source: null },
    ];
    const weights: PriorityWeight[] = [
      { criterionId: "value", weight: 60, source: null },
      { criterionId: "risk", weight: 40, source: null },
    ];
    expect(scorePriority(criteria, weights).weightedScore).toBeNull();
    expect(scorePriority(criteria, weights.map((item) => ({ ...item, weight: item.criterionId === "risk" ? 0 : item.weight }))).weightedScore).toBe(5);
  });

  it("validates criterion scores, weights, duplicate IDs, and unknown references", () => {
    const criteria: PriorityCriterion[] = [
      { id: "value", label: "ارزش", score: 5, direction: "higher-is-better", source: null },
    ];
    const weights: PriorityWeight[] = [{ criterionId: "value", weight: 100, source: null }];
    expect(() => scorePriority([{ ...criteria[0], score: 6 }], weights)).toThrow();
    expect(() => scorePriority(criteria, [{ ...weights[0], weight: -1 }])).toThrow();
    expect(() => scorePriority(criteria, [weights[0], weights[0]])).toThrow();
    expect(() => scorePriority(criteria, [{ ...weights[0], criterionId: "missing" }])).toThrow();
  });
});
