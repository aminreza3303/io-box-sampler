import { describe, expect, it } from "vitest";
import { assertPermission, canApproveProposal, type PermissionScope } from "../../lib/rbac";
import type { SessionUser } from "../../lib/auth";

const actor = (role: SessionUser["role"], teamIds: string[], projectIds: string[]): SessionUser => ({
  userId: `${role.toLowerCase()}-1`,
  email: `${role.toLowerCase()}@example.test`,
  displayName: role,
  role,
  teamIds,
  projectIds,
});

const organizationScope: PermissionScope = { organization: true };

describe("role and scope permissions", () => {
  it("allows the CEO to approve organization-level proposals", () => {
    const ceo = actor("CEO", [], []);
    expect(() => assertPermission(ceo, "approve_proposal", organizationScope)).not.toThrow();
    expect(canApproveProposal(ceo, { scope: "ORGANIZATION" })).toBe(true);
  });

  it("keeps manager permissions inside their project and team scope", () => {
    const manager = actor("MANAGER", ["team-1"], ["project-1"]);
    expect(() => assertPermission(manager, "approve_proposal", { projectId: "project-1" })).not.toThrow();
    expect(() => assertPermission(manager, "approve_proposal", { projectId: "project-2" })).toThrow("not allowed");
    expect(() => assertPermission(manager, "mutate_team", { teamId: "team-2" })).toThrow("not allowed");
    expect(canApproveProposal(manager, { scope: "PROJECT", projectId: "project-1" })).toBe(true);
    expect(canApproveProposal(manager, { scope: "PROJECT", projectId: "project-2" })).toBe(false);
  });

  it("denies members organization memory mutation and proposal approval", () => {
    const member = actor("MEMBER", ["team-1"], ["project-1"]);
    expect(() => assertPermission(member, "write_memory", organizationScope)).toThrow("not allowed");
    expect(() => assertPermission(member, "approve_proposal", organizationScope)).toThrow("not allowed");
    expect(canApproveProposal(member, { scope: "ORGANIZATION" })).toBe(false);
  });

  it("fails closed for empty and malformed non-CEO scopes", () => {
    const manager = actor("MANAGER", ["team-1"], ["project-1"]);
    expect(() => assertPermission(manager, "mutate_project", {})).toThrow("not allowed");
    expect(() => assertPermission(manager, "approve_proposal", {})).toThrow("not allowed");
    expect(canApproveProposal(manager, { scope: "PROJECT" })).toBe(false);
    expect(canApproveProposal(manager, { scope: "TEAM" })).toBe(false);
    expect(canApproveProposal(manager, { scope: "PROJECT", projectId: "project-1", teamId: "team-1" })).toBe(false);
    expect(canApproveProposal(manager, { scope: "PROJECT", teamId: "team-1" })).toBe(false);
    expect(() => assertPermission(manager, "mutate_project", { projectId: "project-1", teamId: "team-1" })).toThrow("not allowed");
  });

  it("validates proposal shape before granting CEO approval", () => {
    const ceo = actor("CEO", [], []);
    expect(canApproveProposal(ceo, { scope: "PROJECT" })).toBe(false);
    expect(canApproveProposal(ceo, { scope: "PROJECT", projectId: "project-1", teamId: "team-1" })).toBe(false);
    expect(canApproveProposal(ceo, { scope: "ORGANIZATION" })).toBe(true);
  });
});
