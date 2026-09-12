import { describe, expect, it } from "vitest";
import { strategicScenarioCatalog } from "../../lib/scenario-catalog";
import { orderScenarioLaneForDisplay, travelScenarioOrderNote } from "../../lib/scenario-catalog-display";

describe("scenario catalog display order", () => {
  it("orders travel cards by suggestedOrder within each lane and labels that order editorial", () => {
    const travel = strategicScenarioCatalog.filter((scenario) => scenario.track === "travel");
    const experience = orderScenarioLaneForDisplay(travel.filter((scenario) => scenario.lane === "experience"));
    const access = orderScenarioLaneForDisplay(travel.filter((scenario) => scenario.lane === "access"));

    expect(experience.map((scenario) => scenario.id)).toEqual([
      "travel-ziyarat-mode", "travel-one-touch-bundle", "travel-newcash-pass", "travel-pilgrim-assistant",
    ]);
    expect(access.map((scenario) => scenario.id)).toEqual([
      "travel-arabic-softpos", "travel-pilgrim-counter", "travel-trusted-hosts", "travel-nfc-bracelet",
    ]);
    expect(travelScenarioOrderNote).toContain("ترتیب پیشنهادی سند");
    expect(travelScenarioOrderNote).toContain("به‌معنای تصویب یا اولویت اجرایی نیست");
  });
});
