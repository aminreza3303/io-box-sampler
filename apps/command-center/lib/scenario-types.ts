import type { DomainGroupId, DomainRelationship } from "./domain-map";
import type { ProcessDefinition } from "./workspaces";

export type ScenarioTrack = "wallet" | "travel";

export type ScenarioSource = {
  document: string;
  locator: string;
  label: "فرضیهٔ سند";
};

export type ScenarioEvidence =
  | { kind: "document-hypothesis"; label: "فرضیهٔ سند"; source: ScenarioSource; confidence: "low" | "medium" | "high" | null }
  | { kind: "internal-data"; label: "دادهٔ داخلی"; source: string; recordedAt: string; owner: string; confidence: "low" | "medium" | "high" | null }
  | { kind: "owner-estimate"; label: "برآورد مالک"; source: string | null; owner: string; confidence: "low" | "medium" | "high" | null }
  | { kind: "approved"; label: "مصوب"; source: string | null; owner: string; recordedAt: string; confidence: "low" | "medium" | "high" | null }
  | { kind: "model-default"; label: "فرض اولیهٔ مدل"; source: string; confidence: null };

export type ScenarioKpi = {
  id: string;
  name: string;
  baseline: number | null;
  target: number | null;
  unit: string;
  operator: "gte" | "lte";
  measurementWindow: string;
  actual: number | null;
  actualAt: string | null;
  actualSource: string | null;
  owner: string;
  guardrail: boolean;
  source: ScenarioEvidence | null;
};

export type ScenarioBenefitDriver = {
  id: string;
  name: string;
  monthlyUnits: number | null;
  netContributionPerUnit: number | null;
  startMonth: number | null;
  probabilityPercent: number | null;
  source: ScenarioEvidence | null;
};

type ScenarioMoneyConversionCommon = {
  originalCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  rateDate: string;
  source: string;
};

export type ScenarioMoneyConversion =
  | (ScenarioMoneyConversionCommon & {
    field: "personDayRate" | "oneTimeExternalCost" | "monthlyOperatingCost";
  })
  | (ScenarioMoneyConversionCommon & {
    field: "benefitNetContribution";
    benefitDriverId: string;
  });

export type ScenarioCaseInput = {
  id: "conservative" | "base" | "optimistic" | string;
  name: string;
  effortAdjustmentPercent: number;
  riskReservePercent: number;
  manualTeamCount: number | null;
  weeklyCapacityPerTeam: number | null;
  phaseShares: ScenarioPhaseShares;
  effortOverrides: Array<{ domainId: string; personDays: number; source: ScenarioEvidence }>;
  fieldEvidence: Array<{
    field: "effortAdjustmentPercent" | "riskReservePercent" | "teamCount" | "weeklyCapacityPerTeam" | "phaseShares" | "personDayRate" | "oneTimeExternalCost" | "monthlyOperatingCost";
    evidence: ScenarioEvidence;
  }>;
  personDayRate: number | null;
  oneTimeExternalCost: number | null;
  monthlyOperatingCost: number | null;
  benefitDrivers: ScenarioBenefitDriver[];
  moneyConversions: ScenarioMoneyConversion[];
};

export type ScenarioPhaseShares = {
  product: number;
  design: number;
  development: number;
  delivery: number;
};

export type ScenarioPlannerInput = {
  title: string;
  description?: string;
  domainIds: string[];
  impactDepth: "selected" | "direct" | "transitive";
  teamCount: number | null;
  weeklyCapacityPerTeam: number | null;
  effortAdjustmentPercent: number;
  riskReservePercent: number;
  phaseShares: ScenarioPhaseShares;
  effortOverrides: Array<{ domainId: string; personDays: number; source: ScenarioEvidence }>;
  phaseEvidence: ScenarioEvidence;
};

export type ScenarioCurrency = "TOMAN" | "USD" | "IQD";

export type FinancialCaseInput = {
  plannedPersonDays: number | null;
  personDayRate: number | null;
  oneTimeExternalCost: number | null;
  monthlyOperatingCost: number | null;
  horizonMonths: number;
  currency: ScenarioCurrency;
  benefitDrivers: ScenarioBenefitDriver[];
};

export type FinancialCaseResult = {
  currency: ScenarioCurrency;
  initialInvestment: number | null;
  monthlyOperatingCost: number | null;
  totalExpectedContribution: number | null;
  totalCosts: number | null;
  netValue: number | null;
  roiPercent: number | null;
  paybackMonths: number | null;
  missingInputs: string[];
  limitations: string[];
};

export type ScenarioCaseResult = {
  caseId: string;
  name: string;
  inputs: ScenarioCaseInput;
  technical: TechnicalEstimate;
  financial: FinancialCaseResult;
};

export type ScenarioCasesInput = {
  title: string;
  description?: string;
  domainIds: string[];
  impactDepth: "selected" | "direct" | "transitive";
  teamIds: string[];
  horizonMonths: number;
  currency: ScenarioCurrency;
  cases: ScenarioCaseInput[];
  fieldEvidence: Array<{ field: "impactDepth" | "horizonMonths" | "currency" | "teamIds"; evidence: ScenarioEvidence }>;
};

export type ScenarioComparison = {
  metrics: Array<{ metric: string; values: Array<{ caseId: string; value: number | null }> }>;
  differingInputs: Array<{ field: string; caseIds: string[] }>;
};

export type PriorityCriterion = {
  id: string;
  label: string;
  score: number | null;
  direction: "higher-is-better" | "risk-lower-is-better";
  source: ScenarioEvidence | null;
};

export type PriorityWeight = {
  criterionId: string;
  weight: number;
  source: ScenarioEvidence | null;
};

export type PriorityScore = {
  weightedScore: number | null;
  criteria: PriorityCriterion[];
  weights: PriorityWeight[];
};

export type ScenarioGateDecision = {
  decision: "continue" | "pause" | "stop" | null;
  reason: string;
  evidence: string;
  owner: string;
  reviewDate: string | null;
};

export type ScenarioMilestone = {
  id: string;
  title: string;
  stage: string;
  owner: string;
  targetDay: number | null;
  targetDate: string | null;
  entryCriteria: string;
  exitCriteria: string;
  reviewDate: string | null;
};

export type TechnicalEstimate = {
  selectedDomainIds: string[];
  impactedDomains: Array<{ id: string; title: string; group: DomainGroupId; priority: string; selected: boolean; status: string; complexityDays: number }>;
  relationships: DomainRelationship[];
  processImpacts: ProcessDefinition[];
  metrics: { basePersonDays: number; adjustedBasePersonDays: number; reservePersonDays: number; personDays: number; calendarWeeks: number | null };
  phases: Array<{ id: "product" | "design" | "development" | "delivery"; title: string; personDays: number; share: number }>;
  changeVolume: { domainCount: number; selectedDomainCount: number; relationshipCount: number; processCount: number; apiSurfaceCount: number; integrationCount: number; dataMigrationCount: number; uiSurfaceCount: number; phaseCount: 4 };
  warnings: string[];
};

export type ScenarioGate = {
  title: string;
  requiredEvidence: string[];
  decision: ScenarioGateDecision;
};

export type StrategicScenario = {
  id: string;
  track: ScenarioTrack;
  lane: "personal-finance" | "experience" | "access";
  title: string;
  summary: string;
  valueHypothesis: string;
  sourceReferences: ScenarioSource[];
  domainIds: string[];
  suggestedOwner: string | null;
  milestones: ScenarioMilestone[];
  benefitDrivers: ScenarioBenefitDriver[];
  kpis: ScenarioKpi[];
  guardrails: string[];
  risks: string[];
  dependencies: string[];
  gate: ScenarioGate;
  priority: { criteria: PriorityCriterion[]; weights: PriorityWeight[]; suggestedOrder: number } | null;
  qualitativePriority: { difficulty: "low" | "medium" | "high"; impact: string; suggestedPhase: 1 | 2 | 3 } | null;
};

export type ScenarioEstimate = {
  modelVersion: "scenario-business-case/v1";
  title: string;
  description: string;
  catalogSnapshot: StrategicScenario | null;
  cases: ScenarioCaseResult[];
  comparison: ScenarioComparison;
  kpiEvaluations: Array<{ kpi: ScenarioKpi; status: "unmeasured" | "met" | "not_met" }>;
  gateDecision: ScenarioGateDecision;
  priority: PriorityScore | null;
  evidenceCompleteness: { recorded: number; missing: number; missingFields: string[] };
  warnings: string[];
  limitations: string[];
};

export type ScenarioRequest = {
  catalogScenarioId?: string;
  title: string;
  description?: string;
  domainIds: string[];
  projectIds?: string[];
  teamIds?: string[];
  impactDepth: "selected" | "direct" | "transitive";
  currency: ScenarioCurrency;
  horizonMonths: number;
  cases: ScenarioCaseInput[];
  kpis: ScenarioKpi[];
  gateDecision: ScenarioGateDecision;
  milestones: ScenarioMilestone[];
  guardrails: string[];
  risks: string[];
  priorityCriteria: PriorityCriterion[];
  priorityWeights: PriorityWeight[];
  fieldEvidence: Array<{
    field: "catalogScenarioId" | "domainIds" | "impactDepth" | "currency" | "horizonMonths" | "teamIds" | "kpis" | "milestones" | "guardrails" | "risks" | "priorityCriteria" | "priorityWeights";
    evidence: ScenarioEvidence;
  }>;
};

export type ScenarioRequestDraft = ScenarioRequest;
