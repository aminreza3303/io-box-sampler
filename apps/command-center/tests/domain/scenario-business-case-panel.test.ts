import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ScenarioBusinessCasePanel } from "../../components/scenarios/scenario-business-case-panel";
import { evaluateKpiActual } from "../../lib/scenario-kpi-display";

describe("ScenarioBusinessCasePanel", () => {
  it("renders nothing for a null result", () => {
    const html = renderToStaticMarkup(createElement(ScenarioBusinessCasePanel, { estimate: null, assumptions: null, onDecisionChange: vi.fn() }));
    expect(html).toBe("");
  });

  it("renders legacy snapshots read-only without implying a versioned recalculation", () => {
    const onDecisionChange = vi.fn();
    const html = renderToStaticMarkup(createElement(ScenarioBusinessCasePanel, {
      estimate: { title: "قدیمی", estimatedDays: 4, secretField: "do not render" }, assumptions: { title: "قدیمی" }, onDecisionChange,
    }));
    expect(html).toContain("تحلیل قدیمی · فقط خواندنی");
    expect(html).toContain("۴ نفر-روز");
    expect(html).not.toContain("do not render");
    expect(onDecisionChange).not.toHaveBeenCalled();
  });

  it("renders incomplete versioned financial and calendar values as unknown, not zero", () => {
    const estimate = {
      modelVersion: "scenario-business-case/v1", title: "ناقص", cases: [{ caseId: "base", name: "پایه", technical: {
        selectedDomainIds: [], impactedDomains: [], metrics: { basePersonDays: 0, adjustedBasePersonDays: 0, reservePersonDays: 0, personDays: 0, calendarWeeks: null },
        changeVolume: {}, phases: [], warnings: [],
      }, financial: { currency: "TOMAN", initialInvestment: null, monthlyOperatingCost: null, totalExpectedContribution: null, totalCosts: null, netValue: null, roiPercent: null, paybackMonths: null, missingInputs: ["نرخ نفر-روز"], limitations: [] }, inputs: {} }],
      comparison: { metrics: [], differingInputs: [] }, kpiEvaluations: [], gateDecision: { decision: null, reason: "", evidence: "", owner: "", reviewDate: null }, priority: null,
      evidenceCompleteness: { recorded: 0, missing: 1, missingFields: ["rate"] }, warnings: [], limitations: [],
    };
    const html = renderToStaticMarkup(createElement(ScenarioBusinessCasePanel, { estimate, assumptions: {}, onDecisionChange: vi.fn() }));
    expect(html).toContain("زمان تقویمی");
    expect(html).toContain("ROI");
    expect(html).toContain("نامشخص / نیازمند داده");
    expect(html).toContain("critical path محاسبه نشده");
    expect(html).not.toMatch(/ROI<\/th><td[^>]*>۰(?:<\/td>)/);
  });

  it("does not evaluate a KPI unless actual, target and a recognized operator are present", () => {
    expect(evaluateKpiActual(8, 5, "gte")).toBe("met");
    expect(evaluateKpiActual(4, 5, "gte")).toBe("not_met");
    expect(evaluateKpiActual(4, 5, "lte")).toBe("met");
    expect(evaluateKpiActual(8, 5, "lte")).toBe("not_met");
    expect(evaluateKpiActual(4, 5, "unknown")).toBe("unmeasured");
    expect(evaluateKpiActual(4, 5, null)).toBe("unmeasured");
    expect(evaluateKpiActual(null, 5, "gte")).toBe("unmeasured");
    expect(evaluateKpiActual(4, null, "gte")).toBe("unmeasured");
  });
});
