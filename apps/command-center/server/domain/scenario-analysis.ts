import { z } from "zod";
import { calculateScenarioCases, compareScenarioCases, evaluateKpi, scorePriority } from "../../lib/scenario-business-case";
import type {
  ScenarioCaseInput,
  ScenarioCasesInput,
  ScenarioEstimate,
  ScenarioEvidence,
  ScenarioGateDecision,
  ScenarioRequest,
  ScenarioSource,
  StrategicScenario,
} from "../../lib/scenario-types";

const confidenceSchema = z.enum(["low", "medium", "high"]).nullable();
const scenarioSourceSchema = z.object({
  document: z.string().trim().min(1).max(200),
  locator: z.string().trim().min(1).max(200),
  label: z.literal("فرضیهٔ سند"),
}).strict() satisfies z.ZodType<ScenarioSource>;

const scenarioEvidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("document-hypothesis"),
    label: z.literal("فرضیهٔ سند"),
    source: scenarioSourceSchema,
    confidence: confidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("internal-data"),
    label: z.literal("دادهٔ داخلی"),
    source: z.string().trim().min(1).max(500),
    recordedAt: z.string().trim().min(1).max(80),
    owner: z.string().trim().min(1).max(120),
    confidence: confidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("owner-estimate"),
    label: z.literal("برآورد مالک"),
    source: z.string().trim().max(500).nullable(),
    owner: z.string().trim().min(1).max(120),
    confidence: confidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("approved"),
    label: z.literal("مصوب"),
    source: z.string().trim().max(500).nullable(),
    owner: z.string().trim().min(1).max(120),
    recordedAt: z.string().trim().min(1).max(80),
    confidence: confidenceSchema,
  }).strict(),
  z.object({
    kind: z.literal("model-default"),
    label: z.literal("فرض اولیهٔ مدل"),
    source: z.string().trim().min(1).max(500),
    confidence: z.null(),
  }).strict(),
]);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "تاریخ باید با قالب YYYY-MM-DD باشد.").refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "تاریخ معتبر نیست.");
const nullableDateSchema = dateSchema.nullable();
const idSchema = z.string().trim().min(1).max(120);
const evidenceField = <T extends string>(fields: readonly [T, ...T[]]) => z.array(z.object({
  field: z.enum(fields),
  evidence: scenarioEvidenceSchema,
}).strict()).max(40).refine((items) => new Set(items.map((item) => item.field)).size === items.length, "نوع شواهد تکراری است.");

const caseEvidenceFields = [
  "effortAdjustmentPercent", "riskReservePercent", "teamCount", "weeklyCapacityPerTeam",
  "phaseShares", "personDayRate", "oneTimeExternalCost", "monthlyOperatingCost",
] as const;
const requestEvidenceFields = [
  "catalogScenarioId", "domainIds", "impactDepth", "currency", "horizonMonths", "teamIds",
  "kpis", "milestones", "guardrails", "risks", "priorityCriteria", "priorityWeights",
] as const;

const phaseSharesSchema = z.object({
  product: z.number().finite().min(0).max(1),
  design: z.number().finite().min(0).max(1),
  development: z.number().finite().min(0).max(1),
  delivery: z.number().finite().min(0).max(1),
}).strict().superRefine((shares, context) => {
  const total = shares.product + shares.design + shares.development + shares.delivery;
  if (Math.abs(total - 1) > 1e-8) context.addIssue({ code: "custom", message: "مجموع سهم چهار فاز باید دقیقاً ۱۰۰٪ باشد." });
});

const benefitDriverSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  monthlyUnits: z.number().finite().min(0).nullable(),
  netContributionPerUnit: z.number().finite().nullable(),
  startMonth: z.number().int().min(1).nullable(),
  probabilityPercent: z.number().finite().min(0).max(100).nullable(),
  source: scenarioEvidenceSchema.nullable(),
}).strict();

const conversionCommon = {
  originalCurrency: z.string().trim().min(1).max(16),
  originalAmount: z.number().finite(),
  convertedAmount: z.number().finite(),
  rate: z.number().finite().positive(),
  rateDate: dateSchema,
  source: z.string().trim().min(1).max(500),
};
const moneyConversionSchema = z.discriminatedUnion("field", [
  z.object({ field: z.literal("personDayRate"), ...conversionCommon }).strict(),
  z.object({ field: z.literal("oneTimeExternalCost"), ...conversionCommon }).strict(),
  z.object({ field: z.literal("monthlyOperatingCost"), ...conversionCommon }).strict(),
  z.object({ field: z.literal("benefitNetContribution"), benefitDriverId: idSchema, ...conversionCommon }).strict(),
]);

const effortOverrideSchema = z.object({
  domainId: idSchema,
  personDays: z.number().finite().min(0),
  source: scenarioEvidenceSchema,
}).strict();

const scenarioCaseSchema = z.object({
  id: z.enum(["conservative", "base", "optimistic"]),
  name: z.string().trim().min(1).max(160),
  effortAdjustmentPercent: z.number().finite().min(-100).max(500),
  riskReservePercent: z.number().finite().min(0).max(100),
  manualTeamCount: z.number().int().min(1).max(20).nullable(),
  weeklyCapacityPerTeam: z.number().finite().min(1).max(40).nullable(),
  phaseShares: phaseSharesSchema,
  effortOverrides: z.array(effortOverrideSchema).max(28),
  fieldEvidence: evidenceField(caseEvidenceFields),
  personDayRate: z.number().finite().min(0).nullable(),
  oneTimeExternalCost: z.number().finite().min(0).nullable(),
  monthlyOperatingCost: z.number().finite().min(0).nullable(),
  benefitDrivers: z.array(benefitDriverSchema).max(40),
  moneyConversions: z.array(moneyConversionSchema).max(80),
}).strict().superRefine((scenarioCase, context) => {
  const overrideIds = scenarioCase.effortOverrides.map((item) => item.domainId);
  if (new Set(overrideIds).size !== overrideIds.length) {
    context.addIssue({ code: "custom", path: ["effortOverrides"], message: "دامنهٔ بازنویسی effort تکراری است." });
  }
  const driverIds = scenarioCase.benefitDrivers.map((item) => item.id);
  if (new Set(driverIds).size !== driverIds.length) {
    context.addIssue({ code: "custom", path: ["benefitDrivers"], message: "شناسهٔ محرک منفعت تکراری است." });
  }

  const evidenceFields = new Set(scenarioCase.fieldEvidence.map((item) => item.field));
  for (const field of caseEvidenceFields) {
    if (!evidenceFields.has(field)) context.addIssue({ code: "custom", path: ["fieldEvidence"], message: `منشأ فرض ${field} ثبت نشده است.` });
  }

  const conversionKeys = new Set<string>();
  for (const [index, conversion] of scenarioCase.moneyConversions.entries()) {
    const key = conversion.field === "benefitNetContribution"
      ? `${conversion.field}:${conversion.benefitDriverId}`
      : conversion.field;
    if (conversionKeys.has(key)) {
      context.addIssue({ code: "custom", path: ["moneyConversions", index], message: "تبدیل تکراری برای یک فیلد ثبت شده است." });
    }
    conversionKeys.add(key);

    if (conversion.field === "benefitNetContribution") {
      const driver = scenarioCase.benefitDrivers.find((item) => item.id === conversion.benefitDriverId);
      if (!driver || driver.netContributionPerUnit !== conversion.convertedAmount) {
        context.addIssue({ code: "custom", path: ["moneyConversions", index, "convertedAmount"], message: "مبلغ تبدیل‌شده با حاشیهٔ محرک منفعت متناظر برابر نیست." });
      }
    } else {
      if (conversion.originalAmount < 0 || conversion.convertedAmount < 0) {
        context.addIssue({ code: "custom", path: ["moneyConversions", index], message: "مبلغ تبدیل‌شدهٔ هزینه نمی‌تواند منفی باشد." });
      }
      const target = scenarioCase[conversion.field];
      if (target !== conversion.convertedAmount) {
        context.addIssue({ code: "custom", path: ["moneyConversions", index, "convertedAmount"], message: "مبلغ تبدیل‌شده با مقدار فیلد درخواست برابر نیست." });
      }
    }
  }
});

const kpiSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(160),
  baseline: z.number().finite().nullable(),
  target: z.number().finite().nullable(),
  unit: z.string().trim().min(1).max(80),
  operator: z.enum(["gte", "lte"]),
  measurementWindow: z.string().trim().min(1).max(160),
  actual: z.number().finite().nullable(),
  actualAt: nullableDateSchema,
  actualSource: z.string().trim().min(1).max(500).nullable(),
  owner: z.string().trim().min(1).max(120),
  guardrail: z.boolean(),
  source: scenarioEvidenceSchema.nullable(),
}).strict().superRefine((kpi, context) => {
  if (kpi.actual === null && (kpi.actualAt !== null || kpi.actualSource !== null)) {
    context.addIssue({ code: "custom", path: ["actualAt"], message: "زمان و منبع فقط همراه مقدار واقعی ثبت می‌شوند." });
  }
  if (kpi.actual !== null && (kpi.actualAt === null || kpi.actualSource === null)) {
    context.addIssue({ code: "custom", path: ["actualSource"], message: "مقدار واقعی باید زمان و منبع اندازه‌گیری داشته باشد." });
  }
});

const milestoneSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(200),
  stage: z.string().trim().min(1).max(120),
  owner: z.string().trim().min(1).max(120),
  targetDay: z.number().int().min(0).nullable(),
  targetDate: nullableDateSchema,
  entryCriteria: z.string().trim().max(2_000),
  exitCriteria: z.string().trim().max(2_000),
  reviewDate: nullableDateSchema,
}).strict();

const gateDecisionSchema = z.object({
  decision: z.enum(["continue", "pause", "stop"]).nullable(),
  reason: z.string().trim().max(2_000),
  evidence: z.string().trim().max(4_000),
  owner: z.string().trim().max(120),
  reviewDate: nullableDateSchema,
}).strict().superRefine((decision, context) => {
  if (decision.decision !== null && (!decision.reason || !decision.evidence || !decision.owner)) {
    context.addIssue({ code: "custom", path: ["reason"], message: "تصمیم ثبت‌شده باید دلیل، شواهد و مالک داشته باشد." });
  }
});

const priorityCriterionSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(160),
  score: z.number().finite().min(1).max(5).nullable(),
  direction: z.enum(["higher-is-better", "risk-lower-is-better"]),
  source: scenarioEvidenceSchema.nullable(),
}).strict();
const priorityWeightSchema = z.object({
  criterionId: idSchema,
  weight: z.number().finite().min(0).max(100),
  source: scenarioEvidenceSchema.nullable(),
}).strict();

const scenarioRequestSchema = z.object({
  catalogScenarioId: idSchema.optional(),
  title: z.string().trim().min(1, "عنوان سناریو الزامی است.").max(120),
  description: z.string().trim().max(4_000).optional(),
  domainIds: z.array(idSchema).min(1).max(28).refine((ids) => new Set(ids).size === ids.length, "دامنهٔ تکراری است."),
  projectIds: z.array(idSchema).max(20).refine((ids) => new Set(ids).size === ids.length, "پروژهٔ تکراری است.").optional(),
  teamIds: z.array(idSchema).max(20).refine((ids) => new Set(ids).size === ids.length, "تیم تکراری است.").optional(),
  impactDepth: z.enum(["selected", "direct", "transitive"]),
  currency: z.enum(["TOMAN", "USD", "IQD"]),
  horizonMonths: z.number().int().min(1).max(60),
  cases: z.array(scenarioCaseSchema).length(3),
  kpis: z.array(kpiSchema).max(80),
  gateDecision: gateDecisionSchema,
  milestones: z.array(milestoneSchema).max(80),
  guardrails: z.array(z.string().trim().min(1).max(500)).max(100),
  risks: z.array(z.string().trim().min(1).max(500)).max(100),
  priorityCriteria: z.array(priorityCriterionSchema).max(80),
  priorityWeights: z.array(priorityWeightSchema).max(80),
  fieldEvidence: evidenceField(requestEvidenceFields),
}).strict().superRefine((request, context) => {
  const caseIds = request.cases.map((item) => item.id);
  if (new Set(caseIds).size !== caseIds.length || !["conservative", "base", "optimistic"].every((id) => caseIds.includes(id as typeof caseIds[number]))) {
    context.addIssue({ code: "custom", path: ["cases"], message: "سه حالت محتاطانه، پایه و خوش‌بینانه باید دقیقاً یک‌بار وجود داشته باشند." });
  }

  const requiredRequestFields = requestEvidenceFields.filter((field) => field !== "catalogScenarioId");
  const evidenceFields = new Set(request.fieldEvidence.map((item) => item.field));
  for (const field of requiredRequestFields) {
    if (!evidenceFields.has(field)) context.addIssue({ code: "custom", path: ["fieldEvidence"], message: `منشأ فرض ${field} ثبت نشده است.` });
  }
  if (Boolean(request.catalogScenarioId) !== evidenceFields.has("catalogScenarioId")) {
    context.addIssue({ code: "custom", path: ["fieldEvidence"], message: "منشأ شناسهٔ کاتالوگ باید با وجود همان شناسه سازگار باشد." });
  }

  request.cases.forEach((scenarioCase, caseIndex) => {
    scenarioCase.benefitDrivers.forEach((driver, driverIndex) => {
      if (driver.startMonth !== null && driver.startMonth > request.horizonMonths) {
        context.addIssue({ code: "custom", path: ["cases", caseIndex, "benefitDrivers", driverIndex, "startMonth"], message: "ماه شروع محرک باید داخل افق سناریو باشد." });
      }
    });
  });

  const kpiIds = request.kpis.map((item) => item.id);
  if (new Set(kpiIds).size !== kpiIds.length) context.addIssue({ code: "custom", path: ["kpis"], message: "شناسهٔ KPI تکراری است." });
  const milestoneIds = request.milestones.map((item) => item.id);
  if (new Set(milestoneIds).size !== milestoneIds.length) context.addIssue({ code: "custom", path: ["milestones"], message: "شناسهٔ milestone تکراری است." });
  const criterionIds = request.priorityCriteria.map((item) => item.id);
  if (new Set(criterionIds).size !== criterionIds.length) context.addIssue({ code: "custom", path: ["priorityCriteria"], message: "شناسهٔ معیار تکراری است." });
  const weightIds = request.priorityWeights.map((item) => item.criterionId);
  if (new Set(weightIds).size !== weightIds.length) context.addIssue({ code: "custom", path: ["priorityWeights"], message: "وزن معیار تکراری است." });
  if (weightIds.some((id) => !criterionIds.includes(id))) context.addIssue({ code: "custom", path: ["priorityWeights"], message: "وزن به معیار موجودی ارجاع نمی‌دهد." });
});

const decisionRequestSchema = z.object({
  decision: z.enum(["continue", "pause", "stop"]),
  reason: z.string().trim().min(1).max(2_000),
  evidence: z.string().trim().min(1).max(4_000),
  owner: z.string().trim().min(1).max(120),
  reviewDate: nullableDateSchema,
}).strict();

export function parseScenarioRequest(input: unknown): ScenarioRequest {
  return scenarioRequestSchema.parse(input) as ScenarioRequest;
}

export function parseScenarioDecision(input: unknown): ScenarioGateDecision {
  return decisionRequestSchema.parse(input);
}

export function buildScenarioEstimate(input: ScenarioRequest, catalogSnapshot: StrategicScenario | null): ScenarioEstimate {
  const sharedEvidenceFields = new Set(["impactDepth", "horizonMonths", "currency", "teamIds"]);
  const casesInput: ScenarioCasesInput = {
    title: input.title,
    description: input.description,
    domainIds: input.domainIds,
    impactDepth: input.impactDepth,
    teamIds: input.teamIds ?? [],
    horizonMonths: input.horizonMonths,
    currency: input.currency,
    cases: input.cases as ScenarioCaseInput[],
    fieldEvidence: input.fieldEvidence
      .filter((item) => sharedEvidenceFields.has(item.field))
      .map((item) => ({ field: item.field as "impactDepth" | "horizonMonths" | "currency" | "teamIds", evidence: item.evidence })),
  };
  const cases = calculateScenarioCases(casesInput);
  const priority = input.priorityCriteria.length > 0 || input.priorityWeights.length > 0
    ? scorePriority(input.priorityCriteria, input.priorityWeights)
    : null;
  const evidenceEntries: Array<{ field: string; evidence: ScenarioEvidence | null }> = [
    ...input.fieldEvidence.map((item) => ({ field: item.field, evidence: item.evidence })),
    ...input.cases.flatMap((scenarioCase) => [
      ...scenarioCase.fieldEvidence.map((item) => ({ field: `cases.${scenarioCase.id}.${item.field}`, evidence: item.evidence })),
      ...scenarioCase.effortOverrides.map((item) => ({ field: `cases.${scenarioCase.id}.effortOverrides.${item.domainId}`, evidence: item.source })),
      ...scenarioCase.benefitDrivers.map((item) => ({ field: `cases.${scenarioCase.id}.benefitDrivers.${item.id}`, evidence: item.source })),
    ]),
    ...input.kpis.map((item) => ({ field: `kpis.${item.id}`, evidence: item.source })),
    ...input.priorityCriteria.map((item) => ({ field: `priorityCriteria.${item.id}`, evidence: item.source })),
    ...input.priorityWeights.map((item) => ({ field: `priorityWeights.${item.criterionId}`, evidence: item.source })),
  ];
  const missingFields = evidenceEntries.filter((item) => item.evidence === null).map((item) => item.field);
  return {
    modelVersion: "scenario-business-case/v1",
    title: input.title,
    description: input.description ?? "",
    catalogSnapshot,
    cases,
    comparison: compareScenarioCases(cases),
    kpiEvaluations: input.kpis.map((kpi) => ({ kpi, status: evaluateKpi(kpi) })),
    gateDecision: input.gateDecision,
    priority,
    evidenceCompleteness: { recorded: evidenceEntries.length - missingFields.length, missing: missingFields.length, missingFields },
    warnings: [...new Set(cases.flatMap((item) => item.technical.warnings))],
    limitations: [...new Set(cases.flatMap((item) => item.financial.limitations))],
  };
}

export function canViewScenarioAnalysis(actor: { role: string; userId: string }, creatorId: string) {
  return actor.role === "CEO" || actor.userId === creatorId;
}
