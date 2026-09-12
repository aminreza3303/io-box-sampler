import { describe, expect, it } from "vitest";
import { strategicScenarioCatalog, getStrategicScenario } from "../../lib/scenario-catalog";
import { domains } from "../../lib/domain-map";
import { scenarioTemplates } from "../../lib/scenario-planner";

const expectedIds = [
  "wallet-interactive-demo",
  "wallet-simple-home",
  "wallet-round-up",
  "wallet-financial-assistant",
  "wallet-savings-gamification",
  "travel-one-touch-bundle",
  "travel-ziyarat-mode",
  "travel-newcash-pass",
  "travel-arabic-softpos",
  "travel-pilgrim-counter",
  "travel-pilgrim-assistant",
  "travel-trusted-hosts",
  "travel-nfc-bracelet",
];

describe("strategic scenario catalog", () => {
  it("lists each distinct source idea exactly once with traceable source metadata", () => {
    expect(strategicScenarioCatalog.map((scenario) => scenario.id)).toEqual(expectedIds);
    expect(new Set(strategicScenarioCatalog.map((scenario) => scenario.id)).size).toBe(13);
    expect(strategicScenarioCatalog.every((scenario) => scenario.sourceReferences.length > 0)).toBe(true);
    expect(strategicScenarioCatalog.filter((scenario) => scenario.track === "wallet")).toHaveLength(5);
    expect(strategicScenarioCatalog.filter((scenario) => scenario.track === "travel")).toHaveLength(8);
    expect(scenarioTemplates.map((template) => template.id)).toEqual([
      "multi-currency-transfer", "fx-market", "merchant-offer", "kyc-card", "mobile-rewrite",
    ]);
    expect(domains.some((domain) => domain.id === "gold")).toBe(true);
    expect(getStrategicScenario("wallet-round-up")?.id).toBe("wallet-round-up");
    expect(getStrategicScenario("not-in-catalog")).toBeUndefined();
  });

  it("uses only known domain IDs and cites both strategy PDFs for all five wallet ideas", () => {
    const domainIds = new Set(domains.map((domain) => domain.id));
    expect(strategicScenarioCatalog.every((scenario) => scenario.domainIds.length > 0)).toBe(true);
    expect(strategicScenarioCatalog.every((scenario) => scenario.domainIds.every((id) => domainIds.has(id)))).toBe(true);

    for (const scenario of strategicScenarioCatalog.filter((item) => item.track === "wallet")) {
      expect(scenario.sourceReferences).toEqual(expect.arrayContaining([
        expect.objectContaining({ document: "NewCash_Strategy_BusinessProfessional_2026-09-12.pdf", locator: "pages 7–8", label: "فرضیهٔ سند" }),
        expect.objectContaining({ document: "NewCash_Strategy_InDepth_BusinessProfessional_2026-09-12.pdf", locator: "pages 7–8", label: "فرضیهٔ سند" }),
      ]));
      expect(scenario.priority).toBeNull();
      expect(scenario.qualitativePriority).not.toBeNull();
      expect(scenario.suggestedOwner).toBeNull();
    }
  });

  it("preserves all eight documented travel score vectors in the named criterion order", () => {
    const travelScores = Object.fromEntries(
      strategicScenarioCatalog
        .filter((scenario) => scenario.track === "travel")
        .map((scenario) => [scenario.id, scenario.priority?.criteria.map((criterion) => criterion.score)]),
    );
    expect(travelScores).toEqual({
      "travel-one-touch-bundle": [5, 4, 4, 4, 5],
      "travel-ziyarat-mode": [5, 5, 3, 5, 5],
      "travel-newcash-pass": [4, 4, 3, 4, 4],
      "travel-arabic-softpos": [4, 4, 4, 3, 4],
      "travel-pilgrim-counter": [4, 3, 4, 3, 5],
      "travel-pilgrim-assistant": [4, 3, 3, 4, 4],
      "travel-trusted-hosts": [3, 3, 4, 3, 4],
      "travel-nfc-bracelet": [3, 2, 5, 2, 5],
    });

    for (const scenario of strategicScenarioCatalog.filter((item) => item.track === "travel")) {
      expect(scenario.priority?.criteria.map((criterion) => criterion.id)).toEqual([
        "customer-linkage", "revenue-speed", "competitive-advantage", "lower-risk", "brand-impact",
      ]);
      expect(scenario.priority?.criteria[3].direction).toBe("risk-lower-is-better");
      expect(scenario.priority?.weights.map((weight) => weight.weight)).toEqual([1, 1, 1, 1, 1]);
      expect(scenario.qualitativePriority).toBeNull();
    }
    expect(Object.fromEntries(strategicScenarioCatalog.filter((item) => item.track === "travel").map((item) => [item.id, item.priority?.suggestedOrder]))).toEqual({
      "travel-one-touch-bundle": 2,
      "travel-ziyarat-mode": 1,
      "travel-newcash-pass": 3,
      "travel-arabic-softpos": 4,
      "travel-pilgrim-counter": 5,
      "travel-pilgrim-assistant": 6,
      "travel-trusted-hosts": 7,
      "travel-nfc-bracelet": 8,
    });
    for (const lane of ["experience", "access"] as const) {
      expect(strategicScenarioCatalog
        .filter((item) => item.track === "travel" && item.lane === lane)
        .sort((left, right) => (left.priority?.suggestedOrder ?? 0) - (right.priority?.suggestedOrder ?? 0))
        .map((item) => item.id)).toEqual(lane === "experience"
        ? ["travel-ziyarat-mode", "travel-one-touch-bundle", "travel-newcash-pass", "travel-pilgrim-assistant"]
        : ["travel-arabic-softpos", "travel-pilgrim-counter", "travel-trusted-hosts", "travel-nfc-bracelet"]);
    }
  });

  it("attaches the HTML's suggested owners and first-step milestone without promoting gates", () => {
    const expectedOwners: Record<string, string> = {
      "travel-one-touch-bundle": "مدیر محصول سفر",
      "travel-ziyarat-mode": "طراح ارشد UX",
      "travel-newcash-pass": "مدیر رشد",
      "travel-arabic-softpos": "مدیر فنی (CTO)",
      "travel-pilgrim-counter": "توسعه بین‌الملل",
      "travel-pilgrim-assistant": "مدیر فنی (CTO)",
      "travel-trusted-hosts": "مدیر محصول بازار",
      "travel-nfc-bracelet": "مدیر محصول کارت",
    };
    for (const [id, owner] of Object.entries(expectedOwners)) {
      const scenario = getStrategicScenario(id);
      expect(scenario?.suggestedOwner).toBe(owner);
      expect(scenario?.milestones).toEqual(expect.arrayContaining([
        expect.objectContaining({ owner, targetDay: 30, exitCriteria: expect.any(String) }),
      ]));
      expect(scenario?.gate.decision.decision).toBeNull();
    }
  });

  it("does not turn missing financial hypotheses into fabricated numeric values", () => {
    for (const scenario of strategicScenarioCatalog) {
      expect(scenario.benefitDrivers.length).toBeGreaterThan(0);
      for (const driver of scenario.benefitDrivers) {
        expect(driver.monthlyUnits).toBeNull();
        expect(driver.netContributionPerUnit).toBeNull();
        expect(driver.startMonth).toBeNull();
        expect(driver.probabilityPercent).toBeNull();
        expect(driver.source?.kind).toBe("document-hypothesis");
      }
      expect(scenario.kpis.length).toBeGreaterThan(0);
      expect(scenario.kpis.every((kpi) => kpi.actual === null && kpi.actualAt === null && kpi.actualSource === null)).toBe(true);
    }
    const nfcPresale = getStrategicScenario("travel-nfc-bracelet")?.kpis.find((item) => item.id === "travel-nfc-bracelet-presignups");
    expect(nfcPresale?.target).toBe(10_000);
    expect(nfcPresale?.source?.kind).toBe("document-hypothesis");
    if (nfcPresale?.source?.kind === "document-hypothesis") {
      expect(nfcPresale.source.source.locator).toContain("NFC presale threshold");
    }
  });
});
