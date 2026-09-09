import { prisma } from "../../lib/db";
import {
  type CommandCenterSnapshotFilters,
  type CreateProjectInput,
  type DomainActor,
  commandCenterSnapshotFiltersSchema,
  createProjectSchema,
} from "../../lib/validators";

function assertCanCreateProject(actor: DomainActor): void {
  if (actor.role !== "CEO") {
    throw new Error("not allowed to create a project");
  }
}

export async function createProject(input: CreateProjectInput, actor: DomainActor) {
  assertCanCreateProject(actor);
  const data = createProjectSchema.parse(input);
  return prisma.$transaction(async (transaction) => {
    const project = await transaction.project.create({
      data: { ...data, createdById: actor.userId },
    });

    await transaction.auditEvent.create({
      data: {
        actorId: actor.userId,
        projectId: project.id,
        action: "PROJECT_CREATED",
        targetType: "Project",
        targetId: project.id,
      },
    });

    return project;
  });
}

export async function listCommandCenterSnapshot(
  rawFilters: CommandCenterSnapshotFilters,
  actor: DomainActor,
) {
  const filters = commandCenterSnapshotFiltersSchema.parse(rawFilters);
  const teamIds = actor.role === "CEO" ? undefined : actor.teamIds ?? [];
  if (filters.teamId && teamIds && !teamIds.includes(filters.teamId)) {
    throw new Error("not allowed to view this team's snapshot");
  }
  const scopedTeamIds = filters.teamId ? [filters.teamId] : teamIds;
  const teamWhere = { archivedAt: null, ...(scopedTeamIds ? { id: { in: scopedTeamIds } } : {}) };
  const projects = await prisma.project.findMany({
    where: {
      archivedAt: null,
      ...(filters.projectId ? { id: filters.projectId } : {}),
      ...(scopedTeamIds ? { teams: { some: teamWhere } } : {}),
    },
    include: { teams: { where: teamWhere } },
    orderBy: { name: "asc" },
  });
  const projectIds = projects.map((project) => project.id);
  const taskWhere = {
    projectId: { in: projectIds },
    archivedAt: null,
    team: { archivedAt: null },
    ...(scopedTeamIds ? { teamId: { in: scopedTeamIds } } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.assigneeId ? { assigneeId: filters.assigneeId } : {}),
    ...(filters.phase ? { phases: { some: { phaseType: filters.phase } } } : {}),
  };
  const artifactWhere = {
    projectId: { in: projectIds },
    archivedAt: null,
    ...(scopedTeamIds ? { OR: [{ teamId: null }, { teamId: { in: scopedTeamIds } }] } : {}),
  };

  const userPromise = "user" in prisma && prisma.user
    ? prisma.user.findMany({
      where: { archivedAt: null, teamMemberships: { some: { archivedAt: null, ...(scopedTeamIds ? { teamId: { in: scopedTeamIds } } : { team: { projectId: { in: projectIds } } }) } } },
      select: { id: true, email: true, displayName: true, role: true, teamMemberships: { where: { archivedAt: null }, select: { teamId: true } } },
      orderBy: { displayName: "asc" },
    })
    : Promise.resolve([]);

  const [tasks, backlogItems, sprints, goals, risks, issues, decisions, users] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
      include: { phases: { orderBy: { phaseType: "asc" } }, team: true, project: true, assignee: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.backlogItem.findMany({ where: artifactWhere, orderBy: { position: "asc" } }),
    prisma.sprint.findMany({ where: artifactWhere, orderBy: { startDate: "desc" } }),
    prisma.goal.findMany({ where: artifactWhere, orderBy: { dueDate: "asc" } }),
    prisma.risk.findMany({ where: artifactWhere, orderBy: { priority: "desc" } }),
    prisma.issue.findMany({ where: artifactWhere, orderBy: { priority: "desc" } }),
    prisma.decision.findMany({ where: artifactWhere, orderBy: { createdAt: "desc" } }),
    userPromise,
  ]);

  const normalizedProjects = projects.map(({ teams: _teams, ...project }) => project);
  const teams = projects.flatMap((project) => project.teams);
  const normalizedTasks = tasks.map(({ phases: taskPhases, assignee, ...task }) => ({
    ...task,
    assignee: assignee ? { id: assignee.id, displayName: assignee.displayName, email: assignee.email } : null,
  }));
  const phases = tasks.flatMap((task) => task.phases);
  const normalizedUsers = users.map(({ teamMemberships, ...user }) => ({
    ...user,
    teamIds: teamMemberships.map((membership) => membership.teamId),
  }));
  return { projects: normalizedProjects, teams, users: normalizedUsers, tasks: normalizedTasks, phases, backlogItems, sprints, goals, risks, issues, decisions };
}

export type CommandCenterSnapshot = Awaited<ReturnType<typeof listCommandCenterSnapshot>>;
