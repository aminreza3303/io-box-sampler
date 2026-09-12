import type { ScenarioRequestDraft } from "./scenario-types";

export function restrictScenarioDraftToRoster(
  draft: ScenarioRequestDraft,
  projectIds: readonly string[],
  teamIds: readonly string[],
): ScenarioRequestDraft {
  const allowedProjects = new Set(projectIds);
  const allowedTeams = new Set(teamIds);

  return {
    ...draft,
    projectIds: (Array.isArray(draft.projectIds) ? draft.projectIds : []).filter(
      (id): id is string => typeof id === "string" && allowedProjects.has(id),
    ),
    teamIds: (Array.isArray(draft.teamIds) ? draft.teamIds : []).filter(
      (id): id is string => typeof id === "string" && allowedTeams.has(id),
    ),
  };
}
