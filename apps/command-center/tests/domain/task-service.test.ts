import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({ prisma: {
  task: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  team: { findFirst: vi.fn() },
  sprint: { findFirst: vi.fn() },
  backlogItem: { findFirst: vi.fn() },
  teamMember: { findFirst: vi.fn() },
  taskDependency: { create: vi.fn() },
  taskPhase: { update: vi.fn() },
  auditEvent: { create: vi.fn() },
  $transaction: vi.fn(async (callback: (transaction: Record<string, unknown>) => unknown) => callback(prisma)),
} }));

vi.mock("../../lib/db", () => ({ prisma }));

import { createTask, updateTaskPhase } from "../../server/domain/task-service";

const ceoActor = { userId: "ceo-1", role: "CEO" as const };

describe("task domain service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.team.findFirst.mockResolvedValue({ id: "team-1" });
  });

  it("createTask creates the four canonical phases", async () => {
    prisma.task.create.mockResolvedValue({
      id: "task-1",
      phases: [
        { phaseType: "PRODUCT" },
        { phaseType: "DESIGN" },
        { phaseType: "DEVELOPMENT" },
        { phaseType: "DELIVERY" },
      ],
    });
    prisma.auditEvent.create.mockResolvedValue({ id: "audit-1" });

    const task = await createTask({ title: "برنامه‌ریزی", projectId: "project-1", teamId: "team-1" }, ceoActor);

    expect(task.phases.map((phase) => phase.phaseType)).toEqual([
      "PRODUCT",
      "DESIGN",
      "DEVELOPMENT",
      "DELIVERY",
    ]);
    expect(prisma.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        phases: { create: [
          expect.objectContaining({ phaseType: "PRODUCT" }),
          expect.objectContaining({ phaseType: "DESIGN" }),
          expect.objectContaining({ phaseType: "DEVELOPMENT" }),
          expect.objectContaining({ phaseType: "DELIVERY" }),
        ] },
      }),
    }));
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("rejects invalid phase types", async () => {
    await expect(
      updateTaskPhase("task-1", "INVALID", { status: "IN_PROGRESS" }, ceoActor),
    ).rejects.toThrow();
  });

  it("requires an active sprint when creating a task in a sprint", async () => {
    prisma.sprint.findFirst.mockResolvedValue(null);

    await expect(
      createTask({ title: "Task", projectId: "project-1", teamId: "team-1", sprintId: "sprint-1" }, ceoActor),
    ).rejects.toThrow("sprint must be active");
    expect(prisma.sprint.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: "sprint-1", status: "ACTIVE" }),
    }));
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("prevents a member from mutating another team's task", async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      updateTaskPhase("task-1", "PRODUCT", { status: "IN_PROGRESS" }, { userId: "member-1", role: "MEMBER", teamIds: ["team-2"] }),
    ).rejects.toThrow("not allowed");
  });

  it("rejects a dependency that points to the same task", async () => {
    await expect(
      createTask({ title: "برنامه‌ریزی", projectId: "project-1", teamId: "team-1", dependencyTaskIds: ["task-1"], id: "task-1" }, ceoActor),
    ).rejects.toThrow("cannot depend on itself");
  });

  it("rejects creating a task in another team's scope before any write", async () => {
    await expect(createTask({ title: "Task", projectId: "project-1", teamId: "team-2" }, {
      userId: "member-1", role: "MEMBER", teamIds: ["team-1"],
    })).rejects.toThrow("not allowed");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("rejects a team outside the active project", async () => {
    prisma.team.findFirst.mockResolvedValue(null);
    await expect(createTask({ title: "Task", projectId: "project-1", teamId: "team-2" }, ceoActor)).rejects.toThrow("team");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it.each(["sprintId", "backlogItemId", "assigneeId"] as const)("rejects an out-of-scope %s", async (field) => {
    prisma.sprint.findFirst.mockResolvedValue(null);
    prisma.backlogItem.findFirst.mockResolvedValue(null);
    prisma.teamMember.findFirst.mockResolvedValue(null);
    await expect(createTask({ title: "Task", projectId: "project-1", teamId: "team-1", [field]: "foreign-id" }, ceoActor)).rejects.toThrow("active");
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("rejects missing, archived or cross-project dependencies", async () => {
    prisma.task.findMany.mockResolvedValue([]);
    await expect(createTask({ title: "Task", projectId: "project-1", teamId: "team-1", dependencyTaskIds: ["other-task"] }, ceoActor)).rejects.toThrow("same project");
    expect(prisma.task.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ["other-task"] }, projectId: "project-1", archivedAt: null },
    }));
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it("atomically audits a phase update and clears completion when reopened", async () => {
    prisma.task.findFirst.mockResolvedValue({ id: "task-1", projectId: "project-1", teamId: "team-1" });
    prisma.taskPhase.update.mockResolvedValue({ id: "phase-1", status: "IN_PROGRESS" });
    await updateTaskPhase("task-1", "PRODUCT", { status: "IN_PROGRESS" }, ceoActor);
    expect(prisma.taskPhase.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "IN_PROGRESS", startedAt: expect.any(Date), completedAt: null }),
    }));
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "TASK_PHASE_UPDATED", taskId: "task-1" }),
    }));
  });
});
