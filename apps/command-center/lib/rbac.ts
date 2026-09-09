import type { SessionUser } from "./auth";

export type Permission = "approve_proposal" | "write_memory" | "mutate_project" | "mutate_team";
export type PermissionScope = { organization?: boolean; projectId?: string; teamId?: string };
export type ProposalLike = { scope: "ORGANIZATION" | "PROJECT" | "TEAM"; projectId?: string; teamId?: string };

function inScope(actor: SessionUser, scope: PermissionScope): boolean {
  if (scope.organization) return actor.role === "CEO";
  if (scope.projectId && !actor.projectIds.includes(scope.projectId)) return false;
  if (scope.teamId && !actor.teamIds.includes(scope.teamId)) return false;
  return true;
}

export function assertPermission(actor: SessionUser, permission: Permission, scope: PermissionScope): void {
  if (actor.role === "CEO") return;
  if (!inScope(actor, scope)) throw new Error("Permission not allowed for this scope");
  if ((permission === "approve_proposal" && scope.organization) || (permission === "write_memory" && scope.organization)) {
    throw new Error("Permission not allowed for this role");
  }
}

export function canApproveProposal(actor: SessionUser, proposal: ProposalLike): boolean {
  if (actor.role === "CEO") return true;
  if (actor.role !== "MANAGER" || proposal.scope === "ORGANIZATION") return false;
  return inScope(actor, { projectId: proposal.projectId, teamId: proposal.teamId });
}
