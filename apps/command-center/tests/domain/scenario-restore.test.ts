import { describe, expect, it } from "vitest";
import { restrictScenarioDraftToRoster } from "../../lib/scenario-restore";
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
