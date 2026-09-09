import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({ prisma: {
  project: { findFirst: vi.fn(), findMany: vi.fn() },
  team: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  teamMember: { create: vi.fn(), findFirst: vi.fn() },
  user: { findFirst: vi.fn(), findMany: vi.fn() },
  sprint: { create: vi.fn() },
  risk: { create: vi.fn(), update: vi.fn() },
  issue: { create: vi.fn(), update: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
} }));

vi.mock("../../lib/db", () => ({ prisma }));

import {
  addTeamMember,
  createSprint,
  createTeam,
  updateRiskOrIssue,
} from "../../server/domain/portfolio-service";

const ceo = { userId: "ceo-1", role: "CEO" as const, teamIds: [], projectIds: [] };
const manager = { userId: "manager-1", role: "MANAGER" as const, teamIds: ["team-1"], projectIds: ["project-1"] };
const member = { userId: "member-1", role: "MEMBER" as const, teamIds: ["team-1"], projectIds: ["project-1"] };

describe("portfolio service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
    prisma.auditEvent.create.mockResolvedValue({ id: "audit-1" });
  });

  it("allows a manager to create a team only in their project scope", async () => {
    prisma.project.findFirst.mockResolvedValue({ id: "project-1" });
    prisma.team.create.mockResolvedValue({ id: "team-2", projectId: "project-1", name: "تحویل" });

    await expect(createTeam({ name: "تحویل", slug: "delivery", projectId: "project-1" }, manager))
      .resolves.toEqual({ id: "team-2", projectId: "project-1", name: "تحویل" });
    expect(prisma.team.create).toHaveBeenCalledWith({
      data: { name: "تحویل", slug: "delivery", projectId: "project-1" },
    });
  });

  it("rejects a manager creating a team outside their project", async () => {
    await expect(createTeam({ name: "تراز", slug: "taraz", projectId: "project-2" }, manager))
      .rejects.toThrow("not allowed");
    expect(prisma.team.create).not.toHaveBeenCalled();
  });

  it("limits team membership mutations to the manager's team and records an audit", async () => {
    prisma.team.findFirst.mockResolvedValue({ id: "team-1", projectId: "project-1" });
    prisma.user.findFirst.mockResolvedValue({ id: "user-2" });
    prisma.teamMember.findFirst.mockResolvedValue(null);
    prisma.teamMember.create.mockResolvedValue({ id: "membership-1", teamId: "team-1", userId: "user-2" });

    await expect(addTeamMember("team-1", "user-2", manager)).resolves.toEqual({
      id: "membership-1", teamId: "team-1", userId: "user-2",
    });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "TEAM_MEMBER_ADDED", teamId: "team-1", targetId: "membership-1" }),
    });
  });

  it("denies members manager mutations", async () => {
    await expect(addTeamMember("team-1", "user-2", member)).rejects.toThrow("not allowed");
    await expect(createSprint({ projectId: "project-1", teamId: "team-1", name: "هفته ۱", startDate: "2026-09-10", endDate: "2026-09-09" }, member))
      .rejects.toThrow("not allowed");
  });

  it("rejects a sprint whose end date is not after its start date", async () => {
    await expect(createSprint({ projectId: "project-1", teamId: "team-1", name: "هفته ۱", startDate: "2026-09-10", endDate: "2026-09-09" }, manager))
      .rejects.toThrow("end date must be after start date");
    expect(prisma.sprint.create).not.toHaveBeenCalled();
  });

  it("validates risk ownership and priority before creating an audit-backed risk", async () => {
    prisma.project.findFirst.mockResolvedValue({ id: "project-1" });
    prisma.team.findFirst.mockResolvedValue({ id: "team-1", projectId: "project-1" });
    prisma.risk.create.mockResolvedValue({ id: "risk-1", projectId: "project-1", teamId: "team-1", priority: "HIGH" });

    await expect(updateRiskOrIssue({
      kind: "RISK", projectId: "project-1", teamId: "team-1", title: "ریسک ظرفیت", priority: "HIGH",
    }, manager)).resolves.toEqual(expect.objectContaining({ id: "risk-1" }));
    expect(prisma.risk.create).toHaveBeenCalled();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "RISK_CREATED", targetId: "risk-1" }),
    });
  });

  it("rejects an invalid priority and prevents a mutation", async () => {
    await expect(updateRiskOrIssue({
      kind: "ISSUE", projectId: "project-1", title: "ابهام", priority: "CRITICAL" as never,
    }, ceo)).rejects.toThrow();
    expect(prisma.issue.create).not.toHaveBeenCalled();
  });
});
