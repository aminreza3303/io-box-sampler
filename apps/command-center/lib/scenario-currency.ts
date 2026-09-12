import type { ScenarioCaseInput, ScenarioEvidence, ScenarioRequestDraft } from "./scenario-types";

const monetaryCaseFields = new Set<ScenarioCaseInput["fieldEvidence"][number]["field"]>([
  "personDayRate",
  "oneTimeExternalCost",
  "monthlyOperatingCost",
]);

function clearedAmountEvidence(field: string): ScenarioEvidence {
  return {
    kind: "model-default",
    label: "فرض اولیهٔ مدل",
    source: `با تغییر ارز، مبلغ قبلیِ ${field} پاک شد؛ مبلغ تازه وارد نشده است.`,
    confidence: null,
  };
}

export function hasScenarioFinancialEntries(draft: ScenarioRequestDraft): boolean {
  return draft.cases.some((scenarioCase) =>
    scenarioCase.personDayRate !== null
    || scenarioCase.oneTimeExternalCost !== null
    || scenarioCase.monthlyOperatingCost !== null
    || scenarioCase.benefitDrivers.some((driver) => driver.netContributionPerUnit !== null)
    || scenarioCase.moneyConversions.length > 0,
  );
}

export function changeScenarioCurrency(
  draft: ScenarioRequestDraft,
  currency: ScenarioRequestDraft["currency"],
): ScenarioRequestDraft {
  if (draft.currency === currency) return draft;

  return {
    ...draft,
    currency,
    fieldEvidence: draft.fieldEvidence.map((item) => item.field === "currency"
      ? {
        ...item,
        evidence: {
          kind: "owner-estimate",
          label: "برآورد مالک",
          source: "ارز سناریو به‌صورت دستی انتخاب شد؛ مبالغ و تبدیل‌های قبلی پاک شدند و نرخ خودکار اعمال نشد.",
          owner: "مالک سناریو",
          confidence: null,
        },
      }
      : item),
    cases: draft.cases.map((scenarioCase) => ({
      ...scenarioCase,
      personDayRate: null,
      oneTimeExternalCost: null,
      monthlyOperatingCost: null,
      benefitDrivers: scenarioCase.benefitDrivers.map((driver) => ({ ...driver, netContributionPerUnit: null })),
      moneyConversions: [],
      fieldEvidence: scenarioCase.fieldEvidence.map((item) => monetaryCaseFields.has(item.field)
        ? { ...item, evidence: clearedAmountEvidence(item.field) }
        : item),
  })),
  };
}

export function confirmScenarioCurrencyChange(
  draft: ScenarioRequestDraft,
  currency: ScenarioRequestDraft["currency"],
  confirmChange: (message: string) => boolean,
): ScenarioRequestDraft | null {
  if (draft.currency === currency) return null;

  const warning = hasScenarioFinancialEntries(draft)
    ? "تغییر ارز همهٔ مبالغ و تبدیل‌های دستی هر سه حالت را پاک می‌کند. مبلغ تازه باید در ارز جدید دوباره وارد شود؛ هیچ نرخ خودکار اعمال نمی‌شود. ادامه می‌دهید؟"
    : "تغییر ارز، ورودی‌های ثبت‌نشدهٔ فرم‌های تبدیل دستی را نیز پاک می‌کند. مبلغ تازه باید در ارز جدید دوباره وارد شود؛ هیچ نرخ خودکار اعمال نمی‌شود. ادامه می‌دهید؟";
  if (!confirmChange(warning)) return null;
  return changeScenarioCurrency(draft, currency);
}
