import type { ScenarioRequestDraft } from "./scenario-types";

export function unwrapScenarioAssumptions(value: unknown): Record<string, unknown> | null {
  let current = value;
  const visited = new Set<object>();
  while (current !== null && typeof current === "object" && !Array.isArray(current) && !visited.has(current)) {
    visited.add(current);
    const source = (current as Record<string, unknown>).sourceAssumptions;
    if (source === null || typeof source !== "object" || Array.isArray(source)) break;
    current = source;
  }
  return current !== null && typeof current === "object" && !Array.isArray(current) ? current as Record<string, unknown> : null;
}

export function requestDraftFromSnapshot(value: unknown): ScenarioRequestDraft | null {
  const unwrapped = unwrapScenarioAssumptions(value);
  if (!unwrapped) return null;
  const { catalogSnapshot: _catalogSnapshot, ...candidate } = unwrapped;
  if (
    typeof candidate.title === "string" && Array.isArray(candidate.domainIds) && Array.isArray(candidate.cases) &&
    Array.isArray(candidate.kpis) && Array.isArray(candidate.milestones) && Array.isArray(candidate.fieldEvidence) &&
    candidate.gateDecision !== null && typeof candidate.gateDecision === "object" && !Array.isArray(candidate.gateDecision)
  ) return candidate as unknown as ScenarioRequestDraft;
  return null;
}

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
