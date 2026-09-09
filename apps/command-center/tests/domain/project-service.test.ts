import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({ prisma: {
  project: { create: vi.fn(), findMany: vi.fn() },
  task: { findMany: vi.fn() },
  backlogItem: { findMany: vi.fn() },
  sprint: { findMany: vi.fn() },
  goal: { findMany: vi.fn() },
  risk: { findMany: vi.fn() },
  issue: { findMany: vi.fn() },
  decision: { findMany: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(),
} }));

vi.mock("../../lib/db", () => ({ prisma }));

import { createProject, listCommandCenterSnapshot } from "../../server/domain/project-service";

describe("createProject", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback) => callback(prisma));
  });

  it("creates a project and records an audit event for a CEO", async () => {
    prisma.project.create.mockResolvedValue({ id: "project-1", name: "نیوکاش" });
    prisma.auditEvent.create.mockResolvedValue({ id: "audit-1" });

    await expect(
      createProject({ name: "نیوکاش", code: "newcash" }, { userId: "ceo-1", role: "CEO" }),
    ).resolves.toEqual({ id: "project-1", name: "نیوکاش" });

    expect(prisma.project.create).toHaveBeenCalledWith({
      data: { name: "نیوکاش", code: "newcash", createdById: "ceo-1" },
    });
    expect(prisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "PROJECT_CREATED", actorId: "ceo-1", projectId: "project-1" }),
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects project creation by a member", async () => {
    await expect(
      createProject({ name: "نیوکاش", code: "newcash" }, { userId: "member-1", role: "MEMBER", teamIds: ["team-1"] }),
    ).rejects.toThrow("not allowed");
  });
});

describe("command center snapshot", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prisma.project.findMany.mockResolvedValue([{ id: "project-1" }]);
    for (const model of [prisma.task, prisma.backlogItem, prisma.sprint, prisma.goal, prisma.risk, prisma.issue, prisma.decision]) {
      model.findMany.mockResolvedValue([]);
    }
  });

  it("does not let a requested team override the actor's scope", async () => {
    await expect(listCommandCenterSnapshot({ teamId: "team-2" }, {
      userId: "member-1", role: "MEMBER", teamIds: ["team-1"],
    })).rejects.toThrow("not allowed");
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });

  it("scopes included teams, tasks and standard artifacts", async () => {
    await listCommandCenterSnapshot({}, { userId: "manager-1", role: "MANAGER", teamIds: ["team-1"] });
    expect(prisma.project.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: { teams: { where: { archivedAt: null, id: { in: ["team-1"] } } } },
    }));
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ teamId: { in: ["team-1"] } }),
    }));
    for (const model of [prisma.backlogItem, prisma.sprint, prisma.goal, prisma.risk, prisma.issue, prisma.decision]) {
      expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ OR: [{ teamId: null }, { teamId: { in: ["team-1"] } }] }),
      }));
    }
  });

  it("allows the CEO to filter by team and task status", async () => {
    await listCommandCenterSnapshot({ projectId: "project-1", teamId: "team-2", status: "BLOCKED" }, { userId: "ceo-1", role: "CEO" });
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ projectId: { in: ["project-1"] }, teamId: { in: ["team-2"] }, status: "BLOCKED" }),
    }));
  });
});
