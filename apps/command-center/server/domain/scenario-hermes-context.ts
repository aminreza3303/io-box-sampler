const MAX_CONTEXT_LENGTH = 12_000;

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function boundedString(value: unknown, max = 160): string | null {
  return typeof value === "string" ? value.slice(0, max) : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringList(value: unknown, maxItems = 20): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, maxItems).map((item) => item.slice(0, 120)) : [];
}

function evidence(value: unknown): JsonRecord | null {
  const item = record(value);
  if (!item || typeof item.kind !== "string") return null;
  const allowedKinds = new Set(["document-hypothesis", "internal-data", "owner-estimate", "approved", "model-default"]);
  if (!allowedKinds.has(item.kind)) return null;
  const result: JsonRecord = {
    kind: item.kind,
    label: boundedString(item.label, 80),
    confidence: ["low", "medium", "high"].includes(String(item.confidence)) ? item.confidence : null,
  };
  if (item.kind === "document-hypothesis") {
    const source = record(item.source);
    if (source) result.source = {
      document: boundedString(source.document, 120),
      locator: boundedString(source.locator, 120),
      label: boundedString(source.label, 80),
    };
  } else if (["internal-data", "owner-estimate", "approved", "model-default"].includes(item.kind)) {
    result.source = boundedString(item.source, 160);
    if (item.kind === "internal-data" || item.kind === "approved") result.recordedAt = boundedString(item.recordedAt, 80);
    if (item.kind !== "model-default") result.owner = boundedString(item.owner, 100);
  }
  return result;
}

function evidenceFields(value: unknown, prefix = "", limit = 18): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, limit).flatMap((entry) => {
    const item = record(entry);
    const source = evidence(item?.evidence);
    return item && source ? [{ field: boundedString(item.field, 100), path: prefix || null, evidence: source }] : [];
  });
}

function assumptionsSnapshot(value: unknown): JsonRecord | null {
  const envelope = record(value);
  const input = record(envelope?.sourceAssumptions) ?? envelope;
  if (!input) return null;
  const cases = Array.isArray(input.cases) ? input.cases.slice(0, 3).flatMap((entry) => {
    const item = record(entry);
    if (!item) return [];
    const shares = record(item.phaseShares);
    const drivers = Array.isArray(item.benefitDrivers) ? item.benefitDrivers.slice(0, 8).flatMap((driverValue) => {
      const driver = record(driverValue);
      return driver ? [{
        name: boundedString(driver.name, 80),
        monthlyUnits: finite(driver.monthlyUnits),
        netContributionPerUnit: finite(driver.netContributionPerUnit),
        startMonth: finite(driver.startMonth),
        probabilityPercent: finite(driver.probabilityPercent),
        source: evidence(driver.source),
      }] : [];
    }) : [];
    return [{
      id: boundedString(item.id, 32), name: boundedString(item.name, 80),
      effortAdjustmentPercent: finite(item.effortAdjustmentPercent), riskReservePercent: finite(item.riskReservePercent),
      manualTeamCount: finite(item.manualTeamCount), weeklyCapacityPerTeam: finite(item.weeklyCapacityPerTeam),
      phaseShares: shares ? Object.fromEntries(["product", "design", "development", "delivery"].map((key) => [key, finite(shares[key])])) : null,
      personDayRate: finite(item.personDayRate), oneTimeExternalCost: finite(item.oneTimeExternalCost), monthlyOperatingCost: finite(item.monthlyOperatingCost),
      benefitDrivers: drivers,
      fieldEvidence: evidenceFields(item.fieldEvidence, `cases.${boundedString(item.id, 32)}`, 8),
    }];
  }) : [];
  const kpis = Array.isArray(input.kpis) ? input.kpis.slice(0, 16).flatMap((value) => {
    const item = record(value);
    return item ? [{
      name: boundedString(item.name, 100), baseline: finite(item.baseline), target: finite(item.target), unit: boundedString(item.unit, 32),
      operator: item.operator === "gte" || item.operator === "lte" ? item.operator : null,
      measurementWindow: boundedString(item.measurementWindow, 80), actual: finite(item.actual), actualAt: boundedString(item.actualAt, 80),
      actualSource: boundedString(item.actualSource, 120), owner: boundedString(item.owner, 80), guardrail: item.guardrail === true,
      source: evidence(item.source),
    }] : [];
  }) : [];
  const gate = record(input.gateDecision);
  const criteria = Array.isArray(input.priorityCriteria) ? input.priorityCriteria.slice(0, 12).flatMap((value) => {
    const item = record(value);
    return item ? [{ label: boundedString(item.label, 80), score: finite(item.score), direction: boundedString(item.direction, 40), source: evidence(item.source) }] : [];
  }) : [];
  const weights = Array.isArray(input.priorityWeights) ? input.priorityWeights.slice(0, 12).flatMap((value) => {
    const item = record(value);
    return item ? [{ criterionId: boundedString(item.criterionId, 32), weight: finite(item.weight), source: evidence(item.source) }] : [];
  }) : [];
  return {
    title: boundedString(input.title, 120), description: boundedString(input.description, 240),
    domainIds: stringList(input.domainIds, 28), projectIds: stringList(input.projectIds, 12), teamIds: stringList(input.teamIds, 12),
    impactDepth: boundedString(input.impactDepth, 24), currency: boundedString(input.currency, 12), horizonMonths: finite(input.horizonMonths),
    cases, kpis,
    gateDecision: gate ? {
      decision: ["continue", "pause", "stop"].includes(String(gate.decision)) ? gate.decision : null,
      reason: boundedString(gate.reason, 240), evidence: boundedString(gate.evidence, 300), owner: boundedString(gate.owner, 100), reviewDate: boundedString(gate.reviewDate, 80),
    } : null,
    priorityCriteria: criteria, priorityWeights: weights,
    milestones: Array.isArray(input.milestones) ? input.milestones.slice(0, 10).flatMap((value) => {
      const item = record(value);
      return item ? [{ title: boundedString(item.title, 100), stage: boundedString(item.stage, 50), owner: boundedString(item.owner, 80), targetDay: finite(item.targetDay), targetDate: boundedString(item.targetDate, 80) }] : [];
    }) : [],
    guardrails: stringList(input.guardrails, 8), risks: stringList(input.risks, 8),
    fieldEvidence: evidenceFields(input.fieldEvidence, "assumptions", 18),
  };
}

function estimateSnapshot(value: unknown): JsonRecord | null {
  const estimate = record(value);
  if (!estimate) return null;
  const cases = Array.isArray(estimate.cases) ? estimate.cases.slice(0, 3).flatMap((value) => {
    const item = record(value);
    const technical = record(item?.technical);
    const metrics = record(technical?.metrics);
    const volume = record(technical?.changeVolume);
    const financial = record(item?.financial);
    if (!item) return [];
    const phases = Array.isArray(technical?.phases) ? technical.phases.slice(0, 4).flatMap((value) => {
      const phase = record(value);
      return phase ? [{ id: boundedString(phase.id, 24), title: boundedString(phase.title, 60), personDays: finite(phase.personDays), share: finite(phase.share) }] : [];
    }) : [];
    const impacted = Array.isArray(technical?.impactedDomains) ? technical.impactedDomains.slice(0, 20).flatMap((value) => {
      const domain = record(value);
      return domain ? [{ id: boundedString(domain.id, 60), title: boundedString(domain.title, 100), selected: domain.selected === true, status: boundedString(domain.status, 40) }] : [];
    }) : [];
    return [{
      id: boundedString(item.caseId, 32), name: boundedString(item.name, 80),
      technical: {
        selectedDomainIds: stringList(technical?.selectedDomainIds, 28), impactedDomains: impacted,
        metrics: metrics ? {
          basePersonDays: finite(metrics.basePersonDays), adjustedBasePersonDays: finite(metrics.adjustedBasePersonDays),
          reservePersonDays: finite(metrics.reservePersonDays), personDays: finite(metrics.personDays), calendarWeeks: finite(metrics.calendarWeeks),
        } : null,
        changeVolume: volume ? Object.fromEntries(["domainCount", "selectedDomainCount", "relationshipCount", "processCount", "apiSurfaceCount", "integrationCount", "dataMigrationCount", "uiSurfaceCount", "phaseCount"].map((key) => [key, finite(volume[key])])) : null,
        phases,
        warnings: stringList(technical?.warnings, 6),
      },
      financial: financial ? {
        currency: boundedString(financial.currency, 12), initialInvestment: finite(financial.initialInvestment), monthlyOperatingCost: finite(financial.monthlyOperatingCost),
        totalExpectedContribution: finite(financial.totalExpectedContribution), totalCosts: finite(financial.totalCosts), netValue: finite(financial.netValue),
        roiPercent: finite(financial.roiPercent), paybackMonths: finite(financial.paybackMonths),
        missingInputs: stringList(financial.missingInputs, 12), limitations: stringList(financial.limitations, 6),
      } : null,
      inputs: record(item.inputs) ? {
        effortAdjustmentPercent: finite(record(item.inputs)?.effortAdjustmentPercent), riskReservePercent: finite(record(item.inputs)?.riskReservePercent),
        manualTeamCount: finite(record(item.inputs)?.manualTeamCount), weeklyCapacityPerTeam: finite(record(item.inputs)?.weeklyCapacityPerTeam),
        personDayRate: finite(record(item.inputs)?.personDayRate), oneTimeExternalCost: finite(record(item.inputs)?.oneTimeExternalCost), monthlyOperatingCost: finite(record(item.inputs)?.monthlyOperatingCost),
        benefitDrivers: Array.isArray(record(item.inputs)?.benefitDrivers) ? (record(item.inputs)?.benefitDrivers as unknown[]).slice(0, 8).flatMap((value) => {
          const driver = record(value);
          return driver ? [{ name: boundedString(driver.name, 80), startMonth: finite(driver.startMonth), probabilityPercent: finite(driver.probabilityPercent) }] : [];
        }) : [],
      } : null,
    }];
  }) : [];
  const evaluations = Array.isArray(estimate.kpiEvaluations) ? estimate.kpiEvaluations.slice(0, 16).flatMap((value) => {
    const item = record(value);
    const kpi = record(item?.kpi);
    if (!kpi) return [];
    return [{ name: boundedString(kpi.name, 100), actual: finite(kpi.actual), target: finite(kpi.target), operator: kpi.operator === "gte" || kpi.operator === "lte" ? kpi.operator : null, unit: boundedString(kpi.unit, 32), status: boundedString(item?.status, 24) }];
  }) : [];
  const gate = record(estimate.gateDecision);
  const priority = record(estimate.priority);
  const completeness = record(estimate.evidenceCompleteness);
  const comparison = record(estimate.comparison);
  const metrics = Array.isArray(comparison?.metrics) ? comparison.metrics.slice(0, 12).flatMap((value) => {
    const item = record(value);
    return item ? [{ metric: boundedString(item.metric, 40), values: Array.isArray(item.values) ? item.values.slice(0, 3).flatMap((point) => { const entry = record(point); return entry ? [{ caseId: boundedString(entry.caseId, 32), value: finite(entry.value) }] : []; }) : [] }] : [];
  }) : [];
  return {
    modelVersion: boundedString(estimate.modelVersion, 80), title: boundedString(estimate.title, 120),
    cases, comparison: { metrics, differingInputs: Array.isArray(comparison?.differingInputs) ? comparison.differingInputs.slice(0, 12).flatMap((value) => { const item = record(value); return item ? [{ field: boundedString(item.field, 80), caseIds: stringList(item.caseIds, 3) }] : []; }) : [] },
    kpiEvaluations: evaluations,
    gateDecision: gate ? { decision: boundedString(gate.decision, 20), reason: boundedString(gate.reason, 240), evidence: boundedString(gate.evidence, 300), owner: boundedString(gate.owner, 100), reviewDate: boundedString(gate.reviewDate, 80) } : null,
    priority: priority ? { weightedScore: finite(priority.weightedScore), criteria: Array.isArray(priority.criteria) ? priority.criteria.slice(0, 12).flatMap((value) => { const item = record(value); return item ? [{ label: boundedString(item.label, 80), score: finite(item.score), direction: boundedString(item.direction, 40), source: evidence(item.source) }] : []; }) : [], weights: Array.isArray(priority.weights) ? priority.weights.slice(0, 12).flatMap((value) => { const item = record(value); return item ? [{ criterionId: boundedString(item.criterionId, 32), weight: finite(item.weight), source: evidence(item.source) }] : []; }) : [] } : null,
    evidenceCompleteness: completeness ? { recorded: finite(completeness.recorded), missing: finite(completeness.missing), missingFields: stringList(completeness.missingFields, 24) } : null,
    warnings: stringList(estimate.warnings, 8), limitations: stringList(estimate.limitations, 8),
    provenance: Array.isArray(estimate.provenance) ? estimate.provenance.slice(0, 20).flatMap((value) => { const item = record(value); const source = evidence(item?.evidence); return item && source ? [{ field: boundedString(item.field, 100), evidence: source }] : []; }) : [],
  };
}

function serializeBounded(value: JsonRecord): string {
  let output = JSON.stringify(value);
  if (output.length <= MAX_CONTEXT_LENGTH) return output;

  // Trim explanatory/collection-heavy fields in a deterministic order while keeping valid JSON.
  const copy: JsonRecord = JSON.parse(output) as JsonRecord;
  const assumptions = record(copy.assumptions);
  const estimate = record(copy.estimate);
  if (assumptions) {
    for (const key of ["fieldEvidence", "milestones", "guardrails", "risks", "priorityCriteria", "priorityWeights", "kpis"]) {
      if (Array.isArray(assumptions[key])) assumptions[key] = (assumptions[key] as unknown[]).slice(0, 4);
    }
    if (Array.isArray(assumptions.cases)) assumptions.cases = (assumptions.cases as JsonRecord[]).map((item) => ({ ...item, benefitDrivers: Array.isArray(item.benefitDrivers) ? item.benefitDrivers.slice(0, 3) : [], fieldEvidence: [] }));
  }
  if (estimate) {
    for (const key of ["kpiEvaluations", "provenance", "warnings", "limitations"]) {
      if (Array.isArray(estimate[key])) estimate[key] = (estimate[key] as unknown[]).slice(0, 4);
    }
    if (Array.isArray(estimate.cases)) estimate.cases = (estimate.cases as JsonRecord[]).map((item) => {
      const technical = record(item.technical);
      return { ...item, technical: technical ? { ...technical, impactedDomains: Array.isArray(technical.impactedDomains) ? technical.impactedDomains.slice(0, 6) : [], selectedDomainIds: Array.isArray(technical.selectedDomainIds) ? technical.selectedDomainIds.slice(0, 8) : [], phases: technical.phases } : null };
    });
  }
  output = JSON.stringify(copy);
  if (output.length <= MAX_CONTEXT_LENGTH) return output;
  // This fallback still returns valid JSON and preserves version, headline, missing inputs, KPI and gate signals.
  const compact = {
    modelVersion: boundedString(copy.modelVersion, 80),
    assumptions: assumptions ? { title: boundedString(assumptions.title, 120), domainIds: stringList(assumptions.domainIds, 12), horizonMonths: finite(assumptions.horizonMonths), currency: boundedString(assumptions.currency, 12), gateDecision: assumptions.gateDecision } : null,
    estimate: estimate ? {
      modelVersion: boundedString(estimate.modelVersion, 80), title: boundedString(estimate.title, 120),
      missingInputs: Array.isArray(estimate.evidenceCompleteness) ? [] : stringList(record(estimate.evidenceCompleteness)?.missingFields, 12),
      cases: Array.isArray(estimate.cases) ? (estimate.cases as JsonRecord[]).map((item) => ({ id: item.id, name: item.name, financial: record(item.financial) ? { roiPercent: record(item.financial)?.roiPercent, initialInvestment: record(item.financial)?.initialInvestment, missingInputs: record(item.financial)?.missingInputs } : null })) : [],
      kpiEvaluations: estimate.kpiEvaluations, gateDecision: estimate.gateDecision, priority: estimate.priority,
      evidenceCompleteness: estimate.evidenceCompleteness, provenance: estimate.provenance,
    } : null,
    provenance: copy.provenance,
    truncated: true,
  };
  output = JSON.stringify(compact);
  if (output.length <= MAX_CONTEXT_LENGTH) return output;
  return JSON.stringify({ modelVersion: boundedString(copy.modelVersion, 80), truncated: true, note: "snapshot context exceeded the safe size limit" });
}

export function buildScenarioHermesContext(snapshot: { assumptions: unknown; estimate: unknown }): string {
  const assumptions = assumptionsSnapshot(snapshot.assumptions);
  const estimate = estimateSnapshot(snapshot.estimate);
  const assumptionProvenance = [
    ...(assumptions ? (assumptions.fieldEvidence as JsonRecord[] ?? []) : []),
    ...(assumptions && Array.isArray(assumptions.cases) ? (assumptions.cases as JsonRecord[]).flatMap((item) => item.fieldEvidence as JsonRecord[] ?? []) : []),
    ...(assumptions && Array.isArray(assumptions.kpis) ? (assumptions.kpis as JsonRecord[]).flatMap((item) => item.source ? [{ field: `kpi:${boundedString(item.name, 80)}`, evidence: item.source }] : []) : []),
    ...(assumptions && Array.isArray(assumptions.priorityCriteria) ? (assumptions.priorityCriteria as JsonRecord[]).flatMap((item) => item.source ? [{ field: `priority:${boundedString(item.label, 80)}`, evidence: item.source }] : []) : []),
    ...(assumptions && Array.isArray(assumptions.priorityWeights) ? (assumptions.priorityWeights as JsonRecord[]).flatMap((item) => item.source ? [{ field: `weight:${boundedString(item.criterionId, 32)}`, evidence: item.source }] : []) : []),
  ].slice(0, 32);
  const safe: JsonRecord = {
    version: "scenario-hermes-context/v1",
    sourceLabels: { assumptions: "saved ScenarioAnalysis.assumptions", estimate: "saved ScenarioAnalysis.estimate" },
    sourceAnalysisId: boundedString(record(snapshot.assumptions)?.sourceAnalysisId, 80),
    modelVersion: boundedString(record(snapshot.estimate)?.modelVersion, 80),
    assumptions,
    estimate,
    missingInputs: {
      assumptions: assumptions ? [] : ["assumptions snapshot is unavailable or not an object"],
      estimate: estimate ? stringList(record(estimate.evidenceCompleteness)?.missingFields, 24) : ["estimate snapshot is unavailable or not an object"],
    },
    provenance: [...assumptionProvenance, ...(estimate?.provenance as JsonRecord[] ?? [])],
  };
  return serializeBounded(safe);
}
