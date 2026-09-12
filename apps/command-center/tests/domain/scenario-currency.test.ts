import { describe, expect, it, vi } from "vitest";
import { createScenarioRequestDraft } from "../../components/scenarios/scenario-assumptions-form";
import { changeScenarioCurrency, confirmScenarioCurrencyChange, hasScenarioFinancialEntries } from "../../lib/scenario-currency";
import type { ScenarioRequestDraft } from "../../lib/scenario-types";

function populatedDraft(): ScenarioRequestDraft {
  const draft = createScenarioRequestDraft();
  return {
    ...draft,
    cases: draft.cases.map((scenarioCase) => ({
      ...scenarioCase,
      personDayRate: 100,
      oneTimeExternalCost: 200,
      monthlyOperatingCost: 30,
      benefitDrivers: [{
        id: `benefit-${scenarioCase.id}`,
        name: "درآمد آزمایشی",
        monthlyUnits: 10,
        netContributionPerUnit: 5,
        startMonth: 1,
        probabilityPercent: 50,
        source: null,
      }],
      moneyConversions: [{
        field: "personDayRate",
        originalCurrency: "USD",
        originalAmount: 10,
        convertedAmount: 100,
        rate: 10,
        rateDate: "2026-09-12",
        source: "نرخ دستی آزمایشی",
      }],
    })),
  };
}

describe("scenario currency change", () => {
  it("clears every old-currency amount and conversion across cases without FX", () => {
    const original = populatedDraft();
    const changed = changeScenarioCurrency(original, "USD");

    expect(changed.currency).toBe("USD");
    expect(changed.cases).toHaveLength(3);
    for (const scenarioCase of changed.cases) {
      expect(scenarioCase.personDayRate).toBeNull();
      expect(scenarioCase.oneTimeExternalCost).toBeNull();
      expect(scenarioCase.monthlyOperatingCost).toBeNull();
      expect(scenarioCase.benefitDrivers[0].netContributionPerUnit).toBeNull();
      expect(scenarioCase.moneyConversions).toEqual([]);
      expect(scenarioCase.benefitDrivers[0].monthlyUnits).toBe(10);
      expect(scenarioCase.fieldEvidence.filter((item) => item.field === "personDayRate")[0].evidence.kind).toBe("model-default");
    }
    expect(changed.fieldEvidence.find((item) => item.field === "currency")?.evidence).toMatchObject({
      kind: "owner-estimate",
      owner: "مالک سناریو",
    });
    expect(hasScenarioFinancialEntries(original)).toBe(true);
    expect(hasScenarioFinancialEntries(changed)).toBe(false);
  });

  it("treats an explicitly entered zero as an amount that needs confirmation before clearing", () => {
    const draft = populatedDraft();
    const zeroDraft = {
      ...draft,
      currency: "USD" as const,
      cases: draft.cases.map((scenarioCase) => ({
        ...scenarioCase,
        personDayRate: 0,
        oneTimeExternalCost: null,
        monthlyOperatingCost: null,
        benefitDrivers: scenarioCase.benefitDrivers.map((driver) => ({ ...driver, netContributionPerUnit: null })),
        moneyConversions: [],
      })),
    };

    expect(hasScenarioFinancialEntries(zeroDraft)).toBe(true);
    expect(changeScenarioCurrency(zeroDraft, "TOMAN").cases.every((item) => item.personDayRate === null)).toBe(true);
  });

  it("preserves financial inputs when the user cancels and clears them only after confirmation", () => {
    const draft = populatedDraft();
    const cancel = vi.fn(() => false);
    const approve = vi.fn(() => true);

    expect(confirmScenarioCurrencyChange(draft, "USD", cancel)).toBeNull();
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("هیچ نرخ خودکار اعمال نمی‌شود"));
    expect(draft.cases[0].personDayRate).toBe(100);

    const changed = confirmScenarioCurrencyChange(draft, "USD", approve);
    expect(approve).toHaveBeenCalledOnce();
    expect(changed?.currency).toBe("USD");
    expect(changed?.cases.every((scenarioCase) => scenarioCase.personDayRate === null && scenarioCase.moneyConversions.length === 0)).toBe(true);
    expect(confirmScenarioCurrencyChange(draft, "TOMAN", vi.fn(() => true))).toBeNull();
  });
});
