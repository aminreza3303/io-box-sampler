import { describe, expect, it } from "vitest";
import { calculateScenarioEstimate, scenarioTemplates } from "../../lib/scenario-planner";

describe("scenario planner", () => {
  it("expands a transfer scenario to its directly dependent domains", () => {
    const estimate = calculateScenarioEstimate({ title: "انتقال وجه چندارزی", domainIds: ["transfer"], assumptions: { teamCount: 2, weeklyCapacity: 5 } });
    expect(estimate.impactedDomains.map((domain) => domain.id)).toEqual(expect.arrayContaining(["transfer", "wallet", "limits", "policy"]));
    expect(estimate.processImpacts.map((process) => process.id)).toEqual(expect.arrayContaining(["transfer", "multi-currency-ledger", "limits-engine", "access-policy"]));
    expect(estimate.changeVolume.phaseCount).toBe(4);
  });

  it("does not invent a monetary cost when the rate is missing", () => {
    const estimate = calculateScenarioEstimate({ title: "سناریوی پایه", domainIds: ["wallet"] });
    expect(estimate.metrics.cost).toBeNull();
    expect(estimate.warnings).toContain("نرخ نفر-روز وارد نشده است؛ هزینه فقط پس از ورود نرخ محاسبه می‌شود.");
  });

  it("reacts to rate, capacity, and risk buffer assumptions", () => {
    const conservative = calculateScenarioEstimate({ title: "سناریو", domainIds: ["gold"], assumptions: { teamCount: 1, weeklyCapacity: 5, personDayRate: 2_000_000, bufferPercent: 30 } });
    const faster = calculateScenarioEstimate({ title: "سناریو", domainIds: ["gold"], assumptions: { teamCount: 2, weeklyCapacity: 10, personDayRate: 2_000_000, bufferPercent: 0 } });
    expect(conservative.metrics.cost?.high).toBeGreaterThan(faster.metrics.cost?.high ?? 0);
    expect(conservative.metrics.calendarWeeks).toBeGreaterThan(faster.metrics.calendarWeeks);
  });

  it("provides reusable scenario templates", () => {
    expect(scenarioTemplates.map((template) => template.id)).toEqual(expect.arrayContaining(["multi-currency-transfer", "fx-market", "mobile-rewrite"]));
  });
});
