import { prisma } from "../../lib/db";
import { addTeamMemberSchema, createSprintSchema, createTeamSchema, riskIssueSchema, type DomainActor, type RiskIssueInput } from "../../lib/validators";

function allowed(actor: DomainActor, projectId: string, teamId?: string) {
  return actor.role === "CEO" || (Boolean(actor.projectIds?.includes(projectId)) && (!teamId || Boolean(actor.teamIds?.includes(teamId))));
}
function assertAllowed(actor: DomainActor, projectId: string, teamId?: string) { if (!allowed(actor, projectId, teamId)) throw new Error("not allowed for this project/team"); }

export async function createTeam(rawInput: unknown, actor: DomainActor) {
  const input = createTeamSchema.parse(rawInput);
  assertAllowed(actor, input.projectId);
  const project = await prisma.project.findFirst({ where: { id: input.projectId, archivedAt: null }, select: { id: true } });
  if (!project) throw new Error("project not found");
  return prisma.$transaction(async (transaction) => {
    const team = await transaction.team.create({ data: input });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: input.projectId, teamId: team.id, action: "TEAM_CREATED", targetType: "Team", targetId: team.id } });
    return team;
  });
}

export async function addTeamMember(teamId: string, userId: string, actor: DomainActor, role: "CEO" | "MANAGER" | "MEMBER" = "MEMBER") {
  const input = addTeamMemberSchema.parse({ teamId, userId, role });
  if (actor.role === "MEMBER") throw new Error("not allowed to manage team membership");
  const team = await prisma.team.findFirst({ where: { id: input.teamId, archivedAt: null, project: { archivedAt: null } }, select: { id: true, projectId: true } });
  if (!team) throw new Error("team not found");
  assertAllowed(actor, team.projectId, team.id);
  if (!await prisma.user.findFirst({ where: { id: input.userId, archivedAt: null }, select: { id: true } })) throw new Error("user not found");
  if (await prisma.teamMember.findFirst({ where: { teamId: input.teamId, userId: input.userId, archivedAt: null }, select: { id: true } })) throw new Error("user is already a team member");
  return prisma.$transaction(async (transaction) => {
    const membership = await transaction.teamMember.create({ data: { teamId: input.teamId, userId: input.userId, role: input.role } });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: team.projectId, teamId: team.id, action: "TEAM_MEMBER_ADDED", targetType: "TeamMember", targetId: membership.id } });
    return membership;
  });
}

export async function createSprint(rawInput: unknown, actor: DomainActor) {
  if (actor.role === "MEMBER") throw new Error("not allowed to manage sprints");
  const input = createSprintSchema.parse(rawInput);
  assertAllowed(actor, input.projectId, input.teamId);
  const team = input.teamId ? await prisma.team.findFirst({ where: { id: input.teamId, projectId: input.projectId, archivedAt: null }, select: { id: true } }) : null;
  if (input.teamId && !team) throw new Error("team must belong to the project");
  return prisma.$transaction(async (transaction) => {
    const sprint = await transaction.sprint.create({ data: input });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: input.projectId, teamId: input.teamId, action: "SPRINT_CREATED", targetType: "Sprint", targetId: sprint.id } });
    return sprint;
  });
}

export async function updateRiskOrIssue(rawInput: RiskIssueInput, actor: DomainActor) {
  const input = riskIssueSchema.parse(rawInput);
  assertAllowed(actor, input.projectId, input.teamId);
  if (input.teamId && !await prisma.team.findFirst({ where: { id: input.teamId, projectId: input.projectId, archivedAt: null }, select: { id: true, projectId: true } })) throw new Error("team must belong to the project");
  const data = { projectId: input.projectId, teamId: input.teamId, taskId: input.taskId, title: input.title, description: input.description, priority: input.priority, status: input.status, ...(input.kind === "RISK" ? { mitigation: input.mitigation } : {}), dueDate: input.dueDate };
  return prisma.$transaction(async (transaction) => {
    const record = input.kind === "RISK"
      ? input.id ? await transaction.risk.update({ where: { id: input.id }, data }) : await transaction.risk.create({ data })
      : input.id ? await transaction.issue.update({ where: { id: input.id }, data }) : await transaction.issue.create({ data });
    await transaction.auditEvent.create({ data: { actorId: actor.userId, projectId: input.projectId, teamId: input.teamId, action: `${input.kind}_${input.id ? "UPDATED" : "CREATED"}`, targetType: input.kind === "RISK" ? "Risk" : "Issue", targetId: record.id } });
    return record;
  });
}
