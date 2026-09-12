import { describe, expect, it } from "vitest";
import { domainRelationships, domains } from "../../lib/domain-map";
import { calculateScenarioEstimate, scenarioTemplates } from "../../lib/scenario-planner";
import type { ScenarioEvidence, ScenarioPlannerInput } from "../../lib/scenario-types";

const modelEvidence: ScenarioEvidence = {
  kind: "model-default",
  label: "فرض اولیهٔ مدل",
  source: "planner test fixture",
  confidence: null,
};

const plannerInput = (overrides: Partial<ScenarioPlannerInput> = {}): ScenarioPlannerInput => ({
  title: "سناریوی آزمون",
  domainIds: ["wallet"],
  impactDepth: "direct",
  teamCount: null,
  weeklyCapacityPerTeam: null,
  effortAdjustmentPercent: 0,
  riskReservePercent: 0,
  phaseShares: { product: 0.15, design: 0.2, development: 0.45, delivery: 0.2 },
  effortOverrides: [],
  phaseEvidence: modelEvidence,
  ...overrides,
});

describe("scenario planner", () => {
  it("keeps selected-only, direct, and transitive impact distinct", () => {
    const selected = calculateScenarioEstimate(plannerInput({ domainIds: ["transfer"], impactDepth: "selected" }));
    const direct = calculateScenarioEstimate(plannerInput({ domainIds: ["transfer"], impactDepth: "direct" }));
    const transitive = calculateScenarioEstimate(plannerInput({ domainIds: ["transfer"], impactDepth: "transitive" }));

    expect(selected.impactedDomains.map((domain) => domain.id)).toEqual(["transfer"]);
    expect(direct.impactedDomains.map((domain) => domain.id)).toEqual(expect.arrayContaining(["transfer", "wallet", "limits", "policy"]));
    expect(direct.impactedDomains.length).toBeGreaterThan(selected.impactedDomains.length);
    expect(transitive.impactedDomains).toHaveLength(domains.length - 1);
    expect(transitive.impactedDomains.map((domain) => domain.id)).not.toContain("donations");
    expect(transitive.relationships).toHaveLength(domainRelationships.length);
  });

  it("deduplicates selected domains, impacted domains, and graph edges", () => {
    const estimate = calculateScenarioEstimate(plannerInput({
      domainIds: ["transfer", "transfer"],
      impactDepth: "direct",
    }));
    const domainIds = estimate.impactedDomains.map((domain) => domain.id);
    const edgeIds = estimate.relationships.map((edge) => `${edge.from}:${edge.to}:${edge.label}`);

    expect(estimate.selectedDomainIds).toEqual(["transfer"]);
    expect(new Set(domainIds).size).toBe(domainIds.length);
    expect(new Set(edgeIds).size).toBe(edgeIds.length);
  });

  it("uses a domain override, then applies effort adjustment and a separate risk reserve", () => {
    const ownerEvidence: ScenarioEvidence = {
      kind: "owner-estimate",
      label: "برآورد مالک",
      source: "جلسهٔ تخمین",
      owner: "تیم محصول",
      confidence: "medium",
    };
    const estimate = calculateScenarioEstimate(plannerInput({
      domainIds: ["wallet"],
      impactDepth: "selected",
      effortAdjustmentPercent: 25,
      riskReservePercent: 20,
      effortOverrides: [{ domainId: "wallet", personDays: 13, source: ownerEvidence }],
    }));

    expect(estimate.metrics.basePersonDays).toBe(24.5);
    expect(estimate.metrics.adjustedBasePersonDays).toBe(30.6);
    expect(estimate.metrics.reservePersonDays).toBe(6.1);
    expect(estimate.metrics.personDays).toBe(36.7);
    expect(estimate.impactedDomains.find((domain) => domain.id === "wallet")?.complexityDays).toBe(13);
  });

  it("clamps the minimum effort at zero and validates explicit input ranges", () => {
    const zero = calculateScenarioEstimate(plannerInput({
      impactDepth: "selected",
      effortAdjustmentPercent: -100,
      riskReservePercent: 100,
    }));
    expect(zero.metrics.adjustedBasePersonDays).toBe(0);
    expect(zero.metrics.reservePersonDays).toBe(0);
    expect(zero.metrics.personDays).toBe(0);

    expect(() => calculateScenarioEstimate(plannerInput({ effortAdjustmentPercent: -101 }))).toThrow();
    expect(() => calculateScenarioEstimate(plannerInput({ effortAdjustmentPercent: 501 }))).toThrow();
    expect(() => calculateScenarioEstimate(plannerInput({ riskReservePercent: 101 }))).toThrow();
  });

  it("keeps four ordered phases normalized and distributes tenths to the largest remainders", () => {
    const estimate = calculateScenarioEstimate(plannerInput({
      impactDepth: "selected",
      effortAdjustmentPercent: 25,
      riskReservePercent: 20,
      effortOverrides: [{ domainId: "wallet", personDays: 13, source: modelEvidence }],
    }));

    expect(estimate.phases.map((phase) => phase.id)).toEqual(["product", "design", "development", "delivery"]);
    expect(estimate.phases.reduce((total, phase) => total + phase.share, 0)).toBeCloseTo(1, 10);
    const phaseEffortTenths = estimate.phases.reduce((total, phase) => total + Math.round(phase.personDays * 10), 0);
    expect(phaseEffortTenths).toBe(Math.round(estimate.metrics.personDays * 10));
    expect(estimate.phases.map((phase) => phase.personDays)).toEqual([5.5, 7.4, 16.5, 7.3]);
    expect(() => calculateScenarioEstimate(plannerInput({
      phaseShares: { product: 0.2, design: 0.2, development: 0.2, delivery: 0.2 },
    }))).toThrow();
  });

  it("returns unknown calendar weeks without a team or effective capacity", () => {
    const missingTeamCount = calculateScenarioEstimate(plannerInput({
      impactDepth: "selected",
      teamCount: null,
      weeklyCapacityPerTeam: 5,
    }));
    const missingCapacity = calculateScenarioEstimate(plannerInput({
      impactDepth: "selected",
      teamCount: 2,
      weeklyCapacityPerTeam: null,
    }));
    expect(missingTeamCount.metrics.calendarWeeks).toBeNull();
    expect(missingCapacity.metrics.calendarWeeks).toBeNull();
  });

  it("computes aggregate capacity weeks and does not invent task counts or costs", () => {
    const estimate = calculateScenarioEstimate(plannerInput({
      impactDepth: "selected",
      teamCount: 2,
      weeklyCapacityPerTeam: 5,
      effortAdjustmentPercent: 25,
      riskReservePercent: 20,
      effortOverrides: [{ domainId: "wallet", personDays: 13, source: modelEvidence }],
    }));
    expect(estimate.metrics.calendarWeeks).toBe(4);
    expect(estimate.warnings).toContain("زمان، ظرفیت تجمیعی است و مسیر بحرانی یا تعهد تاریخ تحویل نیست.");
    expect("taskCount" in estimate.changeVolume).toBe(false);
    expect("cost" in estimate.metrics).toBe(false);
    expect("confidence" in estimate).toBe(false);
  });

  it("preserves reusable non-gold templates and the gold domain remains selectable elsewhere", () => {
    expect(scenarioTemplates.map((template) => template.id)).toEqual([
      "multi-currency-transfer", "fx-market", "merchant-offer", "kyc-card", "mobile-rewrite",
    ]);
    expect(domains.some((domain) => domain.id === "gold")).toBe(true);
  });
});
