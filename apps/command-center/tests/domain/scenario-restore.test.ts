import { describe, expect, it } from "vitest";
import { requestDraftFromSnapshot, restrictScenarioDraftToRoster, unwrapScenarioAssumptions } from "../../lib/scenario-restore";
import type { ScenarioRequestDraft } from "../../lib/scenario-types";

const draft = {
  title: "Restored scenario",
  projectIds: ["project-allowed", "project-stale", "project-unknown"],
  teamIds: ["team-allowed", "team-stale", "team-unknown"],
} as ScenarioRequestDraft;

describe("restrictScenarioDraftToRoster", () => {
  it("retains roster IDs and drops stale or unrecognized project and team IDs", () => {
    const restored = restrictScenarioDraftToRoster(
      draft,
      ["project-allowed", "project-current"],
      ["team-allowed", "team-current"],
    );

    expect(restored.projectIds).toEqual(["project-allowed"]);
    expect(restored.teamIds).toEqual(["team-allowed"]);
    expect(restored.title).toBe(draft.title);
  });
});

describe("unwrapScenarioAssumptions", () => {
  it("restores original inputs through repeated CEO decision snapshot envelopes", () => {
    const original = { title: "Scenario", domainIds: ["wallet"], cases: [], kpis: [], milestones: [], fieldEvidence: [], gateDecision: { decision: null }, catalogSnapshot: { id: "catalog" } };
    const once = { sourceAnalysisId: "a1", sourceAssumptions: original, decision: { decision: "continue" } };
    const twice = { sourceAnalysisId: "a2", sourceAssumptions: once, decision: { decision: "pause" } };
    const thrice = { sourceAnalysisId: "a3", sourceAssumptions: twice, decision: { decision: "continue" } };
    expect(unwrapScenarioAssumptions(thrice)).toEqual(original);
    const restoredDraft = requestDraftFromSnapshot(thrice);
    expect(restoredDraft).toEqual({ title: "Scenario", domainIds: ["wallet"], cases: [], kpis: [], milestones: [], fieldEvidence: [], gateDecision: { decision: null } });
  });

  it("stops safely on cyclic or malformed envelopes", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.sourceAssumptions = cyclic;
    expect(unwrapScenarioAssumptions(cyclic)).toBe(cyclic);
    expect(unwrapScenarioAssumptions({ sourceAssumptions: "not-json-object" })).toEqual({ sourceAssumptions: "not-json-object" });
  });
});
