import { calculateScenarioEstimate } from "./scenario-planner";
import type {
  FinancialCaseInput,
  FinancialCaseResult,
  PriorityCriterion,
  PriorityScore,
  PriorityWeight,
  ScenarioCaseInput,
  ScenarioCaseResult,
  ScenarioCasesInput,
  ScenarioComparison,
  ScenarioEvidence,
  ScenarioKpi,
  ScenarioPlannerInput,
} from "./scenario-types";

const financialLimitations = [
  "مالیات در محاسبه لحاظ نشده است.",
  "تورم و تغییر ارزش پول در طول زمان مدل نشده است.",
  "تنزیل جریان نقدی و ارزش زمانی پول (DCF) اعمال نشده است.",
  "افزایش تدریجی استفاده یا درآمد پس از راه‌اندازی (رَمپ‌آپ) مدل نشده است.",
  "دورهٔ بازگشت از فرمول سادهٔ سرمایه‌گذاری اولیه تقسیم بر جریان نقدی ماهانهٔ خالص مثبت به دست می‌آید و زمان شروع درآمد در آن لحاظ نمی‌شود.",
];

function assertFinite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} خارج از محدودهٔ محاسبه است.`);
  return value;
}

function validateOptionalNumber(value: number | null, label: string, minimum: number): void {
  if (value !== null && (!Number.isFinite(value) || value < minimum)) {
    throw new Error(`${label} باید ${minimum === 0 ? "صفر یا بیشتر" : `حداقل ${minimum}`} و عددی معتبر باشد.`);
  }
}

function validateFinancialInput(input: FinancialCaseInput): string[] {
  if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 60) {
    throw new Error("افق محاسبه باید عدد صحیحی بین ۱ تا ۶۰ ماه باشد.");
  }
  if (!["TOMAN", "USD", "IQD"].includes(input.currency)) throw new Error("واحد پول پرونده معتبر نیست.");
  validateOptionalNumber(input.plannedPersonDays, "نفر-روز برنامه‌ریزی‌شده", 0);
  validateOptionalNumber(input.personDayRate, "هزینهٔ هر نفر-روز", 0);
  validateOptionalNumber(input.oneTimeExternalCost, "هزینهٔ بیرونی یک‌باره", 0);
  validateOptionalNumber(input.monthlyOperatingCost, "هزینهٔ جاری ماهانه", 0);

  if (!Array.isArray(input.benefitDrivers)) throw new Error("فهرست محرک‌های منفعت معتبر نیست.");
  const driverIds = new Set<string>();
  for (const driver of input.benefitDrivers) {
    if (!driver.id.trim() || !driver.name.trim()) throw new Error("شناسه و نام هر محرک منفعت الزامی است.");
    if (driverIds.has(driver.id)) throw new Error(`شناسهٔ محرک منفعت تکراری است: ${driver.id}`);
    driverIds.add(driver.id);
    validateOptionalNumber(driver.monthlyUnits, `واحد ماهانهٔ ${driver.id}`, 0);
    if (driver.netContributionPerUnit !== null && !Number.isFinite(driver.netContributionPerUnit)) {
      throw new Error(`حاشیهٔ مشارکت هر واحد برای ${driver.id} باید عددی معتبر باشد.`);
    }
    if (driver.probabilityPercent !== null && (!Number.isFinite(driver.probabilityPercent) || driver.probabilityPercent < 0 || driver.probabilityPercent > 100)) {
      throw new Error(`احتمال محرک ${driver.id} باید بین صفر تا ۱۰۰ درصد باشد.`);
    }
    if (driver.startMonth !== null && (!Number.isInteger(driver.startMonth) || driver.startMonth < 1 || driver.startMonth > input.horizonMonths)) {
      throw new Error(`ماه شروع محرک ${driver.id} باید عدد صحیحی در افق محاسبه باشد.`);
    }
  }
  return [...driverIds];
}

function missingDriverInputs(drivers: FinancialCaseInput["benefitDrivers"]): string[] {
  const missing: string[] = [];
  if (drivers.length === 0) return ["benefitDrivers"];
  for (const driver of drivers) {
    if (driver.monthlyUnits === null) missing.push(`benefitDrivers.${driver.id}.monthlyUnits`);
    if (driver.netContributionPerUnit === null) missing.push(`benefitDrivers.${driver.id}.netContributionPerUnit`);
    if (driver.startMonth === null) missing.push(`benefitDrivers.${driver.id}.startMonth`);
    if (driver.probabilityPercent === null) missing.push(`benefitDrivers.${driver.id}.probabilityPercent`);
  }
  return missing;
}

export function calculateFinancialCase(input: FinancialCaseInput): FinancialCaseResult {
  validateFinancialInput(input);

  const missingInputs: string[] = [];
  if (input.plannedPersonDays === null) missingInputs.push("plannedPersonDays");
  if (input.personDayRate === null) missingInputs.push("personDayRate");
  if (input.oneTimeExternalCost === null) missingInputs.push("oneTimeExternalCost");
  if (input.monthlyOperatingCost === null) missingInputs.push("monthlyOperatingCost");
  missingInputs.push(...missingDriverInputs(input.benefitDrivers));

  const initialInvestment = input.plannedPersonDays !== null
    && input.personDayRate !== null
    && input.oneTimeExternalCost !== null
    ? assertFinite(
      assertFinite(input.plannedPersonDays * input.personDayRate, "هزینهٔ داخلی") + input.oneTimeExternalCost,
      "سرمایه‌گذاری اولیه",
    )
    : null;

  const hasCompleteDrivers = input.benefitDrivers.length > 0
    && input.benefitDrivers.every((driver) => driver.monthlyUnits !== null
      && driver.netContributionPerUnit !== null
      && driver.startMonth !== null
      && driver.probabilityPercent !== null);
  let monthlyExpectedContribution: number | null = null;
  let totalExpectedContribution: number | null = null;
  if (hasCompleteDrivers) {
    let monthly = 0;
    let total = 0;
    for (const driver of input.benefitDrivers) {
      const driverMonthly = assertFinite(
        driver.monthlyUnits! * driver.netContributionPerUnit! * driver.probabilityPercent! / 100,
        `منفعت ماهانهٔ ${driver.id}`,
      );
      const activeMonths = input.horizonMonths - driver.startMonth! + 1;
      monthly = assertFinite(monthly + driverMonthly, "جمع منفعت ماهانه");
      total = assertFinite(total + assertFinite(driverMonthly * activeMonths, `منفعت افق ${driver.id}`), "جمع منفعت افق");
    }
    monthlyExpectedContribution = monthly;
    totalExpectedContribution = total;
  }

  const totalCosts = initialInvestment !== null && input.monthlyOperatingCost !== null
    ? assertFinite(initialInvestment + assertFinite(input.monthlyOperatingCost * input.horizonMonths, "هزینهٔ جاری افق"), "هزینهٔ کل")
    : null;
  const netValue = totalExpectedContribution !== null && totalCosts !== null
    ? assertFinite(totalExpectedContribution - totalCosts, "ارزش خالص")
    : null;
  const roiPercent = netValue !== null && totalCosts !== null && totalCosts > 0
    ? assertFinite(netValue / totalCosts * 100, "درصد بازگشت سرمایه")
    : null;
  const netMonthlyContribution = monthlyExpectedContribution !== null && input.monthlyOperatingCost !== null
    ? assertFinite(monthlyExpectedContribution - input.monthlyOperatingCost, "جریان نقدی ماهانهٔ خالص")
    : null;
  const paybackMonths = initialInvestment !== null && netMonthlyContribution !== null && netMonthlyContribution > 0
    ? assertFinite(initialInvestment / netMonthlyContribution, "دورهٔ بازگشت سرمایه")
    : null;

  return {
    currency: input.currency,
    initialInvestment,
    monthlyOperatingCost: input.monthlyOperatingCost,
    totalExpectedContribution,
    totalCosts,
    netValue,
    roiPercent,
    paybackMonths,
    missingInputs,
    limitations: [...financialLimitations],
  };
}

function phaseEvidenceFor(input: ScenarioCaseInput): ScenarioEvidence {
  return input.fieldEvidence.find((item) => item.field === "phaseShares")?.evidence ?? {
    kind: "model-default",
    label: "فرض اولیهٔ مدل",
    source: "توزیع اولیهٔ چهار فاز در برنامه‌ریز سناریو",
    confidence: null,
  };
}

export function calculateScenarioCases(input: ScenarioCasesInput): ScenarioCaseResult[] {
  if (!Number.isInteger(input.horizonMonths) || input.horizonMonths < 1 || input.horizonMonths > 60) {
    throw new Error("افق محاسبه باید عدد صحیحی بین ۱ تا ۶۰ ماه باشد.");
  }
  if (!Array.isArray(input.teamIds) || input.teamIds.some((id) => !id.trim()) || new Set(input.teamIds).size !== input.teamIds.length) {
    throw new Error("تیم‌های انتخاب‌شده باید شناسهٔ معتبر و یکتا داشته باشند.");
  }
  if (!Array.isArray(input.cases)) throw new Error("حالت‌های سناریو معتبر نیستند.");
  const caseIds = new Set<string>();

  return input.cases.map((scenarioCase) => {
    if (!scenarioCase.id.trim() || !scenarioCase.name.trim()) throw new Error("شناسه و نام هر حالت سناریو الزامی است.");
    if (caseIds.has(scenarioCase.id)) throw new Error(`شناسهٔ حالت سناریو تکراری است: ${scenarioCase.id}`);
    caseIds.add(scenarioCase.id);

    const plannerInput: ScenarioPlannerInput = {
      title: input.title,
      ...(input.description === undefined ? {} : { description: input.description }),
      domainIds: input.domainIds,
      impactDepth: input.impactDepth,
      teamCount: input.teamIds.length > 0 ? input.teamIds.length : scenarioCase.manualTeamCount,
      weeklyCapacityPerTeam: scenarioCase.weeklyCapacityPerTeam,
      effortAdjustmentPercent: scenarioCase.effortAdjustmentPercent,
      riskReservePercent: scenarioCase.riskReservePercent,
      phaseShares: scenarioCase.phaseShares,
      effortOverrides: scenarioCase.effortOverrides,
      phaseEvidence: phaseEvidenceFor(scenarioCase),
    };
    const technical = calculateScenarioEstimate(plannerInput);
    const financial = calculateFinancialCase({
      plannedPersonDays: technical.metrics.personDays,
      personDayRate: scenarioCase.personDayRate,
      oneTimeExternalCost: scenarioCase.oneTimeExternalCost,
      monthlyOperatingCost: scenarioCase.monthlyOperatingCost,
      horizonMonths: input.horizonMonths,
      currency: input.currency,
      benefitDrivers: scenarioCase.benefitDrivers,
    });
    return { caseId: scenarioCase.id, name: scenarioCase.name, inputs: scenarioCase, technical, financial };
  });
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const comparedInputFields: Array<keyof ScenarioCaseInput> = [
  "effortAdjustmentPercent",
  "riskReservePercent",
  "manualTeamCount",
  "weeklyCapacityPerTeam",
  "phaseShares",
  "effortOverrides",
  "personDayRate",
  "oneTimeExternalCost",
  "monthlyOperatingCost",
  "benefitDrivers",
  "moneyConversions",
];

function assumptionValue(inputs: ScenarioCaseInput, field: keyof ScenarioCaseInput): unknown {
  if (field === "effortOverrides") {
    return inputs.effortOverrides
      .map(({ domainId, personDays }) => ({ domainId, personDays }))
      .sort((left, right) => left.domainId.localeCompare(right.domainId));
  }
  if (field === "benefitDrivers") {
    return inputs.benefitDrivers
      .map(({ id, name, monthlyUnits, netContributionPerUnit, startMonth, probabilityPercent }) => ({
        id, name, monthlyUnits, netContributionPerUnit, startMonth, probabilityPercent,
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  }
  return inputs[field];
}

export function compareScenarioCases(cases: ScenarioCaseResult[]): ScenarioComparison {
  const caseIds = new Set<string>();
  for (const item of cases) {
    if (caseIds.has(item.caseId)) throw new Error(`شناسهٔ حالت سناریو تکراری است: ${item.caseId}`);
    caseIds.add(item.caseId);
  }

  const metrics: ScenarioComparison["metrics"] = [
    { metric: "effortPersonDays", values: cases.map((item) => ({ caseId: item.caseId, value: item.technical.metrics.personDays })) },
    { metric: "calendarWeeks", values: cases.map((item) => ({ caseId: item.caseId, value: item.technical.metrics.calendarWeeks })) },
    { metric: "totalCosts", values: cases.map((item) => ({ caseId: item.caseId, value: item.financial.totalCosts })) },
    { metric: "netValue", values: cases.map((item) => ({ caseId: item.caseId, value: item.financial.netValue })) },
    { metric: "roiPercent", values: cases.map((item) => ({ caseId: item.caseId, value: item.financial.roiPercent })) },
  ];
  const differingInputs = comparedInputFields.flatMap((field) => {
    const values = cases.map((item) => stableSerialize(assumptionValue(item.inputs, field)));
    return values.some((value) => value !== values[0])
      ? [{ field, caseIds: cases.map((item) => item.caseId) }]
      : [];
  });
  return { metrics, differingInputs };
}

export function evaluateKpi(kpi: ScenarioKpi): "unmeasured" | "met" | "not_met" {
  if (!Number.isFinite(kpi.actual) || !Number.isFinite(kpi.target)) return "unmeasured";
  if (kpi.operator === "gte") return kpi.actual! >= kpi.target! ? "met" : "not_met";
  if (kpi.operator === "lte") return kpi.actual! <= kpi.target! ? "met" : "not_met";
  return "unmeasured";
}

export function scorePriority(criteria: PriorityCriterion[], weights: PriorityWeight[]): PriorityScore {
  const criteriaById = new Map<string, PriorityCriterion>();
  for (const criterion of criteria) {
    if (!criterion.id.trim() || criteriaById.has(criterion.id)) throw new Error(`شناسهٔ معیار اولویت خالی یا تکراری است: ${criterion.id}`);
    if (criterion.score !== null && (!Number.isFinite(criterion.score) || criterion.score < 1 || criterion.score > 5)) {
      throw new Error(`امتیاز معیار ${criterion.id} باید بین ۱ تا ۵ باشد.`);
    }
    if (criterion.direction !== "higher-is-better" && criterion.direction !== "risk-lower-is-better") {
      throw new Error(`جهت معیار ${criterion.id} معتبر نیست.`);
    }
    criteriaById.set(criterion.id, criterion);
  }

  const seenWeights = new Set<string>();
  for (const item of weights) {
    if (!Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100) {
      throw new Error(`وزن معیار ${item.criterionId} باید بین صفر تا ۱۰۰ باشد.`);
    }
    if (seenWeights.has(item.criterionId)) throw new Error(`وزن معیار تکراری است: ${item.criterionId}`);
    if (!criteriaById.has(item.criterionId)) throw new Error(`معیار وزن‌دهی‌شده وجود ندارد: ${item.criterionId}`);
    seenWeights.add(item.criterionId);
  }

  const applicableWeights = weights.filter((item) => item.weight > 0);
  const totalWeight = applicableWeights.reduce((sum, item) => assertFinite(sum + item.weight, "مجموع وزن معیارها"), 0);
  const missingWeightedScore = applicableWeights.some((item) => criteriaById.get(item.criterionId)?.score === null);
  const weightedScore = totalWeight === 0 || missingWeightedScore
    ? null
    : assertFinite(
      applicableWeights.reduce((sum, item) => sum + (criteriaById.get(item.criterionId)!.score! * item.weight), 0) / totalWeight,
      "امتیاز اولویت",
    );

  return { weightedScore, criteria, weights };
}
