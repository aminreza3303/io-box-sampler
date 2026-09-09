import { prisma } from "../../lib/db";
import {
  type CreateTaskInput,
  type DomainActor,
  type TaskPhaseType,
  type UpdateTaskPhasePatch,
  createTaskSchema,
  taskPhaseTypes,
  updateTaskPhaseSchema,
} from "../../lib/validators";

const phaseOrder = [...taskPhaseTypes];

function canWriteTeam(actor: DomainActor, teamId: string): boolean {
  return actor.role === "CEO" || Boolean(actor.teamIds?.includes(teamId));
}

function assertCanWriteTeam(actor: DomainActor, teamId: string): void {
  if (!canWriteTeam(actor, teamId)) {
    throw new Error("not allowed to mutate this team's task");
  }
}

export async function createTask(rawInput: CreateTaskInput, actor: DomainActor) {
  const input = createTaskSchema.parse(rawInput);
  assertCanWriteTeam(actor, input.teamId);

  if (input.id && input.dependencyTaskIds.includes(input.id)) {
    throw new Error("a task cannot depend on itself");
  }

  return prisma.$transaction(async (transaction) => {
    const team = await transaction.team.findFirst({
      where: { id: input.teamId, projectId: input.projectId, archivedAt: null, project: { archivedAt: null } },
      select: { id: true },
    });
    if (!team) throw new Error("team must belong to the active project");

    const artifactScope = {
      projectId: input.projectId, archivedAt: null,
      OR: [{ teamId: null }, { teamId: input.teamId }],
    };
    if (input.sprintId && !await transaction.sprint.findFirst({
      where: { id: input.sprintId, ...artifactScope }, select: { id: true },
    })) throw new Error("sprint must be active and belong to the same project/team");
    if (input.backlogItemId && !await transaction.backlogItem.findFirst({
      where: { id: input.backlogItemId, ...artifactScope }, select: { id: true },
    })) throw new Error("backlog item must be active and belong to the same project/team");
    if (input.assigneeId && !await transaction.teamMember.findFirst({
      where: { userId: input.assigneeId, teamId: input.teamId, archivedAt: null, user: { archivedAt: null } },
      select: { id: true },
    })) throw new Error("assignee must be an active member of the task's team");

    if (input.dependencyTaskIds.length > 0) {
      const dependencies = await transaction.task.findMany({
        where: {
          id: { in: input.dependencyTaskIds },
          projectId: input.projectId,
          archivedAt: null,
        },
        select: { id: true },
      });
      if (dependencies.length !== input.dependencyTaskIds.length) {
        throw new Error("every dependency must be an active task in the same project");
      }
    }

    const task = await transaction.task.create({
      data: {
        ...(input.id ? { id: input.id } : {}),
        title: input.title,
        description: input.description,
        projectId: input.projectId,
        teamId: input.teamId,
        sprintId: input.sprintId,
        backlogItemId: input.backlogItemId,
        assigneeId: input.assigneeId,
        priority: input.priority,
        dueDate: input.dueDate,
        createdById: actor.userId,
        phases: {
          create: phaseOrder.map((phaseType) => ({ phaseType })),
        },
        dependencies: input.dependencyTaskIds.length
          ? { create: input.dependencyTaskIds.map((dependsOnId) => ({ dependsOnId })) }
          : undefined,
      },
      include: { phases: true },
    });

    await transaction.auditEvent.create({
      data: {
        actorId: actor.userId,
        projectId: task.projectId,
        teamId: task.teamId,
        taskId: task.id,
        action: "TASK_CREATED",
        targetType: "Task",
        targetId: task.id,
      },
    });

    return {
      ...task,
      phases: [...task.phases].sort(
        (left, right) => phaseOrder.indexOf(left.phaseType) - phaseOrder.indexOf(right.phaseType),
      ),
    };
  });
}

export async function updateTaskPhase(
  taskId: string,
  phaseType: string,
  rawPatch: UpdateTaskPhasePatch,
  actor: DomainActor,
) {
  if (!taskPhaseTypes.includes(phaseType as TaskPhaseType)) {
    throw new Error("invalid task phase type");
  }
  const parsedPhaseType = phaseType as TaskPhaseType;
  const patch = updateTaskPhaseSchema.parse(rawPatch);
  return prisma.$transaction(async (transaction) => {
    const task = await transaction.task.findFirst({
      where: {
        id: taskId,
        archivedAt: null,
        project: { archivedAt: null },
        team: { archivedAt: null },
        ...(actor.role === "CEO" ? {} : { teamId: { in: actor.teamIds ?? [] } }),
      },
      select: { id: true, projectId: true, teamId: true },
    });

    if (!task) {
      throw new Error("not allowed to mutate this team's task");
    }
    assertCanWriteTeam(actor, task.teamId);

    const now = new Date();
    const phase = await transaction.taskPhase.update({
      where: { taskId_phaseType: { taskId, phaseType: parsedPhaseType } },
      data: {
        ...patch,
        ...(patch.status === "IN_PROGRESS" ? { startedAt: now } : {}),
        ...(patch.status === "COMPLETE" ? { completedAt: now } : {}),
        ...(patch.status && patch.status !== "COMPLETE" ? { completedAt: null } : {}),
        ...(patch.status === "NOT_STARTED" ? { startedAt: null } : {}),
      },
    });

    await transaction.auditEvent.create({
      data: {
        actorId: actor.userId,
        projectId: task.projectId,
        teamId: task.teamId,
        taskId,
        action: "TASK_PHASE_UPDATED",
        targetType: "TaskPhase",
        targetId: phase.id,
        metadata: { phaseType: parsedPhaseType, status: phase.status },
      },
    });

    return phase;
  });
}

export type TaskWithPhases = Awaited<ReturnType<typeof createTask>>;
